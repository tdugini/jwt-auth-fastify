import { FastifyInstance } from "fastify";
import { refreshTokens, revokedJtis, users } from "../db/mockDB";
import { verifyPassword, hashPassword } from "../security/password";
import { authenticateAccessToken } from "../auth/guard";
import {
  getRefreshTokenRecord,
  issueTokenPair,
  RefreshTokenClaims,
  revokeRefreshToken,
  revokeUserRefreshTokens,
} from "../auth/tokens";

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const body = request.body as Partial<{ email: string; password: string }>;
    if (!body.email || !body.password) {
      return reply.status(400).send({ error: "Email and password are required" });
    }

    const user = users.find((candidate) => candidate.email === body.email);
    if (!user || !verifyPassword(body.password, user.password)) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    return issueTokenPair(app, user);
  });

  app.post("/refresh", async (request, reply) => {
    const { refreshToken } = request.body as Partial<{ refreshToken: string }>;
    if (!refreshToken) {
      return reply.status(400).send({ error: "Refresh token is required" });
    }

    try {
      const claims = app.jwt.verify(refreshToken) as RefreshTokenClaims;
      if (claims.tokenType !== "refresh" || revokedJtis.has(claims.jti)) {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }

      const record = getRefreshTokenRecord(claims.jti);
      if (!record || record.expiresAt <= Date.now()) {
        return reply.status(401).send({ error: "Refresh token is no longer active" });
      }

      const user = users.find((candidate) => candidate.id === claims.id);
      if (!user || record.userId !== user.id || claims.issuedAt < user.tokensRevokedAt) {
        return reply.status(401).send({ error: "Refresh token has been revoked" });
      }

      revokeRefreshToken(claims.jti);
      return issueTokenPair(app, user);
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
  });

  app.post("/logout", async (request, reply) => {
    const { refreshToken } = request.body as Partial<{ refreshToken: string }>;
    if (!refreshToken) {
      return reply.status(400).send({ error: "Refresh token is required" });
    }

    try {
      const claims = app.jwt.verify(refreshToken) as RefreshTokenClaims;
      if (claims.tokenType !== "refresh") {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }

      revokeRefreshToken(claims.jti);
      return { message: "Refresh token revoked" };
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
  });

  app.post("/change-password", async (request, reply) => {
    const user = await authenticateAccessToken(request, reply);
    if (!user) return;

    const body = request.body as Partial<{
      currentPassword: string;
      newPassword: string;
    }>;

    if (!body.currentPassword || !body.newPassword) {
      return reply.status(400).send({
        error: "Current password and new password are required",
      });
    }

    if (!verifyPassword(body.currentPassword, user.password)) {
      return reply.status(401).send({ error: "Current password is incorrect" });
    }

    if (body.newPassword.length < 8) {
      return reply.status(400).send({
        error: "New password must contain at least 8 characters",
      });
    }

    user.password = hashPassword(body.newPassword);
    user.tokensRevokedAt = Date.now();
    revokeUserRefreshTokens(user.id);

    return { message: "Password changed and existing sessions revoked" };
  });

  app.post("/revoke-before", async (request, reply) => {
    const user = await authenticateAccessToken(request, reply);
    if (!user) return;

    const { timestamp } = request.body as Partial<{ timestamp: number }>;
    if (
      typeof timestamp !== "number" ||
      !Number.isFinite(timestamp) ||
      timestamp < 0 ||
      timestamp > Date.now()
    ) {
      return reply.status(400).send({
        error: "Timestamp must be a valid time in the past",
      });
    }

    user.tokensRevokedAt = Math.max(user.tokensRevokedAt, timestamp);
    revokeUserRefreshTokens(user.id, timestamp);

    return { message: "Sessions issued before timestamp revoked" };
  });

  app.get("/sessions", async (request, reply) => {
    const user = await authenticateAccessToken(request, reply);
    if (!user) return;

    return {
      activeRefreshTokens: refreshTokens.filter((token) => token.userId === user.id)
        .length,
    };
  });
}
