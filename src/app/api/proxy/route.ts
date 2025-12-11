import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { validateAndNormalizeUrl } from "@/utils/url-validation";
import { TIMEOUTS, VALIDATION } from "@/constants/app";

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

  // Get text from body, normalize whitespace
  const text = $("body").text().replace(/\s+/g, " ").trim();

  return text;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required." },
      { status: 400 }
    );
  }

  const validation = validateAndNormalizeUrl(url);
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.error || "Invalid URL format" },
      { status: 400 }
    );
  }

  const validUrl = validation.normalizedUrl!;

  try {
    const response = await axios.get(validUrl, {
      timeout: TIMEOUTS.URL_FETCH,
      maxRedirects: VALIDATION.MAX_REDIRECTS,
      validateStatus: (status) => status < 500,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebSummarizerBot/1.0; +https://websummarizer.example.com)",
      },
    });

    if (response.status >= 400) {
      const errorMessages: Record<number, string> = {
        404: "The requested webpage was not found. Please check the URL and try again.",
        403: "Access to this webpage is forbidden. The website may be blocking our request.",
        429: "Too many requests. Please try again later.",
      };

      const errorMessage =
        errorMessages[response.status] ||
        `Website returned error ${response.status}: ${response.statusText}`;

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Extract text content server-side
    const text = extractText(response.data);

    if (!text || text.length < VALIDATION.MIN_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "Could not extract sufficient content from the webpage." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    let errorMessage = "Failed to fetch the content.";
    let statusCode = 400;

    if (axios.isAxiosError(error)) {
      const errorMessages: Record<string, string> = {
        ENOTFOUND: "Website not found. Please check the URL and try again.",
        ETIMEDOUT:
          "Request timed out. The website might be slow or unavailable.",
        ECONNABORTED:
          "Request timed out. The website might be slow or unavailable.",
        ECONNREFUSED: "Connection refused. The website may be down.",
        ECONNRESET: "Connection was reset. Please try again.",
      };

      errorMessage = errorMessages[error.code ?? ""] || errorMessage;

      if (!errorMessages[error.code ?? ""]) {
        if (error.response) {
          errorMessage = `Server returned error ${error.response.status}: ${error.response.statusText}`;
          statusCode = error.response.status;
        } else if (error.request) {
          errorMessage =
            "No response received from the website. Please try again later.";
        }
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
