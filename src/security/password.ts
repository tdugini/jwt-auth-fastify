import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export type PasswordDigest = {
  salt: string;
  hash: string;
};

export function hashPassword(password: string): PasswordDigest {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return { salt, hash };
}

export function verifyPassword(
  password: string,
  digest: PasswordDigest,
): boolean {
  const candidate = scryptSync(password, digest.salt, KEY_LENGTH);
  const stored = Buffer.from(digest.hash, "hex");

  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}
