import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { EnvelopeCrypto, EnvKeyProvider, credentialAad } from "./crypto";

const kekB64 = randomBytes(32).toString("base64");
const crypto = new EnvelopeCrypto(new EnvKeyProvider(kekB64, "kek-1"));

describe("EnvelopeCrypto", () => {
  it("round-trips a secret bound to its AAD", () => {
    const aad = credentialAad("tenant-A", "integration-1");
    const blob = crypto.encrypt("imap-password-123", aad);
    expect(blob.kekId).toBe("kek-1");
    expect(blob.ciphertext).not.toContain("imap-password");
    expect(crypto.decrypt(blob, aad)).toBe("imap-password-123");
  });

  it("fails to decrypt when AAD (tenant/integration) differs", () => {
    const blob = crypto.encrypt("secret", credentialAad("tenant-A", "integration-1"));
    expect(() => crypto.decrypt(blob, credentialAad("tenant-B", "integration-1"))).toThrow();
  });

  it("rejects a KEK that is not 32 bytes", () => {
    expect(() => new EnvKeyProvider(Buffer.from("short").toString("base64"), "k")).toThrow();
  });
});
