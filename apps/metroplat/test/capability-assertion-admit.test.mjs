import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  admitInfographCapabilityAssertion,
  capabilityAssertionOperations,
} from "@red-cup-engineering/metroplat/operations/capability";
import { readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";

const AT = "2026-09-04T12:00:00.000Z";

function fixture() {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-capability-assertion-admit-"));
  return { dataRoot, binding: Object.freeze({ dataRoot, now: () => AT }) };
}

test("capabilityAssertionOperations wires exactly one journal-write catalog operation", () => {
  const { dataRoot, binding } = fixture();
  try {
    const operations = capabilityAssertionOperations(binding);
    assert.equal(operations.length, 1);
    assert.equal(operations[0].verb, "capability-assertion-admit");
    assert.equal(operations[0].effects.class, "journal-write");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("admitInfographCapabilityAssertion admits grants for one holder and reports held standing", () => {
  const { dataRoot, binding } = fixture();
  try {
    const admission = admitInfographCapabilityAssertion(
      binding,
      { holder: "urn:gateway:asserted-actor", grants: ["infograph#milestone", "infograph#work-item"] },
      AT,
    );
    assert.equal(admission.kind, "metroplat.infograph.capability-assertion-admission");
    assert.equal(admission.holder, "urn:gateway:asserted-actor");
    assert.deepEqual(admission.assertions.map((assertion) => assertion.grants).sort(), ["infograph#milestone", "infograph#work-item"]);
    assert.deepEqual(admission.standing.map((standing) => standing.value), ["held", "held"]);
    assert.equal(readCapabilityAssertions(dataRoot).length, 2);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("admitInfographCapabilityAssertion refuses input missing a required field", () => {
  const { dataRoot, binding } = fixture();
  try {
    assert.throws(() => admitInfographCapabilityAssertion(binding, { holder: "urn:gateway:actor" }, AT), /capability assertion admission/u);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
