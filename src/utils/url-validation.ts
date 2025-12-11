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

    // Must have a hostname with at least one dot
    if (!parsedUrl.hostname.includes(".")) {
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
