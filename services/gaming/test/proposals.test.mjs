import { test } from "node:test";
import assert from "node:assert/strict";

import { triple, cell } from "@red-cup-engineering/signcell/cell";
import { admitProposals } from "../src/running/proposals.mjs";

const write = (subject, predicate, object) => triple(cell(subject, predicate, object));
const shape = (result) => ({
  admitted: result.admitted,
  conflicts: result.structure.conflict,
  contested: result.contested.map(({ ids, witnesses }) => ({ ids, kinds: witnesses.map(({ kind }) => kind).sort() })),
});

test("admission is input-order independent and propagates conflicts to causal descendants", () => {
  const proposals = [
    { id: "a", reads: [], writes: [write("coin", "balance", 10)] },
    { id: "b", reads: [{ subject: "coin", predicate: "balance" }], writes: [write("fish", "stock", 3)] },
    { id: "a-next", after: ["a"], reads: [], writes: [write("door", "open", true)] },
    { id: "free", reads: [], writes: [write("bell", "rung", true)] },
  ];
  const first = admitProposals(proposals);
  const shuffled = admitProposals([proposals[3], proposals[2], proposals[1], proposals[0]]);

  assert.deepEqual(shape(first), shape(shuffled));
  assert.deepEqual(first.admitted, ["free"]);
  assert.deepEqual(first.structure.conflict, [["a", "b"], ["a-next", "b"]]);
  assert.ok(first.contested.some(({ ids, witnesses }) => ids.join() === "a-next,b" && witnesses.some(({ inherited }) => inherited)));
  assert.equal(first.judgment.kind, "game.configuration:witness");
});

test("one overlapping write excludes whole proposals and dependents; matching values still conflict", () => {
  const batch = [
    { id: "atomic", reads: [], writes: [write("ore", "stock", 4), write("wood", "stock", 2)] },
    { id: "same-value", reads: [], writes: [write("ore", "stock", 4)] },
    { id: "dependent", after: ["atomic"], reads: [], writes: [write("tool", "kind", "axe")] },
    { id: "independent", reads: [], writes: [write("fish", "stock", 1)] },
  ];
  const result = admitProposals(batch);

  assert.deepEqual(result.admitted, ["independent"]);
  assert.ok(result.contested.some(({ ids, witnesses }) => ids.join() === "atomic,same-value"
    && witnesses.some(({ kind }) => kind === "write-write")));
  assert.equal(result.judgment.kind, "game.configuration:witness");
});

test("unknown, duplicate, and cyclic dependencies are rejected", () => {
  assert.throws(() => admitProposals([{ id: "a", reads: [], writes: [], after: ["missing"] }]), /unknown dependency/u);
  assert.throws(() => admitProposals([{ id: "a", reads: [], writes: [] }, { id: "a", reads: [], writes: [] }]), /duplicate proposal id/u);
  assert.throws(() => admitProposals([
    { id: "a", reads: [], writes: [], after: ["b"] },
    { id: "b", reads: [], writes: [], after: ["a"] },
  ]), /cyclic dependency/u);
});

test("causally ordered writes at one address remain successive effects", () => {
  const result = admitProposals([
    { id: "first", reads: [], writes: [write("actor", "located-in", "harbor")] },
    { id: "next", after: ["first"], reads: [{ subject: "actor", predicate: "located-in" }], writes: [write("actor", "located-in", "road")] },
  ]);
  assert.deepEqual(result.admitted, ["first", "next"]);
  assert.deepEqual(result.structure.conflict, []);
  assert.equal(result.judgment.kind, "game.configuration:witness");
});

test("read-only observation coexists with take at the shared pre-tick boundary", () => {
  const result = admitProposals([
    { id: "look", reads: [{ subject: "coin", predicate: "located-in" }], writes: [] },
    { id: "take", reads: [{ subject: "coin", predicate: "located-in" }], writes: [write("coin", "located-in", "player")] },
  ]);
  assert.deepEqual(result.admitted, ["look", "take"]);
  assert.deepEqual(result.contested, []);
  assert.equal(result.judgment.kind, "game.configuration:witness");
});

test("contested witness order is independent of footprint array order", () => {
  const left = {
    id: "left",
    reads: [{ subject: "a", predicate: "state" }, { subject: "b", predicate: "state" }],
    writes: [write("a", "state", "new"), write("b", "state", "new")],
  };
  const right = {
    id: "right",
    reads: [{ subject: "b", predicate: "state" }, { subject: "a", predicate: "state" }],
    writes: [write("a", "state", "old"), write("b", "state", "old")],
  };
  const first = admitProposals([left, right]);
  const reversed = admitProposals([{
    ...left,
    reads: [...left.reads].reverse(),
    writes: [...left.writes].reverse(),
  }, {
    ...right,
    reads: [...right.reads].reverse(),
    writes: [...right.writes].reverse(),
  }]);
  assert.deepEqual(first.contested, reversed.contested);
});
