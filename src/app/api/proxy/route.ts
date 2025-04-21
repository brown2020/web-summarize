import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required." },
      { status: 400 }
    );
  }

  // Validate URL format and add protocol if missing
  let validUrl = url;
  try {
    // Test if the URL is valid by creating a URL object
    new URL(url);
  } catch {
    // If URL is invalid, try adding https:// prefix
    try {
      validUrl = `https://${url}`;
      new URL(validUrl); // Validate again with prefix
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid URL format. Please include the full URL with protocol (e.g., https://example.com).",
        },
        { status: 400 }
      );
    }
  }

  try {
    // Set a reasonable timeout to prevent hanging requests
    const response = await axios.get(validUrl, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept all responses with status < 500
      headers: {
        // Set a user agent to prevent some sites from blocking the request
        "User-Agent":
          "Mozilla/5.0 (compatible; WebSummarizerBot/1.0; +https://websummarizer.example.com)",
      },
    });

    // Handle unsuccessful responses with appropriate status codes
    if (response.status >= 400) {
      let errorMessage = `Website returned error ${response.status}`;
      if (response.status === 404) {
        errorMessage =
          "The requested webpage was not found. Please check the URL and try again.";
      } else if (response.status === 403) {
        errorMessage =
          "Access to this webpage is forbidden. The website may be blocking our request.";
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Send the fetched content back to the client
    return new NextResponse(response.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching the URL:", error);

    // More specific error message based on error type
    let errorMessage = "Failed to fetch the content.";
    let statusCode = 400; // Default to 400 instead of 500 to prevent runtime errors

    if (axios.isAxiosError(error)) {
      if (error.code === "ENOTFOUND") {
        errorMessage = "Website not found. Please check the URL and try again.";
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        errorMessage =
          "Request timed out. The website might be slow or unavailable.";
      } else if (error.response) {
        errorMessage = `Server returned error ${error.response.status}: ${error.response.statusText}`;
        statusCode = error.response.status;
      } else if (error.request) {
        errorMessage =
          "No response received from the website. Please try again later.";
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
