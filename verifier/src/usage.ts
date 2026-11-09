import fs from "node:fs";
import path from "node:path";

/**
 * Free monthly checks and a per-minute rate limit, counted per visitor key
 * (the visitor IP until the site has accounts). Saved to DATA_DIR/usage.json
 * so a restart does not reset anyone's count.
 */

const month = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export class Usage {
  private file: string;
  private limit: number;
  private perMinute: number;
  private period = month();
  private used = new Map<string, number>();
  private minute = new Map<string, { start: number; count: number }>();
  private dirty = false;
  private timer: NodeJS.Timeout;

  constructor(dataDir: string, limit: number, perMinute: number) {
    this.file = path.join(dataDir, "usage.json");
    this.limit = limit;
    this.perMinute = perMinute;
    fs.mkdirSync(dataDir, { recursive: true });
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, "utf8")) as { period: string; used: Record<string, number> };
      if (saved.period === this.period) this.used = new Map(Object.entries(saved.used));
    } catch {
      /* first run */
    }
    this.timer = setInterval(() => this.save(), 10_000);
    this.timer.unref();
  }

  private roll() {
    const now = month();
    if (now !== this.period) {
      this.period = now;
      this.used.clear();
      this.dirty = true;
    }
  }

  /** null when allowed, otherwise why not. */
  check(key: string): "rate" | "limit" | null {
    this.roll();
    const now = Date.now();
    const m = this.minute.get(key);
    if (!m || now - m.start > 60_000) this.minute.set(key, { start: now, count: 1 });
    else if (++m.count > this.perMinute) return "rate";
    if (this.minute.size > 100_000) this.minute.clear();
    if ((this.used.get(key) || 0) >= this.limit) return "limit";
    return null;
  }

  /** Count one check. Returns what is left. */
  spend(key: string) {
    const n = (this.used.get(key) || 0) + 1;
    this.used.set(key, n);
    this.dirty = true;
    return Math.max(0, this.limit - n);
  }

  remaining(key: string) {
    this.roll();
    return Math.max(0, this.limit - (this.used.get(key) || 0));
  }

  get monthlyLimit() {
    return this.limit;
  }

  save() {
    if (!this.dirty) return;
    this.dirty = false;
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify({ period: this.period, used: Object.fromEntries(this.used) }));
    fs.renameSync(tmp, this.file);
  }

  stop() {
    clearInterval(this.timer);
    this.save();
  }
}
