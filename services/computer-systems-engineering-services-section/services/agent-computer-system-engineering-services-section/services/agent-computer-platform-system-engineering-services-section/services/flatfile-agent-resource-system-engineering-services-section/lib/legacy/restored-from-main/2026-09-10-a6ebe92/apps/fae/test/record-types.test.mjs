import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { identityOfRecord } from "../src/kernel/identity.mjs";
import {
  TIER_B_RECORD_TYPES,
  correctionRecord,
  observation,
  office,
  officerInstallation,
  session,
  statusEvent,
  statusEventAncestors,
  validateRecord,
  verifyRecords,
} from "../src/kernel/record-types.mjs";

const VECTORS_PATH = fileURLToPath(new URL("../../../lib/conformance/record-vectors.json", import.meta.url));
const { vectors, support } = JSON.parse(readFileSync(VECTORS_PATH, "utf8"));
const OWNED_VECTORS = vectors.filter((vector) => vector.type !== "Witness");

const WITNESS_A = { id: "ni:///sha-256;RBNvo1WzZ4oRRq0W9-hknpT7T8If536DEMBg9hyq_4o", type: "Witness", kind: "guard" };
const WITNESS_B = { id: "ni:///sha-256;7vRnQa38Op92KU07ePN6RfETCSrJ1E7nfHoDioj_CaE", type: "Witness", kind: "accounting" };
const WITNESS_WRONG_KIND = { id: "ni:///sha-256;QyWM_3g_5wNtikMDP4MK38YOwDc4JHNUisdCuIgpJ3c", type: "Witness", kind: "conversation" };

for (const vector of OWNED_VECTORS) {
  test(`shared vector ${vector.name}: valid record is accepted and id round-trips`, () => {
    assert.equal(validateRecord(vector.valid), vector.valid);
    assert.equal(vector.valid.id, identityOfRecord(vector.valid));
  });

  test(`shared vector ${vector.name}: invalid record is rejected`, () => {
    assert.throws(() => validateRecord(vector.invalid));
  });
}

test("all seven Tier B types are covered by the shared vectors", () => {
  assert.deepEqual(
    [...new Set(vectors.map((vector) => vector.type))].sort(),
    ["CorrectionRecord", "Observation", "Office", "OfficerInstallation", "Session", "StatusEvent", "Witness"]
  );
});

test("verifyRecords cross-validates every shared valid vector together", () => {
  const records = [...vectors.map((vector) => vector.valid), support.guardWitness];
  const report = verifyRecords(records);
  assert.equal(report.ok, true);
  assert.equal(report.records, records.length);
});

test("each Tier B constructor round-trips id = identity(body \\ id)", () => {
  const off = office({ slug: "steward", scope: "corpus", duties: ["keep-the-log"] });
  const built = [
    observation({ accord: "accord/memory", proposition: "p", witness_id: WITNESS_A.id, agent: "urn:agent:alice" }),
    correctionRecord({ target: off.id, replacement: off.id, reason: "typo" }),
    statusEvent({ target: off.id, transition: "correction" }),
    off,
    officerInstallation({ office: off.id, officer: "urn:agent:alice", as_role: "steward", constitution: "constitution:steward-v1", authorizing_act: WITNESS_A.id }),
    session({ office: off.id }),
  ];
  for (const record of built) {
    assert.equal(record.id, identityOfRecord(record));
    assert.equal(validateRecord(record), record);
  }
});

test("validateRecord rejects a tampered body", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  assert.throws(() => validateRecord({ ...off, slug: "tampered" }), /content identity mismatch/);
});

test("validateRecord rejects an unsupported record type", () => {
  assert.throws(() => validateRecord({ id: WITNESS_A.id, type: "NotARealType" }), /unsupported Tier B record type/);
});

function withComputedId(body) {
  return { id: identityOfRecord(body), ...body };
}

test("CorrectionRecord fails validation when invalidates_prior_for_use is missing", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const record = withComputedId({ type: "CorrectionRecord", target: off.id, replacement: off.id, reason: "typo" });
  assert.throws(() => validateRecord(record), /prior use must be invalidated/);
});

test("StatusEvent fails validation when conveys_authority is missing", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const record = withComputedId({ type: "StatusEvent", target: off.id, transition: "correction", supersedes: null, successor: null });
  assert.throws(() => validateRecord(record), /cannot convey authority/);
});

test("Office fails validation when conveys_incumbency is missing", () => {
  const record = withComputedId({ type: "Office", slug: "steward", duties: [], powers: [], privileges: [], immunities: [], scope: "corpus" });
  assert.throws(() => validateRecord(record), /does not install an officer/);
});

test("OfficerInstallation fails validation when conveys_authority is missing", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const record = withComputedId({ type: "OfficerInstallation", office: off.id, officer: "urn:agent:alice", as_role: "steward", constitution: "c", authorizing_act: WITNESS_A.id });
  assert.throws(() => validateRecord(record), /installation must convey authority/);
});

test("only OfficerInstallation may set conveys_authority: true", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const forged = withComputedId({ type: "StatusEvent", target: off.id, transition: "correction", supersedes: null, successor: null, conveys_authority: true });
  assert.throws(() => validateRecord(forged), /only OfficerInstallation may convey authority/);
});

test("Session rejects an unknown memory-bank section", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const record = session({ office: off.id, sections: { bogus: "" } });
  assert.throws(() => validateRecord(record), /unknown section/);
});

test("Session rejects a missing memory-bank section", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const record = session({ office: off.id });
  const { progress, ...withoutProgress } = record.sections;
  const tampered = withComputedId({ type: "Session", office: record.office, sections: withoutProgress });
  assert.throws(() => validateRecord(tampered), /missing section/);
});

test("Session requires sections.custom to be an object", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const record = session({ office: off.id, sections: { custom: "not an object" } });
  assert.throws(() => validateRecord(record), /sections.custom: must be an object/);
});

test("Session accepts a null office and needs no resolution", () => {
  const record = session();
  assert.equal(validateRecord(record), record);
  const report = verifyRecords([record]);
  assert.equal(report.ok, true);
});

test("verifyRecords resolves Observation.witness_id to an existing Witness", () => {
  const obs = observation({ accord: "a", proposition: "p", witness_id: WITNESS_A.id, agent: "urn:agent:alice" });
  const report = verifyRecords([WITNESS_A, obs]);
  assert.equal(report.ok, true);
  assert.equal(report.byType.Observation, 1);
});

test("verifyRecords rejects an Observation whose witness_id does not resolve", () => {
  const obs = observation({ accord: "a", proposition: "p", witness_id: WITNESS_A.id, agent: "urn:agent:alice" });
  assert.throws(() => verifyRecords([obs]), /unresolved Witness/);
});

test("verifyRecords requires a CorrectionRecord's target and replacement to be the same type", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const obs = observation({ accord: "a", proposition: "p", witness_id: WITNESS_A.id, agent: "urn:agent:alice" });
  const correction = correctionRecord({ target: off.id, replacement: obs.id, reason: "wrong type" });
  assert.throws(() => verifyRecords([WITNESS_A, off, obs, correction]), /not the same type/);
});

test("verifyRecords chains StatusEvent.supersedes to a prior event on the same target", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const first = statusEvent({ target: off.id, transition: "suspension" });
  const second = statusEvent({ target: off.id, transition: "reinstatement", supersedes: first.id });
  const report = verifyRecords([off, first, second]);
  assert.equal(report.ok, true);
});

test("verifyRecords rejects a StatusEvent.supersedes pointing at a different target", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const otherOff = office({ slug: "other", scope: "corpus" });
  const first = statusEvent({ target: off.id, transition: "suspension" });
  const second = statusEvent({ target: otherOff.id, transition: "reinstatement", supersedes: first.id });
  assert.throws(() => verifyRecords([off, otherOff, first, second]), /same target/);
});

test("verifyRecords accepts a three-hop StatusEvent.supersedes chain", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const first = statusEvent({ target: off.id, transition: "suspension" });
  const second = statusEvent({ target: off.id, transition: "reinstatement", supersedes: first.id });
  const third = statusEvent({ target: off.id, transition: "revocation", supersedes: second.id });
  const report = verifyRecords([off, first, second, third]);
  assert.equal(report.ok, true);
});

test("statusEventAncestors walks a forward-only chain without error", () => {
  const index = new Map([
    ["a", { id: "a", type: "StatusEvent", target: "t", supersedes: null }],
    ["b", { id: "b", type: "StatusEvent", target: "t", supersedes: "a" }],
    ["c", { id: "c", type: "StatusEvent", target: "t", supersedes: "b" }],
  ]);
  assert.doesNotThrow(() => statusEventAncestors(index, index.get("c")));
});

test("statusEventAncestors rejects a direct two-node cycle", () => {
  const index = new Map([
    ["a", { id: "a", type: "StatusEvent", target: "t", supersedes: "b" }],
    ["b", { id: "b", type: "StatusEvent", target: "t", supersedes: "a" }],
  ]);
  assert.throws(() => statusEventAncestors(index, index.get("a")), /not acyclic/);
});

test("statusEventAncestors rejects a longer cycle", () => {
  const index = new Map([
    ["a", { id: "a", type: "StatusEvent", target: "t", supersedes: "b" }],
    ["b", { id: "b", type: "StatusEvent", target: "t", supersedes: "c" }],
    ["c", { id: "c", type: "StatusEvent", target: "t", supersedes: "a" }],
  ]);
  assert.throws(() => statusEventAncestors(index, index.get("a")), /not acyclic/);
});

test("validateRecord requires a supersession StatusEvent to name a successor", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const record = statusEvent({ target: off.id, transition: "supersession" });
  assert.throws(() => validateRecord(record), /requires a successor/);
});

test("verifyRecords resolves OfficerInstallation's office and requires a guard/accounting authorizing act", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const install = officerInstallation({ office: off.id, officer: "urn:agent:alice", as_role: "steward", constitution: "c", authorizing_act: WITNESS_B.id });
  const report = verifyRecords([off, WITNESS_B, install]);
  assert.equal(report.ok, true);
});

test("verifyRecords rejects an OfficerInstallation authorized by a witness of the wrong kind", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const install = officerInstallation({ office: off.id, officer: "urn:agent:alice", as_role: "steward", constitution: "c", authorizing_act: WITNESS_WRONG_KIND.id });
  assert.throws(() => verifyRecords([off, WITNESS_WRONG_KIND, install]), /guard or accounting witness/);
});

test("verifyRecords resolves Session.office", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const sess = session({ office: off.id });
  const report = verifyRecords([off, sess]);
  assert.equal(report.ok, true);
});

test("verifyRecords rejects a duplicate content identity", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  assert.throws(() => verifyRecords([off, { ...off }]), /duplicate content identity/);
});

for (const [type, field] of [
  ["Observation", "witness_id"],
  ["CorrectionRecord", "target"],
  ["CorrectionRecord", "replacement"],
  ["StatusEvent", "target"],
  ["OfficerInstallation", "office"],
  ["OfficerInstallation", "authorizing_act"],
]) {
  test(`${type}.${field} rejects a non-content-identity string`, () => {
    const vector = OWNED_VECTORS.find((v) => v.type === type);
    const record = { ...vector.valid, [field]: "not-a-content-identity" };
    assert.throws(() => validateRecord(record), /content identity/);
  });
}

test("StatusEvent.supersedes and .successor reject a non-content-identity string", () => {
  const vector = OWNED_VECTORS.find((v) => v.type === "StatusEvent");
  for (const field of ["supersedes", "successor"]) {
    const record = { ...vector.valid, [field]: "not-a-content-identity" };
    assert.throws(() => validateRecord(record), /content identity/);
  }
});

test("verifyRecords resolves CorrectionRecord.replacement", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const replacement = office({ slug: "steward-v2", scope: "corpus" });
  const correction = correctionRecord({ target: off.id, replacement: replacement.id, reason: "renamed" });
  const report = verifyRecords([off, replacement, correction]);
  assert.equal(report.ok, true);
});

test("verifyRecords rejects an unresolved CorrectionRecord.replacement", () => {
  const off = office({ slug: "steward", scope: "corpus" });
  const correction = correctionRecord({ target: off.id, replacement: `ni:///sha-256;${"A".repeat(43)}`, reason: "renamed" });
  assert.throws(() => verifyRecords([off, correction]), /unresolved/);
});

test("TIER_B_RECORD_TYPES is the closed six-member set this module owns", () => {
  assert.deepEqual([...TIER_B_RECORD_TYPES].sort(), [
    "CorrectionRecord",
    "Observation",
    "Office",
    "OfficerInstallation",
    "Session",
    "StatusEvent",
  ]);
});
