import crypto from "node:crypto";

/**
 * Optional bot check with Cloudflare Turnstile. Server only.
 * On when TURNSTILE_SECRET_KEY (server) and NEXT_PUBLIC_TURNSTILE_SITE_KEY (browser) are set.
 * A visitor solves it once, then gets a signed cookie tied to their IP for two hours,
 * so a CSV run does not ask again for every row.
 */

export const PASS_COOKIE = "ik_pass";
export const PASS_SECONDS = 2 * 60 * 60;

export function humanCheckOn() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

function sign(payload: string) {
  return crypto.createHmac("sha256", process.env.TURNSTILE_SECRET_KEY || "").update(payload).digest("base64url");
}

export function makePass(ip: string) {
  const until = Math.floor(Date.now() / 1000) + PASS_SECONDS;
  return `${until}.${sign(`${until}.${ip}`)}`;
}

export function validPass(cookieHeader: string | null, ip: string) {
  const raw = (cookieHeader || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PASS_COOKIE}=`))
    ?.slice(PASS_COOKIE.length + 1);
  if (!raw) return false;
  const [until, mac] = raw.split(".");
  if (!until || !mac || Number(until) < Date.now() / 1000) return false;
  const want = Buffer.from(sign(`${until}.${ip}`));
  const got = Buffer.from(mac);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

/** Asks Cloudflare whether the widget token is real. */
export async function verifyTurnstile(token: string, ip: string) {
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY || "", response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
