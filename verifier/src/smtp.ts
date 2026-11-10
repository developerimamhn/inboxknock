import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";

/**
 * Asks a mail server whether it would accept mail for an address, then stops
 * before DATA. No message is ever sent.
 */

export type MailboxAnswer =
  /** The server said it will take mail for this address. */
  | "accepted"
  /** The server said this mailbox does not exist. */
  | "rejected"
  /** Greylisting, a block on our IP, a timeout, or anything we cannot read with confidence. */
  | "unknown";

export type ProbeResult = {
  mailbox: MailboxAnswer;
  /** True when a made-up address on the same domain is also accepted. null when not tested. */
  catchAll: boolean | null;
  host?: string;
  code?: number;
  detail?: string;
};

export type ProbeOptions = {
  helo: string;
  from: string;
  timeoutMs: number;
  startTls: boolean;
  port?: number;
};

export type SmtpProbe = ((email: string, domain: string, hosts: string[]) => Promise<ProbeResult>) & {
  /** True while outbound port 25 looks blocked on this machine. */
  blocked?: () => boolean;
};

/** Connection errors that mean "we cannot reach port 25 at all", not "this server is down". */
const UNREACHABLE = /connect timeout|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EACCES|EPERM/;

type Reply = { code: number; text: string; lines: string[] };

/** Replies like this mean the server blocked us, not that the mailbox is missing. */
const BLOCKED_RE =
  /spamhaus|spamcop|barracuda|block ?list|blacklist|blocked|banned|reputation|not allowed to send|denied.*(ip|host|connection)|client host|reverse dns|rdns|ptr record|helo|policy|too many|rate limit|try again later|temporar|5\.7\.\d/i;
/** Replies like this mean the mailbox really does not exist. */
const NO_USER_RE =
  /5\.1\.[0-6]|5\.2\.1|user unknown|unknown user|no such user|no such (mail ?box|recipient)|does not exist|doesn't exist|not exist|invalid (mailbox|recipient|address)|recipient (address )?rejected|mailbox (unavailable|not found)|address rejected|not found|unrouteable|undeliverable|disabled|inactive|no mailbox/i;

function classify(reply: Reply): MailboxAnswer {
  if (reply.code === 250 || reply.code === 251) return "accepted";
  if (reply.code >= 500 && reply.code < 600) {
    // Enhanced status 5.1.1 / 5.1.0 / 5.1.10: the address itself is bad. Clear answer.
    if (/(^|\D)5\.1\.(0|1|10)(\D|$)/.test(reply.text)) return "rejected";
    if (BLOCKED_RE.test(reply.text)) return "unknown";
    if (NO_USER_RE.test(reply.text)) return "rejected";
    // A bare 550 with no blocking hint is almost always "no such user".
    if (reply.code === 550 || reply.code === 553) return "rejected";
    return "unknown";
  }
  return "unknown";
}

class Session {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = "";
  private lines: string[] = [];
  private pending: Reply[] = [];
  private waiter: ((r: Reply | Error) => void) | null = null;
  private failure: Error | null = null;
  private timer: NodeJS.Timeout | null = null;
  private timeoutMs: number;

  constructor(socket: net.Socket, timeoutMs: number) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.attach(socket);
  }

  private attach(socket: net.Socket | tls.TLSSocket) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => this.onData(chunk));
    socket.on("error", (err) => this.fail(err));
    socket.on("close", () => this.fail(new Error("closed")));
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    let i: number;
    while ((i = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, i).replace(/\r$/, "");
      this.buffer = this.buffer.slice(i + 1);
      this.lines.push(line);
      // "250-..." continues, "250 ..." ends a reply.
      if (/^\d{3}(?: |$)/.test(line)) {
        const reply: Reply = { code: Number(line.slice(0, 3)), text: this.lines.map((l) => l.slice(4)).join(" "), lines: this.lines };
        this.lines = [];
        this.resolve(reply);
      }
      if (this.buffer.length > 64 * 1024) this.fail(new Error("reply too long"));
    }
  }

  private resolve(r: Reply | Error) {
    const w = this.waiter;
    // A reply that arrives before anyone reads it waits in the queue.
    if (!w) {
      if (!(r instanceof Error)) this.pending.push(r);
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.waiter = null;
    w(r);
  }

  private fail(err: Error) {
    if (!this.failure) this.failure = err;
    this.resolve(this.failure);
  }

  read(): Promise<Reply> {
    const queued = this.pending.shift();
    if (queued) return Promise.resolve(queued);
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.waiter = (r) => (r instanceof Error ? reject(r) : resolve(r));
      this.timer = setTimeout(() => {
        this.fail(new Error("timeout"));
        this.socket.destroy();
      }, this.timeoutMs);
    });
  }

  send(line: string): Promise<Reply> {
    if (this.failure) return Promise.reject(this.failure);
    const reply = this.read();
    this.socket.write(line + "\r\n");
    return reply;
  }

  async upgrade(servername: string) {
    const plain = this.socket as net.Socket;
    plain.removeAllListeners("data");
    plain.removeAllListeners("error");
    plain.removeAllListeners("close");
    const secure = await new Promise<tls.TLSSocket>((resolve, reject) => {
      // Only used to read RCPT replies, so a self-signed certificate is fine here.
      const s = tls.connect({ socket: plain, servername, rejectUnauthorized: false }, () => resolve(s));
      s.once("error", reject);
      setTimeout(() => reject(new Error("tls timeout")), this.timeoutMs).unref();
    });
    this.socket = secure;
    this.buffer = "";
    this.lines = [];
    this.pending = [];
    this.attach(secure);
  }

  close() {
    try {
      this.socket.write("QUIT\r\n");
    } catch {
      /* already closed */
    }
    this.socket.destroy();
  }
}

function connect(host: string, port: number, timeoutMs: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const t = setTimeout(() => {
      socket.destroy();
      reject(new Error("connect timeout"));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(t);
      resolve(socket);
    });
    socket.once("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

async function probeHost(host: string, email: string, domain: string, opt: ProbeOptions): Promise<ProbeResult> {
  // A short connect timeout keeps a blocked port 25 from eating the whole request budget.
  const socket = await connect(host, opt.port ?? 25, Math.min(opt.timeoutMs, 5000));
  const s = new Session(socket, opt.timeoutMs);
  try {
    const greet = await s.read();
    if (greet.code !== 220) return { mailbox: "unknown", catchAll: null, host, code: greet.code, detail: greet.text };

    let ehlo = await s.send(`EHLO ${opt.helo}`);
    if (ehlo.code !== 250) ehlo = await s.send(`HELO ${opt.helo}`);
    if (ehlo.code !== 250) return { mailbox: "unknown", catchAll: null, host, code: ehlo.code, detail: ehlo.text };

    if (opt.startTls && ehlo.lines.some((l) => /^250[ -]STARTTLS/i.test(l))) {
      const st = await s.send("STARTTLS");
      if (st.code === 220) {
        await s.upgrade(host);
        const again = await s.send(`EHLO ${opt.helo}`);
        if (again.code !== 250) return { mailbox: "unknown", catchAll: null, host, code: again.code, detail: again.text };
      }
    }

    const from = await s.send(`MAIL FROM:<${opt.from}>`);
    if (from.code !== 250) return { mailbox: "unknown", catchAll: null, host, code: from.code, detail: from.text };

    const rcpt = await s.send(`RCPT TO:<${email}>`);
    const mailbox = classify(rcpt);
    if (mailbox !== "accepted") return { mailbox, catchAll: null, host, code: rcpt.code, detail: rcpt.text };

    // Catch-all test: would it also take an address nobody could have?
    const fake = `ik-${crypto.randomBytes(9).toString("hex")}@${domain}`;
    const probe = await s.send(`RCPT TO:<${fake}>`);
    const fakeAnswer = classify(probe);
    return { mailbox, catchAll: fakeAnswer === "accepted" ? true : fakeAnswer === "rejected" ? false : null, host, code: rcpt.code, detail: rcpt.text };
  } finally {
    s.close();
  }
}

/** Limits open connections per mail host so we are not mistaken for an attack. */
function createLimiter(perHost: number) {
  const active = new Map<string, number>();
  const queue = new Map<string, Array<() => void>>();
  return async function run<T>(host: string, fn: () => Promise<T>): Promise<T> {
    if ((active.get(host) || 0) >= perHost) {
      await new Promise<void>((r) => {
        const q = queue.get(host) || [];
        q.push(r);
        queue.set(host, q);
      });
    }
    active.set(host, (active.get(host) || 0) + 1);
    try {
      return await fn();
    } finally {
      active.set(host, (active.get(host) || 1) - 1);
      const next = queue.get(host)?.shift();
      if (next) next();
      else if (!active.get(host)) active.delete(host);
    }
  };
}

export type ProbeLimits = {
  /** Most probes this server starts per minute, all mail hosts together. Protects the IP. */
  maxPerMinute: number;
  /** Most probes per minute to one mail host (gmail-smtp-in, outlook protection, ...). */
  hostPerMinute: number;
};

/** Sliding one-minute counter. */
function createMinuteCounter() {
  const hits = new Map<string, number[]>();
  return function take(key: string, max: number) {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
    if (list.length >= max) {
      hits.set(key, list);
      return false;
    }
    list.push(now);
    hits.set(key, list);
    if (hits.size > 20_000) hits.clear();
    return true;
  };
}

/** Mail server replies sometimes repeat the address. Keep it out of logs. */
export function redact(text: string | undefined) {
  return text?.replace(/[^\s<>"'@]+@[^\s<>"']+/g, "<address>").slice(0, 300);
}

type Cached<T> = { value: T; until: number };

export function createSmtpProbe(opt: ProbeOptions & { perHost: number } & Partial<ProbeLimits>): SmtpProbe {
  const limit = createLimiter(opt.perHost);
  const take = createMinuteCounter();
  const maxPerMinute = opt.maxPerMinute ?? 60;
  const hostPerMinute = opt.hostPerMinute ?? 20;

  // Clear answers are kept for a while, so the same address or a known catch-all domain
  // does not cost another connection to the mail server.
  const answers = new Map<string, Cached<ProbeResult>>();
  const catchAllDomains = new Map<string, number>();
  const ANSWER_TTL = 60 * 60 * 1000;
  const CATCH_ALL_TTL = 6 * 60 * 60 * 1000;

  // Many hosts (Vercel and most clouds) block outbound port 25. After a few hosts in a row cannot
  // be reached, stop trying for a while so every check answers Unknown fast instead of timing out.
  let failsInARow = 0;
  let blockedUntil = 0;
  const BLOCK_AFTER = 3;
  const BLOCK_FOR = 10 * 60 * 1000;

  const probe: SmtpProbe = async function probe(email, domain, hosts) {
    const key = email.toLowerCase();
    const hit = answers.get(key);
    if (hit && hit.until > Date.now()) return hit.value;
    if ((catchAllDomains.get(domain) || 0) > Date.now()) return { mailbox: "accepted", catchAll: true, detail: "known catch-all domain" };

    if (Date.now() < blockedUntil) return { mailbox: "unknown", catchAll: null, detail: "port 25 unreachable from this server" };
    if (!take("*", maxPerMinute)) return { mailbox: "unknown", catchAll: null, detail: "busy: probe limit per minute reached" };

    const started = Date.now();
    let last: ProbeResult = { mailbox: "unknown", catchAll: null, detail: "no host answered" };
    // Try up to two hosts. Move on only when a host cannot be reached or gives no clear answer,
    // and only while there is time left for a second try.
    for (const host of hosts.slice(0, 2)) {
      if (Date.now() - started > opt.timeoutMs) break;
      if (!take(host.toLowerCase(), hostPerMinute)) {
        last = { mailbox: "unknown", catchAll: null, host, detail: "busy: limit per mail server reached" };
        continue;
      }
      try {
        const r = await limit(host, () => probeHost(host, email, domain, opt));
        failsInARow = 0;
        r.detail = redact(r.detail);
        if (r.mailbox !== "unknown") {
          answers.set(key, { value: r, until: Date.now() + ANSWER_TTL });
          if (r.catchAll === true) catchAllDomains.set(domain, Date.now() + CATCH_ALL_TTL);
          if (answers.size > 50_000) answers.delete(answers.keys().next().value!);
          return r;
        }
        last = r;
      } catch (err) {
        const message = (err as Error & { code?: string }).code || (err as Error).message;
        if (UNREACHABLE.test(message) && ++failsInARow >= BLOCK_AFTER) {
          blockedUntil = Date.now() + BLOCK_FOR;
          console.warn("Outbound port 25 looks blocked. SMTP checks answer Unknown for the next 10 minutes.");
          return { mailbox: "unknown", catchAll: null, host, detail: "port 25 unreachable from this server" };
        }
        last = { mailbox: "unknown", catchAll: null, host, detail: message };
      }
    }
    return last;
  };
  probe.blocked = () => Date.now() < blockedUntil;
  return probe;
}

/**
 * Sends the mailbox check to an SMTP worker on another server (a VPS with port 25 open).
 * Everything else still runs here. Any failure is an honest Unknown, never a guess.
 */
export function createRemoteProbe(url: string, key: string, timeoutMs: number): SmtpProbe {
  return async function remote(email, domain, hosts) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ email, domain, hosts: hosts.slice(0, 5) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return { mailbox: "unknown", catchAll: null, detail: `worker replied ${res.status}` };
      const data = (await res.json()) as Partial<ProbeResult>;
      const mailbox = data.mailbox === "accepted" || data.mailbox === "rejected" ? data.mailbox : "unknown";
      const catchAll = typeof data.catchAll === "boolean" ? data.catchAll : null;
      return { mailbox, catchAll, host: data.host, code: data.code, detail: data.detail };
    } catch (err) {
      return { mailbox: "unknown", catchAll: null, detail: `worker unreachable: ${(err as Error).name}` };
    }
  };
}

export const __test = { classify };
