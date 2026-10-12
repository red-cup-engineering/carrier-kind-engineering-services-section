import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createWorld, tell } from "@red-cup-engineering/feltos/world";
import { readAgency } from "@red-cup-engineering/organizing/agency";
import { agencyAt, releaseAgency } from "@red-cup-engineering/organizing/agency/held";
import { checkpointHistory } from "@red-cup-engineering/signcraft/history";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { emptyTellings, foldTellings, worldPlaces } from "../src/world-tellings.mjs";
import { createQuests } from "../src/world-quests.mjs";
const agency = { enterprises: new Map([["lab", { id: "lab", name: "The laboratory", sectionPath: "services/laboratory" }]]), offices: new Map() };
const claim = (subject, predicate, object) => ({ subject, predicate, object });
function authored() {
  return { world: tell(createWorld({ functionalPredicates: ["exit:up"] }), [
    claim("plaza", "kind", "room"), claim("plaza", "name", "The plaza"),
    claim("laboratory", "kind", "room"), claim("laboratory", "name", "The new laboratory"),
    claim("laboratory", "section-path", "services/laboratory"), claim("laboratory", "exit:up", "plaza"),
    claim("other-lab", "kind", "room"), claim("other-lab", "name", "The second laboratory"),
    claim("other-lab", "section-path", "services/other-laboratory"), claim("other-lab", "exit:up", "plaza"),
  ]) };
}

function liveFixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "metroplat-freshness-"));
  const agencyRoot = path.join(directory, "lib"), section = "emsenn/services/561-group/services/laboratory";
  const pool = path.join(agencyRoot, section, "lib/agency/offices");
  mkdirSync(pool, { recursive: true });
  const author = (id, name = id) => {
    const file = path.join(pool, `${id}.json`);
    writeFileSync(file, JSON.stringify({ id, name }));
    return file;
  };
  author("researcher", "Researcher");
  const binding = { agencyRoot, dataRoot: path.join(directory, "data"), now: () => "2026-10-09T00:00:00.000Z" };
  return { binding, author, section, close() { releaseAgency(agencyRoot); rmSync(directory, { recursive: true, force: true }); } };
}

test("placement is derived once per immutable world and exact agency/name context", () => {
  const world = authored().world;
  const options = { world, agency, plaza: "plaza" };
  const first = worldPlaces(options);
  assert.equal(new Set(Array.from({ length: 500 }, () => worldPlaces(options))).size, 1);
  const unchanged = checkpointHistory(world);
  assert.notEqual(unchanged, world);
  assert.equal(worldPlaces({ ...options, world: unchanged }), first, "equal-head checkpoint carries a provider-proven equivalent reading");
  const unrelated = tell(world, [claim("notes", "description", "A later note")]);
  assert.notEqual(worldPlaces({ ...options, world: unrelated }), first, "the broad subjects dependency remains conservative");
  assert.equal(worldPlaces(options), first, "an old immutable snapshot retains its reading");
  const renamedAgency = { ...agency, enterprises: new Map([["lab", { ...agency.enterprises.get("lab"), name: "A different laboratory" }]]) };
  const renamed = worldPlaces({ ...options, agency: renamedAgency });
  assert.notEqual(renamed, first);
  assert.equal(renamed.nameOf("lab"), "A different laboratory");
  assert.equal(first.nameOf("lab"), "The laboratory");
  const one = () => "One character", two = () => "Another character";
  const named = worldPlaces({ ...options, characterName: one });
  assert.equal(worldPlaces({ ...options, characterName: one }), named);
  assert.equal(named.nameOf("alice"), "One character");
  assert.equal(worldPlaces({ ...options, characterName: two }).nameOf("alice"), "Another character");
  assert.notEqual(worldPlaces({ ...options, plaza: "other-lab" }), first);
});

test("placement callbacks follow new rooms, names and exits without rewriting old tellings", () => {
  const old = authored().world;
  const first = worldPlaces({ world: old, agency, plaza: "plaza" });
  assert.deepEqual(first.chainOf("laboratory"), ["laboratory", "plaza"]);
  const told = foldTellings(emptyTellings(), { move: "aim", thread: "fixture:historical", by: "lab",
    purpose: "The laboratory remains accessible.", at: "2026-10-09T00:00:00.000Z" }, first).tellings[0];
  const after = tell(old, [claim("annex", "kind", "room"), claim("annex", "name", "The annex"),
    claim("annex", "section-path", "services/laboratory/annex"), claim("annex", "exit:up", "laboratory"),
    claim("laboratory", "exit:up", "other-lab"), claim("laboratory", "name", "Renamed lab")]);
  const next = worldPlaces({ world: after, agency, plaza: "plaza" });
  assert.equal(next.roomAt("services/laboratory/annex"), "annex");
  assert.deepEqual(next.chainOf("annex"), ["annex", "laboratory", "other-lab", "plaza"]);
  assert.deepEqual(first.chainOf("laboratory"), ["laboratory", "plaza"]);
  assert.equal(first.roomAt("services/laboratory/annex"), "laboratory");
  assert.equal(told.room, "laboratory");
  assert.equal(told.who, "The laboratory");
});

test("quests reuse actual placement and see a journal move inside the former freshness window", () => {
  const fixture = liveFixture();
  try {
    const agency = () => agencyAt(fixture.binding.agencyRoot);
    const clock = Date.parse(fixture.binding.now());
    const store = workBoardStore(fixture.binding, { agency });
    const quests = createQuests({ binding: fixture.binding, agency, now: () => clock });
    const native = worldPlaces({ world: authored().world, agency: agency(), plaza: "plaza" });
    let placements = 0;
    const places = { ...native, placeOf(thread) { placements++; return native.placeOf(thread); } };
    const first = store.play({ move: "aim", by: "alice", purpose: "The laboratory remains accessible." });
    assert.equal(quests.named(first.id, places).length, 1);
    assert.equal(placements, 1);
    assert.equal(quests.named(first.id, places).length, 1);
    quests.market(places);
    assert.equal(placements, 1, "unchanged board and placement share the computed room map");
    const next = store.play({ move: "aim", by: "alice", purpose: "The laboratory retains its records." });
    assert.equal(quests.named(next.id, places).length, 1, "incoming work appears without forget or a clock timeout");
    assert.equal(placements, 3);
  } finally { fixture.close(); }
});

test("agency identity invalidates quest agendas within the same journal and clock reading", () => {
  const fixture = liveFixture();
  try {
    let agency = readAgency(fixture.binding.agencyRoot, { acts: [] });
    const office = [...agency.offices.values()][0];
    const missingKey = `${fixture.section}#new-office`;
    const store = workBoardStore(fixture.binding, { agency: () => agency });
    const opening = store.play({ move: "ask", by: "alice", to: "#new-office", question: "Which laboratory room holds the records?" });
    const quests = createQuests({ binding: fixture.binding, agency: () => agency, now: () => Date.parse(fixture.binding.now()) });
    const places = worldPlaces({ world: authored().world, agency, plaza: "plaza" });
    assert.equal(quests.journal([missingKey], places).length, 0);
    fixture.author("new-office", "New office");
    agency = readAgency(fixture.binding.agencyRoot, { acts: [] });
    const journal = quests.journal([missingKey], places);
    assert.ok(journal.some(entry => entry.id === opening.id));
    assert.equal(office.id, "researcher");
  } finally { fixture.close(); }
});

test("clock-only eligibility changes the quest horizon without new journal bytes", () => {
  const fixture = liveFixture();
  try {
    let clock = Date.parse(fixture.binding.now());
    const agency = () => agencyAt(fixture.binding.agencyRoot);
    const binding = { ...fixture.binding, now: () => new Date(clock).toISOString() };
    const store = workBoardStore(binding, { agency });
    const opening = store.play({ move: "aim", by: "alice", purpose: "The laboratory remains accessible." });
    clock += 1000;
    store.play({ move: "hold", by: "bob", thread: opening.id });
    clock -= 1000;
    const quests = createQuests({ binding, agency, now: () => clock });
    const places = worldPlaces({ world: authored().world, agency: agency(), plaza: "plaza" });
    const earlier = quests.named(opening.id, places)[0];
    assert.equal(quests.detail(earlier, places).quest.horizon, "later");
    clock += 1000;
    assert.equal(quests.detail(earlier, places).quest.horizon, "now", "an older selected thread is resolved in the current board");
    assert.equal(quests.detail(quests.named(opening.id, places)[0], places).quest.horizon, "now");
    assert.throws(() => quests.detail({ id: "absent-thread" }, places), /not in the current board/);
  } finally { fixture.close(); }
});

test("time-only board refresh reuses room placement while changed world context replaces it", () => {
  const fixture = liveFixture();
  try {
    let clock = Date.parse(fixture.binding.now());
    const agency = () => agencyAt(fixture.binding.agencyRoot);
    const store = workBoardStore(fixture.binding, { agency });
    const opening = store.play({ move: "aim", by: "alice", scope: ["services/laboratory"], purpose: "The laboratory remains accessible." });
    const quests = createQuests({ binding: fixture.binding, agency, now: () => clock });
    const oldWorld = authored().world;
    const native = worldPlaces({ world: oldWorld, agency: agency(), plaza: "plaza" });
    let placements = 0;
    const places = { ...native, placeOf(thread) { placements++; return native.placeOf(thread); } };
    assert.equal(quests.detail(quests.named(opening.id, places)[0], places).quest.room, "laboratory");
    assert.equal(placements, 1);
    clock += 1;
    assert.equal(quests.detail(quests.named(opening.id, places)[0], places).quest.room, "laboratory");
    assert.equal(placements, 1, "time changes replay projection but not opening placement");
    const changed = tell(oldWorld, [claim("laboratory", "kind", "thing"), claim("relocated", "kind", "room"), claim("relocated", "section-path", "services/laboratory"), claim("relocated", "exit:up", "plaza")]);
    const moved = worldPlaces({ world: changed, agency: agency(), plaza: "plaza" });
    assert.equal(quests.detail(quests.named(opening.id, moved)[0], moved).quest.room, "relocated");
    assert.equal(quests.detail(quests.named(opening.id, places)[0], places).quest.room, "laboratory");
    assert.equal(placements, 2, "returning to an older immutable placement never borrows the current rooms");
  } finally { fixture.close(); }
});
