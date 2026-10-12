import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sevenRites,
  performRite,
  compose,
} from "../dist/index.mjs";

test("there are exactly seven rites, each a witness-bearing morphism carrier", () => {
  assert.equal(sevenRites.length, 7);
  for (const r of sevenRites) {
    assert.equal(r.kind, "organizing-as-lakota.rite");
    assert.equal(typeof r.lakota, "string");
    assert.equal(typeof r.gloss, "string");
    assert.equal(typeof r.effect, "string");
    assert.ok(Object.isFrozen(r));
  }
});

test("the seven canonical names are present", () => {
  const names = sevenRites.map((r) => r.lakota);
  assert.ok(names.includes("iníkağapi"));
  assert.ok(names.includes("haŋbléčheyapi"));
  assert.ok(names.includes("wanáǧi yuhápi"));
  assert.ok(names.includes("wiwáŋyaŋg wačhípi"));
  assert.ok(names.includes("huŋkápi"));
  assert.ok(names.includes("išnáthi awíčhalowaŋpi"));
  assert.ok(names.includes("tȟapá wakȟáyap"));
});

test("a rite-form without proper conditions is not the rite-morphism — it fires nothing", () => {
  const perf = performRite("iníkağapi", false, "cell-1");
  assert.equal(perf.kind, "organizing-as-lakota.rite-performance");
  assert.equal(perf.rite, "iníkağapi");
  assert.equal(perf.fired, false);
  assert.equal(perf.reason, "not the rite-morphism: proper conditions absent");
});

test("under proper conditions the rite fires a wakȟáŋ-bearing witness at t (Wí)", () => {
  const perf = performRite("wiwáŋyaŋg wačhípi", true, "polity-cell");
  assert.equal(perf.fired, true);
  assert.equal(perf.wakhanBearing, true);
  assert.equal(perf.witness.kind, "organizing-as-lakota.wakhan-mark");
  assert.equal(perf.witness.bearer, "polity-cell");
  assert.equal(perf.witness.atCharge, "potential");
  // the witness aspect is Wí by the charge ≅ Wakȟáŋ bijection (the algebra's verdict)
  assert.equal(perf.witness.aspect, "Wí");
});

test("rites compose — the witness of one participates in another", () => {
  const c = compose("haŋbléčheyapi", "wiwáŋyaŋg wačhípi");
  assert.equal(c.kind, "organizing-as-lakota.rite-composition");
  assert.equal(c.from, "haŋbléčheyapi");
  assert.equal(c.to, "wiwáŋyaŋg wačhípi");
});
