/**
 * writing/sparql/ontology — the Group's SKOS and JSON-LD glossary as a graph a SPARQL 1.1 Protocol
 * endpoint serves.
 *
 * The glossary file (`data/records/knowledge/glossary/skos/public.jsonld` in
 * 561-group-services-section) names `https://schema.org` as a remote context. JSON-LD 1.1 allows a
 * processor to answer a remote context from a pinned copy, and Oxigraph has no network loader, so
 * the context is pinned here: every schema.org term the file uses (name, description, termCode,
 * inDefinedTermSet, DefinedTerm, DefinedTermSet) is an `@vocab` term. The graph is not otherwise
 * changed. The file also carries top-level metadata (schema, audience, accounting), so JSON-LD makes
 * its `@graph` a named graph; the endpoint serves the union of graphs as the default graph so a plain
 * query sees the glossary. The store and the endpoint are Oxigraph's own (`oxigraph load`, `oxigraph serve-read-only`).
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SCHEMA_ORG_CONTEXT_URL = "https://schema.org";
export const PINNED_SCHEMA_ORG_CONTEXT = Object.freeze({ "@vocab": "https://schema.org/" });

/** Replace the remote schema.org context in a JSON-LD document by its pinned copy. */
export function pinContext(document) {
  const pin = (entry) => (entry === SCHEMA_ORG_CONTEXT_URL || entry === `${SCHEMA_ORG_CONTEXT_URL}/` ? PINNED_SCHEMA_ORG_CONTEXT : entry);
  const context = document["@context"];
  return { ...document, "@context": Array.isArray(context) ? context.map(pin) : pin(context) };
}

/** Write the pinned copy of a JSON-LD file and return its path. */
export function writePinnedOntology(sourcePath, directory = mkdtempSync(join(tmpdir(), "ontology-"))) {
  const path = join(directory, "ontology.jsonld");
  writeFileSync(path, JSON.stringify(pinContext(JSON.parse(readFileSync(sourcePath, "utf8")))));
  return path;
}

/** Load a JSON-LD ontology into an Oxigraph store directory with `oxigraph load`. */
export function loadOntology({ oxigraph = "oxigraph", location, jsonld }) {
  const pinned = writePinnedOntology(jsonld);
  const run = spawnSync(oxigraph, ["load", "--location", location, "--file", pinned, "--format", "jsonld"], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`oxigraph load failed (${run.status}): ${run.stderr || run.error}`);
  return pinned;
}

/** Serve a loaded store read-only over the SPARQL 1.1 Protocol; resolves when it answers. */
export async function serveOntology({ oxigraph = "oxigraph", location, bind = "127.0.0.1:7878" }) {
  const child = spawn(oxigraph, ["serve-read-only", "--location", location, "--bind", bind, "--union-default-graph"], { stdio: ["ignore", "inherit", "inherit"] });
  const endpoint = `http://${bind}/query`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`oxigraph serve-read-only exited with ${child.exitCode}`);
    try { await fetch(endpoint, { method: "POST", headers: { "content-type": "application/sparql-query" }, body: "ASK {}" }); return { child, endpoint }; }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  child.kill();
  throw new Error(`the SPARQL endpoint ${endpoint} did not answer`);
}
