"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FREE_MONTHLY_CHECKS, LOW_CHECKS_WARNING_RATIO, fill, formatNumber, getCopy, type Lang } from "@/config/site";
import { formatHint, normalizeEmail, suggestTypo, type HintKey } from "@/lib/email";
import { verifyEmail, type ClientErrorCode } from "@/lib/client-verify";
import { CHECK_KEYS, resultKey, type CheckerMode, type CheckState, type VerifyResult } from "@/lib/verify";
import { DoorSvg, type DoorState } from "../DoorSvg";
import dynamic from "next/dynamic";
import { EarlyAccess } from "./EarlyAccess";
import { StatusTag } from "../StatusTag";

/** The CSV tool is only downloaded when a visitor opens it. */
const CsvChecker = dynamic(() => import("./CsvChecker").then((m) => m.CsvChecker), { ssr: false });

type Phase = "idle" | "loading" | "result" | "error";
type ErrorKey = ClientErrorCode | "empty";

const ERROR_COPY: Record<ErrorKey, keyof ReturnType<typeof getCopy>["checker"]["errors"]> = {
  empty: "empty",
  format: "format",
  limit: "limit",
  rate: "tooMany",
  timeout: "timeout",
  server: "server",
  offline: "offline",
  human: "human",
};

export function HeroChecker({ lang, mode }: { lang: Lang; mode: CheckerMode }) {
  const t = getCopy(lang);
  const c = t.checker;
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [view, setView] = useState<"single" | "csv">("single");
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [answerId, setAnswerId] = useState(0);
  const [intro, setIntro] = useState(true);
  const [externalDoor, setExternalDoor] = useState<{ state: DoorState; label: string } | null>(null);

  const hint: HintKey = formatHint(value);
  // The result card shows its own suggestion, so the field hint steps aside then.
  const typo = hint === "ok" && phase !== "result" ? suggestTypo(value) : null;
  const showHint = touched && value.length > 0;

  // "Clean your first list" buttons link to #check-csv. Open the CSV tool for them.
  useEffect(() => {
    const open = () => {
      if (location.hash === "#check-csv" && mode !== "early") setView("csv");
    };
    const force = () => {
      if (mode !== "early") setView("csv");
    };
    open();
    window.addEventListener("hashchange", open);
    window.addEventListener("ik:open-csv", force);
    return () => {
      window.removeEventListener("hashchange", open);
      window.removeEventListener("ik:open-csv", force);
    };
  }, [mode]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (phase === "loading") return;
      setTouched(true);
      const h = formatHint(value);
      if (h !== "ok") {
        setError(h === "empty" ? "empty" : "format");
        setPhase("error");
        setResult(null);
        inputRef.current?.focus();
        return;
      }
      setIntro(false);
      setError(null);
      setResult(null);
      setPhase("loading");
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const out = await verifyEmail(normalizeEmail(value), ctrl.signal);
        if (out.ok) {
          setResult(out.result);
          setPhase("result");
        } else {
          setError(out.code);
          setPhase("error");
        }
        setAnswerId((n) => n + 1);
      } catch {
        /* aborted */
      }
    },
    [phase, value],
  );

  const reset = () => {
    setValue("");
    setTouched(false);
    setResult(null);
    setError(null);
    setPhase("idle");
    focusNext.current = true;
  };

  // Move focus back to the field after "Check another email" re-renders the form.
  const focusNext = useRef(false);
  useEffect(() => {
    if (focusNext.current && phase === "idle") {
      focusNext.current = false;
      inputRef.current?.focus();
    }
  }, [phase]);

  // Bring a new answer into view when it lands below the fold.
  const liveRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== "result" && phase !== "error") return;
    const el = liveRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight - 120) {
      const calm = document.documentElement.classList.contains("calm");
      el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    }
  }, [phase, answerId]);

  // What the door shows
  let door: { state: DoorState; label: string };
  if (externalDoor) door = externalDoor;
  else if (phase === "loading") door = { state: "knocking", label: t.hero.door.knocking };
  else if (phase === "result" && result) door = { state: result.status, label: t.results.items[result.status].name };
  else if (phase === "error" && error && error !== "empty" && error !== "format")
    door = error === "limit" ? { state: "limit", label: t.hero.door.limit } : { state: "error", label: t.hero.door.error };
  else if (mode === "early") door = { state: "soon", label: t.hero.door.soon };
  else door = { state: "ready", label: t.hero.door.ready };

  const onDoor = useCallback((d: { state: DoorState; label: string } | null) => {
    setIntro(false);
    setExternalDoor(d);
  }, []);

  const invalid = phase === "error" && (error === "empty" || error === "format");
  const hintId = `${ids}-hint`;
  const errorId = `${ids}-error`;

  return (
    <>
      <div className="hero-form [grid-area:form]" id="check">
        {mode === "early" ? (
          <EarlyAccess lang={lang} onDoor={onDoor} />
        ) : (
          <>
            {view === "single" ? (
              <form onSubmit={submit} noValidate className="w-full max-w-[40rem]" aria-describedby={`${ids}-small`}>
                <label htmlFor={`${ids}-email`} className="mb-2 block text-[0.9375rem] font-medium text-muted">
                  {c.inputLabel}
                </label>
                <div className="flex flex-col gap-2 rounded-[1.75rem] bg-ink-2 p-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)] focus-within:shadow-[inset_0_0_0_2px_var(--color-paper)] sm:flex-row sm:items-center sm:rounded-full">
                  <input
                    ref={inputRef}
                    id={`${ids}-email`}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder={c.placeholder}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setTouched(true);
                      if (phase === "error") {
                        setPhase("idle");
                        setError(null);
                      }
                    }}
                    aria-invalid={invalid || undefined}
                    aria-describedby={`${hintId}${invalid ? ` ${errorId}` : ""}`}
                    className="min-h-[3.25rem] w-full min-w-0 flex-1 rounded-full bg-transparent px-4 text-[1.125rem] text-paper placeholder:text-dim focus:outline-none sm:px-5"
                  />
                  <button type="submit" className="btn shrink-0" data-magnetic disabled={phase === "loading"} aria-disabled={phase === "loading"}>
                    {phase === "loading" ? (
                      <>
                        <span className="knock-dots" aria-hidden="true" />
                        {c.checking}
                      </>
                    ) : (
                      c.button
                    )}
                  </button>
                </div>

                <div className="mt-3 min-h-[1.75rem] text-[0.9375rem]" id={hintId}>
                  {showHint && (
                    <p className={hint === "ok" ? "text-muted" : "text-paper"}>
                      <span aria-hidden="true" className="mr-2 inline-block w-3 text-center">
                        {hint === "ok" ? "✓" : "→"}
                      </span>
                      {c.hints[hint]}
                    </p>
                  )}
                  {typo && (
                    <p className="mt-1 text-paper">
                      {fill(c.hints.typo, lang).replace("{suggestion}", typo)}{" "}
                      <button
                        type="button"
                        className="link ml-1 font-semibold"
                        onClick={() => {
                          setValue(typo);
                          inputRef.current?.focus();
                        }}
                      >
                        {c.hints.useTypo}
                      </button>
                    </p>
                  )}
                </div>
                <p id={`${ids}-small`} className="mt-1 text-[0.9375rem] text-muted">
                  {t.hero.small}
                </p>
              </form>
            ) : (
              <CsvChecker lang={lang} onDoor={onDoor} />
            )}

            <button
              type="button"
              className="link mt-4 text-[0.9375rem] text-muted"
              aria-controls="check"
              onClick={() => {
                const next = view === "single" ? "csv" : "single";
                setView(next);
                onDoor(null);
                if (next === "single") requestAnimationFrame(() => inputRef.current?.focus());
              }}
            >
              {view === "single" ? c.csvToggle : c.singleToggle}
            </button>
          </>
        )}

        {/* Live regions are always in the DOM so screen readers catch changes */}
        <div ref={liveRef} aria-live="polite" aria-atomic="true" className="mt-6">
          {view === "single" && phase === "result" && result && (
            <ResultCard
              lang={lang}
              result={result}
              onAnother={reset}
              onUseSuggestion={(next) => {
                reset();
                setValue(next);
                setTouched(true);
              }}
            />
          )}
          {view === "single" && phase === "loading" && <p className="sr-only">{c.checking}</p>}
        </div>
        <div role="alert" id={errorId} className="mt-2">
          {view === "single" && phase === "error" && error && (
            <p className="fx-fade max-w-[40rem] rounded-2xl border border-edge bg-ink-2 px-5 py-4 text-paper">
              {fill(c.errors[ERROR_COPY[error]], lang)}
            </p>
          )}
        </div>
      </div>

      <div className="[grid-area:door] mx-auto w-full max-w-[17rem] sm:max-w-[20rem] lg:mx-0 lg:max-w-none" data-hero-door>
        <DoorSvg state={door.state} label={door.label} intro={intro} answerId={answerId} />
      </div>
    </>
  );
}

function ResultCard({
  lang,
  result,
  onAnother,
  onUseSuggestion,
}: {
  lang: Lang;
  result: VerifyResult;
  onAnother: () => void;
  onUseSuggestion: (email: string) => void;
}) {
  const t = getCopy(lang);
  const c = t.checker;
  const key = resultKey(result.status, result.reason);
  const line = c.results[key];
  const limit = result.limit ?? FREE_MONTHLY_CHECKS;
  const low = result.remaining !== undefined && result.remaining <= Math.max(1, Math.floor(limit * LOW_CHECKS_WARNING_RATIO));

  return (
    <div className="fx-fade max-w-[40rem] rounded-[1.75rem] border border-rule bg-ink-2 p-5 sm:p-7">
      {result.demo && (
        <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem]">
          <span className="rounded-md bg-paper px-2 py-0.5 font-semibold text-ink">{c.demoBadge}</span>
          <span className="text-muted">{c.demoNote}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <span className="sr-only">{c.statusLabel}:</span>
        <StatusTag status={result.status} lang={lang} large />
        <span className="min-w-0 break-all text-muted">{result.email}</span>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-[9rem_1fr]">
        <dt className="text-[0.875rem] uppercase tracking-[0.06em] text-dim">{c.meaningLabel}</dt>
        <dd className="text-[1.125rem] text-paper">{line.meaning}</dd>
        <dt className="text-[0.875rem] uppercase tracking-[0.06em] text-dim">{c.actionLabel}</dt>
        <dd className="text-[1.125rem] font-semibold text-paper">{line.action}</dd>
      </dl>
      {result.suggestion && (
        <p className="mt-4 text-paper">
          {fill(c.hints.typo, lang).replace("{suggestion}", result.suggestion)}{" "}
          <button type="button" className="link ml-1 font-semibold" onClick={() => onUseSuggestion(result.suggestion!)}>
            {c.hints.useTypo}
          </button>
        </p>
      )}
      {result.free && <p className="mt-4 text-[0.9375rem] text-muted">{c.freeNote}</p>}
      {result.checks && <CheckList lang={lang} checks={result.checks} />}
      {result.remaining !== undefined && (
        <p className={`mt-5 text-[0.9375rem] ${low ? "font-semibold text-paper" : "text-muted"}`}>
          {(low ? c.remainingLow : c.remaining).replace("{left}", formatNumber(result.remaining, lang))}
        </p>
      )}
      <button type="button" onClick={onAnother} className="btn btn-ghost mt-6">
        {c.another}
      </button>
    </div>
  );
}

/** Strong states first draw the eye. Pass and skipped stay quiet. */
const STATE_TONE: Record<CheckState, string> = {
  pass: "text-muted",
  skipped: "text-dim",
  info: "text-paper",
  unknown: "text-paper",
  warn: "font-semibold text-paper",
  fail: "font-semibold text-paper",
};
const TEST_KEYS = new Set(["syntax", "domain", "mx", "smtp"]);
const STATE_MARK: Record<CheckState, string> = { pass: "✓", skipped: "·", info: "i", unknown: "?", warn: "!", fail: "✕" };

function CheckList({ lang, checks }: { lang: Lang; checks: NonNullable<VerifyResult["checks"]> }) {
  const c = getCopy(lang).checker;
  const rows = CHECK_KEYS.filter((k) => checks[k]);
  if (!rows.length) return null;
  return (
    <div className="mt-6 border-t border-rule pt-5">
      <p className="mb-3 text-[0.875rem] uppercase tracking-[0.06em] text-dim">{c.checksTitle}</p>
      <ul className="grid gap-x-6 gap-y-2 text-[0.9375rem] sm:grid-cols-2">
        {rows.map((key) => {
          const state = checks[key]!;
          // Disposable, role, free, catch-all and spam trap are yes/no questions.
          const question = !TEST_KEYS.has(key);
          const label = question && state === "pass" ? c.checkStates.no : question && state === "warn" ? c.checkStates.info : c.checkStates[state];
          return (
            <li key={key} className="flex items-baseline justify-between gap-3 border-b border-rule/60 pb-2">
              <span className="text-muted">{c.checkNames[key]}</span>
              <span className={`flex shrink-0 items-baseline gap-2 ${STATE_TONE[state]}`}>
                <span aria-hidden="true" className="inline-block w-3 text-center">
                  {STATE_MARK[state]}
                </span>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
