"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CSV_CONCURRENCY, CSV_MAX_BYTES, fill, formatNumber, getCopy, type Lang, type Status } from "@/config/site";
import { detectEmailColumn, parseCsv, toCsv, toTable, type CsvTable } from "@/lib/csv";
import { isValidFormat, normalizeEmail } from "@/lib/email";
import { verifyEmail } from "@/lib/client-verify";
import type { DoorState } from "../DoorSvg";

type Phase = "empty" | "reading" | "ready" | "running" | "done" | "stopped" | "limit";
type FileError = "type" | "size" | "empty" | "read" | null;
type Outcome = { status: Status | "error"; reason?: string; free?: boolean; demo?: boolean };

const STATUS_NAME: Record<Status, string> = { valid: "Valid", invalid: "Invalid", risky: "Risky", unknown: "Unknown" };

export function CsvChecker({ lang, onDoor }: { lang: Lang; onDoor: (d: { state: DoorState; label: string } | null) => void }) {
  const t = getCopy(lang);
  const s = t.csv;
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>("empty");
  const [fileError, setFileError] = useState<FileError>(null);
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<CsvTable | null>(null);
  const [column, setColumn] = useState(-1);
  const [over, setOver] = useState(false);
  const [results, setResults] = useState<Map<string, Outcome>>(new Map());
  const [done, setDone] = useState(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  const plan = useMemo(() => {
    if (!table || column < 0) return null;
    const unique = new Set<string>();
    let bad = 0;
    let dupes = 0;
    for (const row of table.rows) {
      const raw = (row[column] || "").trim();
      if (!isValidFormat(raw)) {
        bad++;
        continue;
      }
      const email = normalizeEmail(raw);
      if (unique.has(email)) dupes++;
      else unique.add(email);
    }
    return { emails: [...unique], bad, dupes };
  }, [table, column]);

  const counts = useMemo(() => {
    const c = { valid: 0, invalid: 0, risky: 0, unknown: 0 };
    results.forEach((r) => {
      if (r.status !== "error") c[r.status]++;
    });
    if (plan && (phase === "done" || phase === "stopped" || phase === "limit")) c.invalid += plan.bad;
    return c;
  }, [results, plan, phase]);

  const isDemo = useMemo(() => [...results.values()].some((r) => r.demo), [results]);

  const reset = () => {
    abortRef.current?.abort();
    setPhase("empty");
    setFileError(null);
    setTable(null);
    setColumn(-1);
    setResults(new Map());
    setDone(0);
    setFileName("");
    onDoor(null);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    const looksCsv = /\.(csv|txt)$/i.test(file.name) || ["text/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type);
    if (!looksCsv) return setFileError("type");
    if (file.size > CSV_MAX_BYTES) return setFileError("size");
    setPhase("reading");
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = toTable(parseCsv(text));
      if (!parsed.rows.length) {
        setPhase("empty");
        return setFileError("empty");
      }
      setTable(parsed);
      setColumn(detectEmailColumn(parsed));
      setResults(new Map());
      setDone(0);
      setPhase("ready");
    } catch {
      setPhase("empty");
      setFileError("read");
    }
  };

  const run = async () => {
    if (!plan || !plan.emails.length) return;
    stopRef.current = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const queue = [...plan.emails];
    const out = new Map<string, Outcome>();
    let finished = 0;
    let hitLimit = false;
    setResults(new Map());
    setDone(0);
    setPhase("running");
    onDoor({ state: "knocking", label: t.hero.door.knocking });

    const checkOne = async (email: string): Promise<Outcome | "limit"> => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await verifyEmail(email, ctrl.signal);
        if (res.ok) return { status: res.result.status, reason: res.result.reason, free: res.result.free, demo: res.result.demo };
        if (res.code === "limit") return "limit";
        if (res.code === "format") return { status: "invalid", reason: "format" };
        if (res.code === "offline") return { status: "error", reason: "offline" };
        if (res.code === "human") return { status: "error", reason: "bot check failed" };
        // rate, timeout, server: wait and try again, longer each time when the limit is reached
        await new Promise((r) => setTimeout(r, res.code === "rate" ? 5000 * (attempt + 1) : 1500));
      }
      return { status: "error", reason: "not checked" };
    };

    const worker = async () => {
      while (queue.length && !stopRef.current && !hitLimit) {
        const email = queue.shift()!;
        const r = await checkOne(email);
        if (r === "limit") {
          hitLimit = true;
          break;
        }
        out.set(email, r);
        finished++;
        // Update in small steps so long lists stay smooth on low-end phones
        if (finished % 5 === 0 || !queue.length) {
          setDone(finished);
          setResults(new Map(out));
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: CSV_CONCURRENCY }, worker));
    } catch {
      /* aborted by reset */
      return;
    }
    setDone(finished);
    setResults(new Map(out));
    const next: Phase = hitLimit ? "limit" : stopRef.current ? "stopped" : "done";
    setPhase(next);
    onDoor(hitLimit ? { state: "limit", label: t.hero.door.limit } : { state: "ready", label: t.hero.door.ready });
  };

  const download = (validOnly: boolean) => {
    if (!table || column < 0) return;
    const header = [...table.header, "inboxknock_status", "inboxknock_note", "inboxknock_free_provider"];
    const rows: string[][] = [];
    for (const row of table.rows) {
      const raw = (row[column] || "").trim();
      let status = "";
      let note = "";
      let free = "";
      if (!isValidFormat(raw)) {
        status = "Invalid";
        note = "bad format";
      } else {
        const r = results.get(normalizeEmail(raw));
        if (!r) note = "not checked";
        else if (r.status === "error") note = r.reason || "not checked";
        else {
          status = STATUS_NAME[r.status];
          note = r.reason?.replaceAll("_", "-") || "";
          if (r.free !== undefined) free = r.free ? "yes" : "no";
          if (r.demo) note = note ? `${note}; demo result` : "demo result";
        }
      }
      if (validOnly && status !== "Valid") continue;
      rows.push([...row, status, note, free]);
    }
    const blob = new Blob(["﻿" + toCsv(header, rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = fileName.replace(/\.[^.]+$/, "") || "list";
    a.href = url;
    a.download = `${base}-${validOnly ? "valid" : "checked"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const total = plan?.emails.length ?? 0;
  const pct = total ? done / total : 0;
  const finishedPhase = phase === "done" || phase === "stopped" || phase === "limit";

  return (
    <section aria-labelledby={`${ids}-title`} className="w-full max-w-[44rem]">
      <h2 id={`${ids}-title`} className="mb-3 text-[1.25rem] font-semibold">
        {s.title}
      </h2>

      {(phase === "empty" || phase === "reading") && (
        <div
          className="dropzone flex flex-col items-start gap-3 rounded-[1.75rem] p-6 sm:p-8"
          data-over={over}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <p className="text-[1.125rem] font-semibold text-paper">{phase === "reading" ? s.reading : s.drop}</p>
          <p className="flex flex-wrap items-center gap-3 text-muted">
            <span>{s.or}</span>
            <label className="btn btn-ghost cursor-pointer focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-paper">
              {s.choose}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv,.txt"
                className="sr-only"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </p>
          <p className="text-[0.9375rem] text-muted">{s.help}</p>
        </div>
      )}

      <div role="alert" className="empty:hidden mt-3">
        {fileError && <p className="fx-fade rounded-2xl border border-edge bg-ink-2 px-5 py-4 text-paper">{s.errors[fileError]}</p>}
      </div>

      {table && phase !== "empty" && phase !== "reading" && (
        <div className="fx-fade rounded-[1.75rem] border border-rule bg-ink-2 p-5 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="min-w-0 break-all font-semibold text-paper">{fileName}</p>
            {phase !== "running" && (
              <button type="button" className="link text-[0.9375rem] text-muted" onClick={reset}>
                {s.remove}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label htmlFor={`${ids}-col`} className="text-[0.9375rem] text-muted">
              {s.columnLabel}
            </label>
            <select
              id={`${ids}-col`}
              value={column}
              disabled={phase === "running"}
              onChange={(e) => {
                setColumn(Number(e.target.value));
                setResults(new Map());
                setDone(0);
                setPhase("ready");
              }}
              className="min-h-11 rounded-xl border border-edge bg-ink px-3 text-paper"
            >
              {column < 0 && <option value={-1}>-</option>}
              {table.header.map((h, i) => (
                <option key={i} value={i}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {column < 0 ? (
            <p role="alert" className="mt-3 text-paper">
              {s.errors.noColumn}
            </p>
          ) : (
            plan && (
              <div className="mt-3 space-y-1 text-[0.9375rem]">
                <p className="text-paper">
                  {s.found.replace("{count}", formatNumber(plan.emails.length, lang)).replace("{column}", table.header[column])}
                </p>
                {plan.dupes > 0 && <p className="text-muted">{s.duplicates.replace("{count}", formatNumber(plan.dupes, lang))}</p>}
                {plan.bad > 0 && <p className="text-muted">{s.badFormat.replace("{count}", formatNumber(plan.bad, lang))}</p>}
              </div>
            )
          )}

          <div className="mt-5">
            <p className="mb-2 text-[0.8125rem] uppercase tracking-[0.06em] text-dim">{s.preview}</p>
            <div className="overflow-x-auto rounded-xl border border-rule" data-lenis-prevent tabIndex={0} role="region" aria-label={s.preview}>
              <table className="w-full border-collapse text-left text-[0.875rem]">
                <thead>
                  <tr>
                    {table.header.map((h, i) => (
                      <th key={i} scope="col" className={`whitespace-nowrap border-b border-rule px-3 py-2 font-semibold ${i === column ? "bg-ink-3 text-paper" : "text-muted"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 5).map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, i) => (
                        <td key={i} className={`max-w-[16rem] truncate whitespace-nowrap border-b border-rule px-3 py-2 last:border-b-0 ${i === column ? "bg-ink-3 text-paper" : "text-muted"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {phase === "ready" && plan && plan.emails.length > 0 && (
            <button type="button" className="btn mt-6" data-magnetic onClick={run}>
              {s.start.replace("{count}", formatNumber(plan.emails.length, lang))}
            </button>
          )}

          {(phase === "running" || finishedPhase) && (
            <div className="mt-6">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={done}
                aria-valuetext={s.progress.replace("{done}", formatNumber(done, lang)).replace("{total}", formatNumber(total, lang))}
                aria-label={s.title}
                className="h-2 overflow-hidden rounded-full bg-ink-3"
              >
                <div className="h-full origin-left bg-paper transition-transform duration-300" style={{ transform: `scaleX(${pct})` }} />
              </div>
              <div aria-live="polite" className="mt-3 text-[0.9375rem]">
                {phase === "running" && (
                  <p className="text-paper">
                    {s.progress.replace("{done}", formatNumber(done, lang)).replace("{total}", formatNumber(total, lang))}
                  </p>
                )}
                {finishedPhase && (
                  <>
                    {isDemo && (
                      <p className="mb-2">
                        <span className="rounded-md bg-paper px-2 py-0.5 text-[0.875rem] font-semibold text-ink">{t.checker.demoBadge}</span>{" "}
                        <span className="text-muted">{t.checker.demoNote}</span>
                      </p>
                    )}
                    <p className="font-semibold text-paper">
                      {phase === "done" && s.done.replace("{total}", formatNumber(total, lang))}
                      {phase === "stopped" && s.stopped.replace("{done}", formatNumber(done, lang)).replace("{total}", formatNumber(total, lang))}
                      {phase === "limit" && fill(s.limitHit, lang).replace("{done}", formatNumber(done, lang)).replace("{total}", formatNumber(total, lang))}
                    </p>
                    <p className="mt-1 text-muted">
                      {s.summary
                        .replace("{valid}", formatNumber(counts.valid, lang))
                        .replace("{invalid}", formatNumber(counts.invalid, lang))
                        .replace("{risky}", formatNumber(counts.risky, lang))
                        .replace("{unknown}", formatNumber(counts.unknown, lang))}
                    </p>
                  </>
                )}
              </div>
              {phase === "running" && (
                <button
                  type="button"
                  className="btn btn-ghost mt-4"
                  onClick={() => {
                    stopRef.current = true;
                  }}
                >
                  {s.stop}
                </button>
              )}
              {finishedPhase && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" className="btn" data-magnetic onClick={() => download(false)}>
                    {s.download}
                  </button>
                  {counts.valid > 0 && (
                    <button type="button" className="btn btn-ghost" onClick={() => download(true)}>
                      {s.downloadValid}
                    </button>
                  )}
                  <button type="button" className="link px-2 text-muted" onClick={reset}>
                    {s.another}
                  </button>
                </div>
              )}
              {finishedPhase && counts.valid === 0 && (
                <p className="mt-3 text-[0.9375rem] text-muted">{s.noValid}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
