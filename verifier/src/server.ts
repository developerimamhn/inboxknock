import http from "node:http";
import crypto from "node:crypto";
import { config } from "./config.ts";
import { createDnsLookup } from "./dns.ts";
import { createRemoteProbe, createSmtpProbe, redact, type SmtpProbe } from "./smtp.ts";
import { listSizes, loadExtraLists } from "./lists.ts";
import { isValidSyntax } from "./syntax.ts";
import { Usage } from "./usage.ts";
import { verify, type Deps } from "./verify.ts";

/**
 * POST /verify (or POST /)  { "email": "name@company.com" }
 * GET  /health
 * Reply format is described in the website README under "Backend contract".
 */

loadExtraLists(config.dataDir);

// The local probe also serves POST /smtp when this server runs as the SMTP worker on a VPS.
const localProbe: SmtpProbe | null = config.smtp.enabled && !config.worker.url ? createSmtpProbe({ ...config.smtp }) : null;
const deps: Deps = {
  dns: createDnsLookup(config.dnsTimeoutMs),
  smtp: config.worker.url ? createRemoteProbe(config.worker.url, config.worker.key, config.worker.timeoutMs) : localProbe,
};
const HOST_RE = /^[a-z0-9.-]{1,253}$/i;
const usage = new Usage(config.dataDir, config.monthlyLimit, config.ratePerMinute);

function send(res: http.ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function authorized(req: http.IncomingMessage) {
  if (!config.apiKey) return true;
  const got = Buffer.from(String(req.headers.authorization || ""));
  const want = Buffer.from(`Bearer ${config.apiKey}`);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/**
 * The website forwards the visitor IP. Trust it when the caller proved who it is (API key),
 * or on Vercel, where this service is internal and only the website can reach it.
 */
function visitorKey(req: http.IncomingMessage) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if ((config.apiKey || process.env.VERCEL === "1") && forwarded) return forwarded;
  return req.socket.remoteAddress || "unknown";
}

function readBody(req: http.IncomingMessage, max = 4096): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > max) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://x");

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true,
      smtp: config.worker.url ? "worker" : config.smtp.enabled ? "local" : "off",
      port25Blocked: localProbe?.blocked?.() ?? false,
      lists: listSizes(),
    });
  }

  // SMTP worker: mailbox and catch-all only. Needs API_KEY, never open to the public.
  if (req.method === "POST" && url.pathname === "/smtp") {
    if (!config.apiKey) return send(res, 503, { error: "worker needs API_KEY" });
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
    if (!localProbe) return send(res, 503, { error: "smtp off" });
    let body: { email?: unknown; domain?: unknown; hosts?: unknown };
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return send(res, 400, { error: "format" });
    }
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase() : "";
    const hosts = Array.isArray(body.hosts) ? body.hosts.filter((h): h is string => typeof h === "string" && HOST_RE.test(h)).slice(0, 5) : [];
    if (!isValidSyntax(email) || !email.toLowerCase().endsWith(`@${domain}`) || !hosts.length) return send(res, 400, { error: "format" });
    const started = Date.now();
    const result = await localProbe(email, domain, hosts);
    console.log(JSON.stringify({ at: new Date().toISOString(), worker: true, ms: Date.now() - started, domain, mailbox: result.mailbox, catchAll: result.catchAll, host: result.host, code: result.code, detail: redact(result.detail) }));
    return send(res, 200, { ...result, detail: redact(result.detail) });
  }
  if (req.method !== "POST" || (url.pathname !== "/" && url.pathname !== "/verify")) {
    return send(res, 404, { error: "not_found" });
  }
  if (!authorized(req)) return send(res, 401, { error: "unauthorized" });

  let email = "";
  try {
    const body = JSON.parse(await readBody(req)) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return send(res, 400, { error: "format" });
  }
  // Bad format never costs a check.
  if (!isValidSyntax(email)) return send(res, 400, { error: "format" });

  const key = visitorKey(req);
  const blocked = usage.check(key);
  if (blocked === "rate") return send(res, 429, { error: "rate" });
  if (blocked === "limit") return send(res, 402, { error: "limit", remaining: 0, limit: usage.monthlyLimit });

  const started = Date.now();
  try {
    const report = await verify(email, deps);
    const remaining = usage.spend(key);
    const { debug, ...publicReport } = report;
    if (debug?.smtp) debug.smtp.detail = redact(debug.smtp.detail);
    console.log(
      JSON.stringify({ at: new Date().toISOString(), ms: Date.now() - started, status: report.status, reason: report.reason, domain: email.split("@")[1], debug }),
    );
    return send(res, 200, { ...publicReport, remaining, limit: usage.monthlyLimit });
  } catch (err) {
    console.error("verify failed", err);
    return send(res, 500, { error: "server" });
  }
});

server.requestTimeout = 30_000;
server.listen(config.port, config.host, () => {
  console.log(
    `InboxKnock verifier on http://${config.host}:${config.port}  smtp=${config.smtp.enabled ? "on" : "off"}  auth=${config.apiKey ? "on" : "off"}  lists=${JSON.stringify(listSizes())}`,
  );
  if (!config.apiKey) console.warn("API_KEY is not set. Anyone who can reach this port can use it. Set API_KEY before going live.");
});

function shutdown() {
  usage.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
