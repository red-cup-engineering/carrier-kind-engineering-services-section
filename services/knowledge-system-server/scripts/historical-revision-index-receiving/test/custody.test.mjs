import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { withHistoricalSnapshot } from "../custody.mjs";

const scratch = (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "revision-historical-custody-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};
const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

test("missing, malformed and mismatched expected identity refuse before use", (t) => {
  const directory = scratch(t), file = path.join(directory, "historical");
  writeFileSync(file, "inert custody");
  for (const expected of [undefined, "short", "0".repeat(64)]) {
    let called = false;
    assert.throws(() => withHistoricalSnapshot(file, path.join(directory, "native"), expected, () => { called = true; }), /identity/u);
    assert.equal(called, false);
    assert.equal(readFileSync(file, "utf8"), "inert custody");
  }
});

for (const suffix of ["-wal", "-shm", "-journal", ".admission"]) {
  test(`even an empty ${suffix} carrier refuses offline receiving`, (t) => {
    const directory = scratch(t), file = path.join(directory, "historical");
    writeFileSync(file, "inert custody");
    writeFileSync(file + suffix, "");
    assert.throws(() => withHistoricalSnapshot(file, path.join(directory, "native"), digest(file), () => assert.fail("must not use")), /sidecar or backup/u);
    assert.equal(readFileSync(file + suffix).length, 0);
  });
}

test("source and destination aliases, symbolic-link ancestors and source-native root refuse", (t) => {
  const directory = scratch(t), file = path.join(directory, "historical"), expected = "inert custody";
  writeFileSync(file, expected);
  linkSync(file, path.join(directory, "hardlink"));
  mkdirSync(path.join(directory, "real"));
  symlinkSync("real", path.join(directory, "alias"));
  for (const root of [file, `${file}.journal`, path.join(directory, "hardlink"), path.join(directory, "alias/native"), directory]) {
    assert.throws(() => withHistoricalSnapshot(file, root, digest(file), () => assert.fail("must not use")), /destination|symbolic-link/u);
  }
  symlinkSync("historical", path.join(directory, "source-link"));
  assert.throws(() => withHistoricalSnapshot(path.join(directory, "source-link"), path.join(directory, "native"), digest(file), () => assert.fail("must not use")), /symbolic-link/u);
  assert.equal(readFileSync(file, "utf8"), expected);
});

test("original mutation during use is refused before completion", (t) => {
  const directory = scratch(t), file = path.join(directory, "historical");
  writeFileSync(file, "inert custody");
  assert.throws(() => withHistoricalSnapshot(file, path.join(directory, "native"), digest(file), (_snapshot, verify) => {
    writeFileSync(file, "changed by the fixture, never by the receiver");
    verify();
  }), /original source changed/u);
});

test("filesystem root is an overlapping ancestor and refuses without use", t => {
 const directory=scratch(t),file=path.join(directory,"historical");writeFileSync(file,"inert custody");
 assert.throws(()=>withHistoricalSnapshot(file,path.parse(directory).root,digest(file),()=>assert.fail("must not use")),/distinct native destination/u);
 assert.equal(readFileSync(file,"utf8"),"inert custody");
});
test("a private snapshot preserves exact bytes and leaves native destination untouched", t => {
 const directory=scratch(t),file=path.join(directory,"historical"),root=path.join(directory,"native");writeFileSync(file,"inert custody");mkdirSync(root);writeFileSync(path.join(root,"sentinel"),"native frontier");
 const expected=digest(file);assert.equal(withHistoricalSnapshot(file,root,expected,(snapshot,verify)=>{assert.notEqual(snapshot,file);assert.equal(digest(snapshot),expected);verify();return "received snapshot only";}),"received snapshot only");
 assert.equal(digest(file),expected);assert.equal(readFileSync(path.join(root,"sentinel"),"utf8"),"native frontier");
});
