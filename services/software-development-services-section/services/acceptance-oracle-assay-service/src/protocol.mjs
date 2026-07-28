import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { assayAcceptanceOracle } from "./assay.mjs";
export const PROFILE = "org.emsenn.software.acceptance-oracle-assay.v2";
export const PROVIDER_ACCOUNT = "eip155:31337:0x35715b8765d0ae4a623b9ac7eb7edea6e5e77450";
function exact(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function typed(value) { const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term]; return { bytes: semanticBytes(term), id: semanticId(term) }; }
export function normalizeRequest(value) {
  if (!exact(value, ["kind", "manifest", "oracle"]) || value.kind !== "AcceptanceOracleAssayRequest") throw new Error("oracle assay request has an unknown, absent, or legacy field");
  if (!value.manifest || !value.oracle || !Array.isArray(value.manifest.testVectors) || !Array.isArray(value.manifest.sourceEvidence) || !Array.isArray(value.oracle.artifacts) || !value.oracle.redWitness) throw new Error("oracle assay request is incomplete");
  return value;
}
export function encodeRequest(value) { const normalized = normalizeRequest(value), encoded = encodeRelationalValue(normalized); return { value: normalized, type: encoded.type, term: encoded.term }; }
export function decodeRequest(type, term) { if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("oracle assay request must use relational RMN"); return normalizeRequest(decodeRelationalValue(type, term)); }
export async function performAssay(value) { const request = normalizeRequest(value), subject = typed(request).id, assay = assayAcceptanceOracle(request); const receipt = { kind: "AcceptanceOracleAssayReceipt", profile: PROFILE, provider: PROVIDER_ACCOUNT, subject, assay }; const document = typed(receipt); return { receipt, semanticId: document.id, canonicalBytes: document.bytes }; }
export function decodeReceipt(type, term) { if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("oracle assay receipt must use relational RMN"); const value = decodeRelationalValue(type, term); if (!exact(value, ["assay", "kind", "profile", "provider", "subject"]) || value.kind !== "AcceptanceOracleAssayReceipt" || value.profile !== PROFILE || value.provider !== PROVIDER_ACCOUNT || typeof value.assay?.accepted !== "boolean") throw new Error("oracle assay receipt is malformed or foreign"); return value; }
