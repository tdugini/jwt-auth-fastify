import { FastifyInstance } from "fastify";
import { authenticateAccessToken } from "../auth/guard";
import { Role, users } from "../db/mockDB";
import { revokeUserRefreshTokens } from "../auth/tokens";

const roles: Role[] = ["user", "admin"];

export async function userRoutes(app: FastifyInstance) {
  app.get("/protected", async (request, reply) => {
    const user = await authenticateAccessToken(request, reply);
    if (!user) return;

    return { hello: "world" };
  });

  app.get("/me", async (request, reply) => {
    const user = await authenticateAccessToken(request, reply);
    if (!user) return;

    return { id: user.id, email: user.email, role: user.role };
  });

  app.post("/change-role", async (request, reply) => {
    const requester = await authenticateAccessToken(request, reply);
    if (!requester) return;

    if (requester.role !== "admin") {
      return reply.status(403).send({ error: "Admin role required" });
    }

    const body = request.body as Partial<{ userId: number; role: Role }>;
    if (
      typeof body.userId !== "number" ||
      !body.role ||
      !roles.includes(body.role)
    ) {
      return reply.status(400).send({ error: "Valid userId and role are required" });
    }

    const user = users.find((candidate) => candidate.id === body.userId);
    if (!user) return reply.status(404).send({ error: "User not found" });

    user.role = body.role;
    user.tokensRevokedAt = Date.now();
    revokeUserRefreshTokens(user.id);

    return { message: "Role updated and existing sessions revoked" };
  });
}
