/** Shared email format rules. Used by the browser for hints and by /api/verify. */

export type HintKey =
  | "empty"
  | "spaces"
  | "noAt"
  | "manyAt"
  | "noLocal"
  | "noDomain"
  | "noDot"
  | "badChars"
  | "ok";

const LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const TLD_RE = /^(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{1,59})$/;

/** Returns which hint fits the current input. "ok" means the format is valid. */
export function formatHint(raw: string): HintKey {
  const value = raw.trim();
  if (!value) return "empty";
  if (/\s/.test(value)) return "spaces";
  const atCount = (value.match(/@/g) || []).length;
  if (atCount === 0) return "noAt";
  if (atCount > 1) return "manyAt";
  const [local, domain] = value.split("@");
  if (!local) return "noLocal";
  if (!domain) return "noDomain";
  if (!domain.includes(".")) return "noDot";
  if (
    local.length > 64 ||
    value.length > 254 ||
    !LOCAL_RE.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  ) {
    return "badChars";
  }
  const labels = domain.split(".");
  const tld = labels[labels.length - 1];
  if (!tld) return "noDot";
  if (!labels.every((l) => LABEL_RE.test(l)) || !TLD_RE.test(tld)) return "badChars";
  return "ok";
}

export function isValidFormat(raw: string) {
  return formatHint(raw) === "ok";
}

export function normalizeEmail(raw: string) {
  const value = raw.trim();
  const at = value.lastIndexOf("@");
  if (at < 0) return value;
  return value.slice(0, at) + "@" + value.slice(at + 1).toLowerCase();
}

/** Common domain typos. Only suggests, never changes input on its own. */
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
};

export function suggestTypo(raw: string): string | null {
  const value = raw.trim();
  const at = value.lastIndexOf("@");
  if (at < 1) return null;
  const domain = value.slice(at + 1).toLowerCase();
  const fix = TYPOS[domain];
  return fix ? `${value.slice(0, at)}@${fix}` : null;
}
