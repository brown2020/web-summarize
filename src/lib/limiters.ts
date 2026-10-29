import { RATE_LIMITS } from "@/constants/app";
import { createRateLimiter } from "@/lib/rate-limit";

export const proxyLimiter = createRateLimiter(RATE_LIMITS.PROXY);
export const summaryLimiter = createRateLimiter(RATE_LIMITS.SUMMARY);
export const summaryUserLimiter = createRateLimiter(RATE_LIMITS.SUMMARY_USER);
