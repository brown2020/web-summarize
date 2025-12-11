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

const fireworks = createOpenAI({
  apiKey: process.env.FIREWORKS_API_KEY ?? "",
  baseURL: "https://api.fireworks.ai/inference/v1",
});

const xai = createOpenAI({
  name: "xai",
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY ?? "",
});

// Input validation schema using centralized constants
const GenerateSummarySchema = z.object({
  document: z.string().min(1, "Document content is required"),
  language: LanguageSchema,
  modelName: z.string(),
  numWords: z.number().min(VALIDATION.MIN_WORDS).max(VALIDATION.MAX_WORDS),
});

async function getModel(modelName: string) {
  switch (modelName) {
    case "gpt-4o":
      return openai("gpt-4o");

    case "gemini-1.5-pro":
      return google("models/gemini-1.5-pro-latest");

    case "claude-3-5-sonnet":
      return anthropic("claude-3-5-sonnet-20241022");

    case "mistral-large":
      return mistral("mistral-large-latest");

    case "llama-v3p1-405b":
      return fireworks("accounts/fireworks/models/llama-v3p1-405b-instruct");

    case "xai-grok":
      return xai("grok-beta");

    default:
      console.warn(`Unsupported model: ${modelName}, falling back to GPT-4o`);
      return openai("gpt-4o");
  }
}

async function generateResponse(
  systemPrompt: string,
  userPrompt: string,
  modelName: string
) {
  try {
    const model = await getModel(modelName);

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
    console.error("Error generating response:", error);
    throw new Error("Failed to generate AI response. Please try again.");
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

  const systemPrompt = `You are a helpful summarization and translation assistant. Your job is to generate a summary of the provided document in the provided language. The summary should be concise, informative, and approximately ${numWords} words. Present the summary immediately without introduction (e.g., do NOT say "Here is a summary..."). Use Markdown formatting where appropriate (bullet points, bold text, etc.).`;

  const userPrompt = `Provided document:\n${document}\n\nTarget language:\n${language}`;

  return generateResponse(systemPrompt, userPrompt, modelName);
}
