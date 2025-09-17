import { Language, ModelOption } from "@/types/summarizer";

export const LANGUAGES: Language[] = [
  "english",
  "french",
  "spanish",
  "german",
  "italian",
  "portuguese",
  "chinese",
  "russian",
  "hindi",
  "japanese",
];

export const MODEL_OPTIONS: ModelOption[] = [
  { value: "gpt-4.1", label: "GPT 4.1" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "llama-v3p1-405b", label: "Llama 3.1 405B Instruct" },
  { value: "mistral-large", label: "Mistral Large" },
  { value: "xai-grok", label: "xAI Grok Beta" },
];
