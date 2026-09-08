import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id password hashing. Parameters follow OWASP guidance (m≈19MiB, t=2,
 * p=1). @node-rs/argon2 ships prebuilt binaries (no node-gyp at install).
 */
const OPTIONS = {
  memoryCost: 19_456, // KiB (~19 MiB)
  timeCost: 2,
  parallelism: 1,
  algorithm: 2, // 2 = Argon2id
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hashString: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashString, plain);
  } catch {
    return false;
  }
}
