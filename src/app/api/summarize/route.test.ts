import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { RATE_LIMITS } from "@/constants/app";
import { summaryLimiter } from "@/lib/limiters";
import { POST } from "./route";

const { streamText } = vi.hoisted(() => ({ streamText: vi.fn() }));

vi.mock("ai", () => ({
  streamText,
}));

const summaryBody = {
  document: "This is a long enough document to summarize for the test harness.",
  language: "english",
  modelName: "gpt-4.1",
  numWords: 20,
};

function postSummary(body: unknown, init?: { signal?: AbortSignal; ip?: string }) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init?.ip) headers.set("x-real-ip", init.ip);
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
  };

  beforeEach(() => {
    summaryLimiter.reset();
    streamText.mockReset();
    process.env.SUMMARIZE_USE_FIXTURES = "true";
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (previous.fixtures === undefined) delete process.env.SUMMARIZE_USE_FIXTURES;
    else process.env.SUMMARIZE_USE_FIXTURES = previous.fixtures;
    if (previous.openai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous.openai;
  });

  it("returns fixture text without calling a provider", async () => {
    const res = await POST(postSummary(summaryBody));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("[fixture]");
    expect(streamText).not.toHaveBeenCalled();
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
});
