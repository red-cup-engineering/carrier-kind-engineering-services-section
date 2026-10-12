import assert from "node:assert/strict";
import test from "node:test";

import { admitWorkDocument, readEavtDocument } from "../src/admit-work-document.mjs";

const at = ["caller", "test"];

test("work document admission adds active transition facts", () => {
  const source = [
    ["work:1", "operations-manifold.script.action", "scripts.admit-work-document", at],
    ["work:1", "operations-manifold.work.title", "Move the capability", at],
    ["work:1", "operations-manifold.work.intent", "Give the capability an engineering owner", at],
    ["work:1", "operations-manifold.work.success", "The legacy executable is absent", at],
  ].map(JSON.stringify).join("\n");
  const rows = readEavtDocument(admitWorkDocument(source));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.result.admitted" && row[2] === true));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.work.status" && row[2] === "active"));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.work.gate" && row[2] === "record"));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.work.kind" && row[2] === "task"));
});

test("work document admission reports the first missing required field", () => {
  const source = [
    ["work:2", "operations-manifold.script.action", "scripts.admit-work-document", at],
    ["work:2", "operations-manifold.work.title", "Incomplete work", at],
  ].map(JSON.stringify).join("\n");
  const rows = readEavtDocument(admitWorkDocument(source));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.script.obstruction" && row[2] === "missing-read-work-intent"));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.result.admitted" && row[2] === false));
});

test("work document admission is idempotent", () => {
  const source = [
    ["work:3", "operations-manifold.script.action", "scripts.admit-work-document", at],
    ["work:3", "operations-manifold.work.title", "T", at],
    ["work:3", "operations-manifold.work.intent", "I", at],
    ["work:3", "operations-manifold.work.success", "S", at],
  ].map(JSON.stringify).join("\n");
  const once = admitWorkDocument(source);
  assert.equal(admitWorkDocument(once), once);
});
