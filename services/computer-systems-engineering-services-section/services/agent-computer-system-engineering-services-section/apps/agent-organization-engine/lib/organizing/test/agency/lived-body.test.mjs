import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readAgency } from "../../src/agency/index.mjs";
import { addressedTo, livedBodyOf, sessionsOf } from "../../src/agency/lived-body.mjs";

// The house's own registry, read from the repository this test lives in.
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = here.slice(0, here.indexOf(`${path.sep}emsenn${path.sep}services${path.sep}561-group`));
const agency = readAgency(lib, { acts: [] });
const codex = [...agency.characters.values()].find((character) => character.harness === "codex");

const told = {
  masks: [
    { account: "session:a", character: codex.id, reading: "held", at: "2026-10-04T10:00:00Z" },
    { account: "session:b", character: codex.id, reading: "held", at: "2026-10-04T11:00:00Z" },
    { account: "session:a", character: codex.id, reading: "denied", at: "2026-10-04T12:00:00Z" },
    { account: "session:z", character: "actor:someone-else", reading: "held", at: "2026-10-04T10:00:00Z" },
  ],
  carriers: [{ character: codex.id, session: "b", harness: "codex", model: "gpt-6.1-sol", reading: "held", capabilities: ["work-move"] }],
  outcomes: [
    { verdict: "accepted", carrier: "gpt-6.1-sol", player: { by: "junior-engineer", bearer: codex.id } },
    { verdict: "rejected", carrier: "gpt-6.1-sol", player: { by: "junior-engineer", hand: "session:a" } },
    { verdict: "accepted", carrier: "gemini", player: { by: "junior-engineer", hand: "session:z" } },
  ],
  usage: [
    { session: "a", model: "gpt-6.1-sol", input: 100, cached: 80, output: 5 },
    { session: "b", model: "gpt-6.1-sol", input: 50, cached: 40, output: 2 },
    { session: "z", model: "gemini", input: 999, cached: 0, output: 9 },
  ],
  mail: [
    { kind: "mail", id: "m1", to: codex.name, from: "founder", words: "stop releasing by hand", at: "2026-10-04T12:30:00Z" },
    { kind: "mail", id: "m2", to: "office:chief-technology-officer", from: "founder", words: "for the CTO", at: "2026-10-04T12:31:00Z" },
    { kind: "mail", id: "m3", to: "someone-else", from: "founder", words: "not for codex", at: "2026-10-04T12:32:00Z" },
    { kind: "mail-read", id: "m1", session: "b", at: "2026-10-04T12:40:00Z" },
  ],
  memory: [
    { kind: "memory", id: "k1", key: "landing", text: "land through the queue", at: "2026-10-04T09:00:00Z" },
    { kind: "memory", id: "k2", key: "landing", text: "land through the queue; never release by hand", at: "2026-10-04T13:00:00Z" },
    { kind: "memory", id: "k3", key: "old", text: "obsolete", at: "2026-10-04T09:00:00Z" },
    { kind: "memory-retract", key: "old", at: "2026-10-04T10:00:00Z" },
  ],
  offices: ["chief-technology-officer"],
};

test("the sessions a character wore are its held masks, with what its carriers testify", () => {
  const sessions = sessionsOf(codex, told);
  assert.deepEqual(sessions.map((entry) => [entry.session, entry.held]), [["a", false], ["b", true]]);
  assert.equal(sessions.find((entry) => entry.session === "b").model, "gpt-6.1-sol");
});

test("a lived body gathers its standing, spend, mail and memory through the sessions it wore", () => {
  const body = livedBodyOf(agency, codex.id, told);
  assert.equal(body.character.id, codex.id);
  assert.deepEqual(body.present, ["b"]);
  assert.deepEqual([body.standing.accepted, body.standing.rejected], [1, 1], "another body's work is not its own");
  assert.deepEqual(body.standing.byOffice["junior-engineer"], { accepted: 1, rejected: 1, voided: 0 });
  assert.deepEqual(body.spend.tokens, { input: 150, cached: 120, output: 7 });
  assert.deepEqual(body.mail.unread.map((entry) => entry.id), ["m2"], "read by one of its sessions, read by the body");
  assert.equal(body.mail.total, 2);
  assert.deepEqual(body.memory.map((entry) => [entry.key, entry.text]), [["landing", "land through the queue; never release by hand"]]);
  assert.ok(body.organs.some((organ) => organ.derived === "harness"));
});

test("mail reaches a body by its id, key or name, an office it holds, or everyone", () => {
  assert.ok(addressedTo({ to: "*" }, codex));
  assert.ok(addressedTo({ to: codex.id }, codex));
  assert.ok(addressedTo({ to: ["nobody", "office:x"] }, codex, ["x"]));
  assert.ok(!addressedTo({ to: "office:x" }, codex, []));
});
