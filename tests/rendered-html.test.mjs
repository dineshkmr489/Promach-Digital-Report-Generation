import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: {
        accept: "text/html",
        "oai-authenticated-user-email": "admin@promach.test",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Promach operational workspace with verified seed records", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Promach DSR \| Digital Service Reports<\/title>/i);
  assert.match(html, /Service reporting, end to end/i);
  assert.match(html, /Changi General Hospital/i);
  assert.match(html, /Tuas Power Generation/i);
  assert.match(html, /Create report/i);
  assert.match(html, /Master data/i);
  assert.doesNotMatch(html, /Northpoint City|Sentosa Cove|SR-2026-0084/i);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /react-loading-skeleton/i);
});
