import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { verify, clearCache, type Deps } from "../src/verify.ts";
import type { MailHosts } from "../src/dns.ts";
import { createSmtpProbe, type ProbeResult } from "../src/smtp.ts";
import { isDisposable, isFree, isRole, typoOf } from "../src/lists.ts";

const dnsTable: Record<string, MailHosts> = {
  "acme.io": { kind: "ok", hosts: ["mx.acme.io"], implicit: false },
  "gmail.com": { kind: "ok", hosts: ["gmail-smtp-in.l.google.com"], implicit: false },
  "mailinator.com": { kind: "ok", hosts: ["mail.mailinator.com"], implicit: false },
  "gmial.com": { kind: "ok", hosts: ["mx.gmial.com"], implicit: false },
  "nomail.io": { kind: "no_mx" },
  "slow.io": { kind: "unknown", detail: "ETIMEOUT" },
};

function deps(smtp: (email: string) => ProbeResult | null): Deps {
  clearCache();
  return {
    dns: async (d) => dnsTable[d] ?? { kind: "no_domain" },
    smtp: async (email) => smtp(email) ?? { mailbox: "accepted", catchAll: false },
  };
}

const accept = deps(() => null);

test("syntax", async () => {
  const r = await verify("bad@", accept);
  assert.equal(r.status, "invalid");
  assert.equal(r.reason, "format");
  assert.equal(r.checks.syntax, "fail");
});

test("domain does not exist", async () => {
  const r = await verify("sam@no-such-domain.io", accept);
  assert.deepEqual([r.status, r.reason, r.checks.domain], ["invalid", "no_domain", "fail"]);
});

test("domain without mail server", async () => {
  const r = await verify("sam@nomail.io", accept);
  assert.deepEqual([r.status, r.reason, r.checks.domain, r.checks.mx], ["invalid", "no_mx", "pass", "fail"]);
});

test("dns timeout is unknown, not invalid", async () => {
  const r = await verify("sam@slow.io", accept);
  assert.deepEqual([r.status, r.reason], ["unknown", "dns"]);
});

test("valid mailbox, free provider flagged as info", async () => {
  const r = await verify("sam@gmail.com", accept);
  assert.equal(r.status, "valid");
  assert.equal(r.free, true);
  assert.equal(r.checks.free, "info");
  assert.equal(r.checks.smtp, "pass");
  assert.equal(r.checks.catch_all, "pass");
});

test("mailbox rejected", async () => {
  const r = await verify("ghost@acme.io", deps(() => ({ mailbox: "rejected", catchAll: null })));
  assert.deepEqual([r.status, r.reason, r.checks.smtp], ["invalid", "mailbox", "fail"]);
});

test("server gives no clear answer", async () => {
  const r = await verify("sam@acme.io", deps(() => ({ mailbox: "unknown", catchAll: null })));
  assert.deepEqual([r.status, r.reason], ["unknown", "smtp"]);
});

test("catch-all", async () => {
  const r = await verify("sam@acme.io", deps(() => ({ mailbox: "accepted", catchAll: true })));
  assert.deepEqual([r.status, r.reason, r.checks.catch_all], ["risky", "catch_all", "warn"]);
});

test("disposable skips the probe", async () => {
  let probed = false;
  const r = await verify("x@mailinator.com", deps(() => ((probed = true), null)));
  assert.deepEqual([r.status, r.reason, r.checks.smtp], ["risky", "disposable", "skipped"]);
  assert.equal(probed, false);
});

test("role address", async () => {
  const r = await verify("info@acme.io", accept);
  assert.deepEqual([r.status, r.reason, r.checks.role], ["risky", "role", "warn"]);
});

test("typo trap domain", async () => {
  const r = await verify("sam@gmial.com", accept);
  assert.deepEqual([r.status, r.reason, r.checks.spam_trap], ["risky", "spam_trap", "warn"]);
  assert.equal(r.suggestion, "sam@gmail.com");
});

test("trap-like local part", async () => {
  const r = await verify("spamtrap@acme.io", accept);
  assert.deepEqual([r.status, r.reason], ["risky", "spam_trap"]);
});

test("smtp off gives unknown, never a guess", async () => {
  clearCache();
  const r = await verify("sam@acme.io", { dns: accept.dns, smtp: null });
  assert.deepEqual([r.status, r.reason, r.checks.smtp], ["unknown", "smtp_off", "skipped"]);
});

test("lists", () => {
  assert.ok(isDisposable("mailinator.com"));
  assert.ok(isDisposable("sub.mailinator.com"));
  assert.ok(!isDisposable("gmail.com"));
  assert.ok(isFree("outlook.com"));
  assert.ok(!isFree("acme.io"));
  assert.ok(isRole("Info"));
  assert.ok(isRole("sales+eu"));
  assert.ok(!isRole("sam"));
  assert.equal(typoOf("gmail.co"), "gmail.com");
  assert.equal(typoOf("hotmial.com"), "hotmail.com");
  assert.equal(typoOf("ymail.com"), null, "a real provider is never a typo");
  assert.equal(typoOf("wahoo.com"), null, "short names only match the known list");
  assert.equal(typoOf("acme.io"), null);
});

/** A tiny fake mail server. `answer` decides the reply to each RCPT TO. */
function fakeSmtp(answer: (rcpt: string) => string, greeting = "220 fake ESMTP") {
  const server = net.createServer((sock) => {
    sock.write(greeting + "\r\n");
    let buf = "";
    sock.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (/^EHLO/i.test(line)) sock.write("250-fake\r\n250-SIZE 1000\r\n250 8BITMIME\r\n");
        else if (/^MAIL FROM/i.test(line)) sock.write("250 2.1.0 OK\r\n");
        else if (/^RCPT TO/i.test(line)) sock.write(answer(line.slice(9, -1)) + "\r\n");
        else if (/^QUIT/i.test(line)) sock.end("221 bye\r\n");
        else sock.write("502 no\r\n");
      }
    });
    sock.on("error", () => {});
  });
  return new Promise<{ port: number; close: () => void }>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as net.AddressInfo).port, close: () => server.close() })),
  );
}

async function probeWith(answer: (rcpt: string) => string) {
  const srv = await fakeSmtp(answer);
  const probe = createSmtpProbe({ helo: "test.local", from: "t@test.local", timeoutMs: 3000, startTls: false, perHost: 2, port: srv.port });
  try {
    return await probe("sam@acme.io", "acme.io", ["127.0.0.1"]);
  } finally {
    srv.close();
  }
}

test("smtp: accepted, not catch-all", async () => {
  const r = await probeWith((to) => (to.startsWith("sam@") ? "250 2.1.5 OK" : "550 5.1.1 No such user"));
  assert.deepEqual([r.mailbox, r.catchAll], ["accepted", false]);
});

test("smtp: catch-all", async () => {
  const r = await probeWith(() => "250 OK");
  assert.deepEqual([r.mailbox, r.catchAll], ["accepted", true]);
});

test("smtp: user unknown", async () => {
  const r = await probeWith(() => "550-5.1.1 The email account that you tried to reach does not exist. Please try\r\n550 5.1.1 double-checking the recipient's email address");
  assert.equal(r.mailbox, "rejected");
});

test("smtp: our IP is blocked is unknown, not invalid", async () => {
  const r = await probeWith(() => "550 5.7.1 Service unavailable; client host blocked using Spamhaus");
  assert.equal(r.mailbox, "unknown");
});

test("smtp: greylisting is unknown", async () => {
  const r = await probeWith(() => "451 4.7.1 Greylisted, try again later");
  assert.equal(r.mailbox, "unknown");
});

test("smtp: nothing listening is unknown", async () => {
  const probe = createSmtpProbe({ helo: "t", from: "t@t", timeoutMs: 1000, startTls: false, perHost: 2, port: 1 });
  const r = await probe("sam@acme.io", "acme.io", ["127.0.0.1"]);
  assert.equal(r.mailbox, "unknown");
});

test("typo trap stays risky when its DNS is broken", async () => {
  clearCache();
  const r = await verify("sam@gmial.com", { dns: async () => ({ kind: "unknown", detail: "ESERVFAIL" }), smtp: null });
  assert.deepEqual([r.status, r.reason], ["risky", "spam_trap"]);
});

test("smtp: blocked port 25 switches to fast Unknown", async () => {
  // 10.255.255.1 is not routable, so connects time out like a firewall drop.
  const probe = createSmtpProbe({ helo: "t", from: "t@t", timeoutMs: 300, startTls: false, perHost: 4, port: 25 });
  await probe("a@x.io", "x.io", ["10.255.255.1", "10.255.255.2"]);
  const second = await probe("a@x.io", "x.io", ["10.255.255.3", "10.255.255.4"]);
  assert.equal(second.detail, "port 25 unreachable from this server");
  assert.equal(probe.blocked?.(), true);
  const t = Date.now();
  const third = await probe("a@x.io", "x.io", ["10.255.255.5"]);
  assert.equal(third.mailbox, "unknown");
  assert.ok(Date.now() - t < 50, "answers at once while blocked");
});
