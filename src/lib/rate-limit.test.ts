import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("limits requests inside the window and reports retry time", () => {
    let now = 1_000;
    const limiter = createRateLimiter(
      { limit: 2, windowMs: 10_000, maxConcurrent: 5 },
      () => now
    );

    expect(limiter.tryAcquire("1.1.1.1").ok).toBe(true);
    expect(limiter.tryAcquire("1.1.1.1").ok).toBe(true);
    const blocked = limiter.tryAcquire("1.1.1.1");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSeconds).toBe(10);

    now += 10_000;
    expect(limiter.tryAcquire("1.1.1.1").ok).toBe(true);
  });

  it("caps in-flight work per key until release", () => {
    const limiter = createRateLimiter({ limit: 10, windowMs: 10_000, maxConcurrent: 1 });
    const first = limiter.tryAcquire("client");
    expect(first.ok).toBe(true);
    expect(limiter.tryAcquire("client").ok).toBe(false);
    if (first.ok) first.release();
    expect(limiter.tryAcquire("client").ok).toBe(true);
  });

  it("applies a shared in-flight cap across keys", () => {
    const limiter = createRateLimiter({
      limit: 10,
      windowMs: 10_000,
      maxConcurrent: 5,
      maxInFlight: 1,
    });
    const first = limiter.tryAcquire("a");
    expect(first.ok).toBe(true);
    expect(limiter.tryAcquire("b").ok).toBe(false);
    if (first.ok) first.release();
    expect(limiter.tryAcquire("b").ok).toBe(true);
  });

  it("release is idempotent", () => {
    const limiter = createRateLimiter({ limit: 10, windowMs: 10_000, maxConcurrent: 1 });
    const first = limiter.tryAcquire("client");
    if (!first.ok) throw new Error("expected acquire");
    first.release();
    first.release();
    expect(limiter.tryAcquire("client").ok).toBe(true);
  });
});
