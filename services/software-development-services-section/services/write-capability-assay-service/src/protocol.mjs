import { EMPTY_WITNESS_ROOT, admitNormalizedSemanticContent, identifyNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
function identify(value, objectKind) { const term = jsonToTerm(value), semanticType = inferTy([], term); if (semanticType === null) throw new TypeError(`${objectKind} did not derive an RMN type`); return identifyNormalizedSemanticContent({ objectKind, semanticType, term, witnessRoot: EMPTY_WITNESS_ROOT }); }
function decode(bytes, kind, objectKind) {
  const admitted = admitNormalizedSemanticContent(bytes);
  if (admitted.envelope.objectKind !== objectKind) throw new TypeError(`write-capability assay expected ${objectKind}`);
  const value = termToJson(admitted.envelope.settledBody);
  if (value?.kind !== kind) throw new TypeError(`write-capability assay expected ${kind}`);
  return { value, identity: admitted };
}
export function encodeWriteCapabilityRequest(material) { return identify({ kind: "org.emsenn.standing-write-capability-assay.request.v1", material }, "standing-write-capability-assay.request"); }
export function decodeWriteCapabilityRequest(bytes) { return decode(bytes, "org.emsenn.standing-write-capability-assay.request.v1", "standing-write-capability-assay.request"); }
export function encodeWriteCapabilityResponse({ request, disposition, observation = null, reason = null }) { return identify({ kind: "org.emsenn.standing-write-capability-assay.response.v1", request, disposition, observation, reason }, "standing-write-capability-assay.response"); }
export function decodeWriteCapabilityResponse(bytes) { return decode(bytes, "org.emsenn.standing-write-capability-assay.response.v1", "standing-write-capability-assay.response"); }
