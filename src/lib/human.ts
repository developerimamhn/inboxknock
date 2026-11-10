import crypto from "node:crypto";

/**
 * Bot check in front of /api/verify. Server only. Always on unless BOT_CHECK=off.
 *
 * - With TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY set: Cloudflare Turnstile.
 * - Without them: a small proof of work. The browser hashes until it finds a matching nonce
 *   (about a second on a phone). People never see it; a script has to pay that cost for
 *   every IP it uses, and the per-IP rate limit still applies.
 *
 * Passing gives a signed cookie tied to the visitor IP for two hours, so a CSV run asks once.
 */

export const PASS_COOKIE = "ik_pass";
export const PASS_SECONDS = 2 * 60 * 60;
/** Leading zero bits the proof of work needs. 14 bits is about 16,000 hashes on average. */
export const POW_BITS = 14;
const CHALLENGE_SECONDS = 5 * 60;

export function humanCheckOn() {
  return process.env.BOT_CHECK !== "off";
}

export function turnstileOn() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

/**
 * Signing secret. IK_BUILD_SECRET is random per build (see next.config.ts), so every
 * instance of one deployment agrees on it even when no secret is configured.
 */
function secret() {
  return process.env.TURNSTILE_SECRET_KEY || process.env.VERIFY_API_KEY || process.env.IK_BUILD_SECRET || "";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function makePass(ip: string) {
  const until = Math.floor(Date.now() / 1000) + PASS_SECONDS;
  return `${until}.${sign(`pass.${until}.${ip}`)}`;
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
  return safeEqual(mac, sign(`pass.${until}.${ip}`));
}

/** A fresh proof-of-work challenge, signed so the server needs no memory. */
export function makeChallenge(ip: string) {
  const until = Math.floor(Date.now() / 1000) + CHALLENGE_SECONDS;
  const rand = crypto.randomBytes(12).toString("base64url");
  return `${until}.${rand}.${sign(`pow.${until}.${rand}.${ip}`)}`;
}

function leadingZeroBits(buf: Buffer) {
  let bits = 0;
  for (const byte of buf) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

export function validProof(challenge: string, nonce: string, ip: string) {
  const [until, rand, mac] = challenge.split(".");
  if (!until || !rand || !mac || Number(until) < Date.now() / 1000) return false;
  if (!safeEqual(mac, sign(`pow.${until}.${rand}.${ip}`))) return false;
  if (!/^\d{1,12}$/.test(nonce)) return false;
  const hash = crypto.createHash("sha256").update(`${challenge}:${nonce}`).digest();
  return leadingZeroBits(hash) >= POW_BITS;
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
