import test from "node:test";
import assert from "node:assert/strict";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { createEngine, join, submit, step } from "@red-cup-engineering/feltos/engine";
import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { tell, placeOf } from "@red-cup-engineering/feltos/world";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";
import { metroplexCapability } from "../src/metroplex.mjs";
import { metroplexAtlas } from "../src/metroplex-atlas.mjs";
import { worldPlaces } from "../src/metroplex-tellings.mjs";
import { pulseSites } from "../src/metroplex-pulse.mjs";

const game = defineGame({ id: "metro-live", name: "The house", start: "metroplex", capabilities: ["metroplat.metroplex"],
  rooms: { metroplex: { name: "The plaza", description: "Shared ground", exits: {} } }, things: {} });
const actor = actorIdFor("alice");
const agency = { enterprises: new Map([["lab", { id: "lab", name: "The laboratory", sectionPath: "services/laboratory" }]]), offices: new Map() };
const runtime = composeCapabilities([metroplexCapability({ verbs: new Map() })]);
const claim = (subject, predicate, object) => ({ subject, predicate, object });
function authored() {
  const started = join(createEngine(game), actor);
  const world = tell(started.world, [
    claim("metroplex", "exit:lab", "laboratory"), claim("metroplex", "exit:other", "other-lab"),
    claim("laboratory", "kind", "room"), claim("laboratory", "name", "The new laboratory"),
    claim("laboratory", "description", "A place authored after startup"), claim("laboratory", "section-path", "services/laboratory"),
    claim("laboratory", "exit:up", "metroplex"), claim("laboratory", "located-in", "world:metro-live"),
    claim("other-lab", "kind", "room"), claim("other-lab", "name", "The second laboratory"),
    claim("other-lab", "section-path", "services/other-laboratory"), claim("other-lab", "exit:up", "metroplex"), claim("other-lab", "located-in", "world:metro-live"),
    claim("seat", "kind", "thing"), claim("seat", "tag", "office"), claim("seat", "name", "The research office"),
    claim("seat", "located-in", "laboratory"), claim("seat", "seated", actor), claim("seat", "verb", "research"),
    claim("notes", "kind", "thing"), claim("notes", "tag", "book"), claim("notes", "name", "Laboratory notes"),
    claim("notes", "slug", "notes"), claim("notes", "located-in", "laboratory"), claim("notes", "page", { n: 1, title: "A current chapter", file: "unused.md" }),
    claim("method", "kind", "thing"), claim("method", "tag", "skill"), claim("method", "name", "Field observation"),
    claim("method", "slug", "observation"), claim("method", "located-in", "laboratory"),
    claim("method", "method", { source: "authored:field-observation", requires: [], text: "Observe the actual effect." }),
  ], { source: "world.author" });
  return Object.freeze({ ...started, world });
}
function act(engine, command) {
  const turn = step(submit(engine, { actor, command }), { runtime });
  return { engine: turn.engine, text: turn.receipt.events.filter(e => e.to === actor).map(e => e.text).join("\n") };
}

test("the enterprise mudlib discovers, travels to, reports to, and reads holdings authored after startup", () => {
  let engine = authored();
  const located = act(engine, "locate laboratory");
  assert.match(located.text, /The new laboratory/);
  let turn = act(engine, "report");
  assert.equal(placeOf(turn.engine.world, actor), "laboratory");
  assert.match(turn.text, /research office/);
  engine = turn.engine;
  assert.match(act(engine, "read notes").text, /A current chapter/);
  assert.match(act(engine, "read observation").text, /Observe the actual effect/);
  assert.match(act(engine, "powers").text, /research office/);
  engine = Object.freeze({ ...engine, world: tell(engine.world, [
    claim("seat", "located-in", "other-lab"), claim("other-lab", "name", "The relocated laboratory"),
  ]) });
  turn = act(engine, "report");
  assert.equal(placeOf(turn.engine.world, actor), "other-lab");
  assert.match(turn.text, /relocated laboratory/);
  turn = act(turn.engine, "travel services/laboratory");
  assert.equal(placeOf(turn.engine.world, actor), "laboratory");
  assert.match(turn.text, /Laboratory notes/);
  assert.match(turn.text, /Exits: up/);
});

test("atlas, enterprise work placement, hearing, and office pulse share the current authored carrier", () => {
  let engine = authored();
  let atlas = metroplexAtlas(game, engine.world);
  const laboratory = atlas.rooms.find(r => r.name === "The new laboratory");
  assert.deepEqual(laboratory.things, { office: 1, skill: 1, book: 1 });
  assert.deepEqual(laboratory.seated, [actor]);
  const places = () => worldPlaces({ world: engine.world, agency, plaza: "metroplex" });
  assert.equal(places().roomAt("services/laboratory"), "laboratory");
  assert.equal(places().placeOf({ by: "lab" }), "laboratory");
  assert.equal(places().hears("metroplex", "laboratory"), true);
  const site = () => pulseSites({ world: engine.world, agency, root: "/emsenn", characterOf: x => x, standing: () => undefined });
  assert.equal(site()({ subject: "alice" }).rest, "laboratory");
  assert.equal(site()({ subject: "alice", enterprise: "lab" }).room, "laboratory");
  engine = Object.freeze({ ...engine, world: tell(engine.world, [claim("seat", "located-in", "other-lab"), claim("laboratory", "name", "Renamed laboratory")]) });
  atlas = metroplexAtlas(game, engine.world);
  assert.equal(atlas.rooms.find(r => r.name === "Renamed laboratory").things.office, undefined);
  assert.deepEqual(atlas.rooms.find(r => r.name === "The second laboratory").seated, [actor]);
  assert.equal(site()({ subject: "alice" }).rest, "other-lab");
});
