import test from "node:test";
import assert from "node:assert/strict";

import {
  takuye,
  wotakuye,
  iyuhaSni,
  yuhapi,
  hunkapi,
} from "../dist/index.mjs";

test("takuye is a frozen kin-cell carrier with substance shape", () => {
  const cell = takuye("tatanka", "kin-of", "makha");
  assert.equal(cell.kind, "organizing-as-lakota.takuye");
  assert.equal(cell.subject, "tatanka");
  assert.equal(cell.predicate, "kin-of");
  assert.equal(cell.object, "makha");
  // default charge is t (Wí) — bound
  assert.equal(cell.charge, "potential");
  assert.ok(Object.isFrozen(cell));
});

test("takuye honors an explicit charge", () => {
  const cell = takuye("a", "kin-of", "b", "absurd");
  assert.equal(cell.charge, "absurd");
});

test("wotakuye binds at least one kin-cell over a small seed and binds:true", () => {
  const w = wotakuye("tatanka|kin-of\nmakha|kin-of");
  assert.equal(w.kind, "organizing-as-lakota.wotakuye");
  assert.equal(w.binds, true);
  assert.ok(w.kinCells >= 1, "membrane has kin-cells");
  assert.ok(w.bound >= 1, "at least one relation is bound at t");
  // the tallies partition the kin-cells
  assert.equal(w.bound + w.unsettled + w.contested, w.kinCells);
  assert.ok(Object.isFrozen(w));
});

test("iyuhaSni withdraws to absurd, does not sever, and cannot bind (the asymmetry)", () => {
  const i = iyuhaSni("agent", "engagement");
  assert.equal(i.kind, "organizing-as-lakota.iyuha-sni");
  assert.equal(i.agent, "agent");
  assert.equal(i.engagement, "engagement");
  assert.equal(i.retractsTo, "absurd");
  assert.equal(i.severs, false);
  assert.equal(i.binds, false);
  assert.ok(Object.isFrozen(i));
});

test("yuhapi produces a witness-bearing cell", () => {
  const y = yuhapi("praying-one", "spirit-kin");
  assert.equal(y.kind, "organizing-as-lakota.yuhapi");
  assert.equal(y.witness, "praying-one");
  assert.equal(y.relation, "spirit-kin");
  assert.equal(y.bears, "witness");
  assert.ok(Object.isFrozen(y));
});

test("hunkapi installs two reciprocal kin-cells at t — the most-formal wotakuye", () => {
  const h = hunkapi("a", "b");
  assert.equal(h.kind, "organizing-as-lakota.hunkapi");
  assert.equal(h.mostFormalWotakuye, true);
  assert.equal(h.installed.length, 2);

  const [first, second] = h.installed;
  assert.equal(first.kind, "organizing-as-lakota.takuye");
  assert.equal(first.subject, "a");
  assert.equal(first.object, "b");
  assert.equal(first.predicate, "kin-of");
  assert.equal(first.charge, "potential");

  assert.equal(second.subject, "b");
  assert.equal(second.object, "a");
  assert.equal(second.charge, "potential");

  assert.ok(Object.isFrozen(h));
  assert.ok(Object.isFrozen(h.installed));
});
