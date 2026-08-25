import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: number;
      role: "user" | "admin";
      tokenType: "access" | "refresh";
      issuedAt: number;
      jti?: string;
    };
    user: {
      id: number;
      role: "user" | "admin";
      tokenType: "access" | "refresh";
      issuedAt: number;
      jti?: string;
    };
  }
}
