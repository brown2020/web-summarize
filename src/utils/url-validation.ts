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
  if (!url.trim()) {
    return {
      isValid: false,
      error: "URL is required"
    };
  }

  const trimmedUrl = url.trim();

  try {
    // Try parsing as-is first
    const parsedUrl = new URL(trimmedUrl);
    return {
      isValid: true,
      normalizedUrl: parsedUrl.toString()
    };
  } catch {
    // Try with https:// prefix
    try {
      const prefixedUrl = `https://${trimmedUrl}`;
      const parsedUrl = new URL(prefixedUrl);
      return {
        isValid: true,
        normalizedUrl: parsedUrl.toString()
      };
    } catch {
      return {
        isValid: false,
        error: "Please enter a valid URL (e.g., https://example.com)"
      };
    }
  }
}

/**
 * Checks if a URL is valid without normalization
 * @param url - The URL to check
 * @returns True if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  return validateAndNormalizeUrl(url).isValid;
}
