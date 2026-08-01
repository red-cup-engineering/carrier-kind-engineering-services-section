import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { observeInfomaterial } from "@lenticule-science/infomaterial-observation";
import { requestRecursiveInfomaterialFabrication } from "../src/client.mjs";
import { RECURSIVE_FABRICATION_CIRCUIT_PROFILE } from "../src/own-circuit-profile.mjs";
import { ephemeralAgentCardSigning } from "./circuit-fixture.mjs";

const BOARD = resolve(import.meta.dirname, "..");
const SERVICES = resolve(import.meta.dirname, "../../../../../../lenticule-science/services/obsmetrological-services-section/services");
const PLATE = join(SERVICES, "infomaterial-directory-plate-observation");
const OBSERVE = join(SERVICES, "infomaterial-observation");
const COVER = join(SERVICES, "infomaterial-patch-cover");

async function freePort() {
  const socket = createServer();
  await new Promise((done) => socket.listen(0, "127.0.0.1", done));
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  return port;
}

async function provider(root, card, executor, port) {
  const baseUrl = `http://127.0.0.1:${port}`;
  return serveContractedAgent({
    port,
    host: "127.0.0.1",
    baseUrl,
    agentCard: join(root, "content/agent-cards", card),
    executor: process.execPath,
    executorArgs: [join(root, "bin", executor)],
    ...ephemeralAgentCardSigning(baseUrl, `${card}-${port}`),
  });
}

test("a customer hires the signed recursive board without importing its interior", { skip: process.env.LIVE_A2A_BOARD !== "1" }, async () => {
  const territory = await mkdtemp(join(tmpdir(), "recursive-board-a2a-"));
  await writeFile(join(territory, "alpha"), "alpha");
  await writeFile(join(territory, "beta"), "beta");
  const priorTerritory = process.env.INFOMATERIAL_TERRITORY_ROOT;
  const priorWitnessJournal = process.env.WITNESS_JOURNAL_RDF_AGENT;
  const running = [];
  try {
    process.env.INFOMATERIAL_TERRITORY_ROOT = territory;
    process.env.WITNESS_JOURNAL_RDF_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";
    const plate = await provider(PLATE, "directory-plate-observation.json", "execute-a2a-task.mjs", await freePort());
    const observe = await provider(OBSERVE, "infomaterial-observation.json", "execute-a2a-task.mjs", await freePort());
    const cover = await provider(COVER, "directory-patch-cover.json", "execute-a2a-task.mjs", await freePort());
    running.push(plate, observe, cover);
    const result = await requestRecursiveInfomaterialFabrication({
      agentUrl: "http://127.0.0.1:19834/.well-known/agent-card.json",
      schedule: {
        equivalenceAgent: "http://127.0.0.1:19825/.well-known/agent-card.json",
        synthesisAgent: "http://127.0.0.1:19824/.well-known/agent-card.json",
        plateAgent: `${plate.baseUrl}/.well-known/agent-card.json`,
        coverAgent: `${cover.baseUrl}/.well-known/agent-card.json`,
        plateRelativePath: ".",
        maximumMounts: 10,
        maximumParallel: 2,
        routes: [
          { mount: "alpha", providerAgent: `${observe.baseUrl}/.well-known/agent-card.json`, request: { kind: "InfomaterialObservationTask", relativePath: "alpha", maximumEntries: 10, maximumBytes: "1000" } },
          { mount: "beta", providerAgent: `${observe.baseUrl}/.well-known/agent-card.json`, request: { kind: "InfomaterialObservationTask", relativePath: "beta", maximumEntries: 10, maximumBytes: "1000" } },
        ],
      },
    });
    const whole = await observeInfomaterial(territory);
    assert.equal(result.coverReceipt.materialRoot, whole.observation.materialRoot);
    assert.equal(result.circuit.account, RECURSIVE_FABRICATION_CIRCUIT_PROFILE.account);
    assert.match(result.fabricationReceiptNi, /^ni:\/\/\/sha-256;/u);
  } finally {
    await Promise.all(running.reverse().map(({ server }) => new Promise((done) => server.close(done))));
    if (priorTerritory === undefined) delete process.env.INFOMATERIAL_TERRITORY_ROOT;
    else process.env.INFOMATERIAL_TERRITORY_ROOT = priorTerritory;
    if (priorWitnessJournal === undefined) delete process.env.WITNESS_JOURNAL_RDF_AGENT;
    else process.env.WITNESS_JOURNAL_RDF_AGENT = priorWitnessJournal;
  }
});

test("the recursive board occupies its own child socket", { skip: process.env.LIVE_A2A_BOARD !== "1" }, async () => {
  const territory = await mkdtemp(join(tmpdir(), "recursive-board-nested-a2a-"));
  await writeFile(join(territory, "top"), "top");
  await mkdir(join(territory, "nested"));
  await writeFile(join(territory, "nested", "leaf"), "leaf");
  const priorTerritory = process.env.INFOMATERIAL_TERRITORY_ROOT;
  const priorWitnessJournal = process.env.WITNESS_JOURNAL_RDF_AGENT;
  const running = [];
  try {
    process.env.INFOMATERIAL_TERRITORY_ROOT = territory;
    process.env.WITNESS_JOURNAL_RDF_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";
    const plate = await provider(PLATE, "directory-plate-observation.json", "execute-a2a-task.mjs", await freePort());
    const observe = await provider(OBSERVE, "infomaterial-observation.json", "execute-a2a-task.mjs", await freePort());
    const cover = await provider(COVER, "directory-patch-cover.json", "execute-a2a-task.mjs", await freePort());
    const parent = await provider(BOARD, "recursive-infomaterial-fabrication-service.json", "execute-a2a-task.mjs", await freePort());
    running.push(plate, observe, cover, parent);
    const boardAgent = "http://127.0.0.1:19834/.well-known/agent-card.json";
    const common = {
      equivalenceAgent: "http://127.0.0.1:19825/.well-known/agent-card.json",
      synthesisAgent: "http://127.0.0.1:19824/.well-known/agent-card.json",
      plateAgent: `${plate.baseUrl}/.well-known/agent-card.json`,
      coverAgent: `${cover.baseUrl}/.well-known/agent-card.json`,
      maximumMounts: 10,
      maximumParallel: 2,
    };
    const childSchedule = {
      ...common,
      plateRelativePath: "nested",
      routes: [{
        mount: "leaf",
        providerAgent: `${observe.baseUrl}/.well-known/agent-card.json`,
        request: { kind: "InfomaterialObservationTask", relativePath: "nested/leaf", maximumEntries: 10, maximumBytes: "1000" },
      }],
    };
    const result = await requestRecursiveInfomaterialFabrication({
      agentUrl: `${parent.baseUrl}/.well-known/agent-card.json`,
      schedule: {
        ...common,
        plateRelativePath: ".",
        routes: [
          { mount: "nested", providerAgent: boardAgent, request: childSchedule },
          { mount: "top", providerAgent: `${observe.baseUrl}/.well-known/agent-card.json`, request: { kind: "InfomaterialObservationTask", relativePath: "top", maximumEntries: 10, maximumBytes: "1000" } },
        ],
      },
    });
    const whole = await observeInfomaterial(territory);
    assert.equal(result.coverReceipt.materialRoot, whole.observation.materialRoot);
    assert.equal(result.coverReceipt.mounts.find(({ name }) => name === "nested")?.kind, "directory");
  } finally {
    await Promise.all(running.reverse().map(({ server }) => new Promise((done) => server.close(done))));
    if (priorTerritory === undefined) delete process.env.INFOMATERIAL_TERRITORY_ROOT;
    else process.env.INFOMATERIAL_TERRITORY_ROOT = priorTerritory;
    if (priorWitnessJournal === undefined) delete process.env.WITNESS_JOURNAL_RDF_AGENT;
    else process.env.WITNESS_JOURNAL_RDF_AGENT = priorWitnessJournal;
  }
});
