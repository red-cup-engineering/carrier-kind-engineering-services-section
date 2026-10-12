import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { readAgency } from "@red-cup-engineering/organizing/agency";
import { releaseAgency } from "@red-cup-engineering/organizing/agency/held";
import { semanticBytes } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { createEngine, join, submit, step } from "@red-cup-engineering/feltos/engine";
import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { tell, placeOf, certainValue, subjects } from "@red-cup-engineering/feltos/world";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { metroplatGame, worldCapability, worldOperations } from "../src/world.mjs";
import { worldAtlas } from "../src/world-atlas.mjs";
import { emptyTellings, foldTellings, worldPlaces } from "../src/world-tellings.mjs";
import { pulseSites } from "../src/world-pulse.mjs";

const game = defineGame({ id: "metro-live", name: "The house", start: "plaza", capabilities: ["metroplat.world"],
  rooms: { plaza: { name: "The plaza", description: "Shared ground", exits: {} } }, things: {} });
const actor = actorIdFor("alice");
const agency = { enterprises: new Map([["lab", { id: "lab", name: "The laboratory", sectionPath: "services/laboratory" }]]), offices: new Map() };
const runtime = composeCapabilities([worldCapability({ verbs: new Map() })]);
const claim = (subject, predicate, object) => ({ subject, predicate, object });
function authored() {
  const started = join(createEngine(game), actor);
  const world = tell(started.world, [
    claim("laboratory", "kind", "room"), claim("laboratory", "name", "The new laboratory"),
    claim("laboratory", "description", "A place authored after startup"), claim("laboratory", "section-path", "services/laboratory"),
    claim("laboratory", "exit:up", "plaza"), claim("laboratory", "located-in", "world:metro-live"),
    claim("other-lab", "kind", "room"), claim("other-lab", "name", "The second laboratory"),
    claim("other-lab", "section-path", "services/other-laboratory"), claim("other-lab", "exit:up", "plaza"), claim("other-lab", "located-in", "world:metro-live"),
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

test("a full typed world look returns a serializable turn through first entry and repeated reading", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "metroplat-world-turn-"));
  const agencyRoot = path.join(directory, "lib");
  mkdirSync(agencyRoot);
  try {
    const operations = worldOperations({ agencyRoot, dataRoot: path.join(directory, "data") }, () => [], { title: "Receiving house" });
    const command = operations.find(operation => operation.verb === "world-command");
    for (let turn = 0; turn < 2; turn += 1) {
      const result = await command.execute({ line: "look" });
      assert.equal(result.kind, "metroplat.world.turn");
      assert.equal(result.situation.place, "plaza");
      assert.ok(result.messages.some(line => line.includes("The World")));
      assert.ok(semanticBytes(result).length > 0);
    }
  } finally {
    releaseAgency(agencyRoot);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("typed look reads a real work-board telling by a normally built house-root office", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "metroplat-world-telling-"));
  const agencyRoot = path.join(directory, "lib");
  const section = "emsenn/services/561-group";
  const pool = path.join(agencyRoot, section, "lib/agency/offices");
  mkdirSync(pool, { recursive: true });
  writeFileSync(path.join(pool, "researcher.json"), JSON.stringify({ id: "researcher", name: "Researcher" }));
  try {
    const agency = readAgency(agencyRoot, { acts: [] });
    const office = [...agency.offices.values()][0];
    const binding = { agencyRoot, dataRoot: path.join(directory, "data"), now: () => "2026-10-09T00:00:00.000Z" };
    const aim = workBoardStore(binding, { agency: () => agency }).play({
      move: "aim", by: office.key, purpose: "Every office retains its actual room.",
    });
    const operations = worldOperations(binding, () => [], { title: "Receiving house" });
    const command = operations.find(operation => operation.verb === "world-command");
    // A first look auto-connects and names the retained telling before returning.
    const looked = await command.execute({ line: "look" });
    assert.equal(looked.kind, "metroplat.world.turn");
    assert.ok(semanticBytes(looked).length > 0);
    const connected = await operations.find(operation => operation.verb === "world-connect").execute({});
    const telling = connected.packages.find(entry => entry.name === "Work.Tellings").data.tellings.find(entry => entry.thread === aim.id);
    assert.equal(telling.who, "the Researcher of 561 Group");
    assert.notEqual(telling.room, "plaza");
    assert.ok(semanticBytes(connected).length > 0);
  } finally {
    releaseAgency(agencyRoot);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("normally built root, app and services offices retain their actual native hall when named", async t => {
  const directory = mkdtempSync(path.join(tmpdir(), "metroplat-world-offices-"));
  const root = path.join(directory, "lib");
  const sections = [
    "emsenn/services/561-group",
    "emsenn/services/561-group/apps/research-console",
    "emsenn/services/561-group/services/laboratory",
  ];
  try {
    for (const section of sections) {
      const pool = path.join(root, section, "lib/agency/offices");
      mkdirSync(pool, { recursive: true });
      writeFileSync(path.join(pool, "researcher.json"), JSON.stringify({ id: "researcher", name: "Researcher" }));
    }
    const agency = readAgency(root, { acts: [] });
    assert.equal(agency.offices.size, sections.length);
    const game = metroplatGame(agency, { root, identity: { title: "Receiving house" } });
    const { world } = createEngine(game);
    const places = worldPlaces({ world, agency, plaza: "plaza" });
    for (const office of agency.offices.values()) {
      await t.test(office.sectionPath, () => {
      const thing = subjects(world).find(subject => certainValue(world, subject, "office-key") === office.key);
      assert.equal(typeof thing, "string", office.key);
      const hall = certainValue(world, thing, "located-in");
      assert.equal(certainValue(world, hall, "kind"), "room", office.key);
      assert.equal(places.nameOf(office.key), `the Researcher of ${certainValue(world, hall, "name")}`, office.key);
      assert.equal(places.placeOf({ by: office.key }), hall, office.key);
      });
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("office placement follows native relocation and refuses unresolved or duplicate bindings", () => {
  const key = "services/laboratory#researcher";
  const agency = { enterprises: new Map(), offices: new Map([[key, {
    key, id: "researcher", name: "Researcher", sectionPath: "services/laboratory",
  }]]) };
  const original = tell(authored().world, [claim("seat", "office-key", key)]);
  const places = world => worldPlaces({ world, agency, plaza: "plaza" });
  assert.equal(places(authored().world).placeOf({ by: key }), "laboratory", "legacy office has section placement without an office-key binding");
  assert.equal(places(authored().world).nameOf(key), "the Researcher of The new laboratory");
  assert.equal(places(original).placeOf({ by: key }), "laboratory");
  const relocated = tell(original, [claim("seat", "located-in", "other-lab")]);
  assert.equal(places(relocated).placeOf({ by: key }), "other-lab");
  assert.equal(places(relocated).nameOf(key), "the Researcher of The second laboratory");
  const told = foldTellings(emptyTellings(), {
    move: "aim", thread: "fixture:office-location", by: key,
    purpose: "Every office retains its actual room.", at: "2026-10-09T00:00:00.000Z",
  }, places(relocated)).tellings[0];
  assert.equal(told.who, "the Researcher of The second laboratory");
  assert.equal(told.room, "laboratory", "the office-derived work section still takes precedence over its default hall");
  for (const [label, unresolved] of [
    ["null location", tell(original, [claim("seat", "located-in", null)])],
    ["missing room", tell(original, [claim("seat", "located-in", "missing-room")])],
    ["non-room location", tell(original, [claim("seat", "located-in", "notes")])],
    ["contested location", tell(original, [{ ...claim("seat", "located-in", "laboratory"), evidence: "stable" }])],
    ["refuted location", tell(original, [{ ...claim("seat", "located-in", "laboratory"), evidence: "active" }])],
    ["duplicate office things", tell(original, [claim("second-seat", "office-key", key), claim("second-seat", "located-in", "other-lab")])],
    ["competing office keys", tell(original, [claim("seat", "office-key", "services/laboratory#another-office")])],
    ["contested office key", tell(original, [{ ...claim("seat", "office-key", key), evidence: "stable" }])],
    ["refuted office key", tell(authored().world, [{ ...claim("seat", "office-key", key), evidence: "active" }])],
  ]) {
    assert.equal(places(unresolved).placeOf({ by: key }), "plaza", label);
    assert.equal(places(unresolved).nameOf(key), "the Researcher of the house", label);
  }
});

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
  let atlas = worldAtlas(game, engine.world);
  const laboratory = atlas.rooms.find(r => r.name === "The new laboratory");
  assert.deepEqual(laboratory.things, { office: 1, skill: 1, book: 1 });
  assert.deepEqual(laboratory.seated, [actor]);
  const places = () => worldPlaces({ world: engine.world, agency, plaza: "plaza" });
  assert.equal(places().roomAt("services/laboratory"), "laboratory");
  assert.equal(places().placeOf({ by: "lab" }), "laboratory");
  assert.equal(places().hears("plaza", "laboratory"), true);
  const site = () => pulseSites({ world: engine.world, agency, root: "/emsenn", characterOf: x => x, standing: () => undefined });
  assert.equal(site()({ subject: "alice" }).rest, "laboratory");
  assert.equal(site()({ subject: "alice", enterprise: "lab" }).room, "laboratory");
  engine = Object.freeze({ ...engine, world: tell(engine.world, [claim("seat", "located-in", "other-lab"), claim("laboratory", "name", "Renamed laboratory")]) });
  atlas = worldAtlas(game, engine.world);
  assert.equal(atlas.rooms.find(r => r.name === "Renamed laboratory").things.office, undefined);
  assert.deepEqual(atlas.rooms.find(r => r.name === "The second laboratory").seated, [actor]);
  assert.equal(site()({ subject: "alice" }).rest, "other-lab");
});

test("an office whose section no room stands over is named as of the house, not an unreadable hall", () => {
  const engine = authored();
  const homeless = { enterprises: new Map(), offices: new Map([["clerk", { id: "clerk", name: "Clerk", sectionPath: "services/nowhere" }]]) };
  const { nameOf } = worldPlaces({ world: engine.world, agency: homeless, plaza: "plaza" });
  assert.equal(nameOf("services/nowhere#clerk"), "the Clerk of the house");
});

test("help read describes the native command without an operation-catalog entry", () => {
  const before = authored();
  const turn = act(before, "help read");
  assert.match(turn.text, /read <book> \[chapter\], read <skill>/);
  assert.match(turn.text, /in your current room/);
  assert.match(turn.text, /omit the chapter number to list chapters/);
  assert.match(turn.text, /A skill has no numbered chapters/);
  assert.match(turn.text, /reading its method grants no authority to execute it/);
  assert.match(turn.text, /look <full displayed name> or examine <full displayed name>/);
  assert.match(turn.text, /look the office of Researcher/);
  assert.match(turn.text, /short description/);
  assert.doesNotMatch(turn.text, /is not installed|Input schema/);
  assert.equal(placeOf(turn.engine.world, actor), placeOf(before.world, actor));
  assert.equal(certainValue(turn.engine.world, "seat", "seated"), actor);
  assert.equal(certainValue(turn.engine.world, "seat", "verb"), "research");
});

test("read help matches existing holdings and location-bound full-name office inspection", t => {
  const directory = mkdtempSync(path.join(tmpdir(), "metroplat-read-chapter-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const chapter = path.join(directory, "chapter.md");
  writeFileSync(chapter, "# Field notes\n\nInspect the actual chapter content.\n");
  const started = authored();
  const named = Object.freeze({ ...started, world: tell(started.world, [
    claim("seat", "name", "the office of Researcher"),
    claim("seat", "description", "Recover the governing knowledge."),
    claim("chapter-notes", "kind", "thing"), claim("chapter-notes", "tag", "book"),
    claim("chapter-notes", "name", "Field notes"), claim("chapter-notes", "slug", "chapter-notes"),
    claim("chapter-notes", "located-in", "laboratory"),
    claim("chapter-notes", "page", { n: 1, title: "Field notes", file: chapter }),
  ]) });
  const engine = act(named, "travel services/laboratory").engine;
  assert.match(act(engine, "read chapter-notes 1").text, /Inspect the actual chapter content\./);
  assert.match(act(engine, "read notes").text, /A current chapter/);
  assert.match(act(engine, "read notes 999").text, /has no chapter 999/);
  assert.match(act(engine, "read observation").text, /Observe the actual effect/);
  assert.match(act(engine, "read observation 1").text, /not a numbered chapter/);
  assert.match(act(engine, "read the office of Researcher").text, /There is no the office of Researcher to read here/);
  assert.match(act(engine, "look Researcher").text, /You do not see Researcher/);
  assert.equal(act(engine, "look the office of Researcher").text, "Recover the governing knowledge.");
  assert.equal(act(engine, "examine THE OFFICE OF RESEARCHER").text, "Recover the governing knowledge.");
  const away = act(engine, "travel plaza").engine;
  assert.match(act(away, "look the office of Researcher").text, /You do not see the office of Researcher/);
});

test("native read help preserves installed-operation and unknown-topic help", () => {
  let executions = 0;
  const power = operation({
    verb: "fixture-reading", summary: "Read a fixture.", description: "A declared fixture contract.",
    run: () => { executions += 1; return {}; },
  });
  const withPower = composeCapabilities([worldCapability({ verbs: new Map([[power.verb, power]]) })]);
  const help = command => step(submit(authored(), { actor, command }), { runtime: withPower })
    .receipt.events.filter(event => event.to === actor).map(event => event.text).join("\n");
  const installed = help("help fixture-reading");
  assert.match(installed, /fixture-reading \(requires standing\)/);
  assert.match(installed, /Read a fixture\./);
  assert.match(installed, /Contract:\nA declared fixture contract\./);
  assert.match(installed, /Input schema:\n\{\}/);
  assert.match(installed, /Output schema:\n\{\}/);
  assert.equal(help("help absent-fixture"), "absent-fixture is not installed. Use operations to discover installed families.");
  assert.equal(executions, 0);
});

