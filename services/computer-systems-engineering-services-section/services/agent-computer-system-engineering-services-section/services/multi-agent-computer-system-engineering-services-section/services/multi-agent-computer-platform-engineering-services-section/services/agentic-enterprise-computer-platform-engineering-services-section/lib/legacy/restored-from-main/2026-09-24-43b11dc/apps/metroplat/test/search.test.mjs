import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { deriveTermIntensionReadout } from "../src/search/standing.mjs";
import { pathCorpusOperations, readPathCorpus } from "../src/search/path-corpus.mjs";
import { readTermIntension } from "../src/search/service.mjs";

test("term intension closes typed occurrences through one FCA reading", () => {
  const readout = deriveTermIntensionReadout({
    query: "service function",
    occurrences: [
      {
        id: "typescript:src/service.mts:serviceFunction",
        source: "typescript",
        grade: "strong",
        path: "src/service.mts",
        symbol: "serviceFunction",
        matchedFields: ["symbol"],
        attributes: ["symbol-kind:function"],
        lenses: ["computing/term"],
        evidence: ["module:src/service.mts"],
      },
      {
        id: "lean:ServiceFunction",
        source: "lean",
        grade: "strong",
        module: "Obsmetrologia.ServiceFunction",
        declaration: "ServiceFunction",
        matchedFields: ["declaration"],
        attributes: ["lean-kind:def"],
        lenses: ["physical/material"],
        evidence: ["module:Obsmetrologia.ServiceFunction"],
      },
    ],
  });

  assert.equal(readout.status, "polysemous");
  assert.deepEqual(readout.closedExtent, readout.extent);
  assert.ok(readout.intent.includes("grade:strong"));
  assert.equal(readout.lenses.find((lens) => lens.lens === "computing/term")?.status, "earned");
  assert.equal(readout.lenses.find((lens) => lens.lens === "physical/material")?.status, "earned");
  assert.match(readout.contextInjection, /service function.*polysemous/u);
});

test("path corpus indexes a bounded source tree and rejects escaping subpaths", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-search-"));
  try {
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "README.md"), "# Service function\nA bounded operation.\n");
    writeFileSync(path.join(root, "src", "service.mts"), "export function serviceFunction() { return true; }\n");

    const corpus = readPathCorpus(root, { query: "service function", limit: 8 });
    assert.equal(corpus.filesIndexed, 2);
    assert.equal(corpus.documents[0]?.matchedTerms.includes("service"), true);
    assert.ok(corpus.concepts.some((concept) => concept.term === "service"));

    const [operation] = pathCorpusOperations({ dataRoot: root });
    assert.throws(() => operation.execute({ id: "../outside" }, {}), /id escapes root/u);
    assert.throws(
      () => readTermIntension({ query: "service", root, pathPrefix: "../outside" }),
      /pathPrefix escapes root/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("path corpus retains a late path match and reads only each selected file head", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-search-bounded-"));
  try {
    mkdirSync(path.join(root, "a"));
    mkdirSync(path.join(root, "z"));
    writeFileSync(path.join(root, "a", "ordinary.mts"), "export const ordinary = true;\n");
    writeFileSync(path.join(root, "z", "needle-language.mts"), "export const language = true;\n");
    writeFileSync(path.join(root, "large.md"), `${"x".repeat(64 * 1024)}\nneedle-only-after-the-head\n`);

    const lateMatch = readPathCorpus(root, { query: "needle language", maxFiles: 1, limit: 1 });
    assert.equal(lateMatch.filesSeen, 3);
    assert.equal(lateMatch.candidateFiles, 1);
    assert.equal(lateMatch.truncated, true);
    assert.equal(lateMatch.documents[0]?.path, "z/needle-language.mts");

    const boundedHead = readPathCorpus(root, { query: "needle", maxFiles: 3, maxBytesPerFile: 1024 });
    const large = boundedHead.documents.find((document) => document.path === "large.md");
    assert.equal(large?.matchedTerms.includes("needle"), false);
    assert.equal(large?.excerpt.includes("needle-only-after-the-head"), false);
    assert.ok(large?.evidence.includes("head-bytes:1024"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
