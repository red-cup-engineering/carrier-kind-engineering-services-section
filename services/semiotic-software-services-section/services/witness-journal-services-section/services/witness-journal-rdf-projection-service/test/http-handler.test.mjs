import assert from "node:assert/strict";
import test from "node:test";

import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";
import { createWitnessJournalRdfHandler } from "../src/http-handler.mjs";

const manifest = makeNiUri(Buffer.from("SEAVT RDF capability manifest", "utf8"));
const graph = makeNiUri(Buffer.from("prior apex", "utf8"));
const handler = createWitnessJournalRdfHandler({ manifest });
const row = {
  e: "order.payment",
  a: "payment:receipt",
  v: "receipt-delay",
  t: "2026-08-02T00:00:00.000Z",
};

function invoke(body) {
  return handler(new Request("https://witness.example/invoke", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

test("HTTP health binds the deployed actuator to its capability manifest", async () => {
  const response = await handler(new Request("https://witness.example/health"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-capability-manifest"), manifest);
  assert.deepEqual(await response.json(), { ok: true, manifest });
});

test("HTTP invoke carries source readout beside the next opaque apex and exact bytes", async () => {
  const response = await invoke({ graph, row });
  const projection = await response.json();
  assert.equal(response.status, 200);
  assert.equal(projection.graph, graph);
  assert.equal(projection.token, "ni:///sha-256;Fu40zEnjxbX5Sv7OzxkcwB1a9Jt6vrEBl31jzuXSenk");
  assert.equal(Buffer.from(projection.bytes, "base64").toString("utf8"), projection.canonicalNQuads);
  assert.equal(projection.source.e.surface, row.e);
});

test("HTTP invoke refuses non-SEAVT rows and ambiguous carriers", async () => {
  const invalid = await invoke({ graph, row: { e: "subject", a: { arbitrary: true }, v: 4, t: "t" } });
  assert.equal(invalid.status, 422);

  const ambiguous = await invoke({ graph, row, extra: true });
  assert.equal(ambiguous.status, 400);
  assert.equal((await ambiguous.json()).error, "exactly-graph-and-row-are-required");
});
