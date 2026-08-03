import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  CIRCUIT_ASSEMBLY_PROFILE,
  HIERARCHICAL_CIRCUIT_PROFILE,
  circuitAssemblyId,
  hierarchicalCircuitId,
  normalizeCircuitAssembly,
  normalizeCircuitProfile,
  normalizeHierarchicalCircuit,
  verifyCircuitAssembly,
} from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import {
  RELATIONAL_VALUE_TYPE,
  decodeRelationalValue,
  encodeRelationalValue,
} from "@red-cup-engineering/rmn-semantic-conformance/relational-value";

export const SYNTHESIS_PROFILE = "org.emsenn.infomaterial.tensor-circuit-board-synthesis.v1";
export const PROVIDER_ACCOUNT = "eip155:31337:0x5580c2b186327d787704860a6b4449f5beede78b";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function typed(value) {
  const encoded = encodeRelationalValue(value);
  const term = ["ascribe", encoded.type, encoded.term];
  return { id: semanticId(term), bytes: semanticBytes(term) };
}

function ni(value, field) {
  if (typeof value !== "string" || !NI.test(value)) fail("malformed-synthesis", `${field} must be a SHA-256 ni URI`);
  return value;
}

function faceName(value) {
  if (typeof value !== "string") fail("malformed-synthesis", "face name must be text");
  const normalized = value.normalize("NFC");
  if (normalized.length === 0 || Buffer.byteLength(normalized, "utf8") > 128 || normalized.includes("/")) {
    fail("malformed-synthesis", "face name must be nonempty bounded NFC text without slash");
  }
  return normalized;
}

function normalizeInterface(source) {
  if (!exactKeys(source, ["account", "authority", "component", "custody", "territory"])) {
    fail("malformed-synthesis", "a face interface must expose exactly account, authority, component, custody, and territory");
  }
  const component = normalizeHierarchicalCircuit(source.component);
  if (component.instances.length !== 0 || component.nets.length !== 0) {
    fail("interior-disclosure", "a synthesis face must be one placement-neutral black-box leaf");
  }
  if (component.ports.length === 0) fail("zero-pin-face", "a material synthesis face must expose at least one typed pin");
  if (component.ports.some(({ mode }) => mode !== "tensor")) {
    fail("unsettled-par", "tensor board synthesis cannot invent settlement for a par face");
  }
  const membrane = normalizeCircuitProfile({
    account: source.account,
    law: component.law,
    authority: source.authority,
    custody: source.custody,
    territory: source.territory,
  });
  return {
    account: membrane.account,
    authority: membrane.authority,
    custody: membrane.custody,
    territory: membrane.territory,
    component,
  };
}

function normalizeFace(source) {
  if (!exactKeys(source, ["interface", "name"])) {
    fail("malformed-synthesis", "a synthesis face must expose exactly name and interface");
  }
  return { name: faceName(source.name), interface: normalizeInterface(source.interface) };
}

export function normalizeSynthesisRequest(source) {
  if (!exactKeys(source, ["faces", "kind", "root"]) || source.kind !== "TensorCircuitBoardSynthesisRequest" || !Array.isArray(source.faces)) {
    fail("malformed-synthesis", "synthesis request has an unknown, absent, or legacy field");
  }
  if (source.faces.length === 0 || source.faces.length > 100_000) {
    fail("synthesis-bound", "face count must be finite, nonzero, and within the synthesis profile");
  }
  const root = normalizeCircuitProfile(source.root);
  const faces = source.faces.map(normalizeFace).sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
  if (new Set(faces.map(({ name }) => name)).size !== faces.length) fail("repeated-face", "face occurrence names must be unique after normalization");
  for (const face of faces) for (const port of face.interface.component.ports) {
    if (Buffer.byteLength(`${face.name}/${port.name}`, "utf8") > 256) fail("synthesis-bound", "namespaced face pin exceeds the circuit profile");
  }
  return { kind: source.kind, root, faces };
}

export function encodeSynthesisRequest(source) {
  const value = normalizeSynthesisRequest(source);
  const encoded = encodeRelationalValue(value);
  return { value, type: encoded.type, term: encoded.term };
}

export function decodeSynthesisRequest(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-synthesis", "synthesis request must use the relational RMN type");
  return encodeSynthesisRequest(decodeRelationalValue(type, term)).value;
}

function buildCircuit(request) {
  const componentsById = new Map();
  const ports = [], instances = [], nets = [], factors = [], placements = [{ address: [], membrane: {
    account: request.root.account,
    authority: request.root.authority,
    custody: request.root.custody,
    territory: request.root.territory,
  } }];

  for (const face of request.faces) {
    const component = face.interface.component;
    const componentId = hierarchicalCircuitId(component);
    componentsById.set(componentId, component);
    instances.push({ name: face.name, component: componentId });
    placements.push({ address: [face.name], membrane: {
      account: face.interface.account,
      authority: face.interface.authority,
      custody: face.interface.custody,
      territory: face.interface.territory,
    } });
    for (const port of component.ports) {
      const exposed = `${face.name}/${port.name}`;
      ports.push({ ...port, name: exposed });
      nets.push(port.direction === "input"
        ? { name: exposed, driver: { instance: null, port: exposed }, sinks: [{ instance: face.name, port: port.name }], mode: "tensor", chain: null, contract: null }
        : { name: exposed, driver: { instance: face.name, port: port.name }, sinks: [{ instance: null, port: exposed }], mode: "tensor", chain: null, contract: null });
    }
    for (const factor of component.behavior.factors) factors.push({
      inputs: factor.inputs.map((name) => `${face.name}/${name}`),
      outputs: factor.outputs.map((name) => `${face.name}/${name}`),
      rows: factor.rows,
    });
  }

  const circuit = normalizeHierarchicalCircuit({
    profile: HIERARCHICAL_CIRCUIT_PROFILE,
    law: request.root.law,
    ports,
    instances,
    nets,
    behavior: { factors },
  });
  const circuitId = hierarchicalCircuitId(circuit);
  const assembly = normalizeCircuitAssembly({ profile: CIRCUIT_ASSEMBLY_PROFILE, circuit: circuitId, placements });
  const components = [...componentsById.entries()]
    .sort(([left], [right]) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
    .map(([, component]) => component);
  verifyCircuitAssembly(assembly, circuit, components);
  return { circuit, circuitId, components, assembly, assemblyId: circuitAssemblyId(assembly) };
}

export function synthesizeTensorCircuitBoard(source) {
  const request = normalizeSynthesisRequest(source);
  const family = buildCircuit(request);
  const receipt = {
    kind: "TensorCircuitBoardSynthesisReceipt",
    profile: SYNTHESIS_PROFILE,
    provider: PROVIDER_ACCOUNT,
    circuit: family.circuit,
    components: family.components,
    assembly: family.assembly,
    circuitId: family.circuitId,
    assemblyId: family.assemblyId,
    faceAddresses: request.faces.map(({ name }) => [name]),
  };
  const document = typed(receipt);
  return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}

export function decodeSynthesisReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-synthesis", "synthesis receipt must use the relational RMN type");
  const value = decodeRelationalValue(type, term);
  const fields = ["assembly", "assemblyId", "circuit", "circuitId", "components", "faceAddresses", "kind", "profile", "provider"];
  if (!exactKeys(value, fields) || value.kind !== "TensorCircuitBoardSynthesisReceipt" || value.profile !== SYNTHESIS_PROFILE || value.provider !== PROVIDER_ACCOUNT || !Array.isArray(value.components) || !Array.isArray(value.faceAddresses)) {
    fail("malformed-synthesis", "synthesis receipt has an unknown, absent, legacy, or foreign-provider field");
  }
  const circuit = normalizeHierarchicalCircuit(value.circuit);
  const components = value.components.map(normalizeHierarchicalCircuit);
  const assembly = normalizeCircuitAssembly(value.assembly);
  const verified = verifyCircuitAssembly(assembly, circuit, components);
  if (hierarchicalCircuitId(circuit) !== ni(value.circuitId, "circuitId") || circuitAssemblyId(assembly) !== ni(value.assemblyId, "assemblyId") || verified.family.verified.get(value.circuitId)?.equivalent !== true) {
    fail("synthesis-drift", "synthesis receipt identities or behavior do not describe its exact family and assembly");
  }
  const expectedAddresses = verified.contexts.slice(1).map(({ address }) => address);
  if (JSON.stringify(value.faceAddresses) !== JSON.stringify(expectedAddresses)) fail("synthesis-drift", "face occurrence addresses do not equal the exact assembly");
  return { ...value, circuit, components, assembly };
}
