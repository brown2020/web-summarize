import { isIP } from "node:net";

const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [number, number]> = [
  ["0.0.0.0", "0.255.255.255"],
  ["10.0.0.0", "10.255.255.255"],
  ["100.64.0.0", "100.127.255.255"],
  ["127.0.0.0", "127.255.255.255"],
  ["169.254.0.0", "169.254.255.255"],
  ["172.16.0.0", "172.31.255.255"],
  ["192.0.0.0", "192.0.0.255"],
  ["192.0.2.0", "192.0.2.255"],
  ["192.168.0.0", "192.168.255.255"],
  ["198.18.0.0", "198.19.255.255"],
  ["198.51.100.0", "198.51.100.255"],
  ["203.0.113.0", "203.0.113.255"],
  ["224.0.0.0", "255.255.255.255"],
].map(([start, end]) => [ipv4ToNumber(start), ipv4ToNumber(end)]);

const BLOCKED_IPV6_PREFIXES = [
  "::",
  "::1",
  "fc",
  "fd",
  "fe8",
  "fe9",
  "fea",
  "feb",
  "ff",
  "100:",
  "2001:2:",
  "2001:db8:",
] as const;

function ipv4ToNumber(address: string): number {
  return address
    .split(".")
    .map(Number)
    .reduce((value, octet) => (value << 8) + octet, 0) >>> 0;
}

function isBlockedIpv4(address: string): boolean {
  const numericAddress = ipv4ToNumber(address);

  return BLOCKED_IPV4_RANGES.some(
    ([rangeStart, rangeEnd]) =>
      numericAddress >= rangeStart && numericAddress <= rangeEnd
  );
}

function extractMappedIpv4(address: string): string | null {
  const normalizedAddress = address.toLowerCase();
  const mappedSeparatorIndex = normalizedAddress.lastIndexOf(":");

  if (
    !normalizedAddress.includes(".") ||
    mappedSeparatorIndex === -1 ||
    !normalizedAddress.slice(0, mappedSeparatorIndex).includes(":")
  ) {
    return null;
  }

  const candidate = normalizedAddress.slice(mappedSeparatorIndex + 1);
  return isIP(candidate) === 4 ? candidate : null;
}

export function isPrivateIp(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return isBlockedIpv4(address);
  }

  if (ipVersion === 6) {
    const mappedIpv4 = extractMappedIpv4(address);
    if (mappedIpv4) {
      return isBlockedIpv4(mappedIpv4);
    }

    const normalizedAddress = address.toLowerCase();
    return BLOCKED_IPV6_PREFIXES.some((prefix) =>
      normalizedAddress.startsWith(prefix)
    );
  }

  return false;
}
