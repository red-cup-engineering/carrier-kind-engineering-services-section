import assert from "node:assert/strict";
import test from "node:test";
import atomSchema from "../content/schemas/semiotic-atom.schema.json" with { type: "json" };
import { admitSemioticAtom, PEBBLE_MODEL } from "../src/admit-semiotic-atom.mjs";

const judgment = (atomId, vertices, accepted) => ({ model: PEBBLE_MODEL, atomId, vertices, accepted, rejected: [] });
const ni = (character) => `ni:///sha-256;${character.repeat(43)}`;
const ROOT = ni("A");
const REPLY = ni("B");
const OUTSIDE = ni("C");
const OTHER = ni("D");
const NEXT = ni("E");
const atom = (id, polarity = "proponent", parentIds = []) => ({ id, polarity, parentIds });

test("the exported schema normatively fixes the network atom record and exact NI shape", () => {
  assert.deepEqual(atomSchema.required, ["id", "polarity", "parentIds"]);
  assert.equal(atomSchema.additionalProperties, false);
  const idPattern = new RegExp(atomSchema.properties.id.pattern, "u");
  assert.equal(idPattern.test(ROOT), true);
  assert.equal(idPattern.test("root"), false);
  assert.equal(idPattern.test(`${ROOT}=`), false);
  assert.equal(atomSchema.properties.parentIds.uniqueItems, true);
});

test("an atom advances only a causally closed cone with an accepted pebble judgment", () => {
  const result = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] },
    atom: atom(REPLY, "opponent", [ROOT]),
    pebbleJudgment: judgment(REPLY, [REPLY, ROOT], [[ROOT, REPLY]]),
  });
  assert.equal(result.admitted, true);
  assert.deepEqual(result.causalPast, [ROOT]);
  assert.deepEqual(result.boundaryTransaction, {
    op: "add", e: REPLY, a: "semiotic-voxel/causal-event",
    v: { polarity: "opponent", parentIds: [ROOT], pebbleJudgment: PEBBLE_MODEL },
  });
  assert.equal(Object.isFrozen(result.position), true);
});

test("client labels and malformed atom or parent identities are refused", () => {
  for (const candidate of [
    atom("reply", "opponent", [ROOT]),
    atom(REPLY, "opponent", ["root"]),
    atom("ni:///sha-256;short", "opponent", [ROOT]),
    atom(`${REPLY}=`, "opponent", [ROOT]),
    { ...atom(REPLY, "opponent", [ROOT]), label: "reply" },
  ]) {
    const result = admitSemioticAtom({
      position: { atoms: [atom(ROOT)] },
      atom: candidate,
      pebbleJudgment: judgment(candidate.id, [candidate.id, ...candidate.parentIds], []),
    });
    assert.equal(result.reason, "invalid-atom");
  }

  const malformedPosition = admitSemioticAtom({
    position: { atoms: [atom("root")] },
    atom: atom(REPLY),
    pebbleJudgment: judgment(REPLY, [REPLY], [[REPLY, REPLY]]),
  });
  assert.equal(malformedPosition.reason, "invalid-position");
});

test("duplicate, reflexive, and out-of-cone parents retain their boundary refusals", () => {
  const duplicateParent = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] },
    atom: atom(REPLY, "opponent", [ROOT, ROOT]),
    pebbleJudgment: judgment(REPLY, [REPLY, ROOT], [[ROOT, REPLY]]),
  });
  assert.equal(duplicateParent.reason, "invalid-atom");

  const duplicateAtom = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] },
    atom: atom(ROOT, "opponent"),
    pebbleJudgment: judgment(ROOT, [ROOT], [[ROOT, ROOT]]),
  });
  assert.equal(duplicateAtom.reason, "duplicate-or-reflexive-atom");

  const reflexive = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] },
    atom: atom(REPLY, "opponent", [REPLY]),
    pebbleJudgment: judgment(REPLY, [REPLY], [[REPLY, REPLY]]),
  });
  assert.equal(reflexive.reason, "duplicate-or-reflexive-atom");

  const outside = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] },
    atom: atom(REPLY, "opponent", [OUTSIDE]),
    pebbleJudgment: judgment(REPLY, [REPLY, OUTSIDE], [[OUTSIDE, REPLY]]),
  });
  assert.deepEqual(outside, {
    kind: "semiotic-voxel-arena-refusal/v1",
    admitted: false,
    reason: "cause-outside-light-cone",
    detail: OUTSIDE,
  });
});

test("topological admission reconstructs the complete causal past and rejects an unordered position", () => {
  const admitted = admitSemioticAtom({
    position: { atoms: [atom(ROOT), atom(REPLY, "opponent", [ROOT])] },
    atom: atom(NEXT, "proponent", [REPLY]),
    pebbleJudgment: judgment(NEXT, [NEXT, REPLY, ROOT], [[REPLY, NEXT]]),
  });
  assert.equal(admitted.admitted, true);
  assert.deepEqual(admitted.causalPast, [ROOT, REPLY].sort());

  const unordered = admitSemioticAtom({
    position: { atoms: [atom(REPLY, "opponent", [ROOT]), atom(ROOT)] },
    atom: atom(NEXT, "proponent", [REPLY]),
    pebbleJudgment: judgment(NEXT, [NEXT, REPLY, ROOT], [[REPLY, NEXT]]),
  });
  assert.equal(unordered.reason, "invalid-position");
});

test("an atom cannot cite a cause beyond the current light cone", () => {
  const result = admitSemioticAtom({
    position: { atoms: [] }, atom: atom(REPLY, "proponent", [OUTSIDE]),
    pebbleJudgment: judgment(REPLY, [OUTSIDE, REPLY], [[OUTSIDE, REPLY]]),
  });
  assert.deepEqual(result, { kind: "semiotic-voxel-arena-refusal/v1", admitted: false, reason: "cause-outside-light-cone", detail: OUTSIDE });
});

test("a rejected or out-of-cone contact cannot fabricate an atom", () => {
  const rejected = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] }, atom: atom(REPLY, "proponent", [ROOT]),
    pebbleJudgment: { ...judgment(REPLY, [REPLY, ROOT], [[ROOT, REPLY]]), rejected: [[ROOT, REPLY]] },
  });
  assert.equal(rejected.reason, "unsettled-or-out-of-cone-pebble-judgment");
  const outOfCone = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] }, atom: atom(REPLY, "proponent", [ROOT]),
    pebbleJudgment: judgment(REPLY, [REPLY, ROOT], [[ROOT, OUTSIDE], [ROOT, REPLY]]),
  });
  assert.equal(outOfCone.reason, "unsettled-or-out-of-cone-pebble-judgment");
});

test("a judgment over a different vertex set cannot stand in for the exact causal cone", () => {
  const result = admitSemioticAtom({
    position: { atoms: [atom(ROOT)] },
    atom: atom(REPLY, "opponent", [ROOT]),
    pebbleJudgment: judgment(REPLY, [REPLY, ROOT, OTHER], [[ROOT, REPLY]]),
  });
  assert.equal(result.reason, "unsettled-or-out-of-cone-pebble-judgment");
});
