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

  it("rejects private IP literals, including transition forms", () => {
    expect(validateAndNormalizeUrl("http://10.0.0.1/").isValid).toBe(false);
    expect(validateAndNormalizeUrl("http://169.254.169.254/latest/meta-data/").isValid).toBe(
      false
    );
    expect(validateAndNormalizeUrl("http://[::1]/").isValid).toBe(false);
    expect(validateAndNormalizeUrl("http://[2002:a9fe:a9fe::]/").isValid).toBe(false);
    expect(validateAndNormalizeUrl("http://[64:ff9b::a9fe:a9fe]/").isValid).toBe(false);
  });

  it("allows public IPv4 and IPv6 literals", () => {
    expect(validateAndNormalizeUrl("http://8.8.8.8/").isValid).toBe(true);
    expect(validateAndNormalizeUrl("http://[2606:4700:4700::1111]/")).toEqual({
      isValid: true,
      normalizedUrl: "http://[2606:4700:4700::1111]/",
    });
  });
});
