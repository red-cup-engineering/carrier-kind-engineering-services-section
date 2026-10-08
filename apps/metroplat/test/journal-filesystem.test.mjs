import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

import { tm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { journalWitness } from "@red-cup-engineering/semiotic-eavt-services-section/journal/event";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { artifactTier } from "@red-cup-engineering/eavt/statement";
import { eventPath } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/events";
import { clearSegmentIndexes, segmentPath } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/segment-store";
import {
  artifactStoreRoot,
  journalDirectoryOf,
  journalSegment,
  settlementRootOf,
} from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { writeAtRoot } from "@red-cup-engineering/metroplat/resources/read-write-verbs";
import { readWorkItemView } from "@red-cup-engineering/feltos/work/service";

function event(label, causes = []) {
  return journalWitness(Object.freeze({
    kind: "metroplat.journal.observation",
    seat: "test:filesystem-journal",
    claim: tm.mark(`claim:${label}`),
    address: tm.mark(`address:${label}`),
    time: `2026-07-11T00:00:0${causes.length}.000Z`,
    causes: Object.freeze(causes),
  }));
}

test("the journal segment is derived from the log tier rather than restated", () => {
  // The segment belongs to the artifact tier table. If this drifts, path-building
  // (data-artifact-address) and path-resolution (the journal) have desynchronized,
  // which is exactly the split the store-root owner exists to prevent.
  assert.equal(journalSegment, artifactTier("log").pathSegment);
  assert.equal(journalDirectoryOf("/srv/site"), path.join("/srv/site", ...journalSegment.split("/")));
});

test("a journal inside a settlement resolves its store; a loose one stays standalone", () => {
  const settled = path.join("/srv/site", ...journalSegment.split("/"), "2026", "07", "feed.jsonl");
  assert.equal(settlementRootOf(settled), path.resolve("/srv/site"));
  assert.equal(artifactStoreRoot(settled), journalDirectoryOf("/srv/site"));

  // A journal addressed outside any settlement is a legitimate standalone store,
  // not a misconfiguration, and must keep resolving beside its own log.
  assert.equal(artifactStoreRoot("/srv/loose/audit.jsonl"), path.join("/srv/loose", ".metroplat-journal"));
  assert.equal(settlementRootOf("/srv/loose/audit.jsonl"), undefined);
});

test("a journal path under the superseded data/logs segment is refused, not silently rehomed", () => {
  // The failure this guards: resolving a stale address as a standalone journal
  // would open an empty .metroplat-journal beside a real corpus and admit into
  // it — a split-brain that reads as an empty journal instead of as an error.
  const stale = path.join("/srv/site", "data", "logs", "2026", "07", "feed.jsonl");
  for (const resolve of [artifactStoreRoot, settlementRootOf]) {
    assert.throws(() => resolve(stale), /superseded "data\/logs" segment/u);
  }
  assert.doesNotThrow(() => artifactStoreRoot(path.join("/srv/site", ...journalSegment.split("/"), "f.jsonl")));
});

test("filesystem journal durably round-trips content-addressed causal events", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-"));
  const logPath = path.join(root, "audit.jsonl");
  try {
    const first = event("first");
    const second = event("second", [first.id]);
    const journal = openJournal(root);
    journal.appendEvents(logPath, [second, first]);
    journal.appendEvents(logPath, [first]);

    const read = journal.read(logPath);
    assert.equal(read.length, 2);
    assert.deepEqual(new Set(read.map((entry) => entry.id)), new Set([first.id, second.id]));
    assert.deepEqual(read.find((entry) => entry.id === second.id).core.causes, [first.id]);
    assert.deepEqual(
      new Set(journal.readAsOf(logPath, [second.id]).map((entry) => entry.id)),
      new Set([first.id, second.id]),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("filesystem journal scans feeds without exposing storage paths", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-api-"));
  try {
    const journal = openJournal(root);
    journal.appendRows("alpha", [["entity:a", "attribute", "value:a", "2026-07-11T01:00:00.000Z"]], {
      at: "2026-07-11T01:00:00.000Z",
      subject: "alpha",
    });
    journal.appendRows("beta", [["entity:b", "attribute", "value:b", "2026-07-11T02:00:00.000Z"]], {
      at: "2026-07-11T02:00:00.000Z",
      subject: "beta",
    });

    const folded = journal.scanAll("2026-07-11", [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.equal(folded.feeds, 2);
    assert.deepEqual(new Set(folded.result), new Set(["value:a", "value:b"]));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a causally linked Task discharge settles after its obligation independent of content order", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-task-causal-order-"));
  const binding = defaultFilesystemBinding(root, { packageRoot: root, rootName: "@test/task-causal-order" });
  const token = "normalization-cycle";
  const cell = "task:publish-verified-cut";
  try {
    const opened = writeAtRoot(binding, {
      token,
      at: "2026-07-12T10:00:00.000Z",
      claim: {
        cell,
        reading: "unknown",
        boundary: { role: "obligation", text: "publish the verified cut" },
      },
    });
    const predecessor = opened.admission.statements[0]?.id;
    assert.equal(typeof predecessor, "string");
    const openView = readWorkItemView(binding, "2026-07-12", token);
    assert.equal(openView.scopes[cell].status, "open");
    assert.equal(openView.scopes[cell].diamonds, 0);
    assert.equal(typeof openView.id, "string");
    writeAtRoot(binding, {
      token,
      at: "2026-07-12T11:00:00.000Z",
      causes: [predecessor],
      claim: {
        cell,
        reading: "held",
        boundary: { role: "discharge", text: "the verified cut is ready" },
      },
    });

    const view = readWorkItemView(binding, "2026-07-12", token);
    assert.equal(view.diamonds, 1);
    const diamond = view.parents["(none)"].diamonds[0];
    assert.equal(diamond.item, cell);
    assert.equal(diamond.deshrouded, false);
    assert.equal(view.parents["(none)"].settlement.kind, "lorentzian.causalSettle:witness");
    assert.equal(view.scopes[cell].status, "discharged");
    assert.equal(view.scopes[cell].diamonds, 1);
    assert.equal(view.scopes[cell].causalDischarge, true);
    assert.equal(view.scopes[cell].settlement.kind, "lorentzian.causalSettle:witness");
    assert.equal(view.scopes[cell].accounting.kind, "metroplat.workItem.accounting:witness");
    assert.equal(view.scopes[cell].accounting.ledger.initialCost, 1);
    assert.equal(view.scopes[cell].accounting.ledger.accumulatedFlux, 1);
    assert.equal(view.scopes[cell].accounting.ledger.residue, 0);
    assert.equal(view.scopes[cell].accounting.ledger.closed, true);
    assert.equal(view.scopes[cell].accounting.ledger.receipts[0].commitments, 1);
    assert.equal(view.scopes[cell].evidence.includes(`accounting-address:${view.scopes[cell].accounting.id}`), true);
    assert.notEqual(view.id, openView.id);
    assert.equal(readWorkItemView(binding, "2026-07-12", token).id, view.id);

    const uncaused = "task:uncaused-publication";
    writeAtRoot(binding, {
      token,
      at: "2026-07-12T12:00:00.000Z",
      claim: { cell: uncaused, reading: "unknown", boundary: { role: "obligation", text: "must not publish" } },
    });
    writeAtRoot(binding, {
      token,
      at: "2026-07-12T13:00:00.000Z",
      claim: { cell: uncaused, reading: "held", boundary: { role: "discharge", text: "missing causal predecessor" } },
    });
    const uncausedView = readWorkItemView(binding, "2026-07-12", token);
    assert.notEqual(uncausedView.scopes[uncaused]?.status, "discharged");
    assert.notEqual(uncausedView.scopes[uncaused]?.causalDischarge, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a work-item view preserves causal settlement across journal date partitions", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-task-cross-date-"));
  const binding = defaultFilesystemBinding(root, { packageRoot: root, rootName: "@test/task-cross-date" });
  const token = "normalization-cycle";
  const cell = "task:cross-date-publication";
  try {
    const opened = writeAtRoot(binding, {
      token,
      at: "2026-07-12T23:59:00.000Z",
      claim: {
        cell,
        reading: "unknown",
        boundary: { role: "obligation", text: "publish after verification" },
      },
    });
    const predecessor = opened.admission.statements[0]?.id;
    assert.equal(typeof predecessor, "string");

    writeAtRoot(binding, {
      token: "other-cycle",
      at: "2026-07-13T00:00:00.000Z",
      claim: {
        cell,
        reading: "denied",
        boundary: { role: "discharge", text: "unrelated subject must not enter the view" },
      },
    });
    writeAtRoot(binding, {
      token,
      at: "2026-07-13T00:01:00.000Z",
      causes: [predecessor],
      claim: {
        cell,
        reading: "held",
        boundary: { role: "discharge", text: "the verified cut is ready" },
      },
    });

    const before = readWorkItemView(binding, "2026-07-12", token);
    assert.equal(before.scopes[cell].status, "open");
    assert.equal(before.scopes[cell].diamonds, 0);

    const after = readWorkItemView(binding, "2026-07-13", token);
    assert.equal(after.scopes[cell].status, "discharged");
    assert.equal(after.scopes[cell].diamonds, 1);
    assert.equal(after.scopes[cell].causalDischarge, true);
    assert.equal(after.scopes[cell].accounting.kind, "metroplat.workItem.accounting:witness");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("journal events reference package-scale artifacts without embedding their aggregate bytes", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-artifacts-"));
  try {
    const artifacts = ["a", "b", "c", "d", "e", "f"].map((prefix) => `${prefix}${prefix.repeat(199_999)}`).map((value) => Object.freeze({
      ref: artifactId(value),
      canonicalText: canonicalJson(value),
    }));
    assert.equal(artifacts.reduce((bytes, artifact) => bytes + artifact.canonicalText.length, 0) > 1_048_576, true);
    const journal = openJournal(root);
    const write = journal.appendRows("artifact-scale", [["entity", "attribute", "value", "2026-07-11T03:00:00.000Z"]], {
      at: "2026-07-11T03:00:00.000Z",
      subject: "artifact-scale",
      eventArtifacts: artifacts,
    });

    const [event] = journal.read(write.artifact);
    assert.deepEqual(event.observation.referencedArtifacts, artifacts.map((artifact) => artifact.ref).sort());
    assert.equal("artifacts" in event.observation, false);
    assert.equal(event.sources.some((source) => source.canonicalText.length >= 200_000), false);
    for (const artifact of artifacts) assert.equal(journal.readArtifact(artifact.ref).canonicalText, artifact.canonicalText);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("quarantined witnesses promote when a missing cause later arrives in another feed", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-recovery-"));
  try {
    const parent = event("late-parent");
    const child = event("early-child", [parent.id]);
    const journal = openJournal(root);
    const childLog = path.join(root, "child.jsonl");
    const parentLog = path.join(root, "parent.jsonl");

    const received = journal.appendEvents(childLog, [child]);
    assert.equal(received[0].admission, "quarantined");
    assert.deepEqual(journal.read(childLog), []);

    journal.appendEvents(parentLog, [parent]);
    assert.deepEqual(journal.read(childLog).map((witness) => witness.id), [child.id]);
    assert.deepEqual(journal.read(parentLog).map((witness) => witness.id), [parent.id]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("admission verifies the affected dependency cut and does not rescan unrelated history", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-local-admission-"));
  const logPath = path.join(root, "local.jsonl");
  try {
    const journal = openJournal(root);
    journal.appendEvents(logPath, [event("existing")]);

    const corruptRef = artifactId("expected immutable artifact");
    const corruptPath = path.join(root, ".metroplat-journal", "objects", "sen", "sha-256", `${corruptRef.split(";").at(-1)}.json`);
    mkdirSync(path.dirname(corruptPath), { recursive: true });
    writeFileSync(corruptPath, "corrupt bytes", "utf8");

    const independent = event("independent");
    assert.equal(journal.appendEvents(logPath, [independent])[0].admission, "admitted");
    const dependent = journalWitness(Object.freeze({
      kind: "metroplat.journal.observation",
      seat: "test:filesystem-journal",
      claim: tm.mark("claim:corrupt-dependent"),
      address: tm.mark("address:corrupt-dependent"),
      time: "2026-07-12T13:00:00.000Z",
      causes: Object.freeze([]),
      referencedArtifacts: Object.freeze([corruptRef]),
    }));
    assert.throws(() => journal.appendEvents(logPath, [dependent]), /corrupt journal artifact/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the admitted index rebuilds from the witness segments", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-index-rebuild-"));
  const logPath = path.join(root, "rebuild.jsonl");
  try {
    const statement = event("index-rebuild");
    openJournal(root).appendEvents(logPath, [statement]);
    const admitted = path.join(root, ".metroplat-journal", "index", "causal-admission", "v2", "admitted.jsonl");
    rmSync(admitted, { force: true });
    clearSegmentIndexes();

    assert.deepEqual(openJournal(root).read(logPath).map((entry) => entry.id), [statement.id]);
    assert.equal(openJournal(root).appendEvents(logPath, [statement])[0].admission, "admitted");
    assert.equal(existsSync(admitted), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("concurrent parent and child arrivals close without a lost dependency wakeup", { timeout: 30_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-causal-race-"));
  const parentLog = path.join(root, "parent.jsonl");
  const childLog = path.join(root, "child.jsonl");
  const parent = event("racing-parent");
  const child = event("racing-child", [parent.id]);
  const source = String.raw`
    import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal"; import { parseJournalWitness } from "@red-cup-engineering/semiotic-eavt-services-section/journal/event";
    const statement = parseJournalWitness(JSON.parse(process.env.METROPLAT_TEST_STATEMENT));
    openJournal(process.env.METROPLAT_TEST_ROOT).appendEvents(process.env.METROPLAT_TEST_LOG, [statement]);
  `;
  try {
    const run = (statement, logPath) => new Promise((resolve) => {
      const process_ = spawn(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "--input-type=module", "-e", source], {
        cwd: path.resolve(import.meta.dirname, ".."),
        env: {
          ...process.env,
          METROPLAT_TEST_ROOT: root,
          METROPLAT_TEST_LOG: logPath,
          METROPLAT_TEST_STATEMENT: JSON.stringify(statement),
        },
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      process_.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
      process_.once("exit", (code, signal) => resolve({ code, signal, stderr }));
    });
    const outcomes = await Promise.all([run(child, childLog), run(parent, parentLog)]);
    assert.deepEqual(outcomes.filter(({ code }) => code !== 0), []);
    assert.deepEqual(openJournal(root).read(parentLog).map((entry) => entry.id), [parent.id]);
    assert.deepEqual(openJournal(root).read(childLog).map((entry) => entry.id), [child.id]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("independent processes admit concurrently through one journal funnel", { timeout: 30_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-journal-concurrent-"));
  const logPath = path.join(root, "concurrent.jsonl");
  const child = String.raw`
    import { journalWitness } from "@red-cup-engineering/semiotic-eavt-services-section/journal/event"; import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
    import { tm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
    const label = process.env.METROPLAT_TEST_LABEL;
    const statement = journalWitness(Object.freeze({
      kind: "metroplat.journal.observation",
      seat: "process:" + label,
      claim: tm.mark("claim:" + label),
      address: tm.mark("address:" + label),
      time: "2026-07-12T12:00:00.000Z",
      causes: Object.freeze([]),
    }));
    openJournal(process.env.METROPLAT_TEST_ROOT).appendEvents(process.env.METROPLAT_TEST_LOG, [statement]);
  `;
  try {
    const labels = Array.from({ length: 16 }, (_unused, index) => String(index));
    const outcomes = await Promise.all(labels.map((label) => new Promise((resolve) => {
      const process_ = spawn(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "--input-type=module", "-e", child], {
        cwd: path.resolve(import.meta.dirname, ".."),
        env: {
          ...process.env,
          METROPLAT_TEST_ROOT: root,
          METROPLAT_TEST_LOG: logPath,
          METROPLAT_TEST_LABEL: label,
        },
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      process_.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
      process_.once("exit", (code, signal) => resolve({ label, code, signal, stderr }));
    })));
    assert.deepEqual(outcomes.filter(({ code }) => code !== 0), []);
    const statements = openJournal(root).read(logPath);
    assert.equal(statements.length, labels.length);
    const lines = readFileSync(segmentPath(logPath), "utf8").trim().split("\n");
    assert.equal(new Set(lines.map((line) => JSON.parse(line).id)).size, labels.length);
    assert.equal(existsSync(`${logPath}.statements`), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
