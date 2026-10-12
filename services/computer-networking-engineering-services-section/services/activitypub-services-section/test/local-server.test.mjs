import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer as createNetServer } from "node:net";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createLocalActivityPubProvider } from "../src/local-server.mjs";
import { activityPubApplication } from "../src/app.mjs";
import { generateActorKeyMaterial } from "../src/keys.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

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
      ACTIVITYPUB_SQLITE_PATH: path.join(dir, "fedify.sqlite"),
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

test("one local devbox instance survives a real process restart: KV state and a queued message both persist on disk", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "activitypub-local-restart-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const statePath = path.join(dir, "fedify.sqlite");
  const childScript = path.join(here, "fixtures", "sqlite-restart-child.mjs");

  const first = spawnSync(process.execPath, [childScript, "--phase", "seed"], {
    encoding: "utf8",
    env: { ...process.env, ACTIVITYPUB_SQLITE_PATH: statePath },
  });
  assert.equal(first.status, 0, first.stderr);
  const seeded = JSON.parse(first.stdout.trim().split("\n").pop());
  assert.equal(seeded.ok, true);

  const second = spawnSync(process.execPath, [childScript, "--phase", "verify"], {
    encoding: "utf8",
    env: { ...process.env, ACTIVITYPUB_SQLITE_PATH: statePath },
  });
  assert.equal(second.status, 0, second.stderr);
  const verified = JSON.parse(second.stdout.trim().split("\n").pop());
  assert.equal(verified.ok, true);
  assert.equal(verified.kvSurvived, true);
  assert.deepEqual(verified.queueOrder, [1, 2]);
});


test('current actor projection removes a boot actor and admits its replacement without a registry',async(t)=>{
 const directory=await mkdtemp(path.join(tmpdir(),'activitypub-current-actors-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 let admitted='first';
 const input=identifier=>({identifier,actorName:identifier,summary:'Current author-owned actor',keyPath:path.join(directory,identifier+'.json')});
 const local=await createLocalActivityPubProvider({environment:{},origin:'https://current.example',statePath:path.join(directory,'custody.sqlite'),actors:[input('first')],dynamicActors:true,
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
