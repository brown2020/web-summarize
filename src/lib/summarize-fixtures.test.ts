import { afterEach, describe, expect, it } from "vitest";
import {
  FIXTURE_SUMMARY,
  summarizeFixturesEnabled,
} from "@/lib/summarize-fixtures";

const ORIGINAL = process.env.SUMMARIZE_USE_FIXTURES;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SUMMARIZE_USE_FIXTURES;
  else process.env.SUMMARIZE_USE_FIXTURES = ORIGINAL;
});

describe("summarize fixtures", () => {
  it("reads SUMMARIZE_USE_FIXTURES flag", () => {
    process.env.SUMMARIZE_USE_FIXTURES = "true";
    expect(summarizeFixturesEnabled()).toBe(true);
    process.env.SUMMARIZE_USE_FIXTURES = "false";
    expect(summarizeFixturesEnabled()).toBe(false);
  });

  it("labels fixture summary content", () => {
    expect(FIXTURE_SUMMARY).toContain("[fixture]");
  });
});
