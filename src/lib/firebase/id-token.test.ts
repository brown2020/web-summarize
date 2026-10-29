import { afterEach, describe, expect, it } from "vitest";
import { setFirebaseJwksLoader, verifyFirebaseIdToken } from "./id-token";

const PROJECT = "web-summarize-test";

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64url");
}

async function signedToken(
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: "RS256", kid: "test-kid", typ: "JWT" }
): Promise<string> {
  const encodedHeader = base64UrlJson(header);
  const encodedPayload = base64UrlJson(payload);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  const encodedSignature = Buffer.from(signature).toString("base64url");
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

describe("verifyFirebaseIdToken", () => {
  const previous = process.env.NEXT_PUBLIC_FIREBASE_PROJECTID;

  afterEach(() => {
    setFirebaseJwksLoader(null);
    if (previous === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_PROJECTID;
    else process.env.NEXT_PUBLIC_FIREBASE_PROJECTID = previous;
  });

  it("accepts an RS256 token for the configured project and rejects tampering", async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
    const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    setFirebaseJwksLoader(async () => [{ ...jwk, kid: "test-kid", alg: "RS256", use: "sig" }]);
    process.env.NEXT_PUBLIC_FIREBASE_PROJECTID = PROJECT;

    const now = 1_700_000_000_000;
    const payload = {
      iss: `https://securetoken.google.com/${PROJECT}`,
      aud: PROJECT,
      sub: "alice",
      exp: Math.floor(now / 1000) + 600,
    };
    const token = await signedToken(pair.privateKey, payload);
    expect(await verifyFirebaseIdToken(token, now)).toEqual({ uid: "alice" });

    const [header, , signature] = token.split(".");
    const forged = base64UrlJson({ ...payload, sub: "mallory" });
    expect(await verifyFirebaseIdToken(`${header}.${forged}.${signature}`, now)).toBeNull();
    expect(await verifyFirebaseIdToken(token, now + 2 * 60 * 60 * 1000)).toBeNull();
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECTID;
    expect(await verifyFirebaseIdToken(token, now)).toBeNull();
  });
});
