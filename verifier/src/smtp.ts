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

export function createSmtpProbe(opt: ProbeOptions & { perHost: number }): SmtpProbe {
  const limit = createLimiter(opt.perHost);
  // Many hosts (Vercel and most clouds) block outbound port 25. After a few hosts in a row cannot
  // be reached, stop trying for a while so every check answers Unknown fast instead of timing out.
  let failsInARow = 0;
  let blockedUntil = 0;
  const BLOCK_AFTER = 3;
  const BLOCK_FOR = 10 * 60 * 1000;

  const probe: SmtpProbe = async function probe(email, domain, hosts) {
    if (Date.now() < blockedUntil) return { mailbox: "unknown", catchAll: null, detail: "port 25 unreachable from this server" };
    let last: ProbeResult = { mailbox: "unknown", catchAll: null, detail: "no host answered" };
    // Try up to two hosts. Move on only when a host cannot be reached or gives no clear answer.
    for (const host of hosts.slice(0, 2)) {
      try {
        const r = await limit(host, () => probeHost(host, email, domain, opt));
        failsInARow = 0;
        if (r.mailbox !== "unknown") return r;
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

export const __test = { classify };
