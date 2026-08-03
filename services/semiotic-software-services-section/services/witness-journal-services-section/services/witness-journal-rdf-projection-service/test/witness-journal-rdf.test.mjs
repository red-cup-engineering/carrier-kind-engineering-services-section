import assert from "node:assert/strict";
import test from "node:test";

import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";
import { seavt } from "@red-cup-engineering/witness-journal-entry-service";
import { projectSeavtRdf, verifySeavtRdfProjection } from "../src/witness-journal-rdf.mjs";

test("projects addressed SEAVT predication and stored T into one canonical named graph", async () => {
  const graph = makeNiUri(Buffer.from("prior apex", "utf8"));
  const row = seavt("order.payment", "payment:receipt", "receipt-delay", "2026-08-02T00:00:00.000Z");
  const projection = await projectSeavtRdf(row, { graph });

  assert.equal(projection.graph, graph);
  assert.equal(projection.statementCount, 2);
  assert.equal(projection.source.e.surface, row.e);
  assert.match(projection.canonicalNQuads, new RegExp(`<${projection.source.e.token}> <${projection.source.a.token}> <${projection.source.v.token}> <${graph}> \\.`));
  assert.match(projection.canonicalNQuads, /urn:emsenn:witness-journal:time/u);
  assert.equal(await verifySeavtRdfProjection(projection), true);
  assert.equal(projection.token, "ni:///sha-256;Fu40zEnjxbX5Sv7OzxkcwB1a9Jt6vrEBl31jzuXSenk");
});

test("projection changes when punctuation or stored time changes", async () => {
  const graph = makeNiUri(Buffer.from("prior apex", "utf8"));
  const generated = await projectSeavtRdf(seavt("order.payment", "payment:receipt", "receipt-delay", "t1"), { graph });
  const witnessed = await projectSeavtRdf(seavt("order:payment", "payment:receipt", "receipt-delay", "t1"), { graph });
  const later = await projectSeavtRdf(seavt("order.payment", "payment:receipt", "receipt-delay", "t2"), { graph });

  assert.notEqual(generated.token, witnessed.token);
  assert.notEqual(generated.token, later.token);
});

test("refuses a noncanonical or non-NI prior apex and generic EAVT", async () => {
  await assert.rejects(() => projectSeavtRdf({ e: "subject", a: { arbitrary: true }, v: 4, t: "t" }, {
    graph: makeNiUri(Buffer.from("prior apex", "utf8")),
  }), /SEAVT row/);
  await assert.rejects(
    () => projectSeavtRdf(seavt("order.payment", "payment:receipt", "receipt-delay", "t"), { graph: "urn:not-ni" }),
    (error) => error instanceof TypeError && error.code === "invalid-witness-graph",
  );
});

test("verification refuses token, byte, source, or prior-apex drift", async () => {
  const graph = makeNiUri(Buffer.from("prior apex", "utf8"));
  const projection = await projectSeavtRdf(seavt("order.payment", "payment:receipt", "receipt-delay", "t"), { graph });
  assert.equal(await verifySeavtRdfProjection({ ...projection, token: graph }), false);
  assert.equal(await verifySeavtRdfProjection({ ...projection, canonicalNQuads: `${projection.canonicalNQuads} ` }), false);
  assert.equal(await verifySeavtRdfProjection({
    ...projection,
    source: { ...projection.source, e: { ...projection.source.e, surface: "order:payment" } },
  }), false);
  assert.equal(await verifySeavtRdfProjection({
    ...projection,
    graph: makeNiUri(Buffer.from("different prior apex", "utf8")),
  }), false);
});
