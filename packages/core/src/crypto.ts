import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
  createHash,
} from "node:crypto";

/**
 * Envelope encryption for credentials at rest (IMAP/SMTP/ERP/AI secrets).
 *
 *   plaintext --AES-256-GCM(DEK, aad)--> ciphertext
 *   DEK       --AES-256-GCM(KEK, kekId)--> dekWrapped
 *
 * - A fresh random DEK per secret; only the DEK is wrapped by the KEK.
 * - `aad` binds the ciphertext to (tenantId || integrationId): a blob copied to
 *   another tenant/integration row fails authentication and will not decrypt.
 * - KEK lives only in api/worker env (Phase 1). `KeyProvider` upgrades to KMS.
 */

export interface EncryptedBlob {
  ciphertext: string; // base64
  iv: string; // base64 (12 bytes, data GCM nonce)
  authTag: string; // base64 (16 bytes, data GCM tag)
  dekWrapped: string; // base64 ([wrapIv(12) | wrapTag(16) | wrappedDek(32)])
  kekId: string;
}

/** Source of key-encryption-keys. Phase 1 = env; later = KMS. */
export interface KeyProvider {
  getActiveKek(): { id: string; key: Buffer };
  getKekById(id: string): Buffer | null;
}

/** Reads the KEK from APP_ENCRYPTION_KEY (base64, 32 bytes). */
export class EnvKeyProvider implements KeyProvider {
  private readonly id: string;
  private readonly key: Buffer;

  constructor(base64Key: string, keyId: string) {
    const key = Buffer.from(base64Key, "base64");
    if (key.length !== 32) {
      throw new Error("APP_ENCRYPTION_KEY must decode to exactly 32 bytes (base64).");
    }
    this.key = key;
    this.id = keyId;
  }

  getActiveKek() {
    return { id: this.id, key: this.key };
  }

  getKekById(id: string): Buffer | null {
    return id === this.id ? this.key : null;
  }
}

export class EnvelopeCrypto {
  constructor(private readonly keys: KeyProvider) {}

  encrypt(plaintext: string, aad: string): EncryptedBlob {
    const dek = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dek, iv);
    cipher.setAAD(Buffer.from(aad, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const { id: kekId, key: kek } = this.keys.getActiveKek();
    const wrapIv = randomBytes(12);
    const wrapCipher = createCipheriv("aes-256-gcm", kek, wrapIv);
    wrapCipher.setAAD(Buffer.from(kekId, "utf8"));
    const wrappedDek = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]);
    const wrapTag = wrapCipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      dekWrapped: Buffer.concat([wrapIv, wrapTag, wrappedDek]).toString("base64"),
      kekId,
    };
  }

  decrypt(blob: EncryptedBlob, aad: string): string {
    const kek = this.keys.getKekById(blob.kekId);
    if (!kek) throw new Error(`Unknown KEK id: ${blob.kekId}`);

    const wrapBuf = Buffer.from(blob.dekWrapped, "base64");
    const wrapIv = wrapBuf.subarray(0, 12);
    const wrapTag = wrapBuf.subarray(12, 28);
    const wrappedDek = wrapBuf.subarray(28);
    const unwrap = createDecipheriv("aes-256-gcm", kek, wrapIv);
    unwrap.setAAD(Buffer.from(blob.kekId, "utf8"));
    unwrap.setAuthTag(wrapTag);
    const dek = Buffer.concat([unwrap.update(wrappedDek), unwrap.final()]);

    const decipher = createDecipheriv("aes-256-gcm", dek, Buffer.from(blob.iv, "base64"));
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(blob.ciphertext, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }
}

/** Build the AAD that binds a credential blob to its owning row. */
export function credentialAad(tenantId: string, integrationId: string): string {
  return `${tenantId}|${integrationId}`;
}

/** SHA-256 hex — for opaque-token/message-id lookups (NOT for passwords). */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time string compare for tokens. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
