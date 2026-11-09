/** Check addresses from the command line: npm run check -- name@company.com other@example.org */
import { config } from "./config.ts";
import { createDnsLookup } from "./dns.ts";
import { createSmtpProbe } from "./smtp.ts";
import { loadExtraLists } from "./lists.ts";
import { verify } from "./verify.ts";

loadExtraLists(config.dataDir);
const deps = {
  dns: createDnsLookup(config.dnsTimeoutMs),
  smtp: config.smtp.enabled ? createSmtpProbe({ ...config.smtp }) : null,
};

const emails = process.argv.slice(2);
if (!emails.length) {
  console.log("Usage: npm run check -- name@company.com [more...]");
  process.exit(1);
}
for (const email of emails) {
  const t = Date.now();
  const r = await verify(email, deps);
  console.log(JSON.stringify({ ...r, ms: Date.now() - t }, null, 2));
}
