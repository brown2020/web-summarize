/** Client address used for per-IP limits. Prefer the platform-set real IP. */
export function getClientIp(headerList: { get(name: string): string | null }): string {
  const realIp = headerList.get("x-real-ip")?.trim();
  if (realIp) return normalizeIpKey(realIp);

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const closest = hops[hops.length - 1];
    if (closest) return normalizeIpKey(closest);
  }

  return "unknown";
}

function normalizeIpKey(value: string): string {
  const withoutBrackets =
    value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  return withoutBrackets.toLowerCase();
}
