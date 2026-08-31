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

test("server renders the PostgreSQL-backed Promach workspace", async (context) => {
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
        ADMIN_EMAIL: "test-admin@promach.local",
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
  assert.match(html, /Service operations, in control/i);
  assert.match(html, /Changi General Hospital/i);
  assert.match(html, /Tuas Power Generation/i);
  assert.match(html, /Create report/i);
  assert.match(html, /Master data/i);
  assert.match(html, /Users and roles/i);
  assert.match(html, /Storage utilised/i);
  assert.match(html, /My profile/i);
  assert.match(html, /Administrator/i);
  assert.doesNotMatch(html, /Create one\. Sign anywhere\./i);
  assert.doesNotMatch(html, /Source documents/i);
  assert.doesNotMatch(html, /Retry sync/i);

  const usersResponse = await fetch(`${baseUrl}/api/users`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(usersResponse.status, 200);
  const usersPayload = await usersResponse.json();
  assert.ok(
    usersPayload.users.some((user) => user.username === testUsername),
    "bootstrap administrator should be available through user management",
  );

  const roleAccounts = [
    {
      username: "test-operations-manager",
      password: "test-operations-manager-password",
      name: "Test Operations Manager",
      email: "test-operations-manager@promach.local",
      designation: "Operations Manager",
      role: "Operations Manager",
    },
    {
      username: "test-service-technician",
      password: "test-service-technician-password",
      name: "Test Service Technician",
      email: "test-service-technician@promach.local",
      designation: "Service Technician",
      role: "Service Technician",
    },
    {
      username: "test-viewer",
      password: "test-viewer-password",
      name: "Test Viewer",
      email: "test-viewer@promach.local",
      designation: "Report Viewer",
      role: "Viewer",
    },
  ];
  const createdUsers = [];
  const roleCookies = new Map();

  for (const account of roleAccounts) {
    const createdResponse = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: {
        cookie: sessionCookie,
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({ ...account, phone: "", active: true }),
    });
    assert.equal(createdResponse.status, 201, `${account.role} should be created`);
    const createdPayload = await createdResponse.json();
    const createdUser = createdPayload.users.find(
      (user) => user.username === account.username,
    );
    assert.ok(createdUser, `${account.role} should exist in user management`);
    createdUsers.push(createdUser);

    const roleLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({
        username: account.username,
        password: account.password,
      }),
    });
    assert.equal(roleLogin.status, 200, `${account.role} should sign in`);
    roleCookies.set(
      account.role,
      (roleLogin.headers.get("set-cookie") ?? "").split(";")[0],
    );
  }

  const roleNavigation = {
    "Operations Manager": {
      visible: [/>Field Service \(PDMS\)</i, />Create report</i, />Master data</i],
      hidden: [/>Users and roles</i, />Storage utilised</i],
    },
    "Service Technician": {
      visible: [/>Field Service \(PDMS\)</i, />Create report</i],
      hidden: [/>Master data</i, />Users and roles</i, />Storage utilised</i],
    },
    Viewer: {
      visible: [/>Service reports</i, />My profile</i],
      hidden: [
        />Field Service \(PDMS\)</i,
        />Create report</i,
        />Master data</i,
        />Users and roles</i,
        />Storage utilised</i,
      ],
    },
  };

  for (const [role, expected] of Object.entries(roleNavigation)) {
    const rolePage = await fetch(`${baseUrl}/`, {
      headers: { cookie: roleCookies.get(role) },
    });
    assert.equal(rolePage.status, 200);
    const roleHtml = await rolePage.text();
    for (const pattern of expected.visible) assert.match(roleHtml, pattern);
    for (const pattern of expected.hidden) assert.doesNotMatch(roleHtml, pattern);

    const usersForRole = await fetch(`${baseUrl}/api/users`, {
      headers: { cookie: roleCookies.get(role) },
    });
    assert.equal(usersForRole.status, 403, `${role} must not manage users`);
  }

  for (const role of ["Operations Manager", "Service Technician"]) {
    const reportAttempt = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: {
        cookie: roleCookies.get(role),
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: "{}",
    });
    assert.notEqual(reportAttempt.status, 403, `${role} may operate reports`);
  }

  const viewerReportAttempt = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: {
      cookie: roleCookies.get("Viewer"),
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: "{}",
  });
  assert.equal(viewerReportAttempt.status, 403);

  const managedClientName = `RBAC Test Client ${Date.now()}`;
  const managerMasterCreate = await fetch(`${baseUrl}/api/master/clients`, {
    method: "POST",
    headers: {
      cookie: roleCookies.get("Operations Manager"),
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({
      name: managedClientName,
      contactName: "RBAC Test",
      address: "1 Test Street, Singapore 000001",
    }),
  });
  assert.equal(managerMasterCreate.status, 201);
  const managerWorkspace = await managerMasterCreate.json();
  const managedClient = managerWorkspace.clients.find(
    (client) => client.name === managedClientName,
  );
  assert.ok(managedClient);

  for (const role of ["Service Technician", "Viewer"]) {
    const masterAttempt = await fetch(`${baseUrl}/api/master/clients`, {
      method: "POST",
      headers: {
        cookie: roleCookies.get(role),
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({
        name: `Forbidden ${role}`,
        address: "1 Test Street, Singapore 000001",
      }),
    });
    assert.equal(masterAttempt.status, 403, `${role} must not manage master data`);
  }

  const managerMasterDelete = await fetch(
    `${baseUrl}/api/master/clients/${encodeURIComponent(managedClient.id)}`,
    {
      method: "DELETE",
      headers: {
        cookie: roleCookies.get("Operations Manager"),
        origin: baseUrl,
      },
    },
  );
  assert.equal(managerMasterDelete.status, 200);

  const profileUpdate = await fetch(`${baseUrl}/api/profile`, {
    method: "PUT",
    headers: {
      cookie: roleCookies.get("Viewer"),
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({
      name: "Test Viewer Updated",
      email: "test-viewer@promach.local",
      phone: "+65 6000 0000",
      designation: "Authorised Report Viewer",
    }),
  });
  assert.equal(profileUpdate.status, 200);

  for (const createdUser of createdUsers) {
    const deleteUserResponse = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent(createdUser.id)}`,
      {
        method: "DELETE",
        headers: {
          cookie: sessionCookie,
          origin: baseUrl,
        },
      },
    );
    assert.equal(deleteUserResponse.status, 200);
  }

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
