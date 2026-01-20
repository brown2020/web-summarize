import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateIp } from "@/utils/network";
import { validateAndNormalizeUrl } from "@/utils/url-validation";
import { TIMEOUTS, VALIDATION } from "@/constants/app";

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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

 

async function resolvePublicAddress(hostname: string) {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error("Private or local network URLs are not allowed.");
    }
    return { address: hostname, family: isIP(hostname) };
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    throw new Error("Could not resolve hostname.");
  }

  const publicRecord = records.find((record) => !isPrivateIp(record.address));
  if (!publicRecord) {
    throw new Error("Private or local network URLs are not allowed.");
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
      lookup: lookupFn,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebSummarizerBot/1.0; +https://websummarizer.example.com)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) {
        throw new Error("Redirect response missing Location header.");
      }
      const nextUrl = new URL(location, currentUrl).toString();
      const validation = validateAndNormalizeUrl(nextUrl);
      if (!validation.isValid || !validation.normalizedUrl) {
        throw new Error("Redirected URL is invalid or not allowed.");
      }
      currentUrl = validation.normalizedUrl;
      redirects += 1;
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects.");
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return jsonError("URL parameter is required.", 400);
  }

  const validation = validateAndNormalizeUrl(url);
  if (!validation.isValid) {
    return jsonError(validation.error || "Invalid URL format", 400);
  }

  const validUrl = validation.normalizedUrl!;
  const host = new URL(validUrl).hostname;
  const startedAt = Date.now();

  try {
    const response = await fetchHtmlWithRedirects(validUrl);

    if (response.status >= 400) {
      const errorMessage =
        HTTP_ERROR_MESSAGES[response.status] ||
        `Website returned error ${response.status}: ${response.statusText}`;

      return jsonError(errorMessage, response.status);
    }

    const contentType = response.headers["content-type"] ?? "";
    if (!contentType.includes("text/html")) {
      return jsonError("Only HTML pages can be summarized.", 415);
    }

    // Extract text content server-side
    const text = extractText(response.data);

    if (!text || text.length < VALIDATION.MIN_CONTENT_LENGTH) {
      return jsonError("Could not extract sufficient content from the webpage.", 422);
    }

    console.info("[proxy] fetched", {
      host,
      durationMs: Date.now() - startedAt,
      chars: text.length,
    });

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    let errorMessage = "Failed to fetch the content.";
    let statusCode = 502;

    if (axios.isAxiosError(error)) {
      errorMessage = AXIOS_CODE_MESSAGES[error.code ?? ""] || errorMessage;
      statusCode = AXIOS_CODE_STATUS[error.code ?? ""] || statusCode;

      if (!AXIOS_CODE_MESSAGES[error.code ?? ""]) {
        if (error.response) {
          errorMessage = `Server returned error ${error.response.status}: ${error.response.statusText}`;
          statusCode = error.response.status >= 500 ? 502 : error.response.status;
        } else if (error.request) {
          errorMessage =
            "No response received from the website. Please try again later.";
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      statusCode = error.message.includes("not allowed") ? 403 : 400;
    }

    console.warn("[proxy] failed", {
      host,
      durationMs: Date.now() - startedAt,
      error: errorMessage,
    });

    return jsonError(errorMessage, statusCode);
  }
}
