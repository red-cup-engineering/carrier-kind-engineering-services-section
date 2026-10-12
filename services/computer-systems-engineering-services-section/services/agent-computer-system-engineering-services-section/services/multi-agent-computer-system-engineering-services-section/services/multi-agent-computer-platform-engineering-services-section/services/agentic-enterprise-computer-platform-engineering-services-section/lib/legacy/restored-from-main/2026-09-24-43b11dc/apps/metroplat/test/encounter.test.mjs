import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { encounter, encounterMove, encounterRun, encounterTerminal } from "../src/encounter/model.mjs";
import { encounterReading } from "../src/encounter/reading.mjs";
import { journalEncounterStore } from "../src/integrations/filesystem/services/encounter-store.mjs";

const openedAt = "2026-07-11T12:00:00.000Z";

function fixture(root) {
  const semantic = encounter({ encounterClass: "proof-search", subject: "sha256:problem" });
  const run = encounterRun({
    encounter: semantic.id,
    invocation: "sha256:invocation",
    operation: "sha256:operation",
    request: "request:proof-search",
    openedAt,
    causes: ["sha256:rpc-decision"],
  });
  return { semantic, run, store: journalEncounterStore(root, { pollIntervalMs: 10 }) };
}

test("encounter identity separates semantic input, idempotent redelivery, and deliberate retry", () => {
  const semantic = encounter({ encounterClass: "process", subject: "sha256:input", metadata: { label: "first" } });
  const same = encounter({ encounterClass: "process", subject: "sha256:input", metadata: { label: "changed" } });
  assert.equal(semantic.id, same.id);

  const first = encounterRun({
    encounter: semantic.id,
    invocation: "sha256:invocation-1",
    operation: "sha256:operation",
    request: "request:1",
    openedAt,
  });
  const redelivery = encounterRun({
    encounter: semantic.id,
    invocation: "sha256:invocation-1",
    operation: "sha256:operation",
    request: "request:1",
    openedAt: "2026-07-12T00:00:00.000Z",
    causes: ["different-observation"],
  });
  const retry = encounterRun({
    encounter: semantic.id,
    invocation: "sha256:invocation-2",
    operation: "sha256:operation",
    request: "request:2",
    retryOf: first.id,
    openedAt,
  });
  assert.equal(first.id, redelivery.id);
  assert.notEqual(first.id, retry.id);
  assert.equal(retry.encounter, first.encounter);
});

test("journal encounter admission resolves canonical predecessors into one durable causal section", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-encounter-"));
  try {
    const { run, store } = fixture(root);
    const opening = store.admit(run, { kind: "metroplat.encounter.opened", run, at: openedAt });
    const first = encounterMove({
      run: run.id,
      type: "proof.candidate",
      channel: "prover",
      sequence: 0,
      body: { candidate: "by exact witness" },
      predecessors: [run.id],
      observedAt: "2026-07-11T12:00:01.000Z",
    });
    const firstAdmission = store.admit(run, {
      kind: "metroplat.encounter.contribution",
      run: run.id,
      contribution: first,
      at: first.observedAt,
    });
    const terminal = encounterTerminal({
      run: run.id,
      type: "proof.completed",
      disposition: "completed",
      value: { theorem: "example" },
      predecessors: [first.id],
      observedAt: "2026-07-11T12:00:02.000Z",
    });
    const terminalAdmission = store.admit(run, {
      kind: "metroplat.encounter.contribution",
      run: run.id,
      contribution: terminal,
      at: terminal.observedAt,
    });

    assert.equal(store.read(run).length, 3);
    assert.deepEqual(firstAdmission.eventIds.length, 1);
    assert.deepEqual(terminalAdmission.eventIds.length, 1);
    assert.deepEqual(store.causalHead(run), terminalAdmission.eventIds);
    assert.notDeepEqual(opening.eventIds, firstAdmission.eventIds);

    const missing = encounterMove({
      run: run.id,
      type: "proof.impossible",
      channel: "prover",
      sequence: 1,
      body: null,
      predecessors: ["sha256:not-admitted"],
      observedAt: "2026-07-11T12:00:03.000Z",
    });
    assert.throws(() => store.admit(run, {
      kind: "metroplat.encounter.contribution",
      run: run.id,
      contribution: missing,
      at: missing.observedAt,
    }), /unadmitted predecessors/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("followers resume from a durable causal cursor and subscriber cancellation does not alter execution", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-encounter-follow-"));
  try {
    const { run, store } = fixture(root);
    const opening = store.admit(run, { kind: "metroplat.encounter.opened", run, at: openedAt });
    const controller = new AbortController();
    const iterator = store.follow(run, { after: opening.eventIds, signal: controller.signal })[Symbol.asyncIterator]();
    const pending = iterator.next();

    const move = encounterMove({
      run: run.id,
      type: "proof.progress",
      channel: "prover",
      sequence: 0,
      body: { goals: 1 },
      predecessors: [run.id],
      observedAt: "2026-07-11T12:00:01.000Z",
    });
    const admitted = store.admit(run, {
      kind: "metroplat.encounter.contribution",
      run: run.id,
      contribution: move,
      at: move.observedAt,
    });
    const next = await pending;
    assert.equal(next.done, false);
    assert.deepEqual(next.value.eventIds, admitted.eventIds);

    controller.abort();
    assert.equal((await iterator.next()).done, true);

    const terminal = encounterTerminal({
      run: run.id,
      type: "proof.completed",
      disposition: "completed",
      value: { proof: true },
      predecessors: [move.id],
      observedAt: "2026-07-11T12:00:02.000Z",
    });
    store.admit(run, {
      kind: "metroplat.encounter.contribution",
      run: run.id,
      contribution: terminal,
      at: terminal.observedAt,
    });
    assert.equal(encounterReading(run, store.read(run), store.causalHead(run)).standing, "settled");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a slow subscriber cannot backpressure admission or another durable reader", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-encounter-slow-reader-"));
  try {
    const { run, store } = fixture(root);
    const opening = store.admit(run, { kind: "metroplat.encounter.opened", run, at: openedAt });
    const slowControl = new AbortController();
    const fastControl = new AbortController();
    const slow = store.follow(run, { after: opening.eventIds, signal: slowControl.signal })[Symbol.asyncIterator]();
    const fast = store.follow(run, { after: opening.eventIds, signal: fastControl.signal })[Symbol.asyncIterator]();

    let predecessor = run.id;
    const admissions = [];
    for (let sequence = 0; sequence < 3; sequence += 1) {
      const move = encounterMove({
        run: run.id,
        type: "proof.progress",
        channel: "prover",
        sequence,
        body: { goals: 3 - sequence },
        predecessors: [predecessor],
        observedAt: `2026-07-11T12:00:0${sequence + 1}.000Z`,
      });
      admissions.push(store.admit(run, { kind: "metroplat.encounter.contribution", run: run.id, contribution: move, at: move.observedAt }));
      predecessor = move.id;
    }

    const fastIds = [];
    for (let index = 0; index < admissions.length; index += 1) {
      const next = await fast.next();
      assert.equal(next.done, false);
      fastIds.push(next.value.eventIds[0]);
    }
    assert.deepEqual(fastIds, admissions.map(({ eventIds }) => eventIds[0]));

    // The slow iterator has no in-memory producer queue. When it finally
    // advances, it independently reconstructs the same suffix from storage.
    const slowIds = [];
    for (let index = 0; index < admissions.length; index += 1) {
      const next = await slow.next();
      assert.equal(next.done, false);
      slowIds.push(next.value.eventIds[0]);
    }
    assert.deepEqual(slowIds, fastIds);
    slowControl.abort();
    fastControl.abort();
    await slow.return?.();
    await fast.return?.();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("incompatible terminal claims remain present and read as contested", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-encounter-four-"));
  try {
    const { run, store } = fixture(root);
    store.admit(run, { kind: "metroplat.encounter.opened", run, at: openedAt });
    const move = encounterMove({
      run: run.id,
      type: "proof.progress",
      channel: "prover",
      sequence: 0,
      body: { goals: 0 },
      predecessors: [run.id],
      observedAt: "2026-07-11T12:00:01.000Z",
    });
    store.admit(run, { kind: "metroplat.encounter.contribution", run: run.id, contribution: move, at: move.observedAt });
    const completed = encounterTerminal({
      run: run.id,
      type: "proof.completed",
      disposition: "completed",
      value: { proof: true },
      predecessors: [move.id],
      observedAt: "2026-07-11T12:00:02.000Z",
    });
    const obstructed = encounterTerminal({
      run: run.id,
      type: "proof.obstructed",
      disposition: "obstructed",
      value: { reason: "kernel rejected" },
      predecessors: [move.id],
      observedAt: "2026-07-11T12:00:03.000Z",
    });
    store.admit(run, { kind: "metroplat.encounter.contribution", run: run.id, contribution: completed, at: completed.observedAt });
    store.admit(run, { kind: "metroplat.encounter.contribution", run: run.id, contribution: obstructed, at: obstructed.observedAt });

    const reading = encounterReading(run, store.read(run), store.causalHead(run));
    assert.equal(reading.standing, "contested");
    assert.deepEqual(new Set(reading.terminals.map(({ id }) => id)), new Set([completed.id, obstructed.id]));
    assert.equal(reading.frontier.length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a crash-truncated section remains honestly open after store reconstruction", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-encounter-open-"));
  try {
    const { run, store } = fixture(root);
    store.admit(run, { kind: "metroplat.encounter.opened", run, at: openedAt });
    const move = encounterMove({ run: run.id, type: "process.stdout", channel: "stdout", sequence: 0, body: { text: "partial" }, predecessors: [run.id], observedAt: "2026-07-11T12:00:01.000Z" });
    store.admit(run, { kind: "metroplat.encounter.contribution", run: run.id, contribution: move, at: move.observedAt });
    const reconstructed = journalEncounterStore(root, { pollIntervalMs: 10 });
    const reading = encounterReading(run, reconstructed.read(run), reconstructed.causalHead(run));
    assert.equal(reading.standing, "open");
    assert.equal(reading.moves.length, 1);
    assert.equal(reading.terminals.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
