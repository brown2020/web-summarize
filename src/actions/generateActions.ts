"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { LanguageSchema } from "@/types/summarizer";

const fireworks = createOpenAI({
  apiKey: process.env.FIREWORKS_API_KEY ?? "",
  baseURL: "https://api.fireworks.ai/inference/v1",
});

const xai = createOpenAI({
  name: "xai",
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY ?? "",
});

// Input validation schemas
const GenerateSummarySchema = z.object({
  document: z.string().min(1, "Document content is required"),
  language: LanguageSchema,
  modelName: z.string(),
  numWords: z.number().min(50).max(1000), // Increased max slightly for flexibility
});

async function getModel(modelName: string) {
  try {
    switch (modelName) {
      case "gpt-4.1":
        return openai("gpt-4-turbo"); // Updated to valid model name if needed, assuming gpt-4.1 was placeholder or specific mapping

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
        // Fallback or throw
        console.warn(`Unsupported model name: ${modelName}, falling back to GPT-4o`);
        return openai("gpt-4o");
    }
  } catch (error) {
    console.error("Error loading model:", error);
    throw new Error("Failed to initialize the AI model.");
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
  // Validate inputs
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

  const systemPrompt = `You are a helpful summarization and translation assistant. Your job is to generate a summary of the provided document in the provided language. The summary should be concise, informative, and approximately ${numWords} words. Present the summary immediately without introduction (e.g., do NOT say "Here is a summary..."). use Markdown formatting where appropriate (bullet points, bold text, etc.).`;
  
  const userPrompt = `Provided document:\n${document}\n\nTarget language:\n${language}`;
  
  return generateResponse(systemPrompt, userPrompt, modelName);
}

export async function generateAnswer(
  document: string,
  question: string,
  modelName: string
) {
   if (!document || !question) {
     throw new Error("Document and question are required.");
   }

  const systemPrompt =
    "You are a helpful question and answer assistant. Your job is to generate an answer to the provided question based on the provided document. Without any introduction, provide an answer that is concise, informative, and 100 words or less.";
  const userPrompt = `Provided document:\n${document}\n\nProvided question:\n${question}`;
  
  return generateResponse(systemPrompt, userPrompt, modelName);
}
