/**
 * In-memory fixed-window limiter. Counts are per server instance, which caps
 * abuse on that instance without a shared store.
 */

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  maxConcurrent: number;
  maxInFlight?: number;
};

export type RateLimitDecision =
  | { ok: true; release: () => void }
  | { ok: false; retryAfterSeconds: number };

type Bucket = {
  timestamps: number[];
  inFlight: number;
};

export function createRateLimiter(options: RateLimitOptions, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();
  let inFlightTotal = 0;

  const prune = (bucket: Bucket, current: number) => {
    bucket.timestamps = bucket.timestamps.filter((timestamp) => current - timestamp < options.windowMs);
  };

  const retryAfterSeconds = (bucket: Bucket, current: number) => {
    const oldest = bucket.timestamps[0];
    if (oldest === undefined) return 1;
    return Math.max(1, Math.ceil((options.windowMs - (current - oldest)) / 1000));
  };

  return {
    tryAcquire(key: string): RateLimitDecision {
      const current = now();
      const bucket = buckets.get(key) ?? { timestamps: [], inFlight: 0 };
      prune(bucket, current);

      const overWindow = bucket.timestamps.length >= options.limit;
      const overKeyConcurrency = bucket.inFlight >= options.maxConcurrent;
      const overShared =
        options.maxInFlight !== undefined && inFlightTotal >= options.maxInFlight;

      if (overWindow || overKeyConcurrency || overShared) {
        if (bucket.timestamps.length === 0 && bucket.inFlight === 0) {
          buckets.delete(key);
        } else {
          buckets.set(key, bucket);
        }
        return { ok: false, retryAfterSeconds: retryAfterSeconds(bucket, current) };
      }

      bucket.timestamps.push(current);
      bucket.inFlight += 1;
      inFlightTotal += 1;
      buckets.set(key, bucket);

      let released = false;
      return {
        ok: true,
        release() {
          if (released) return;
          released = true;
          bucket.inFlight = Math.max(0, bucket.inFlight - 1);
          inFlightTotal = Math.max(0, inFlightTotal - 1);
          prune(bucket, now());
          if (bucket.timestamps.length === 0 && bucket.inFlight === 0) {
            buckets.delete(key);
          }
        },
      };
    },

    reset() {
      buckets.clear();
      inFlightTotal = 0;
    },
  };
}
