/**
 * One reading of who played an act (`playerOfAct`) and whose call it was (`subjectOf`), as the cast
 * module tells them. Each table below is the cases one deleted variant answered, with the answer it
 * gave; the one function answers them the same. A case that moves is a behaviour change.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { playerOfAct } from "../../src/agency/cast.mjs";
import { subjectOf } from "@red-cup-engineering/computer-networking-engineering-services-section/identity/subject";

const parent = "emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-board-of-directors#executive-assistant-to-the-board-of-directors";
const child = "emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-board-of-directors/services/561-group-board-of-directors-leader-movement-team#trusted-assistant-to-the-leader";
const childShort = "services/561-group-services-section/services/561-group-operations-services-section/services/561-group-board-of-directors/services/561-group-board-of-directors-leader-movement-team#trusted-assistant-to-the-leader";
const section = "services/561-group-services-section/services/561-group-operations-services-section/services/561-group-board-of-directors/services/561-group-board-of-directors-leader-movement-team";

/** The smallest registry the readings touch: offices, and the accounts that are organs of a character. */
const agency = {
  offices: new Map([[parent, { key: parent }], [child, { key: child }]]),
  officeReferences: new Map([[childShort, { key: child }]]),
  organs: new Map([["organ", { account: "account:ada", of: ["ada"], sectionPath: "s" }]]),
  characters: new Map([["ada", { id: "ada", key: "s#ada" }]]),
  enterprises: new Map(),
  byId: { characters: new Map([["ada", [{ id: "ada", key: "s#ada", sectionPath: "s" }]]]) },
};

test("subjectOf: the invocation subject, as the claims, work and clock variants read it", () => {
  const cases = [
    [{ invocation: { subject: "account:ada" } }, undefined, "account:ada"],
    [{ invocation: { id: "i" } }, undefined, undefined],
    [{}, undefined, undefined],
    [undefined, undefined, undefined],
    // the world, offices, clock variants told an unauthenticated call as "anonymous"
    [{ invocation: { subject: "account:ada" } }, "anonymous", "account:ada"],
    [{ invocation: {} }, "anonymous", "anonymous"],
    [{}, "anonymous", "anonymous"],
    [undefined, "anonymous", "anonymous"],
    // an invocation itself reads as its context does
    [{ subject: "account:ada" }, undefined, "account:ada"],
  ];
  for (const [source, otherwise, expected] of cases) assert.equal(subjectOf(source, otherwise), expected, JSON.stringify([source, otherwise]));
});

test("subjectOf: an HTTP principal, as the operations console variants read it", () => {
  const cases = [
    [{ provider: "bearer", subjectHash: "abc123" }, "abc123"],
    [{ provider: "google", subjectHash: "abc123" }, "google:abc123"],
    [{ provider: "github", subjectHash: "f00" }, "github:f00"],
  ];
  for (const [principal, expected] of cases) assert.equal(subjectOf(principal), expected);
});

test("playerOfAct: a recorded act, as the cast reads it (decision evidence names the mask)", () => {
  const admitted = (...issuers) => ({ evidence: ["unrelated", 7, ...issuers.map((issuer) => `admitted-by:${issuer}`)] });
  const cases = [
    // [invocation, decision, { by, bearer, hand, masks }]
    [{ subject: "account:ada" }, admitted("office:s#lead"), { by: "s#lead", bearer: "account:ada", hand: "account:ada", masks: ["office:s#lead"] }],
    [{ subject: "account:ada", caller: { hand: "session:1" } }, admitted("allocation:a1"), { by: "allocation:a1", bearer: "account:ada", hand: "session:1", masks: ["allocation:a1"] }],
    [{ subject: "account:ada" }, admitted("office:s#lead", "office:s#lead"), { by: "s#lead", bearer: "account:ada", hand: "account:ada", masks: ["office:s#lead", "office:s#lead"] }],
    [{ subject: "account:ada" }, admitted("office:s#a", "office:s#b"), { by: "account:ada", bearer: "account:ada", hand: "account:ada", masks: ["office:s#a", "office:s#b"] }],
    [{ subject: "account:ada" }, undefined, { by: "account:ada", bearer: "account:ada", hand: "account:ada", masks: [] }],
  ];
  for (const [invocation, decision, expected] of cases) {
    const player = playerOfAct({ ...agency, organs: new Map() }, { invocation, decision });
    assert.deepEqual({ ...player, masks: [...player.masks] }, { kind: "organizing.agency.act-player", ...expected });
  }
  assert.equal(playerOfAct(agency, { invocation: {}, decision: undefined }), undefined);
  assert.equal(playerOfAct(agency, { invocation: { subject: "" } }), undefined);
});

test("playerOfAct: who the caller is, as the metroplat enterprise-actor variant read it ({ bearer, hand })", () => {
  const cases = [
    // an account that is an organ of a character acts as that bearer, through the session it came by
    [{ subject: "account:ada", caller: { hand: "session:1" } }, { bearer: "ada", hand: "session:1" }],
    [{ subject: "account:ada" }, { bearer: "ada", hand: "account:ada" }],
    // an account no character names is its own bearer
    [{ subject: "account:eve", caller: { hand: "session:9" } }, { bearer: "account:eve", hand: "session:9" }],
    [{ subject: "account:eve" }, { bearer: "account:eve", hand: "account:eve" }],
  ];
  for (const [invocation, expected] of cases) {
    const { bearer, hand } = playerOfAct(agency, { invocation });
    assert.deepEqual({ bearer, hand }, expected);
  }
});

test("playerOfAct: several characters require an explicit currently associated bearer", () => {
  const two = {
    ...agency,
    organs: new Map([["o1", { account: "account:ada", of: ["ada"], sectionPath: "s" }], ["o2", { account: "account:ada", of: ["bo"], sectionPath: "s" }]]),
    byId: { characters: new Map([["ada", [{ id: "ada", sectionPath: "s" }]], ["bo", [{ id: "bo", sectionPath: "s" }]]]) },
  };
  const invocation = { subject: "account:ada" };
  assert.throws(() => playerOfAct(two, { invocation }), /select the bearer/);
  assert.equal(playerOfAct(two, { invocation, bearer: "bo" }).bearer, "bo");
  assert.equal(playerOfAct(two, { invocation, bearer: "ada" }).bearer, "ada");
  assert.equal(playerOfAct(two, { invocation, bearer: "account:ada" }).bearer, "account:ada");
  assert.throws(() => playerOfAct(two, { invocation, bearer: "eve" }), /not a current hand/);
});

test("playerOfAct: a move played through the host, as the enterprise-loops variant chose the mask", () => {
  const play = (held, as, sections) => playerOfAct(agency, { invocation: { subject: "account" }, held, as, sections });
  // [held, as, sections, expected by]
  assert.equal(play([{ office: child }]).by, child, "one held office persists its canonical registry key");
  assert.equal(play([{ office: child }], childShort).by, child, "a relative selector resolves to the held canonical key");
  assert.equal(play([{ office: parent }, { office: child }], undefined, [section]).by, child, "the deepest section selection returns the canonical held key");
  assert.equal(play([{ office: parent }, { office: child }], parent).by, parent, "a named held office is the mask");
  assert.equal(play([]).by, "account", "an account holding no office plays in its own name");
  assert.equal(play([{ office: child }, { office: child }]).by, child, "one office held twice is one");
  assert.equal(play([{ office: child }]).hand, "account");
  assert.throws(() => play([{ office: child }], "services/some-other-board#trusted-assistant-to-the-leader"), /does not hold/, "an unknown qualified selector cannot gain office authority by basename");
  assert.throws(() => play([], parent), /holds no office/);
  assert.throws(() => play([{ office: parent }, { office: child }]), /name the office the move is played as/, "several offices and no reading is refused");
  assert.throws(() => play([{ office: parent }, { office: child }], undefined, ["services/elsewhere"]), /name the office the move is played as/);
});

test("playerOfAct: an act that already records its player, as the governing and outcome variants read it", () => {
  const cases = [
    [{ by: "s#lead", bearer: "ada", hand: "session:1" }, { by: "s#lead", bearer: "ada", hand: "session:1" }],
    [{ by: "enterprise:x" }, { by: "enterprise:x" }],
    [{ by: "s#lead", bearer: "", hand: "" }, { by: "s#lead" }],
    [{ by: "s#lead", bearer: 4, hand: "session:1" }, { by: "s#lead", hand: "session:1" }],
    [{ by: "s#lead", extra: "dropped" }, { by: "s#lead" }],
    [{ by: "s#lead", bearer: "  ", hand: " " }, { by: "s#lead" }],
  ];
  for (const [player, expected] of cases) {
    const told = playerOfAct(undefined, { player });
    assert.deepEqual({ ...told }, expected);
    assert.ok(Object.isFrozen(told));
  }
  // an outcome with no player records none; a governing act always names one
  assert.equal(playerOfAct(undefined, { player: undefined }), undefined);
  assert.equal(playerOfAct(undefined, { player: null }), undefined);
  for (const player of [{}, { by: "" }, { by: "  " }, { by: 3 }, { bearer: "ada" }]) assert.throws(() => playerOfAct(undefined, { player }), TypeError);
});
