import { NextResponse } from "next/server";
import { clientIp, json, sameOrigin } from "@/lib/api";
import { PASS_COOKIE, PASS_SECONDS, humanCheckOn, makePass, verifyTurnstile } from "@/lib/human";

export const dynamic = "force-dynamic";

/** POST /api/human { token }: trades a Turnstile token for a short-lived pass cookie. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "server" }, 403);
  if (!humanCheckOn()) return json({ ok: true });

  let token = "";
  try {
    const body = (await req.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.slice(0, 4096) : "";
  } catch {
    /* empty body */
  }
  const ip = clientIp(req);
  if (!token || !(await verifyTurnstile(token, ip))) return json({ error: "human" }, 403);

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
