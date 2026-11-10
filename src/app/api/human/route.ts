import { NextResponse } from "next/server";
import { clientIp, json, sameOrigin } from "@/lib/api";
import { takeToken } from "@/lib/rate";
import {
  PASS_COOKIE,
  PASS_SECONDS,
  POW_BITS,
  humanCheckOn,
  makeChallenge,
  makePass,
  turnstileOn,
  validProof,
  verifyTurnstile,
} from "@/lib/human";

export const dynamic = "force-dynamic";

/** GET /api/human: which bot check to run, and a challenge when it is proof of work. */
export async function GET(req: Request) {
  if (!humanCheckOn()) return json({ kind: "none" });
  if (turnstileOn()) return json({ kind: "turnstile" });
  return json({ kind: "pow", challenge: makeChallenge(clientIp(req)), bits: POW_BITS });
}

/** POST /api/human { token } or { challenge, nonce }: trades a passed check for a pass cookie. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "server" }, 403);
  if (!humanCheckOn()) return json({ ok: true });
  const ip = clientIp(req);
  if (!takeToken(`human:${ip}`)) return json({ error: "rate" }, 429);

  let body: { token?: unknown; challenge?: unknown; nonce?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }

  let passed = false;
  if (turnstileOn()) {
    const token = typeof body.token === "string" ? body.token.slice(0, 4096) : "";
    passed = Boolean(token) && (await verifyTurnstile(token, ip));
  } else {
    const challenge = typeof body.challenge === "string" ? body.challenge.slice(0, 256) : "";
    const nonce = typeof body.nonce === "string" || typeof body.nonce === "number" ? String(body.nonce) : "";
    passed = validProof(challenge, nonce, ip);
  }
  if (!passed) return json({ error: "human" }, 403);

  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(PASS_COOKIE, makePass(ip), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: PASS_SECONDS,
  });
  return res;
}
