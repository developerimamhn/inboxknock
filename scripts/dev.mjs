/**
 * npm run dev: starts the verifier (real checks) and the website together.
 * Stop both with Ctrl+C.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const root = new URL("..", import.meta.url);
const read = (p) => (fs.existsSync(new URL(p, root)) ? fs.readFileSync(new URL(p, root), "utf8") : "");
const valueOf = (text, key) => text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() || "";

// First run: create local config files so the site talks to the local verifier.
let siteEnv = read(".env.local");
let verifierEnv = read("verifier/.env");
const key = valueOf(siteEnv, "VERIFY_API_KEY") || valueOf(verifierEnv, "API_KEY") || crypto.randomBytes(24).toString("hex");
if (!valueOf(siteEnv, "VERIFY_API_URL")) {
  siteEnv += `${siteEnv && !siteEnv.endsWith("\n") ? "\n" : ""}VERIFY_API_URL=http://localhost:8787/verify\nVERIFY_API_KEY=${key}\n`;
  fs.writeFileSync(new URL(".env.local", root), siteEnv);
  console.log("Created .env.local pointing at the local verifier.");
}
if (!verifierEnv) {
  const example = read("verifier/.env.example");
  verifierEnv = example.replace(/^API_KEY=.*$/m, `API_KEY=${key}`).replace(/^SMTP_HELO=.*$/m, "SMTP_HELO=localhost");
  fs.writeFileSync(new URL("verifier/.env", root), verifierEnv);
  console.log("Created verifier/.env for local use.");
}

const procs = [
  spawn("npm start", { cwd: new URL("verifier/", root), stdio: "inherit", shell: true }),
  spawn("npx next dev", { cwd: root, stdio: "inherit", shell: true }),
];
const stop = () => {
  for (const p of procs) p.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const p of procs) p.on("exit", (code) => code && stop());
