import { LANGUAGES, type ModelOption } from "@/types/summarizer";

// Re-export LANGUAGES from types (single source of truth)
export { LANGUAGES };

export const MODEL_OPTIONS: ModelOption[] = [
  { value: "gpt-4.1", label: "GPT-4.1 (OpenAI)" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5 (Anthropic)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Google)" },
  { value: "mistral-large", label: "Mistral Large (Mistral)" },
  { value: "llama-v3p3-70b", label: "Llama 3.3 70B (Fireworks)" },
];
