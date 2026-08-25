import { FastifyReply, FastifyRequest } from "fastify";
import { users, User } from "../db/mockDB";

export async function authenticateAccessToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<User | null> {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
    return null;
  }

  const claims = request.user;
  if (claims.tokenType !== "access") {
    reply.status(401).send({ error: "Invalid token type" });
    return null;
  }

  const user = users.find((candidate) => candidate.id === claims.id);
  if (!user || claims.issuedAt <= user.tokensRevokedAt) {
    reply.status(401).send({ error: "Token has been revoked" });
    return null;
  }

  return user;
}
