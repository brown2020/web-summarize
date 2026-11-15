import { type CallSettings, ModelMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { createXai, type XaiLanguageModelResponsesOptions } from "@ai-sdk/xai";
import { z } from "zod";
import { LanguageSchema, type ModelId } from "@/types/summarizer";
import { TIMEOUTS, VALIDATION } from "@/constants/app";
import { assertModelAvailable } from "@/lib/model-availability";
import {
  FIXTURE_SUMMARY,
  summarizeFixturesEnabled,
} from "@/lib/summarize-fixtures";

/** Deferred xAI client — avoid module-scope init with empty secrets. */
function getXai() {
  return createXai({ apiKey: process.env.XAI_API_KEY ?? "" });
}

type SamplingSettings = Pick<
  CallSettings,
  "temperature" | "topP" | "topK" | "presencePenalty" | "frequencyPenalty" | "stopSequences"
>;

const SUMMARY_SAMPLING: SamplingSettings = { temperature: 0.7 };

/**
 * Sampling params each provider rejects for these models.
 * GPT-6.1 Sol always reasons (effort cannot be `none`), so OpenAI ignores sampling.
 * Claude Opus 5.5 always uses adaptive thinking and rejects temperature/top_p/top_k.
 * Grok 4.7 rejects presence_penalty/frequency_penalty/stop.
 */
const UNSUPPORTED_SAMPLING: Record<ModelId, ReadonlyArray<keyof SamplingSettings>> = {
  "gpt-6.1-sol": ["temperature", "topP", "topK"],
  "claude-opus-5-5": ["temperature", "topP", "topK"],
  "gemini-4-argon": [],
  "grok-4.7": ["presencePenalty", "frequencyPenalty", "stopSequences"],
};

function samplingSettingsFor(
  modelId: ModelId,
  settings: SamplingSettings = SUMMARY_SAMPLING
): SamplingSettings {
  const unsupported = new Set<string>(UNSUPPORTED_SAMPLING[modelId]);
  return Object.fromEntries(
    Object.entries(settings).filter(([key]) => !unsupported.has(key))
  ) as SamplingSettings;
}

type SummaryProviderOptions = Parameters<typeof streamText>[0]["providerOptions"];

/** Grok 4.7 defaults to high reasoning, which is too slow for the AI route's time limit. */
const PROVIDER_OPTIONS: Partial<Record<ModelId, SummaryProviderOptions>> = {
  "grok-4.7": {
    xai: { reasoningEffort: "low" } satisfies XaiLanguageModelResponsesOptions,
  },
};

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

function getModel(modelId: ModelId) {
  switch (modelId) {
    case "gpt-6.1-sol":
      return openai.responses("gpt-6.1-sol");

    case "claude-opus-5-5":
      return anthropic("claude-opus-5-5");

    case "gemini-4-argon":
      return google("gemini-4-argon");

    case "grok-4.7":
      return getXai().responses("grok-4.7");

    default: {
      const unsupported: never = modelId;
      throw new Error(`Unsupported model selected: ${String(unsupported)}`);
    }
  }
}

export function isGenerationTimeout(
  error: unknown,
  requestSignal: AbortSignal,
  deadline: AbortSignal
): boolean {
  if (requestSignal.aborted) return false;
  if (deadline.aborted) return true;
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

/** Client-facing failure. Provider response text stays on the server. */
export function generationErrorResponse(
  error: unknown,
  requestSignal: AbortSignal,
  deadline: AbortSignal
): Response {
  if (requestSignal.aborted) {
    return jsonError("Request cancelled.", 499);
  }

  if (isGenerationTimeout(error, requestSignal, deadline)) {
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

/** Appended when the deadline cuts a reply short, so the stream still ends cleanly. */
export const SUMMARY_CUTOFF_NOTICE =
  "\n\n[Summary stopped at the time limit. Try again or ask for fewer words.]";

const DEADLINE_REACHED = Symbol("deadline");

/** Resolves with the next part, or DEADLINE_REACHED if the deadline fires first. */
function nextBeforeDeadline<T>(
  iterator: AsyncIterator<T>,
  deadline: AbortSignal
): Promise<IteratorResult<T> | typeof DEADLINE_REACHED> {
  if (deadline.aborted) return Promise.resolve(DEADLINE_REACHED);
  return new Promise((resolve, reject) => {
    const onDeadline = () => resolve(DEADLINE_REACHED);
    deadline.addEventListener("abort", onDeadline, { once: true });
    iterator.next().then(
      (result) => {
        deadline.removeEventListener("abort", onDeadline);
        resolve(result);
      },
      (error: unknown) => {
        deadline.removeEventListener("abort", onDeadline);
        reject(error);
      }
    );
  });
}

/**
 * Validates the summary request and returns a text body.
 * `release` runs exactly once when generation finishes, fails, is cancelled, or hits
 * `deadline`, so in-flight caps never stay reserved.
 * The returned stream follows `requestSignal`, which aborts provider work when the client disconnects.
 * `deadline` should start at route entry; a reply still streaming when it fires ends with
 * SUMMARY_CUTOFF_NOTICE instead of being killed by the platform.
 */
export async function createSummaryResponse(
  body: unknown,
  requestSignal: AbortSignal,
  release: () => void,
  deadline: AbortSignal = AbortSignal.timeout(TIMEOUTS.AI_GENERATION)
): Promise<Response> {
  let released = false;
  const finish = () => {
    if (released) return;
    released = true;
    release();
  };
  const failure = (error: unknown) => {
    finish();
    return generationErrorResponse(error, requestSignal, deadline);
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

    let modelId: ModelId;
    try {
      modelId = assertModelAvailable(modelName).value;
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

    if (deadline.aborted) {
      return failure(new Error("Deadline reached before generation"));
    }

    const abortSignal = AbortSignal.any([requestSignal, deadline]);
    const prompt = summaryPrompt(document, language, numWords);
    const result = streamText({
      model: getModel(modelId),
      system: prompt.system,
      messages: prompt.messages,
      ...samplingSettingsFor(modelId),
      providerOptions: PROVIDER_OPTIONS[modelId],
      abortSignal,
    });

    const iterator = result.fullStream[Symbol.asyncIterator]();
    const stopProvider = () => {
      void iterator.return?.(undefined)?.catch(() => undefined);
    };
    const buffered: string[] = [];
    try {
      while (true) {
        const next = await nextBeforeDeadline(iterator, deadline);
        if (next === DEADLINE_REACHED) {
          stopProvider();
          return failure(new Error("Deadline reached before first text"));
        }
        if (next.done) return failure(new Error("No summary text"));
        if (!isSummaryStreamPart(next.value)) continue;
        if (next.value.type === "error") return failure(next.value.error);
        if (next.value.type === "abort") return failure(new Error("Generation aborted"));
        if (next.value.type === "text-delta" && next.value.text) {
          buffered.push(next.value.text);
          break;
        }
      }
    } catch (error) {
      return failure(error);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const endAtDeadline = () => {
          stopProvider();
          controller.enqueue(encoder.encode(SUMMARY_CUTOFF_NOTICE));
          controller.close();
        };
        try {
          for (const chunk of buffered) {
            controller.enqueue(encoder.encode(chunk));
          }
          while (true) {
            const next = await nextBeforeDeadline(iterator, deadline);
            if (next === DEADLINE_REACHED) return endAtDeadline();
            if (next.done) break;
            if (!isSummaryStreamPart(next.value)) continue;
            if (next.value.type === "abort" || next.value.type === "error") {
              if (deadline.aborted && !requestSignal.aborted) return endAtDeadline();
              if (next.value.type === "abort") break;
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
          if (deadline.aborted && !requestSignal.aborted) return endAtDeadline();
          controller.error(error instanceof Error ? error : new Error("Summary stream failed"));
        } finally {
          finish();
        }
      },
      cancel() {
        finish();
        stopProvider();
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
    return failure(error);
  }
}
