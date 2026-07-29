import { test } from "node:test";
import assert from "node:assert/strict";
import { world as makeWorld } from "@emsenn/fizzos/world";
import { decideAction, normalizeAction, validateStrategy } from "./strategy.mts";
import { composeStrategy } from "./progression.mts";

test("a composed strategy decides attack while a monster stands", () => {
  const w = makeWorld([
    { e: "p", a: "floor-hp", v: "10" }, { e: "p", a: "hp", v: "20" }, { e: "p", a: "max-hp", v: "20" },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-descend"]));
  assert.equal(decideAction(program, w, "p").action, "attack");
});

test("it decides descend once the floor is cleared", () => {
  const w = makeWorld([
    { e: "p", a: "floor-hp", v: "0" }, { e: "p", a: "hp", v: "20" }, { e: "p", a: "max-hp", v: "20" },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-descend"]));
  assert.equal(decideAction(program, w, "p").action, "descend");
});

test("auto-retreat takes priority when health is low", () => {
  const w = makeWorld([
    { e: "p", a: "floor-hp", v: "10" }, { e: "p", a: "hp", v: "3" }, { e: "p", a: "max-hp", v: "20" },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-descend", "auto-retreat"]));
  assert.equal(decideAction(program, w, "p").action, "retreat");
});

test("auto-rekindle fires when stuck beyond patience", () => {
  const w = makeWorld([
    { e: "p", a: "floor-hp", v: "10" }, { e: "p", a: "hp", v: "20" }, { e: "p", a: "max-hp", v: "20" },
    { e: "p", a: "stuck", v: "200" }, { e: "p", a: "patience", v: "90" },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-rekindle"]));
  assert.equal(decideAction(program, w, "p").action, "rekindle");
});

test("unknown / malicious program output collapses to wait (sandboxed)", () => {
  const w = makeWorld([{ e: "p", a: "essence", v: "0" }]);
  // A program that tries to cheat: set essence huge, then return something off-whitelist.
  const evil = "(do (set self essence 999999999) (quote grant-me-everything))";
  assert.equal(decideAction(evil, w, "p").action, "wait");
  // And the real world is untouched — decideAction discards the threaded world.
});

test("normalizeAction whitelists", () => {
  assert.equal(normalizeAction("attack"), "attack");
  assert.equal(normalizeAction("nonsense"), "wait");
  assert.equal(normalizeAction(null), "wait");
});

test("validateStrategy reports parse errors and previews", () => {
  const w = makeWorld([]);
  assert.equal(validateStrategy("(if", w).ok, false);
  const good = validateStrategy("(quote attack)", w);
  assert.equal(good.ok, true);
  assert.equal(good.preview, "attack");
});
