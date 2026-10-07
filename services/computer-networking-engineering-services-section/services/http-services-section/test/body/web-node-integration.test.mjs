// Moved down from computer-web-server (test/http-services-body-integration.test.mjs,
// itself originally extracted from this file's sibling test/body/web.test.mjs):
// the one case that serves a real Node listener to observe portable body-read
// refusals end to end. It needed a running web application and Node
// transport, which now live in this package too, so the extraction that
// motivated moving it out to computer-web-server no longer applies.
import assert from "node:assert/strict";
import test from "node:test";
import * as web from "../../src/body/web.mjs";
import { createWebServer as createWebServerEngine } from "../../src/web-application.mjs";
import { startWebServer } from "../../src/node-server.mjs";

test("portable body refusals remain observable through a real Node listener", async (t) => {
  const engine = createWebServerEngine({
    resources: [
      {
        match: "/",
        methods: ["POST"],
        handler: async (ctx) => {
          try {
            return Response.json(await web.readJsonBody(ctx.request, { maxBytes: 1024 }));
          } catch (error) {
            if (error instanceof web.BodyReadError) return Response.json({ code: error.code }, { status: error.status });
            throw error;
          }
        },
      },
    ],
  });
  const server = await startWebServer(engine, { port: 0, host: "127.0.0.1" });
  t.after(() => server.close());
  await new Promise((resolve) => setTimeout(resolve, 150));
  const url = `http://127.0.0.1:${server.port}/`;
  for (const [body, contentType, status] of [
    ['{"ok":true}', "application/json", 200],
    ["{", "application/json", 400],
    ["{}", "text/plain", 415],
    [JSON.stringify({ text: "x".repeat(65536) }), "application/json", 413],
  ]) {
    const init = { method: "POST", headers: { "content-type": contentType }, body };
    const direct = await engine.fetch(new Request(url, init));
    const remote = await fetch(url, init);
    assert.equal(direct.status, status);
    assert.equal(remote.status, status);
    assert.deepEqual(await remote.json(), await direct.json());
  }
});
