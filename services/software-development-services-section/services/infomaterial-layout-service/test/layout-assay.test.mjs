import assert from "node:assert/strict";
import test from "node:test";
import { lstat, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { generateKeyPairSync } from "node:crypto";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { createAgentCardSigningConfiguration } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { requestHierarchicalCircuitEquivalence } from "@lenticule-science/hierarchical-circuit-equivalence-assay/client";
import { assayHierarchicalCircuitEquivalence } from "@lenticule-science/hierarchical-circuit-equivalence-assay";
import {
  CIRCUIT_ASSEMBLY_PROFILE,
  HIERARCHICAL_CIRCUIT_PROFILE,
  encodeHierarchicalCircuit,
  hierarchicalCircuitId,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { observeInfomaterial } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-observation/src/material-merkle.mjs";
import { observeDirectoryPlate } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-directory-plate-observation/src/directory-plate.mjs";
import { assembleDirectoryCover } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-patch-cover/src/directory-cover.mjs";
import { assayWasmFourCarrierRefinement, WASM_FOUR_CARRIER_PROFILE } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/wasm-four-carrier-refinement/src/refinement-assay.mjs";
import { assayRmnCircuitBoardCarrierRefinement, RMN_CIRCUIT_BOARD_CARRIER_PROFILE } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-circuit-board-carrier-refinement/src/refinement-assay.mjs";
import { assayHierarchicalMaterialLayout } from "../src/layout-assay.mjs";

const FOUR = [
  { positiveEvidence: false, negativeEvidence: false },
  { positiveEvidence: true, negativeEvidence: false },
  { positiveEvidence: false, negativeEvidence: true },
  { positiveEvidence: true, negativeEvidence: true },
];
const ACCOUNT = "eip155:31337:0x1111111111111111111111111111111111111111";
const ACCOUNT_TWO = "eip155:31337:0x2222222222222222222222222222222222222222";
const EQUIVALENCE_ROOT = resolve(import.meta.dirname, "../../../../../../lenticule-science/services/obsmetrological-services-section/services/hierarchical-circuit-equivalence-assay");
const WITNESS_JOURNAL_ROOT = resolve(import.meta.dirname, "../../../../../../lenticule-science/services/obsmetrological-services-section/services/witness-journal-rdf-projection-service");
const ni = (label) => semanticId(["constant", ["base", "Text"], label]);
const PREDICATE = ni("conducts witnessed distinction"), CARRIER = ni("FOUR evidence pair");
const PORTS = [
  { name: "in", direction: "input", predicate: PREDICATE, carrier: CARRIER, mode: "tensor" },
  { name: "out", direction: "output", predicate: PREDICATE, carrier: CARRIER, mode: "tensor" },
];
const BEHAVIOR = { rows: FOUR.map((value) => ({ input: [value], output: [value] })) };
const IDENTITY_WASM = Buffer.from("AGFzbQEAAAABBwFgAn9/AX8DAwIAAAcnAhBwb3NpdGl2ZUV2aWRlbmNlAAAQbmVnYXRpdmVFdmlkZW5jZQABCgsCBAAgAAsEACABCw==", "base64");

async function freePort() {
  const socket = createServer();
  await new Promise((accept) => socket.listen(0, "127.0.0.1", accept));
  const port = socket.address().port;
  await new Promise((accept) => socket.close(accept));
  return port;
}

async function observed(path, observedAt, bytes, profile) {
  const result = await observeInfomaterial(path);
  const receipt = { ...result.observation, semanticId: result.semanticId, canonicalBytesBase64: result.canonicalBytes.toString("base64"), patchRoot: path, observedAt };
  return { receipt, carrier: { profile, bytesBase64: bytes.toString("base64"), mode: String((await lstat(path, { bigint: true })).mode) } };
}

async function fixture() {
  const child = {
    profile: HIERARCHICAL_CIRCUIT_PROFILE, law: ni("child law"),
    ports: PORTS, instances: [], nets: [], behavior: BEHAVIOR,
  };
  const childId = hierarchicalCircuitId(child);
  const parent = {
    profile: HIERARCHICAL_CIRCUIT_PROFILE, law: ni("parent law"),
    ports: PORTS,
    instances: [{ name: "left", component: childId }, { name: "right", component: childId }],
    nets: [
      { name: "input-net", driver: { instance: null, port: "in" }, sinks: [{ instance: "left", port: "in" }], mode: "tensor", chain: null, contract: null },
      { name: "middle-net", driver: { instance: "left", port: "out" }, sinks: [{ instance: "right", port: "in" }], mode: "tensor", chain: null, contract: null },
      { name: "output-net", driver: { instance: "right", port: "out" }, sinks: [{ instance: null, port: "out" }], mode: "tensor", chain: null, contract: null },
    ],
    behavior: BEHAVIOR,
  };
  const boardBytes = semanticBytes(encodeHierarchicalCircuit(parent));
  const root = await mkdtemp(join(tmpdir(), "infomaterial-layout-"));
  await writeFile(join(root, "die.bin"), IDENTITY_WASM);
  await writeFile(join(root, "substrate.bin"), boardBytes);
  const die = await observed(join(root, "die.bin"), "2026-07-20T00:00:01.000Z", IDENTITY_WASM, WASM_FOUR_CARRIER_PROFILE);
  const substrate = await observed(join(root, "substrate.bin"), "2026-07-20T00:00:02.000Z", boardBytes, RMN_CIRCUIT_BOARD_CARRIER_PROFILE);
  const plateResult = await observeDirectoryPlate(root, { observedAt: "2026-07-20T00:00:00.000Z" });
  const plate = { ...plateResult.observation, semanticId: plateResult.semanticId, canonicalBytesBase64: plateResult.canonicalBytes.toString("base64") };
  const covered = await assembleDirectoryCover(plate, [{ mount: "die.bin", receipt: die.receipt }, { mount: "substrate.bin", receipt: substrate.receipt }], { coveredAt: "2026-07-20T00:00:03.000Z" });
  const coverReceipt = { ...covered.cover, semanticId: covered.semanticId, canonicalBytesBase64: covered.canonicalBytes.toString("base64") };
  const placement = (address, account, label, territory) => ({ address, membrane: { account, authority: ni(`${label} authority`), custody: ni(`${label} custody`), territory } });
  const assembly = {
    profile: CIRCUIT_ASSEMBLY_PROFILE,
    circuit: hierarchicalCircuitId(parent),
    placements: [
      placement([], ACCOUNT, "parent", covered.cover.materialRoot),
      placement(["left"], ACCOUNT, "left", die.receipt.materialRoot),
      placement(["right"], ACCOUNT_TWO, "right", die.receipt.materialRoot),
    ],
  };
  const request = {
    kind: "HierarchicalInfomaterialLayoutAssayRequest", circuit: parent, components: [child], assembly, coverReceipt,
    placements: [
      { mount: "die.bin", component: childId, producer: ACCOUNT, materialObservation: die.receipt, carrier: die.carrier },
      { mount: "substrate.bin", component: hierarchicalCircuitId(parent), producer: ACCOUNT_TWO, materialObservation: substrate.receipt, carrier: substrate.carrier },
    ],
  };
  const conform = async ({ circuit, components, assembly: populated }) => ({
    assay: assayHierarchicalCircuitEquivalence({ circuit, components, assembly: populated }).receipt,
    receiptNi: ni("independent equivalence receipt"),
  });
  const assayEquivalence = async (value) => {
    const result = await conform(value);
    return { receipt: result.assay, receiptNi: result.receiptNi };
  };
  const refine = async ({ producer, circuit, components, assembly, component, materialObservation, carrier }) => {
    const result = carrier.profile === WASM_FOUR_CARRIER_PROFILE
      ? await assayWasmFourCarrierRefinement({ kind: "WasmFourCarrierRefinementAssayRequest", producer, component, materialObservation, carrier })
      : await assayRmnCircuitBoardCarrierRefinement({ kind: "RmnCircuitBoardCarrierRefinementAssayRequest", producer, circuit, components, assembly, component, materialObservation, carrier }, { assayEquivalence });
    return { receipt: result.receipt, receiptNi: result.semanticId };
  };
  return { request, conform, refine, die };
}

test("one hierarchical circuit family occupies one recursive material cover exactly", async () => {
  const { request, conform, refine } = await fixture();
  const result = await assayHierarchicalMaterialLayout(request, { conform, refine });
  assert.equal(result.receipt.complete, true);
  assert.equal(result.receipt.nonOverlapping, true);
  assert.equal(result.receipt.childInteriorsRead, false);
  assert.equal(result.receipt.placements.length, 2);
  assert.equal(result.receipt.occurrenceCount, 3);
  assert.equal(result.receipt.componentTypes.length, 2);
  assert.equal(result.receipt.carrierBytesRetained, false);
  assert.equal(result.receipt.placements.every(({ refinementReceipt }) => refinementReceipt.startsWith("ni:///sha-256;")), true);
  assert.equal(result.receipt.circuit, hierarchicalCircuitId(request.circuit));
  assert.match(result.semanticId, /^ni:\/\/\/sha-256;/u);
});

test("a material mount cannot disappear from the board", async () => {
  const { request, conform, refine } = await fixture();
  request.placements = request.placements.filter(({ mount }) => mount !== "substrate.bin");
  await assert.rejects(assayHierarchicalMaterialLayout(request, { conform, refine }), /has no mechanically refined component carrier/u);
});

test("every reusable die definition requires a material carrier", async () => {
  const { request, conform } = await fixture();
  request.placements[0].component = hierarchicalCircuitId(request.circuit);
  const refine = async ({ producer, component, materialObservation, carrier }) => ({
    receiptNi: ni(`refinement ${materialObservation.materialRoot}`),
    receipt: { kind: "CircuitCarrierRefinementReceipt", profile: "org.emsenn.infomaterial.carrier-refinement.v1", proofProfile: carrier.profile, provider: "eip155:31337:0x685c8eb6d6fd9354bc1f281de76d60c51ba280db", producer, component: hierarchicalCircuitId(component), behavior: ni("stub behavior"), carrier: ni("stub carrier"), materialRoot: materialObservation.materialRoot, observation: materialObservation.semanticId, proof: ni("stub proof"), equivalent: true, customerMaterialMutated: false },
  });
  await assert.rejects(assayHierarchicalMaterialLayout(request, { conform, refine }), /has no material carrier/u);
});

test("the placement die refuses to replace the independent equivalence assay", async () => {
  const { request } = await fixture();
  await assert.rejects(assayHierarchicalMaterialLayout(request, {}), /independent hierarchical circuit equivalence provider is required/u);
});

test("a function label is not material refinement", async () => {
  const { request, conform, refine } = await fixture();
  request.placements[0] = { mount: request.placements[0].mount, component: request.placements[0].component, ["material" + "Function"]: ni("label only") };
  await assert.rejects(assayHierarchicalMaterialLayout(request, { conform, refine }), /must expose exactly mount, component, producer, materialObservation, and carrier/u);
});

test("the placement die hires the independent equivalence die through signed A2A", async () => {
  const priorWitnessJournal = process.env.WITNESS_JOURNAL_RDF_AGENT;
  const witnessJournalPort = await freePort(), witnessJournalBaseUrl = `http://127.0.0.1:${witnessJournalPort}`;
  const witnessJournalKeys = generateKeyPairSync("ed25519");
  const witnessJournal = await serveContractedAgent({
    port: witnessJournalPort, host: "127.0.0.1", baseUrl: witnessJournalBaseUrl,
    agentCard: join(WITNESS_JOURNAL_ROOT, "content/agent-cards/witness-journal-rdf.json"), executor: process.execPath,
    executorArgs: [join(WITNESS_JOURNAL_ROOT, "bin/execute-a2a-task.mjs")],
    ...createAgentCardSigningConfiguration({ baseUrl: witnessJournalBaseUrl, kid: "layout-witness-journal-test-ed25519", privateKey: witnessJournalKeys.privateKey, publicJwk: witnessJournalKeys.publicKey.export({ format: "jwk" }) }),
  });
  process.env.WITNESS_JOURNAL_RDF_AGENT = `${witnessJournal.baseUrl}/.well-known/agent-card.json`;
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const running = await serveContractedAgent({
    port, host: "127.0.0.1", baseUrl,
    agentCard: join(EQUIVALENCE_ROOT, "content/agent-cards/hierarchical-circuit-equivalence-assay.json"),
    executor: process.execPath,
    executorArgs: [join(EQUIVALENCE_ROOT, "bin/execute-a2a-task.mjs")],
    ...createAgentCardSigningConfiguration({ baseUrl, kid: "layout-equivalence-test-ed25519", privateKey, publicJwk: publicKey.export({ format: "jwk" }) }),
  });
  try {
    const { request, refine } = await fixture();
    const result = await assayHierarchicalMaterialLayout(request, {
      conform: async ({ circuit, components, assembly }) => {
        const response = await requestHierarchicalCircuitEquivalence({ agentUrl: `${running.baseUrl}/.well-known/agent-card.json`, circuit, components, assembly });
        return { assay: response.receipt, receiptNi: response.receiptNi };
      },
      refine,
    });
    assert.equal(result.receipt.equivalenceReceipt.startsWith("ni:///sha-256;"), true);
    assert.equal(result.receipt.circuit, hierarchicalCircuitId(request.circuit));
  } finally {
    await new Promise((accept) => running.server.close(accept));
    await new Promise((accept) => witnessJournal.server.close(accept));
    if (priorWitnessJournal === undefined) delete process.env.WITNESS_JOURNAL_RDF_AGENT; else process.env.WITNESS_JOURNAL_RDF_AGENT = priorWitnessJournal;
  }
});
