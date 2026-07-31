import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
function ascription(value) { const encoded = encodeRelationalValue(value); return ["ascribe", encoded.type, encoded.term]; }
function decode(term, kind) {
  if (!Array.isArray(term) || term.length !== 3 || term[0] !== "ascribe" || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new TypeError("write-capability assay requires one typed relational RMN ascription");
  const value = decodeRelationalValue(term[1], term[2]);
  if (value?.kind !== kind) throw new TypeError(`write-capability assay expected ${kind}`);
  return value;
}
export function encodeWriteCapabilityRequest(material) { const term = ascription({ kind: "org.emsenn.standing-write-capability-assay.request.v1", material }); return { term, id: semanticId(term) }; }
export function decodeWriteCapabilityRequest(term) { return decode(term, "org.emsenn.standing-write-capability-assay.request.v1"); }
export function encodeWriteCapabilityResponse({ request, disposition, observation = null, reason = null }) { const term = ascription({ kind: "org.emsenn.standing-write-capability-assay.response.v1", request, disposition, observation, reason }); return { term, id: semanticId(term) }; }
export function decodeWriteCapabilityResponse(term) { return decode(term, "org.emsenn.standing-write-capability-assay.response.v1"); }
