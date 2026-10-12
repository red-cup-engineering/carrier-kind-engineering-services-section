import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { defineMember } from "../src/kernel/member.mjs";
import { readMemberFace } from "../src/kernel/face.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";
import { seedWitness } from "./support/seed-member.mjs";

function withTempRoot(fn) {
  const root = makeTempRoot("mash-face-");
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("a member with no witnesses reads as an empty face", () => {
  withTempRoot((root) => {
    const face = readMemberFace(defineMember({ id: "alpha", root }));
    assert.equal(face.member, "alpha");
    assert.equal(face.root, root);
    assert.equal(face.beliefCount, 0);
    assert.equal(face.recordCount, 0);
    assert.equal(face.witnessCount, 0);
    assert.equal(typeof face.digest, "string");
    assert.ok(face.digest.length > 0);
  });
});

test("a member's face reflects its own witnessed belief", () => {
  withTempRoot((root) => {
    seedWitness(root, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    seedWitness(root, { target: "concepts/beta.md", timestamp: "2026-08-19T00:00:01Z" });
    const face = readMemberFace(defineMember({ id: "alpha", root }));
    assert.equal(face.beliefCount, 2);
    assert.equal(face.witnessCount, 2);
    assert.equal(face.recordCount, 0);
  });
});

test("two members with identical witnessed content produce identical digests", () => {
  withTempRoot((rootA) =>
    withTempRoot((rootB) => {
      for (const root of [rootA, rootB]) {
        seedWitness(root, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
      }
      const faceA = readMemberFace(defineMember({ id: "a", root: rootA }));
      const faceB = readMemberFace(defineMember({ id: "b", root: rootB }));
      assert.equal(faceA.digest, faceB.digest);
    }),
  );
});

test("two members whose witnessed content differs produce different digests", () => {
  withTempRoot((rootA) =>
    withTempRoot((rootB) => {
      seedWitness(rootA, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
      seedWitness(rootB, { target: "concepts/gamma.md", timestamp: "2026-08-19T00:00:00Z" });
      const faceA = readMemberFace(defineMember({ id: "a", root: rootA }));
      const faceB = readMemberFace(defineMember({ id: "b", root: rootB }));
      assert.notEqual(faceA.digest, faceB.digest);
    }),
  );
});

test("readMemberFace propagates a corrupted member log rather than masking it", () => {
  withTempRoot((root) => {
    mkdirSync(`${root}/data`, { recursive: true });
    writeFileSync(`${root}/data/logs`, "not a directory", "utf8");
    assert.throws(() => readMemberFace(defineMember({ id: "alpha", root })), { code: "ENOTDIR" });
  });
});
