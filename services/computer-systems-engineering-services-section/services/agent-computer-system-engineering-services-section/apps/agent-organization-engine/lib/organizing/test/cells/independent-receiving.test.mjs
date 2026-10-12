import assert from "node:assert/strict";
import test from "node:test";

import {
  affirmsReceiving,
  deniesReceiving,
  independentReceivingReceipt,
} from "../../src/cells/receiving.mjs";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

/** The receiving needs only the producer's receipt id, outcome, executed resource and completion time. */
function execution(ok = true, request = "request:1") {
  const invocation = {
    request,
    subject: "agent:producer",
    operation: "operation:bounded-work",
    resource: "work-item:bounded-work",
    observedAt: "2026-10-05T22:30:00.000Z",
  };
  return {
    id: semanticId({ invocation, ok }),
    ok,
    invocation,
    completedAt: "2026-10-05T22:30:01.000Z",
  };
}

function affirm(executionReceipt, receiver = "agent:receiver", subject = "work-item:bounded-work") {
  return affirmsReceiving(
    "issuer:receiver-readback",
    receiver,
    subject,
    executionReceipt.id,
    "2026-10-05T22:30:30.000Z",
    ["receiver:readback"],
  );
}

function draft(produced, overrides = {}) {
  const receiver = overrides.receiver ?? "agent:receiver";
  const subject = overrides.subject ?? "work-item:bounded-work";
  return {
    subject,
    producer: "agent:producer",
    receiver,
    execution: produced,
    sourceRef: "semioverse:receiving-set:bounded-work",
    sourceMode: "canonical",
    assertions: [affirm(produced, receiver, subject)],
    evidence: ["receiver:readback"],
    receivedAt: "2026-10-05T22:31:00.000Z",
    ...overrides,
  };
}

test("independent receiver can accept a successful producer execution", () => {
  const produced = execution(true);
  const receipt = independentReceivingReceipt(draft(produced));

  assert.equal(receipt.independent, true);
  assert.equal(receipt.valid, true);
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.acceptance, "held");
  assert.equal(receipt.affirmations.length, 1);
  assert.deepEqual(receipt.reasons, []);
});

test("producer cannot self-satisfy independent receiving", () => {
  const produced = execution(true);
  const receipt = independentReceivingReceipt(draft(produced, {
    receiver: "agent:producer",
    assertions: [affirm(produced, "agent:producer")],
  }));

  assert.equal(receipt.independent, false);
  assert.equal(receipt.valid, false);
  assert.equal(receipt.accepted, false);
  assert.equal(
    receipt.reasons.includes("producer-cannot-self-satisfy-independent-receiving"),
    true,
  );
});

test("independent receiver may deny or contest without rewriting producer history", () => {
  const produced = execution(true);
  const denied = independentReceivingReceipt(draft(produced, {
    assertions: [
      deniesReceiving(
        "issuer:receiver-readback",
        "agent:receiver",
        "work-item:bounded-work",
        produced.id,
        "2026-10-05T22:30:30.000Z",
      ),
    ],
  }));
  const contested = independentReceivingReceipt(draft(produced, {
    assertions: [
      affirm(produced),
      deniesReceiving(
        "issuer:counter-readback",
        "agent:receiver",
        "work-item:bounded-work",
        produced.id,
        "2026-10-05T22:30:31.000Z",
      ),
    ],
  }));

  assert.equal(denied.valid, true);
  assert.equal(denied.accepted, false);
  assert.equal(denied.acceptance, "denied");
  assert.equal(contested.valid, true);
  assert.equal(contested.accepted, false);
  assert.equal(contested.acceptance, "contested");
  assert.equal(denied.executionReceipt, produced.id);
  assert.equal(contested.executionReceipt, produced.id);
  assert.equal(produced.ok, true);
});

test("held receiving cannot close an execution that itself failed", () => {
  const produced = execution(false);
  const receipt = independentReceivingReceipt(draft(produced, {
    assertions: [affirm(produced)],
  }));

  assert.equal(receipt.executionOk, false);
  assert.equal(receipt.valid, false);
  assert.equal(receipt.accepted, false);
  assert.equal(
    receipt.reasons.includes("held-acceptance-cannot-close-failed-execution"),
    true,
  );
});

test("no exact receiving assertion remains UNKNOWN and non-closing", () => {
  const produced = execution(true);
  const receipt = independentReceivingReceipt(draft(produced, {
    assertions: [],
  }));

  assert.equal(receipt.valid, true);
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.acceptance, "unknown");
});

test("receiving is bound to the executed resource", () => {
  const produced = execution(true);
  const receipt = independentReceivingReceipt(draft(produced, {
    subject: "work-item:someone-else",
    assertions: [affirm(produced, "agent:receiver", "work-item:someone-else")],
  }));

  assert.equal(receipt.valid, false);
  assert.equal(receipt.accepted, false);
  assert.equal(
    receipt.reasons.includes("receiving-subject-does-not-match-executed-resource"),
    true,
  );
});

test("assertion for another receiver or execution receipt cannot be reused", () => {
  const produced = execution(true);
  const foreignExecution = execution(true, "request:2");

  const wrongReceiver = independentReceivingReceipt(draft(produced, {
    assertions: [affirm(produced, "agent:someone-else")],
  }));
  assert.equal(wrongReceiver.acceptance, "unknown");
  assert.equal(wrongReceiver.accepted, false);

  const wrongExecution = independentReceivingReceipt(draft(foreignExecution, {
    assertions: [affirm(produced)],
  }));
  assert.equal(wrongExecution.acceptance, "unknown");
  assert.equal(wrongExecution.accepted, false);
});

test("receiving cannot precede execution completion", () => {
  const produced = execution(true);
  const receipt = independentReceivingReceipt(draft(produced, {
    receivedAt: "2026-10-05T22:29:59.000Z",
  }));

  assert.equal(receipt.valid, false);
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.reasons.includes("receiving-precedes-execution-completion"), true);
});

test("receiving assertion set requires a source locator and admitted source mode", () => {
  const produced = execution(true);
  assert.throws(
    () => independentReceivingReceipt(draft(produced, { sourceRef: "" })),
    /receiving sourceRef/u,
  );
  assert.throws(
    () => independentReceivingReceipt(draft(produced, { sourceMode: "self-declared" })),
    /receiving sourceMode/u,
  );
});
