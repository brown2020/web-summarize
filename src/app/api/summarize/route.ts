import { NextRequest, NextResponse } from "next/server";
import { createSummaryResponse } from "@/actions/generateActions";
import { requireSummaryUser } from "@/lib/auth/require-user";
import { getClientIp } from "@/lib/client-ip";
import { summaryLimiter, summaryUserLimiter } from "@/lib/limiters";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, retryAfterSeconds?: number) {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  if (retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }
  return NextResponse.json({ error: message }, { status, headers });
}

export async function POST(req: NextRequest) {
  const ipDecision = summaryLimiter.tryAcquire(`summary:${getClientIp(req.headers)}`);
  if (!ipDecision.ok) {
    return jsonError(
      "Too many requests. Please try again later.",
      429,
      ipDecision.retryAfterSeconds
    );
  }

  const user = await requireSummaryUser(req.headers.get("authorization"));
  if (!user) {
    ipDecision.release();
    return jsonError("Authentication required.", 401);
  }

  const userDecision = summaryUserLimiter.tryAcquire(`summary-user:${user.uid}`);
  if (!userDecision.ok) {
    ipDecision.release();
    return jsonError(
      "Too many requests. Please try again later.",
      429,
      userDecision.retryAfterSeconds
    );
  }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    ipDecision.release();
    userDecision.release();
  };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    release();
    return jsonError("Request body must be JSON.", 400);
  }

  return createSummaryResponse(body, req.signal, release);
}
