import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID, MODEL_CATALOG } from "@/constants/summarizer";
import { resolveModelId } from "@/lib/model-ids";

describe("model catalog", () => {
  it("offers exactly the four current flagships with GPT-6.1 Sol as default", () => {
    expect(MODEL_CATALOG.map((model) => [model.value, model.envKey])).toEqual([
      ["gpt-6.1-sol", "OPENAI_API_KEY"],
      ["claude-opus-5-5", "ANTHROPIC_API_KEY"],
      ["gemini-4-argon", "GOOGLE_GENERATIVE_AI_API_KEY"],
      ["grok-4.7", "XAI_API_KEY"],
    ]);
    expect(DEFAULT_MODEL_ID).toBe("gpt-6.1-sol");
  });
});

describe("resolveModelId", () => {
  it.each(["gpt-6.1-sol", "claude-opus-5-5", "gemini-4-argon", "grok-4.7"])(
    "keeps current id %s",
    (id) => {
      expect(resolveModelId(id)).toBe(id);
    }
  );

  it.each([
    ["openai/gpt-6.1-sol", "gpt-6.1-sol"],
    ["anthropic/claude-opus-5.5", "claude-opus-5-5"],
    ["google/gemini-4-argon", "gemini-4-argon"],
    ["spacexai/grok-4.7", "grok-4.7"],
  ])("accepts gateway id %s", (id, expected) => {
    expect(resolveModelId(id)).toBe(expected);
  });

  it.each([
    ["gpt-4.1", "gpt-6.1-sol"],
    ["gpt-4o", "gpt-6.1-sol"],
    ["gpt-5", "gpt-6.1-sol"],
    ["o3-mini", "gpt-6.1-sol"],
    ["claude-sonnet-4.5", "claude-opus-5-5"],
    ["claude-3-5-sonnet-20241022", "claude-opus-5-5"],
    ["gemini-2.5-flash", "gemini-4-argon"],
    ["gemini-1.5-pro", "gemini-4-argon"],
    ["gemini-3-pro", "gemini-4-argon"],
    ["grok-beta", "grok-4.7"],
    ["grok-2-1212", "grok-4.7"],
    ["grok-4", "grok-4.7"],
    ["xai/grok-3", "grok-4.7"],
    ["mistral-large", DEFAULT_MODEL_ID],
    ["mistral-large-latest", DEFAULT_MODEL_ID],
    ["llama-v3p3-70b", DEFAULT_MODEL_ID],
    ["accounts/fireworks/models/llama-v3p1-405b-instruct", DEFAULT_MODEL_ID],
  ])("maps retired id %s to %s", (legacy, successor) => {
    expect(resolveModelId(legacy)).toBe(successor);
  });

  it.each(["", "not-a-model", "deepseek-chat", "openai/", "../gpt-6.1-sol"])(
    "rejects unknown id %j",
    (id) => {
      expect(resolveModelId(id)).toBeNull();
    }
  );
});
