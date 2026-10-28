/**
 * URL validation utilities
 */

import { isIpAddress, isPrivateIp, unwrapHostBrackets } from "@/utils/network";

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
    const bareHost = unwrapHostBrackets(hostname);

    if (
      bareHost === "localhost" ||
      bareHost === "127.0.0.1" ||
      bareHost === "0.0.0.0" ||
      bareHost === "::1" ||
      bareHost.endsWith(".local")
    ) {
      return {
        isValid: false,
        error: "Localhost URLs are not allowed",
      };
    }

    if (isIpAddress(bareHost)) {
      if (isPrivateIp(bareHost)) {
        return {
          isValid: false,
          error: "Private or local network URLs are not allowed",
        };
      }

      return {
        isValid: true,
        normalizedUrl: parsedUrl.toString(),
      };
    }

    // Hostnames need a dot so single-label internal names are rejected.
    if (!bareHost.includes(".")) {
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
