import path from "node:path";

const env = process.env;

function num(name: string, fallback: number) {
  const v = Number(env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function on(name: string, fallback: boolean) {
  const v = (env[name] || "").trim().toLowerCase();
  if (!v) return fallback;
  return !["off", "false", "0", "no"].includes(v);
}

export const config = {
  port: num("PORT", 8787),
  host: env.HOST || "0.0.0.0",
  // On Vercel both services share project env vars, so the website's VERIFY_API_KEY works here too.
  apiKey: env.API_KEY || env.VERIFY_API_KEY || "",
  smtp: {
    enabled: on("SMTP_PROBE", true),
    helo: env.SMTP_HELO || "verify.inboxknock.com",
    from: env.SMTP_FROM || "verify@inboxknock.com",
    timeoutMs: num("SMTP_TIMEOUT_MS", 10000),
    startTls: on("SMTP_STARTTLS", true),
    perHost: num("SMTP_PER_HOST", 3),
  },
  dnsTimeoutMs: num("DNS_TIMEOUT_MS", 5000),
  monthlyLimit: num("FREE_MONTHLY_CHECKS", 10000),
  ratePerMinute: num("RATE_PER_MINUTE", 300),
  dataDir: path.resolve(env.DATA_DIR || "./data"),
};

export type Config = typeof config;
