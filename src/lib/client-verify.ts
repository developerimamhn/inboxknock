import type { VerifyErrorCode, VerifyResult } from "./verify";

export type ClientErrorCode = VerifyErrorCode | "offline" | "human";
export type VerifyOutcome = { ok: true; result: VerifyResult } | { ok: false; code: ClientErrorCode };

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const KNOWN: ClientErrorCode[] = ["format", "limit", "rate", "timeout", "server", "human"];

async function post(email: string, signal?: AbortSignal) {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    signal,
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

export async function verifyEmail(email: string, signal?: AbortSignal): Promise<VerifyOutcome> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, code: "offline" };
  try {
    let { res, data } = await post(email, signal);
    // The server wants a bot check first. Run it once, then try again.
    if (data?.error === "human" && SITE_KEY) {
      const passed = await passHumanCheck();
      if (!passed) return { ok: false, code: "human" };
      ({ res, data } = await post(email, signal));
    }
    if (res.ok && data && typeof data.status === "string") return { ok: true, result: data as VerifyResult };
    const code = (data?.error as ClientErrorCode) || "server";
    return { ok: false, code: KNOWN.includes(code) ? code : "server" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { ok: false, code: navigator.onLine === false ? "offline" : "server" };
  }
}

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

let pending: Promise<boolean> | null = null;

/** Shows Cloudflare Turnstile once. Parallel CSV requests share the same check. */
function passHumanCheck(): Promise<boolean> {
  if (!pending) {
    pending = runTurnstile().finally(() => {
      pending = null;
    });
  }
  return pending;
}

function loadScript(): Promise<Turnstile> {
  const w = window as unknown as { turnstile?: Turnstile };
  if (w.turnstile) return Promise.resolve(w.turnstile);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error("no turnstile")));
    s.onerror = () => reject(new Error("turnstile blocked"));
    document.head.appendChild(s);
  });
}

async function runTurnstile(): Promise<boolean> {
  let box: HTMLDivElement | null = null;
  try {
    const turnstile = await loadScript();
    box = document.createElement("div");
    // Most visitors never see it. When Cloudflare needs a click, it appears at the bottom of the screen.
    box.className = "fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4";
    document.body.appendChild(box);
    const token = await new Promise<string>((resolve, reject) => {
      const id = turnstile.render(box!, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        theme: "dark",
        callback: (t: string) => resolve(t),
        "error-callback": () => reject(new Error("turnstile error")),
        "timeout-callback": () => reject(new Error("turnstile timeout")),
      });
      setTimeout(() => {
        turnstile.remove(id);
        reject(new Error("turnstile took too long"));
      }, 120_000);
    });
    const res = await fetch("/api/human", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    box?.remove();
  }
}
