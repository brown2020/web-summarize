import { LANGUAGES, type ModelOption } from "@/types/summarizer";

// Re-export LANGUAGES from types (single source of truth)
export { LANGUAGES };

export const MODEL_OPTIONS: ModelOption[] = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "llama-v3p1-405b", label: "Llama 3.1 405B Instruct" },
  { value: "mistral-large", label: "Mistral Large" },
  { value: "xai-grok", label: "xAI Grok Beta" },
];
