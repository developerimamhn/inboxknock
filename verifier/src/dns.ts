import { Resolver } from "node:dns/promises";

export type MailHosts =
  /** Hosts to try, best first. implicit = no MX, so the domain's own A/AAAA record is used (RFC 5321). */
  | { kind: "ok"; hosts: string[]; implicit: boolean }
  /** The domain does not exist. */
  | { kind: "no_domain" }
  /** The domain exists but cannot receive mail (no MX and no address, or a "null MX"). */
  | { kind: "no_mx" }
  /** DNS did not answer in time. */
  | { kind: "unknown"; detail: string };

export type DnsLookup = (domain: string) => Promise<MailHosts>;

const NOT_FOUND = new Set(["ENOTFOUND", "NXDOMAIN"]);
const NO_DATA = new Set(["ENODATA", "ENOTIMP"]);

function code(err: unknown) {
  return (err as { code?: string })?.code || "UNKNOWN";
}

export function createDnsLookup(timeoutMs: number): DnsLookup {
  const resolver = new Resolver({ timeout: timeoutMs, tries: 2 });

  return async function lookup(domain: string): Promise<MailHosts> {
    try {
      const mx = await resolver.resolveMx(domain);
      // RFC 7505 "null MX": the domain says it accepts no mail.
      if (mx.length === 1 && (mx[0].exchange === "" || mx[0].exchange === ".")) return { kind: "no_mx" };
      const hosts = mx
        .filter((r) => r.exchange && r.exchange !== ".")
        .sort((a, b) => a.priority - b.priority)
        .map((r) => r.exchange.replace(/\.$/, ""));
      if (hosts.length) return { kind: "ok", hosts: [...new Set(hosts)], implicit: false };
    } catch (err) {
      const c = code(err);
      if (NOT_FOUND.has(c)) return { kind: "no_domain" };
      if (!NO_DATA.has(c)) return { kind: "unknown", detail: c };
    }

    // No MX record: fall back to the domain's own address.
    const [a, aaaa] = await Promise.allSettled([resolver.resolve4(domain), resolver.resolve6(domain)]);
    const has = (r: PromiseSettledResult<string[]>) => r.status === "fulfilled" && r.value.length > 0;
    if (has(a) || has(aaaa)) return { kind: "ok", hosts: [domain], implicit: true };
    const codes = [a, aaaa].map((r) => (r.status === "rejected" ? code(r.reason) : "ENODATA"));
    if (codes.every((c) => NOT_FOUND.has(c))) return { kind: "no_domain" };
    if (codes.every((c) => NOT_FOUND.has(c) || NO_DATA.has(c))) return { kind: "no_mx" };
    return { kind: "unknown", detail: codes.join(",") };
  };
}
