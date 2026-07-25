/**
 * In-memory per-client token bucket (ADR 24).
 *
 * Deliberately duplicated in `backend/security.ts` rather than shared: ADR 22
 * forbids a dependency between the two packages, and this is ~45 lines against
 * a different request object. ADR 24's limits table is the contract the two
 * copies are held to, not this file.
 */

/** ADR 24: every render-costing request. Static assets are not metered. */
export const PAGE_LIMIT = { capacity: 240, refillPerMinute: 240 } as const;

/**
 * Bounded so the limiter cannot become the memory-exhaustion bug it exists to
 * prevent. Far above one household's worth of clients.
 */
const MAX_TRACKED_KEYS = 10_000;

/** Full buckets are swept, not evicted on a timer — see `sweep`. */
const SWEEP_INTERVAL_MS = 60_000;

/** Log floor: a limiter that logs every rejection is a log-flood amplifier. */
const WARN_INTERVAL_MS = 10_000;

interface Bucket {
  tokens: number;
  updatedAt: number;
  /** True once this bucket has emptied, so the warning fires per episode. */
  warned: boolean;
}

export interface RateLimitOptions {
  capacity: number;
  refillPerMinute: number;
  /** Injectable for tests; production uses the wall clock. */
  now?: () => number;
  /** Shown in the one-per-episode warning. */
  label?: string;
}

export interface RateLimitDecision {
  ok: boolean;
  /** Whole seconds, never 0 — `Retry-After: 0` invites an instant retry. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  take(key: string): RateLimitDecision;
  /** Test seam: the number of keys currently tracked. */
  size(): number;
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const { capacity, refillPerMinute, label = "rate" } = options;
  const now = options.now ?? (() => Date.now());
  const refillPerMs = refillPerMinute / 60_000;
  const buckets = new Map<string, Bucket>();
  let lastSweepAt = 0;
  let lastWarnAt = 0;

  /**
   * A full bucket is indistinguishable from a never-seen key, so dropping one
   * is semantically free — which is why this is a sweep and not an LRU. Only
   * if the sweep cannot get under the cap does insertion-order eviction run,
   * and that *does* hand back an allowance; accepted at 10 000 live clients.
   */
  function sweep(at: number): void {
    lastSweepAt = at;
    for (const [key, bucket] of buckets) {
      if (bucket.tokens + (at - bucket.updatedAt) * refillPerMs >= capacity) {
        buckets.delete(key);
      }
    }
    // `Map` iterates in insertion order, so this drops the longest-tracked.
    while (buckets.size >= MAX_TRACKED_KEYS) {
      const oldest = buckets.keys().next();
      if (oldest.done) break;
      buckets.delete(oldest.value);
    }
  }

  return {
    take(key) {
      const at = now();
      let bucket = buckets.get(key);

      if (!bucket) {
        if (at - lastSweepAt >= SWEEP_INTERVAL_MS || buckets.size >= MAX_TRACKED_KEYS) {
          sweep(at);
        }
        bucket = { tokens: capacity, updatedAt: at, warned: false };
        buckets.set(key, bucket);
      } else {
        bucket.tokens = Math.min(capacity, bucket.tokens + (at - bucket.updatedAt) * refillPerMs);
        bucket.updatedAt = at;
      }

      if (bucket.tokens < 1) {
        if (!bucket.warned && at - lastWarnAt >= WARN_INTERVAL_MS) {
          bucket.warned = true;
          lastWarnAt = at;
          console.warn(`[glu] ${label} limit reached for a client`);
        }
        return {
          ok: false,
          retryAfterSeconds: Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000)),
        };
      }

      bucket.tokens -= 1;
      bucket.warned = false;
      return { ok: true, retryAfterSeconds: 0 };
    },
    size: () => buckets.size,
  };
}

/* -------------------------------------------------------------------------- */
/* Client identity                                                            */
/* -------------------------------------------------------------------------- */

/**
 * ADR 24's resolution order, identical on both tiers:
 *
 *   1. `X-Glu-Client-IP` — an explicit override, for a proxy that wants to
 *      state the client outright. Nothing sets it by default.
 *   2. `X-Real-IP` — what nginx-proxy sets, from `$remote_addr`. It is
 *      *assigned*, so a caller's own copy is replaced on every request.
 *   3. The **rightmost** `X-Forwarded-For` entry. nginx-proxy fills this
 *      header with `$proxy_add_x_forwarded_for`, which **appends** — so the
 *      leftmost entries are whatever the caller sent, and only the last one
 *      was written by the proxy.
 *   4. The socket peer.
 *
 * Rightmost and no further: if that entry is unparseable we fall to the socket
 * rather than walking left into caller-supplied values. Counting hops is
 * deliberately not done here — a hop count that is one too high turns the
 * leftmost, attacker-written entry into the key, which is an outright bypass.
 */
export function clientKey(headers: Headers, fallback: string): string {
  const stated = normalizeIp(headers.get("x-glu-client-ip") ?? "");
  if (stated) return stated;

  const real = normalizeIp(headers.get("x-real-ip") ?? "");
  if (real) return real;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    const rightmost = normalizeIp(parts[parts.length - 1] ?? "");
    if (rightmost) return rightmost;
  }

  return normalizeIp(fallback) || "unknown";
}

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Strips brackets and ports, then keys IPv6 by its /64 prefix. A residential
 * client is routinely handed a /64 or larger, so keying the full /128 lets one
 * machine rotate through billions of buckets — the usual reason an IP limiter
 * turns out to be decorative.
 */
export function normalizeIp(raw: string): string {
  let value = raw.trim();
  if (!value) return "";

  if (value.startsWith("[")) {
    // `[2001:db8::1]:443` — bracketed v6, with or without a port.
    const close = value.indexOf("]");
    value = close === -1 ? value.slice(1) : value.slice(1, close);
  } else if (value.split(":").length === 2) {
    // Exactly one colon is `1.2.3.4:5678`. Splitting a bare v6 on ":" is the
    // classic wrong fix here, so branch on the count, never blindly.
    value = value.slice(0, value.indexOf(":"));
  }

  value = value.trim();
  if (!value) return "";

  const mapped = IPV4_MAPPED.exec(value);
  if (mapped) return mapped[1];

  return value.includes(":") ? ipv6Prefix(value) : value;
}

/** `2001:db8::1` and `2001:0db8:0000:0000::1` must key the same. */
function ipv6Prefix(address: string): string {
  const [head, tail] = address.split("::", 2);
  const left = head ? head.split(":") : [];
  const right = tail === undefined ? [] : tail ? tail.split(":") : [];

  let hextets: string[];
  if (tail === undefined) {
    hextets = left;
  } else {
    const missing = 8 - left.length - right.length;
    if (missing < 0) return address.toLowerCase();
    hextets = [...left, ...Array<string>(missing).fill("0"), ...right];
  }

  const prefix = hextets.slice(0, 4);
  while (prefix.length < 4) prefix.push("0");
  return `${prefix.map((h) => h.toLowerCase().padStart(4, "0")).join(":")}::/64`;
}
