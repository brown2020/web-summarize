/**
 * Application constants
 */

// Progress tracking constants
export const PROGRESS_STEPS = {
  INITIAL: 0,
  URL_FETCHED: 20,
  CONTENT_EXTRACTED: 50,
  AI_PROCESSING: 70,
  COMPLETE: 100,
} as const;

// Request timeout constants
export const TIMEOUTS = {
  URL_FETCH: 10000, // 10 seconds
  AI_GENERATION: 60000, // 60 seconds
} as const;

// Validation constants (single source of truth for numWords validation)
export const VALIDATION = {
  MIN_WORDS: 10,
  MAX_WORDS: 300,
  DEFAULT_WORDS: 100,
  MIN_CONTENT_LENGTH: 50,
  MAX_CONTENT_BYTES: 1_000_000,
  MAX_DOCUMENT_CHARS: 50_000,
  MAX_REDIRECTS: 5,
} as const;

/**
 * Per-instance abuse limits. `maxInFlight` is shared across clients on this process.
 * Proxy fetches, per-IP summaries, and per-user summaries are counted separately.
 */
export const RATE_LIMITS = {
  PROXY: { limit: 60, windowMs: 10 * 60 * 1000, maxConcurrent: 4, maxInFlight: 20 },
  SUMMARY: { limit: 20, windowMs: 10 * 60 * 1000, maxConcurrent: 2, maxInFlight: 8 },
  SUMMARY_USER: { limit: 20, windowMs: 10 * 60 * 1000, maxConcurrent: 2, maxInFlight: 8 },
} as const;
