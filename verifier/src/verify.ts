import type { DnsLookup, MailHosts } from "./dns.ts";
import type { ProbeResult, SmtpProbe } from "./smtp.ts";
import { isValidSyntax, splitEmail } from "./syntax.ts";
import { isDisposable, isFree, isRole, isTrapLocal, typoOf } from "./lists.ts";

export type Status = "valid" | "invalid" | "risky" | "unknown";

export type Reason =
  | "format"
  | "no_domain"
  | "no_mx"
  | "mailbox"
  | "disposable"
  | "spam_trap"
  | "catch_all"
  | "role"
  | "dns"
  | "smtp"
  | "smtp_unavailable"
  | "smtp_off";

/**
 * pass: no problem found. fail: this check says the address is bad.
 * warn: a risk signal. info: worth knowing, not a risk (free provider).
 * unknown: no clear answer. skipped: not run, because an earlier check decided the result.
 */
export type CheckState = "pass" | "fail" | "warn" | "info" | "unknown" | "skipped";

export const CHECK_KEYS = ["syntax", "domain", "mx", "smtp", "disposable", "role", "free", "catch_all", "spam_trap"] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];

export type Report = {
  email: string;
  status: Status;
  reason?: Reason;
  free: boolean;
  checks: Record<CheckKey, CheckState>;
  /** Provider this domain looks like a typo of, when there is one. */
  suggestion?: string;
  /** For logs and support. Not shown to visitors. */
  debug?: { mx?: string[]; smtp?: Pick<ProbeResult, "host" | "code" | "detail">; dns?: string };
};

export type Deps = {
  dns: DnsLookup;
  smtp: SmtpProbe | null;
};

/** Domain level answers change slowly, so they are kept for a while. */
type CacheEntry<T> = { value: T; until: number };
const mxCache = new Map<string, CacheEntry<MailHosts>>();
const MX_TTL = 60 * 60 * 1000;
const MX_MISS_TTL = 5 * 60 * 1000;

async function mailHosts(dns: DnsLookup, domain: string) {
  const hit = mxCache.get(domain);
  if (hit && hit.until > Date.now()) return hit.value;
  const value = await dns(domain);
  if (value.kind !== "unknown") {
    mxCache.set(domain, { value, until: Date.now() + (value.kind === "ok" ? MX_TTL : MX_MISS_TTL) });
    if (mxCache.size > 50_000) mxCache.delete(mxCache.keys().next().value!);
  }
  return value;
}

export function clearCache() {
  mxCache.clear();
}

export async function verify(input: string, deps: Deps): Promise<Report> {
  const checks = Object.fromEntries(CHECK_KEYS.map((k) => [k, "skipped"])) as Record<CheckKey, CheckState>;

  // 1. Syntax
  if (!isValidSyntax(input)) {
    checks.syntax = "fail";
    return { email: input.trim(), status: "invalid", reason: "format", free: false, checks };
  }
  checks.syntax = "pass";
  const { email, local, domain } = splitEmail(input);

  // List checks cost nothing, so they always run.
  const free = isFree(domain);
  const typo = typoOf(domain);
  // A misspelled big provider (gmial.com) is a typo or a trap, not a throwaway inbox service,
  // even when a community list happens to include it.
  const disposable = !typo && isDisposable(domain);
  const role = isRole(local);
  const trapLocal = isTrapLocal(local);
  checks.free = free ? "info" : "pass";
  checks.disposable = disposable ? "warn" : "pass";
  checks.role = role ? "warn" : "pass";
  checks.spam_trap = typo || trapLocal ? "warn" : "pass";
  const base = { email, free, checks, ...(typo ? { suggestion: `${local}@${typo}` } : {}) };

  // 2. Domain and 3. MX
  const hosts = await mailHosts(deps.dns, domain);
  if (hosts.kind === "unknown") {
    checks.domain = "unknown";
    checks.mx = "unknown";
    // A trap signal is a reason to hold back even when DNS gives no answer.
    if (typo || trapLocal) return { ...base, status: "risky", reason: "spam_trap", debug: { dns: hosts.detail } };
    return { ...base, status: "unknown", reason: "dns", debug: { dns: hosts.detail } };
  }
  if (hosts.kind === "no_domain") {
    checks.domain = "fail";
    return { ...base, status: "invalid", reason: "no_domain" };
  }
  checks.domain = "pass";
  if (hosts.kind === "no_mx") {
    checks.mx = "fail";
    return { ...base, status: "invalid", reason: "no_mx" };
  }
  checks.mx = "pass";
  const debug: Report["debug"] = { mx: hosts.hosts.slice(0, 3) };

  // Throwaway inboxes are risky whatever the server says. Do not spend a probe on them.
  if (disposable) return { ...base, status: "risky", reason: "disposable", debug };

  // 4. SMTP mailbox and 8. catch-all
  if (!deps.smtp) {
    checks.smtp = "skipped";
    checks.catch_all = "skipped";
    if (typo || trapLocal) return { ...base, status: "risky", reason: "spam_trap", debug };
    return { ...base, status: "unknown", reason: "smtp_off", debug };
  }

  const probe = await deps.smtp(email, domain, hosts.hosts);
  debug.smtp = { host: probe.host, code: probe.code, detail: probe.detail?.slice(0, 300) };

  if (probe.mailbox === "rejected") {
    checks.smtp = "fail";
    return { ...base, status: "invalid", reason: "mailbox", debug };
  }
  if (probe.mailbox === "unknown") {
    checks.smtp = "unknown";
    checks.catch_all = "unknown";
    if (typo || trapLocal) return { ...base, status: "risky", reason: "spam_trap", debug };
    // We could not ask at all (port 25 closed, worker down, our own limits) versus the server not answering clearly.
    const ours = /port 25 unreachable|worker|busy:|connect timeout|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH/.test(probe.detail || "");
    return { ...base, status: "unknown", reason: ours ? "smtp_unavailable" : "smtp", debug };
  }

  checks.smtp = "pass";
  checks.catch_all = probe.catchAll === true ? "warn" : probe.catchAll === false ? "pass" : "unknown";

  if (typo || trapLocal) return { ...base, status: "risky", reason: "spam_trap", debug };
  if (probe.catchAll === true) return { ...base, status: "risky", reason: "catch_all", debug };
  if (role) return { ...base, status: "risky", reason: "role", debug };
  return { ...base, status: "valid", debug };
}
