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

export type ModelOption = {
  value: string;
  label: string;
};

export type ModelCatalogItem = ModelOption & {
  envKey?: string;
};

export type SummarizerState = {
  url: string;
  language: Language;
  modelName: string;
  numWords: number;
  extractedText: string;
  summary: string;
  isPending: boolean;
  progress: number;
  error: string | null;
};
