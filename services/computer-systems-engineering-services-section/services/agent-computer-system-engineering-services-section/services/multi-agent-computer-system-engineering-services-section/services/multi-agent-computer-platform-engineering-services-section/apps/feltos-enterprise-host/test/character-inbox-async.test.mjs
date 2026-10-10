import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { releaseAgency } from "@red-cup-engineering/organizing/agency/held";
import { worldOperations } from "@red-cup-engineering/metroplat/world";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";
import { activityPubActorsAtHost } from "../src/activitypub-node.mjs";
import { hostedCharacterCommunication } from "../src/character-communication.mjs";

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "character-inbox-async-"));
  const agencyRoot = path.join(root, "agency");
  const pool = path.join(agencyRoot, "lib/agency/characters");
  mkdirSync(pool, { recursive: true });
  const character = "async-reader";
  writeFileSync(path.join(pool, character + ".json"), JSON.stringify({
    id: character, name: "Async reader", kind: "harness", host: "fixture-host", harness: "async-reader",
  }));
  const binding = { agencyRoot, dataRoot: path.join(root, "data") };
  const config = { agencyRoot, activityPub: { nodeHost: "fixture-host", origin: "https://fixture.invalid", keysDirectory: path.join(root, "keys") } };
  t.after(() => { releaseAgency(agencyRoot); rmSync(root, { recursive: true, force: true }); });
  return { root, character, binding, config };
}

test("the actual asynchronous actor enumeration is awaited before direct inbox selection", async t => {
  const { character, binding, config } = fixture(t);
  const pending = activityPubActorsAtHost({ agencyRoot: config.agencyRoot, host: config.activityPub.nodeHost, keysDirectory: config.activityPub.keysDirectory });
  assert.equal(typeof pending.then, "function", "this regression uses the actual asynchronous owner API");
  assert.equal((await pending)[0].character.id, character);
  const communication = hostedCharacterCommunication({ config, binding, provider: () => { throw Error("inbox reading must not invoke transport"); } });
  const page = await communication.read({ account: character, at: "2026-10-09T19:00:00Z" });
  assert.equal(page.character, character);
  assert.deepEqual(page.messages, []);
  assert.equal(await communication.read({ account: "unseated-visitor", optional: true, at: "2026-10-09T19:00:00Z" }), undefined);
});

test("first and repeated world-connect plus explicit inbox await the actual communication result", async t => {
  const { character, binding, config } = fixture(t);
  const communication = hostedCharacterCommunication({ config, binding, provider: () => { throw Error("connect inbox must not invoke transport"); } });
  const operations = worldOperations(binding, () => [], { title: "Asynchronous inbox receiving" }, { characterCommunication: communication });
  const context = { invocation: { id: "fixture:async-inbox", subject: character, caller: { hand: "fixture-hand" } }, evidence: [] };
  const connect = operations.find(operation => operation.verb === "world-connect");
  for (let turn = 0; turn < 2; turn += 1) {
    const result = await connect.execute({}, undefined, context);
    assert.equal(result.actor, actorIdFor(character));
    assert.equal(result.results[0].kind, "metroplat.character-inbox");
    assert.equal(result.results[0].character, character);
    assert.deepEqual(result.results[0].messages, []);
    assert.equal(JSON.parse(JSON.stringify(result)).results[0].character, character);
  }
  const command = operations.find(operation => operation.verb === "world-command");
  const result = await command.execute({ line: "inbox" }, undefined, context);
  assert.equal(result.results[0].character, character);
  assert.deepEqual(result.results[0].messages, []);
  assert.equal(JSON.parse(JSON.stringify(result)).results[0].character, character);
});

test("tell and reply resolve the same actual asynchronous character before their existing effects", async t => {
  const { character, binding, config } = fixture(t);
  const installed = Object.freeze({ fixture: "declared transport injection" });
  const delivered = [];
  const communication = hostedCharacterCommunication({
    config, binding, provider: () => installed,
    resolveRecipient: async (provider, recipient) => { assert.equal(provider, installed); return { recipient }; },
    deliver: async (provider, delivery) => { assert.equal(provider, installed); delivered.push(delivery); },
  });
  const result = await communication.tell({ account: character, recipient: "https://receiver.invalid/actors/reader", text: "Fixture telling", at: "2026-10-09T19:00:00Z" });
  assert.equal(result.sender, "https://fixture.invalid/actors/async-reader");
  assert.equal(result.consumerReceipt, false);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].identifier, "async-reader");
  await assert.rejects(communication.reply({ account: character, id: "unknown-fixture-message", text: "Fixture reply", at: "2026-10-09T19:00:00Z" }), /exact message received by this character/);
});

test("an unrelated or inaccessible identity remains refused before transport or credential effects", async t => {
  const { binding, config } = fixture(t);
  let transports = 0;
  const communication = hostedCharacterCommunication({
    config, binding, provider: () => { transports += 1; throw Error("refused identity reached transport"); },
  });
  await assert.rejects(() => communication.read({ account: "unrelated", at: "2026-10-09T19:00:00Z" }), /exactly one public character/);
  await assert.rejects(() => communication.tell({ account: "unrelated", recipient: "https://receiver.invalid/actors/reader", text: "refused", at: "2026-10-09T19:00:00Z" }), /exactly one public character/);
  await assert.rejects(() => communication.reply({ account: "unrelated", id: "unknown", text: "refused", at: "2026-10-09T19:00:00Z" }), /exactly one public character/);
  assert.equal(transports, 0);
  assert.equal(existsSync(config.activityPub.keysDirectory), false, "refused selection does not create the configured key directory");
  const inaccessible = hostedCharacterCommunication({ config: {}, binding, provider: () => { throw Error("inaccessible identity reached transport"); } });
  assert.equal(await inaccessible.read({ account: "unrelated", optional: true }), undefined);
  await assert.rejects(() => inaccessible.read({ account: "unrelated" }), /no installed character federation resource/);
});
