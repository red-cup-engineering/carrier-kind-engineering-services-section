import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/relational-value-graph-service";
import { EMPTY_WITNESS_ROOT, identifyNormalizedSemanticContent } from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";

const REQUEST = "org.emsenn.settlement-trace-chain.status-request.v1";
const RESPONSE = "org.emsenn.settlement-trace-chain.status.v1";
function ascribe(value) { const encoded = encodeRelationalValue(value); return ["ascribe", encoded.type, encoded.term]; }
function identify(term, objectKind) {
  return identifyNormalizedSemanticContent({ objectKind, semanticType: inferTy([], term), term, witnessRoot: EMPTY_WITNESS_ROOT });
}
function decode(term, kind) {
  if (term?.[0] !== "ascribe" || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new TypeError("trace-chain status requires typed relational RMN");
  const value = decodeRelationalValue(term[1], term[2]);
  if (value?.kind !== kind) throw new TypeError(`trace-chain status expected ${kind}`);
  return value;
}
export function encodeStatusRequest() { const term = ascribe({kind: REQUEST, chain: "eip155:5615610"}); const content = identify(term, "settlement-trace-chain.status-request"); return {term: content.envelope.settledBody, id: content.token, bytes: content.bytes}; }
export function decodeStatusRequest(term) { const value = decode(term, REQUEST); if (value.chain !== "eip155:5615610") throw new TypeError("status request addresses another chain"); return value; }
export function encodeStatusResponse({request, status}) { const term = ascribe({...status, kind: RESPONSE, request}); const content = identify(term, "settlement-trace-chain.status-response"); return {term: content.envelope.settledBody, id: content.token, bytes: content.bytes}; }
export function decodeStatusResponse(term) { return decode(term, RESPONSE); }
