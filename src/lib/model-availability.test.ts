import { afterEach, describe, expect, it } from "vitest";
import {
  assertModelAvailable,
  getAvailableModels,
} from "@/lib/model-availability";

const ORIGINAL_ENV = { ...process.env };

const NO_PROVIDER_KEYS = {
  OPENAI_API_KEY: "",
  ANTHROPIC_API_KEY: "",
  GOOGLE_GENERATIVE_AI_API_KEY: "",
  XAI_API_KEY: "",
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("model availability", () => {
  it("filters models based on configured env keys", () => {
    process.env = { ...ORIGINAL_ENV, ...NO_PROVIDER_KEYS, OPENAI_API_KEY: "test-key" };
    delete process.env.SUMMARIZE_USE_FIXTURES;

    const values = getAvailableModels().map((model) => model.value);
    expect(values).toEqual(["gpt-6.1-sol"]);
  });

  it("lists Grok 4.7 only when XAI_API_KEY is set", () => {
    process.env = { ...ORIGINAL_ENV, ...NO_PROVIDER_KEYS, XAI_API_KEY: "test-key" };
    delete process.env.SUMMARIZE_USE_FIXTURES;

    expect(getAvailableModels().map((model) => model.value)).toEqual(["grok-4.7"]);
  });

  it("throws when model is not configured", () => {
    process.env = { ...ORIGINAL_ENV, ...NO_PROVIDER_KEYS };
    delete process.env.SUMMARIZE_USE_FIXTURES;

    expect(() => assertModelAvailable("claude-opus-5-5")).toThrow(
      "Selected model is not configured."
    );
  });

  it("resolves a retired id to its configured successor", () => {
    process.env = { ...ORIGINAL_ENV, ...NO_PROVIDER_KEYS, ANTHROPIC_API_KEY: "test-key" };
    delete process.env.SUMMARIZE_USE_FIXTURES;

    expect(assertModelAvailable("claude-sonnet-4.5").value).toBe("claude-opus-5-5");
  });

  it("rejects ids outside every known provider family", () => {
    process.env = { ...ORIGINAL_ENV, SUMMARIZE_USE_FIXTURES: "true" };

    expect(() => assertModelAvailable("not-a-model")).toThrow("Unsupported model selected.");
  });

  it("exposes full catalog when fixtures enabled without API keys", () => {
    process.env = { ...ORIGINAL_ENV, ...NO_PROVIDER_KEYS, SUMMARIZE_USE_FIXTURES: "true" };

    expect(getAvailableModels().map((model) => model.value)).toEqual([
      "gpt-6.1-sol",
      "claude-opus-5-5",
      "gemini-4-argon",
      "grok-4.7",
    ]);
    expect(assertModelAvailable("gpt-6.1-sol").value).toBe("gpt-6.1-sol");
  });
});
