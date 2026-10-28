/**
 * Private and special-use address checks shared by the browser and the proxy.
 * Pure TypeScript so client URL validation and the server use one implementation.
 */

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
].map(([start, end]) => [ipv4ToNumber(start), ipv4ToNumber(end)] as const);

function ipv4ToNumber(address: string): number {
  const parts = address.split(".");
  return parts.reduce((value, part) => value * 256 + Number(part), 0);
}

function parseIpv4(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }

  return value;
}

function isBlockedIpv4Number(value: number): boolean {
  return BLOCKED_IPV4_RANGES.some(
    ([rangeStart, rangeEnd]) => value >= rangeStart && value <= rangeEnd
  );
}

type ParsedSection = {
  groups: number[];
  ipv4: number | null;
};

function parseSection(section: string): ParsedSection | null {
  if (section === "") return { groups: [], ipv4: null };

  const parts = section.split(":");
  if (parts.some((part) => part.length === 0)) return null;

  let ipv4: number | null = null;
  const last = parts[parts.length - 1];
  if (last.includes(".")) {
    ipv4 = parseIpv4(last);
    if (ipv4 === null) return null;
    parts.pop();
  }

  const groups: number[] = [];
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    groups.push(Number.parseInt(part, 16));
  }

  return { groups, ipv4 };
}

function bytesFromGroups(groups: number[]): Uint8Array {
  const bytes = new Uint8Array(16);
  groups.forEach((group, index) => {
    bytes[index * 2] = (group >> 8) & 0xff;
    bytes[index * 2 + 1] = group & 0xff;
  });
  return bytes;
}

function parseIpv6(address: string): Uint8Array | null {
  const input = address.trim().toLowerCase();
  if (!input || input.includes("%") || input.includes(":::")) return null;

  const halves = input.split("::");
  if (halves.length > 2) return null;
  const compressed = halves.length === 2;

  const head = parseSection(halves[0] ?? "");
  const tail = compressed ? parseSection(halves[1] ?? "") : { groups: [], ipv4: null };
  if (!head || !tail) return null;
  if (head.ipv4 !== null && (compressed || tail.groups.length > 0 || tail.ipv4 !== null)) {
    return null;
  }
  if (tail.ipv4 !== null && tail.groups.length === 0 && head.groups.length === 0 && !compressed) {
    return null;
  }

  const ipv4 = head.ipv4 ?? tail.ipv4;
  const present =
    head.groups.length + tail.groups.length + (ipv4 === null ? 0 : 2);
  if (!compressed && present !== 8) return null;
  if (compressed && present > 7) return null;

  const missing = 8 - present;
  const groups = [
    ...head.groups,
    ...Array.from({ length: missing }, () => 0),
    ...tail.groups,
  ];

  if (ipv4 !== null) {
    groups.push((ipv4 >>> 16) & 0xffff, ipv4 & 0xffff);
  }

  if (groups.length !== 8) return null;
  return bytesFromGroups(groups);
}

function ipv4At(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function isBlockedIpv6(bytes: Uint8Array): boolean {
  const allZero = bytes.every((value) => value === 0);
  const loopback =
    bytes[15] === 1 && bytes.slice(0, 15).every((value) => value === 0);
  if (allZero || loopback) return true;

  const ipv4Mapped =
    bytes.slice(0, 10).every((value) => value === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff;
  const ipv4Compatible = bytes.slice(0, 12).every((value) => value === 0);
  if (ipv4Mapped || ipv4Compatible) {
    return isBlockedIpv4Number(ipv4At(bytes, 12));
  }

  // 6to4 (2002::/16) embeds the IPv4 address in bytes 2-5.
  if (bytes[0] === 0x20 && bytes[1] === 0x02) {
    return isBlockedIpv4Number(ipv4At(bytes, 2));
  }

  // Well-known NAT64 prefix 64:ff9b::/96.
  if (
    startsWith(bytes, [0x00, 0x64, 0xff, 0x9b]) &&
    bytes.slice(4, 12).every((value) => value === 0)
  ) {
    return isBlockedIpv4Number(ipv4At(bytes, 12));
  }

  // Local-use NAT64 prefix 64:ff9b:1::/48. The embedded IPv4 is not at a fixed offset.
  if (startsWith(bytes, [0x00, 0x64, 0xff, 0x9b, 0x00, 0x01])) {
    return true;
  }

  // Teredo 2001:0::/32. Client IPv4 is the last four bytes XOR 0xffffffff.
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0 && bytes[3] === 0) {
    const server = ipv4At(bytes, 4);
    const client = (ipv4At(bytes, 12) ^ 0xffffffff) >>> 0;
    return isBlockedIpv4Number(server) || isBlockedIpv4Number(client);
  }

  const first = bytes[0];
  const second = bytes[1];
  const ula = (first & 0xfe) === 0xfc;
  const linkLocal = first === 0xfe && (second & 0xc0) === 0x80;
  const siteLocal = first === 0xfe && (second & 0xc0) === 0xc0;
  const multicast = first === 0xff;
  if (ula || linkLocal || siteLocal || multicast) return true;

  // 2001:db8::/32 documentation, 2001:2::/48 benchmarking, 100::/64 discard.
  if (startsWith(bytes, [0x20, 0x01, 0x0d, 0xb8])) return true;
  if (startsWith(bytes, [0x20, 0x01, 0x00, 0x02, 0x00, 0x00])) return true;
  if (startsWith(bytes, [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])) return true;

  return false;
}

/** Hostname from the WHATWG URL parser keeps brackets around IPv6 literals. */
export function unwrapHostBrackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]") && hostname.length > 2) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

export function isIpAddress(address: string): boolean {
  return parseIpv4(address) !== null || parseIpv6(address) !== null;
}

export function isPrivateIp(address: string): boolean {
  const ipv4 = parseIpv4(address);
  if (ipv4 !== null) return isBlockedIpv4Number(ipv4);

  const ipv6 = parseIpv6(address);
  if (ipv6) return isBlockedIpv6(ipv6);

  return false;
}
