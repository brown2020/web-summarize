import { describe, expect, it } from "vitest";
import { validateAndNormalizeUrl } from "@/utils/url-validation";

describe("validateAndNormalizeUrl", () => {
  it("rejects empty input", () => {
    const result = validateAndNormalizeUrl("");
    expect(result.isValid).toBe(false);
  });

  it("prepends https when protocol is missing", () => {
    const result = validateAndNormalizeUrl("example.com");
    expect(result.isValid).toBe(true);
    expect(result.normalizedUrl).toBe("https://example.com/");
  });

  it("rejects unsupported protocols", () => {
    const result = validateAndNormalizeUrl("ftp://example.com");
    expect(result.isValid).toBe(false);
  });

  it("rejects embedded credentials", () => {
    const result = validateAndNormalizeUrl("https://user:pass@example.com");
    expect(result.isValid).toBe(false);
  });

  it("rejects localhost", () => {
    const result = validateAndNormalizeUrl("http://localhost:3000");
    expect(result.isValid).toBe(false);
  });
});
