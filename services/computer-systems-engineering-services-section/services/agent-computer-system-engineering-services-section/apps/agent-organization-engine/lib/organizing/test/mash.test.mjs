/**
 * mash — MASH's pure structure: a member's shape, the σ fold, and the
 * pure exchange-obligation derivation. No disk, no FARS, no Ethereum:
 * composeMembers is exercised here entirely through a stub readFace,
 * never a real substrate. The effectful, disk-touching half of this
 * same suite (readMemberFace over real FARS substrates, fireAdmittedExchanges,
 * the CLI) lives in FeltOS's own test/ over its "./mash".
 */
import test from "node:test";
import assert from "node:assert/strict";

import { defineMember, isMember, obligationFromFace, deriveAdmittedObligations, EXCHANGES_UNFIRED, composeMembers } from "../src/mash.mjs";

test("defineMember freezes an {id, root} record without touching the filesystem", () => {
  const member = defineMember({ id: "alpha", root: "/nonexistent-but-thats-fine-here" });
  assert.equal(member.id, "alpha");
  assert.equal(member.root, "/nonexistent-but-thats-fine-here");
  assert.ok(Object.isFrozen(member));
});

test("defineMember rejects an empty or non-string id", () => {
  assert.throws(() => defineMember({ id: "", root: "/r" }), TypeError);
  assert.throws(() => defineMember({ id: "   ", root: "/r" }), TypeError);
  assert.throws(() => defineMember({ id: 7, root: "/r" }), TypeError);
});

test("defineMember rejects an empty or non-string root", () => {
  assert.throws(() => defineMember({ id: "alpha", root: "" }), TypeError);
  assert.throws(() => defineMember({ id: "alpha", root: 7 }), TypeError);
});

test("isMember is a cheap shape check, not a validation", () => {
  assert.equal(isMember({ id: "alpha", root: "/nonexistent" }), true);
  assert.equal(isMember({ id: "alpha" }), false);
  assert.equal(isMember(null), false);
  assert.equal(isMember("alpha"), false);
});

test("obligationFromFace carries the face's own digest as the demand's carrier", () => {
  const obligation = obligationFromFace({ member: "alpha", digest: "deadbeef" });
  assert.equal(obligation.member, "alpha");
  assert.equal(obligation.demand.member, "alpha");
  assert.equal(obligation.demand.demand, "deadbeef");
  assert.deepEqual(obligation.demand.carrier, Buffer.from("deadbeef", "hex"));
});

test("obligationFromFace rejects a face missing member or digest", () => {
  assert.throws(() => obligationFromFace({ member: "alpha", digest: "" }), TypeError);
  assert.throws(() => obligationFromFace({ digest: "deadbeef" }), TypeError);
  assert.throws(() => obligationFromFace(null), TypeError);
});

test("deriveAdmittedObligations derives one obligation per face, in order", () => {
  const obligations = deriveAdmittedObligations([{ member: "a", digest: "aa" }, { member: "b", digest: "bb" }]);
  assert.deepEqual(obligations.map((o) => o.member), ["a", "b"]);
});

function stubFaceReader(byId) {
  return (member) => {
    if (!(member.id in byId)) throw new Error(`no fixture face for member ${member.id}`);
    return byId[member.id];
  };
}

test("composeMembers of zero members is the empty composite, still content-identified", () => {
  const composite = composeMembers([]);
  assert.deepEqual(composite.members, []);
  assert.deepEqual(composite.diagnostics, []);
  assert.equal(composite.exchanges, EXCHANGES_UNFIRED);
  assert.equal(typeof composite.digest, "string");
  assert.ok(composite.digest.startsWith("ni:///sha-256;"));
});

test("composeMembers rejects a non-array members argument", () => {
  assert.throws(() => composeMembers("nope"), TypeError);
});

test("composeMembers rejects an unrecognized onMemberError mode", () => {
  assert.throws(() => composeMembers([], { onMemberError: "ignore" }), TypeError);
});

test("composeMembers rejects a bare object not built by defineMember", () => {
  assert.throws(() => composeMembers([{ id: "a" }]), TypeError);
});

test("composeMembers requires a readFace function once members is non-empty", () => {
  const alpha = defineMember({ id: "alpha", root: "/r" });
  assert.throws(() => composeMembers([alpha]), TypeError);
});

test("composeMembers rejects duplicate member ids", () => {
  const members = [defineMember({ id: "dup", root: "/a" }), defineMember({ id: "dup", root: "/b" })];
  assert.throws(() => composeMembers(members, { readFace: stubFaceReader({}) }), /duplicate member id/);
});

test("composeMembers composes many members' faces, sorted by member id regardless of input order", () => {
  const members = [defineMember({ id: "zebra", root: "/b" }), defineMember({ id: "alpha", root: "/a" })];
  const readFace = stubFaceReader({ zebra: { member: "zebra", digest: "bb" }, alpha: { member: "alpha", digest: "aa" } });
  const composite = composeMembers(members, { readFace });
  assert.deepEqual(composite.members.map((face) => face.member), ["alpha", "zebra"]);
});

test("composeMembers's exchanges field is always EXCHANGES_UNFIRED — firing is the caller's Δ", () => {
  const members = [defineMember({ id: "alpha", root: "/a" })];
  const readFace = stubFaceReader({ alpha: { member: "alpha", digest: "aa" } });
  const composite = composeMembers(members, { readFace });
  assert.equal(composite.exchanges, EXCHANGES_UNFIRED);
});

test("the composite digest is deterministic for the same member set and content, regardless of order", () => {
  const members = [defineMember({ id: "a", root: "/a" }), defineMember({ id: "b", root: "/b" })];
  const readFace = stubFaceReader({ a: { member: "a", digest: "aa" }, b: { member: "b", digest: "bb" } });
  const first = composeMembers(members, { readFace });
  const second = composeMembers(members.slice().reverse(), { readFace });
  assert.equal(first.digest, second.digest);
});

test("the composite digest changes when a member's own settled content changes", () => {
  const members = [defineMember({ id: "alpha", root: "/a" })];
  const before = composeMembers(members, { readFace: stubFaceReader({ alpha: { member: "alpha", digest: "aa" } }) });
  const after = composeMembers(members, { readFace: stubFaceReader({ alpha: { member: "alpha", digest: "changed" } }) });
  assert.notEqual(before.digest, after.digest);
});

test('onMemberError "throw" (the default) aborts the whole tick on one member\'s failed face read', () => {
  const members = [defineMember({ id: "a", root: "/a" }), defineMember({ id: "b", root: "/b" })];
  const readFace = stubFaceReader({ a: { member: "a", digest: "aa" } });
  assert.throws(() => composeMembers(members, { readFace }));
});

test('onMemberError "diagnose" omits a failed member and records a diagnostic instead of aborting', () => {
  const members = [defineMember({ id: "a", root: "/a" }), defineMember({ id: "b", root: "/b" })];
  const readFace = stubFaceReader({ a: { member: "a", digest: "aa" } });
  const composite = composeMembers(members, { onMemberError: "diagnose", readFace });
  assert.deepEqual(composite.members.map((face) => face.member), ["a"]);
  assert.equal(composite.diagnostics.length, 1);
  assert.equal(composite.diagnostics[0].member, "b");
  assert.equal(composite.diagnostics[0].code, "member-face-read-failed");
});

test("composeMembers can recompose already-read faces via a trivial lookup, never touching disk", () => {
  const faces = { alpha: { member: "alpha", digest: "aa" }, beta: { member: "beta", digest: "bb" } };
  const members = [defineMember({ id: "alpha", root: "/a" }), defineMember({ id: "beta", root: "/b" })];
  const composite = composeMembers(members, { readFace: (member) => faces[member.id] });
  assert.deepEqual(composite.members.map((face) => face.member), ["alpha", "beta"]);
});
