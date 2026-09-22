import { afterEach, describe, expect, it } from "vitest";
import {
  assertModelAvailable,
  getAvailableModels,
} from "@/lib/model-availability";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("model availability", () => {
  it("filters models based on configured env keys", () => {
    process.env = {
      ...ORIGINAL_ENV,
      SUMMARIZE_USE_FIXTURES: "",
      OPENAI_API_KEY: "test-key",
      ANTHROPIC_API_KEY: "",
      GOOGLE_GENERATIVE_AI_API_KEY: "",
      MISTRAL_API_KEY: "",
      FIREWORKS_API_KEY: "",
    };
    delete process.env.SUMMARIZE_USE_FIXTURES;

    const models = getAvailableModels();
    const values = models.map((model) => model.value);
    expect(values).toContain("gpt-4.1");
    expect(values).not.toContain("claude-sonnet-4.5");
  });

  it("throws when model is not configured", () => {
    process.env = {
      ...ORIGINAL_ENV,
      SUMMARIZE_USE_FIXTURES: "",
      ANTHROPIC_API_KEY: "",
    };
    delete process.env.SUMMARIZE_USE_FIXTURES;

    expect(() => assertModelAvailable("claude-sonnet-4.5")).toThrow(
      "Selected model is not configured."
    );
  });

  it("exposes full catalog when fixtures enabled without API keys", () => {
    process.env = {
      ...ORIGINAL_ENV,
      SUMMARIZE_USE_FIXTURES: "true",
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GOOGLE_GENERATIVE_AI_API_KEY: "",
      MISTRAL_API_KEY: "",
      FIREWORKS_API_KEY: "",
    };

    const models = getAvailableModels();
    expect(models.length).toBeGreaterThan(1);
    expect(() => assertModelAvailable("gpt-4.1")).not.toThrow();
  });
});
