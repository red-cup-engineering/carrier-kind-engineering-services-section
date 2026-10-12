/**
 * signgraph/carrier-refinement - a circuit carrier refinement receipt: the
 * provider's proof that a component's carrier refines its behavior over one
 * observed material root, as a relational-value graph.
 */
import { NI_URI_PATTERN as NI } from "@red-cup-engineering/uri-services-section/ni-uri";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "./relational-value.mjs";

export const CARRIER_REFINEMENT_PROFILE = "org.emsenn.infomaterial.carrier-refinement.v1";
const CAIP10 = /^eip155:[1-9][0-9]*:0x[0-9a-f]{40}$/u;

function fail(message) { const error = new Error(message); error.code = "malformed-refinement"; throw error; }
function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function ni(value, field) { if (typeof value !== "string" || !NI.test(value)) fail(`${field} must be a SHA-256 ni URI`); return value; }
function caip10(value, field) { if (typeof value !== "string" || !CAIP10.test(value)) fail(`${field} must be a chain-qualified EVM account`); return value; }

export function normalizeCarrierRefinementReceipt(source) {
  const fields = ["behavior", "carrier", "component", "customerMaterialMutated", "equivalent", "kind", "materialRoot", "observation", "producer", "profile", "proof", "proofProfile", "provider"];
  if (!exactKeys(source, fields) || source.kind !== "CircuitCarrierRefinementReceipt" || source.profile !== CARRIER_REFINEMENT_PROFILE || source.equivalent !== true || source.customerMaterialMutated !== false || typeof source.proofProfile !== "string" || source.proofProfile.length === 0 || source.proofProfile.length > 256) fail("carrier refinement receipt has an unknown, absent, legacy, or failed field");
  const provider = caip10(source.provider, "provider"), producer = caip10(source.producer, "producer");
  return { kind: source.kind, profile: source.profile, proofProfile: source.proofProfile.normalize("NFC"), provider, producer, component: ni(source.component, "component"), behavior: ni(source.behavior, "behavior"), carrier: ni(source.carrier, "carrier"), materialRoot: ni(source.materialRoot, "materialRoot"), observation: ni(source.observation, "observation"), proof: ni(source.proof, "proof"), equivalent: true, customerMaterialMutated: false };
}

export function encodeCarrierRefinementReceipt(source) {
  const value = normalizeCarrierRefinementReceipt(source), encoded = encodeRelationalValue(value);
  return { value, type: encoded.type, term: encoded.term };
}

export function decodeCarrierRefinementReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("carrier refinement receipt must use the relational SEN type");
  return normalizeCarrierRefinementReceipt(decodeRelationalValue(type, term));
}
