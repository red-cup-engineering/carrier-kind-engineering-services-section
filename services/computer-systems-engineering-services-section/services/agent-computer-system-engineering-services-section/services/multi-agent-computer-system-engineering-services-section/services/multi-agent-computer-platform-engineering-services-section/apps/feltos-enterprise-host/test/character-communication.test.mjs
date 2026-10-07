import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { projectSenActivity, senActivityObjectBytes } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { createMetroplatWorld } from "@red-cup-engineering/metroplat/world";
import { characterInbox } from "@red-cup-engineering/metroplat/offices";
import { createActivityPubNodeArrivalHandler } from "../src/activitypub-node.mjs";
import { hostedCharacterCommunication, characterActorAddress, CHARACTER_TELLING } from "../src/character-communication.mjs";

const GROUP = "lib/emsenn/services/561-group/services/561-group-services-section";
function fixture(t) {
  let repository = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(repository, GROUP, "data/records/schema"))) repository = path.dirname(repository);
  const root = mkdtempSync(path.join(tmpdir(), "semioverse-characters-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const agencyRoot = path.join(root, "house");
  cpSync(path.join(repository, GROUP, "data/records/schema"), path.join(agencyRoot, GROUP, "data/records/schema"), { recursive: true });
  const section = path.join(agencyRoot, "lib/emsenn/services/561-group/services/fixture-services-section");
  mkdirSync(section, { recursive: true });
  writeFileSync(path.join(section, "README.md"), "# Fixture\n\nA place for the characters to enter.\n");
  const characters = ["bare-cedar-fog-codex", "chatgpt-web"].map(name => {
    const relative = path.join(GROUP, "lib/agency/characters", `${name}.json`);
    const record = JSON.parse(readFileSync(path.join(repository, relative), "utf8"));
    mkdirSync(path.dirname(path.join(agencyRoot, relative)), { recursive: true });
    cpSync(path.join(repository, relative), path.join(agencyRoot, relative));
    return record;
  });
  const organPath = path.join(GROUP, "lib/agency/organs/chatgpt-web-sign-in.json");
  mkdirSync(path.dirname(path.join(agencyRoot, organPath)), { recursive: true });
  cpSync(path.join(repository, organPath), path.join(agencyRoot, organPath));
  const organ = JSON.parse(readFileSync(path.join(repository, organPath), "utf8"));
  return { root, agencyRoot, characters, accounts: new Map([[organ.of, organ.account]]) };
}

async function node(t, fixture, character) {
  let local;
  const server = createServer(async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const result = await local.provider.fetch(new Request(new URL(request.url, origin), {
        method: request.method, headers: request.headers, ...(body.length ? { body } : {}),
      }));
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) { response.writeHead(500); response.end(String(error)); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const dataRoot = path.join(fixture.root, character.host);
  const config = { agencyRoot: fixture.agencyRoot, activityPub: { nodeHost: character.host, origin, keysDirectory: path.join(dataRoot, "keys") } };
  const actors = [{ identifier: (character.activityPub?.identifier ?? character.harness), character, keyPath: path.join(dataRoot, "key.json"), actorName: character.name, summary: character.description }];
  const arrivals = [];
  const admit = createActivityPubNodeArrivalHandler({ dataRoot, rootName: character.host, origin, actors });
  local = await createLocalActivityPubProvider({ origin, actors, statePath: path.join(dataRoot, "ap.sqlite"), queue: false,
    // Isolated loopback fixtures only; production keeps its configured network policy.
    allowPrivateAddress: true, onActivity: async arrival => { arrivals.push(arrival); return admit(arrival); } });
  t.after(() => local.close());
  const binding = { dataRoot, agencyRoot: fixture.agencyRoot };
  const communication = hostedCharacterCommunication({ config, binding, provider: () => local.provider });
  const city = createMetroplatWorld({ binding, operations: () => [], identity: { title: character.host }, dispatchOperation: () => { throw Error("a message must not execute a power"); }, characterCommunication: communication });
  return { config, city, arrivals, dataRoot, provider: local.provider, communication, address: `${origin}/actors/${(character.activityPub?.identifier ?? character.harness)}`, character, account: fixture.accounts.get(character.id) ?? character.id };
}

test("two actual signed node faces deliver during a turn and reply to the immutable original message", { timeout: 30000 }, async t => {
  const house = fixture(t);
  const [a, b] = await Promise.all(house.characters.map(character => node(t, house, character)));
  const probe = await fetch(b.address, { headers: { accept: "application/activity+json" } });
  const body = await probe.text();
  assert.equal(probe.status, 200, body);
  const document = JSON.parse(body);
  assert.equal(document.id, b.address);
  const resolved = await a.provider.federation.createContext(new URL(a.config.activityPub.origin), undefined).lookupObject(new URL(b.address));
  assert.ok(resolved, `recipient lookup returned ${resolved}`);
  assert.equal(resolved.id?.href, b.address);
  assert.ok(resolved.inboxId, "recipient has an inbox");
  const sent = await a.city.command(a.account, `tell ${b.address} Which operating boundary is failing?`, { id: "turn-1" });
  const receipt = sent.results[0];
  assert.equal(receipt.consumerReceipt, false);
  assert.equal(receipt.transport, "submitted");
  assert.equal(b.arrivals.length, 1);
  const unsigned = projectSenActivity({ type: "Create", origin: a.config.activityPub.origin,
    identifier: a.character.harness, recipient: b.address, agentCard: `${a.config.activityPub.origin}/.well-known/agent-card.json`,
    objectBytes: senActivityObjectBytes({ objectKind: CHARACTER_TELLING, value: { text: "unsigned impostor" } }) });
  const refused = await fetch(`${b.address}/inbox`, { method: "POST", headers: { "content-type": "application/activity+json" }, body: JSON.stringify(unsigned) });
  assert.ok(refused.status >= 400 && refused.status < 500, `unsigned message refused: ${refused.status}`);
  assert.equal(b.arrivals.length, 1, "unsigned testimony never reaches character admission");
  assert.equal(b.arrivals[0].sender.actorId, a.address, "Fedify verified the sending actor");
  const received = await b.city.connect(b.account, { id: "web-entry" });
  const message = received.results[0].messages[0];
  assert.equal(message.id, receipt.id);
  assert.equal(message.objectKind, CHARACTER_TELLING);
  assert.equal(message.value.text, "Which operating boundary is failing?");
  assert.match(received.messages.join("\n"), /reply <exact-message-id>/u);
  assert.equal((await b.city.connect(b.account, { id: "web-reentry" })).results[0].messages.length, 0, "entry consumes unread telling once and preserves history");
  assert.equal(b.communication.read({ account: "unseated-visitor", optional: true, at: new Date().toISOString() }), undefined, "entry of an account without a public actor never consumes a character inbox");
  assert.equal((await b.city.command(b.account, "inbox", { id: "turn-3" })).results[0].messages.length, 0);
  const reply = await b.city.command(b.account, `reply ${message.id} The release receipt is pending.`, { id: "turn-4" });
  assert.equal(reply.results[0].inReplyTo, receipt.id);
  const answer = (await a.city.command(a.account, "inbox", { id: "turn-5" })).results[0].messages[0];
  assert.equal(answer.sender, b.address);
  assert.equal(answer.value.inReplyTo, receipt.id);
  assert.equal(answer.value.text, "The release receipt is pending.");
  assert.equal(characterInbox(a.dataRoot, b.character.id, { unread: false }).length, 0, "another character cannot read this inbox");
  await assert.rejects(() => a.city.command(b.character.id, `tell ${b.address} spoof`, { id: "foreign" }), /exactly one public character/);
  await assert.rejects(() => b.city.command(b.account, "reply unknown bypass", { id: "unknown" }), /exact message/);
  assert.equal((await b.city.command(b.account, "inbox all", { id: "history" })).results[0].messages.length, 1);
});

test("addresses preserve the canonical actor and reject credentials and non-TLS remote targets", () => {
  assert.equal(characterActorAddress("@codex@bare-cedar-fog.561.group"), "https://bare-cedar-fog.561.group/actors/codex");
  assert.throws(() => characterActorAddress("http://remote.example/actors/a"), /HTTPS/);
  assert.throws(() => characterActorAddress("https://a:b@remote.example/actors/a"), /HTTPS/);
});
