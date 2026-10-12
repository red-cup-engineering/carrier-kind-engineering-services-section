import { test } from "node:test";
import assert from "node:assert/strict";

import {
  fourVirtues,
  evaluate,
  nacaStanding,
  storyInstallsRule,
} from "../dist/index.mjs";

test("the four virtues are present, each a frozen virtue carrier", () => {
  assert.equal(fourVirtues.length, 4);
  const names = fourVirtues.map((v) => v.lakota);
  assert.deepEqual(
    [...names].sort(),
    [
      "wóksape",
      "wóohitika",
      "wówačhaŋtognaka",
      "wówačhiŋtȟaŋka",
    ].sort(),
  );
  for (const v of fourVirtues) {
    assert.equal(v.kind, "organizing-as-lakota.virtue");
    assert.equal(typeof v.gloss, "string");
    assert.ok(Object.isFrozen(v));
  }
});

test("all four virtues at t settles standing at t (the meet verdict)", () => {
  const profiles = {
    "wówačhaŋtognaka": "potential",
    "wóksape": "potential",
    "wóohitika": "potential",
    "wówačhiŋtȟaŋka": "potential",
  };
  const standing = evaluate(profiles);
  assert.equal(standing.kind, "organizing-as-lakota.standing-as-wolakota");
  assert.equal(standing.standing, "potential");
  assert.ok(Object.isFrozen(standing));
});

test("one virtue failing (f) pulls standing to f (the truth-order meet, not ⊥)", () => {
  const standing = evaluate({
    "wówačhaŋtognaka": "potential",
    "wóksape": "potential",
    "wóohitika": "active",
    "wówačhiŋtȟaŋka": "potential",
  });
  // a single failed virtue settles standing at f (active), per the corpus's four-case
  // table — not at ⊥, which the knowledge-meet would wrongly give.
  assert.equal(standing.standing, "active");
});

test("an incomplete profile (no f) settles at ⊥, not f", () => {
  const standing = evaluate({
    "wówačhaŋtognaka": "potential",
    "wóksape": "potential",
    "wóohitika": "potential",
  });
  assert.equal(standing.standing, "absurd");
});

test("a missing virtue enters the meet at absurd (not-yet-evaluated)", () => {
  // Three at t, one absent -> the meet cannot reach t.
  const standing = evaluate({
    "wówačhaŋtognaka": "potential",
    "wóksape": "potential",
    "wóohitika": "potential",
  });
  assert.notEqual(standing.standing, "potential");
});

test("naca-standing is a function of the profile: all-t -> isNaca true", () => {
  const naca = nacaStanding({
    "wówačhaŋtognaka": "potential",
    "wóksape": "potential",
    "wóohitika": "potential",
    "wówačhiŋtȟaŋka": "potential",
  });
  assert.equal(naca.kind, "organizing-as-lakota.naca-standing");
  assert.equal(naca.isNaca, true);
  assert.equal(naca.standing, "potential");
});

test("a naca who fails a virtue loses standing", () => {
  const naca = nacaStanding({
    "wówačhaŋtognaka": "active",
    "wóksape": "potential",
    "wóohitika": "potential",
    "wówačhiŋtȟaŋka": "potential",
  });
  assert.equal(naca.isNaca, false);
});

test("story-pedagogy installs a dispositional closure-rule", () => {
  const rule = storyInstallsRule(
    "Iktomi's stinginess shames him before the relatives",
    "wówačhaŋtognaka",
  );
  assert.equal(rule.kind, "organizing-as-lakota.story-rule-installation");
  assert.equal(rule.virtue, "wówačhaŋtognaka");
  assert.equal(rule.dispositional, true);
  assert.ok(Object.isFrozen(rule));
});
