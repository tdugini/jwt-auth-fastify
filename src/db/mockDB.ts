import { hashPassword, PasswordDigest } from "../security/password";

export type Role = "user" | "admin";

export type User = {
  id: number;
  email: string;
  password: PasswordDigest;
  role: Role;
  tokensRevokedAt: number;
};

export type RefreshTokenRecord = {
  jti: string;
  userId: number;
  issuedAt: number;
  expiresAt: number;
};

export const users: User[] = [];
export const refreshTokens: RefreshTokenRecord[] = [];
export const revokedJtis = new Set<string>();

function seedUsers() {
  users.push(
    {
      id: 1,
      email: "test@example.com",
      password: hashPassword("password123"),
      role: "user",
      tokensRevokedAt: 0,
    },
    {
      id: 2,
      email: "admin@example.com",
      password: hashPassword("admin123"),
      role: "admin",
      tokensRevokedAt: 0,
    },
  );
}

export function resetMockData() {
  users.length = 0;
  refreshTokens.length = 0;
  revokedJtis.clear();
  seedUsers();
}

resetMockData();
