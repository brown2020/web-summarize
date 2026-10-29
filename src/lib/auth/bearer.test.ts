import { describe, expect, it } from "vitest";
import { readBearerToken } from "./bearer";

describe("readBearerToken", () => {
  it("reads a bearer token and rejects other schemes", () => {
    expect(readBearerToken("Bearer good-token")).toBe("good-token");
    expect(readBearerToken("bearer good-token")).toBe("good-token");
    expect(readBearerToken("Basic good-token")).toBeNull();
    expect(readBearerToken(null)).toBeNull();
  });
});
