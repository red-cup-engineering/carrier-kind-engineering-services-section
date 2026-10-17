import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { createServer as createNetServer } from "node:net";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
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
  await writeFile(keysPath, JSON.stringify(await generateActorKeyMaterial()));
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
