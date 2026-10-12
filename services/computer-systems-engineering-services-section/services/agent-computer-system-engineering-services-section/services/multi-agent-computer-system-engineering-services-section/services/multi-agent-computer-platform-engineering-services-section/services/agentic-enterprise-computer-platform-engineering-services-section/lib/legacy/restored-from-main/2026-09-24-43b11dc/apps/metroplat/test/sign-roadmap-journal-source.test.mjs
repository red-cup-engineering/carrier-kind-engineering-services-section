import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { createSignClaim } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/semantic-claim";
import { referenceOf } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/semantic-cell";
import { termToJson, jsonToTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";
import { seavt } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/admit-seavt-row";
import { createSignRoadmap } from "@red-cup-engineering/organizing/work/sign-roadmap";
import { admitSignRoadmap, readSignRoadmap, SIGN_ROADMAP_FEED, SIGN_ROADMAP_RECORD_KIND, SIGN_ROADMAP_SUBJECT } from "../src/work/sign-roadmap-journal.mjs";
import { readSeavtEntries } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/read-seavt-entries";
import { appendSeavtEntries } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/append-seavt-entries";

function roadmap() {
  const result = createSignRoadmap({ nodes: [
    { key: "evidence", kind: "evidence", content: { title: "e", description: "e", locator: "x", excerpt: "x" } },
    { key: "direction", kind: "founder-direction", content: { title: "d", description: "d", literal: "l", recordedAt: "2026-09-09", authority: "a" } },
    { key: "endeavor", kind: "endeavor", content: { title: "n", description: "n", intendedOutcome: "o", acceptance: "a" } },
  ], edges: [{ from: "endeavor", predicate: "directed-by", to: "direction", witness: "evidence" }] });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.refusal.message);
  return result.value;
}

function legacyWitness(graph, eventId = undefined) {
  const anchor = graph.cells[0];
  const claim = createSignClaim({ subject: referenceOf(anchor), predicate: "metroplat.roadmap-admitted", object: referenceOf(anchor), charge: "potential" });
  assert.equal(claim.ok, true);
  if (!claim.ok) throw new Error(claim.refusal.message);
  const content = Object.freeze({ kind: "sign.chain.event", ordinal: 0, author: SIGN_ROADMAP_SUBJECT, witness: graph.id, parents: Object.freeze([]), claim: claim.value });
  const id = eventId ?? semanticId(Object.freeze({ kind: "sign.cell", type: "sign.chain.event@1", content }));
  return Object.freeze({ kind: SIGN_ROADMAP_RECORD_KIND, subject: SIGN_ROADMAP_SUBJECT, graph, event: Object.freeze({ ...content, id }) });
}

function withData(run) {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-sign-roadmap-source-"));
  try { run(dataRoot); } finally { rmSync(dataRoot, { recursive: true, force: true }); }
}

test("new roadmap journal records retain author and witness without a chain and replay idempotently", () => withData((dataRoot) => {
  const value = roadmap();
  const binding = { dataRoot, now: () => "2026-09-09T00:00:00.000Z" };
  assert.equal(admitSignRoadmap(binding, value, { at: "2026-09-09" }).status, "admitted");
  const stored = termToJson([...readSeavtEntries({ root: dataRoot, feed: SIGN_ROADMAP_FEED, at: "2026-09-09" })][0].entry.v);
  assert.equal(stored.event, undefined);
  assert.equal(stored.author, SIGN_ROADMAP_SUBJECT);
  assert.equal(stored.witness, value.graph.id);
  assert.equal(admitSignRoadmap(binding, value, { at: "2026-09-09" }).status, "already-admitted");
  assert.equal(readSignRoadmap(binding, "2026-09-09")?.graph.id, value.graph.id);
}));

test("old one-event chain records replay only when their historical cell identity is intact", () => withData((dataRoot) => {
  const value = roadmap();
  const binding = { dataRoot, now: () => "2026-09-09T00:00:00.000Z" };
  appendSeavtEntries({ root: dataRoot, feed: SIGN_ROADMAP_FEED, entries: [seavt(jsonToTerm(value.graph.id), jsonToTerm(SIGN_ROADMAP_RECORD_KIND), jsonToTerm(legacyWitness(value.graph)), "2026-09-09")], at: "2026-09-09" });
  assert.equal(readSignRoadmap(binding, "2026-09-09")?.graph.id, value.graph.id);
}));

test("a changed legacy event id is refused before roadmap projection", () => withData((dataRoot) => {
  const value = roadmap();
  appendSeavtEntries({ root: dataRoot, feed: SIGN_ROADMAP_FEED, entries: [seavt(jsonToTerm(value.graph.id), jsonToTerm(SIGN_ROADMAP_RECORD_KIND), jsonToTerm(legacyWitness(value.graph, "ni:tampered")), "2026-09-09")], at: "2026-09-09" });
  assert.throws(() => readSignRoadmap({ dataRoot, now: () => "2026-09-09T00:00:00.000Z" }, "2026-09-09"), /invalid direct-RMN MetroPlat roadmap witness/);
}));
