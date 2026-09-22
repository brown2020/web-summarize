/**
 * Proxy denial + fixture proofs. Never hits the public internet when fixtures on.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

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
  });
});

describe("GET /api/proxy", () => {
  it("denies GET with 405", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
