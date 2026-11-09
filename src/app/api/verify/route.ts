import { STATUSES, VERIFY_TIMEOUT_MS, verifyEndpoint, type Status } from "@/config/site";
import { clientIp, json, readEmail, sameOrigin } from "@/lib/api";
import { isValidFormat, normalizeEmail } from "@/lib/email";
import { cleanChecks, demoResult, type VerifyResult } from "@/lib/verify";

export const dynamic = "force-dynamic";

/** Development demo only: a real DNS lookup so a dead domain is never shown as Valid. */
async function hasMailServer(domain: string): Promise<true | "no_domain" | "no_mx" | "unknown"> {
  const dns = await import("node:dns/promises");
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.some((r) => r.exchange && r.exchange !== ".")) return true;
    return "no_mx";
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOTFOUND") return "no_domain";
    if (code !== "ENODATA") return "unknown";
  }
  try {
    return (await dns.resolve4(domain)).length ? true : "no_mx";
  } catch {
    return "no_mx";
  }
}

/**
 * POST /api/verify  { email }
 * 1. Validates the format here, so bad input never costs a check.
 * 2. Forwards to the verifier (Vercel binding VERIFIER_URL, or VERIFY_API_URL).
 * 3. Without either: mock "Demo result" in development, 503 in production.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "server" }, 403);

  const raw = await readEmail(req);
  if (raw === null || !isValidFormat(raw)) return json({ error: "format" }, 400);
  const email = normalizeEmail(raw);

  const endpoint = verifyEndpoint();
  if (!endpoint) {
    if (process.env.NODE_ENV === "development") {
      // Short pause so the loading state can be reviewed. Development only.
      await new Promise((r) => setTimeout(r, 900));
      const demo = demoResult(email);
      // Even the demo must never call a domain without a mail server Valid.
      const mail = await hasMailServer(email.split("@")[1]);
      if (mail !== true && demo.status !== "risky") {
        demo.status = mail === "no_domain" || mail === "no_mx" ? "invalid" : "unknown";
        demo.reason = mail === "no_domain" || mail === "no_mx" ? mail : "dns";
        demo.checks = { ...demo.checks, domain: mail === "no_domain" ? "fail" : "pass", mx: "fail", smtp: "skipped", catch_all: "skipped" };
      }
      return json(demo);
    }
    return json({ error: "server" }, 503);
  }

  let upstream: Response;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (process.env.VERIFY_API_KEY) headers.Authorization = `Bearer ${process.env.VERIFY_API_KEY}`;
    const ip = clientIp(req);
    if (ip) headers["X-Forwarded-For"] = ip;
    const cookie = req.headers.get("cookie");
    if (cookie) headers.Cookie = cookie; // lets the backend see the signed-in account

    upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return json({ error: timedOut ? "timeout" : "server" }, timedOut ? 504 : 502);
  }

  const data = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

  if (upstream.status === 402 || data?.error === "limit") return json({ error: "limit" }, 402);
  if (upstream.status === 429) return json({ error: "rate" }, 429);
  if (upstream.status === 400 || data?.error === "format") return json({ error: "format" }, 400);
  if (!upstream.ok || !data) return json({ error: "server" }, 502);

  const status = String(data.status || "").toLowerCase() as Status;
  if (!STATUSES.includes(status)) return json({ error: "server" }, 502);

  const result: VerifyResult = { email, status };
  if (typeof data.reason === "string") result.reason = data.reason;
  if (typeof data.free === "boolean") result.free = data.free;
  const checks = cleanChecks(data.checks);
  if (checks) result.checks = checks;
  if (typeof data.suggestion === "string" && isValidFormat(data.suggestion)) result.suggestion = data.suggestion;
  if (typeof data.remaining === "number") result.remaining = data.remaining;
  if (typeof data.limit === "number") result.limit = data.limit;
  return json(result);
}
