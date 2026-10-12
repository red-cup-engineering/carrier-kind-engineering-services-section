import assert from "node:assert/strict";
import test from "node:test";
import { OPENING_GIST_FIELD, OPENING_MOVES, gistOfOpening } from "@red-cup-engineering/organizing/enterprise";
import { gistOf, openedVerbOf, proseOf } from "../src/world-tellings.mjs";

/** The least opening of each kind: the arena's gist field filled, a supply its pool, quantity and window. */
const minimal = (move) => (move === "supply"
  ? { move, by: "holder", resource: "google-flow-credits", amount: 100, unit: "credit", until: "2026-11-01T00:00:00Z" }
  : { move, by: "holder", [OPENING_GIST_FIELD[move]]: `a ${move} in its own words` });

test("the arena names what every opening says", () => {
  assert.deepEqual(Object.keys(OPENING_GIST_FIELD).sort(), [...OPENING_MOVES].sort());
});

test("every opening is told, never as undefined, with a gist", () => {
  for (const move of OPENING_MOVES) {
    const opening = minimal(move);
    assert.notEqual(gistOfOpening(opening), "", move);
    assert.notEqual(gistOf(opening), "", move);
    const prose = proseOf(opening, undefined);
    assert.doesNotMatch(prose, /undefined/u, move);
    assert.doesNotMatch(prose, /“”/u, move);
  }
});

test("a future opening falls back to a structural verb", () => {
  assert.equal(openedVerbOf("pledge"), "opens a pledge");
});
