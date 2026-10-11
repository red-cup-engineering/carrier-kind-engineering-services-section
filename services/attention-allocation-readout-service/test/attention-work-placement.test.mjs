import assert from "node:assert/strict";
import test from "node:test";
import { attentionAllocationOperations } from "../src/operations.mjs";
import { decideAttentionWorkPlacement } from "@red-cup-engineering/computer-inference-engine/dispatch/work-placement";

test("the existing provider operation family executes measured placement without host effects", async () => {
  const operations = attentionAllocationOperations();
  assert.deepEqual(operations.map(op => op.verb), ["attention-allocation", "attention-work-placement"]);
  const placement = operations.find(op => op.verb === "attention-work-placement");
  assert.deepEqual(placement.effects, { class: "pure", replay: "safe", coordination: "coordination-free", deterministic: true, totality: "partial" });
  const input = { budget: { amount: 0, unit: "review-slot", evidence: "urn:capacity:fixture" }, candidates: [] };
  assert.deepEqual(await placement.execute(input), decideAttentionWorkPlacement(input));
  assert.equal((await placement.execute(input)).observedRemoval, null);
  assert.throws(() => placement.execute({ ...input, budget: { ...input.budget, amount: 0.5 } }), /safe integer/u);
});

test("the existing scalar attention readout remains available unchanged", async () => {
  const operation = attentionAllocationOperations().find(op => op.verb === "attention-allocation");
  const out = await operation.execute({ budget: 1, obstructions: [{ id: "a", cost: 1, benefit: 1 }] });
  assert.deepEqual(out.readNext, ["a"]);
  assert.equal(out.type, "AttentionAllocation");
});

