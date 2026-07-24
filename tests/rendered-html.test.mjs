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

async function waitForApplication(url, authorization, server, serverOutput) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited early.\n${serverOutput.join("")}`);
    }
    try {
      const response = await fetch(url, {
        headers: { authorization },
      });
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
  const authorization = `Basic ${Buffer.from(
    `${testUsername}:${testPassword}`,
  ).toString("base64")}`;
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

  const response = await waitForApplication(
    `http://127.0.0.1:${port}/`,
    authorization,
    server,
    output,
  );
  const unauthenticated = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(unauthenticated.status, 401);
  assert.match(
    unauthenticated.headers.get("www-authenticate") ?? "",
    /^Basic\b/i,
  );
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
});
