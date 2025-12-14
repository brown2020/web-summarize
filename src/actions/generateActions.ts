"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { LanguageSchema } from "@/types/summarizer";
import { VALIDATION } from "@/constants/app";

// Fireworks provider (OpenAI-compatible) for Llama
// Model IDs from: https://ai-sdk.dev/providers/ai-sdk-providers/fireworks
const fireworks = createOpenAI({
  name: "fireworks",
  baseURL: "https://api.fireworks.ai/inference/v1",
  apiKey: process.env.FIREWORKS_API_KEY ?? "",
});

// Input validation schema using centralized constants
const GenerateSummarySchema = z.object({
  document: z.string().min(1, "Document content is required"),
  language: LanguageSchema,
  modelName: z.string(),
  numWords: z.number().min(VALIDATION.MIN_WORDS).max(VALIDATION.MAX_WORDS),
});

function getModel(modelName: string) {
  switch (modelName) {
    // OpenAI
    case "gpt-4.1":
      return openai("gpt-4.1");

    // Anthropic - https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
    case "claude-sonnet-4.5":
      return anthropic("claude-sonnet-4-5");

    // Google - https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
    case "gemini-2.5-flash":
      return google("gemini-2.5-flash");

    // Mistral
    case "mistral-large":
      return mistral("mistral-large-latest");

    // Llama via Fireworks - https://ai-sdk.dev/providers/ai-sdk-providers/fireworks
    case "llama-v3p3-70b":
      return fireworks("accounts/fireworks/models/llama-v3p3-70b-instruct");

    default:
      console.warn(`Unsupported model: ${modelName}, falling back to GPT-4.1`);
      return openai("gpt-4.1");
  }
}

async function generateResponse(
  systemPrompt: string,
  userPrompt: string,
  modelName: string
) {
  try {
    const model = getModel(modelName);

    const messages: ModelMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    const result = streamText({
      model,
      messages,
      temperature: 0.7,
    });

    const stream = createStreamableValue(result.textStream);
    return stream.value;
  } catch (error) {
    console.error("Error in generateResponse:", error);
    throw error;
  }
}

export async function generateSummary(
  document: string,
  language: string,
  modelName: string,
  numWords: number
) {
  const validationResult = GenerateSummarySchema.safeParse({
    document,
    language,
    modelName,
    numWords,
  });

  if (!validationResult.success) {
    console.error("Validation error:", validationResult.error);
    throw new Error("Invalid input parameters for summary generation.");
  }

  const systemPrompt = `You are a summarization assistant. Generate a summary of the document below.

STRICT REQUIREMENTS:
- Write approximately ${numWords} words
- Write in ${language}
- Start immediately with the summary content (no preamble like "Here is..." or "This document...")
- Use clean, flowing paragraphs only - NO markdown, NO bullet points, NO bold text, NO headers
- Be concise and informative`;

  const userPrompt = `Document to summarize:\n\n${document}`;

  return generateResponse(systemPrompt, userPrompt, modelName);
}
