import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createA2aServer } from "@red-cup-engineering/a2a-services-section/a2a-server";
import { ephemeralAgentCardSigning } from "@red-cup-engineering/a2a-services-section/agent-card-signing";
import { observeInfomaterial } from "@lenticule-science/infomaterial-observation";
import { requestRecursiveInfomaterialFabrication } from "@red-cup-engineering/recursive-infomaterial-fabrication-service/client";
import { RECURSIVE_FABRICATION_CIRCUIT_PROFILE } from "@red-cup-engineering/recursive-infomaterial-fabrication-service/src/own-circuit-profile.mjs";

const BOARD = resolve(import.meta.dirname, "..");
const packageRoot = (specifier) => resolve(fileURLToPath(import.meta.resolve(specifier)), "../..");
const PLATE = packageRoot("@lenticule-science/infomaterial-directory-plate-observation");
const OBSERVE = packageRoot("@lenticule-science/infomaterial-observation");
const COVER = packageRoot("@lenticule-science/infomaterial-patch-cover");
const BOARD_EXECUTOR = fileURLToPath(new URL("../scripts/recursive-infomaterial-fabrication-a2a-executor.mjs", import.meta.url));

async function freePort() {
  const socket = createServer();
  await new Promise((done) => socket.listen(0, "127.0.0.1", done));
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  return port;
}

// Replaces the retired a2a-contracted-agent-service's process-per-request
// serveContractedAgent: the current createA2aServer takes an agent card and
// in-process handlers, so a spawned executor's stdin/stdout contract (the
// same one execute-a2a-task.mjs always spoke) is wrapped as one handler.
async function provider(root, card, port, executorPath = join(root, "scripts/execute-a2a-task.mjs")) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const rawCard = JSON.parse(readFileSync(join(root, "content/agent-cards", card), "utf8"));
  const signing = ephemeralAgentCardSigning(baseUrl, `${card}-${port}`);
  return createA2aServer({
    port,
    host: "127.0.0.1",
    baseUrl,
    agentCard: signing.sign(rawCard),
    handlers: {
      "message/send": (message) => {
        const result = spawnSync(process.execPath, [executorPath], { input: JSON.stringify(message), encoding: "utf8" });
        if (result.status !== 0) throw new Error(result.stderr || `executor ${executorPath} exited ${result.status}`);
        return JSON.parse(result.stdout);
      },
    },
  });
}

test("a customer hires the signed recursive board without importing its interior", { skip: process.env.LIVE_A2A_BOARD === "1" ? false : "requires a live board A2A network; set LIVE_A2A_BOARD=1" }, async () => {
  const territory = await mkdtemp(join(tmpdir(), "recursive-board-a2a-"));
  await writeFile(join(territory, "alpha"), "alpha");
  await writeFile(join(territory, "beta"), "beta");
  const priorTerritory = process.env.INFOMATERIAL_TERRITORY_ROOT;
  const priorPlateTerritory = process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT;
  const running = [];
  try {
    process.env.INFOMATERIAL_TERRITORY_ROOT = territory;
    process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT = territory;
    const plate = await provider(PLATE, "directory-plate-observation.json", await freePort());
    const observe = await provider(OBSERVE, "infomaterial-observation.json", await freePort());
    const cover = await provider(COVER, "directory-patch-cover.json", await freePort());
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
    if (priorPlateTerritory === undefined) delete process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT;
    else process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT = priorPlateTerritory;
  }
});

test("the recursive board occupies its own child socket", { skip: process.env.LIVE_A2A_BOARD === "1" ? false : "requires a live board A2A network; set LIVE_A2A_BOARD=1" }, async () => {
  const territory = await mkdtemp(join(tmpdir(), "recursive-board-nested-a2a-"));
  await writeFile(join(territory, "top"), "top");
  await mkdir(join(territory, "nested"));
  await writeFile(join(territory, "nested", "leaf"), "leaf");
  const priorTerritory = process.env.INFOMATERIAL_TERRITORY_ROOT;
  const priorPlateTerritory = process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT;
  const running = [];
  try {
    process.env.INFOMATERIAL_TERRITORY_ROOT = territory;
    process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT = territory;
    const plate = await provider(PLATE, "directory-plate-observation.json", await freePort());
    const observe = await provider(OBSERVE, "infomaterial-observation.json", await freePort());
    const cover = await provider(COVER, "directory-patch-cover.json", await freePort());
    const parent = await provider(BOARD, "recursive-infomaterial-fabrication-service.json", await freePort(), BOARD_EXECUTOR);
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
    if (priorPlateTerritory === undefined) delete process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT;
    else process.env.INFOMATERIAL_DIRECTORY_PLATE_TERRITORY_ROOT = priorPlateTerritory;
  }
});
