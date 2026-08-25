import fastifyJwt from "@fastify/jwt";
import { FastifyInstance } from "fastify";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";

export type BuildAppOptions = {
  jwtSecret?: string;
};

export default async function buildApp(
  app: FastifyInstance,
  options: BuildAppOptions = {},
) {
  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  await app.register(fastifyJwt, { secret: jwtSecret });
  await app.register(authRoutes);
  await app.register(userRoutes);
}
