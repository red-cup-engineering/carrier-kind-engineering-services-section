import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { address, cell, triple } from "@red-cup-engineering/signcell/cell";
import { derivation, fireRule, fireRuleIn, rule, step } from "@red-cup-engineering/signchain/rules";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { closureOrbit, evidenceIn, relate, settleCells, settlementAdmits } from "../src/settle.mjs";

const premise = cell("job", "has", "input", { for: ["observed"], against: ["disputed"] });
const conclusion = triple(cell("job", "can", "plan"));
const make = (atLeast = "potential", reading = "potential", name = "advance", target = conclusion) =>
  rule(name, [{ cell: triple(premise), atLeast }], { cell: target, reading });
// Captured by the original, admitted PR31 implementation, before the witness-format change.
const legacy = JSON.parse(readFileSync(new URL("./fixtures/legacy-rule-witness-settlement.json", import.meta.url)));

test("a derivation binds the complete rule while retaining label and ordered premise addresses", () => {
  const original = make();
  const variants = [make("active"), make("potential", "active"), make("potential", "potential", "advance", triple(cell("job", "can", "analyze")))];
  const witness = derivation(original);
  assert.equal(witness.rule, "advance");
  assert.deepEqual(witness.from, [address(premise)]);
  assert.equal(witness.ruleId, semanticId(original));
  assert.ok(Object.isFrozen(witness));
  assert.ok(Object.isFrozen(witness.from));
  for (const variant of variants) assert.notEqual(semanticId(derivation(variant)), semanticId(witness));
  const reordered = rule("ordered", [{ cell: conclusion, atLeast: "potential" }, { cell: triple(premise), atLeast: "potential" }], { cell: conclusion, reading: "potential" });
  assert.deepEqual(derivation(reordered).from, [address(conclusion), address(premise)]);
});

test("two simultaneously licensed thresholds keep two witnesses through composition and repeat firing", () => {
  const rules = [make("potential"), make("active")];
  const joined = relate(settleCells([], rules), settleCells([premise]));
  const witnesses = evidenceIn(joined.settled, "job", "can", "plan").for;
  assert.equal(witnesses.length, 2);
  assert.deepEqual(witnesses.map(w => w.ruleId).sort(), rules.map(semanticId).sort());
  assert.equal(joined.derivationVersion, 2);
  assert.equal(settlementAdmits(joined).admitted, true);
  assert.deepEqual(step(rules, joined.settled), joined.settled);
  assert.deepEqual(relate(joined, joined).settled, joined.settled);
  assert.ok(joined.settledAt <= joined.rules.length);
});

test("canonical coincident rules including NFC labels still contribute only one witness", () => {
  const rules = [make("potential", "potential", "caf\u00e9"), make("potential", "potential", "cafe\u0301")];
  assert.equal(semanticId(derivation(rules[0])), semanticId(derivation(rules[1])));
  const result = settleCells([premise], rules);
  assert.equal(evidenceIn(result.settled, "job", "can", "plan").for.length, 1);
  assert.equal(settlementAdmits(result).admitted, true);
});

test("version-2 replay rejects same-label rule substitution and marker downgrade or removal", () => {
  const settlement = settleCells([premise], [make("potential")]);
  assert.equal(settlement.derivationVersion, 2);
  const substituted = { ...settlement, rules: [make("active")] };
  assert.equal(settlementAdmits(substituted).admitted, false);
  assert.match(settlementAdmits(substituted).reason, /stage 1/);
  const { derivationVersion, ...unversioned } = settlement;
  for (const changed of [unversioned, { ...settlement, derivationVersion: 1 }]) {
    assert.notEqual(semanticId(changed), semanticId(settlement));
    assert.equal(settlementAdmits(changed).admitted, false);
  }
});

test("unversioned historical settlements replay unchanged without pretending to bind complete licenses", () => {
  const before = semanticId(legacy);
  assert.equal(legacy.derivationVersion, undefined);
  assert.equal(settlementAdmits(legacy).admitted, true);
  assert.equal(settlementAdmits({ ...legacy, derivationVersion: 1 }).admitted, true);
  // Historical identity only bound label/premise addresses: preserve that law, don't claim to repair it retroactively.
  assert.equal(settlementAdmits({ ...legacy, rules: [make("active")] }).admitted, true);
  assert.equal(semanticId(legacy), before);
  assert.equal(settlementAdmits({ ...legacy, derivationVersion: 2 }).admitted, false);
});

test("mixed-version composition retains the exact historical witness alongside the new complete-rule witness", () => {
  const historical = evidenceIn(legacy.settled, "job", "can", "plan").for[0];
  const joined = relate(legacy, settleCells([]));
  const witnesses = evidenceIn(joined.settled, "job", "can", "plan").for;
  assert.equal(joined.derivationVersion, 2);
  assert.equal(witnesses.length, 2);
  assert.ok(witnesses.some(w => semanticId(w) === semanticId(historical)));
  assert.ok(witnesses.some(w => w.ruleId === semanticId(legacy.rules[0])));
  assert.equal(settlementAdmits(joined).admitted, true);
});

test("unknown or malformed witness versions are refused, even for an empty rule set", () => {
  const empty = settleCells([]);
  assert.equal(settlementAdmits({ ...empty, derivationVersion: undefined }).admitted, false);
  for (const version of [null, "2", 0, 3, {}, []]) {
    assert.equal(settlementAdmits({ ...empty, derivationVersion: version }).admitted, false);
    assert.throws(() => closureOrbit([], [], version), /unsupported derivation version/);
    assert.throws(() => derivation(make(), version), /unsupported version/);
    assert.throws(() => fireRule(make(), [], version), /unsupported version/);
    assert.throws(() => fireRuleIn(make(), new Map(), version), /unsupported version/);
  }
});

test("only an own wire version selects the replay law", () => {
  const inheritedVersion = Object.assign(Object.create({ derivationVersion: 2 }), legacy);
  assert.equal(Object.hasOwn(inheritedVersion, "derivationVersion"), false);
  assert.equal(settlementAdmits(inheritedVersion).admitted, true);
  assert.equal(settlementAdmits({ ...legacy, derivationVersion: undefined }).admitted, false);
  assert.equal(settlementAdmits(settleCells([premise], [make()])).admitted, true);
});

// An empty orbit has no new witness that can distinguish the replay laws.
test("a version marker is not authentication even when both replay laws admit an empty orbit", () => {
  const current = settleCells([]);
  const { derivationVersion, ...legacyShape } = current;
  assert.equal(settlementAdmits(legacyShape).admitted, true);
  assert.notEqual(semanticId(legacyShape), semanticId(current));
});

test("direct and indexed rule firing agree for explicit historical and current witnesses", () => {
  const r = make();
  const index = new Map([[address(premise), premise]]);
  for (const version of [1, 2]) {
    const result = fireRule(r, [premise], version);
    assert.deepEqual(result, fireRuleIn(r, index, version));
    assert.deepEqual(result[0].for, [derivation(r, version)]);
  }
  assert.deepEqual(fireRule(r, [premise], 1)[0].for[0], { rule: "advance", from: [address(premise)] });
  assert.equal(fireRule(r, [premise])[0].for[0].ruleId, semanticId(r));
});
