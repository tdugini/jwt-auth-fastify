import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { refreshTokens, revokedJtis, User } from "../db/mockDB";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AccessTokenClaims = {
  id: number;
  role: User["role"];
  tokenType: "access";
  issuedAt: number;
};

export type RefreshTokenClaims = {
  id: number;
  role: User["role"];
  tokenType: "refresh";
  issuedAt: number;
  jti: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export function issueTokenPair(app: FastifyInstance, user: User): TokenPair {
  const issuedAt = Math.max(Date.now(), user.tokensRevokedAt + 1);
  const jti = randomUUID();

  refreshTokens.push({
    jti,
    userId: user.id,
    issuedAt,
    expiresAt: issuedAt + REFRESH_TOKEN_TTL_MS,
  });

  const accessToken = app.jwt.sign(
    {
      id: user.id,
      role: user.role,
      tokenType: "access",
      issuedAt,
    } satisfies AccessTokenClaims,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const refreshToken = app.jwt.sign(
    {
      id: user.id,
      role: user.role,
      tokenType: "refresh",
      issuedAt,
      jti,
    } satisfies RefreshTokenClaims,
    { expiresIn: REFRESH_TOKEN_TTL },
  );

  return { accessToken, refreshToken };
}

export function getRefreshTokenRecord(jti: string) {
  return refreshTokens.find((token) => token.jti === jti);
}

export function revokeRefreshToken(jti: string) {
  const index = refreshTokens.findIndex((token) => token.jti === jti);
  if (index !== -1) refreshTokens.splice(index, 1);
  revokedJtis.add(jti);
}

export function revokeUserRefreshTokens(userId: number, before = Infinity) {
  for (let index = refreshTokens.length - 1; index >= 0; index -= 1) {
    const token = refreshTokens[index];
    if (token.userId === userId && token.issuedAt < before) {
      revokedJtis.add(token.jti);
      refreshTokens.splice(index, 1);
    }
  }
}
