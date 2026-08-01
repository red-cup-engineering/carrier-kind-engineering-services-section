import assert from "node:assert/strict"; import test from "node:test"; import { mkdtemp, writeFile } from "node:fs/promises"; import { tmpdir } from "node:os"; import { createServer } from "node:net"; import { join, resolve } from "node:path";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service"; import { observeInfomaterial } from "@lenticule-science/infomaterial-observation"; import { fabricateDirectoryPatch } from "../src/fabricate.mjs";
import { ephemeralAgentCardSigning } from "./circuit-fixture.mjs";
const SERVICES = resolve(import.meta.dirname, "../../../../../../lenticule-science/services/obsmetrological-services-section/services");
const PLATE = join(SERVICES, "infomaterial-directory-plate-observation"), OBSERVE = join(SERVICES, "infomaterial-observation"), COVER = join(SERVICES, "infomaterial-patch-cover"), EQUIVALENCE = join(SERVICES, "hierarchical-circuit-equivalence-assay"), WitnessJournal = join(SERVICES, "witness-journal-rdf-projection-service");
async function freePort() { const socket = createServer(); await new Promise((done) => socket.listen(0, "127.0.0.1", done)); const port = socket.address().port; await new Promise((done) => socket.close(done)); return port; }
async function provider(root, card, executor, port) { const baseUrl = `http://127.0.0.1:${port}`; return serveContractedAgent({ port, host: "127.0.0.1", baseUrl, agentCard: join(root, "content/agent-cards", card), executor: process.execPath, executorArgs: [join(root, "bin", executor)], ...ephemeralAgentCardSigning(baseUrl, `${card}-${port}`) }); }
test("live official A2A fan-out and fan-in reconstructs the recursive material root", { skip: process.env.LIVE_A2A_FABRICATION !== "1" }, async () => {
  const territory = await mkdtemp(join(tmpdir(), "live-a2a-fabrication-")); await writeFile(join(territory, "alpha"), "alpha"); await writeFile(join(territory, "beta"), "beta");
  const priorTerritory = process.env.INFOMATERIAL_TERRITORY_ROOT, priorWitnessJournal = process.env.WITNESS_JOURNAL_RDF_AGENT; const running = [];
  try {
    const witnessJournal = await provider(WitnessJournal, "witness-journal-rdf.json", "execute-a2a-task.mjs", await freePort()); running.push(witnessJournal); process.env.WITNESS_JOURNAL_RDF_AGENT = `${witnessJournal.baseUrl}/.well-known/agent-card.json`; process.env.INFOMATERIAL_TERRITORY_ROOT = territory;
    const plate = await provider(PLATE, "directory-plate-observation.json", "execute-a2a-task.mjs", await freePort()), observe = await provider(OBSERVE, "infomaterial-observation.json", "execute-a2a-task.mjs", await freePort()), cover = await provider(COVER, "directory-patch-cover.json", "execute-a2a-task.mjs", await freePort()), equivalence = await provider(EQUIVALENCE, "hierarchical-circuit-equivalence-assay.json", "execute-a2a-task.mjs", await freePort()); running.push(plate, observe, cover, equivalence);
    const result = await fabricateDirectoryPatch({ equivalenceAgent: `${equivalence.baseUrl}/.well-known/agent-card.json`, synthesisAgent: process.env.SYNTHESIS_AGENT ?? "http://127.0.0.1:19824/.well-known/agent-card.json", plateAgent: `${plate.baseUrl}/.well-known/agent-card.json`, coverAgent: `${cover.baseUrl}/.well-known/agent-card.json`, plateRelativePath: ".", maximumMounts: 10, maximumParallel: 2, routes: [
      { mount: "alpha", providerAgent: `${observe.baseUrl}/.well-known/agent-card.json`, request: { kind: "InfomaterialObservationTask", relativePath: "alpha", maximumEntries: 10, maximumBytes: "1000" } },
      { mount: "beta", providerAgent: `${observe.baseUrl}/.well-known/agent-card.json`, request: { kind: "InfomaterialObservationTask", relativePath: "beta", maximumEntries: 10, maximumBytes: "1000" } },
    ] });
    const whole = await observeInfomaterial(territory); assert.equal(result.coverReceipt.materialRoot, whole.observation.materialRoot); assert.equal(result.receipt.children.length, 2); assert.equal(result.receipt.localMaterialRead, false);
  } finally {
    await Promise.all(running.reverse().map(({ server }) => new Promise((done) => server.close(done))));
    if (priorTerritory === undefined) delete process.env.INFOMATERIAL_TERRITORY_ROOT; else process.env.INFOMATERIAL_TERRITORY_ROOT = priorTerritory;
    if (priorWitnessJournal === undefined) delete process.env.WITNESS_JOURNAL_RDF_AGENT; else process.env.WITNESS_JOURNAL_RDF_AGENT = priorWitnessJournal;
  }
});
