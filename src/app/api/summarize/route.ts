import { NextRequest, NextResponse } from "next/server";
import { createSummaryResponse } from "@/actions/generateActions";
import { getClientIp } from "@/lib/client-ip";
import { summaryLimiter } from "@/lib/limiters";

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
  const decision = summaryLimiter.tryAcquire(`summary:${getClientIp(req.headers)}`);
  if (!decision.ok) {
    return jsonError(
      "Too many requests. Please try again later.",
      429,
      decision.retryAfterSeconds
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    decision.release();
    return jsonError("Request body must be JSON.", 400);
  }

  return createSummaryResponse(body, req.signal, decision.release);
}
