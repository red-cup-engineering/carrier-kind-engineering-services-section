// A real SPARQL 1.1 query against the Group's ontology served by Oxigraph. The binary is found by
// OXIGRAPH_BIN or on PATH (`cargo install oxigraph-cli`); with none, the test fails rather than skips.
// ONTOLOGY_JSONLD points the second test at the full glossary file.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadOntology, pinContext, serveOntology } from "../src/writing/sparql/ontology.mjs";
import { sparqlProtocolQuery, sparqlQueryTool, sparqlRows } from "../src/writing/sparql/endpoint.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const oxigraph = process.env.OXIGRAPH_BIN ?? "oxigraph";
const SKOS = "http://www.w3.org/2004/02/skos/core#";

test("pinContext replaces only the remote schema.org context", () => {
  const pinned = pinContext({ "@context": ["https://schema.org", { skos: SKOS }], "@graph": [] });
  assert.deepEqual(pinned["@context"], [{ "@vocab": "https://schema.org/" }, { skos: SKOS }]);
});

describe("the ontology endpoint", () => {
  const work = mkdtempSync(join(tmpdir(), "ontology-test-"));
  let served;
  before(async () => {
    loadOntology({ oxigraph, location: join(work, "store"), jsonld: join(here, "fixtures/skos-sample.jsonld") });
    served = await serveOntology({ oxigraph, location: join(work, "store"), bind: "127.0.0.1:17878" });
  });
  after(() => { served?.child.kill(); rmSync(work, { recursive: true, force: true }); });

  test("SELECT returns the preferred label of a known term", async () => {
    const result = await sparqlProtocolQuery(served.endpoint, `PREFIX skos: <${SKOS}> SELECT ?label WHERE { ?c skos:prefLabel ?label ; skos:notation "17th-century-ce" }`);
    assert.deepEqual(sparqlRows(result), [{ label: "17th Century CE" }]);
  });

  test("the sparql_query tool answers a query and the endpoint refuses an update", async () => {
    const tool = sparqlQueryTool({ endpoint: served.endpoint });
    const answer = await tool.handler({ query: `PREFIX skos: <${SKOS}> SELECT (COUNT(?c) AS ?n) WHERE { ?c a skos:Concept }` });
    assert.deepEqual(answer.rows, [{ n: "1" }]);
    const update = await fetch(served.endpoint.replace("/query", "/update"), { method: "POST", headers: { "content-type": "application/sparql-update" }, body: "CLEAR ALL" });
    assert.notEqual(update.status, 200);
  });
});

test("the full glossary loads and answers when ONTOLOGY_JSONLD is set", { skip: !process.env.ONTOLOGY_JSONLD || !existsSync(process.env.ONTOLOGY_JSONLD) }, async () => {
  const work = mkdtempSync(join(tmpdir(), "ontology-full-"));
  loadOntology({ oxigraph, location: join(work, "store"), jsonld: process.env.ONTOLOGY_JSONLD });
  const served = await serveOntology({ oxigraph, location: join(work, "store"), bind: "127.0.0.1:17879" });
  try {
    const result = await sparqlProtocolQuery(served.endpoint, `PREFIX skos: <${SKOS}> SELECT (COUNT(?c) AS ?n) WHERE { ?c a skos:Concept }`);
    assert.ok(Number(sparqlRows(result)[0].n) > 100);
  } finally { served.child.kill(); rmSync(work, { recursive: true, force: true }); }
});
