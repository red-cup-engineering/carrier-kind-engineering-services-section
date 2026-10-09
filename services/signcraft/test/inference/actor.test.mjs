import { test } from "node:test";
import assert from "node:assert/strict";
import { readingAt } from "../../src/inference/nuclei.mjs";
import { makeMachineState, runMachineAction } from "../../src/inference/kernel.mjs";

const input = {
  objects: ["penguin", "robin"],
  attributes: ["bird", "flies"],
  incidencePairs: [["penguin", "bird"], ["robin", "bird"], ["robin", "flies"]],
  denialPairs: [["penguin", "flies"]],
};

test("machine actions are replayable immutable transitions with explicit capabilities", () => {
  const initial = makeMachineState(input);
  const charged = runMachineAction(initial, { kind: "tell", object: "new", attribute: "bird", reading: "potential" });
  assert.equal(readingAt(initial.v, "new", "bird"), "absurd");
  assert.equal(readingAt(charged.state.v, "new", "bird"), "potential");

  const first = runMachineAction(charged.state, { kind: "settle" });
  const replay = runMachineAction(charged.state, { kind: "settle" });
  assert.deepEqual([...first.state.v], [...replay.state.v]);
  assert.equal(first.effects.length, 0);

  const refused = runMachineAction(first.state, { kind: "generate", object: "new", random: 1 });
  assert.deepEqual(refused.result, { kind: "refusal", code: "invalid-random", message: "generate requires random in [0, 1)" });
});
