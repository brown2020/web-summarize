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

export const ModelOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export type ModelOption = z.infer<typeof ModelOptionSchema>;

export const SummarizerStateSchema = z.object({
  url: z.string().url("Invalid URL format"),
  language: LanguageSchema,
  modelName: z.string(),
  numWords: z.number().min(50).max(500),
  summary: z.string(),
  isPending: z.boolean(),
  progress: z.number(),
  error: z.string().nullable(),
});

export type SummarizerState = z.infer<typeof SummarizerStateSchema>;
