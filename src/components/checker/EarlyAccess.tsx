"use client";

import { useId, useRef, useState } from "react";
import { fill, getCopy, type Lang } from "@/config/site";
import { formatHint } from "@/lib/email";
import type { DoorState } from "../DoorSvg";

type Phase = "idle" | "sending" | "success" | "closed" | "error" | "format";

/**
 * Shown instead of the checker when no verifier is configured in production.
 * It only reports success when the server confirms the sign-up was saved.
 */
export function EarlyAccess({ lang, onDoor }: { lang: Lang; onDoor: (d: { state: DoorState; label: string } | null) => void }) {
  const t = getCopy(lang);
  const e = t.early;
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const hint = formatHint(value);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (phase === "sending") return;
    if (hint !== "ok") {
      setPhase("format");
      inputRef.current?.focus();
      return;
    }
    setPhase("sending");
    onDoor({ state: "knocking", label: t.hero.door.knocking });
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value.trim(), lang }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setPhase("success");
        onDoor({ state: "joined", label: t.hero.door.joined });
      } else if (data?.error === "closed") {
        setPhase("closed");
        onDoor({ state: "soon", label: t.hero.door.soon });
      } else if (data?.error === "format") {
        setPhase("format");
        onDoor({ state: "soon", label: t.hero.door.soon });
      } else {
        setPhase("error");
        onDoor({ state: "error", label: t.hero.door.error });
      }
    } catch {
      setPhase("error");
      onDoor({ state: "error", label: t.hero.door.error });
    }
  };

  if (phase === "success") {
    return (
      <div aria-live="polite" className="max-w-[40rem]">
        <p className="fx-fade rounded-[1.75rem] border border-rule bg-ink-2 p-6 text-[1.125rem] text-paper">{e.success}</p>
      </div>
    );
  }

  const invalid = phase === "format";
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-[40rem]">
      <label htmlFor={`${ids}-email`} className="mb-2 block text-[0.9375rem] font-medium text-muted">
        {e.inputLabel}
      </label>
      <div className="flex flex-col gap-2 rounded-[1.75rem] bg-ink-2 p-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)] focus-within:shadow-[inset_0_0_0_2px_var(--color-paper)] sm:flex-row sm:items-center sm:rounded-full">
        <input
          ref={inputRef}
          id={`${ids}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="send"
          placeholder={e.placeholder}
          value={value}
          onChange={(ev) => {
            setValue(ev.target.value);
            if (phase === "format" || phase === "error" || phase === "closed") setPhase("idle");
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={`${ids}-msg ${ids}-small`}
          className="min-h-[3.25rem] w-full min-w-0 flex-1 rounded-full bg-transparent px-4 text-[1.125rem] text-paper placeholder:text-dim focus:outline-none sm:px-5"
        />
        <button type="submit" className="btn shrink-0" data-magnetic disabled={phase === "sending"}>
          {phase === "sending" ? e.sending : e.button}
        </button>
      </div>
      <div id={`${ids}-msg`} role="alert" className="mt-3 min-h-[1.75rem] text-[0.9375rem]">
        {invalid && <p className="text-paper">{value ? t.checker.hints[hint] : t.checker.errors.empty}</p>}
        {phase === "closed" && <p className="fx-fade text-paper">{fill(e.closed, lang)}</p>}
        {phase === "error" && <p className="fx-fade text-paper">{fill(e.error, lang)}</p>}
      </div>
      <p id={`${ids}-small`} className="mt-1 text-[0.9375rem] text-muted">
        {e.small}
      </p>
    </form>
  );
}
