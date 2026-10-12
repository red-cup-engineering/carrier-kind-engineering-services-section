/**
 * skillful-work — the nuclear quartet of an agent's work, read off its faces.
 *
 * The quartet's LOGIC comes from the gsu-ccs relational-machine spec (skillful-work /
 * inquiry / procedure / derivation / process); its IMPLEMENTATION is current-paradigm:
 * a bulk CONSOLIDATION on the agent, not a stored declaration. The two commuting nuclei
 * are read off the agent's two non-communicating faces — σ (meaning) = inside/knowing
 * settled (`cognition.reflects`), Δ (execution) = outside/playing settled
 * (`action.affordances === 0`). Pins: exactly four types in ≤_k order; the determination
 * IS relating's bilattice ≤_k; π = σ∘Δ reflects every unit into Process idempotently; and
 * the agent's `work` reading agrees with its own `cognition`/`action` fields.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { classifySkillfulWork, jointProjection, SKILLFUL_WORK_KINDS } from "../src/becoming/doing/working/governing/skillful-work.mjs";
import { agent } from "../src/becoming/doing/working/governing/agent.mjs";

test("the science determination coordinates classify all four work kinds", () => {
  const inquiry = classifySkillfulWork({ operation: "open", inputsAndPath: "open" });
  const derivation = classifySkillfulWork({ operation: "settled", inputsAndPath: "open" });
  const procedure = classifySkillfulWork({ operation: "open", inputsAndPath: "settled" });
  const process = classifySkillfulWork({ operation: "settled", inputsAndPath: "settled" });

  assert.deepEqual(
    [inquiry.closureKind, derivation.closureKind, procedure.closureKind, process.closureKind],
    ["inquiry", "derivation", "procedure", "process"],
  );
  // the four kinds are exhaustive (no fifth) and ordered ⊥ → ⊤
  assert.deepEqual(SKILLFUL_WORK_KINDS, ["inquiry", "derivation", "procedure", "process"]);

  assert.deepEqual(
    [inquiry.operation, derivation.operation, procedure.inputsAndPath, process.inputsAndPath],
    ["open", "settled", "settled", "settled"],
  );
  // every reading is the native agent-work kind, not a separate carrier
  assert.equal(process.kind, "animating.agent.work");
});

test("settling operation and inputs/path reflects each work unit into Process", () => {
  for (const operation of ["open", "settled"]) {
    for (const inputsAndPath of ["open", "settled"]) {
      const work = classifySkillfulWork({ operation, inputsAndPath });
      const projected = jointProjection(work);
      assert.equal(projected.closureKind, "process");
      assert.deepEqual(jointProjection(projected), projected);
    }
  }
});

test("the agent's work type is CONSOLIDATED from its inside/outside faces", () => {
  const a = agent("the-sky|is-blue", { goal: { predicate: "is-blue", reading: "potential" } });

  assert.equal(a.work.kind, "animating.agent.work");
  assert.ok(SKILLFUL_WORK_KINDS.includes(a.work.closureKind));
  assert.equal(a.work.operation, a.cognition.reflects ? "settled" : "open");
  assert.equal(a.work.inputsAndPath, a.action.affordances === 0 ? "settled" : "open");
  // and the consolidated reading equals an independent classification of those two signals
  const expected = classifySkillfulWork({
    operation: a.cognition.reflects ? "settled" : "open",
    inputsAndPath: a.action.affordances === 0 ? "settled" : "open",
  });
  assert.deepEqual(a.work, expected);
});
