// actor.test.mjs — conformance tests for every src/actor.mjs law: constitution, genesis
// verification (including tampering), naming/supersession rows, register append/read, resolution,
// the Belnap incumbency read, seating, and deriveIncumbencyRegister. Hermetic temp-dir fixtures;
// no net. The two live harness-seat fixtures below are copied verbatim from the tree's own
// actor-genesis.json carriers and prove constituteActor reproduces their addresses exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendEavt, constituteEntity } from "@red-cup-engineering/eavt";

import {
  ACTOR_KIND,
  constituteActor,
  verifyActorGenesis,
  nameRow,
  supersedeRow,
  appendActorRows,
  readActorRegister,
  resolveActor,
  supersessionMap,
  incumbencyCharge,
  incumbencyState,
  seatIncumbency,
  readIncumbency,
  deriveIncumbencyRegister,
  rewriteSupersededIds,
} from "../src/actor.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "actor-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const SCHEMA_PATH =
  "/home/emsenn/info/lib/emsenn/services/561-group/services/operations-services-section/services/enterprise-services-section/services/enterprise-systems-services-section/services/enterprise-administration-services-section/services/enterprise-office-services-section/data/records/schema/incumbency.schema.json";

// === live seat fixtures, copied verbatim from the tree's own actor-genesis.json carriers =======

const CLAUDE_SEAT = {
  address: "actor:bZH6KBOlPVWbYpqp04izN_Xtwykn0XgsMBStm_FkPPw",
  genesisTuple: {
    attributes: {
      host: "bare-cedar-fog",
      harness: "claude",
      office: "executive-officer-to-the-leader",
      character: "ni:///sha-256;G-9yGgPSz0PvwEofWa5qgaS5SkIZzrcwAiBwc1uD_GY",
      incumbency: "ni:///sha-256;yofuFJyllTi6Kjb1COJh0U_pcb-e0Z3cEI7XxFPaQzQ",
    },
    t: "2026-08-31T00:00:00Z",
  },
  supersedes: "urn:ame:bare-cedar-fog-claude",
};

const CODEX_SEAT = {
  address: "actor:WWOM5azg-fTrn1Id0YVbz5AhppbnFny_W5Xl-rKgSs4",
  genesisTuple: {
    attributes: {
      host: "bare-cedar-fog",
      harness: "codex",
      office: "executive-officer-to-the-leader",
      character: "ni:///sha-256;b6gXbicT_0KkUrNJo481j86BFe-fRVThZoO6we5saOE",
      incumbency: "ni:///sha-256;-qCefK5mKAv0m4PwQq6u3Ynk9qwYAf1ljgnS4sAW3dM",
    },
    t: "2026-08-31T00:00:00Z",
  },
  supersedes: "urn:ame:bare-cedar-fog-codex",
};

test("constituteActor reproduces the live Claude harness seat address exactly", () => {
  const { address, genesisRow } = constituteActor(CLAUDE_SEAT.genesisTuple);
  assert.equal(address, CLAUDE_SEAT.address);
  assert.equal(genesisRow.e, CLAUDE_SEAT.address);
  assert.equal(verifyActorGenesis({ address, genesisRow }), true);
});

test("constituteActor reproduces the live Codex harness seat address exactly", () => {
  const { address, genesisRow } = constituteActor(CODEX_SEAT.genesisTuple);
  assert.equal(address, CODEX_SEAT.address);
  assert.equal(verifyActorGenesis({ address, genesisRow }), true);
});

// === constitution / genesis verification ========================================================

test("constituteActor births an actor: address kind and e-rewrite", () => {
  const { address, genesisRow } = constituteActor({ attributes: { service: "@red-cup-engineering/eavt" }, t: 1 });
  assert.match(address, new RegExp(`^${ACTOR_KIND}:`));
  assert.equal(genesisRow.e, address);
  assert.equal(genesisRow.a, "constituted");
});

test("verifyActorGenesis throws naming the mismatched field when e differs from address", () => {
  const { genesisRow } = constituteActor({ attributes: { team: "engineering" }, t: 1 });
  assert.throws(
    () => verifyActorGenesis({ address: "actor:not-the-row-e", genesisRow }),
    /genesis row "e".*does not equal address/,
  );
});

test("verifyActorGenesis throws when address does not start with actor:", () => {
  const { genesisRow } = constituteActor({ attributes: { team: "engineering" }, t: 1 });
  const badRow = { ...genesisRow, e: "task:same-digest-shape" };
  assert.throws(
    () => verifyActorGenesis({ address: "task:same-digest-shape", genesisRow: badRow }),
    /address must start with "actor:"/,
  );
});

test("verifyActorGenesis throws when genesisRow.a is not constituted", () => {
  const { address, genesisRow } = constituteActor({ attributes: { team: "engineering" }, t: 1 });
  const tampered = { ...genesisRow, a: "renamed" };
  assert.throws(() => verifyActorGenesis({ address, genesisRow: tampered }), /must be "constituted"/);
});

test("verifyActorGenesis throws on a tampered attributes payload (recomputed address differs)", () => {
  const { address, genesisRow } = constituteActor({ attributes: { team: "engineering" }, t: 1 });
  const tampered = { ...genesisRow, v: { team: "tampered" } };
  assert.throws(() => verifyActorGenesis({ address, genesisRow: tampered }), /tampered genesis row/);
});

// === naming / supersession rows =================================================================

test("nameRow and supersedeRow build the expected {e,a,v,t} shape", () => {
  assert.deepEqual(nameRow("actor:x", "bare-cedar-fog-claude", 1), { e: "actor:x", a: "named", v: "bare-cedar-fog-claude", t: 1 });
  assert.deepEqual(supersedeRow("actor:x", "urn:ame:bare-cedar-fog-claude", 1), { e: "actor:x", a: "superseding", v: "urn:ame:bare-cedar-fog-claude", t: 1 });
});

// === register append/read =======================================================================

test("appendActorRows + readActorRegister round-trips a constituted actor with names and supersedes", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = constituteActor(CLAUDE_SEAT.genesisTuple);
  appendActorRows(registerPath, [
    genesisRow,
    nameRow(address, "bare-cedar-fog-claude", CLAUDE_SEAT.genesisTuple.t),
    supersedeRow(address, CLAUDE_SEAT.supersedes, CLAUDE_SEAT.genesisTuple.t),
  ]);

  const register = readActorRegister(registerPath);
  assert.equal(register.actors.length, 1);
  assert.equal(register.actors[0].address, address);
  assert.deepEqual(register.actors[0].names, ["bare-cedar-fog-claude"]);
  assert.deepEqual(register.actors[0].supersedes, [CLAUDE_SEAT.supersedes]);
}));

test("appendActorRows throws before writing anything when a constituting row's genesis is tampered", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { genesisRow } = constituteActor({ attributes: { team: "engineering" }, t: 1 });
  const tampered = { ...genesisRow, v: { team: "tampered" } };
  assert.throws(() => appendActorRows(registerPath, [tampered]), /tampered genesis row/);
  assert.deepEqual(readActorRegister(registerPath), { rows: [], actors: [] });
}));

test("readActorRegister on a missing file returns empty rows and actors", () => withDir((dir) => {
  assert.deepEqual(readActorRegister(join(dir, "nope.jsonl")), { rows: [], actors: [] });
}));

test("readActorRegister throws when a register's genesis row has been tampered on disk", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { genesisRow } = constituteActor({ attributes: { team: "engineering" }, t: 1 });
  // Write the tampered row directly (bypassing appendActorRows's own guard) to prove
  // readActorRegister re-verifies independently of the writer.
  writeFileSync(registerPath, "");
  const tampered = { ...genesisRow, v: { team: "tampered" } };
  appendEavt(registerPath, tampered);
  assert.throws(() => readActorRegister(registerPath), /tampered register/);
}));

test("readActorRegister refuses malformed files and valid non-actor genesis rows", () => withDir((dir) => {
  const malformedPath = join(dir, "malformed.jsonl");
  writeFileSync(malformedPath, "not json\\n");
  assert.throws(() => readActorRegister(malformedPath));

  const nonActorPath = join(dir, "non-actor.jsonl");
  const { genesisRow } = constituteEntity({ kind: "task", attributes: { scope: "identity" }, t: 1 });
  appendEavt(nonActorPath, genesisRow);
  assert.throws(() => readActorRegister(nonActorPath), /address must start with "actor:"/);
}));

// === resolution ==================================================================================

test("resolveActor and supersessionMap resolve by address, name, and superseded id", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = constituteActor(CODEX_SEAT.genesisTuple);
  appendActorRows(registerPath, [
    genesisRow,
    nameRow(address, "bare-cedar-fog-codex", CODEX_SEAT.genesisTuple.t),
    supersedeRow(address, CODEX_SEAT.supersedes, CODEX_SEAT.genesisTuple.t),
  ]);
  const register = readActorRegister(registerPath);

  assert.equal(resolveActor(register, address).address, address);
  assert.equal(resolveActor(register, "bare-cedar-fog-codex").address, address);
  assert.equal(resolveActor(register, CODEX_SEAT.supersedes).address, address);
  assert.equal(resolveActor(register, "actor:nope"), null);

  const map = supersessionMap(register);
  assert.equal(map.get(CODEX_SEAT.supersedes), address);
}));

test("resolveActor gives an immutable address precedence and refuses ambiguous aliases", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const first = constituteActor({ attributes: { team: "first" }, t: 1 });
  const second = constituteActor({ attributes: { team: "second" }, t: 2 });
  appendActorRows(registerPath, [
    first.genesisRow,
    second.genesisRow,
    nameRow(first.address, second.address, 1),
    nameRow(first.address, "shared-name", 1),
    nameRow(second.address, "shared-name", 2),
    supersedeRow(first.address, "urn:ame:shared", 1),
    supersedeRow(second.address, "urn:ame:shared", 2),
  ]);
  const register = readActorRegister(registerPath);

  assert.equal(resolveActor(register, second.address).address, second.address);
  assert.throws(() => resolveActor(register, "shared-name"), /ambiguous/);
  assert.throws(() => resolveActor(register, "urn:ame:shared"), /ambiguous/);
  assert.throws(() => supersessionMap(register), /ambiguous/);
}));

// === incumbency: the Belnap read =================================================================

test("incumbencyCharge reads bottom, t, f, and top charges, with a retraction respected", () => {
  const bottom = incumbencyCharge([], "incumbency:x", "recognized");
  assert.equal(bottom, "bottom");

  const affirmedOnly = [{ e: "incumbency:x", a: "recognized", v: "t", t: 1 }];
  assert.equal(incumbencyCharge(affirmedOnly, "incumbency:x", "recognized"), "t");

  const deniedOnly = [{ e: "incumbency:x", a: "recognized", v: "f", t: 1 }];
  assert.equal(incumbencyCharge(deniedOnly, "incumbency:x", "recognized"), "f");

  const held = [
    { e: "incumbency:x", a: "recognized", v: "t", t: 1 },
    { e: "incumbency:x", a: "recognized", v: "f", t: 2 },
  ];
  assert.equal(incumbencyCharge(held, "incumbency:x", "recognized"), "top");

  const retracted = [
    { e: "incumbency:x", a: "recognized", v: "t", t: 1 },
    { e: "incumbency:x", a: "recognized", v: null, t: 2 },
  ];
  assert.equal(incumbencyCharge(retracted, "incumbency:x", "recognized"), "bottom");
});

test("incumbencyState covers all six named states", () => {
  assert.equal(incumbencyState({ recognition: "bottom", induction: "bottom" }), "vacant");
  assert.equal(incumbencyState({ recognition: "t", induction: "bottom" }), "recognition-only");
  assert.equal(incumbencyState({ recognition: "bottom", induction: "t" }), "munus-only");
  assert.equal(incumbencyState({ recognition: "t", induction: "t" }), "dignitas");
  assert.equal(incumbencyState({ recognition: "top", induction: "bottom" }), "repair");
  assert.equal(incumbencyState({ recognition: "bottom", induction: "top" }), "repair");
  assert.equal(incumbencyState({ recognition: "f", induction: "bottom" }), "failed");
  assert.equal(incumbencyState({ recognition: "bottom", induction: "f" }), "failed");
});

test("seatIncumbency + readIncumbency round trip to dignitas", () => {
  const { address, rows } = seatIncumbency({
    office: "executive-officer-to-the-leader",
    holder: "bare-cedar-fog-claude",
    recognition: "t",
    induction: "t",
    t: "2026-08-31T00:00:00Z",
  });
  const read = readIncumbency(rows, address);
  assert.equal(read.office, "executive-officer-to-the-leader");
  assert.equal(read.holder, "bare-cedar-fog-claude");
  assert.equal(read.recognition, "t");
  assert.equal(read.induction, "t");
  assert.equal(read.state, "dignitas");
});

test("seatIncumbency omits a row for a bottom axis and reads back vacant/half-seated correctly", () => {
  const { address, rows } = seatIncumbency({ office: "some-office", holder: "some-character", recognition: "bottom", induction: "bottom", t: 1 });
  assert.equal(rows.length, 1, "only the genesis row, no recognized/inducted rows for bottom axes");
  assert.equal(readIncumbency(rows, address).state, "vacant");
});

// === deriveIncumbencyRegister ====================================================================

test("deriveIncumbencyRegister validates records, computes state, and resolves offices", () => withDir((dir) => {
  const schemaDir = join(dir, "schema-section", "data", "records", "schema");
  mkdirSync(schemaDir, { recursive: true });
  cpSync(SCHEMA_PATH, join(schemaDir, "incumbency.schema.json"));

  const officePool = join(dir, "office-section", "content", "offices");
  mkdirSync(officePool, { recursive: true });
  writeFileSync(join(officePool, "executive-officer-to-the-leader.json"), JSON.stringify({ id: "executive-officer-to-the-leader" }));

  const incumbencyDir = join(dir, "office-section", "content", "incumbencies");
  mkdirSync(incumbencyDir, { recursive: true });
  writeFileSync(
    join(incumbencyDir, "valid-seat.json"),
    JSON.stringify({
      id: "valid-seat",
      office: "executive-officer-to-the-leader",
      holder: "bare-cedar-fog-claude",
      recognition: "t",
      induction: "t",
      from: "2026-08-31",
    }),
  );
  writeFileSync(
    join(incumbencyDir, "invalid-seat.json"),
    JSON.stringify({
      office: "executive-officer-to-the-leader",
      holder: "bare-cedar-fog-claude",
      recognition: "not-a-real-charge",
      induction: "t",
      from: "2026-08-31",
    }),
  );

  const register = deriveIncumbencyRegister({ repoRoot: dir, schemaPath: join(schemaDir, "incumbency.schema.json") });
  assert.equal(register.schema, "emsenn/schema/incumbency");
  assert.equal(register.seats.length, 2);

  const [invalid, valid] = register.seats; // sorted by path: "invalid-seat.json" < "valid-seat.json"
  assert.equal(valid.id, "valid-seat");
  assert.equal(valid.valid, true);
  assert.equal(valid.state, "dignitas");
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length > 0);
}));

test("deriveIncumbencyRegister skips lib/legacy and node_modules", () => withDir((dir) => {
  const legacyIncumbencies = join(dir, "lib", "legacy", "content", "incumbencies");
  mkdirSync(legacyIncumbencies, { recursive: true });
  writeFileSync(
    join(legacyIncumbencies, "old-seat.json"),
    JSON.stringify({ office: "retired-office", holder: "nobody", recognition: "bottom", induction: "bottom", from: "2020-01-01" }),
  );
  const nodeModulesIncumbencies = join(dir, "node_modules", "some-pkg", "content", "incumbencies");
  mkdirSync(nodeModulesIncumbencies, { recursive: true });
  writeFileSync(join(nodeModulesIncumbencies, "dep-seat.json"), JSON.stringify({}));

  const register = deriveIncumbencyRegister({ repoRoot: dir, schemaPath: SCHEMA_PATH });
  assert.equal(register.seats.length, 0);
}));

test("deriveIncumbencyRegister admits the current Group lib/agency incumbency pool", () => withDir((dir) => {
  const incumbencyDir = join(dir, "561-group-services-section", "lib", "agency", "incumbencies");
  mkdirSync(incumbencyDir, { recursive: true });
  writeFileSync(join(incumbencyDir, "chief-executive-officer.json"), JSON.stringify({
    id: "codex-interactive-session-as-chief-executive-officer",
    office: "chief-executive-officer",
    holder: "codex-interactive-session",
    recognition: "t",
    induction: "t",
    from: "2026-09-09",
  }));
  const register = deriveIncumbencyRegister({ repoRoot: dir, schemaPath: SCHEMA_PATH });
  assert.equal(register.seats.length, 1);
  assert.equal(register.seats[0].office, "chief-executive-officer");
  assert.equal(register.seats[0].state, "dignitas");
}));

// === rewriteSupersededIds ========================================================================

test("rewriteSupersededIds dry-run reports replacements without writing", () => withDir((dir) => {
  const file = join(dir, "carrier.md");
  writeFileSync(file, "seat: urn:ame:bare-cedar-fog-claude\nother: unrelated\n");
  const map = new Map([["urn:ame:bare-cedar-fog-claude", CLAUDE_SEAT.address]]);

  const dryResult = rewriteSupersededIds({ files: [file], map, dryRun: true });
  assert.equal(dryResult[0].written, false);
  assert.deepEqual(dryResult[0].replacements, [{ from: "urn:ame:bare-cedar-fog-claude", to: CLAUDE_SEAT.address, count: 1 }]);
  assert.match(readFileSync(file, "utf8"), /urn:ame:bare-cedar-fog-claude/);
}));

test("rewriteSupersededIds with dryRun false writes the file and reports written:true", () => withDir((dir) => {
  const file = join(dir, "carrier.md");
  writeFileSync(file, "seat: urn:ame:bare-cedar-fog-claude\n");
  const map = new Map([["urn:ame:bare-cedar-fog-claude", CLAUDE_SEAT.address]]);

  const result = rewriteSupersededIds({ files: [file], map, dryRun: false });
  assert.equal(result[0].written, true);
  const contents = readFileSync(file, "utf8");
  assert.match(contents, new RegExp(CLAUDE_SEAT.address));
  assert.doesNotMatch(contents, /urn:ame:bare-cedar-fog-claude/);
}));

test("rewriteSupersededIds never touches a file it was not given", () => withDir((dir) => {
  const untouched = join(dir, "untouched.md");
  writeFileSync(untouched, "urn:ame:bare-cedar-fog-claude\n");
  const other = join(dir, "target.md");
  writeFileSync(other, "urn:ame:bare-cedar-fog-claude\n");
  const map = new Map([["urn:ame:bare-cedar-fog-claude", CLAUDE_SEAT.address]]);

  rewriteSupersededIds({ files: [other], map, dryRun: false });
  assert.match(readFileSync(untouched, "utf8"), /urn:ame:bare-cedar-fog-claude/);
}));
