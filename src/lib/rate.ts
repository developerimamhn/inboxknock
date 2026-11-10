/**
 * Per-IP token bucket. A visitor can fire a short burst, then one check per second.
 * Lives in memory, so on Vercel each instance counts on its own; the verifier
 * keeps a second bucket behind it. Works without any configuration.
 */

const BURST = Number(process.env.RATE_BURST) || 10;
const PER_SECOND = (Number(process.env.RATE_PER_MINUTE) || 60) / 60;

const buckets = new Map<string, { tokens: number; at: number }>();

/** True when this IP may run one more check now. */
export function takeToken(ip: string) {
  const key = ip || "unknown";
  const now = Date.now();
  const b = buckets.get(key) || { tokens: BURST, at: now };
  b.tokens = Math.min(BURST, b.tokens + ((now - b.at) / 1000) * PER_SECOND);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 50_000) buckets.clear();
  return true;
}
