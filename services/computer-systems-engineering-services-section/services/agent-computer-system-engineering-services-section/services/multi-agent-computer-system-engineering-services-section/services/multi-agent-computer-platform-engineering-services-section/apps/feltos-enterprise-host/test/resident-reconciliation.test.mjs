import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { EnterpriseExecutionWorker } from "../src/enterprise-execution.mjs";
import { boundedWorkerMessage, ENTERPRISE_WORKER_MESSAGE_BYTES, receivedWorkerError, workerError } from "../src/enterprise-worker-message.mjs";
import { deliveryAway, readShipped } from "../src/work-replication.mjs";
import { admitWorkPeerGrants } from "../src/federated-work.mjs";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { openingOf } from "@red-cup-engineering/organizing/enterprise";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { createEnterpriseEntrance } from "../src/entrance.mjs";
import { startNativeApplication } from "@red-cup-engineering/computer-web-server/native-application";

const context = Object.freeze({ invocation: { id: "fixture-authorized-resident-turn", subject: "fixture-hand" },
  decision: { ok: true, reading: "held", evidence: ["fixture:admitted-operation"] },
  startedAt: "2026-10-11T00:00:00Z", evidence: [] });

test("transport absence and refusal survive the bounded resident boundary", () => {
  const away = new Error("peer unavailable", { cause: Object.assign(new Error("refused socket"), { code: "ECONNREFUSED" }) });
  assert.equal(deliveryAway(receivedWorkerError(workerError(away))), true);
  assert.equal(deliveryAway(receivedWorkerError(workerError(Object.assign(new Error("peer refused"), { statusCode: 403 })))), false);
  assert.equal(deliveryAway(receivedWorkerError(workerError(new AggregateError([away, away], "all absent")))), true);
  assert.throws(() => boundedWorkerMessage({ native: "x".repeat(ENTERPRISE_WORKER_MESSAGE_BYTES) }), /exceeds/u);
});

test("replication ports are unavailable to another resident operation", async t => {
  const state = await mkdtemp(join(tmpdir(), "resident-port-refusal-"));
  t.after(() => rm(state, { recursive: true, force: true }));
  const module = join(state, "worker.mjs");
  await writeFile(module, `import { parentPort } from 'node:worker_threads';
    let active;
    parentPort.on('message', message => {
      if(message.kind==='execute'){active=message.id;parentPort.postMessage({kind:'replication-port',id:'attempt',executionId:active,port:'deliver',input:{}});}
      if(message.kind==='replication-port-result') parentPort.postMessage({kind:'result',id:active,value:message});
    });parentPort.postMessage({kind:'ready'});`);
  let effects = 0;
  const worker = new EnterpriseExecutionWorker({ hostPath: state, environment: process.env, workerUrl: pathToFileURL(module), replication: { deliver: () => { effects += 1; } } });
  t.after(() => worker.close());
  const refused = await worker.execute({ operation: "enterprise-work-run", input: {}, arguments: [], context });
  assert.equal(refused.ok, false);
  assert.match(refused.error.message, /no native replication port/u);
  assert.equal(effects, 0);
});

test("the real resident worker reconciles native work while the entrance remains responsive", { timeout: 45_000 }, async t => {
  const state = await mkdtemp(join(tmpdir(), "resident-native-reconciliation-"));
  t.after(() => rm(state, { recursive: true, force: true }));
  const agency = join(state, "agency");
  const data = join(state, "native");
  await mkdir(agency);
  await writeFile(join(state, "pnpm-workspace.yaml"), "packages: []\n");
  await writeFile(join(state, "instance.json"), JSON.stringify({ version: 1, instanceOf: "@red-cup-engineering/metroplat",
    identity: { id: "resident-fixture", title: "Resident fixture", origin: "https://resident.example" }, operationSources: [], applications: [], schedules: [], capabilities: [] }));
  const hostPath = join(state, "host.json");
  await writeFile(hostPath, JSON.stringify({ version: 1, hostKind: "feltos.enterprise-host", instance: "instance.json", web: {} }));
  const peer = "https://peer.example/actors/metroplat";
  admitWorkPeerGrants({ dataRoot: data, origin: "https://resident.example", issuer: "fixture#peering", peers: [{ actor: peer }], at: "2026-10-11T00:00:00Z" });
  const journal = createSemanticRecordJournal({ root: data, objectKind: "work-arena-move" });
  const count = 80;
  for (let i = 0; i < count; i += 1) journal.record({ category: "move", recordedAt: "2026-10-11T00:00:00Z", record: openingOf({ move: "report", by: "fixture-enterprise", hand: "fixture-hand", law: "fixture-source", subject: `fixture:observation:${i}`,
    observation: "The retained source condition remains observable.", context: "Actual native source evidence for resident reconstruction.", evidence: [`fixture:evidence:${i}`], at: "2026-10-11T00:00:00Z" }) });

  // No production environment, actor keys, external federation or commercial
  // transfer. This receives the actual worker against supplied package sources.
  const environment = { PATH: process.env.PATH, HOME: state, PUBLIC_BASE_URL: "https://resident.example", SESSION_SECRET: "public-fixture-only-resident-session-secret",
    METROPLAT_REPOSITORY_ROOT: state, METROPLAT_WEB_STATE_DIR: join(state, "web"), METROPLAT_DATA_ROOT: data, METROPLAT_AGENCY_ROOT: agency,
    ACTIVITYPUB_ORIGIN: "https://resident.example", ACTIVITYPUB_NODE_HOST: "resident-fixture", ACTIVITYPUB_INSTANCE_ACTOR_IDENTIFIER: "metroplat" };
  const delivered = [];
  const worker = new EnterpriseExecutionWorker({ hostPath, environment, replication: { deliver: async request => {
    assert.equal(request.recipient, peer);
    assert.equal(request.identifier, "metroplat");
    assert.ok(Buffer.byteLength(JSON.stringify(request)) < ENTERPRISE_WORKER_MESSAGE_BYTES);
    delivered.push(request.activity.id);
    // A real asynchronous receiving boundary lets the host serve requests
    // while its resident worker reads/replays its actual native journal.
    await new Promise(resolve => setTimeout(resolve, 2));
  } } });
  t.after(() => worker.close());
  const entrance = createEnterpriseEntrance({ publicBaseUrl: "https://resident.example", stateDir: join(state, "entrance"), sessionSecret: environment.SESSION_SECRET,
    instance: { name: "resident-fixture", title: "Resident fixture" } }, {
    federation: { clients: new Map(), tools: [], unavailable: [] },
  });
  const server = await startNativeApplication(entrance.app, { host: "127.0.0.1", port: 0 });
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.port}/sign-in`;
  const durations = [];
  let completed = false;
  const first = worker.execute({ operation: "work-peer-catch-up", input: {}, arguments: [], context }).finally(() => { completed = true; });
  while (!completed) {
    const start = performance.now();
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /login\/password/u);
    durations.push(performance.now() - start);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const result = await first;
  assert.equal(result.shipped, count);
  assert.equal(new Set(delivered).size, count);
  assert.equal(readShipped(data, peer).size, count);
  assert.ok(durations.length >= 3);
  assert.ok(Math.max(...durations) < 250, `entrance stalled ${Math.max(...durations)}ms`);
  const replay = await worker.execute({ operation: "work-peer-catch-up", input: {}, arguments: [], context });
  assert.equal(replay.shipped, 0);
  assert.equal(delivered.length, count);
  console.log(JSON.stringify({ nativeMoves: count, delivered: delivered.length, repeatedDeliveries: 0, entranceReads: durations.length, maximumEntranceMs: Math.max(...durations), testIdentity: true, nativeSignature: "not-tested", customerAcceptance: "unobserved" }));
});
