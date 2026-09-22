/**
 * Labeled fixtures for Web Summarize (CI / app-eval).
 * Used when SUMMARIZE_USE_FIXTURES=true to avoid burning paid LLM credits
 * and to keep SSRF denial tests off the public internet.
 * Fixtures cannot prove live provider quality, latency, or credit metering.
 */

export const FIXTURE_EXTRACTED_TEXT =
  "[fixture] Extracted readable text from example.com — no live HTTP fetch. " +
  "This paragraph is intentionally long enough for the minimum content length " +
  "check used by the proxy route so fixture mode can exercise the happy path " +
  "without contacting the public internet during CI and app-eval runs.";

export const FIXTURE_SUMMARY =
  "[fixture] This is a labeled Web Summarize fixture summary. No live LLM " +
  "provider was called. It demonstrates streaming UI without burning paid credits.";

/** Prefer this name — never name non-hooks `use*`. */
export function summarizeFixturesEnabled(): boolean {
  return process.env.SUMMARIZE_USE_FIXTURES === "true";
}
