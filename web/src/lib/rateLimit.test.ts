import { describe, expect, it, vi } from "vitest";
import { clientKey, createRateLimiter, normalizeIp } from "./rateLimit";

/**
 * ADR 24. The two halves are tested separately because they fail differently:
 * the bucket fails by throttling wrong, the key fails by being *spoofable* —
 * which looks exactly like a working limiter until someone tries.
 */

const clock = (start = 1_000_000) => {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
};

const headers = (init: Record<string, string>) => new Headers(init);

describe("token bucket", () => {
  it("spends the capacity and then refuses", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 3, refillPerMinute: 60, now: time.now });

    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
  });

  it("keeps buckets independent per key", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 1, refillPerMinute: 60, now: time.now });

    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
    expect(limiter.take("b").ok).toBe(true);
  });

  it("refills continuously rather than in window jumps", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 2, refillPerMinute: 60, now: time.now });

    limiter.take("a");
    limiter.take("a");
    expect(limiter.take("a").ok).toBe(false);

    // 60/min is one per second — half a token is still not one.
    time.advance(500);
    expect(limiter.take("a").ok).toBe(false);
    time.advance(500);
    expect(limiter.take("a").ok).toBe(true);
  });

  it("never advertises a Retry-After of 0, and it is honest", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 1, refillPerMinute: 60, now: time.now });

    limiter.take("a");
    const denied = limiter.take("a");
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterSeconds).toBe(1);

    // Waiting the advertised time actually works.
    time.advance(denied.retryAfterSeconds * 1000);
    expect(limiter.take("a").ok).toBe(true);
  });

  it("never refills past capacity, however long a client idles", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 2, refillPerMinute: 60, now: time.now });

    limiter.take("a");
    time.advance(24 * 60 * 60_000);
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
  });

  it("stays bounded under a flood of distinct keys", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 5, refillPerMinute: 60, now: time.now });

    for (let i = 0; i < 50_000; i += 1) {
      limiter.take(`10.0.${Math.floor(i / 256)}.${i % 256}`);
      // Move time so the sweep is reachable; a real flood spans seconds.
      if (i % 1_000 === 0) time.advance(SWEEP_TICK);
    }

    expect(limiter.size()).toBeLessThanOrEqual(10_000);
  });

  it("warns once per episode, not once per rejected request", () => {
    const time = clock();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createRateLimiter({ capacity: 1, refillPerMinute: 60, now: time.now });

    limiter.take("a");
    for (let i = 0; i < 100; i += 1) limiter.take("a");

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

const SWEEP_TICK = 61_000;

describe("client key resolution", () => {
  it("prefers the header the proxy sets over anything a caller can write", () => {
    const key = clientKey(
      headers({ "x-glu-client-ip": "203.0.113.7", "x-forwarded-for": "9.9.9.9" }),
      "10.0.0.1",
    );
    expect(key).toBe("203.0.113.7");
  });

  it("uses X-Real-IP, which nginx-proxy assigns rather than appends", () => {
    // nginx-proxy: `proxy_set_header X-Real-IP $remote_addr` — a caller's own
    // copy is replaced every request, so it outranks the appended XFF chain.
    const key = clientKey(
      headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "9.9.9.9, 203.0.113.7" }),
      "10.0.0.1",
    );
    expect(key).toBe("203.0.113.7");
  });

  it("takes the RIGHTMOST forwarded entry — the one no caller can forge", () => {
    // A caller who sends `X-Forwarded-For: 9.9.9.9` gets it appended to, not
    // honoured: the proxy's own append lands to its right.
    const key = clientKey(headers({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }), "10.0.0.1");
    expect(key).toBe("203.0.113.7");
  });

  it("does not let a spoofed leftmost entry mint fresh buckets", () => {
    const real = "203.0.113.7";
    const keys = new Set(
      ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((spoof) =>
        clientKey(headers({ "x-forwarded-for": `${spoof}, ${real}` }), "10.0.0.1"),
      ),
    );
    expect(keys).toEqual(new Set([real]));
  });

  it("falls back to the socket rather than walking left into caller values", () => {
    // An unparseable rightmost entry must not promote the entry beside it.
    const key = clientKey(headers({ "x-forwarded-for": "9.9.9.9,   " }), "10.0.0.1");
    expect(key).toBe("10.0.0.1");
  });

  it("falls back through the whole chain to the socket peer", () => {
    expect(clientKey(headers({}), "10.0.0.1")).toBe("10.0.0.1");
    expect(clientKey(headers({}), "")).toBe("unknown");
  });
});

describe("address normalisation", () => {
  it("keys IPv6 by its /64, so one client cannot rotate through a subnet", () => {
    const a = normalizeIp("2001:db8:1:2::1");
    const b = normalizeIp("2001:db8:1:2:ffff:ffff:ffff:ffff");
    expect(a).toBe(b);
  });

  it("keys distinct /64s apart", () => {
    expect(normalizeIp("2001:db8:1:2::1")).not.toBe(normalizeIp("2001:db8:1:3::1"));
  });

  it("treats compressed and expanded forms as the same address", () => {
    expect(normalizeIp("2001:db8::1")).toBe(normalizeIp("2001:0db8:0000:0000::1"));
    expect(normalizeIp("2001:DB8::1")).toBe(normalizeIp("2001:db8::1"));
  });

  it("strips brackets and ports without shredding a bare IPv6", () => {
    expect(normalizeIp("1.2.3.4:5678")).toBe("1.2.3.4");
    expect(normalizeIp("[2001:db8::1]:443")).toBe(normalizeIp("2001:db8::1"));
    // One colon per hextet — splitting this on ":" is the bug being avoided.
    expect(normalizeIp("2001:db8::1")).toContain("::/64");
  });

  it("unwraps the IPv4-mapped form Node hands back on a dual-stack socket", () => {
    expect(normalizeIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(normalizeIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("returns empty for nothing, so the caller can fall through", () => {
    expect(normalizeIp("")).toBe("");
    expect(normalizeIp("   ")).toBe("");
  });
});
