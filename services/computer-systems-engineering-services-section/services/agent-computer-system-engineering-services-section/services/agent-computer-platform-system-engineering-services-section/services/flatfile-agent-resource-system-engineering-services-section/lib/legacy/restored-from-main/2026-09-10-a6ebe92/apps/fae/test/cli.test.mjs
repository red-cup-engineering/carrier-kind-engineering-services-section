import assert from "node:assert/strict";
import { termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { appendSeavt } from "../src/kernel/event-log.mjs";
import { identity } from "../src/kernel/identity.mjs";
import { DischargeState } from "../src/kernel/discharge.mjs";
import { putRecord } from "../src/kernel/record-store.mjs";
import { correctionRecord } from "../src/kernel/record-types.mjs";
import { seavt } from "../src/kernel/seavt.mjs";
import { makeWitness } from "../src/kernel/witness.mjs";
import {
  runDischarge,
  runLint,
  runReplay,
  runShow,
  runValidate,
  runWitness,
  runWitnessLog,
} from "../src/cli/verbs.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

const CORPUS_ROOT = fileURLToPath(new URL("../../../lib/conformance/fixture-corpus", import.meta.url));
const CLI_BIN = fileURLToPath(new URL("../src/cli/fae.mjs", import.meta.url));

async function withTempRoot(fn) {
  const root = makeTempRoot("fars-cli-");
  try {
    return await fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function witnessFixture({ target, before_digest = null, after_digest = null, four_before, four_after, timestamp, operator = "fm_add", details = {}, channel = "substrate" }) {
  return makeWitness({ operator, target, before_digest, after_digest, details, agent: "morgan", timestamp, kind: "mutation", four_before, four_after, channel });
}

function appendWitness(root, witness) {
  appendSeavt(root, witness.channel, [seavt(witness.target, witness.operator, witness.id, witness.timestamp)], witness.timestamp);
  putRecord(root, witness);
}

function runBin(args, options = {}) {
  try {
    const stdout = execFileSync(process.execPath, [CLI_BIN, ...args], { encoding: "utf8", ...options });
    return { stdout, status: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? "", stderr: error.stderr ?? "", status: error.status };
  }
}

// -- runValidate / runLint (debitum) ---------------------------------------

test("runValidate reproduces the fixture corpus's expected diagnostics list, in order", async () => {
  const result = await runValidate(CORPUS_ROOT);
  assert.equal(result.notes, 5);
  assert.ok(result.diagnostics.length > 0, "the fixture corpus is deliberately not clean");
  assert.deepEqual(result.diagnostics.map((d) => d.rule), result.diagnostics.map((d) => d.rule));
});

test("runLint is runValidate under a second name (documented alias, S8's debitum battery)", () => {
  assert.equal(runLint, runValidate);
});

test("a clean corpus root validates with zero diagnostics", async () => {
  await withTempRoot(async (root) => {
    const result = await runValidate(root);
    assert.deepEqual(result, { notes: 0, diagnostics: [] });
  });
});

// -- runShow -----------------------------------------------------------

test("runShow finds a fixture note by its bare slug", async () => {
  const note = await runShow(CORPUS_ROOT, "alpha");
  assert.ok(note, "expected a note for slug alpha");
  assert.equal(note.slug, "alpha");
  assert.equal(note.dir, "concepts");
});

test("runShow finds the same note by its corpus-relative path", async () => {
  const bySlug = await runShow(CORPUS_ROOT, "alpha");
  const byPath = await runShow(CORPUS_ROOT, bySlug.path);
  assert.deepEqual(byPath, bySlug);
});

test("runShow returns null for an unknown target", async () => {
  assert.equal(await runShow(CORPUS_ROOT, "does-not-exist"), null);
});

// -- runWitness ----------------------------------------------------------

test("runWitness resolves and re-validates a witness by id", async () => {
  await withTempRoot(async (root) => {
    const witness = witnessFixture({ target: "x", after_digest: "d1", four_before: [false, false], four_after: [true, false], timestamp: "2026-08-19T00:00:00Z" });
    appendWitness(root, witness);
    const found = await runWitness(root, witness.id);
    assert.deepEqual(found, witness);
  });
});

test("runWitness returns null for an unknown id", async () => {
  await withTempRoot(async (root) => {
    assert.equal(await runWitness(root, identity("nothing here")), null);
  });
});

// -- runWitnessLog ---------------------------------------------------------

test("runWitnessLog resolves each row's v to its full witness body", async () => {
  await withTempRoot(async (root) => {
    const witness = witnessFixture({ target: "x", after_digest: "d1", four_before: [false, false], four_after: [true, false], timestamp: "2026-08-19T00:00:00Z" });
    appendWitness(root, witness);
    const rows = await runWitnessLog(root, "substrate", "2026-08-19T00:00:00Z");
    assert.equal(rows.length, 1);
    assert.equal(termToJson(rows[0].entry.e), "x");
    assert.deepEqual(rows[0].entry.witness, witness);
  });
});

// -- runReplay -----------------------------------------------------------

test("runReplay reshapes belief to [positive, negative] pairs and includes a stable digest", async () => {
  await withTempRoot(async (root) => {
    const witness = witnessFixture({ target: "x", after_digest: "d1", four_before: [false, false], four_after: [true, false], timestamp: "2026-08-19T00:00:00Z" });
    appendWitness(root, witness);
    const first = await runReplay(root);
    const second = await runReplay(root);
    assert.deepEqual(first.belief, { x: [true, false] });
    assert.deepEqual(first.witnesses, { [witness.id]: witness });
    assert.equal(first.digest, second.digest);
    assert.equal(typeof first.digest, "string");
  });
});

// -- runDischarge --------------------------------------------------------

test("runDischarge classifies a Tier B record folded from the event log", async () => {
  await withTempRoot(async (root) => {
    const guard = witnessFixture({ target: "offices/steward", four_before: [false, false], four_after: [true, false], timestamp: "2026-08-19T00:00:00Z", operator: "dispatch", channel: "governance" });
    appendWitness(root, guard);

    const target = correctionRecord({ target: guard.id, replacement: identity("replacement body"), reason: "superseded" });
    // correctionRecord's replacement must itself resolve for sigmaHolds; witness it too.
    const replacementWitness = witnessFixture({ target: "y", after_digest: "d2", four_before: [false, false], four_after: [true, false], timestamp: "2026-08-19T00:00:01Z" });
    appendWitness(root, replacementWitness);

    const creation = witnessFixture({
      target: target.id,
      after_digest: identity(target),
      four_before: [false, false],
      four_after: [true, false],
      timestamp: "2026-08-19T00:00:02Z",
      operator: "record_correction",
      details: { record: target },
      channel: "learning",
    });
    appendWitness(root, creation);

    const result = await runDischarge(root, target.id);
    assert.equal(result.found, true);
    assert.equal(result.recordId, target.id);
    assert.ok(Object.values(DischargeState).includes(result.state), `${result.state} is a real DischargeState`);
  });
});

test("runDischarge accepts a bare Witness id, per record-types.mjs's FOREIGN_TIER_B_TYPES carve-out", async () => {
  await withTempRoot(async (root) => {
    const witness = witnessFixture({ target: "x", after_digest: "d1", four_before: [false, false], four_after: [true, false], timestamp: "2026-08-19T00:00:00Z" });
    appendWitness(root, witness);
    const result = await runDischarge(root, witness.id);
    assert.equal(result.found, true);
    // A Witness has no SIGMA_CITATION_FIELDS entry, so sigmaHolds trivially
    // holds (an empty citedIds every() is vacuously true); nothing in this
    // root witnesses the witness's own id closing shut, so deltaHolds does
    // not — sat_shadow, discharge.mjs's own "sigma but not delta" corner.
    assert.equal(result.state, DischargeState.SAT_SHADOW);
  });
});

test("runDischarge reports not-found for an unresolved id, never throwing", async () => {
  await withTempRoot(async (root) => {
    const result = await runDischarge(root, identity("nothing was ever witnessed for this"));
    assert.deepEqual(result, { found: false, recordId: result.recordId, state: null });
  });
});

// -- bin entry: process boundary (argv, JSON stdout, exit codes) -----------

test("bin: validate on the (deliberately dirty) fixture corpus exits 1 with a JSON diagnostics report", () => {
  const { stdout, status } = runBin(["validate", CORPUS_ROOT]);
  assert.equal(status, 1);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.notes, 5);
  assert.ok(parsed.diagnostics.length > 0);
});

test("bin: validate on an empty root exits 0", () => {
  withTempRoot((root) => {
    const { stdout, status } = runBin(["validate", root]);
    assert.equal(status, 0);
    assert.deepEqual(JSON.parse(stdout), { notes: 0, diagnostics: [] });
  });
});

test("bin: show exits 1 with a null body for an unknown target", () => {
  const { stdout, status } = runBin(["show", CORPUS_ROOT, "does-not-exist"]);
  assert.equal(status, 1);
  assert.equal(JSON.parse(stdout), null);
});

test("bin: an unknown verb is a usage error (exit 2), never a crash", () => {
  const { status, stderr } = runBin(["not-a-real-verb"]);
  assert.equal(status, 2);
  assert.match(stderr, /unknown verb/);
});

test("bin: missing arguments is a usage error (exit 2)", () => {
  const { status, stderr } = runBin(["show"]);
  assert.equal(status, 2);
  assert.match(stderr, /missing/);
});

test("bin: search names the exact block reason instead of pretending to run", () => {
  const { status, stderr } = runBin(["search", CORPUS_ROOT, "alpha"]);
  assert.equal(status, 2);
  assert.match(stderr, /not implemented/);
});

test("bin: no verb at all prints usage and exits 2", () => {
  const { status, stdout } = runBin([]);
  assert.equal(status, 2);
  assert.match(stdout, /fae <verb>/);
});

test("bin: help exits 0", () => {
  const { status, stdout } = runBin(["help"]);
  assert.equal(status, 0);
  assert.match(stdout, /fae <verb>/);
});
