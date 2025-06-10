import Fastify from "fastify";
import buildApp from "./server";

const app = Fastify();

buildApp(app).then(() => {
  app.listen({ port: 3000 }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
});
