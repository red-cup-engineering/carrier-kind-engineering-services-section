import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { classify } from "../src/substrate/link-kind.mjs";
import { FrontmatterError, parseFrontmatter } from "../src/substrate/flatfile.mjs";
import { parseLinks } from "../src/substrate/markdown-links.mjs";
import { slugOf } from "../src/substrate/predication.mjs";
import { buildEdges, loadFlatfiles } from "../src/substrate/store.mjs";

const CORPUS_ROOT = fileURLToPath(new URL("../../../lib/conformance/fixture-corpus", import.meta.url));
const EXPECTED_PATH = fileURLToPath(new URL("../../../lib/conformance/fixture-corpus-expected.json", import.meta.url));
const expected = JSON.parse(readFileSync(EXPECTED_PATH, "utf8"));

test("loadFlatfiles parses the fixture corpus into the expected slug/dir/kind/fm/body structures", async () => {
  const { notes, diagnostics } = await loadFlatfiles(CORPUS_ROOT);
  assert.deepEqual(diagnostics, []);
  assert.equal(notes.length, expected.notes_by_file.length);
  const bySlug = new Map(notes.map((note) => [note.slug, note]));
  for (const want of expected.notes_by_file) {
    const got = bySlug.get(want.slug);
    assert.ok(got, `missing note for slug ${want.slug}`);
    assert.equal(got.dir, want.dir);
    assert.equal(got.kind, want.kind);
    assert.equal(got.path, want.path);
    assert.deepEqual(got.fm, want.fm);
    assert.equal(got.body, want.body);
  }
});

test("buildEdges reproduces the expected fm+body edge list, in order", async () => {
  const { notes } = await loadFlatfiles(CORPUS_ROOT);
  const edges = buildEdges(notes);
  assert.deepEqual(edges, expected.edges);
});

test("parseFrontmatter returns { fm: null, body: text } for a file with no frontmatter block", () => {
  const text = "# Just a heading\n\nNo frontmatter here.\n";
  assert.deepEqual(parseFrontmatter(text), { fm: null, body: text });
});

test("parseFrontmatter throws FrontmatterError on a malformed frontmatter block", () => {
  assert.throws(() => parseFrontmatter("---\nkind: [unterminated\n---\nbody\n"), FrontmatterError);
});

test("parseFrontmatter reports an unresolved YAML alias as FrontmatterError", () => {
  assert.throws(
    () => parseFrontmatter("---\ntitle: *missing-anchor\n---\nbody\n"),
    FrontmatterError,
  );
});

test("parseFrontmatter parses quoted scalars, booleans, and flow lists", () => {
  const { fm } = parseFrontmatter('---\nkind: morphism\nsymbol: "\\\\mathrm{Sv}"\ndraft: false\ndepends-on: [a, b, c]\n---\nbody\n');
  assert.equal(fm.kind, "morphism");
  assert.equal(fm.symbol, "\\mathrm{Sv}");
  assert.equal(fm.draft, false);
  assert.deepEqual(fm["depends-on"], ["a", "b", "c"]);
});

test("parseFrontmatter parses the nested mappings and block forms used by the corpus", () => {
  const { fm } = parseFrontmatter([
    "---",
    "levels:",
    "  L0: frontmatter is parseable YAML",
    "people:",
    "  - Alan Lea",
    "description: >-",
    "  A description continued",
    "  across lines.",
    "---",
    "body",
  ].join("\n"));
  assert.deepEqual(fm.levels, { L0: "frontmatter is parseable YAML" });
  assert.deepEqual(fm.people, ["Alan Lea"]);
  assert.equal(fm.description, "A description continued across lines.");
});

test("markdown-links masks fenced code blocks and inline code spans", () => {
  const body = [
    "See [real](real.md) here.",
    "```",
    "[fenced](fenced.md)",
    "```",
    "Inline `[coded](coded.md)` span.",
  ].join("\n");
  const links = parseLinks(body);
  assert.deepEqual(links.map((l) => l.targetRaw), ["real.md"]);
});

test("link-kind classifies external, anchor, asset, absolute, and relative targets", () => {
  assert.equal(classify("https://example.com"), "external");
  assert.equal(classify("#section"), "anchor");
  assert.equal(classify("diagram.png"), "asset");
  assert.equal(classify("/notes/alpha.md"), "absolute");
  assert.equal(classify("alpha.md"), "relative");
  assert.equal(classify("skills/"), "relative");
});

test("slugOf normalizes markdown targets and fm relation values to bare slugs", () => {
  assert.equal(slugOf("alpha.md"), "alpha");
  assert.equal(slugOf("../concepts/alpha.md"), "alpha");
  assert.equal(slugOf("alpha"), "alpha");
  assert.equal(slugOf("skills/"), "skills-index");
  assert.equal(slugOf("skills/_index.md"), "skills-index");
  assert.equal(slugOf("skills/persona/SKILL.md"), "persona-skill");
  assert.equal(slugOf("README.md"), null);
  assert.equal(slugOf("diagram.png", { requireMd: true }), null);
});
