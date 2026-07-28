import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  circuitAssemblyId,
  hierarchicalCircuitId,
  verifyCircuitAssembly,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import {
  decodeRelationalValue,
  encodeRelationalValue,
  RELATIONAL_VALUE_TYPE,
} from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import {
  encodeLayoutAssayRequest,
  normalizeLayoutAssayReceipt,
} from "@red-cup-engineering/infomaterial-layout-service";

export const CUT_GRAPH_PROFILE = "org.emsenn.infomaterial.cut-graph.v2";
export const PROVIDER_ACCOUNT = "eip155:31337:0xae195eca8db53493847a54951f3c6a6c2aeff212";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function compare(left, right) { return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")); }
function ni(value, field) { if (typeof value !== "string" || !NI.test(value)) fail("malformed-cut-graph", `${field} must be a SHA-256 ni URI`); return value; }

function typed(value) {
  const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term];
  return { bytes: semanticBytes(term), id: semanticId(term), term };
}

export function encodeCutGraphRequest(source) {
  if (!exactKeys(source, ["assembly", "circuit", "components", "coverReceipt", "kind", "placements"]) || source.kind !== "InfomaterialCutGraphRequest") fail("malformed-cut-graph", "cut-graph request has an unknown, absent, or legacy field");
  const layout = encodeLayoutAssayRequest({ ...source, kind: "HierarchicalInfomaterialLayoutAssayRequest" }).value;
  const value = { ...layout, kind: "InfomaterialCutGraphRequest" }, encoded = encodeRelationalValue(value);
  return { value, type: encoded.type, term: encoded.term };
}

export function decodeCutGraphRequest(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-cut-graph", "cut-graph request must use the relational RMN type");
  return encodeCutGraphRequest(decodeRelationalValue(type, term)).value;
}

function assertExactLayout(layout, verified, circuit, assembly) {
  if (layout.circuit !== circuit || layout.assembly !== assembly) fail("layout-drift", "layout provider assayed another circuit or sovereign assembly");
  const types = [verified.family.rootIdentity, ...verified.family.library.keys()].sort(compare);
  if (layout.componentTypes.length !== types.length || layout.componentTypes.some((identity, index) => identity !== types[index])) fail("layout-drift", "layout receipt does not carry the exact reachable component family");
  if (layout.occurrenceCount !== verified.contexts.length) fail("layout-drift", "layout receipt occurrence count differs from the sovereign assembly");
}

function deriveNodes(verified, layout) {
  const definitions = new Map([[verified.family.rootIdentity, verified.family.root], ...verified.family.library]);
  const occurrences = new Map();
  for (const context of verified.contexts) occurrences.set(context.identity, (occurrences.get(context.identity) ?? 0) + 1);
  const carriers = new Map([...definitions.keys()].map((identity) => [identity, []]));
  for (const placement of layout.placements) {
    if (placement.component !== null) carriers.get(placement.component)?.push({
      mount: placement.mount,
      materialRoot: placement.materialRoot,
      proofProfile: placement.proofProfile,
      provider: placement.provider,
      refinementReceipt: placement.refinementReceipt,
    });
  }
  return [...definitions].map(([component, definition]) => ({
    component,
    dependencies: [...new Set(definition.instances.map((instance) => instance.component))].sort(compare),
    carriers: carriers.get(component).sort((left, right) => compare(left.mount, right.mount)),
    occurrenceCount: occurrences.get(component) ?? 0,
  })).sort((left, right) => compare(left.component, right.component));
}

function deriveWaves(nodes) {
  const remaining = new Map(nodes.map((node) => [node.component, node])), completed = new Set(), waves = [];
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((node) => node.dependencies.every((dependency) => completed.has(dependency))).map((node) => node.component).sort(compare);
    if (ready.length === 0) fail("cut-cycle", "component containment has no leaf-first cut order");
    waves.push({ ordinal: waves.length, components: ready });
    for (const component of ready) { completed.add(component); remaining.delete(component); }
  }
  return waves;
}

export async function deriveInfomaterialCutGraph(source, { assayLayout } = {}) {
  if (typeof assayLayout !== "function") fail("missing-provider", "an independent infomaterial layout provider is required");
  const request = encodeCutGraphRequest(source).value;
  const verified = verifyCircuitAssembly(request.assembly, request.circuit, request.components);
  const circuit = hierarchicalCircuitId(request.circuit), assembly = circuitAssemblyId(request.assembly);
  const result = await assayLayout({
    circuit: request.circuit, components: request.components, assembly: request.assembly,
    coverReceipt: request.coverReceipt, placements: request.placements,
  });
  const layout = normalizeLayoutAssayReceipt(result?.receipt);
  const layoutReceipt = ni(result?.receiptNi, "layout receipt");
  assertExactLayout(layout, verified, circuit, assembly);
  const nodes = deriveNodes(verified, layout), waves = deriveWaves(nodes);
  const edges = nodes.flatMap((node) => node.dependencies.map((dependency) => ({ from: dependency, to: node.component })))
    .sort((left, right) => compare(`${left.from}\u0000${left.to}`, `${right.from}\u0000${right.to}`));
  if (waves.at(-1)?.components.length !== 1 || waves.at(-1).components[0] !== circuit) fail("cut-order", "root board is not the unique final cut");
  const receipt = {
    kind: "InfomaterialCutGraphReceipt",
    profile: CUT_GRAPH_PROFILE,
    provider: PROVIDER_ACCOUNT,
    layoutProvider: layout.provider,
    circuit,
    assembly,
    layoutReceipt,
    materialRoot: layout.materialRoot,
    nodes,
    edges,
    waves,
    rootLast: true,
    boundariesInferred: false,
    customerMaterialRead: false,
    customerMaterialMutated: false,
  };
  const document = typed(receipt);
  return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}

export function decodeCutGraphReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-cut-graph", "cut-graph receipt must use the relational RMN type");
  const value = decodeRelationalValue(type, term);
  const fields = ["assembly", "boundariesInferred", "circuit", "customerMaterialMutated", "customerMaterialRead", "edges", "kind", "layoutProvider", "layoutReceipt", "materialRoot", "nodes", "profile", "provider", "rootLast", "waves"];
  if (!exactKeys(value, fields) || value.kind !== "InfomaterialCutGraphReceipt" || value.profile !== CUT_GRAPH_PROFILE || value.rootLast !== true || value.boundariesInferred !== false || value.customerMaterialRead !== false || value.customerMaterialMutated !== false) fail("malformed-cut-graph", "cut-graph receipt has an unknown, absent, legacy, or unsafe field");
  if (value.provider !== PROVIDER_ACCOUNT) fail("malformed-cut-graph", "cut-graph receipt provider must be the exact service smart account");
  if (typeof value.layoutProvider !== "string" || !/^eip155:[1-9][0-9]*:0x[0-9a-f]{40}$/u.test(value.layoutProvider)) fail("malformed-cut-graph", "cut-graph receipt must bind the layout provider smart account");
  for (const field of ["circuit", "assembly", "layoutReceipt", "materialRoot"]) ni(value[field], field);
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges) || !Array.isArray(value.waves)) fail("malformed-cut-graph", "cut-graph nodes, edges, and waves must be sequences");
  return value;
}
