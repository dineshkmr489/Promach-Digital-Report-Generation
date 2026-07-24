import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { resolve } from "node:path";
import test from "node:test";

async function availablePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolveClose) => listener.close(resolveClose));
  return port;
}

async function waitForApplication(url, server, serverOutput) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited early.\n${serverOutput.join("")}`);
    }
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Next.js did not become ready.\n${serverOutput.join("")}`);
}

test("server renders the MongoDB-backed Promach workspace", async (context) => {
  const port = await availablePort();
  const output = [];
  const testUsername = "test-admin";
  const testPassword = "test-password-not-for-production";
  const server = spawn(
    process.execPath,
    [resolve("scripts/start.mjs")],
    {
      cwd: resolve("."),
      env: {
        ...process.env,
        ADMIN_USERNAME: testUsername,
        ADMIN_PASSWORD: testPassword,
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => output.push(chunk.toString()));
  server.stderr.on("data", (chunk) => output.push(chunk.toString()));
  context.after(() => server.kill());

  const baseUrl = `http://127.0.0.1:${port}`;
  const loginPage = await waitForApplication(
    `${baseUrl}/login`,
    server,
    output,
  );
  assert.equal(loginPage.status, 200);
  const loginHtml = await loginPage.text();
  assert.match(loginHtml, /Welcome back/i);
  assert.match(loginHtml, /Promach administration/i);
  assert.doesNotMatch(loginHtml, /www-authenticate/i);

  const unauthenticated = await fetch(`${baseUrl}/`, {
    redirect: "manual",
  });
  assert.match(String(unauthenticated.status), /^30[2378]$/);
  assert.match(
    unauthenticated.headers.get("location") ?? "",
    /\/login(?:\?|$)/,
  );

  const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({
      username: testUsername,
      password: "incorrect-password",
    }),
  });
  assert.equal(invalidLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
    }),
  });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /^promach_admin_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  const sessionCookie = setCookie.split(";")[0];

  const response = await fetch(`${baseUrl}/`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Promach DSR \| Digital Service Reports<\/title>/i);
  assert.match(html, /Service reporting, end to end/i);
  assert.match(html, /Changi General Hospital/i);
  assert.match(html, /Tuas Power Generation/i);
  assert.match(html, /Create report/i);
  assert.match(html, /Master data/i);
  assert.doesNotMatch(html, /Operational workspace/i);
  assert.doesNotMatch(html, /Create one\. Sign anywhere\./i);
  assert.doesNotMatch(html, /Source documents/i);
  assert.doesNotMatch(html, /Retry sync/i);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      cookie: sessionCookie,
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: "{}",
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);
});
