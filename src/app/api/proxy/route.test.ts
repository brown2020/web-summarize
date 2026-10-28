/**
 * Proxy denial + fixture proofs. Never hits the public internet when fixtures on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import axios from "axios";
import { RATE_LIMITS } from "@/constants/app";
import { proxyLimiter } from "@/lib/limiters";
import { GET, POST } from "./route";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    isAxiosError: (error: unknown) =>
      Boolean(
        error &&
          typeof error === "object" &&
          "isAxiosError" in error &&
          (error as { isAxiosError?: boolean }).isAxiosError
      ),
  },
}));

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/proxy denial and fixtures", () => {
  const prevFixture = process.env.SUMMARIZE_USE_FIXTURES;

  beforeEach(() => {
    process.env.SUMMARIZE_USE_FIXTURES = "true";
    proxyLimiter.reset();
    vi.mocked(axios.get).mockReset();
  });

  afterEach(() => {
    if (prevFixture === undefined) delete process.env.SUMMARIZE_USE_FIXTURES;
    else process.env.SUMMARIZE_USE_FIXTURES = prevFixture;
  });

  it("rejects missing url (400)", async () => {
    const res = await POST(
      postReq({})
    );
    expect(res.status).toBe(400);
  });

  it("rejects localhost / private SSRF targets (400)", async () => {
    const res = await POST(
      postReq({ url: "http://127.0.0.1/" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toMatch(/not allowed|Invalid|local/i);
  });

  it("rejects credentialed URLs (400)", async () => {
    const res = await POST(
      postReq({ url: "https://user:pass@example.com/" })
    );
    expect(res.status).toBe(400);
  });

  it("returns labeled fixture text for valid public URL without live fetch", async () => {
    const res = await POST(
      postReq({ url: "https://example.com/" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fixture).toBe(true);
    expect(String(body.text)).toContain("[fixture]");
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("rejects private literals before the fixture short-circuit", async () => {
    const res = await POST(postReq({ url: "http://169.254.169.254/latest/meta-data/" }));
    expect(res.status).toBe(400);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("allows a public IPv6 literal to reach the fixture response", async () => {
    const res = await POST(postReq({ url: "http://[2606:4700:4700::1111]/" }));
    expect(res.status).toBe(200);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("returns 429 when the client is over the proxy limit", async () => {
    const ip = "203.0.113.50";
    const held = [];
    for (let attempt = 0; attempt < RATE_LIMITS.PROXY.maxConcurrent; attempt += 1) {
      const decision = proxyLimiter.tryAcquire(`proxy:${ip}`);
      expect(decision.ok).toBe(true);
      if (decision.ok) held.push(decision);
    }

    const res = await POST(
      new NextRequest("http://localhost/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": ip },
        body: JSON.stringify({ url: "https://example.com/" }),
      })
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    held.forEach((decision) => decision.release());
  });
});

describe("POST /api/proxy live fetch guards", () => {
  const prevFixture = process.env.SUMMARIZE_USE_FIXTURES;

  beforeEach(() => {
    delete process.env.SUMMARIZE_USE_FIXTURES;
    proxyLimiter.reset();
    vi.mocked(axios.get).mockReset();
  });

  afterEach(() => {
    if (prevFixture === undefined) delete process.env.SUMMARIZE_USE_FIXTURES;
    else process.env.SUMMARIZE_USE_FIXTURES = prevFixture;
  });

  it("pins DNS, disables env proxies, and accepts Text/HTML", async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "Text/HTML; charset=UTF-8" },
      data: `<html><body><article>${"readable page content ".repeat(8)}</article></body></html>`,
    } as never);

    const res = await POST(postReq({ url: "http://1.1.1.1/docs" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(String(body.text).length).toBeGreaterThan(50);
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "http://1.1.1.1/docs",
      expect.objectContaining({ proxy: false, maxRedirects: 0 })
    );
    const config = vi.mocked(axios.get).mock.calls[0]?.[1] as { lookup?: unknown };
    expect(typeof config.lookup).toBe("function");
  });

  it("fetches a public IPv6 literal without a DNS lookup", async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "text/html" },
      data: `<html><body><article>${"public ipv6 page content ".repeat(8)}</article></body></html>`,
    } as never);

    const res = await POST(postReq({ url: "http://[2606:4700:4700::1111]/" }));
    expect(res.status).toBe(200);
    expect(axios.get).toHaveBeenCalledWith(
      "http://[2606:4700:4700::1111]/",
      expect.objectContaining({ proxy: false })
    );
  });

  it("does not follow a redirect to a private address", async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      status: 302,
      statusText: "Found",
      headers: { location: "http://10.0.0.1/secret" },
      data: "",
    } as never);

    const res = await POST(postReq({ url: "http://1.1.1.1/start" }));
    expect(res.status).toBe(403);
    expect(axios.get).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(String(body.error)).toMatch(/not allowed/i);
  });

  it("hides resolver and transport error details", async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(
      new Error("getaddrinfo ENOTFOUND metadata.google.internal")
    );

    const res = await POST(postReq({ url: "http://1.1.1.1/" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch the content.");
    expect(JSON.stringify(body)).not.toContain("getaddrinfo");
    expect(JSON.stringify(body)).not.toContain("metadata.google.internal");
  });
});

describe("GET /api/proxy", () => {
  it("denies GET with 405", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
