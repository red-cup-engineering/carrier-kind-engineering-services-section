import test from "node:test";
import assert from "node:assert/strict";

import {
  sWolakRuleClasses,
  sWolakAbsences,
  wolakota,
  actingWolakota,
} from "../dist/index.mjs";

test("S_wolak partitions into seven Scott-continuous rule-classes W1..W7", () => {
  assert.equal(sWolakRuleClasses.length, 7);
  const codes = sWolakRuleClasses.map((c) => c.code);
  assert.deepEqual(codes, ["W1", "W2", "W3", "W4", "W5", "W6", "W7"]);
  for (const cls of sWolakRuleClasses) {
    assert.equal(cls.kind, "organizing-as-lakota.wolakota.rule-class");
    assert.equal(cls.scottContinuous, true);
    assert.equal(typeof cls.name, "string");
    assert.ok(cls.name.length > 0);
    assert.ok(Object.isFrozen(cls));
  }
});

test("the four content-bearing absences are present", () => {
  assert.equal(sWolakAbsences.length, 4);
  const absent = sWolakAbsences.map((a) => a.absent);
  assert.deepEqual(
    [...absent].sort(),
    ["coercion", "external-authority", "property", "punitive"],
  );
  for (const a of sWolakAbsences) {
    assert.equal(a.kind, "organizing-as-lakota.wolakota.absence");
    assert.equal(typeof a.import, "string");
    assert.ok(a.import.length > 0);
    assert.ok(Object.isFrozen(a));
  }
});

test("wolakota() is the coherent discipline with H1=0 in its own scope", () => {
  const w = wolakota();
  assert.equal(w.kind, "organizing-as-lakota.wolakota");
  assert.equal(w.coherent, true);
  assert.equal(w.regime, "scott-continuous");
  assert.equal(w.h1, 0);
  assert.equal(w.recognizedNotDeclared, true);
  assert.equal(w.ruleClasses.length, 7);
  assert.equal(w.absences.length, 4);
  assert.ok(Object.isFrozen(w));
});

test("actingWolakota over a clean conduct seed acts true (no internal contradiction)", () => {
  const seed = [
    "relative|owes-virtue-to-relative",
    "host|witnesses-ceremony",
    "kin|propagates-to-kin",
  ].join("\n");
  const reading = actingWolakota(seed);
  assert.equal(reading.kind, "organizing-as-lakota.wolakota.acting");
  assert.ok(reading.conductCells >= 0);
  assert.equal(reading.internalContradiction, 0);
  assert.equal(reading.acting, true);
  assert.equal(reading.acting, reading.internalContradiction === 0);
  assert.ok(Object.isFrozen(reading));
});
