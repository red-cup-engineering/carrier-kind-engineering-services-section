import test from "node:test";
import assert from "node:assert/strict";
import { chargeValue, sameChargeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { mark } from "@red-cup-engineering/sign-cell/mark";
import { token, claim } from "@red-cup-engineering/sign-cell/utterance";
import { cell, predicateOfClaim } from "@red-cup-engineering/sign-cell/predication";
import { cellGraph, transpose } from "../src/cell-graph.mjs";

const cellOf = (subject, predicate, object) => cell(token(mark(subject)), predicateOfClaim(claim(mark(predicate))), token(mark(object)));

test("cellGraph: a cell reads present at an observation that names it, absent otherwise", () => {
  const a = cellOf("alice", "knows", "bob");
  const b = cellOf("bob", "knows", "carol");
  const graph = cellGraph([a, b], [
    { name: "subject-is-alice", evaluate: (c) => chargeValue(c.subject.mark.value === "alice" ? "potential" : "active") },
  ]);
  assert.ok(sameChargeValue(graph.at(a, "subject-is-alice"), chargeValue("potential")));
  assert.ok(sameChargeValue(graph.at(b, "subject-is-alice"), chargeValue("active")));
});

test("cellGraph: transpose swaps points and states, preserving the value at the swapped coordinate", () => {
  const a = cellOf("alice", "knows", "bob");
  const graph = cellGraph([a], [
    { name: "always-potential", evaluate: () => chargeValue("potential") },
  ]);
  const flipped = transpose(graph);
  assert.ok(sameChargeValue(flipped.at("always-potential", a), chargeValue("potential")));
});
