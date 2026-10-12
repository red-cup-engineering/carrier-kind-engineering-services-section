import assert from "node:assert/strict";
import test from "node:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRESENCE_TTL, createPresence, emoteLines, shortId, thirdPerson } from "../src/metroplex-people.mjs";
import { createMetroplex } from "../src/metroplex.mjs";

test("a verb in the third person follows one rule and two irregulars", () => {
  const cases = { wave: "waves", watch: "watches", push: "pushes", fix: "fixes", buzz: "buzzes", go: "goes", do: "does", cry: "cries", play: "plays", be: "is", have: "has", nod: "nods" };
  for (const [verb, third] of Object.entries(cases)) assert.equal(thirdPerson(verb), third, verb);
  assert.deepEqual(emoteLines("Sol", "wave at the clerk"), { self: "You wave at the clerk", others: "Sol waves at the clerk" });
});

test("presence expires after the TTL, keeps recency order, and pages", () => {
  let t = 1_000_000;
  const presence = createPresence({ now: () => t });
  for (let i = 0; i < 50; i++) presence.see(`actor:${i}`, { name: `Person ${i}`, room: i % 2 === 0 ? "a" : "b" });
  assert.equal(presence.page({}).total, 50);
  assert.deepEqual(presence.page({ offset: 48, limit: 10 }).people.map((p) => p.name), ["Person 48", "Person 49"]);
  assert.equal(presence.page({ room: "a" }).total, 25);
  t += PRESENCE_TTL - 1;
  presence.see("actor:0", { name: "Person 0", room: "a" });
  t += 2;
  assert.deepEqual(presence.expire().length, 49, "all but the one seen again have lapsed");
  assert.deepEqual(presence.page({}).people.map((p) => p.name), ["Person 0"]);
  assert.equal(presence.byName("person"), presence.get("actor:0"), "a unique prefix names one");
  assert.equal(shortId("actor:TxHz8_VaNnereVGtvFUhVOP075esK1"), "TxHz8_Va");
});

const GROUP_SERVICES = "lib/emsenn/services/561-group/services";
const LAW = `${GROUP_SERVICES}/561-group-services-section/data/records/schema`;
/** A one-section house of its own, holding the group's law, so the world builds without reading the real tree. */
function fixtureHouse() {
  let repo = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(repo, LAW))) repo = path.dirname(repo);
  const house = mkdtempSync(path.join(tmpdir(), "metroplex-people-house-"));
  mkdirSync(path.join(house, LAW), { recursive: true });
  cpSync(path.join(repo, LAW), path.join(house, LAW), { recursive: true });
  const section = path.join(house, GROUP_SERVICES, "fixture-services-section");
  mkdirSync(section, { recursive: true });
  writeFileSync(path.join(section, "README.md"), "# Fixture\n\nA section for the people to stand in.\n");
  return { house, section };
}

test("the metroplex answers who, tell, finger, look and emote itself, by name, and drops stale presence", async () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplex-people-"));
  const { house, section: worldRoot } = fixtureHouse();
  let t = Date.parse("2026-10-03T12:00:00Z");
  try {
    const city = createMetroplex({
      binding: { dataRoot, agencyRoot: worldRoot }, operations: () => [], identity: { title: "Fixture" },
      now: () => t,
    });
    const sol = await city.connect("sol", { id: "p" });
    await city.connect("luna", { id: "p" });
    assert.ok(sol.packages.some((pkg) => pkg.name === "Room.Players"), "a look carries its people as data");

    const who = await city.command("sol", "who", { id: "p" });
    assert.doesNotMatch(who.messages.join("\n"), /unknown|do not know/iu);
    assert.match(who.messages.join("\n"), /2 present/u);
    assert.match(who.messages.join("\n"), /\bsol\b/u);
    const roster = who.packages.find((pkg) => pkg.name === "Comm.Who").data;
    assert.deepEqual(roster.players.map((p) => p.name).sort(), ["luna", "sol"]);
    assert.equal((await city.command("sol", "who 1 1", { id: "p" })).packages.find((pkg) => pkg.name === "Comm.Who").data.players.length, 1);

    const told = await city.command("sol", "tell luna hi there", { id: "p" });
    assert.match(told.messages.join("\n"), /You tell luna, "hi there"/u);
    const heard = await city.command("luna", "finger sol", { id: "p" });
    assert.match(heard.messages.join("\n"), /sol tells you, "hi there"/u, "a tell waits in the target's queue for its next turn");
    assert.ok(heard.packages.some((pkg) => pkg.name === "Comm.Tell" && pkg.data.words === "hi there"));
    assert.match(heard.messages.join("\n"), /sol is in The Metroplex/u);
    assert.match((await city.command("sol", "tell nobody hi", { id: "p" })).messages.join("\n"), /No one named nobody/u);

    const solWave = await city.command("sol", "emote wave at the clerk", { id: "p" });
    assert.match(solWave.messages.join("\n"), /You wave at the clerk/u);
    const lunaSees = await city.command("luna", "look", { id: "p" });
    assert.match(lunaSees.messages.join("\n"), /sol waves at the clerk/u);
    assert.match(lunaSees.messages.join("\n"), /Here with you: sol/u);

    // An engine line (not one the metroplex composes) reads the display name, with no rewriting in the city.
    await city.command("sol", "say good morning", { id: "p" });
    const engineLine = (await city.command("luna", "look", { id: "p" })).messages.join("\n");
    assert.match(engineLine, /sol says[^\n]*good morning/u);
    assert.doesNotMatch(engineLine, /actor:/u);

    // Luna stays; Sol goes quiet past the TTL and drops.
    t += PRESENCE_TTL - 1;
    await city.command("luna", "who", { id: "p" });
    t += 2;
    const later = await city.command("luna", "who", { id: "p" });
    assert.match(later.messages.join("\n"), /1 present/u);
    assert.deepEqual(later.packages.find((pkg) => pkg.name === "Comm.Who").data.players.map((p) => p.name), ["luna"]);
    assert.match((await city.command("luna", "tell sol still there?", { id: "p" })).messages.join("\n"), /No one named sol/u);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
    rmSync(house, { recursive: true, force: true });
  }
});
