import assert from "node:assert/strict";
import test from "node:test";
import { admitSemioticAtom, PEBBLE_MODEL } from "../src/admit-semiotic-atom.mjs";

const judgment = (atomId, vertices, accepted) => ({ model: PEBBLE_MODEL, atomId, vertices, accepted, rejected: [] });

test("an atom advances only a causally closed cone with an accepted pebble judgment", () => {
  const result = admitSemioticAtom({
    position: { atoms: [{ id: "root", parentIds: [] }] },
    atom: { id: "reply", polarity: "opponent", parentIds: ["root"] },
    pebbleJudgment: judgment("reply", ["reply", "root"], [["root", "reply"]]),
  });
  assert.equal(result.admitted, true);
  assert.deepEqual(result.causalPast, ["root"]);
  assert.deepEqual(result.boundaryTransaction, {
    op: "add", e: "reply", a: "semiotic-voxel/causal-event",
    v: { polarity: "opponent", parentIds: ["root"], pebbleJudgment: PEBBLE_MODEL },
  });
  assert.equal(Object.isFrozen(result.position), true);
});

test("an atom cannot cite a cause beyond the current light cone", () => {
  const result = admitSemioticAtom({
    position: { atoms: [] }, atom: { id: "orphan", polarity: "proponent", parentIds: ["absent"] },
    pebbleJudgment: judgment("orphan", ["absent", "orphan"], [["absent", "orphan"]]),
  });
  assert.deepEqual(result, { kind: "semiotic-voxel-arena-refusal/v1", admitted: false, reason: "cause-outside-light-cone", detail: "absent" });
});

test("a rejected or out-of-cone contact cannot fabricate an atom", () => {
  const rejected = admitSemioticAtom({
    position: { atoms: [{ id: "root", parentIds: [] }] }, atom: { id: "bad", polarity: "proponent", parentIds: ["root"] },
    pebbleJudgment: { ...judgment("bad", ["bad", "root"], [["root", "bad"]]), rejected: [["root", "bad"]] },
  });
  assert.equal(rejected.reason, "unsettled-or-out-of-cone-pebble-judgment");
  const outOfCone = admitSemioticAtom({
    position: { atoms: [{ id: "root", parentIds: [] }] }, atom: { id: "bad", polarity: "proponent", parentIds: ["root"] },
    pebbleJudgment: judgment("bad", ["bad", "root"], [["root", "outside"], ["root", "bad"]]),
  });
  assert.equal(outOfCone.reason, "unsettled-or-out-of-cone-pebble-judgment");
});

test("a judgment over a different vertex set cannot stand in for the exact causal cone", () => {
  const result = admitSemioticAtom({
    position: { atoms: [{ id: "root", parentIds: [] }] },
    atom: { id: "reply", polarity: "opponent", parentIds: ["root"] },
    pebbleJudgment: judgment("reply", ["reply", "root", "outside"], [["root", "reply"]]),
  });
  assert.equal(result.reason, "unsettled-or-out-of-cone-pebble-judgment");
});
