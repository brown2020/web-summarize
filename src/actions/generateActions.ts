"use server";

import { createStreamableValue } from "ai/rsc";
import { CoreMessage, streamText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { anthropic } from "@ai-sdk/anthropic";

const fireworks = createOpenAI({
  apiKey: process.env.FIREWORKS_API_KEY ?? "",
  baseURL: "https://api.fireworks.ai/inference/v1",
});

const xai = createOpenAI({
  name: "xai",
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY ?? "",
});

async function getModel(modelName: string) {
  try {
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
        throw new Error(`Unsupported model name: ${modelName}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to get model: ${error.message}`);
    } else {
      throw new Error(`Failed to get model: Unknown error`);
    }
  }
}

async function generateResponse(
  systemPrompt: string,
  userPrompt: string,
  modelName: string
) {
  try {
    const model = await getModel(modelName);

    const messages: CoreMessage[] = [
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
    });

    const stream = createStreamableValue(result.textStream);
    return stream.value;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate response: ${error.message}`);
    } else {
      throw new Error(`Failed to generate response: Unknown error`);
    }
  }
}

export async function generateSummary(
  document: string,
  language: string,
  modelName: string,
  numWords: number
) {
  try {
    const systemPrompt = `You are a helpful summarization and translation assistant. Your job is to generate a summary of the provided document in the provided language. The summary should be concise, informative, and ${numWords} words or less. Present the summary without introduction and without saying that it is a summary.`;
    const userPrompt = `Provided document:\n${document}\n\nProvided language:\n${language}`;
    return generateResponse(systemPrompt, userPrompt, modelName);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate summary: ${error.message}`);
    } else {
      throw new Error(`Failed to generate summary: Unknown error`);
    }
  }
}

export async function generateAnswer(
  document: string,
  question: string,
  modelName: string
) {
  try {
    const systemPrompt =
      "You are a helpful question and answer assistant. Your job is to generate an answer to the provided question based on the provided document. Without any introduction, provide an answer that is concise, informative, and 100 words or less.";
    const userPrompt = `Provided document:\n${document}\n\nProvided question:\n${question}`;
    return generateResponse(systemPrompt, userPrompt, modelName);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate answer: ${error.message}`);
    } else {
      throw new Error(`Failed to generate answer: Unknown error`);
    }
  }
}
