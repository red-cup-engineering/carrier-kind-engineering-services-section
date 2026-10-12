import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { markdownDirectoryProvider } from "../src/adapters/markdown-directory.mjs";
import { packageJsonDirectoryProvider } from "../src/adapters/package-json-directory.mjs";
import {
  FARS_ATTRIBUTE_WITNESS,
  attributePredicate,
  decodeJsonGraphValue,
  encodeJsonGraphValue,
  projectAttributeCells,
} from "../src/provider/attribute-projection.mjs";
import { composeProviders, originsOf, queryRelations } from "../src/provider/compositor.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

const observedAt = "2026-08-30T12:00:00.000Z";

test("attribute values use typed canonical JSON rather than ambiguous string coercion", () => {
  assert.notEqual(encodeJsonGraphValue(1), encodeJsonGraphValue("1"));
  assert.notEqual(encodeJsonGraphValue(false), encodeJsonGraphValue("false"));
  assert.equal(encodeJsonGraphValue({ b: 2, a: 1 }), encodeJsonGraphValue({ a: 1, b: 2 }));
  assert.deepEqual(decodeJsonGraphValue(encodeJsonGraphValue({ nested: [null, true, 3] })), { nested: [null, true, 3] });
  assert.throws(() => projectAttributeCells({
    subject: "term",
    resource: "urn:fars:flatfile:term.md",
    attributes: { "caf\u00e9": 1, "cafe\u0301": 2 },
  }), /collide after NFC normalization/u);
});

test("attribute projection preserves duplicate array members as indexed witnesses", () => {
  const cells = projectAttributeCells({
    subject: "modeled-union-dimension",
    resource: "urn:fars:flatfile:term.md",
    attributes: { aliases: ["MUD", "MUD", false] },
  });
  const predicate = attributePredicate("aliases");
  const values = cells.filter((cell) => cell.subject === "modeled-union-dimension" && cell.predicate === predicate);
  assert.equal(values.length, 3);
  assert.equal(values[0].object, values[1].object);
  assert.notEqual(values[1].object, values[2].object);

  const witnesses = cells.filter((cell) => cell.subject === "modeled-union-dimension" && cell.predicate === FARS_ATTRIBUTE_WITNESS);
  assert.equal(witnesses.length, 3);
  assert.equal(new Set(witnesses.map((cell) => cell.object)).size, 3);
  const indices = cells
    .filter((cell) => cell.predicate === "urn:fars:attribute-index")
    .map((cell) => decodeJsonGraphValue(cell.object));
  assert.deepEqual(indices, [0, 1, 2]);
});

test("Markdown frontmatter attributes enter the provider graph with resource origins", async () => {
  const root = makeTempRoot("fae-markdown-attributes-");
  try {
    writeFileSync(path.join(root, "modeled-union-dimension.md"), [
      "---",
      "aliases: [MUD, MUD]",
      "parameters:",
      "  engine: FAE",
      "  enabled: true",
      "---",
      "A term.",
    ].join("\n"));
    const provider = markdownDirectoryProvider({ id: "urn:provider:markdown-test", root, excludes: [] });
    const composition = await composeProviders([provider], { context: { observedAt } });
    const predicate = attributePredicate("aliases");
    const aliases = composition.cells.filter((cell) => cell.subject === "modeled-union-dimension" && cell.predicate === predicate);
    assert.equal(aliases.length, 2);
    assert.deepEqual(aliases.map((cell) => decodeJsonGraphValue(cell.object)), ["MUD", "MUD"]);
    assert.deepEqual(originsOf(composition, aliases[0]), [
      { provider: "urn:provider:markdown-test", resource: "urn:fars:flatfile:modeled-union-dimension.md" },
      { provider: "urn:provider:markdown-test", resource: "urn:fars:flatfile:modeled-union-dimension.md" },
    ]);
    const parameters = composition.cells.find((cell) => cell.subject === "modeled-union-dimension" && cell.predicate === attributePredicate("parameters"));
    assert.deepEqual(decodeJsonGraphValue(parameters.object), { enabled: true, engine: "FAE" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("package.json files are observed as attribute-bearing resource graphs", async () => {
  const root = makeTempRoot("fae-package-json-");
  try {
    mkdirSync(path.join(root, "packages", "alpha"), { recursive: true });
    mkdirSync(path.join(root, "packages", "beta"), { recursive: true });
    mkdirSync(path.join(root, "node_modules", "ignored"), { recursive: true });
    writeFileSync(path.join(root, "packages", "alpha", "package.json"), JSON.stringify({
      name: "@example/alpha",
      version: "1.0.0",
      type: "module",
      description: "A conformant package fixture.",
      scripts: { test: "node --test test/*.test.mjs" },
      keywords: ["graph", "graph"],
      exports: { ".": "./src/index.mjs" },
    }));
    writeFileSync(path.join(root, "node_modules", "ignored", "package.json"), JSON.stringify({ name: "ignored" }));
    writeFileSync(path.join(root, "packages", "beta", "package.json"), JSON.stringify({
      name: "@example/beta",
      version: "1.0.0",
      type: "module",
      description: "A nonconformant package fixture.",
      dependencies: { local: "file:../alpha" },
    }));
    const outcome = await packageJsonDirectoryProvider({ id: "urn:provider:packages", root }).observe({ observedAt });
    assert.deepEqual(outcome.diagnostics, []);
    assert.equal(outcome.resources.length, 2);
    const alpha = outcome.resources.find((resource) => resource.focus === "@example/alpha");
    const beta = outcome.resources.find((resource) => resource.focus === "@example/beta");
    const keywords = alpha.cells.filter((cell) => cell.subject === "@example/alpha" && cell.predicate === attributePredicate("keywords"));
    assert.equal(keywords.length, 2);
    assert.deepEqual(keywords.map((cell) => decodeJsonGraphValue(cell.object)), ["graph", "graph"]);
    const exportsCell = alpha.cells.find((cell) => cell.subject === "@example/alpha" && cell.predicate === attributePredicate("exports"));
    assert.deepEqual(decodeJsonGraphValue(exportsCell.object), { ".": "./src/index.mjs" });
    const reviewCell = alpha.cells.find((cell) => cell.subject === "@example/alpha" && cell.predicate === attributePredicate("packageReview"));
    assert.deepEqual(decodeJsonGraphValue(reviewCell.object).deviations, []);
    const badReviewCell = beta.cells.find((cell) => cell.subject === "@example/beta" && cell.predicate === attributePredicate("packageReview"));
    assert.deepEqual(decodeJsonGraphValue(badReviewCell.object).deviations.map(({ code }) => code), ["local-dependency-specifier"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("JSNode package relations pass through DREW with their FAE resource provenance", async () => {
  const root = makeTempRoot("fae-jsnode-drew-");
  try {
    mkdirSync(path.join(root, "packages", "graph-reader"), { recursive: true });
    writeFileSync(path.join(root, "packages", "graph-reader", "package.json"), JSON.stringify({
      name: "@example/graph-reader",
      version: "0.3.0",
      keywords: ["cell", "graph"],
      dependencies: { "@red-cup-engineering/drew": "0.4.0" },
      "x-research-handle": { term: "cellular-graph" },
    }));
    const provider = packageJsonDirectoryProvider({ id: "urn:provider:jsnode", root });
    const composition = await composeProviders([provider], { context: { observedAt } });
    const packageTerm = "jsnode.package.@example/graph-reader";
    const dependency = {
      subject: packageTerm,
      predicate: "jsnode.depends-on",
      object: "jsnode.package.@red-cup-engineering/drew",
    };
    const matches = queryRelations(composition, dependency);
    assert.equal(matches.length, 1);
    assert.deepEqual(matches[0].source, {
      kind: "fae.provider-resource-observation",
      provider: "urn:provider:jsnode",
      resource: "urn:fars:flatfile:packages%2Fgraph-reader%2Fpackage.json",
      focus: "@example/graph-reader",
      observedAt,
    });
    assert.deepEqual(originsOf(composition, dependency), [{
      provider: "urn:provider:jsnode",
      resource: "urn:fars:flatfile:packages%2Fgraph-reader%2Fpackage.json",
    }]);
    const rawExtension = composition.cells.find((cell) =>
      cell.subject === "@example/graph-reader"
      && cell.predicate === attributePredicate("x-research-handle"));
    assert.deepEqual(decodeJsonGraphValue(rawExtension.object), { term: "cellular-graph" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
