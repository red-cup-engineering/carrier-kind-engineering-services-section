import assert from "node:assert/strict";
import test from "node:test";
import { catalog, defineResource, defineShipClass } from "../src/catalogs.mjs";
import { facultyCapability, bootstrapFaculties } from "../src/faculties.mjs";
import { facultySection, glueFacultyCover } from "../src/faculty-cover.mjs";
import { castTroupe } from "../src/inhabiting.mjs";
import { action, chronicle, design } from "../src/playing.mjs";
import { runtimeEcology, runtimeTrace } from "../src/runtime-ecology.mjs";
import { renderSoul, soulEmote } from "../src/soul.mjs";
import { teraumGame } from "../examples/teraum.mjs";

test("resource and ship-class catalogs validate domain data", () => {
  const entries = catalog([
    defineResource({ id: "fish", ware: "fresh-fish", yield: 2, verbs: ["fish"] }),
    defineShipClass({ id: "cutter", hull: 50, speed: 4, capacity: 8, materials: { timber: 10 } }),
  ]);
  assert.equal(entries.fish.yield, 2);
  assert.equal(entries.cutter.capacity, 8);
});

test("faculty covers expose contradiction and the ecology names real capabilities", () => {
  const cover = glueFacultyCover([
    facultySection("knowing", { rain: "true" }),
    facultySection("communicating", { rain: "false" }),
  ]);
  assert.equal(cover.glued, false);
  assert.equal(cover.cells.rain, "both");
  assert.equal(bootstrapFaculties().kind, "fizzos.faculty-ecology.v1");
  assert.equal(facultyCapability("playing", "cut"), true);
});

test("inhabiting admits only candidates with a real orthogonal practiced design", () => {
  const discipline = design("discipline", [chronicle([action({ address: "x", polarity: "negative", move: "receive", daimon: true })])]);
  const candidate = design("candidate", [chronicle([action({ address: "x", polarity: "positive", move: "offer", daimon: true })])]);
  const result = castTroupe([{ id: "alice", designs: [candidate] }, { id: "bob", designs: [] }], [{ id: "healing", generators: [discipline] }]);
  assert.deepEqual(result.admitted.map(({ candidate }) => candidate), ["alice"]);
  assert.deepEqual(result.refused.map(({ candidate }) => candidate), ["bob"]);
});

test("soul rendering addresses actor, room, and target distinctly", () => {
  const emote = soulEmote({ actor: "alice", target: "bob", actorText: "You smile at Bob.", roomText: "Alice smiles at Bob.", targetText: "Alice smiles warmly at you." });
  assert.equal(renderSoul(emote, "alice"), "You smile at Bob.");
  assert.equal(renderSoul(emote, "bob"), "Alice smiles warmly at you.");
  assert.equal(renderSoul(emote, "cara"), "Alice smiles at Bob.");
});

test("runtime traces are grouped and Teraum is owned as ordinary game data", () => {
  const trace = runtimeTrace({ tick: 1, capability: "ecology", input: "sea", output: "growth" });
  assert.deepEqual(runtimeEcology([trace]).byCapability.ecology, [trace]);
  assert.equal(teraumGame.rooms["central-plains"].exits.east, "gloaming-road");
});
