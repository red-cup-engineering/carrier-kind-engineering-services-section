import assert from "node:assert/strict";
import test from "node:test";
import * as entryService from "@red-cup-engineering/witness-journal-entry-service";
import { jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { identifySeavtSemanticContent, seavt } from "../src/kernel/seavt.mjs";

test("seavt.mjs composes witness-journal-entry-service's identifySeavtSemanticContent() unchanged", () => {
  assert.equal(identifySeavtSemanticContent, entryService.identifySeavtSemanticContent);
});

test("seavt admits every coordinate into RMN before composing the shared writer", () => {
  const row = seavt("witness.target", "operator.fmAdd", "record.id", "2026-08-19T00:00:00Z");
  assert.deepEqual(
    row,
    entryService.seavt(jsonToTerm("witness.target"), jsonToTerm("operator.fmAdd"), jsonToTerm("record.id"), "2026-08-19T00:00:00Z"),
  );
});

test("seavt retains arbitrary JSON coordinate values through direct RMN", () => {
  const row = seavt("concepts/alpha.md", "fm_add", "ni:///sha-256;sH7RSroQa2vF6e6EpZyIShqZnZIkwZXmLPu3emHguY4", "2026-08-19T00:00:00Z");
  assert.equal(entryService.isSeavt(row), true);
  assert.equal(termToJson(row.e), "concepts/alpha.md");
  assert.equal(termToJson(row.a), "fm_add");
  assert.equal(termToJson(row.v), "ni:///sha-256;sH7RSroQa2vF6e6EpZyIShqZnZIkwZXmLPu3emHguY4");
});

test("identifySeavtSemanticContent mints a stable token for the same row and custody, and a different one for a changed row", () => {
  const row = seavt("witness.target", "operator.fmAdd", "record.id", "2026-08-19T00:00:00Z");
  const custody = Object.freeze({ feed: "substrate", partition: "2026-08-19" });

  const first = identifySeavtSemanticContent(row, custody);
  const second = identifySeavtSemanticContent(row, custody);
  assert.equal(first.token, second.token);

  const changed = seavt("witness.target", "operator.fmRemove", "record.id", "2026-08-19T00:00:00Z");
  const third = identifySeavtSemanticContent(changed, custody);
  assert.notEqual(first.token, third.token);
});

test("identifySeavtSemanticContent mints a different token under different custody for the same row", () => {
  const row = seavt("witness.target", "operator.fmAdd", "record.id", "2026-08-19T00:00:00Z");
  const first = identifySeavtSemanticContent(row, Object.freeze({ feed: "substrate", partition: "2026-08-19" }));
  const second = identifySeavtSemanticContent(row, Object.freeze({ feed: "learning", partition: "2026-08-19" }));
  assert.notEqual(first.token, second.token);
});
