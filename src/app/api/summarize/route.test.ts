import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { RATE_LIMITS } from "@/constants/app";
import { summaryLimiter, summaryUserLimiter } from "@/lib/limiters";
import { POST } from "./route";

const { streamText, verifyFirebaseIdToken } = vi.hoisted(() => ({
  streamText: vi.fn(),
  verifyFirebaseIdToken: vi.fn(async (token: string) =>
    token === "good-token" ? { uid: "user-1" } : null
  ),
}));

vi.mock("ai", () => ({
  streamText,
}));

vi.mock("@/lib/firebase/id-token", () => ({
  verifyFirebaseIdToken,
}));

const summaryBody = {
  document: "This is a long enough document to summarize for the test harness.",
  language: "english",
  modelName: "gpt-6.1-sol",
  numWords: 20,
};

function postSummary(
  body: unknown,
  init?: { signal?: AbortSignal; ip?: string; token?: string | null }
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init?.ip) headers.set("x-real-ip", init.ip);
  if (init?.token !== null) headers.set("Authorization", `Bearer ${init?.token ?? "good-token"}`);
  return new NextRequest("http://localhost/api/summarize", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: init?.signal,
  });
}

describe("POST /api/summarize", () => {
  const previous = {
    fixtures: process.env.SUMMARIZE_USE_FIXTURES,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    xai: process.env.XAI_API_KEY,
  };

  function restoreEnv(key: string, value: string | undefined) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  function streamOnce(text: string) {
    streamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text };
      })(),
    }));
  }

  type StreamCall = {
    model?: { modelId?: string; provider?: string };
    temperature?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stopSequences?: string[];
  };

  async function liveCall(modelName: string): Promise<StreamCall> {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    streamOnce("ok");
    const res = await POST(postSummary({ ...summaryBody, modelName }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    return streamText.mock.calls[0]?.[0] as StreamCall;
  }

  beforeEach(() => {
    summaryLimiter.reset();
    summaryUserLimiter.reset();
    streamText.mockReset();
    verifyFirebaseIdToken.mockClear();
    process.env.SUMMARIZE_USE_FIXTURES = "true";
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.XAI_API_KEY;
  });

  afterEach(() => {
    if (previous.fixtures === undefined) delete process.env.SUMMARIZE_USE_FIXTURES;
    else process.env.SUMMARIZE_USE_FIXTURES = previous.fixtures;
    restoreEnv("OPENAI_API_KEY", previous.openai);
    restoreEnv("ANTHROPIC_API_KEY", previous.anthropic);
    restoreEnv("GOOGLE_GENERATIVE_AI_API_KEY", previous.google);
    restoreEnv("XAI_API_KEY", previous.xai);
  });

  it("returns 401 when the request has no token", async () => {
    const res = await POST(postSummary(summaryBody, { token: null }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required.");
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is not a valid Firebase ID token", async () => {
    const res = await POST(postSummary(summaryBody, { token: "not-a-firebase-token" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required.");
    expect(JSON.stringify(body)).not.toContain("not-a-firebase-token");
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns fixture text for a verified user without calling a provider", async () => {
    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("[fixture]");
    expect(streamText).not.toHaveBeenCalled();
    expect(verifyFirebaseIdToken).toHaveBeenCalledWith("good-token");
  });

  it("returns 429 when the signed-in user exceeds the per-user limit", async () => {
    const held = [];
    for (let attempt = 0; attempt < RATE_LIMITS.SUMMARY_USER.maxConcurrent; attempt += 1) {
      const decision = summaryUserLimiter.tryAcquire("summary-user:user-1");
      expect(decision.ok).toBe(true);
      if (decision.ok) held.push(decision);
    }

    const res = await POST(postSummary(summaryBody, { ip: "203.0.113.88" }));
    expect(res.status).toBe(429);
    held.forEach((decision) => decision.release());
  });

  it("rejects an unknown model", async () => {
    const res = await POST(postSummary({ ...summaryBody, modelName: "not-a-model" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toMatch(/unsupported/i);
  });

  it("rejects invalid input", async () => {
    const res = await POST(postSummary({ ...summaryBody, numWords: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when the summary limit is exhausted", async () => {
    const ip = "203.0.113.77";
    const held = [];
    for (let attempt = 0; attempt < RATE_LIMITS.SUMMARY.maxConcurrent; attempt += 1) {
      const decision = summaryLimiter.tryAcquire(`summary:${ip}`);
      expect(decision.ok).toBe(true);
      if (decision.ok) held.push(decision);
    }

    const res = await POST(postSummary(summaryBody, { ip }));
    expect(res.status).toBe(429);
    held.forEach((decision) => decision.release());
  });

  it("cancels provider work when the request aborts", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    process.env.OPENAI_API_KEY = "test-key";
    const controller = new AbortController();

    streamText.mockImplementation(({ abortSignal }: { abortSignal: AbortSignal }) => ({
      fullStream: {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              if (abortSignal.aborted) {
                throw Object.assign(new Error("aborted"), { name: "AbortError" });
              }
              await new Promise<void>((_resolve, reject) => {
                abortSignal.addEventListener(
                  "abort",
                  () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
                  { once: true }
                );
              });
              return { done: true as const, value: undefined };
            },
          };
        },
      },
    }));

    const pending = POST(postSummary(summaryBody, { signal: controller.signal }));
    await vi.waitFor(() => expect(streamText).toHaveBeenCalled());
    const signal = streamText.mock.calls[0]?.[0]?.abortSignal as AbortSignal;
    expect(signal.aborted).toBe(false);
    controller.abort();
    const res = await pending;
    expect(res.status).toBe(499);
    expect(signal.aborted).toBe(true);
    const body = await res.json();
    expect(body.error).toBe("Request cancelled.");
  });

  it("maps a provider timeout to a safe message", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    process.env.OPENAI_API_KEY = "test-key";
    streamText.mockImplementation(() => ({
      fullStream: {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw Object.assign(new Error("upstream body sk-live-secret"), {
                name: "TimeoutError",
              });
            },
          };
        },
      },
    }));

    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toBe("AI generation timed out. Please try again.");
    expect(JSON.stringify(body)).not.toContain("sk-live");
  });

  it("hides provider error text from the client", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    process.env.OPENAI_API_KEY = "test-key";
    streamText.mockImplementation(() => ({
      fullStream: {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw new Error("Incorrect API key sk-live-secret raw response");
            },
          };
        },
      },
    }));

    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate summary.");
    expect(JSON.stringify(body)).not.toContain("sk-live");
  });

  it("streams model text and passes an abort signal", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    process.env.OPENAI_API_KEY = "test-key";
    streamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "Hello from the model" };
      })(),
    }));

    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello from the model");
    expect(streamText.mock.calls[0]?.[0]?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("passes the system prompt via the system option, not a system message", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    process.env.OPENAI_API_KEY = "test-key";
    streamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "A short summary." };
      })(),
    }));

    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(200);
    const call = streamText.mock.calls[0]?.[0] as {
      system?: string;
      messages?: Array<{ role?: string }>;
    };
    expect(call.system).toContain("summarization assistant");
    expect(call.system).toContain("20");
    expect(call.system).toContain("english");
    expect(call.messages?.map((message) => message.role)).toEqual(["user"]);
  });

  it("returns an error status when the model stream fails before any text", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    process.env.OPENAI_API_KEY = "test-key";
    streamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield {
          type: "error",
          error: Object.assign(new Error("System messages are not allowed sk-live-secret"), {
            name: "AI_InvalidPromptError",
          }),
        };
      })(),
    }));

    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate summary.");
    expect(JSON.stringify(body)).not.toContain("sk-live");
    expect(JSON.stringify(body)).not.toContain("System messages");
  });

  it("returns an error status when the model stream ends with no text", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    process.env.OPENAI_API_KEY = "test-key";
    streamText.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "start" };
      })(),
    }));

    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate summary.");
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("calls GPT-6.1 Sol through the OpenAI Responses API without sampling params", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const call = await liveCall("gpt-6.1-sol");
    expect(call.model?.modelId).toBe("gpt-6.1-sol");
    expect(call.model?.provider).toBe("openai.responses");
    expect(call.temperature).toBeUndefined();
  });

  it("calls Claude Opus 5.5 without temperature, top_p, or top_k", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const call = await liveCall("claude-opus-5-5");
    expect(call.model?.modelId).toBe("claude-opus-5-5");
    expect(call.model?.provider).toMatch(/^anthropic/);
    expect(call).not.toHaveProperty("temperature");
    expect(call).not.toHaveProperty("topP");
    expect(call).not.toHaveProperty("topK");
  });

  it("calls Gemini 4 Argon with the summary temperature", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    const call = await liveCall("gemini-4-argon");
    expect(call.model?.modelId).toBe("gemini-4-argon");
    expect(call.model?.provider).toMatch(/^google/);
    expect(call.temperature).toBe(0.7);
  });

  it("calls Grok 4.7 through the xAI Responses API without penalties or stop", async () => {
    process.env.XAI_API_KEY = "test-key";
    const call = await liveCall("grok-4.7");
    expect(call.model?.modelId).toBe("grok-4.7");
    expect(call.model?.provider).toBe("xai.responses");
    expect(call).not.toHaveProperty("presencePenalty");
    expect(call).not.toHaveProperty("frequencyPenalty");
    expect(call).not.toHaveProperty("stopSequences");
  });

  it.each([
    ["gpt-4.1", "gpt-6.1-sol", "OPENAI_API_KEY"],
    ["claude-sonnet-4.5", "claude-opus-5-5", "ANTHROPIC_API_KEY"],
    ["gemini-2.5-flash", "gemini-4-argon", "GOOGLE_GENERATIVE_AI_API_KEY"],
    ["grok-beta", "grok-4.7", "XAI_API_KEY"],
    ["mistral-large", "gpt-6.1-sol", "OPENAI_API_KEY"],
    ["llama-v3p3-70b", "gpt-6.1-sol", "OPENAI_API_KEY"],
  ])("serves retired id %s with successor %s", async (legacy, successor, envKey) => {
    process.env[envKey] = "test-key";
    const call = await liveCall(legacy);
    expect(call.model?.modelId).toBe(successor);
  });

  it("rejects a retired id when its successor's provider key is missing", async () => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    const res = await POST(postSummary({ ...summaryBody, modelName: "claude-sonnet-4.5" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toMatch(/not configured/i);
    expect(streamText).not.toHaveBeenCalled();
  });
});
