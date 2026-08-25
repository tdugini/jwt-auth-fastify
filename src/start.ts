import Fastify from "fastify";
import buildApp from "./server";

async function start() {
  const app = Fastify({ logger: true });
  await buildApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
