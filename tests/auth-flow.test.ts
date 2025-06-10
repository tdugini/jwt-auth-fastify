import { test } from "tap";
import Fastify from "fastify";
import { fetch } from "undici";
import buildApp from "../src/server";
import { resetMockData } from "../src/db/mockDB";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

type RefreshResponse = {
  accessToken: string;
};

const baseUrl = "http://localhost:3000";

async function loginUser(): Promise<LoginResponse> {
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    body: JSON.stringify({
      email: "test@example.com",
      password: "password123",
    }),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  return (await response.json()) as LoginResponse;
}

test("Auth flow end-to-end", async (t) => {
  const app = Fastify();
  await buildApp(app);
  await app.listen({ port: 3000 });
  t.teardown(() => app.close());

  t.test("login e accesso protetto", async (t) => {
    resetMockData();
    const { accessToken } = await loginUser();

    const protectedResponse = await fetch(`${baseUrl}/protected`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    t.equal(protectedResponse.status, 200);
    const json = await protectedResponse.json();
    t.same(json, { hello: "world" });
  });

  t.test("refresh token e logout", async (t) => {
    resetMockData();
    const { refreshToken } = await loginUser();

    const refreshResp = await fetch(`${baseUrl}/refresh`, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      headers: { "Content-Type": "application/json" },
    });

    t.equal(refreshResp.status, 200);
    const { accessToken } = (await refreshResp.json()) as RefreshResponse;
    t.ok(accessToken, "Nuovo accessToken generato");

    const logoutResp = await fetch(`${baseUrl}/logout`, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      headers: { "Content-Type": "application/json" },
    });

    t.equal(logoutResp.status, 200);
  });

  t.test("cambio password revoca i token", async (t) => {
    resetMockData();
    const { accessToken } = await loginUser();

    const changeResp = await fetch(`${baseUrl}/change-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword: "newpass" }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    t.equal(changeResp.status, 200);

    const accessResp = await fetch(`${baseUrl}/protected`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    t.equal(accessResp.status, 401);
  });
  t.test("revoca globale dei token", async (t) => {
    resetMockData();
    const { accessToken } = await loginUser();

    const revokeResp = await fetch(`${baseUrl}/revoke-before`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timestamp: Date.now() + 1000 }),
    });

    t.equal(revokeResp.status, 200);

    const protectedResp = await fetch(`${baseUrl}/protected`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    t.equal(protectedResp.status, 401);
  });

  t.test("cambio ruolo utente", async (t) => {
    resetMockData();
    const { accessToken } = await loginUser();

    const roleChangeResp = await fetch(`${baseUrl}/change-role`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "admin" }),
    });

    t.equal(roleChangeResp.status, 200);

    const checkResp = await fetch(`${baseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await checkResp.json()) as { role: string };
    t.equal(data.role, "admin");
  });
});
