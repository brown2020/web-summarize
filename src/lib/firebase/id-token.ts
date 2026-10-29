const GOOGLE_JWKS =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const CACHE_MS = 60 * 60 * 1000;

type Jwk = JsonWebKey & { kid?: string };

export type VerifiedFirebaseUser = { uid: string };

let cached: { at: number; keys: Jwk[] } | null = null;

async function fetchGoogleJwks(): Promise<Jwk[]> {
  const response = await fetch(GOOGLE_JWKS);
  if (!response.ok) throw new Error("Failed to load Firebase signing keys.");
  const body = (await response.json()) as { keys?: Jwk[] };
  return body.keys ?? [];
}

let loadKeys: () => Promise<Jwk[]> = fetchGoogleJwks;

/** Test hook. Pass null to restore the Google JWKS fetch. */
export function setFirebaseJwksLoader(loader: (() => Promise<Jwk[]>) | null): void {
  loadKeys = loader ?? fetchGoogleJwks;
  cached = null;
}

export function firebaseProjectId(): string | undefined {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECTID?.trim();
  return projectId || undefined;
}

function bytesFromBase64Url(segment: string): Uint8Array<ArrayBuffer> {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function keys(force: boolean): Promise<Jwk[]> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.keys;
  const next = await loadKeys();
  cached = { at: Date.now(), keys: next };
  return next;
}

async function keyForKid(kid: string): Promise<CryptoKey | null> {
  let list = await keys(false).catch(() => [] as Jwk[]);
  let jwk = list.find((key) => key.kid === kid);
  if (!jwk) {
    list = await keys(true).catch(() => [] as Jwk[]);
    jwk = list.find((key) => key.kid === kid);
  }
  if (!jwk) return null;
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verifies a Firebase ID token against Google's securetoken keys.
 * Returns the uid, or null when the token, signature, or project id is missing.
 */
export async function verifyFirebaseIdToken(
  token: string,
  nowMs: number = Date.now()
): Promise<VerifiedFirebaseUser | null> {
  const projectId = firebaseProjectId();
  if (!projectId) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header: { alg?: string; kid?: string };
  let payload: { iss?: string; aud?: string; sub?: string; exp?: number };
  try {
    header = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(parts[0]))) as {
      alg?: string;
      kid?: string;
    };
    payload = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(parts[1]))) as {
      iss?: string;
      aud?: string;
      sub?: string;
      exp?: number;
    };
  } catch {
    return null;
  }

  if (header.alg !== "RS256" || !header.kid) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (payload.aud !== projectId) return null;
  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  if (typeof payload.exp !== "number") return null;
  const leewaySeconds = 60;
  if (payload.exp + leewaySeconds <= Math.floor(nowMs / 1000)) return null;

  const key = await keyForKid(header.kid);
  if (!key) return null;
  try {
    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      bytesFromBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    return valid ? { uid: payload.sub } : null;
  } catch {
    return null;
  }
}
