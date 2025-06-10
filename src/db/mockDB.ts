export type User = {
  id: number;
  email: string;
  password: string;
  role: string;
  tokensRevokedAt: number;
};

export const users: User[] = [
  {
    id: 1,
    email: "test@example.com",
    password: "password123",
    role: "user",
    tokensRevokedAt: 0,
  },
];

type RefreshToken = {
  jti: string;
  userId: number;
  issuedAt: number;
  expiresAt: number;
};

export const refreshTokens: RefreshToken[] = [];

export const revokedJtis = new Set<string>();

export function resetMockData() {
  users.length = 0;
  users.push({
    id: 1,
    email: "test@example.com",
    password: "password123",
    role: "user",
    tokensRevokedAt: 0,
  });

  refreshTokens.length = 0;
  revokedJtis.clear();
}
