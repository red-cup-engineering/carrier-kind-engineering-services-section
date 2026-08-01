import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { decodeCanonical, encodeCanonical } from "../src/canonical-cbor.mjs";
import { conformAscribedTerm } from "../src/conformance.mjs";
import { FOUR, isKnowledgeCover } from "../src/four.mjs";
import {
  assay,
  decodeSemantic,
  normalizeEffectCell,
  parseRml,
  semanticBytes,
  semanticId,
} from "../src/rmn-core.mjs";
import {
  decodeRelationalValue,
  encodeRelationalValue,
  relationalValueId,
} from "../src/relational-value.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("an effect cell carries only witnessed fields and refuses stored law", () => {
  const cell = {
    caller: "eip155:1:0x0000000000000000000000000000000000000001",
    provider: "eip155:1:0x0000000000000000000000000000000000000002",
    outcome: { positiveEvidence: true, negativeEvidence: false },
    measures: [],
    evidenceRoot: semanticId(["star"]),
    parent: null,
  };
  const normalized = normalizeEffectCell(cell);
  assert.deepEqual(Object.keys(normalized).sort(), ["caller", "evidenceRoot", "measures", "outcome", "parent", "provider"]);
  assert.throws(() => normalizeEffectCell({ ...cell, law: cell.evidenceRoot }), /must expose exactly/u);
  assert.throws(() => normalizeEffectCell({ ...cell, precondition: cell.evidenceRoot }), /must expose exactly/u);
});

test("RFC 8949 and RFC 6920 identities match the released vectors", () => {
  const values = new Map([
    ["star", ["star"]],
    ["four-neither", ["four", false, false]],
    ["mark-nfc-e-acute", ["mark", "é"]],
    ["identity-rml", ["app", ["lam", ["var", 0]], ["star"]]],
  ]);
  const vectors = readFileSync(join(ROOT, "content/vectors/rmn-core-v2.tsv"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));
  for (const line of vectors) {
    const [name, hex, ni] = line.split("\t");
    assert.equal(encodeCanonical(values.get(name)).toString("hex"), hex);
    assert.equal(semanticId(values.get(name)), ni);
  }
  assert.throws(() => decodeCanonical(Buffer.from([0x18, 0x00])), /not in RFC 8949 core deterministic form/u);
});

test("typed relational RMN is canonical and round-trips without JSON", () => {
  const source = { alpha: "é", decimals: [1e-7, -2.5e-8, 1.25, 1e21], zeta: [true, null, 7] };
  const encoded = encodeRelationalValue(source);
  const term = ["ascribe", encoded.type, encoded.term];
  assert.deepEqual(decodeRelationalValue(encoded.type, encoded.term), source);
  assert.deepEqual(decodeSemantic(semanticBytes(term)), term);
  assert.equal(relationalValueId(source), semanticId(term));
});

test("bounded normalization and FOUR knowledge covers remain exact", () => {
  const term = parseRml("#lang rmn/v2\n(app (lam (var 0)) (star))");
  assert.deepEqual(assay({ term, expectedType: ["unit"], fuel: 4 }).normalForm, ["star"]);
  assert.deepEqual(
    conformAscribedTerm(["ascribe", ["unit"], ["app", ["lam", ["var", 0]], ["star"]]]).response,
    ["ascribe", ["unit"], ["star"]],
  );
  assert.equal(isKnowledgeCover(FOUR.neither, FOUR.true), true);
  assert.equal(isKnowledgeCover(FOUR.true, FOUR.both), true);
});
