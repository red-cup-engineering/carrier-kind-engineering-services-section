import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { createServer as createNetServer } from "node:net";
import { mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createLocalActivityPubProvider } from "../src/local-server.mjs";
import { deliverActivity } from "../src/provider.mjs";
import { activityPubApplication } from "../src/app.mjs";
import { generateActorKeyMaterial } from "../src/keys.mjs";


async function unusedPort() {
  const socket = createNetServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

test("local constructor opens no listener and returns an application-compatible provider with durable lifecycle", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "activitypub-local-constructor-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const keysPath = path.join(dir, "keys.json");
  await writeFile(keysPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const port = await unusedPort();
  const local = await createLocalActivityPubProvider({
    environment: {
      ACTIVITYPUB_ORIGIN: `http://127.0.0.1:${port}`,
      ACTIVITYPUB_IDENTIFIER: "codex",
      ACTIVITYPUB_ACTOR_NAME: "Codex",
      ACTIVITYPUB_ACTOR_SUMMARY: "Local ActivityPub face",
      ACTIVITYPUB_KEYS_PATH: keysPath,
      ACTIVITYPUB_STATE_DIR: path.join(dir, "state"),
    },
  });
  t.after(() => local.close());
  assert.equal(local.provider.identifier, "codex");
  assert.ok(activityPubApplication(local.provider).resources.length > 0);
  const socket = createNetServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(port, "127.0.0.1", resolve));
  await new Promise((resolve) => socket.close(resolve));
  assert.equal((await stat(local.bearerTokenPath)).mode & 0o077, 0);
});



test('current actor projection removes a boot actor and admits its replacement without a registry',async(t)=>{
 const directory=await mkdtemp(path.join(tmpdir(),'activitypub-current-actors-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 let admitted='first';
 const input=identifier=>({identifier,actorName:identifier,summary:'Current author-owned actor',keyPath:path.join(directory,identifier+'.json')});
 const local=await createLocalActivityPubProvider({environment:{},origin:'https://current.example',stateDirectory:path.join(directory,"state"),actors:[input('first')],dynamicActors:true,
  resolveActor:async identifier=>identifier===admitted?input(identifier):null});t.after(()=>local.close());
 assert(await local.provider.resolveActor('first'));
 admitted='second';
 assert.equal(await local.provider.resolveActor('first'),null);
 assert(await local.provider.resolveActor('second'));
 const route=activityPubApplication(local.provider).resources.find(resource=>resource.id==='activitypub.actor-namespace');
 assert(route.match.test('/actors/second'));assert(route.match.test('/actors/second/inbox'));
 const removed=await local.provider.fetch(new Request('https://current.example/actors/first',{headers:{accept:'application/activity+json'}}));assert.equal(removed.status,404);
 const current=await local.provider.fetch(new Request('https://current.example/actors/second',{headers:{accept:'application/activity+json'}}));assert.equal(current.status,200);
});

test("manually started Fedify delivery retains an actual outbound Activity without starting network work", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "activitypub-manual-queue-"));
  const keys = path.join(root, "keys.json");
  await writeFile(keys, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const origin = "https://queue-owner.example";
  const local = await createLocalActivityPubProvider({
    origin,
    manuallyStartQueue: true,
    environment: {
      ACTIVITYPUB_IDENTIFIER: "publisher",
      ACTIVITYPUB_ACTOR_NAME: "Publisher",
      ACTIVITYPUB_ACTOR_SUMMARY: "An independently keyed manual-queue publisher",
      ACTIVITYPUB_KEYS_PATH: keys,
      ACTIVITYPUB_STATE_DIR: path.join(root, "state"),
    },
  });
  t.after(async () => { await local.close(); await rm(root, { recursive: true, force: true }); });
  await deliverActivity(local.provider, {
    identifier: "publisher",
    recipient: "https://unreachable-recipient.example/actors/reader",
    inbox: "https://unreachable-recipient.example/inbox",
    activity: {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: origin + "/activities/published",
      type: "Create",
      actor: origin + "/actors/publisher",
      object: {
        id: origin + "/notes/source",
        type: "Note",
        attributedTo: origin + "/actors/publisher",
        content: "One original authored activity, retained for later delivery.",
      },
    },
  });
  const depth = await local.runtime.queue.getDepth();
  assert.ok(depth.queued >= 1, "Fedify must retain real durable delivery rather than trigger an unmanaged network worker");
  assert.equal(depth.queued, depth.ready + depth.delayed);
});

test("a persisted actor never loads public-mode or symlinked signing keys", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "activitypub-signer-custody-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const actual = path.join(root, "external.json");
  const stateDirectory = path.join(root, "state");
  const env = keyPath => ({
    ACTIVITYPUB_ORIGIN: "https://signed-owner.example",
    ACTIVITYPUB_IDENTIFIER: "owner",
    ACTIVITYPUB_ACTOR_NAME: "Owner",
    ACTIVITYPUB_ACTOR_SUMMARY: "A durable site identity",
    ACTIVITYPUB_STATE_DIR: stateDirectory,
    ACTIVITYPUB_KEYS_PATH: keyPath,
  });
  await writeFile(actual, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const link = path.join(root, "signer.json");
  await symlink(actual, link);
  await assert.rejects(createLocalActivityPubProvider({
    environment: env(link),
  }), /private regular file/);
  const unsafe = path.join(root, "unsafe.json");
  await writeFile(unsafe, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o644 });
  await assert.rejects(createLocalActivityPubProvider({
    environment: env(unsafe),
  }), /private regular file/);
  assert.equal((await stat(unsafe)).mode & 0o077, 0o044,
    "refusal must not silently mask prior exposure of signing-key material");
});

test("actor identity is minted once into a 0600 file and survives an ordinary restart", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "activitypub-one-key-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const keys = path.join(root, "keys.json");
  const environment = {
    ACTIVITYPUB_ORIGIN: "https://original-actor.example",
    ACTIVITYPUB_IDENTIFIER: "original",
    ACTIVITYPUB_ACTOR_NAME: "Original",
    ACTIVITYPUB_ACTOR_SUMMARY: "One independently owned identity",
    ACTIVITYPUB_STATE_DIR: path.join(root, "state"),
    ACTIVITYPUB_KEYS_PATH: keys,
  };
  const initial = await createLocalActivityPubProvider({ environment, manuallyStartQueue: true });
  const original = await initial.provider.fetch(new Request(environment.ACTIVITYPUB_ORIGIN + "/actors/original", {
    headers: { accept: "application/activity+json" },
  }));
  assert.equal(original.status, 200);
  const actor = await original.json();
  await initial.close();
  const next = await createLocalActivityPubProvider({ environment, manuallyStartQueue: true });
  t.after(() => next.close());
  const again = await next.provider.fetch(new Request(environment.ACTIVITYPUB_ORIGIN + "/actors/original", {
    headers: { accept: "application/activity+json" },
  }));
  assert.deepEqual((await again.json()).assertionMethod, actor.assertionMethod);
  assert.equal((await stat(keys)).mode & 0o077, 0);
  assert.equal(next.provider.queueStartup, "manual");
});
