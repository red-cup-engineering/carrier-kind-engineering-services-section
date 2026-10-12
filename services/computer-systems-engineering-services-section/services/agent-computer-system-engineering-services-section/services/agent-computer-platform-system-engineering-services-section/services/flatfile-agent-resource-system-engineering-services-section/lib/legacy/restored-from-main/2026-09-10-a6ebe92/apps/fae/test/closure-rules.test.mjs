import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { check as checkAmbiguousReference } from "../src/closure/rules/ambiguous-reference.mjs";
import { check as checkBrokenLinks } from "../src/closure/rules/broken-links.mjs";
import { check as checkCycles } from "../src/closure/rules/cycles.mjs";
import { check as checkOrphans } from "../src/closure/rules/orphans.mjs";
import { check as checkProofs } from "../src/closure/rules/proofs.mjs";
import { check as checkStatusConsistency } from "../src/closure/rules/status-consistency.mjs";
import { check as checkStubs } from "../src/closure/rules/stubs.mjs";
import { check as checkSymbols } from "../src/closure/rules/symbols.mjs";
import { composeRules } from "../src/closure/rules/compose-rules.mjs";
import { makeFlatfile } from "../src/substrate/flatfile.mjs";
import { makePredication } from "../src/substrate/predication.mjs";
import { loadFlatfiles } from "../src/substrate/store.mjs";

const CORPUS_ROOT = fileURLToPath(new URL("../../../lib/conformance/fixture-corpus", import.meta.url));
const EXPECTED_DIAGNOSTICS_PATH = fileURLToPath(new URL("../../../lib/conformance/diagnostics-expected.json", import.meta.url));
const expectedDiagnostics = JSON.parse(readFileSync(EXPECTED_DIAGNOSTICS_PATH, "utf8"));

function note(overrides) {
  return makeFlatfile({
    slug: "n", dir: "concepts", kind: "concept", fm: {}, body: "", path: "n.md", mtime: 0,
    ...overrides,
  });
}

function bySlugOf(notes) {
  const bySlug = new Map();
  for (const n of notes) {
    if (!bySlug.has(n.slug)) bySlug.set(n.slug, []);
    bySlug.get(n.slug).push(n);
  }
  return bySlug;
}

test("cycles: a self-loop reports its owning path", () => {
  const notes = [note({ slug: "a", path: "concepts/a.md", fm: { "depends-on": ["a"] } })];
  const dependsOn = new Map([["a", ["a"]]]);
  const diagnostics = checkCycles(dependsOn, bySlugOf(notes));
  assert.deepEqual(diagnostics, [{
    rule: "cycles", path: "concepts/a.md", slug: "a", target: "a",
    message: "`a` lists itself in depends-on (self-loop)",
  }]);
});

test("cycles: a multi-node strongly-connected component reports no single path", () => {
  const dependsOn = new Map([["a", ["b"]], ["b", ["c"]], ["c", ["a"]]]);
  const diagnostics = checkCycles(dependsOn, new Map());
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, "cycles");
  assert.equal(diagnostics[0].path, null);
  assert.match(diagnostics[0].message, /^cycle in depends-on: /);
});

test("cycles: an acyclic depends-on graph reports nothing", () => {
  const dependsOn = new Map([["a", ["b"]], ["b", ["c"]]]);
  assert.deepEqual(checkCycles(dependsOn, new Map()), []);
});

test("broken-links: a body link to an unknown slug is reported, a known one is not", () => {
  const notes = [note({ slug: "a", path: "concepts/a.md" })];
  const edges = [
    makePredication({ src: "a", dst: "missing", kind: "link", source: "body", line: 3 }),
    makePredication({ src: "a", dst: "known", kind: "link", source: "body", line: 4 }),
    makePredication({ src: "a", dst: "missing", kind: "depends-on", source: "fm" }),
  ];
  const diagnostics = checkBrokenLinks(edges, bySlugOf(notes), new Set(["known"]));
  assert.deepEqual(diagnostics, [{
    rule: "broken-links", path: "concepts/a.md", slug: "a", target: "missing",
    message: "references missing slug `missing`",
  }]);
});

test("ambiguous-reference: a reference resolving to two records is reported, a unique one is not", () => {
  const notes = [
    note({ slug: "source", path: "concepts/source.md" }),
    note({ slug: "dup", path: "concepts/dup.md" }),
    note({ slug: "dup", path: "objects/dup.md" }),
    note({ slug: "solo", path: "concepts/solo.md" }),
  ];
  const edges = [
    makePredication({ src: "source", dst: "dup", kind: "see-also", source: "fm" }),
    makePredication({ src: "source", dst: "solo", kind: "see-also", source: "fm" }),
  ];
  const diagnostics = checkAmbiguousReference(edges, bySlugOf(notes));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, "ambiguous-reference");
  assert.equal(diagnostics[0].slug, "source");
  assert.equal(diagnostics[0].target, "dup");
});

test("orphans: excludes references/ dir, positioned narratives, and explores questions", () => {
  const notes = [
    note({ slug: "isolated", path: "concepts/isolated.md" }),
    note({ slug: "cited", path: "concepts/cited.md" }),
    note({ slug: "bib", dir: "references", path: "references/bib.md" }),
    note({ slug: "chapter-guide", kind: "narrative", fm: { introduces: ["cited"] }, path: "narratives/chapter-guide.md" }),
    note({ slug: "open-q", kind: "question", fm: { explores: ["cited"] }, path: "questions/open-q.md" }),
  ];
  const edges = [makePredication({ src: "isolated", dst: "cited", kind: "see-also", source: "fm" })];
  const diagnostics = checkOrphans(notes, edges);
  assert.deepEqual(diagnostics.map((d) => d.slug).sort(), ["isolated"]);
});

test("status-consistency: a proved note depending on an unproved one is reported", () => {
  const notes = [
    note({ slug: "thm", fm: { status: "proved", "depends-on": ["lemma"] }, path: "theorems/thm.md" }),
    note({ slug: "lemma", fm: { status: "draft" }, path: "theorems/lemma.md" }),
  ];
  const diagnostics = checkStatusConsistency(notes, bySlugOf(notes));
  assert.deepEqual(diagnostics, [{
    rule: "status-consistency", path: "theorems/thm.md", slug: "thm", target: "lemma",
    message: "`thm` (proved) depends on `lemma` (draft)",
  }]);
});

test("status-consistency: a proved note depending on another proved note is silent", () => {
  const notes = [
    note({ slug: "thm", fm: { status: "proved", "depends-on": ["axiom"] }, path: "theorems/thm.md" }),
    note({ slug: "axiom", fm: { status: "proved" }, path: "theorems/axiom.md" }),
  ];
  assert.deepEqual(checkStatusConsistency(notes, bySlugOf(notes)), []);
});

test("proofs: a proved theorem missing the Proof heading is reported", () => {
  const notes = [note({ slug: "thm", kind: "theorem", fm: { status: "proved" }, body: "No proof here.", path: "theorems/thm.md" })];
  const diagnostics = checkProofs(notes);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, "missing-proof");
  assert.match(diagnostics[0].message, /no Proof heading/);
});

test("proofs: a proved theorem with a heading but no square marker is reported", () => {
  const notes = [note({ slug: "thm", kind: "theorem", fm: { status: "proved" }, body: "## Proof\n\nDone.", path: "theorems/thm.md" })];
  const diagnostics = checkProofs(notes);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, "missing-proof");
  assert.match(diagnostics[0].message, /no \$\\square\$ marker/);
});

test("proofs: a theorem-like note with no status is reported as missing-status", () => {
  const notes = [note({ slug: "thm", kind: "theorem", fm: {}, body: "Body.", path: "theorems/thm.md" })];
  const diagnostics = checkProofs(notes);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, "missing-status");
});

test("proofs: a sketch/draft theorem is reported as wip-theorem", () => {
  const notes = [note({ slug: "thm", kind: "theorem", fm: { status: "draft" }, body: "Body.", path: "theorems/thm.md" })];
  const diagnostics = checkProofs(notes);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, "wip-theorem");
});

test("proofs: a complete proof is silent", () => {
  const notes = [note({ slug: "thm", kind: "theorem", fm: { status: "proved" }, body: "## Proof\n\n$\\square$", path: "theorems/thm.md" })];
  assert.deepEqual(checkProofs(notes), []);
});

test("symbols: two notes in relevant dirs claiming the same symbol collide", () => {
  const notes = [
    note({ slug: "a", dir: "concepts", fm: { symbol: "X" }, path: "concepts/a.md" }),
    note({ slug: "b", dir: "objects", fm: { symbol: "X" }, path: "objects/b.md" }),
    note({ slug: "c", dir: "narratives", fm: { symbol: "X" }, path: "narratives/c.md" }),
  ];
  const diagnostics = checkSymbols(notes);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].target, "X");
  assert.match(diagnostics[0].message, /`a`/);
  assert.match(diagnostics[0].message, /`b`/);
  assert.doesNotMatch(diagnostics[0].message, /`c`/);
});

test("stubs: a body under the character threshold is reported, narratives are excluded by default", () => {
  const notes = [
    note({ slug: "short", body: "one line", path: "concepts/short.md" }),
    note({ slug: "story", kind: "narrative", body: "also short", path: "narratives/story.md" }),
  ];
  const diagnostics = checkStubs(notes);
  assert.deepEqual(diagnostics.map((d) => d.slug), ["short"]);
});

test("fixture-corpus diagnostics run: composeRules over the shared corpus", async () => {
  const { notes } = await loadFlatfiles(CORPUS_ROOT);
  const diagnostics = composeRules(notes);
  const byRule = new Map();
  for (const d of diagnostics) {
    if (!byRule.has(d.rule)) byRule.set(d.rule, []);
    byRule.get(d.rule).push(d.slug);
  }
  assert.deepEqual((byRule.get("orphans") ?? []).sort(), ["alpha-example", "alpha-property", "beta"]);
  assert.deepEqual((byRule.get("stubs") ?? []).sort(), ["alpha", "alpha-example", "alpha-property", "beta", "open-question"]);
  assert.deepEqual(byRule.get("cycles"), undefined);
  assert.deepEqual(byRule.get("broken-links"), undefined);
  assert.deepEqual(byRule.get("ambiguous-reference"), undefined);
  assert.deepEqual(byRule.get("status-consistency"), undefined);
  assert.deepEqual(byRule.get("missing-status"), undefined);
  assert.deepEqual(byRule.get("missing-proof"), undefined);
  assert.deepEqual(byRule.get("wip-theorem"), undefined);
  assert.deepEqual(byRule.get("symbols"), undefined);
  for (const diagnostic of diagnostics) {
    assert.ok("rule" in diagnostic && "path" in diagnostic && "slug" in diagnostic && "target" in diagnostic && "message" in diagnostic);
  }
});

test("cross-language conformance vector #4: composeRules over the shared corpus matches diagnostics-expected.json", async () => {
  const { notes } = await loadFlatfiles(CORPUS_ROOT);
  const diagnostics = composeRules(notes);
  assert.deepEqual(diagnostics, expectedDiagnostics.diagnostics);
});
