import { FastifyInstance, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { refreshTokens, revokedJtis, users } from "./db/mockDB";
import crypto from "crypto";

export default async function buildApp(app: FastifyInstance) {
  app.register(fastifyJwt, { secret: "supersecret" });

  function getUser(req: FastifyRequest) {
    return req.user as { id: number; role: string; iat: number };
  }

  function generateJti(): string {
    return crypto.randomUUID();
  }

  app.post("/login", async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = users.find(
      (u) => u.email === email && u.password === password
    );
    if (!user) return reply.status(401).send({ error: "Invalid credentials" });

    const jti = generateJti();
    const now = Date.now();
    const refreshExpires = now + 7 * 24 * 60 * 60 * 1000;

    refreshTokens.push({
      jti,
      userId: user.id,
      issuedAt: now,
      expiresAt: refreshExpires,
    });

    const accessToken = app.jwt.sign(
      { id: user.id, role: user.role },
      { expiresIn: "15m" }
    );
    const refreshToken = app.jwt.sign(
      { id: user.id, role: user.role, jti },
      { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
  });

  app.get(
    "/protected",
    {
      preHandler: async (req, reply) => {
        try {
          await req.jwtVerify();
          const user = users.find((u) => u.id === getUser(req).id);
          if (!user || getUser(req).iat * 1000 < user.tokensRevokedAt)
            return reply.status(401).send({ error: "Token has been revoked" });
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
    },
    async () => ({ hello: "world" })
  );

  app.post(
    "/change-password",
    {
      preHandler: async (req, reply) => {
        try {
          await req.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
    },
    async (req, reply) => {
      const { newPassword } = req.body as { newPassword: string };
      const user = users.find((u) => u.id === getUser(req).id);
      if (!user) return reply.status(404).send({ error: "User not found" });

      user.password = newPassword;
      user.tokensRevokedAt = Date.now();

      return { message: "Password changed and tokens revoked" };
    }
  );

  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string };

    try {
      const decoded = app.jwt.verify(refreshToken) as {
        id: number;
        role: string;
        jti: string;
      };
      if (revokedJtis.has(decoded.jti))
        return reply.status(401).send({ error: "Token revoked" });

      const user = users.find((u) => u.id === decoded.id);
      if (!user) return reply.status(404).send({ error: "User not found" });

      const newAccessToken = app.jwt.sign(
        { id: user.id, role: user.role },
        { expiresIn: "15m" }
      );

      return { accessToken: newAccessToken };
    } catch {
      return reply.status(401).send({ error: "Invalid token" });
    }
  });

  app.post("/logout", async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string };

    try {
      const decoded = app.jwt.verify(refreshToken) as { jti: string };
      revokedJtis.add(decoded.jti);
      return { message: "Refresh token revoked" };
    } catch {
      return reply.status(401).send({ error: "Invalid token" });
    }
  });

  app.post(
    "/revoke-before",
    {
      preHandler: async (req, reply) => {
        try {
          await req.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
    },
    async (req, reply) => {
      const { timestamp } = req.body as { timestamp: number };
      const user = users.find((u) => u.id === getUser(req).id);
      if (!user) return reply.status(404).send({ error: "User not found" });

      user.tokensRevokedAt = timestamp;
      return { message: "All tokens revoked before timestamp" };
    }
  );

  app.post(
    "/change-role",
    {
      preHandler: async (req, reply) => {
        try {
          await req.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
    },
    async (req, reply) => {
      const { role } = req.body as { role: string };
      const user = users.find((u) => u.id === getUser(req).id);
      if (!user) return reply.status(404).send({ error: "User not found" });

      user.role = role;
      return { message: "Role updated" };
    }
  );

  app.get(
    "/me",
    {
      preHandler: async (req, reply) => {
        try {
          await req.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
    },
    async (req) => {
      const user = users.find((u) => u.id === getUser(req).id);
      if (!user) return { error: "User not found" };
      return { id: user.id, email: user.email, role: user.role };
    }
  );
}
