import { LANGUAGES, type ModelCatalogItem, type ModelOption } from "@/types/summarizer";

// Re-export LANGUAGES from types (single source of truth)
export { LANGUAGES };

export const MODEL_CATALOG: ModelCatalogItem[] = [
  { value: "gpt-4.1", label: "GPT-4.1 (OpenAI)", envKey: "OPENAI_API_KEY" },
  {
    value: "claude-sonnet-4.5",
    label: "Claude Sonnet 4.5 (Anthropic)",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (Google)",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
  { value: "mistral-large", label: "Mistral Large (Mistral)", envKey: "MISTRAL_API_KEY" },
  {
    value: "llama-v3p3-70b",
    label: "Llama 3.3 70B (Fireworks)",
    envKey: "FIREWORKS_API_KEY",
  },
];

export const MODEL_OPTIONS: ModelOption[] = MODEL_CATALOG.map(({ value, label }) => ({
  value,
  label,
}));
