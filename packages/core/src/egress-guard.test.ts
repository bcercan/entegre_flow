import { describe, it, expect } from "vitest";
import { isDisallowedIp, resolveSafeHost, assertSafeHttpUrl } from "./egress-guard";

describe("isDisallowedIp", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.16.4.4",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1", // CGNAT
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isDisallowedIp(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34"])("allows public %s", (ip) => {
    expect(isDisallowedIp(ip)).toBe(false);
  });
});

describe("resolveSafeHost", () => {
  it("pins a public IP literal", async () => {
    const t = await resolveSafeHost("8.8.8.8");
    expect(t.pinnedIp).toBe("8.8.8.8");
  });

  it("rejects a private IP literal", async () => {
    await expect(resolveSafeHost("192.168.0.10")).rejects.toThrow();
  });
});

describe("assertSafeHttpUrl", () => {
  it("rejects http when not allowed", async () => {
    await expect(assertSafeHttpUrl("http://8.8.8.8/")).rejects.toThrow();
  });

  it("rejects a loopback https url", async () => {
    await expect(assertSafeHttpUrl("https://127.0.0.1/")).rejects.toThrow();
  });
});
