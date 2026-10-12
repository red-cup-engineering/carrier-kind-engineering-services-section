// actor-scripts.test.mjs — happy-path conformance for every thin scripts/*.mjs effect script over
// src/actor.mjs's laws, plus the composed apps/actor-cli.mjs face. Hermetic temp-dir fixtures; no
// net.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import constituteActorScript from "../scripts/constitute-actor.mjs";
import verifyActorGenesisScript from "../scripts/verify-actor-genesis.mjs";
import appendActorRowsScript from "../scripts/append-actor-rows.mjs";
import listActorsScript from "../scripts/list-actors.mjs";
import resolveActorScript from "../scripts/resolve-actor.mjs";
import derivenIncumbencyRegisterScript from "../scripts/derive-incumbency-register.mjs";
import rewriteSupersededIdsScript from "../scripts/rewrite-superseded-ids.mjs";
import actorCli from "../apps/actor-cli.mjs";
import { nameRow } from "../src/actor.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "actor-scripts-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const SCHEMA_PATH =
  "/home/emsenn/info/lib/emsenn/services/561-group/services/operations-services-section/services/enterprise-services-section/services/enterprise-systems-services-section/services/enterprise-administration-services-section/services/enterprise-office-services-section/data/records/schema/incumbency.schema.json";

test("constitute-actor.mjs: happy path births an actor", () => {
  const { address, genesisRow } = constituteActorScript({ service: "@red-cup-engineering/actor" }, 1);
  assert.match(address, /^actor:/);
  assert.equal(genesisRow.e, address);
});

test("verify-actor-genesis.mjs: happy path reads a {address,genesisRow} file and verifies it", () => withDir((dir) => {
  const { address, genesisRow } = constituteActorScript({ team: "engineering" }, 1);
  const file = join(dir, "genesis.json");
  writeFileSync(file, JSON.stringify({ address, genesisRow }));
  assert.equal(verifyActorGenesisScript(file), true);
}));

test("append-actor-rows.mjs + list-actors.mjs: happy path round trip", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = constituteActorScript({ team: "engineering" }, 1);
  const rowsFile = join(dir, "rows.json");
  writeFileSync(rowsFile, JSON.stringify([genesisRow, nameRow(address, "engineering-team", 1)]));

  appendActorRowsScript(registerPath, JSON.parse(readFileSync(rowsFile, "utf8")));

  const actors = listActorsScript(registerPath);
  assert.equal(actors.length, 1);
  assert.equal(actors[0].address, address);
  assert.deepEqual(actors[0].names, ["engineering-team"]);
}));

test("resolve-actor.mjs: happy path resolves by name", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = constituteActorScript({ team: "engineering" }, 1);
  appendActorRowsScript(registerPath, [genesisRow, nameRow(address, "engineering-team", 1)]);
  assert.equal(resolveActorScript(registerPath, "engineering-team").address, address);
}));

test("resolve-actor.mjs refuses an ambiguous display name", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const first = constituteActorScript({ team: "first" }, 1);
  const second = constituteActorScript({ team: "second" }, 2);
  appendActorRowsScript(registerPath, [
    first.genesisRow,
    second.genesisRow,
    nameRow(first.address, "shared-team", 1),
    nameRow(second.address, "shared-team", 2),
  ]);
  assert.throws(() => resolveActorScript(registerPath, "shared-team"), /ambiguous/);
}));

test("derive-incumbency-register.mjs: happy path over an empty tree yields no seats", () => withDir((dir) => {
  const register = derivenIncumbencyRegisterScript(dir, SCHEMA_PATH);
  assert.deepEqual(register.seats, []);
  assert.equal(register.schema, "emsenn/schema/incumbency");
}));

test("rewrite-superseded-ids.mjs: happy path dry-run reports replacements without writing", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = constituteActorScript({ harness: "claude" }, 1);
  appendActorRowsScript(registerPath, [genesisRow, { e: address, a: "superseding", v: "urn:ame:bare-cedar-fog-claude", t: 1 }]);

  const carrier = join(dir, "carrier.md");
  writeFileSync(carrier, "seat: urn:ame:bare-cedar-fog-claude\n");

  const result = rewriteSupersededIdsScript(registerPath, [carrier], true);
  assert.equal(result[0].written, false);
  assert.equal(result[0].replacements[0].to, address);
  assert.match(readFileSync(carrier, "utf8"), /urn:ame:bare-cedar-fog-claude/);
}));

// === apps/actor-cli.mjs: covers every script above, one command each ===========================

test("actor-cli constitute and verify: happy path", () => withDir((dir) => {
  const { address, genesisRow } = actorCli(["constitute", JSON.stringify({ team: "engineering" }), "1"]);
  const file = join(dir, "genesis.json");
  writeFileSync(file, JSON.stringify({ address, genesisRow }));
  assert.equal(actorCli(["verify", file]), true);
}));

test("actor-cli append and list: happy path off a real register", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = actorCli(["constitute", JSON.stringify({ team: "engineering" }), "1"]);
  const rowsFile = join(dir, "rows.json");
  writeFileSync(rowsFile, JSON.stringify([genesisRow]));
  actorCli(["append", registerPath, rowsFile]);
  const actors = actorCli(["list", registerPath]);
  assert.equal(actors.length, 1);
  assert.equal(actors[0].address, address);
}));

test("actor-cli resolve: happy path", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = actorCli(["constitute", JSON.stringify({ team: "engineering" }), "1"]);
  const rowsFile = join(dir, "rows.json");
  writeFileSync(rowsFile, JSON.stringify([genesisRow]));
  actorCli(["append", registerPath, rowsFile]);
  assert.equal(actorCli(["resolve", registerPath, address]).address, address);
}));

test("actor-cli derive-incumbencies: happy path over an empty tree", () => withDir((dir) => {
  const register = actorCli(["derive-incumbencies", "--repo-root", dir, "--schema", SCHEMA_PATH]);
  assert.deepEqual(register.seats, []);
}));

test("actor-cli rewrite: happy path write mode", () => withDir((dir) => {
  const registerPath = join(dir, "register.jsonl");
  const { address, genesisRow } = actorCli(["constitute", JSON.stringify({ harness: "codex" }), "1"]);
  const rowsFile = join(dir, "rows.json");
  writeFileSync(rowsFile, JSON.stringify([genesisRow, { e: address, a: "superseding", v: "urn:ame:bare-cedar-fog-codex", t: 1 }]));
  actorCli(["append", registerPath, rowsFile]);

  const carrier = join(dir, "carrier.md");
  writeFileSync(carrier, "seat: urn:ame:bare-cedar-fog-codex\n");

  const result = actorCli(["rewrite", "--register", registerPath, "--write", carrier]);
  assert.equal(result[0].written, true);
  assert.match(readFileSync(carrier, "utf8"), new RegExp(address));
}));
