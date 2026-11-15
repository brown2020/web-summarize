import { z } from "zod";

export const LanguageSchema = z.enum([
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
]);

export type Language = z.infer<typeof LanguageSchema>;

/** Single source of truth - derived from schema */
export const LANGUAGES = LanguageSchema.options;

export const ModelIdSchema = z.enum([
  "gpt-6.1-sol",
  "claude-opus-5-5",
  "gemini-4-argon",
  "grok-4.7",
]);

export type ModelId = z.infer<typeof ModelIdSchema>;

export type ModelProviderEnvKey =
  | "OPENAI_API_KEY"
  | "ANTHROPIC_API_KEY"
  | "GOOGLE_GENERATIVE_AI_API_KEY"
  | "XAI_API_KEY";

export type ModelOption = {
  value: ModelId;
  label: string;
};

export type ModelCatalogItem = ModelOption & {
  envKey: ModelProviderEnvKey;
};

export type SummarizerState = {
  url: string;
  language: Language;
  modelName: ModelId;
  numWords: number;
  extractedText: string;
  summary: string;
  isPending: boolean;
  progress: number;
  error: string | null;
};
