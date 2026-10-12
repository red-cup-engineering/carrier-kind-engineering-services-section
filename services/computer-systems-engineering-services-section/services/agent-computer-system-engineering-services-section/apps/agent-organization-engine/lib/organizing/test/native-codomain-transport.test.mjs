import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson, parseJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalCarrier, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { skillSuccess } from "@red-cup-engineering/animating/becoming/doing/working/governing/skill";
import { admitAgencyWorkResult, typedResultOf, workResultFromSkillResult } from "../src/work/schema.mjs";

const decomposed = "e\u0301";
const composed = "\u00e9";
const unstableCodomain = /native result codomain is not stable/;
const objectCodomain = (key) => ({
  type: "object", required: [key], properties: { [key]: { type: "integer" } },
  additionalProperties: false,
});
const unstableCases = [
  [objectCodomain(decomposed), { [composed]: 1 }],
  [{ type: "string", const: decomposed }, composed],
  [{ type: "string", enum: [decomposed] }, composed],
  [{ type: "string", pattern: "^" + decomposed + "$" }, composed],
];
const roundtrip = (value) => parseJsonValue(canonicalJson(value));

test("native codomain admission refuses normalization-changing literal contracts before assay", () => {
  for (const [returns, output] of unstableCases) {
    const original = canonicalJson(returns);
    const result = workResultFromSkillResult(skillSuccess(output));
    assert.throws(() => typedResultOf(returns, result), unstableCodomain);
    assert.throws(() => typedResultOf(roundtrip(returns), roundtrip(result)), unstableCodomain);
    assert.equal(canonicalJson(returns), original, "refusal does not rewrite the declared contract");
  }
});

test("direct native assay admission cannot bypass the codomain transport guard", () => {
  for (const [returns, output] of unstableCases) {
    const raw = workResultFromSkillResult(skillSuccess(output));
    // Use the actual public legacy assay to construct this schema's literal
    // projection. The native admission must refuse its unstable source schema,
    // even when that pre-transport projection itself matches the declared schema.
    const projected = typedResultOf(returns, { kind: "skill-result", value: raw.skillOutcome.output });
    const record = {
      ...projected, skillOutcome: raw.skillOutcome,
      codomainAssay: { source: semanticId(raw.skillOutcome), returns },
    };
    assert.throws(() => admitAgencyWorkResult(record), unstableCodomain);
    assert.throws(() => admitAgencyWorkResult(roundtrip(record)), unstableCodomain);
  }
});

test("stable NFC and ASCII native assays preserve exact schemas through admission and JSON replay", () => {
  for (const [returns, output, expectedKind] of [
    [objectCodomain(composed), { [composed]: 1 }, "skill-result"],
    [objectCodomain("count"), { count: 1 }, "skill-result"],
    [objectCodomain("count"), { count: "wrong" }, "skill-error"],
    [{ type: "string", const: composed }, composed, "skill-result"],
    [{ type: "string", enum: [composed] }, composed, "skill-result"],
    [{ type: "string", pattern: "^" + composed + "$" }, composed, "skill-result"],
    // This regex is ASCII source spelling for a decomposed match. It remains
    // allowed, and fails against NFC output consistently; do not rewrite it.
    [{ type: "string", pattern: "^e\\u0301$" }, composed, "skill-error"],
  ]) {
    const result = typedResultOf(returns, workResultFromSkillResult(skillSuccess(output)));
    assert.equal(result.kind, expectedKind);
    assert.deepEqual(result.codomainAssay.returns, returns);
    assert.deepEqual(admitAgencyWorkResult(result), result);
    assert.deepEqual(admitAgencyWorkResult(roundtrip(result)), result);
    assert.deepEqual(typedResultOf(returns, result), result);
  }
});

test("native codomain transport conservatively refuses non-NFC annotations too", () => {
  const returns = { type: "integer", description: decomposed };
  const raw = workResultFromSkillResult(skillSuccess(1));
  assert.throws(() => typedResultOf(returns, raw), unstableCodomain);
  const projected = typedResultOf(returns, { kind: "skill-result", value: 1 });
  assert.equal(projected.kind, "skill-result", "annotation does not itself constrain legacy values");
  assert.throws(() => admitAgencyWorkResult({
    ...projected, skillOutcome: raw.skillOutcome,
    codomainAssay: { source: semanticId(raw.skillOutcome), returns },
  }), unstableCodomain);
});

test("legacy non-native assays retain the original literal Unicode schema semantics", () => {
  for (const [returns, value] of [
    [objectCodomain(decomposed), { [decomposed]: 1 }],
    [{ type: "string", const: decomposed }, decomposed],
    [{ type: "string", enum: [decomposed] }, decomposed],
    [{ type: "string", pattern: "^" + decomposed + "$" }, decomposed],
  ]) {
    const result = typedResultOf(returns, { kind: "skill-result", value });
    assert.equal(result.kind, "skill-result");
    assert.deepEqual(result.value, { returned: value });
    assert.equal(result.skillOutcome, undefined);
    assert.equal(result.codomainAssay, undefined);
  }
});

const extractedCases = [
  [{ type: "string", pattern: "^e\\u0301$" }, '"e\\u0301"', decomposed],
  [
    { type: "object", required: ["label"], additionalProperties: false,
      properties: { label: { type: "string", pattern: "^e\\u0301$" } } },
    ["```json", '{"label":"e\\u0301"}', "```"].join("\n"),
    { label: decomposed },
  ],
];
const unstableProjection = /native codomain projection is not stable/;

test("native assays refuse extracted JSON products that persistence would normalize", () => {
  for (const [returns, output] of extractedCases) {
    const raw = workResultFromSkillResult(skillSuccess(output));
    assert.deepEqual(raw.skillOutcome.output, output, "the ASCII native text itself is stable");
    assert.throws(() => typedResultOf(returns, raw), unstableProjection);
    assert.throws(() => typedResultOf(roundtrip(returns), roundtrip(raw)), unstableProjection);
  }
});

test("direct admission rejects both literal and already-normalized unstable extracted products", () => {
  for (const [returns, output, returned] of extractedCases) {
    const raw = workResultFromSkillResult(skillSuccess(output));
    const projected = typedResultOf(returns, { kind: "skill-result", value: output });
    assert.deepEqual(projected.value.returned, returned);
    const record = {
      ...projected, skillOutcome: raw.skillOutcome,
      codomainAssay: { source: semanticId(raw.skillOutcome), returns },
    };
    for (const candidate of [record, roundtrip(record), canonicalCarrier(record)]) {
      assert.throws(() => admitAgencyWorkResult(candidate), unstableProjection);
    }
  }
});

test("transport-stable extracted NFC and ASCII products survive native assay and replay", () => {
  for (const [returns, output, returned] of [
    [{ type: "string", const: composed }, '"\\u00e9"', composed],
    [{ type: "string", const: "ascii" }, '"ascii"', "ascii"],
    [
      { type: "object", required: ["label"], additionalProperties: false,
        properties: { label: { const: composed } } },
      ["```json", '{"label":"\\u00e9"}', "```"].join("\n"),
      { label: composed },
    ],
  ]) {
    const result = typedResultOf(returns, workResultFromSkillResult(skillSuccess(output)));
    assert.equal(result.kind, "skill-result");
    assert.deepEqual(result.value.returned, returned);
    assert.deepEqual(admitAgencyWorkResult(result), result);
    assert.deepEqual(admitAgencyWorkResult(roundtrip(result)), result);
    assert.deepEqual(typedResultOf(returns, result), result);
  }
});

test("legacy extraction keeps literal decoded code points without native transport admission", () => {
  for (const [returns, output, returned] of extractedCases) {
    const result = typedResultOf(returns, { kind: "skill-result", value: output });
    assert.equal(result.kind, "skill-result");
    assert.deepEqual(result.value.returned, returned);
    assert.equal(result.skillOutcome, undefined);
    assert.equal(result.codomainAssay, undefined);
  }
});
