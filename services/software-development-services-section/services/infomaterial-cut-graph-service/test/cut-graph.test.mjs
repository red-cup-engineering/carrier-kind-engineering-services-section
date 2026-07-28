import assert from "node:assert/strict";
import test from "node:test";
import { lstat, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  CIRCUIT_ASSEMBLY_PROFILE,
  HIERARCHICAL_CIRCUIT_PROFILE,
  circuitAssemblyId,
  encodeHierarchicalCircuit,
  hierarchicalCircuitId,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { LAYOUT_PROFILE, PROVIDER_ACCOUNT as LAYOUT_PROVIDER } from "@red-cup-engineering/infomaterial-layout-service";
import { observeInfomaterial } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-observation/src/material-merkle.mjs";
import { observeDirectoryPlate } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-directory-plate-observation/src/directory-plate.mjs";
import { assembleDirectoryCover } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/infomaterial-patch-cover/src/directory-cover.mjs";
import { WASM_FOUR_CARRIER_PROFILE } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/wasm-four-carrier-refinement/src/refinement-assay.mjs";
import { RMN_CIRCUIT_BOARD_CARRIER_PROFILE } from "../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-circuit-board-carrier-refinement/src/refinement-assay.mjs";
import { CUT_GRAPH_PROFILE, deriveInfomaterialCutGraph } from "../src/cut-graph.mjs";

const ni = (label) => semanticId(["constant", ["base", "Text"], label]);
const ACCOUNT = "eip155:31337:0x1111111111111111111111111111111111111111";
const FOUR = [
  { positiveEvidence: false, negativeEvidence: false },
  { positiveEvidence: true, negativeEvidence: false },
  { positiveEvidence: false, negativeEvidence: true },
  { positiveEvidence: true, negativeEvidence: true },
];
const PREDICATE = ni("conducts distinction"), CARRIER = ni("FOUR pair");
const PORTS = [
  { name: "in", direction: "input", predicate: PREDICATE, carrier: CARRIER, mode: "tensor" },
  { name: "out", direction: "output", predicate: PREDICATE, carrier: CARRIER, mode: "tensor" },
];
const IDENTITY_BEHAVIOR = { rows: FOUR.map((value) => ({ input: [value], output: [value] })) };
const IDENTITY_WASM = Buffer.from("AGFzbQEAAAABBwFgAn9/AX8DAwIAAAcnAhBwb3NpdGl2ZUV2aWRlbmNlAAAQbmVnYXRpdmVFdmlkZW5jZQABCgsCBAAgAAsEACABCw==", "base64");

function definition(label, instances = []) {
  const nets = instances.length === 0 ? [] : [
    { name: "input", driver: { instance: null, port: "in" }, sinks: [{ instance: instances[0].name, port: "in" }], mode: "tensor", chain: null, contract: null },
    ...instances.slice(1).map((instance, index) => ({ name: `middle-${index}`, driver: { instance: instances[index].name, port: "out" }, sinks: [{ instance: instance.name, port: "in" }], mode: "tensor", chain: null, contract: null })),
    { name: "output", driver: { instance: instances.at(-1).name, port: "out" }, sinks: [{ instance: null, port: "out" }], mode: "tensor", chain: null, contract: null },
  ];
  return { profile: HIERARCHICAL_CIRCUIT_PROFILE, law: ni(`${label} law`), ports: PORTS, instances, nets, behavior: IDENTITY_BEHAVIOR };
}

async function observed(path, bytes, profile) {
  const result = await observeInfomaterial(path), receipt = { ...result.observation, semanticId: result.semanticId, canonicalBytesBase64: result.canonicalBytes.toString("base64") };
  return { receipt, carrier: { profile, bytesBase64: bytes.toString("base64"), mode: String((await lstat(path, { bigint: true })).mode) } };
}

async function fixture() {
  const leaf = definition("leaf"), leafId = hierarchicalCircuitId(leaf);
  const board = definition("board", [{ name: "leaf", component: leafId }]), boardId = hierarchicalCircuitId(board);
  const root = definition("root", [{ name: "left", component: boardId }, { name: "right", component: boardId }]), rootId = hierarchicalCircuitId(root);
  const placement = (address, label) => ({ address, membrane: { account: ACCOUNT, authority: ni(`${label} authority`), custody: ni(`${label} custody`), territory: ni(`${label} territory`) } });
  const assembly = {
    profile: CIRCUIT_ASSEMBLY_PROFILE, circuit: rootId,
    placements: [placement([], "root"), placement(["left"], "left"), placement(["left", "leaf"], "left leaf"), placement(["right"], "right"), placement(["right", "leaf"], "right leaf")],
  };
  const rootDir = await mkdtemp(join(tmpdir(), "cut-graph-material-"));
  const materials = [{ mount: "leaf.die", bytes: IDENTITY_WASM, profile: WASM_FOUR_CARRIER_PROFILE }, { mount: "board.die", bytes: semanticBytes(encodeHierarchicalCircuit(board)), profile: RMN_CIRCUIT_BOARD_CARRIER_PROFILE }, { mount: "root.board", bytes: semanticBytes(encodeHierarchicalCircuit(root)), profile: RMN_CIRCUIT_BOARD_CARRIER_PROFILE }];
  for (const material of materials) await writeFile(join(rootDir, material.mount), material.bytes);
  for (const material of materials) Object.assign(material, await observed(join(rootDir, material.mount), material.bytes, material.profile));
  const plateResult = await observeDirectoryPlate(rootDir, { observedAt: "2026-07-20T00:00:00.000Z" }), plate = { ...plateResult.observation, semanticId: plateResult.semanticId, canonicalBytesBase64: plateResult.canonicalBytes.toString("base64") };
  const covered = await assembleDirectoryCover(plate, materials.map(({ mount, receipt }) => ({ mount, receipt })), { coveredAt: "2026-07-20T00:00:01.000Z" });
  const coverReceipt = { ...covered.cover, semanticId: covered.semanticId, canonicalBytesBase64: covered.canonicalBytes.toString("base64") }, materialRoot = coverReceipt.materialRoot;
  const placements = [
    { mount: "leaf.die", component: leafId, producer: ACCOUNT, materialObservation: materials[0].receipt, carrier: materials[0].carrier },
    { mount: "board.die", component: boardId, producer: ACCOUNT, materialObservation: materials[1].receipt, carrier: materials[1].carrier },
    { mount: "root.board", component: rootId, producer: ACCOUNT, materialObservation: materials[2].receipt, carrier: materials[2].carrier },
  ];
  const layout = {
    kind: "HierarchicalInfomaterialLayoutAssayReceipt", profile: LAYOUT_PROFILE,
    provider: LAYOUT_PROVIDER,
    circuit: rootId, assembly: circuitAssemblyId(assembly), behavior: ni("root behavior"), equivalenceProvider: "eip155:31337:0xeab9a6b8a96342b12d0bf97adfe2cc8a329e3931", equivalenceReceipt: ni("equivalence receipt"),
    materialCover: coverReceipt.semanticId, materialRoot, componentTypes: [leafId, boardId, rootId].sort(), occurrenceCount: 5,
    placements: placements.map((item) => ({ mount: item.mount, component: item.component, materialRoot: item.materialObservation.materialRoot, proofProfile: item.carrier.profile, provider: "eip155:31337:0x685c8eb6d6fd9354bc1f281de76d60c51ba280db", refinementReceipt: ni(`${item.mount} refinement`) })),
    complete: true, nonOverlapping: true, childInteriorsRead: false, carrierBytesRetained: false,
  };
  const request = { kind: "InfomaterialCutGraphRequest", circuit: root, components: [board, leaf], assembly, coverReceipt, placements };
  const assayLayout = async () => ({ receipt: layout, receiptNi: ni("layout receipt") });
  return { request, assayLayout, ids: { leafId, boardId, rootId } };
}

test("reusable die types form deterministic leaf-first circuit-board waves", async () => {
  const { request, assayLayout, ids } = await fixture(), result = await deriveInfomaterialCutGraph(request, { assayLayout });
  assert.equal(result.receipt.profile, CUT_GRAPH_PROFILE);
  assert.deepEqual(result.receipt.waves, [
    { ordinal: 0, components: [ids.leafId] },
    { ordinal: 1, components: [ids.boardId] },
    { ordinal: 2, components: [ids.rootId] },
  ]);
  assert.deepEqual(new Set(result.receipt.edges.map(({ from, to }) => `${from}->${to}`)), new Set([`${ids.leafId}->${ids.boardId}`, `${ids.boardId}->${ids.rootId}`]));
  assert.equal(result.receipt.nodes.find(({ component }) => component === ids.leafId).occurrenceCount, 2);
  assert.equal(result.receipt.nodes.find(({ component }) => component === ids.boardId).occurrenceCount, 2);
  assert.equal(result.receipt.nodes.find(({ component }) => component === ids.rootId).occurrenceCount, 1);
  const retiredLabelField = "material" + "Function";
  assert.equal(result.receipt.nodes.every((node) => node.carriers.every((carrier) => carrier.refinementReceipt.startsWith("ni:///sha-256;") && !(retiredLabelField in carrier))), true);
  assert.equal(result.receipt.rootLast, true);
  assert.equal(result.receipt.boundariesInferred, false);
  assert.equal(result.receipt.customerMaterialRead, false);
  assert.equal(result.receipt.customerMaterialMutated, false);
});

test("the ordering die cannot attest its own material layout", async () => {
  const { request } = await fixture();
  await assert.rejects(deriveInfomaterialCutGraph(request), /independent infomaterial layout provider is required/u);
});

test("layout identity drift is a hard refusal", async () => {
  const { request, assayLayout } = await fixture();
  await assert.rejects(deriveInfomaterialCutGraph(request, { assayLayout: async (value) => {
    const result = await assayLayout(value);
    result.receipt.assembly = ni("another assembly");
    return result;
  } }), /another circuit or sovereign assembly/u);
});

test("a reusable definition cannot embed one occurrence membrane", async () => {
  const { request, assayLayout } = await fixture();
  request.components[0].membrane = { account: ACCOUNT };
  await assert.rejects(deriveInfomaterialCutGraph(request, { assayLayout }), /unknown, absent, or legacy field/u);
});
