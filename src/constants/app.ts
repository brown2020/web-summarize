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
  MIN_WORDS: 50,
  MAX_WORDS: 1000,
  DEFAULT_WORDS: 200,
  MIN_CONTENT_LENGTH: 50,
  MAX_REDIRECTS: 5,
} as const;

// UI constants
export const UI = {
  TOAST_DURATION: 4000,
  PROGRESS_ANIMATION_DURATION: 300,
} as const;
