import type { VerifyErrorCode, VerifyResult } from "./verify";

export type ClientErrorCode = VerifyErrorCode | "offline";
export type VerifyOutcome = { ok: true; result: VerifyResult } | { ok: false; code: ClientErrorCode };

export async function verifyEmail(email: string, signal?: AbortSignal): Promise<VerifyOutcome> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, code: "offline" };
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal,
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && typeof data.status === "string") return { ok: true, result: data as VerifyResult };
    const code = (data?.error as VerifyErrorCode) || "server";
    return { ok: false, code: ["format", "limit", "rate", "timeout", "server"].includes(code) ? code : "server" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { ok: false, code: navigator.onLine === false ? "offline" : "server" };
  }
}
