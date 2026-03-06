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
  });
});
