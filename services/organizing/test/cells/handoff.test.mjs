import assert from "node:assert/strict";
import test from "node:test";

import { assayAgentHandoff } from "../../src/cells/handoff.mjs";

function validHandoff() {
  return {
    mode: "transfer",
    epoch: 7,
    epochSourceRef: "semioverse:handoff-epoch:fixture",
    sourceMode: "canonical",
    predecessor: "cell:old",
    successor: "cell:new",
    subject: "work-item:fixture",
    witnesses: [{
      kind: "organizing.cell.handoff-witness",
      ref: "receipt:handoff:7",
      sourceRef: "semioverse:handoff-witness:7",
      sourceMode: "canonical",
      epoch: 7,
      predecessor: "cell:old",
      successor: "cell:new",
      subject: "work-item:fixture",
      evidence: ["receipt:handoff:7"],
    }],
  };
}

test("exact sourced handoff witness admits the transfer", () => {
  const reading = assayAgentHandoff(validHandoff(), {
    expectedSuccessor: "cell:new",
    expectedSubject: "work-item:fixture",
  });
  assert.equal(reading.ok, true);
  assert.deepEqual(reading.obstructions, []);
});

test("handoff epoch is a positive safe integer", () => {
  for (const epoch of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const reading = assayAgentHandoff({
      ...validHandoff(),
      epoch,
    });
    assert.equal(reading.ok, false);
    assert.equal(reading.obstructions.includes("handoff-epoch-invalid"), true);
  }
});

test("witness for another epoch does not satisfy the transfer", () => {
  const handoff = validHandoff();
  const reading = assayAgentHandoff({
    ...handoff,
    epoch: 8,
  });
  assert.equal(reading.obstructions.includes("handoff-unwitnessed"), true);
});

test("wrong successor or subject cannot be repurposed locally", () => {
  const handoff = validHandoff();
  const successor = assayAgentHandoff(handoff, {
    expectedSuccessor: "cell:someone-else",
    expectedSubject: "work-item:fixture",
  });
  assert.equal(successor.obstructions.includes("handoff-successor-mismatch"), true);

  const subject = assayAgentHandoff(handoff, {
    expectedSuccessor: "cell:new",
    expectedSubject: "work-item:someone-else",
  });
  assert.equal(subject.obstructions.includes("handoff-subject-mismatch"), true);
});

test("source-free witness strings are not a handoff", () => {
  const reading = assayAgentHandoff({
    mode: "transfer",
    epoch: 7,
    epochSourceRef: "semioverse:handoff-epoch:fixture",
    sourceMode: "canonical",
    predecessor: "cell:old",
    successor: "cell:new",
    subject: "work-item:fixture",
    witnesses: [],
  });
  assert.equal(reading.obstructions.includes("handoff-unwitnessed"), true);
});

test("exact sourced lease may substitute for a witness", () => {
  const reading = assayAgentHandoff({
    mode: "transfer",
    epoch: 9,
    epochSourceRef: "semioverse:handoff-epoch:fixture",
    sourceMode: "canonical",
    predecessor: "cell:old",
    successor: "cell:new",
    subject: "work-item:fixture",
    lease: {
      kind: "organizing.cell.handoff-lease",
      ref: "lease:9",
      sourceRef: "semioverse:handoff-lease:9",
      sourceMode: "canonical",
      epoch: 9,
      holder: "cell:new",
      subject: "work-item:fixture",
      evidence: ["lease:9"],
    },
  }, {
    expectedSuccessor: "cell:new",
    expectedSubject: "work-item:fixture",
  });
  assert.equal(reading.ok, true);
});


test("canonical handoff cannot be satisfied by a degraded witness or lease", () => {
  const handoff = validHandoff();
  const degradedWitness = assayAgentHandoff({
    ...handoff,
    witnesses: [{
      ...handoff.witnesses[0],
      sourceMode: "degraded-projection",
    }],
  });
  assert.equal(degradedWitness.obstructions.includes("handoff-unwitnessed"), true);

  const degradedLease = assayAgentHandoff({
    mode: "transfer",
    epoch: 10,
    epochSourceRef: "semioverse:handoff-epoch:10",
    sourceMode: "canonical",
    predecessor: "cell:old",
    successor: "cell:new",
    subject: "work-item:fixture",
    lease: {
      kind: "organizing.cell.handoff-lease",
      ref: "lease:10",
      sourceRef: "github:handoff-lease:10",
      sourceMode: "degraded-projection",
      epoch: 10,
      holder: "cell:new",
      subject: "work-item:fixture",
      evidence: ["lease:10"],
    },
  });
  assert.equal(degradedLease.obstructions.includes("handoff-unwitnessed"), true);
});
