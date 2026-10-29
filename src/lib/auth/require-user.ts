import { readBearerToken } from "@/lib/auth/bearer";
import { verifyFirebaseIdToken, type VerifiedFirebaseUser } from "@/lib/firebase/id-token";

export async function requireSummaryUser(
  authorizationHeader: string | null
): Promise<VerifiedFirebaseUser | null> {
  const token = readBearerToken(authorizationHeader);
  if (!token) return null;
  try {
    return await verifyFirebaseIdToken(token);
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Summary auth failed: ${name}`);
    return null;
  }
}
