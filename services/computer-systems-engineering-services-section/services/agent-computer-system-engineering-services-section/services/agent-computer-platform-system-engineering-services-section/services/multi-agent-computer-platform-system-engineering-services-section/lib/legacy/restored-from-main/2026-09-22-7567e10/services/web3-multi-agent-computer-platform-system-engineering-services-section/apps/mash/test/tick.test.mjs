import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { defineMember } from "../src/kernel/member.mjs";
import { composeMembers, EXCHANGES_UNFIRED } from "../src/kernel/tick.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";
import { seedWitness } from "./support/seed-member.mjs";

function withTempRoots(n, fn) {
  const roots = Array.from({ length: n }, (_, i) => makeTempRoot(`mash-tick-${i}-`));
  try {
    return fn(...roots);
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
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

test("composeMembers rejects duplicate member ids", () => {
  withTempRoots(2, (rootA, rootB) => {
    const members = [defineMember({ id: "dup", root: rootA }), defineMember({ id: "dup", root: rootB })];
    assert.throws(() => composeMembers(members), /duplicate member id/);
  });
});

test("composeMembers composes many members' faces, sorted by member id regardless of input order", () => {
  withTempRoots(2, (rootA, rootB) => {
    seedWitness(rootA, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    seedWitness(rootB, { target: "concepts/beta.md", timestamp: "2026-08-19T00:00:00Z" });
    const members = [defineMember({ id: "zebra", root: rootB }), defineMember({ id: "alpha", root: rootA })];
    const composite = composeMembers(members);
    assert.deepEqual(
      composite.members.map((face) => face.member),
      ["alpha", "zebra"],
    );
    assert.equal(composite.members[0].beliefCount, 1);
    assert.equal(composite.members[1].beliefCount, 1);
  });
});

test("composeMembers's exchanges field is the empty array when no cells are supplied", () => {
  withTempRoots(1, (root) => {
    seedWitness(root, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    const composite = composeMembers([defineMember({ id: "alpha", root })]);
    assert.deepEqual(composite.exchanges, []);
  });
});

function fakeCells() {
  const submitted = [];
  return {
    submitted,
    cells: {
      conformHireInput: async ({ carrier }) => ({ hire: { demand: "fake-hire" }, canonicalCarrier: carrier }),
      selectProvider: async () => "fake-provider",
      submitHire: async ({ demand, provider }) => {
        submitted.push({ demand, provider });
        return { accepted: true, provider };
      },
    },
  };
}

test("composeMembers with cells fires one exchange per admitted member obligation", async () => {
  await withTempRoots(2, async (rootA, rootB) => {
    seedWitness(rootA, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    seedWitness(rootB, { target: "concepts/beta.md", timestamp: "2026-08-19T00:00:00Z" });
    const members = [defineMember({ id: "alpha", root: rootA }), defineMember({ id: "beta", root: rootB })];
    const { cells, submitted } = fakeCells();
    const composite = await composeMembers(members, { cells });
    assert.equal(composite.exchanges.length, 2);
    assert.deepEqual(composite.exchanges.map((exchange) => exchange.member), ["alpha", "beta"]);
    for (const exchange of composite.exchanges) assert.equal(exchange.witnessed, 1);
    assert.equal(submitted.length, 2);
  });
});

test("composeMembers without cells never invokes the injected hire cells", async () => {
  await withTempRoots(1, async (root) => {
    seedWitness(root, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    const members = [defineMember({ id: "alpha", root })];
    const composite = composeMembers(members);
    assert.deepEqual(composite.exchanges, []);
    assert.equal(composite.exchanges, EXCHANGES_UNFIRED);
  });
});

test("the composite digest is deterministic for the same member set and content", () => {
  withTempRoots(2, (rootA, rootB) => {
    seedWitness(rootA, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    seedWitness(rootB, { target: "concepts/beta.md", timestamp: "2026-08-19T00:00:00Z" });
    const members = [defineMember({ id: "a", root: rootA }), defineMember({ id: "b", root: rootB })];
    const first = composeMembers(members);
    const second = composeMembers(members.slice().reverse());
    assert.equal(first.digest, second.digest);
  });
});

test("the composite digest changes when a member's own settled content changes", () => {
  withTempRoots(1, (root) => {
    const member = defineMember({ id: "alpha", root });
    const before = composeMembers([member]);
    seedWitness(root, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    const after = composeMembers([member]);
    assert.notEqual(before.digest, after.digest);
  });
});

test('onMemberError "throw" (the default) aborts the whole tick on one member\'s corrupted log', () => {
  withTempRoots(2, (rootA, rootB) => {
    seedWitness(rootA, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    mkdirSync(`${rootB}/data`, { recursive: true });
    writeFileSync(`${rootB}/data/logs`, "not a directory", "utf8");
    const members = [defineMember({ id: "a", root: rootA }), defineMember({ id: "b", root: rootB })];
    assert.throws(() => composeMembers(members));
  });
});

test('onMemberError "diagnose" omits a corrupted member and records a diagnostic instead of aborting', () => {
  withTempRoots(2, (rootA, rootB) => {
    seedWitness(rootA, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    mkdirSync(`${rootB}/data`, { recursive: true });
    writeFileSync(`${rootB}/data/logs`, "not a directory", "utf8");
    const members = [defineMember({ id: "a", root: rootA }), defineMember({ id: "b", root: rootB })];
    const composite = composeMembers(members, { onMemberError: "diagnose" });
    assert.deepEqual(
      composite.members.map((face) => face.member),
      ["a"],
    );
    assert.equal(composite.diagnostics.length, 1);
    assert.equal(composite.diagnostics[0].member, "b");
    assert.equal(composite.diagnostics[0].code, "member-face-read-failed");
  });
});
