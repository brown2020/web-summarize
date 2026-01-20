/**
 * URL validation utilities
 */

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates and normalizes a URL
 * @param url - The URL to validate
 * @returns Validation result with normalized URL or error message
 */
export function validateAndNormalizeUrl(url: string): UrlValidationResult {
  if (!url?.trim()) {
    return {
      isValid: false,
      error: "URL is required",
    };
  }

  let trimmedUrl = url.trim();

  // Auto-prepend https:// if no protocol present
  const hasProtocol = /^https?:\/\//i.test(trimmedUrl);
  if (!hasProtocol) {
    trimmedUrl = `https://${trimmedUrl}`;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: "Only http and https URLs are supported",
      };
    }

    if (parsedUrl.username || parsedUrl.password) {
      return {
        isValid: false,
        error: "URLs with embedded credentials are not allowed",
      };
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    ) {
      return {
        isValid: false,
        error: "Localhost URLs are not allowed",
      };
    }

    // Must have a hostname with at least one dot
    if (!hostname.includes(".")) {
      return {
        isValid: false,
        error: "Please enter a valid domain name (e.g., example.com)",
      };
    }

    return {
      isValid: true,
      normalizedUrl: parsedUrl.toString(),
    };
  } catch {
    return {
      isValid: false,
      error: "Please enter a valid URL (e.g., example.com)",
    };
  }
}
