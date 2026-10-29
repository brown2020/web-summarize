import { ModelMessage, streamText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { LanguageSchema } from "@/types/summarizer";
import { TIMEOUTS, VALIDATION } from "@/constants/app";
import { assertModelAvailable } from "@/lib/model-availability";
import {
  FIXTURE_SUMMARY,
  summarizeFixturesEnabled,
} from "@/lib/summarize-fixtures";

/** Deferred Fireworks client — avoid module-scope init with empty secrets. */
function getFireworks() {
  return createOpenAI({
    name: "fireworks",
    baseURL: "https://api.fireworks.ai/inference/v1",
    apiKey: process.env.FIREWORKS_API_KEY ?? "",
  });
}

const GenerateSummarySchema = z.object({
  document: z
    .string()
    .min(1, "Document content is required")
    .max(VALIDATION.MAX_DOCUMENT_CHARS, "Document is too long to summarize."),
  language: LanguageSchema,
  modelName: z.string(),
  numWords: z.number().min(VALIDATION.MIN_WORDS).max(VALIDATION.MAX_WORDS),
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function getModel(modelName: string) {
  assertModelAvailable(modelName);

  switch (modelName) {
    case "gpt-4.1":
      return openai("gpt-4.1");

    case "claude-sonnet-4.5":
      return anthropic("claude-sonnet-4-5");

    case "gemini-2.5-flash":
      return google("gemini-2.5-flash");

    case "mistral-large":
      return mistral("mistral-large-latest");

    case "llama-v3p3-70b":
      return getFireworks()("accounts/fireworks/models/llama-v3p3-70b-instruct");

    default:
      throw new Error("Unsupported model selected.");
  }
}

export function isGenerationTimeout(error: unknown, requestSignal: AbortSignal): boolean {
  if (requestSignal.aborted) return false;
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

/** Client-facing failure. Provider response text stays on the server. */
export function generationErrorResponse(error: unknown, requestSignal: AbortSignal): Response {
  if (requestSignal.aborted) {
    return jsonError("Request cancelled.", 499);
  }

  if (isGenerationTimeout(error, requestSignal)) {
    return jsonError("AI generation timed out. Please try again.", 504);
  }

  const name = error instanceof Error ? error.name : "Error";
  console.error(`Summary generation failed: ${name}`);
  return jsonError("Failed to generate summary.", 502);
}

function summaryPrompt(document: string, language: string, numWords: number): {
  system: string;
  messages: ModelMessage[];
} {
  return {
    system: `You are a summarization assistant. Generate a summary of the document below.

STRICT REQUIREMENTS:
- Write approximately ${numWords} words
- Write in ${language}
- Start immediately with the summary content (no preamble like "Here is..." or "This document...")
- Use clean, flowing paragraphs only - NO markdown, NO bullet points, NO bold text, NO headers
- Be concise and informative`,
    messages: [
      {
        role: "user",
        content: `Document to summarize:\n\n${document}`,
      },
    ],
  };
}

type SummaryStreamPart = {
  type: string;
  text?: string;
  error?: unknown;
};

function isSummaryStreamPart(value: unknown): value is SummaryStreamPart {
  return typeof value === "object" && value !== null && "type" in value;
}

/**
 * Validates the summary request and returns a text body.
 * `release` runs when generation finishes or fails so in-flight caps can drop.
 * The returned stream follows `requestSignal`, which aborts provider work when the client disconnects.
 */
export async function createSummaryResponse(
  body: unknown,
  requestSignal: AbortSignal,
  release: () => void
): Promise<Response> {
  let released = false;
  const finish = () => {
    if (released) return;
    released = true;
    release();
  };

  try {
    if (requestSignal.aborted) {
      finish();
      return jsonError("Request cancelled.", 499);
    }

    const validationResult = GenerateSummarySchema.safeParse(body);
    if (!validationResult.success) {
      finish();
      const message =
        validationResult.error.issues[0]?.message ??
        "Invalid input parameters for summary generation.";
      return jsonError(message, 400);
    }

    const { document, language, modelName, numWords } = validationResult.data;

    try {
      assertModelAvailable(modelName);
    } catch (error) {
      finish();
      const message = error instanceof Error ? error.message : "Unsupported model selected.";
      return jsonError(message, 400);
    }

    if (summarizeFixturesEnabled()) {
      finish();
      return new Response(FIXTURE_SUMMARY, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const abortSignal = AbortSignal.any([
      requestSignal,
      AbortSignal.timeout(TIMEOUTS.AI_GENERATION),
    ]);
    const prompt = summaryPrompt(document, language, numWords);
    const result = streamText({
      model: getModel(modelName),
      system: prompt.system,
      messages: prompt.messages,
      temperature: 0.7,
      abortSignal,
    });

    const iterator = result.fullStream[Symbol.asyncIterator]();
    const buffered: string[] = [];
    try {
      while (true) {
        const next = await iterator.next();
        if (next.done) {
          finish();
          return generationErrorResponse(new Error("No summary text"), requestSignal);
        }
        if (!isSummaryStreamPart(next.value)) continue;
        if (next.value.type === "error") {
          finish();
          return generationErrorResponse(next.value.error, requestSignal);
        }
        if (next.value.type === "text-delta" && next.value.text) {
          buffered.push(next.value.text);
          break;
        }
      }
    } catch (error) {
      finish();
      return generationErrorResponse(error, requestSignal);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (const chunk of buffered) {
            controller.enqueue(encoder.encode(chunk));
          }
          while (true) {
            const next = await iterator.next();
            if (next.done) break;
            if (!isSummaryStreamPart(next.value)) continue;
            if (next.value.type === "error") {
              controller.error(
                next.value.error instanceof Error
                  ? next.value.error
                  : new Error("Summary stream failed")
              );
              return;
            }
            if (next.value.type === "text-delta" && next.value.text) {
              controller.enqueue(encoder.encode(next.value.text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error instanceof Error ? error : new Error("Summary stream failed"));
        } finally {
          finish();
        }
      },
      cancel() {
        finish();
        void iterator.return?.(undefined);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    finish();
    return generationErrorResponse(error, requestSignal);
  }
}
