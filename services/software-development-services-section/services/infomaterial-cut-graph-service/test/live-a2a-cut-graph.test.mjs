import assert from "node:assert/strict";
import test from "node:test";
import { lstat, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { generateKeyPairSync } from "node:crypto";
import { createAgentCardSigningConfiguration } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  CIRCUIT_ASSEMBLY_PROFILE,
  HIERARCHICAL_CIRCUIT_PROFILE,
  encodeHierarchicalCircuit,
  hierarchicalCircuitId,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { observeInfomaterial } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-observation/src/material-merkle.mjs";
import { observeDirectoryPlate } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-directory-plate-observation/src/directory-plate.mjs";
import { assembleDirectoryCover } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-patch-cover/src/directory-cover.mjs";
import { WASM_FOUR_CARRIER_PROFILE } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/wasm-four-carrier-refinement/src/refinement-assay.mjs";
import { RMN_CIRCUIT_BOARD_CARRIER_PROFILE } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-circuit-board-carrier-refinement/src/refinement-assay.mjs";
import { deriveCutGraph } from "../src/client.mjs";

const CUT_ROOT = resolve(import.meta.dirname, ".."), LAYOUT_ROOT = resolve(import.meta.dirname, "../../infomaterial-layout-service");
const WASM_REFINEMENT_ROOT = resolve(import.meta.dirname, "../../../../../../lenticule-science/services/obsmetrological-services-section/services/wasm-four-carrier-refinement");
const BOARD_REFINEMENT_ROOT = resolve(import.meta.dirname, "../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-circuit-board-carrier-refinement");
const ACCOUNT = "eip155:31337:0xae195eca8db53493847a54951f3c6a6c2aeff212";
const ni = (label) => semanticId(["constant", ["base", "Text"], label]);

async function freePort() {
  const socket = createServer();
  await new Promise((accept) => socket.listen(0, "127.0.0.1", accept));
  const port = socket.address().port;
  await new Promise((accept) => socket.close(accept));
  return port;
}

function signing(baseUrl, kid) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return createAgentCardSigningConfiguration({ baseUrl, kid, privateKey, publicJwk: publicKey.export({ format: "jwk" }) });
}

async function fixture() {
  const FOUR = [
    { positiveEvidence: false, negativeEvidence: false }, { positiveEvidence: true, negativeEvidence: false },
    { positiveEvidence: false, negativeEvidence: true }, { positiveEvidence: true, negativeEvidence: true },
  ];
  const predicate = ni("conducts distinction"), carrier = ni("FOUR pair");
  const leaf = {
    profile: HIERARCHICAL_CIRCUIT_PROFILE, law: ni("live leaf law"),
    ports: [{ name: "in", direction: "input", predicate, carrier, mode: "tensor" }, { name: "out", direction: "output", predicate, carrier, mode: "tensor" }],
    instances: [], nets: [], behavior: { factors: [{ inputs: ["in"], outputs: ["out"], rows: FOUR.map((value) => ({ input: [value], output: [value] })) }] },
  };
  const leafId = hierarchicalCircuitId(leaf);
  const circuit = { profile: HIERARCHICAL_CIRCUIT_PROFILE, law: ni("live board law"), ports: leaf.ports, instances: [{ name: "leaf", component: leafId }], nets: [{ name: "input", driver: { instance: null, port: "in" }, sinks: [{ instance: "leaf", port: "in" }], mode: "tensor", chain: null, contract: null }, { name: "output", driver: { instance: "leaf", port: "out" }, sinks: [{ instance: null, port: "out" }], mode: "tensor", chain: null, contract: null }], behavior: leaf.behavior };
  const circuitId = hierarchicalCircuitId(circuit), root = await mkdtemp(join(tmpdir(), "live-cut-graph-")), leafFile = join(root, "leaf.die"), boardFile = join(root, "board.rmn.cbor");
  const leafBytes = Buffer.from("AGFzbQEAAAABBwFgAn9/AX8DAwIAAAcnAhBwb3NpdGl2ZUV2aWRlbmNlAAAQbmVnYXRpdmVFdmlkZW5jZQABCgsCBAAgAAsEACABCw==", "base64"), boardBytes = semanticBytes(encodeHierarchicalCircuit(circuit));
  await writeFile(leafFile, leafBytes); await writeFile(boardFile, boardBytes);
  const leafObserved = await observeInfomaterial(leafFile), leafPatch = { ...leafObserved.observation, semanticId: leafObserved.semanticId, canonicalBytesBase64: leafObserved.canonicalBytes.toString("base64") };
  const boardObserved = await observeInfomaterial(boardFile), boardPatch = { ...boardObserved.observation, semanticId: boardObserved.semanticId, canonicalBytesBase64: boardObserved.canonicalBytes.toString("base64") };
  const plated = await observeDirectoryPlate(root, { observedAt: "2026-07-20T12:00:00.000Z" }), plate = { ...plated.observation, semanticId: plated.semanticId, canonicalBytesBase64: plated.canonicalBytes.toString("base64") };
  const covered = await assembleDirectoryCover(plate, [{ mount: "board.rmn.cbor", receipt: boardPatch }, { mount: "leaf.die", receipt: leafPatch }], { coveredAt: "2026-07-20T12:00:02.000Z" }), coverReceipt = { ...covered.cover, semanticId: covered.semanticId, canonicalBytesBase64: covered.canonicalBytes.toString("base64") };
  const assembly = { profile: CIRCUIT_ASSEMBLY_PROFILE, circuit: circuitId, placements: [{ address: [], membrane: { account: ACCOUNT, authority: ni("live board authority"), custody: ni("live board custody"), territory: covered.cover.materialRoot } }, { address: ["leaf"], membrane: { account: ACCOUNT, authority: ni("live leaf authority"), custody: ni("live leaf custody"), territory: leafPatch.materialRoot } }] };
  return { circuit, components: [leaf], assembly, coverReceipt, placements: [
    { mount: "leaf.die", component: leafId, producer: ACCOUNT, materialObservation: leafPatch, carrier: { profile: WASM_FOUR_CARRIER_PROFILE, bytesBase64: leafBytes.toString("base64"), mode: String((await lstat(leafFile, { bigint: true })).mode) } },
    { mount: "board.rmn.cbor", component: circuitId, producer: ACCOUNT, materialObservation: boardPatch, carrier: { profile: RMN_CIRCUIT_BOARD_CARRIER_PROFILE, bytesBase64: boardBytes.toString("base64"), mode: String((await lstat(boardFile, { bigint: true })).mode) } },
  ] };
}

test("the cut graph contracts layout through a live standard A2A seam", { skip: process.env.RUN_LIVE_A2A_CUT_GRAPH !== "1", timeout: 120_000 }, async () => {
  const wasmPort = await freePort(), boardPort = await freePort(), layoutPort = await freePort(), cutPort = await freePort();
  const prior = { EQUIVALENCE_AGENT_URL: process.env.EQUIVALENCE_AGENT_URL, WITNESS_JOURNAL_RDF_AGENT: process.env.WITNESS_JOURNAL_RDF_AGENT, INFOMATERIAL_LAYOUT_AGENT: process.env.INFOMATERIAL_LAYOUT_AGENT, WASM_FOUR_REFINEMENT_AGENT_URL: process.env.WASM_FOUR_REFINEMENT_AGENT_URL, RMN_BOARD_REFINEMENT_AGENT_URL: process.env.RMN_BOARD_REFINEMENT_AGENT_URL };
  process.env.EQUIVALENCE_AGENT_URL = process.env.EQUIVALENCE_AGENT_URL ?? "http://127.0.0.1:19825/.well-known/agent-card.json";
  process.env.WITNESS_JOURNAL_RDF_AGENT = process.env.WITNESS_JOURNAL_RDF_AGENT ?? "http://127.0.0.1:19764/.well-known/agent-card.json";
  let wasm, board, layout, cut;
  try {
    const wasmBaseUrl = `http://127.0.0.1:${wasmPort}`, boardBaseUrl = `http://127.0.0.1:${boardPort}`;
    wasm = await serveContractedAgent({ port: wasmPort, host: "127.0.0.1", baseUrl: wasmBaseUrl, agentCard: join(WASM_REFINEMENT_ROOT, "content/agent-cards/wasm-four-carrier-refinement.json"), executor: process.execPath, executorArgs: [join(WASM_REFINEMENT_ROOT, "bin/execute-a2a-task.mjs")], ...signing(wasmBaseUrl, "live-wasm-refinement-ed25519") });
    board = await serveContractedAgent({ port: boardPort, host: "127.0.0.1", baseUrl: boardBaseUrl, agentCard: join(BOARD_REFINEMENT_ROOT, "content/agent-cards/rmn-circuit-board-carrier-refinement.json"), executor: process.execPath, executorArgs: [join(BOARD_REFINEMENT_ROOT, "bin/execute-a2a-task.mjs")], ...signing(boardBaseUrl, "live-board-refinement-ed25519") });
    process.env.WASM_FOUR_REFINEMENT_AGENT_URL = `${wasm.baseUrl}/.well-known/agent-card.json`;
    process.env.RMN_BOARD_REFINEMENT_AGENT_URL = `${board.baseUrl}/.well-known/agent-card.json`;
    const layoutBaseUrl = `http://127.0.0.1:${layoutPort}`;
    layout = await serveContractedAgent({ port: layoutPort, host: "127.0.0.1", baseUrl: layoutBaseUrl, agentCard: join(LAYOUT_ROOT, "content/agent-cards/infomaterial-layout.json"), executor: process.execPath, executorArgs: [join(LAYOUT_ROOT, "bin/execute-a2a-task.mjs")], ...signing(layoutBaseUrl, "live-layout-ed25519") });
    process.env.INFOMATERIAL_LAYOUT_AGENT = `${layout.baseUrl}/.well-known/agent-card.json`;
    const cutBaseUrl = `http://127.0.0.1:${cutPort}`;
    cut = await serveContractedAgent({ port: cutPort, host: "127.0.0.1", baseUrl: cutBaseUrl, agentCard: join(CUT_ROOT, "content/agent-cards/infomaterial-cut-graph.json"), executor: process.execPath, executorArgs: [join(CUT_ROOT, "bin/execute-a2a-task.mjs")], ...signing(cutBaseUrl, "live-cut-graph-ed25519") });
    const receipt = await deriveCutGraph({ agentUrl: `${cut.baseUrl}/.well-known/agent-card.json`, ...await fixture() });
    assert.equal(receipt.receipt.rootLast, true);
    assert.equal(receipt.receipt.waves.length, 2);
    assert.equal(receipt.receipt.customerMaterialRead, false);
  } finally {
    if (cut) await new Promise((accept) => cut.server.close(accept));
    if (layout) await new Promise((accept) => layout.server.close(accept));
    if (board) await new Promise((accept) => board.server.close(accept));
    if (wasm) await new Promise((accept) => wasm.server.close(accept));
    for (const [name, value] of Object.entries(prior)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
