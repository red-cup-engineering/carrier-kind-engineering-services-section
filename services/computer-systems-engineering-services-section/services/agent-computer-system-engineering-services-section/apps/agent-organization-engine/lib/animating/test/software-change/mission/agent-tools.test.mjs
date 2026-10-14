import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { induceVerifiedSoftwareMissionProposal } from "../../../src/becoming/doing/working/software-change/mission/agent-tools.mjs";

const proposal = (changes) => ({ type: "SoftwareMissionChangeProposal", changes });
const change = (path, before, after, existed = true) => ({
  path,
  beforeExisted: existed,
  beforeDigest: `sha256:${createHash("sha256").update(before).digest("hex")}`,
  afterDigest: `sha256:${createHash("sha256").update(after).digest("hex")}`,
  afterBytesBase64: Buffer.from(after).toString("base64"),
});

test("receiver induction writes a verified proposal only within its explicit lane", () => {
  const root = mkdtempSync(join(tmpdir(), "mission-induction-"));
  const before = "export const value = 1;\n", after = "export const value = 2;\n";
  writeFileSync(join(root, "value.mjs"), before);
  const result = induceVerifiedSoftwareMissionProposal({ root, writablePaths: ["value.mjs"], verifyCommand: "node --check value.mjs", proposal: proposal([change("value.mjs", before, after)]) });
  assert.deepEqual(result.changedPaths, ["value.mjs"]);
  assert.equal(readFileSync(join(root, "value.mjs"), "utf8"), after);
});

test("receiver induction preflights every change and leaves bytes intact on a later stale entry", () => {
  const root = mkdtempSync(join(tmpdir(), "mission-induction-preflight-"));
  const one = "export const one = 1;\n", two = "export const two = 1;\n";
  writeFileSync(join(root, "one.mjs"), one); writeFileSync(join(root, "two.mjs"), two);
  const stale = change("two.mjs", "wrong", "export const two = 2;\n");
  assert.throws(() => induceVerifiedSoftwareMissionProposal({ root, writablePaths: ["one.mjs", "two.mjs"], verifyCommand: "true", proposal: proposal([change("one.mjs", one, "export const one = 2;\n"), stale]) }), /does not descend/u);
  assert.equal(readFileSync(join(root, "one.mjs"), "utf8"), one);
  assert.equal(readFileSync(join(root, "two.mjs"), "utf8"), two);
});

test("receiver induction rejects duplicate and out-of-scope entries before any write", () => {
  const root = mkdtempSync(join(tmpdir(), "mission-induction-scope-"));
  const one = "export const one = 1;\n", protectedSource = "export const protectedValue = 1;\n";
  writeFileSync(join(root, "one.mjs"), one); writeFileSync(join(root, "protected.mjs"), protectedSource);
  const first = change("one.mjs", one, "export const one = 2;\n");
  assert.throws(() => induceVerifiedSoftwareMissionProposal({ root, writablePaths: ["one.mjs"], verifyCommand: "true", proposal: proposal([first, change("protected.mjs", protectedSource, "export const protectedValue = 2;\n")]) }), /outside declared writable paths/u);
  assert.equal(readFileSync(join(root, "one.mjs"), "utf8"), one);
  assert.throws(() => induceVerifiedSoftwareMissionProposal({ root, writablePaths: ["one.mjs"], verifyCommand: "true", proposal: proposal([first, first]) }), /repeats path/u);
  assert.equal(readFileSync(join(root, "one.mjs"), "utf8"), one);
});

test("receiver induction rolls every write back when a receiver gate fails", () => {
  const root = mkdtempSync(join(tmpdir(), "mission-induction-rollback-"));
  const before = "export const value = 1;\n", after = "export const value = ;\n";
  writeFileSync(join(root, "value.mjs"), before);
  assert.throws(() => induceVerifiedSoftwareMissionProposal({ root, writablePaths: ["value.mjs"], verifyCommand: "node --check value.mjs", proposal: proposal([change("value.mjs", before, after)]) }), /rolled back/u);
  assert.equal(readFileSync(join(root, "value.mjs"), "utf8"), before);
});

test("receiving rolls back earlier writes when a later native write fails", async t => {
  const fs = await import("node:fs");
  const {syncBuiltinESMExports}=await import("node:module");
  const root=mkdtempSync(join(tmpdir(),"receiving-rollback-"));
  const a=join(root,"a.mjs"),b=join(root,"b.mjs");
  writeFileSync(a,"before a");writeFileSync(b,"before b");
  const original=fs.default.writeFileSync;
  t.mock.method(fs.default,"writeFileSync",(path,bytes,...rest)=>{
   if(path===b&&Buffer.from(bytes).toString()==="after b")throw new Error("owned write failure");
   return original(path,bytes,...rest);
  });
  syncBuiltinESMExports();
  try {
   assert.throws(()=>induceVerifiedSoftwareMissionProposal({root,writablePaths:["a.mjs","b.mjs"],verifyCommand:"true",proposal:proposal([
    change("a.mjs","before a","after a"),change("b.mjs","before b","after b")])}),/owned write failure/u);
   assert.equal(readFileSync(a,"utf8"),"before a");assert.equal(readFileSync(b,"utf8"),"before b");
  }finally{t.mock.restoreAll();syncBuiltinESMExports();}
});

test("receiver induction refuses symlink and unrestricted write lanes before mutation", () => {
  const root = mkdtempSync(join(tmpdir(), "mission-induction-symlink-"));
  const outside = mkdtempSync(join(tmpdir(), "mission-induction-outside-"));
  writeFileSync(join(outside, "outside.mjs"), "export const value = 1;\n");
  symlinkSync(join(outside, "outside.mjs"), join(root, "linked.mjs"));
  const before = "export const value = 1;\n";
  assert.throws(() => induceVerifiedSoftwareMissionProposal({ root, writablePaths: ["linked.mjs"], verifyCommand: "true", proposal: proposal([change("linked.mjs", before, "export const value = 2;\n")]) }), /symlink/u);
  assert.throws(() => induceVerifiedSoftwareMissionProposal({ root, writablePaths: [], verifyCommand: "true", proposal: proposal([change("linked.mjs", before, "export const value = 2;\n")]) }), /nonempty writablePaths/u);
  assert.equal(readFileSync(join(outside, "outside.mjs"), "utf8"), before);
});
