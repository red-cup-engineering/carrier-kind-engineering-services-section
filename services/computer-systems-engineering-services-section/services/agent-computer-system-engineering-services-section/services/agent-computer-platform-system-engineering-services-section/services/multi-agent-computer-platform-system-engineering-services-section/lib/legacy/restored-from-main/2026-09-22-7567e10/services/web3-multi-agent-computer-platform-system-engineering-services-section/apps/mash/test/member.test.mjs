import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { defineMember, isMember } from "../src/kernel/member.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

function withTempRoot(fn) {
  const root = makeTempRoot("mash-member-");
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("defineMember accepts an existing directory and freezes the result", () => {
  withTempRoot((root) => {
    const member = defineMember({ id: "alpha", root });
    assert.equal(member.id, "alpha");
    assert.equal(member.root, root);
    assert.ok(Object.isFrozen(member));
  });
});

test("defineMember rejects a non-existent root", () => {
  withTempRoot((root) => {
    const missing = `${root}-does-not-exist`;
    assert.throws(() => defineMember({ id: "alpha", root: missing }), TypeError);
  });
});

test("defineMember rejects a root that is a file, not a directory", () => {
  withTempRoot((root) => {
    const filePath = `${root}/not-a-dir`;
    mkdirSync(root, { recursive: true });
    writeFileSync(filePath, "x");
    assert.throws(() => defineMember({ id: "alpha", root: filePath }), TypeError);
  });
});

test("defineMember rejects an empty or non-string id", () => {
  withTempRoot((root) => {
    assert.throws(() => defineMember({ id: "", root }), TypeError);
    assert.throws(() => defineMember({ id: "   ", root }), TypeError);
    assert.throws(() => defineMember({ id: 7, root }), TypeError);
  });
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
