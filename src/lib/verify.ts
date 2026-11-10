import type { Status } from "@/config/site";

/** Reasons the UI knows how to explain. Anything else falls back to the status line. */
export type Reason =
  | "format"
  | "no_domain"
  | "no_mx"
  | "mailbox"
  | "disposable"
  | "spam_trap"
  | "catch_all"
  | "role"
  | (string & {});

/** The checks the backend reports, in the order the result card lists them. */
export const CHECK_KEYS = ["syntax", "domain", "mx", "smtp", "disposable", "role", "free", "catch_all", "spam_trap"] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];
export const CHECK_STATES = ["pass", "fail", "warn", "info", "unknown", "skipped"] as const;
export type CheckState = (typeof CHECK_STATES)[number];
export type Checks = Partial<Record<CheckKey, CheckState>>;

/** What /api/verify returns to the browser on success. */
export type VerifyResult = {
  email: string;
  status: Status;
  reason?: Reason;
  /** Gmail, Yahoo, Outlook and similar. Information only, not a risk. */
  free?: boolean;
  /** One state per check, when the backend reports them. */
  checks?: Checks;
  /** A corrected address when the domain looks like a typo of a big provider. */
  suggestion?: string;
  /** Checks left for this visitor, when the backend reports it. */
  remaining?: number;
  /** The visitor's monthly limit, when the backend reports it. */
  limit?: number;
  /** True only for mock results in local development. */
  demo?: boolean;
};

/** Error codes /api/verify can return. */
export type VerifyErrorCode = "format" | "limit" | "rate" | "timeout" | "server";

export type VerifyError = { error: VerifyErrorCode };

export type CheckerMode = "live" | "demo" | "early";

const KEYED = {
  risky: ["catch_all", "disposable", "role", "spam_trap"],
  invalid: ["format", "no_domain", "no_mx", "mailbox"],
} as const;

type RiskyKey = `risky_${(typeof KEYED.risky)[number]}`;
type InvalidKey = `invalid_${(typeof KEYED.invalid)[number]}`;

/** Map a result to the copy key that explains it. */
export function resultKey(status: Status, reason?: Reason): Status | RiskyKey | InvalidKey | "unknown_smtp_unavailable" {
  if (status === "unknown" && reason === "smtp_unavailable") return "unknown_smtp_unavailable";
  if (status === "risky" && (KEYED.risky as readonly string[]).includes(reason ?? "")) return `risky_${reason}` as RiskyKey;
  if (status === "invalid" && (KEYED.invalid as readonly string[]).includes(reason ?? "")) return `invalid_${reason}` as InvalidKey;
  return status;
}

/** Keep only known check names and states from an untrusted reply. */
export function cleanChecks(raw: unknown): Checks | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Checks = {};
  for (const key of CHECK_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string" && (CHECK_STATES as readonly string[]).includes(v)) out[key] = v as CheckState;
  }
  return Object.keys(out).length ? out : undefined;
}

const DISPOSABLE_DEMO = ["mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "yopmail.com"];
const ROLE_DEMO = ["info", "admin", "sales", "support", "contact", "hello", "office", "team"];
const FREE_DEMO = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com", "proton.me"];
const TYPO_DEMO: Record<string, string> = { "gmial.com": "gmail.com", "gmail.co": "gmail.com", "hotmial.com": "hotmail.com", "yaho.com": "yahoo.com" };

/**
 * Mock result for local development only. Never used in production.
 * Rules are predictable so a developer can try every state:
 * a local part with "invalid" or "bounce" gives Invalid (mailbox), "nodomain" gives Invalid (domain),
 * "unknown" gives Unknown, "catchall" gives Risky catch-all, "spamtrap" or a typo domain gives Risky spam trap,
 * role names and throwaway domains give Risky.
 */
export function demoResult(email: string): VerifyResult {
  const [local, domain = ""] = email.toLowerCase().split("@");
  const free = FREE_DEMO.includes(domain);
  const disposable = DISPOSABLE_DEMO.includes(domain);
  const role = ROLE_DEMO.includes(local);
  const typo = TYPO_DEMO[domain];
  const trap = Boolean(typo) || local.includes("spamtrap");
  const checks: Checks = {
    syntax: "pass",
    domain: "pass",
    mx: "pass",
    smtp: "pass",
    disposable: disposable ? "warn" : "pass",
    role: role ? "warn" : "pass",
    free: free ? "info" : "pass",
    catch_all: "pass",
    spam_trap: trap ? "warn" : "pass",
  };
  const out = (status: Status, reason?: Reason): VerifyResult => ({
    email,
    status,
    reason,
    free,
    checks,
    ...(typo ? { suggestion: `${email.split("@")[0]}@${typo}` } : {}),
    demo: true,
  });

  if (local.includes("nodomain")) {
    Object.assign(checks, { domain: "fail", mx: "skipped", smtp: "skipped", catch_all: "skipped" });
    return out("invalid", "no_domain");
  }
  if (local.includes("invalid") || local.includes("bounce")) {
    Object.assign(checks, { smtp: "fail", catch_all: "skipped" });
    return out("invalid", "mailbox");
  }
  if (disposable) {
    Object.assign(checks, { smtp: "skipped", catch_all: "skipped" });
    return out("risky", "disposable");
  }
  if (local.includes("unknown") || local.includes("timeout")) {
    Object.assign(checks, { smtp: "unknown", catch_all: "unknown" });
    return trap ? out("risky", "spam_trap") : out("unknown", "smtp");
  }
  if (trap) return out("risky", "spam_trap");
  if (local.includes("catchall")) {
    checks.catch_all = "warn";
    return out("risky", "catch_all");
  }
  if (role) return out("risky", "role");
  return out("valid");
}
