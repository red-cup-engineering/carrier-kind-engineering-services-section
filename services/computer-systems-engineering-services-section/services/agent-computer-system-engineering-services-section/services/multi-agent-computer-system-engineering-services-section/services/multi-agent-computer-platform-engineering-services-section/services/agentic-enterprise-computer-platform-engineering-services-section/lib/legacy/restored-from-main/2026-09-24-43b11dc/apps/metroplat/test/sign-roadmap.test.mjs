import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { appendEavtEntries } from "@red-cup-engineering/eavt/append-eavt-entries";
import { termToJson } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";
import { eavtRow } from "@red-cup-engineering/eavt/row";
import { createSignRoadmap, deriveMilestones, parseSignRoadmapInput } from "@red-cup-engineering/organizing/work/sign-roadmap";
import { admitSignRoadmap, readSignRoadmap, readSignRoadmapGraph, SIGN_ROADMAP_FEED } from "../src/work/sign-roadmap-journal.mjs";
import { workCoordinationOperations } from "../src/work/service.mjs";
import { readSeavtEntries } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/read-seavt-entries";

const base = (title, description = title) => ({ title, description });

test("the roadmap is a typed graph and milestones are derived from receipt edges", () => {
  const roadmap = createSignRoadmap({
    nodes: [
      { key: "direction", kind: "founder-direction", content: { ...base("Founder direction"), literal: "Use one typed system.", recordedAt: "2026-09-09", authority: "Founder" } },
      { key: "evidence", kind: "evidence", content: { ...base("Prompt"), locator: "codex-thread", excerpt: "one roadmap" } },
      { key: "endeavor", kind: "endeavor", content: { ...base("Systematization"), intendedOutcome: "One roadmap graph", acceptance: "receiver reads its graph" } },
      { key: "campaign", kind: "campaign", content: { ...base("Typed work rail"), intendedOutcome: "Rich work carrier", acceptance: "cells and edges admit" } },
      { key: "project", kind: "project", content: { ...base("Sign migration"), intendedOutcome: "One graph", acceptance: "no alternate graph carrier" } },
      { key: "plan", kind: "plan", content: { ...base("MetroPlat cut"), intendedOutcome: "Derived roadmap", acceptance: "readout is graph derived" } },
      { key: "task", kind: "task", content: { ...base("Create graph"), intendedOutcome: "Graph package", acceptance: "registry install" } },
      { key: "work", kind: "work-item", content: { ...base("Publish graph"), intendedOutcome: "Package published", acceptance: "registry receipt" } },
      { key: "milestone", kind: "milestone", content: base("Graph is published") },
      { key: "receiver", kind: "receiver", content: { ...base("Registry"), receiver: "registry.561.group", acceptance: "fresh install imports it" } },
      { key: "receipt", kind: "receipt", content: { ...base("Release receipt"), locator: "ni:///sha-256;receipt", outcome: "accepted" } },
    ],
    edges: [
      { from: "endeavor", predicate: "directed-by", to: "direction", witness: "evidence" },
      { from: "endeavor", predicate: "contains", to: "campaign", witness: "evidence" },
      { from: "campaign", predicate: "contains", to: "project", witness: "evidence" },
      { from: "project", predicate: "contains", to: "plan", witness: "evidence" },
      { from: "plan", predicate: "contains", to: "task", witness: "evidence" },
      { from: "task", predicate: "contains", to: "work", witness: "evidence" },
      { from: "milestone", predicate: "requires", to: "work", witness: "evidence" },
      { from: "receipt", predicate: "accepted", to: "work", witness: "receipt" },
      { from: "receipt", predicate: "received-by", to: "receiver", witness: "receipt" },
    ],
  });
  assert.equal(roadmap.ok, true);
  if (!roadmap.ok) return;
  assert.equal(roadmap.value.graph.id.startsWith("ni:"), true);
  assert.equal(readSignRoadmapGraph(roadmap.value.graph)?.graph.id, roadmap.value.graph.id);
  assert.deepEqual(deriveMilestones(roadmap.value), [{ milestone: "milestone", requirements: ["work"], accepted: ["work"], reached: true }]);
});

test("the work spine cannot skip a level", () => {
  const result = createSignRoadmap({
    nodes: [
      { key: "e", kind: "evidence", content: { ...base("e"), locator: "x", excerpt: "x" } },
      { key: "endeavor", kind: "endeavor", content: { ...base("e"), intendedOutcome: "x", acceptance: "x" } },
      { key: "task", kind: "task", content: { ...base("t"), intendedOutcome: "x", acceptance: "x" } },
    ],
    edges: [{ from: "endeavor", predicate: "contains", to: "task", witness: "e" }],
  });
  assert.equal(result.ok, false);
});

test("the public boundary refuses a thin or undeclared work edge", () => {
  assert.equal(parseSignRoadmapInput({
    nodes: [{ key: "x", kind: "task", content: { title: "x", description: "x" } }],
    edges: [],
  }).ok, false);
  assert.equal(parseSignRoadmapInput({
    nodes: [{ key: "x", kind: "evidence", content: { title: "x", description: "x", locator: "x", excerpt: "x" } }],
    edges: [{ from: "x", predicate: "free-form-link", to: "x", witness: "x" }],
  }).ok, false);
});

test("the one shared roadmap is durably admitted and read back from graph cuts", () => {
  const roadmap = createSignRoadmap({
    nodes: [
      { key: "evidence", kind: "evidence", content: { ...base("Founder direction"), locator: "codex-thread", excerpt: "one shared roadmap" } },
      { key: "direction", kind: "founder-direction", content: { ...base("Founder direction"), literal: "Use one shared typed roadmap.", recordedAt: "2026-09-09", authority: "Founder" } },
      { key: "endeavor", kind: "endeavor", content: { ...base("Systematization"), intendedOutcome: "One graph", acceptance: "read from the journal" } },
    ],
    edges: [
      { from: "endeavor", predicate: "directed-by", to: "direction", witness: "evidence" },
    ],
  });
  assert.equal(roadmap.ok, true);
  if (!roadmap.ok) return;

  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-sign-roadmap-"));
  try {
    const binding = { dataRoot, now: () => "2026-09-09T00:00:00.000Z" };
    assert.equal(admitSignRoadmap(binding, roadmap.value, { at: "2026-09-09" }).status, "admitted");
    const rows = [...readSeavtEntries({ root: dataRoot, feed: SIGN_ROADMAP_FEED, at: "2026-09-09" })];
    const witness = termToJson(rows[0].entry.v);
    assert.equal(witness.event, undefined);
    assert.equal(witness.author, "561-group-roadmap");
    assert.equal(witness.witness, roadmap.value.graph.id);
    assert.equal(witness.claim.kind, "sign.claim");
    assert.equal(admitSignRoadmap(binding, roadmap.value, { at: "2026-09-09" }).status, "already-admitted");
    const replayed = readSignRoadmap(binding, "2026-09-09");
    assert.equal(replayed?.graph.id, roadmap.value.graph.id);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("generic EAVT in the witness feed is refused rather than promoted to a roadmap graph", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-sign-roadmap-invalid-"));
  try {
    appendEavtEntries({root: dataRoot, feed: SIGN_ROADMAP_FEED, entries: [eavtRow({ e: "generic", a: "generic", v: "generic", t: "2026-09-09" })], at: "2026-09-09"});
    assert.throws(() => readSignRoadmap({ dataRoot, now: () => "2026-09-09T00:00:00.000Z" }, "2026-09-09"), /SEAVT row/);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("staff use the typed MetroPlat operation, not a private roadmap writer", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-sign-roadmap-operation-"));
  const input = {
    nodes: [
      { key: "evidence", kind: "evidence", content: { ...base("Founder direction"), locator: "codex-thread", excerpt: "one roadmap" } },
      { key: "direction", kind: "founder-direction", content: { ...base("Founder direction"), literal: "Use one typed roadmap.", recordedAt: "2026-09-09", authority: "Founder" } },
      { key: "endeavor", kind: "endeavor", content: { ...base("Systematization"), intendedOutcome: "One roadmap", acceptance: "staff read one graph" } },
    ],
    edges: [{ from: "endeavor", predicate: "directed-by", to: "direction", witness: "evidence" }],
  };
  try {
    const binding = { dataRoot, now: () => "2026-09-09T00:00:00.000Z" };
    const operations = workCoordinationOperations(binding);
    const admit = operations.find((candidate) => candidate.verb === "sign-roadmap-admit");
    const read = operations.find((candidate) => candidate.verb === "sign-roadmap");
    assert.ok(admit); assert.ok(read);
    const admitted = admit.execute(input, {});
    assert.equal(admitted.status, "admitted");
    const replayed = read.execute({ date: "2026-09-09" }, {});
    assert.equal(replayed.kind, "metroplat.sign-roadmap-readout");
    assert.equal(typeof replayed.graph.id, "string");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
