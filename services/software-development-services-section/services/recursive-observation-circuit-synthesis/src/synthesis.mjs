import { semanticBytes } from "@red-cup-engineering/relation-model-notation-runtime";
import { circuitAssemblyId, hierarchicalCircuitId, normalizeCircuitAssembly, normalizeCircuitProfile, normalizeHierarchicalCircuit, verifyCircuitAssembly } from "@red-cup-engineering/relation-model-notation-runtime/hierarchical-circuit";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/relation-model-notation-runtime/relational-value";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { buildFabricationCircuitFamily } from "./circuit-family.mjs";

export const SYNTHESIS_PROFILE = "org.emsenn.infomaterial.recursive-observation-circuit-synthesis.v1";
export const PROVIDER_ACCOUNT = "eip155:31337:0x92397c097ffce54cf7d424b99c31f91f761e1f6b";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function typed(value) {
  const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term];
  const identity = identifyJsonSemanticContent({ objectKind: "recursive-observation-circuit.synthesis-receipt", value, witnessRoot: EMPTY_WITNESS_ROOT });
  return { id: identity.token, bytes: semanticBytes(term) };
}
function ni(value, field) { if (typeof value !== "string" || !NI.test(value)) fail("malformed-synthesis", `${field} must be a SHA-256 ni URI`); return value; }

export function normalizeSynthesisRequest(source) {
  if (!exactKeys(source, ["cover", "kind", "observers", "plate", "root", "tally"]) || source.kind !== "RecursiveObservationCircuitSynthesisRequest" || !Array.isArray(source.observers)) fail("malformed-synthesis", "synthesis request has an unknown, absent, or legacy field");
  if (source.observers.length > 100_000) fail("synthesis-bound", "observer count exceeds the synthesis profile");
  return { kind: source.kind, root: normalizeCircuitProfile(source.root), plate: source.plate, cover: source.cover, tally: normalizeCircuitProfile(source.tally), observers: source.observers };
}

export function encodeSynthesisRequest(source) { const value = normalizeSynthesisRequest(source), encoded = encodeRelationalValue(value); return { value, type: encoded.type, term: encoded.term }; }
export function decodeSynthesisRequest(type, term) { if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-synthesis", "synthesis request must use the relational RMN type"); return encodeSynthesisRequest(decodeRelationalValue(type, term)).value; }

export function synthesizeRecursiveObservationCircuit(source) {
  const request = normalizeSynthesisRequest(source);
  const family = buildFabricationCircuitFamily(request), verified = verifyCircuitAssembly(family.assembly, family.circuit, family.components);
  const receipt = { kind: "RecursiveObservationCircuitSynthesisReceipt", profile: SYNTHESIS_PROFILE, provider: PROVIDER_ACCOUNT, circuit: family.circuit, components: family.components, assembly: family.assembly, circuitId: family.circuitId, assemblyId: family.assemblyId, observerAddresses: family.observerAddresses, behavior: family.behavior };
  const document = typed(receipt); return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}

export function decodeSynthesisReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("malformed-synthesis", "synthesis receipt must use the relational RMN type");
  const value = decodeRelationalValue(type, term), fields = ["assembly", "assemblyId", "behavior", "circuit", "circuitId", "components", "kind", "observerAddresses", "profile", "provider"];
  if (!exactKeys(value, fields) || value.kind !== "RecursiveObservationCircuitSynthesisReceipt" || value.profile !== SYNTHESIS_PROFILE || value.provider !== PROVIDER_ACCOUNT || !Array.isArray(value.components) || !Array.isArray(value.observerAddresses)) fail("malformed-synthesis", "synthesis receipt has an unknown, absent, legacy, or foreign-provider field");
  const circuit = normalizeHierarchicalCircuit(value.circuit), components = value.components.map(normalizeHierarchicalCircuit), assembly = normalizeCircuitAssembly(value.assembly), verified = verifyCircuitAssembly(assembly, circuit, components);
  if (hierarchicalCircuitId(circuit) !== ni(value.circuitId, "circuitId") || circuitAssemblyId(assembly) !== ni(value.assemblyId, "assemblyId") || verified.family.verified.get(value.circuitId)?.equivalent !== true) fail("synthesis-drift", "synthesis receipt identities or behavior do not describe its exact family and assembly");
  return { ...value, circuit, components, assembly };
}
