import { LANGUAGES, type ModelCatalogItem, type ModelId } from "@/types/summarizer";

// Re-export LANGUAGES from types (single source of truth)
export { LANGUAGES };

export const DEFAULT_MODEL_ID: ModelId = "gpt-6.1-sol";

/** Values are the native provider API ids sent to each SDK. */
export const MODEL_CATALOG: ModelCatalogItem[] = [
  { value: "gpt-6.1-sol", label: "GPT-6.1 Sol (OpenAI)", envKey: "OPENAI_API_KEY" },
  {
    value: "claude-opus-5-5",
    label: "Claude Opus 5.5 (Anthropic)",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    value: "gemini-4-argon",
    label: "Gemini 4 Argon (Google)",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
  { value: "grok-4.7", label: "Grok 4.7 (xAI)", envKey: "XAI_API_KEY" },
];

/**
 * Successors for ids that shared links or stale tabs may still send.
 * Checked in order after an exact catalog match. Retired providers with no
 * remaining catalog entry (Mistral, Fireworks/Llama) resolve to the default.
 */
export const LEGACY_MODEL_SUCCESSORS: ReadonlyArray<readonly [RegExp, ModelId]> = [
  [/^(?:gpt-|o\d+(?:-|$)|chatgpt-)/, "gpt-6.1-sol"],
  [/^claude-/, "claude-opus-5-5"],
  [/^gemini-/, "gemini-4-argon"],
  [/^grok-/, "grok-4.7"],
  [/^(?:mistral|open-mistral|ministral|codestral|pixtral|magistral)-/, DEFAULT_MODEL_ID],
  [/^(?:llama-|accounts\/fireworks\/)/, DEFAULT_MODEL_ID],
];

/** Vercel AI Gateway prefixes accepted on incoming ids (`spacexai/` is xAI's gateway form). */
export const GATEWAY_MODEL_PREFIX = /^(?:openai|anthropic|google|spacexai|xai|mistral|fireworks)\//;
