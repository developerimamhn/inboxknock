import { isLang } from "@/config/site";
import { json, sameOrigin } from "@/lib/api";
import { isValidFormat, normalizeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/early-access  { email, lang }
 * Forwards to EARLY_ACCESS_WEBHOOK_URL. If that is not set, returns 503
 * and the form tells the visitor to write to the contact email instead.
 * It never pretends a sign-up was saved.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "server" }, 403);

  let body: { email?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "format" }, 400);
  }
  if (typeof body.email !== "string" || !isValidFormat(body.email)) return json({ error: "format" }, 400);

  const webhook = process.env.EARLY_ACCESS_WEBHOOK_URL;
  if (!webhook) return json({ error: "closed" }, 503);

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizeEmail(body.email),
        lang: typeof body.lang === "string" && isLang(body.lang) ? body.lang : "en",
        source: "inboxknock.com hero",
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) return json({ error: "server" }, 502);
  } catch {
    return json({ error: "server" }, 502);
  }
  return json({ ok: true });
}
