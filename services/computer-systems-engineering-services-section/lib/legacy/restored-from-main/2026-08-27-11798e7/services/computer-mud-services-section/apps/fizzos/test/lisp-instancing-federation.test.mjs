import assert from "node:assert/strict";
import test from "node:test";
import { createFederation, migrateActor, shardForActor, tickFederation } from "../src/federation.mjs";
import { destroyInstance, instantiate } from "../src/instancing.mjs";
import { readLisp, runLisp } from "../src/lisp.mjs";
import { createWorld, move, placeOf, tell, value } from "../src/world.mjs";

test("bounded Lisp reads nested forms, computes, queries, and threads world actions", () => {
  assert.deepEqual(readLisp("'(1 (2 \"three\"))"), ["quote", [1, [2, "three"]]]);
  let world = move(createWorld(), "ship", "harbor");
  let result = runLisp(readLisp("(begin (+ 2 (* 3 4)) (move \"ship\" \"sea\") (place \"ship\"))"), { world });
  assert.equal(result.value, "sea");
  assert.equal(placeOf(result.world, "ship"), "sea");
  assert.throws(() => runLisp(readLisp("(+ 1 (+ 2 (+ 3 4)))"), { world }, { fuel: 2 }), /fuel exhausted/u);
});

test("bounded Lisp decisions can inspect self and short-circuit native numeric facts", () => {
  let world = createWorld({ functionalPredicates: ["depth"] });
  world = tell(world, { subject: "alice", predicate: "depth", object: 7 });
  const result = runLisp(readLisp('(or (and (> (number self "depth") 5) "descend") "wait")'), {
    world,
    self: "alice",
  });
  assert.equal(result.value, "descend");
});

test("instances clone templates into private namespaces and can tear down", () => {
  let world = tell(createWorld(), [
    { subject: "den", predicate: "kind", object: "room" },
    { subject: "den", predicate: "name", object: "A den" },
    { subject: "rat", predicate: "kind", object: "thing" },
    { subject: "rat", predicate: "located-in", object: "den" },
  ]);
  const alice = instantiate(world, { templateRooms: ["den"], owner: "alice", instance: "quest" });
  const bob = instantiate(alice.world, { templateRooms: ["den"], owner: "bob", instance: "quest" });
  assert.notEqual(alice.entry, bob.entry);
  assert.equal(value(bob.world, alice.entry, "instance-owner"), "alice");
  world = destroyInstance(bob.world, alice.namespace);
  assert.equal(placeOf(world, alice.entry), "fizzos:void");
  assert.notEqual(placeOf(world, bob.entry), "fizzos:void");
});

test("federation routes, migrates actor inventory, and ticks every shard", () => {
  let west = createWorld();
  let east = createWorld();
  west = move(west, "alice", "west-room");
  west = move(west, "lantern", "alice");
  let federation = createFederation({ west, east }, { "west-room": "west", "east-room": "east" });
  assert.equal(shardForActor(federation, "alice"), "west");
  federation = migrateActor(federation, "alice", "east-room");
  assert.equal(shardForActor(federation, "alice"), "east");
  assert.equal(placeOf(federation.shards.east, "lantern"), "alice");
  federation = tickFederation(federation, {
    west: (world) => tell(world, { subject: "west-clock", predicate: "tick", object: 1 }),
    east: (world) => tell(world, { subject: "east-clock", predicate: "tick", object: 1 }),
  });
  assert.equal(value(federation.shards.west, "west-clock", "tick"), 1);
  assert.equal(value(federation.shards.east, "east-clock", "tick"), 1);
});
