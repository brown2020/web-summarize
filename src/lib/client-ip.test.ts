import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/client-ip";

function headers(values: Record<string, string>) {
  const map = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (name: string) => map.get(name.toLowerCase()) ?? null };
}

describe("getClientIp", () => {
  it("prefers x-real-ip over a spoofed forwarding list", () => {
    expect(
      getClientIp(
        headers({
          "x-real-ip": "203.0.113.10",
          "x-forwarded-for": "1.2.3.4, 10.0.0.8",
        })
      )
    ).toBe("203.0.113.10");
  });

  it("uses the closest forwarding hop when x-real-ip is absent", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.20" }))).toBe(
      "198.51.100.20"
    );
  });

  it("falls back when no address header is present", () => {
    expect(getClientIp(headers({}))).toBe("unknown");
  });
});
