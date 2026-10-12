import test from "node:test";
import assert from "node:assert/strict";
import { valueOf } from "@red-cup-engineering/relating";
import { federateGraded } from "../dist/index.mjs";

const source = (id, collection) => ({ id, protocol: "fixture", collection });
const evidence = (cell, value, witness, polarity = "assert") => ({ cell, value, witness, polarity });

test("same admitted positive evidence is shared with every witness", () => {
  const report = federateGraded([
    source("a", [evidence("room.name", "aurora", "a1")]),
    source("b", [evidence("room.name", "aurora", "b1")]),
  ]);
  assert.equal(report.shared.length, 1);
  assert.deepEqual(report.shared[0].witnesses, ["a1", "b1"]);
  assert.equal(report.contested.length, 0);
  assert.equal(report.requiresAdmission.length, 0);
});

test("different positive evidence never fabricates a denial", () => {
  const report = federateGraded([
    source("a", [evidence("room.name", "aurora", "a1")]),
    source("b", [evidence("room.name", "borealis", "b1")]),
  ]);
  assert.equal(report.contested.length, 0);
  assert.equal(report.requiresAdmission.length, 1);
  assert.equal(report.requiresAdmission[0].reason, "multiple-asserted-values");
  assert.deepEqual(report.requiresAdmission[0].statements.map((entry) => entry.witness), ["a1", "b1"]);
});

test("only explicit negative polarity forms falsity evidence", () => {
  const report = federateGraded([
    source("a", [evidence("policy.allowed", true, "a1", "assert")]),
    source("b", [evidence("policy.allowed", true, "b1", "deny")]),
  ]);
  const held = report.contested[0];
  assert.equal(valueOf(held.topCharge).name, "stable");
  assert.deepEqual(held.truthWitnesses, ["a1"]);
  assert.deepEqual(held.falsityWitnesses, ["b1"]);
  assert.equal(report.requiresAdmission.length, 0);
});

test("the decomposition is exhaustive and disjoint", () => {
  const report = federateGraded([
    source("a", [evidence("shared", 1, "a-shared"), evidence("variance", 1, "a-variance"), evidence("contested", true, "a-contested")]),
    source("b", [evidence("shared", 1, "b-shared"), evidence("variance", 2, "b-variance"), evidence("contested", true, "b-contested", "deny")]),
  ]);
  assert.deepEqual(report.decomposition, { exhaustive: true, disjoint: true, shared: 1, contested: 1, requiresAdmission: 1 });
});

test("asserting one value and denying another preserves distinct propositions for admission", () => {
  const report = federateGraded([
    source("a", [evidence("room.name", "aurora", "a1", "assert")]),
    source("b", [evidence("room.name", "borealis", "b1", "deny")]),
  ]);
  assert.equal(report.contested.length, 0);
  assert.equal(report.requiresAdmission[0].reason, "multiple-values-with-mixed-polarity");
  assert.deepEqual(report.requiresAdmission[0].statements.map((entry) => entry.witness), ["a1", "b1"]);
});
