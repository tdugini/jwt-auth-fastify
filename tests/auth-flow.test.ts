import Fastify, { FastifyInstance } from "fastify";
import { test } from "tap";
import buildApp from "../src/server";
import { resetMockData } from "../src/db/mockDB";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

async function createApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await buildApp(app, { jwtSecret: "test-secret-that-is-not-used-in-production" });
  await app.ready();
  return app;
}

async function login(
  app: FastifyInstance,
  email = "test@example.com",
  password = "password123",
): Promise<TokenPair> {
  const response = await app.inject({
    method: "POST",
    url: "/login",
    payload: { email, password },
  });

  if (response.statusCode !== 200) {
    throw new Error(`Login failed with status ${response.statusCode}`);
  }

  return response.json<TokenPair>();
}

test("JWT authentication flow", async (t) => {
  const app = await createApp();
  t.teardown(() => app.close());

  t.beforeEach(() => resetMockData());

  await t.test("logs in and accesses a protected route", async (t) => {
    const { accessToken } = await login(app);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    t.equal(response.statusCode, 200);
    t.same(response.json(), { hello: "world" });
  });

  await t.test("rejects invalid credentials", async (t) => {
    const response = await app.inject({
      method: "POST",
      url: "/login",
      payload: { email: "test@example.com", password: "wrong-password" },
    });

    t.equal(response.statusCode, 401);
  });

  await t.test("rotates refresh tokens", async (t) => {
    const { refreshToken } = await login(app);

    const firstRefresh = await app.inject({
      method: "POST",
      url: "/refresh",
      payload: { refreshToken },
    });

    t.equal(firstRefresh.statusCode, 200);
    const rotated = firstRefresh.json<TokenPair>();
    t.ok(rotated.accessToken);
    t.ok(rotated.refreshToken);

    const reusedToken = await app.inject({
      method: "POST",
      url: "/refresh",
      payload: { refreshToken },
    });

    t.equal(reusedToken.statusCode, 401);
  });

  await t.test("revokes a refresh token on logout", async (t) => {
    const { refreshToken } = await login(app);

    const logout = await app.inject({
      method: "POST",
      url: "/logout",
      payload: { refreshToken },
    });
    t.equal(logout.statusCode, 200);

    const refresh = await app.inject({
      method: "POST",
      url: "/refresh",
      payload: { refreshToken },
    });
    t.equal(refresh.statusCode, 401);
  });

  await t.test("changing a password revokes existing sessions", async (t) => {
    const { accessToken, refreshToken } = await login(app);

    const change = await app.inject({
      method: "POST",
      url: "/change-password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: "password123",
        newPassword: "a-new-secure-password",
      },
    });
    t.equal(change.statusCode, 200);

    const oldAccess = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    t.equal(oldAccess.statusCode, 401);

    const oldRefresh = await app.inject({
      method: "POST",
      url: "/refresh",
      payload: { refreshToken },
    });
    t.equal(oldRefresh.statusCode, 401);

    const oldPassword = await app.inject({
      method: "POST",
      url: "/login",
      payload: { email: "test@example.com", password: "password123" },
    });
    t.equal(oldPassword.statusCode, 401);

    const newPassword = await app.inject({
      method: "POST",
      url: "/login",
      payload: {
        email: "test@example.com",
        password: "a-new-secure-password",
      },
    });
    t.equal(newPassword.statusCode, 200);
  });

  await t.test("revokes sessions issued before a timestamp", async (t) => {
    const { accessToken } = await login(app);
    await new Promise((resolve) => setTimeout(resolve, 5));

    const revoke = await app.inject({
      method: "POST",
      url: "/revoke-before",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { timestamp: Date.now() },
    });
    t.equal(revoke.statusCode, 200);

    const protectedResponse = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    t.equal(protectedResponse.statusCode, 401);
  });

  await t.test("requires admin privileges to change roles", async (t) => {
    const userTokens = await login(app);

    const forbidden = await app.inject({
      method: "POST",
      url: "/change-role",
      headers: { authorization: `Bearer ${userTokens.accessToken}` },
      payload: { userId: 1, role: "admin" },
    });
    t.equal(forbidden.statusCode, 403);

    const adminTokens = await login(app, "admin@example.com", "admin123");
    const update = await app.inject({
      method: "POST",
      url: "/change-role",
      headers: { authorization: `Bearer ${adminTokens.accessToken}` },
      payload: { userId: 1, role: "admin" },
    });
    t.equal(update.statusCode, 200);

    const staleToken = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${userTokens.accessToken}` },
    });
    t.equal(staleToken.statusCode, 401);

    const freshTokens = await login(app);
    const me = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${freshTokens.accessToken}` },
    });
    t.equal(me.statusCode, 200);
    t.equal(me.json<{ role: string }>().role, "admin");
  });
});
