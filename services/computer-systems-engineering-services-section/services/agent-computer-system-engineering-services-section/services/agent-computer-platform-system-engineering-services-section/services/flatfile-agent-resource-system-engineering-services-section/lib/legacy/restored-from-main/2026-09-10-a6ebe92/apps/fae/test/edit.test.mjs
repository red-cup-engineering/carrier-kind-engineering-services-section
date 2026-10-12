import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { four } from "../src/kernel/four.mjs";
import { identity } from "../src/kernel/identity.mjs";
import { getRecord } from "../src/kernel/record-store.mjs";
import { office, statusEvent, verifyRecords } from "../src/kernel/record-types.mjs";
import { CellSettlement, SettlingMonotonicityViolation } from "../src/kernel/settlement.mjs";
import { validateWitness } from "../src/kernel/witness.mjs";
import {
  addItem,
  dumpFrontmatter,
  fmAdd,
  fmRm,
  fmSet,
  moveNote,
  removeItem,
  renameFmKey,
  renameKey,
  rewriteBodyLink,
  rewriteLink,
  setField,
} from "../src/operator/edit.mjs";
import { parseFrontmatter } from "../src/substrate/flatfile.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

const FIXTURE_CORPUS = fileURLToPath(new URL("../../../lib/conformance/fixture-corpus", import.meta.url));

function withTempCorpus(fn) {
  const root = makeTempRoot("fars-edit-");
  cpSync(FIXTURE_CORPUS, root, { recursive: true });
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const AT = "2026-08-19T00:00:00Z";

// --- pure transforms -------------------------------------------------

test("setField overwrites, preserving key position", () => {
  assert.deepEqual(setField({ a: 1, b: 2 }, "a", 9), { a: 9, b: 2 });
  assert.deepEqual(Object.keys(setField({ a: 1, b: 2 }, "a", 9)), ["a", "b"]);
});

test("addItem creates a list when the key is absent", () => {
  assert.deepEqual(addItem({}, "depends-on", "alpha"), { "depends-on": ["alpha"] });
});

test("addItem promotes a scalar to a list", () => {
  assert.deepEqual(addItem({ tag: "x" }, "tag", "y"), { tag: ["x", "y"] });
});

test("addItem is a no-op (set semantics) when the item is already present", () => {
  const fm = { "depends-on": ["alpha"] };
  assert.deepEqual(addItem(fm, "depends-on", "alpha"), fm);
});

test("removeItem drops the whole key when item is null", () => {
  assert.deepEqual(removeItem({ a: 1, b: 2 }, "a"), { b: 2 });
});

test("removeItem drops one list item, removing the key once the list empties", () => {
  assert.deepEqual(removeItem({ tag: ["a", "b"] }, "tag", "a"), { tag: ["b"] });
  assert.deepEqual(removeItem({ tag: ["a"] }, "tag", "a"), {});
});

test("removeItem is a no-op when the key is absent", () => {
  const fm = { a: 1 };
  assert.deepEqual(removeItem(fm, "missing", "x"), fm);
});

test("renameKey preserves declaration order at the old key's position", () => {
  const fm = { kind: "concept", title: "Alpha", status: "stub" };
  assert.deepEqual(renameKey(fm, "title", "name"), { kind: "concept", name: "Alpha", status: "stub" });
});

test("renameKey: when both keys already exist, the new key's own value wins at its own position", () => {
  const fm = { title: "Alpha", name: "Preexisting", status: "stub" };
  assert.deepEqual(renameKey(fm, "title", "name"), { name: "Preexisting", status: "stub" });
});

test("renameKey is a no-op when old and new key are the same, or old key is absent", () => {
  const fm = { a: 1 };
  assert.equal(renameKey(fm, "a", "a"), fm);
  assert.equal(renameKey(fm, "missing", "b"), fm);
});

test("rewriteLink replaces only the exact semantic Markdown target", () => {
  const { text, count } = rewriteLink("see [a](alpha.md) and [a2](alpha.md#frag)", "alpha.md", "renamed.md");
  assert.equal(text, "see [a](renamed.md) and [a2](alpha.md#frag)");
  assert.equal(count, 1);
});

test("rewriteLink preserves titles and reports spans while ignoring syntax-ineligible lookalikes", () => {
  const source = [
    "[real](alpha.md \"title\")",
    "`[coded](alpha.md)`",
    "~~~",
    "[fenced](alpha.md)",
    "~~~",
  ].join("\n");
  const result = rewriteLink(source, "alpha.md", "renamed.md");
  assert.equal(result.text, source.replace("alpha.md \"title\"", "renamed.md \"title\""));
  assert.equal(result.count, 1);
  assert.deepEqual(result.edits[0].span, {
    start: source.indexOf("alpha.md"),
    end: source.indexOf("alpha.md") + 8,
    text: "alpha.md",
  });
});

test("rewriteLink reports count 0 and returns the text unchanged when the needle is absent", () => {
  const result = rewriteLink("no links here", "alpha.md", "renamed.md");
  assert.equal(result.count, 0);
  assert.equal(result.text, "no links here");
});

test("dumpFrontmatter round-trips through parseFrontmatter for scalars, lists, and quoting-sensitive strings", () => {
  const fm = { kind: "concept", title: "true", symbol: "a: b", tags: ["x", "y"], empty: [], draft: false, n: null };
  const text = `---\n${dumpFrontmatter(fm)}---\nbody\n`;
  assert.deepEqual(parseFrontmatter(text).fm, fm);
});

// --- fmSet -------------------------------------------------------------

test("fmSet dry-run by default: previews the change without touching the file", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const result = fmSet(root, "concepts/alpha.md", "status", "stable");
    assert.equal(result.changed, true);
    assert.equal(result.witness, undefined);
    assert.match(result.newText, /status: stable/);
    assert.equal(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"), before);
  });
});

test("fmSet, applied: writes the file and returns a valid Witness", () => {
  withTempCorpus((root) => {
    const result = fmSet(root, "concepts/alpha.md", "status", "stable", { dryRun: false, agent: "morgan", timestamp: AT });
    assert.equal(result.changed, true);
    assert.equal(validateWitness(result.witness), result.witness);
    assert.equal(result.witness.operator, "fm_set");
    assert.equal(result.witness.kind, "mutation");
    assert.equal(result.witness.channel, "substrate");
    assert.notEqual(result.witness.before_digest, result.witness.after_digest);
    const onDisk = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    assert.equal(onDisk, result.newText);
    assert.match(onDisk, /status: stable/);
  });
});

test("fmSet leaves a durable record-store witness whose before/after digests match the file's actual pre/post content identity", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const result = fmSet(root, "concepts/alpha.md", "status", "stable", { dryRun: false, timestamp: AT });
    const after = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");

    // A witness-journal SEAVT row's v coordinate is only ever the
    // witness's own id — this is the read path a caller (or a projector)
    // actually has once the minting process has exited: resolve that id
    // through the content-addressed record store, not through the
    // in-process return value alone.
    const persisted = getRecord(root, result.witness.id);
    assert.ok(persisted, "no record persisted under the witness's own id");
    assert.equal(persisted.before_digest, identity(before));
    assert.equal(persisted.after_digest, identity(after));
    assert.equal(persisted.before_digest, result.witness.before_digest);
    assert.equal(persisted.after_digest, result.witness.after_digest);
    assert.deepEqual(persisted.four_before, result.witness.four_before);
    assert.deepEqual(persisted.four_after, result.witness.four_after);
    assert.equal(persisted.kind, result.witness.kind);
  });
});

test("fmSet is a no-op when the value doesn't change: no witness, file untouched", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const result = fmSet(root, "concepts/alpha.md", "title", "Alpha", { dryRun: false });
    assert.equal(result.changed, false);
    assert.equal(result.witness, undefined);
    assert.equal(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"), before);
  });
});

// --- fmAdd / fmRm --------------------------------------------------------

test("fmAdd appends to an existing list field and witnesses it", () => {
  withTempCorpus((root) => {
    const result = fmAdd(root, "concepts/beta.md", "depends-on", "gamma", { dryRun: false, timestamp: AT });
    assert.equal(result.changed, true);
    assert.equal(validateWitness(result.witness), result.witness);
    const { fm } = parseFrontmatter(readFileSync(path.join(root, "concepts/beta.md"), "utf8"));
    assert.deepEqual(fm["depends-on"], ["alpha", "gamma"]);
  });
});

test("fmAdd is a no-op (already present) even with dryRun: false — no witness, no write", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/beta.md"), "utf8");
    const result = fmAdd(root, "concepts/beta.md", "depends-on", "alpha", { dryRun: false });
    assert.equal(result.changed, false);
    assert.equal(result.witness, undefined);
    assert.equal(readFileSync(path.join(root, "concepts/beta.md"), "utf8"), before);
  });
});

test("fmRm removes one list item, then removes the whole key once the list is empty", () => {
  withTempCorpus((root) => {
    const first = fmRm(root, "concepts/beta.md", "depends-on", "alpha", { dryRun: false, timestamp: AT });
    assert.equal(first.changed, true);
    const { fm } = parseFrontmatter(readFileSync(path.join(root, "concepts/beta.md"), "utf8"));
    assert.equal("depends-on" in fm, false);
  });
});

test("fmRm is a no-op when the key is absent", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const result = fmRm(root, "concepts/alpha.md", "no-such-key", null, { dryRun: false });
    assert.equal(result.changed, false);
    assert.equal(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"), before);
  });
});

// --- renameFmKey ---------------------------------------------------------

test("renameFmKey renames in place and witnesses the change", () => {
  withTempCorpus((root) => {
    const result = renameFmKey(root, "concepts/alpha.md", "title", "name", { dryRun: false, timestamp: AT });
    assert.equal(result.changed, true);
    assert.equal(validateWitness(result.witness), result.witness);
    const { fm } = parseFrontmatter(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"));
    assert.deepEqual(Object.keys(fm), ["kind", "name"]);
    assert.equal(fm.name, "Alpha");
  });
});

// --- rewriteBodyLink -------------------------------------------------------

test("rewriteBodyLink rewrites the body target and leaves frontmatter untouched", () => {
  withTempCorpus((root) => {
    const result = rewriteBodyLink(root, "concepts/beta.md", "alpha.md", "alpha-renamed.md", { dryRun: false, timestamp: AT });
    assert.equal(result.changed, true);
    assert.equal(result.witness.details.count, 1);
    assert.equal(result.witness.details.spans.length, 1);
    assert.equal(result.witness.details.spans[0].text, "alpha.md");
    const onDisk = readFileSync(path.join(root, "concepts/beta.md"), "utf8");
    assert.match(onDisk, /\[alpha\]\(alpha-renamed\.md\)/);
    assert.match(onDisk, /depends-on: \[alpha\]/);
  });
});

test("rewriteBodyLink dry-run returns a preview without writing or witnessing", () => {
  withTempCorpus((root) => {
    const target = path.join(root, "concepts/beta.md");
    const before = readFileSync(target, "utf8");
    const result = rewriteBodyLink(root, "concepts/beta.md", "alpha.md", "alpha-renamed.md");
    assert.equal(result.changed, true);
    assert.equal(result.witness, undefined);
    assert.match(result.newText, /\[alpha\]\(alpha-renamed\.md\)/u);
    assert.equal(readFileSync(target, "utf8"), before);
  });
});

test("rewriteBodyLink is a no-op when the target isn't linked", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const result = rewriteBodyLink(root, "concepts/alpha.md", "nowhere.md", "elsewhere.md", { dryRun: false });
    assert.equal(result.changed, false);
    assert.equal(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"), before);
  });
});

// --- moveNote --------------------------------------------------------------

test("moveNote dry-run by default: neither file moves", () => {
  withTempCorpus((root) => {
    const result = moveNote(root, "concepts/alpha.md", "concepts/alpha-moved.md");
    assert.equal(result.changed, true);
    assert.equal(result.witness, undefined);
    assert.ok(!existsSync(path.join(root, "concepts/alpha-moved.md")));
    assert.ok(existsSync(path.join(root, "concepts/alpha.md")));
  });
});

test("moveNote, applied: relocates the file and witnesses the move", () => {
  withTempCorpus((root) => {
    const original = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const result = moveNote(root, "concepts/alpha.md", "concepts/alpha-moved.md", { dryRun: false, timestamp: AT });
    assert.equal(result.changed, true);
    assert.equal(validateWitness(result.witness), result.witness);
    assert.equal(result.witness.target, "concepts/alpha.md");
    assert.equal(result.witness.details.to, "concepts/alpha-moved.md");
    assert.equal(result.witness.before_digest, result.witness.after_digest);
    assert.equal(readFileSync(path.join(root, "concepts/alpha-moved.md"), "utf8"), original);
    assert.throws(() => readFileSync(path.join(root, "concepts/alpha.md"), "utf8"));
  });
});

test("moveNote leaves a durable record-store witness whose before/after digests match the moved file's actual content identity", () => {
  withTempCorpus((root) => {
    const original = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const result = moveNote(root, "concepts/alpha.md", "concepts/alpha-moved.md", { dryRun: false, timestamp: AT });
    const persisted = getRecord(root, result.witness.id);
    assert.ok(persisted, "no record persisted under the witness's own id");
    assert.equal(persisted.before_digest, identity(original));
    assert.equal(persisted.after_digest, identity(original));
    assert.equal(persisted.before_digest, result.witness.before_digest);
    assert.equal(persisted.after_digest, result.witness.after_digest);
  });
});

test("moveNote refuses to overwrite an existing destination, source untouched", () => {
  withTempCorpus((root) => {
    assert.throws(
      () => moveNote(root, "concepts/alpha.md", "concepts/beta.md", { dryRun: false }),
      /destination exists/,
    );
    assert.ok(readFileSync(path.join(root, "concepts/alpha.md"), "utf8").includes("Alpha"));
  });
});

test("moveNote is a no-op when source and destination are the same path", () => {
  withTempCorpus((root) => {
    const result = moveNote(root, "concepts/alpha.md", "concepts/alpha.md", { dryRun: false });
    assert.equal(result.changed, false);
    assert.equal(result.witness, undefined);
  });
});

// --- gate ordering: gates, then witness append, then the write ------------

test("a settling-monotonicity violation on the shared settlement leaves the file untouched", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    const settlement = new CellSettlement();
    settlement.write("concepts/alpha.md", four(true, true));

    assert.throws(
      () => fmSet(root, "concepts/alpha.md", "status", "stable", { dryRun: false, timestamp: AT, settlement }),
      SettlingMonotonicityViolation,
    );
    assert.equal(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"), before);
  });
});

test("untouched-file-on-failed-append: an event-log append failure leaves the file untouched", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    // witness-journal-log-service partitions its journal under
    // <root>/data/logs/...; a plain file sitting where that directory
    // needs to be created makes the append fail deterministically,
    // downstream of both gates having already cleared.
    writeFileSync(path.join(root, "data"), "blocker");

    assert.throws(() => fmSet(root, "concepts/alpha.md", "status", "stable", { dryRun: false, timestamp: AT }));
    assert.equal(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"), before);
  });
});

test("untouched-file-on-failed-append: the same guard holds for moveNote", () => {
  withTempCorpus((root) => {
    writeFileSync(path.join(root, "data"), "blocker");
    assert.throws(() => moveNote(root, "concepts/alpha.md", "concepts/alpha-moved.md", { dryRun: false, timestamp: AT }));
    assert.ok(!existsSync(path.join(root, "concepts/alpha-moved.md")));
    assert.ok(existsSync(path.join(root, "concepts/alpha.md")));
  });
});

test("untouched-file-on-failed-record-store-write: a record-store write failure, downstream of a successful append, still leaves the file untouched", () => {
  withTempCorpus((root) => {
    const before = readFileSync(path.join(root, "concepts/alpha.md"), "utf8");
    // <root>/data/logs/... can still be created (the event-log append
    // clears), but a plain file sitting where <root>/data/records/...
    // needs to be created makes the record-store write fail
    // deterministically, downstream of the append having already landed.
    mkdirSync(path.join(root, "data"), { recursive: true });
    writeFileSync(path.join(root, "data", "records"), "blocker");

    assert.throws(() => fmSet(root, "concepts/alpha.md", "status", "stable", { dryRun: false, timestamp: AT }));
    assert.equal(readFileSync(path.join(root, "concepts/alpha.md"), "utf8"), before);
  });
});

// --- StatusEvent chains: forward-only, acyclic -----------------------------

test("a multi-hop StatusEvent chain (3 events on one target) verifies as forward-only", () => {
  const off = office({ slug: "editor", scope: "corpus" });
  const first = statusEvent({ target: off.id, transition: "suspension" });
  const second = statusEvent({ target: off.id, transition: "reinstatement", supersedes: first.id });
  const third = statusEvent({ target: off.id, transition: "revocation", supersedes: second.id });
  const result = verifyRecords([off, first, second, third]);
  assert.equal(result.ok, true);
  assert.equal(result.byType.StatusEvent, 3);
});

test("a StatusEvent cannot supersede a record that doesn't resolve — no cycle can be forged without a live target", () => {
  const off = office({ slug: "editor", scope: "corpus" });
  const first = statusEvent({ target: off.id, transition: "suspension" });
  const forgedSuccessor = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const second = statusEvent({ target: off.id, transition: "reinstatement", supersedes: forgedSuccessor });
  assert.throws(() => verifyRecords([off, first, second]), /unresolved/);
});

test("a tampered StatusEvent record (content identity mismatch) is rejected — a real cycle would require this", () => {
  const off = office({ slug: "editor", scope: "corpus" });
  const first = statusEvent({ target: off.id, transition: "suspension" });
  const second = statusEvent({ target: off.id, transition: "reinstatement", supersedes: first.id });
  // Forging first -> second -> first would require first's own content
  // (and therefore its content-derived id) to depend on second's id,
  // which does not exist yet at first's construction time. The only way
  // to even attempt it is to hand-edit a stored id after the fact —
  // which content-identity catches immediately.
  const forgedFirst = { ...first, supersedes: second.id };
  assert.throws(() => verifyRecords([off, forgedFirst, second]), /content identity mismatch/);
});
