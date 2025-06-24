import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { validateAndNormalizeUrl } from "@/utils/url-validation";
import { TIMEOUTS, VALIDATION } from "@/constants/app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required." },
      { status: 400 }
    );
  }

  // Validate and normalize URL using shared utility
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

    // Handle unsuccessful responses with appropriate status codes
    if (response.status >= 400) {
      let errorMessage = `Website returned error ${response.status}`;
      
      switch (response.status) {
        case 404:
          errorMessage = "The requested webpage was not found. Please check the URL and try again.";
          break;
        case 403:
          errorMessage = "Access to this webpage is forbidden. The website may be blocking our request.";
          break;
        case 429:
          errorMessage = "Too many requests. Please try again later.";
          break;
        default:
          errorMessage = `Website returned error ${response.status}: ${response.statusText}`;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return new NextResponse(response.data, { status: 200 });
  } catch (error) {
    // More specific error handling
    let errorMessage = "Failed to fetch the content.";
    let statusCode = 400;

    if (axios.isAxiosError(error)) {
      switch (error.code) {
        case "ENOTFOUND":
          errorMessage = "Website not found. Please check the URL and try again.";
          break;
        case "ETIMEDOUT":
        case "ECONNABORTED":
          errorMessage = "Request timed out. The website might be slow or unavailable.";
          break;
        case "ECONNREFUSED":
          errorMessage = "Connection refused. The website may be down.";
          break;
        case "ECONNRESET":
          errorMessage = "Connection was reset. Please try again.";
          break;
        default:
          if (error.response) {
            errorMessage = `Server returned error ${error.response.status}: ${error.response.statusText}`;
            statusCode = error.response.status;
          } else if (error.request) {
            errorMessage = "No response received from the website. Please try again later.";
          }
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
