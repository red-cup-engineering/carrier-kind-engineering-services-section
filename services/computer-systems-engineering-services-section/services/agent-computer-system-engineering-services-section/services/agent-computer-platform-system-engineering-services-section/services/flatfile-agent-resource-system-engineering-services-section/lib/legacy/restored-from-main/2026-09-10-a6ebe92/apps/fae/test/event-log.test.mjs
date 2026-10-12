import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import * as logService from "@red-cup-engineering/witness-journal-log-service";
import { termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { appendSeavt, journalDateFor, logPathFor, readSeavt, streamSeavt } from "../src/kernel/event-log.mjs";
import { seavt } from "../src/kernel/seavt.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

test("event-log.mjs composes witness-journal-log-service's appendSeavt/logPathFor/journalDateFor unchanged", () => {
  assert.equal(appendSeavt, logService.appendSeavt);
  assert.equal(logPathFor, logService.logPathFor);
  assert.equal(journalDateFor, logService.journalDateFor);
});

function withTempRoot(fn) {
  const root = makeTempRoot("fars-event-log-");
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("appendSeavt then readSeavt returns direct RMN coordinates with a 1-based trace", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const row = seavt("witness.target", "operator.fmAdd", "record.id", at);
    const result = appendSeavt(root, "substrate", [row], at);
    assert.equal(result.appended, 1);

    const traced = readSeavt(root, "substrate", at);
    assert.equal(traced.length, 1);
    assert.deepEqual([termToJson(traced[0].entry.e), termToJson(traced[0].entry.a), termToJson(traced[0].entry.v), traced[0].entry.t], ["witness.target", "operator.fmAdd", "record.id", at]);
    assert.equal(traced[0].trace, 1);
  });
});

test("a real witness — a Tier A path target, an underscore-bearing operator, an ni: URI value — appends and reads back intact", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const target = "concepts/alpha.md";
    const operator = "fm_add";
    const value = "ni:///sha-256;sH7RSroQa2vF6e6EpZyIShqZnZIkwZXmLPu3emHguY4";
    const row = seavt(target, operator, value, at);

    assert.equal(appendSeavt(root, "substrate", [row], at).appended, 1);

    const traced = readSeavt(root, "substrate", at);
    assert.equal(traced.length, 1);
    assert.deepEqual([termToJson(traced[0].entry.e), termToJson(traced[0].entry.a), termToJson(traced[0].entry.v), traced[0].entry.t], [target, operator, value, at]);
  });
});

test("streamSeavt yields the same ordered, traced RMN reading as readSeavt", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const first = seavt("witness.target", "operator.fmAdd", "record.id", at);
    const second = seavt("witness.target", "operator.fmSet", "record.other", at);
    appendSeavt(root, "substrate", [first, second], at);

    const streamed = [...streamSeavt(root, "substrate", at)];
    const read = readSeavt(root, "substrate", at);
    assert.deepEqual(streamed, read);
    assert.equal(streamed.length, 2);
  });
});

test("re-appending an already-witnessed row is free", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const row = seavt("witness.target", "operator.fmAdd", "record.id", at);
    appendSeavt(root, "substrate", [row], at);
    const second = appendSeavt(root, "substrate", [row], at);
    assert.equal(second.appended, 0);

    const traced = readSeavt(root, "substrate", at);
    assert.equal(traced.length, 1);
  });
});

test("different channels partition into independent journals", () => {
  withTempRoot((root) => {
    const at = "2026-08-19T00:00:00Z";
    const row = seavt("witness.target", "operator.fmAdd", "record.id", at);
    appendSeavt(root, "substrate", [row], at);
    appendSeavt(root, "learning", [row], at);

    assert.equal(readSeavt(root, "substrate", at).length, 1);
    assert.equal(readSeavt(root, "learning", at).length, 1);
    assert.notEqual(logPathFor(root, "substrate", at), logPathFor(root, "learning", at));
  });
});

test("logPathFor names a deterministic per-feed, per-day journal path under root", () => {
  const at = "2026-08-19T00:00:00Z";
  const first = logPathFor("/corpus", "substrate", at);
  const second = logPathFor("/corpus", "substrate", at);
  assert.equal(first, second);
  assert.ok(first.includes(path.join("corpus")));
  assert.ok(first.endsWith("substrate.jsonl"));
});

test("journalDateFor names the UTC date a witness time falls on", () => {
  assert.equal(journalDateFor("2026-08-19T00:00:00Z"), "2026-08-19");
});
