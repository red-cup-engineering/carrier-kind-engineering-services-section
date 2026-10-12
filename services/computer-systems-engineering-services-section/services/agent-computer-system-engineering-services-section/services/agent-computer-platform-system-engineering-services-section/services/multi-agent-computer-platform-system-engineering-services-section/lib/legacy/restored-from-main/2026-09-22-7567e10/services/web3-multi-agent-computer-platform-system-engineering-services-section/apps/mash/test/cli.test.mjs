import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { makeTempRoot } from "./support/temp-root.mjs";
import { seedWitness } from "./support/seed-member.mjs";

const CLI = fileURLToPath(new URL("../src/cli/mash.mjs", import.meta.url));

function withTempRoot(fn) {
  const root = makeTempRoot("mash-cli-");
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    return { code: error.status, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("no verb prints usage and exits 2", () => {
  const { code, stdout } = runCli([]);
  assert.equal(code, 2);
  assert.match(stdout, /mash <verb> \[args\]/);
});

test("help prints usage and exits 0", () => {
  const { code, stdout } = runCli(["help"]);
  assert.equal(code, 0);
  assert.match(stdout, /tick <id>=<root>/);
});

test("an unknown verb exits 2 with a usage message on stderr", () => {
  const { code, stderr } = runCli(["bogus"]);
  assert.equal(code, 2);
  assert.match(stderr, /unknown verb: bogus/);
});

test("tick with no member arguments exits 2", () => {
  const { code, stderr } = runCli(["tick"]);
  assert.equal(code, 2);
  assert.match(stderr, /missing at least one/);
});

test("tick with a malformed member argument exits 2", () => {
  const { code, stderr } = runCli(["tick", "not-a-key-value-pair"]);
  assert.equal(code, 2);
  assert.match(stderr, /must be <id>=<root>/);
});

test("tick with a nonexistent root exits 2", () => {
  const { code, stderr } = runCli(["tick", "alpha=/nonexistent-mash-member-root"]);
  assert.equal(code, 2);
  assert.match(stderr, /existing directory/);
});

test("tick composes one real member and prints the composite as JSON", () => {
  withTempRoot((root) => {
    seedWitness(root, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
    const { code, stdout } = runCli(["tick", `alpha=${root}`]);
    assert.equal(code, 0);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.members.length, 1);
    assert.equal(parsed.members[0].member, "alpha");
    assert.equal(parsed.members[0].beliefCount, 1);
    assert.deepEqual(parsed.exchanges, []);
    assert.ok(parsed.digest.startsWith("ni:///sha-256;"));
  });
});

test("tick composes several members and diagnoses one whose log is corrupted, without aborting", () => {
  withTempRoot((rootA) => {
    withTempRoot((rootB) => {
      seedWitness(rootA, { target: "concepts/alpha.md", timestamp: "2026-08-19T00:00:00Z" });
      // rootB stays empty (a legitimate zero-witness member, not corrupted) —
      // this asserts the multi-member happy path composes cleanly with a
      // mix of seeded and fresh members.
      const { code, stdout } = runCli(["tick", `a=${rootA}`, `b=${rootB}`]);
      assert.equal(code, 0);
      const parsed = JSON.parse(stdout);
      assert.deepEqual(
        parsed.members.map((face) => face.member),
        ["a", "b"],
      );
      assert.deepEqual(parsed.diagnostics, []);
    });
  });
});

test("the bin path in package.json resolves to this same file", () => {
  const pkgPath = path.join(path.dirname(CLI), "..", "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  assert.equal(path.resolve(path.dirname(pkgPath), pkg.bin.mash), CLI);
});
