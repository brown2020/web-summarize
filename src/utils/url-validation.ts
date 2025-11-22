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
      error: "URL is required"
    };
  }

  let trimmedUrl = url.trim();

  // Auto-prepend protocol if missing and it looks like a domain
  // Regex checks for domain-like pattern (e.g., "example.com", "sub.domain.co.uk")
  // It's a loose check to catch common cases like "ignite.me"
  const hasProtocol = /^https?:\/\//i.test(trimmedUrl);
  if (!hasProtocol) {
     // Basic check to see if it might be a domain before prepending
     // This allows "ignite.me" -> "https://ignite.me"
     // but avoids potentially weird inputs
     trimmedUrl = `https://${trimmedUrl}`;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    
    // Basic validation: must have a hostname with at least one dot
    if (!parsedUrl.hostname.includes('.')) {
        return {
            isValid: false,
            error: "Please enter a valid domain name (e.g., example.com)"
        };
    }

    return {
      isValid: true,
      normalizedUrl: parsedUrl.toString()
    };
  } catch {
      return {
        isValid: false,
        error: "Please enter a valid URL (e.g., example.com)"
      };
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
