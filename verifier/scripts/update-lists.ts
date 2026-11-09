/**
 * Downloads the community list of disposable email domains into DATA_DIR/disposable.txt.
 * Source: https://github.com/disposable-email-domains/disposable-email-domains (CC0).
 * Run it now and then (for example once a week), then restart the service.
 */
import fs from "node:fs";
import path from "node:path";

const SOURCE = "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";
const dataDir = path.resolve(process.env.DATA_DIR || "./data");

const res = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) });
if (!res.ok) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}
const text = await res.text();
const domains = text
  .split(/\r?\n/)
  .map((l) => l.trim().toLowerCase())
  .filter((l) => l && !l.startsWith("#") && /^[a-z0-9.-]+\.[a-z0-9-]{2,}$/.test(l));

if (domains.length < 1000) {
  console.error(`Only ${domains.length} domains found. Keeping the old file.`);
  process.exit(1);
}
fs.mkdirSync(dataDir, { recursive: true });
const file = path.join(dataDir, "disposable.txt");
fs.writeFileSync(file, `# ${SOURCE}\n# downloaded ${new Date().toISOString()}\n${domains.join("\n")}\n`);
console.log(`Saved ${domains.length} disposable domains to ${file}`);
