import { describe, expect, it } from "vitest";
import { isPrivateIp } from "@/utils/network";

describe("isPrivateIp", () => {
  it("detects private IPv4 ranges", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
  });

  it("detects loopback and link-local", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("169.254.1.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("detects special-use and documentation ranges", () => {
    expect(isPrivateIp("198.19.0.1")).toBe(true);
    expect(isPrivateIp("203.0.113.10")).toBe(true);
    expect(isPrivateIp("2001:db8::1")).toBe(true);
  });

  it("detects IPv4-mapped IPv6 loopback and private addresses", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:10.0.0.8")).toBe(true);
  });

  it("allows public IPs", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false);
    expect(isPrivateIp("2002:808:808::")).toBe(false);
    expect(isPrivateIp("64:ff9b::808:808")).toBe(false);
  });

  it("blocks non-canonical and transition forms of private addresses", () => {
    expect(isPrivateIp("0:0:0:0:0:0:0:1")).toBe(true);
    expect(isPrivateIp("::ffff:7f00:1")).toBe(true);
    expect(isPrivateIp("::ffff:a9fe:a9fe")).toBe(true);
    expect(isPrivateIp("2002:a9fe:a9fe::")).toBe(true);
    expect(isPrivateIp("2002:7f00:1::")).toBe(true);
    expect(isPrivateIp("64:ff9b::a9fe:a9fe")).toBe(true);
    expect(isPrivateIp("64:ff9b::7f00:1")).toBe(true);
    expect(isPrivateIp("64:ff9b:1::")).toBe(true);
    expect(isPrivateIp("fec0::1")).toBe(true);
    // Teredo client 127.0.0.1, server 8.8.8.8.
    expect(isPrivateIp("2001:0:808:808:ffff:ffff:80ff:fffe")).toBe(true);
    // Teredo server 10.0.0.1, client 8.8.8.8 (obfuscated f7f7:fbfb).
    expect(isPrivateIp("2001:0:a00:1:0:0:f7f7:fbfb")).toBe(true);
  });

  it("allows Teredo addresses whose embedded IPv4 endpoints are public", () => {
    expect(isPrivateIp("2001:0:101:101:0:0:f7f7:fbfb")).toBe(false);
  });
});
