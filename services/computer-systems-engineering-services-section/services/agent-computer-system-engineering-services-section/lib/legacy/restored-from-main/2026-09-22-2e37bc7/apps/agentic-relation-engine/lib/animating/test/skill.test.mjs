/**
 * skill — the single agent's skillful-work execution kernel.
 *
 * The quartet's LOGIC (gsu-ccs skills / skill-result) made into a real capability: a typed
 * Skill you can invoke, an invocation that ALWAYS returns a SkillResult under the type's
 * contract, error as first-class bilattice-grounded state, and the quartet algebra as an
 * executable law (the two paths to Process commute).
 */
import test from "node:test";
import assert from "node:assert/strict";

import { skill, invokeSkill, skillSuccess, skillError } from "../src/becoming/doing/working/governing/skill.mjs";
import { advanceMeaning, advanceExecution, jointProjection, classifySkillfulWork } from "../src/becoming/doing/working/governing/skillful-work.mjs";

test("a Skill carries the science-owned determination coordinates", () => {
  const proc = skill("route-prompt", "procedure", "NamedOutput");
  assert.deepEqual(
    [proc.operation, proc.inputsAndPath],
    ["open", "settled"],
  );
  const deriv = skill("critique-unit", "derivation", "Judgment");
  assert.deepEqual([deriv.operation, deriv.inputsAndPath], ["settled", "open"]);
});

test("invokeSkill always returns a SkillResult — success carries a classical charge", () => {
  const s = skill("name-unit", "process", "Name");
  const ok = invokeSkill(s, "the-input", (i) => `${i}!`);
  assert.equal(ok.ok, true);
  assert.equal(ok.output, "the-input!");
  assert.ok(ok.charge === "potential" || ok.charge === "active"); // a CLASSICAL (settled) corner
  assert.equal(ok.error, undefined);
});

test("error is first-class state on the NON-CLASSICAL corners — absence ⊥, contradiction ⊤", () => {
  const s = skill("name-unit", "process", "Name");

  // missing input → MissingInput, ⊥ absurd (told-nothing)
  const missing = invokeSkill(s, null, () => "x");
  assert.equal(missing.ok, false);
  assert.equal(missing.error.errorClass, "MissingInput");
  assert.equal(missing.charge, "absurd");

  // perform throws → UnexpectedState, ⊤ stable (the world contradicts the assumption)
  const threw = invokeSkill(s, "in", () => { throw new Error("file gone"); });
  assert.equal(threw.error.errorClass, "UnexpectedState");
  assert.equal(threw.charge, "stable");
  assert.match(threw.error.message, /file gone/);
});

test("the empty-outcome rule is per-type: Derivation/Inquiry → Unresolvable, Process → UnexpectedState", () => {
  const deriv = skill("classify", "derivation", "Judgment");
  const inq = skill("explore", "inquiry", "Output");
  const proc = skill("emit", "process", "Output");

  assert.equal(invokeSkill(deriv, "in", () => null).error.errorClass, "Unresolvable");
  assert.equal(invokeSkill(inq, "in", () => undefined).error.errorClass, "Unresolvable");
  assert.equal(invokeSkill(proc, "in", () => null).error.errorClass, "UnexpectedState");
});

test("a Procedure propagates a sub-skill's SkillError instead of swallowing it", () => {
  const subFailure = skillError("SkillNotFound", "no such skill", "sub(x)");
  const procedure = skill("dispatch", "procedure", "NamedOutput");
  // the procedure's perform dispatches to a sub-skill that returns an error result
  const result = invokeSkill(procedure, "in", () => subFailure);
  assert.equal(result.ok, false);
  assert.equal(result.error.errorClass, "SkillNotFound"); // propagated verbatim, not re-wrapped
});

test("the quartet algebra is executable: both nucleus-paths commute to Process", () => {
  const inquiry = classifySkillfulWork({ operation: "open", inputsAndPath: "open" });

  // Inquiry → Derivation → Process  vs  Inquiry → Procedure → Process
  const viaMeaning = advanceExecution(advanceMeaning(inquiry)); // close σ then Δ
  const viaExecution = advanceMeaning(advanceExecution(inquiry)); // close Δ then σ
  assert.equal(viaMeaning.closureKind, "process");
  assert.equal(viaExecution.closureKind, "process");
  assert.deepEqual(viaMeaning, viaExecution); // σ∘Δ = Δ∘σ — commutativity, the quartet's hinge
  assert.deepEqual(viaMeaning, jointProjection(inquiry)); // and both equal π

  // one nucleus is a real one-step climb, not a jump to the top
  assert.equal(advanceMeaning(inquiry).closureKind, "derivation");
  assert.equal(advanceExecution(inquiry).closureKind, "procedure");
});

// QUARANTINED (2026-08-21 API-drift repair): the two tests formerly here exercised
// ./skill-induction.mjs, which imports an unreachable relating subpath
// ("@red-cup-engineering/relating/services/filesystem-store" — shipped in relating's
// dist but not exposed in its package.json exports map). That module is excluded from
// the build and dropped from governing's barrel; see its own file for detail.
