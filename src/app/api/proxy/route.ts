import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isIpAddress, isPrivateIp, unwrapHostBrackets } from "@/utils/network";
import { validateAndNormalizeUrl } from "@/utils/url-validation";
import { TIMEOUTS, VALIDATION } from "@/constants/app";
import { getClientIp } from "@/lib/client-ip";
import { proxyLimiter } from "@/lib/limiters";
import {
  FIXTURE_EXTRACTED_TEXT,
  summarizeFixturesEnabled,
} from "@/lib/summarize-fixtures";

export const dynamic = "force-dynamic";

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  404: "The requested webpage was not found. Please check the URL and try again.",
  403: "Access to this webpage is forbidden. The website may be blocking our request.",
  429: "Too many requests. Please try again later.",
};

const AXIOS_CODE_MESSAGES: Record<string, string> = {
  ENOTFOUND: "Website not found. Please check the URL and try again.",
  ETIMEDOUT: "Request timed out. The website might be slow or unavailable.",
  ECONNABORTED: "Request timed out. The website might be slow or unavailable.",
  ECONNREFUSED: "Connection refused. The website may be down.",
  ECONNRESET: "Connection was reset. Please try again.",
  ERR_FR_MAX_CONTENT_LENGTH_EXCEEDED:
    "The webpage is too large to summarize.",
  ERR_MAX_CONTENT_LENGTH_EXCEEDED:
    "The webpage is too large to summarize.",
};

const AXIOS_CODE_STATUS: Record<string, number> = {
  ENOTFOUND: 502,
  ETIMEDOUT: 504,
  ECONNABORTED: 504,
  ECONNREFUSED: 502,
  ECONNRESET: 502,
  ERR_FR_MAX_CONTENT_LENGTH_EXCEEDED: 413,
  ERR_MAX_CONTENT_LENGTH_EXCEEDED: 413,
};

class PublicFetchError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicFetchError";
    this.status = status;
  }
}

function jsonError(message: string, status: number, retryAfterSeconds?: number) {
  const headers = new Headers();
  if (retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }
  return NextResponse.json({ error: message }, { status, headers });
}

function isHtmlContentType(contentType: string): boolean {
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return mediaType === "text/html";
}

async function resolvePublicAddress(hostname: string) {
  const host = unwrapHostBrackets(hostname);
  if (isIP(host)) {
    if (!isIpAddress(host) || isPrivateIp(host)) {
      throw new PublicFetchError("Private or local network URLs are not allowed.", 403);
    }
    const family = isIP(host);
    return { address: host, family };
  }

  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length) {
    throw new PublicFetchError("Could not resolve hostname.", 502);
  }

  const publicRecord = records.find((record) => !isPrivateIp(record.address));
  if (!publicRecord) {
    throw new PublicFetchError("Private or local network URLs are not allowed.", 403);
  }

  return publicRecord;
}

function createPinnedLookup(address: string, family: number) {
  const lookupFn = ((
    _hostname: string,
    _options: object,
    callback: (err: Error | null, address: string, family: number) => void
  ) => {
    callback(null, address, family);
  }) as AxiosRequestConfig["lookup"];

  return lookupFn;
}

async function fetchHtmlWithRedirects(initialUrl: string) {
  let currentUrl = initialUrl;
  let redirects = 0;

  while (redirects <= VALIDATION.MAX_REDIRECTS) {
    const parsedUrl = new URL(currentUrl);
    const { address, family } = await resolvePublicAddress(parsedUrl.hostname);
    const lookupFn = createPinnedLookup(address, family);

    const response = await axios.get(currentUrl, {
      timeout: TIMEOUTS.URL_FETCH,
      maxRedirects: 0,
      validateStatus: (status) => status < 500,
      responseType: "text",
      maxContentLength: VALIDATION.MAX_CONTENT_BYTES,
      maxBodyLength: VALIDATION.MAX_CONTENT_BYTES,
      // Ignore HTTP_PROXY / HTTPS_PROXY so a proxy cannot dial the original hostname.
      proxy: false,
      lookup: lookupFn,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebSummarizerBot/1.0; +https://websummarizer.example.com)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) {
        throw new PublicFetchError("Redirect response missing Location header.", 502);
      }
      const nextUrl = new URL(location, currentUrl).toString();
      const validation = validateAndNormalizeUrl(nextUrl);
      if (!validation.isValid || !validation.normalizedUrl) {
        throw new PublicFetchError("Redirected URL is invalid or not allowed.", 403);
      }
      currentUrl = validation.normalizedUrl;
      redirects += 1;
      continue;
    }

    return response;
  }

  throw new PublicFetchError("Too many redirects.", 502);
}

/**
 * Extracts readable text content from HTML
 */
function extractText(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    "script, style, noscript, iframe, svg, nav, footer, header, aside"
  ).remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const mainText = normalize($("main, article").text());
  if (mainText.length >= VALIDATION.MIN_CONTENT_LENGTH) {
    return mainText;
  }

  // Get text from body, normalize whitespace
  return normalize($("body").text());
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST with a JSON body { url }." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(req: NextRequest) {
  const decision = proxyLimiter.tryAcquire(`proxy:${getClientIp(req.headers)}`);
  if (!decision.ok) {
    return jsonError(
      "Too many requests. Please try again later.",
      429,
      decision.retryAfterSeconds
    );
  }

  try {
    return await handleProxyPost(req);
  } finally {
    decision.release();
  }
}

async function handleProxyPost(req: NextRequest) {
  let url: string | null = null;
  try {
    const body = (await req.json()) as { url?: unknown };
    if (typeof body?.url === "string") {
      url = body.url;
    }
  } catch {
    return jsonError("Request body must be JSON with a url string.", 400);
  }

  if (!url) {
    return jsonError("URL parameter is required.", 400);
  }

  const validation = validateAndNormalizeUrl(url);
  if (!validation.isValid) {
    return jsonError(validation.error || "Invalid URL format", 400);
  }

  const validUrl = validation.normalizedUrl!;

  if (summarizeFixturesEnabled()) {
    return NextResponse.json(
      { text: FIXTURE_EXTRACTED_TEXT, fixture: true },
      { status: 200 }
    );
  }

  try {
    const response = await fetchHtmlWithRedirects(validUrl);

    if (response.status >= 400) {
      const errorMessage =
        HTTP_ERROR_MESSAGES[response.status] ||
        `Website returned error ${response.status}`;

      return jsonError(errorMessage, response.status);
    }

    const contentTypeHeader = response.headers["content-type"];
    const contentType = Array.isArray(contentTypeHeader)
      ? contentTypeHeader.join(",")
      : String(contentTypeHeader ?? "");
    if (!isHtmlContentType(contentType)) {
      return jsonError("Only HTML pages can be summarized.", 415);
    }

    // Extract text content server-side
    const text = extractText(response.data);

    if (!text || text.length < VALIDATION.MIN_CONTENT_LENGTH) {
      return jsonError("Could not extract sufficient content from the webpage.", 422);
    }

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = AXIOS_CODE_MESSAGES[error.code ?? ""] || "Failed to fetch the content.";
      const statusCode = AXIOS_CODE_STATUS[error.code ?? ""] || (error.response && error.response.status >= 500
        ? 502
        : error.response?.status || 502);
      if (!AXIOS_CODE_MESSAGES[error.code ?? ""] && !error.response) {
        return jsonError("No response received from the website. Please try again later.", 502);
      }
      return jsonError(errorMessage, statusCode);
    }

    if (error instanceof PublicFetchError) {
      return jsonError(error.message, error.status);
    }

    const name = error instanceof Error ? error.name : "Error";
    console.error(`Proxy fetch failed: ${name}`);
    return jsonError("Failed to fetch the content.", 502);
  }
}
