import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";

const REQUEST = "org.emsenn.settlement-trace-chain.status-request.v1";
const RESPONSE = "org.emsenn.settlement-trace-chain.status.v1";
function ascribe(value) { const encoded = encodeRelationalValue(value); return ["ascribe", encoded.type, encoded.term]; }
function decode(term, kind) {
  if (term?.[0] !== "ascribe" || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new TypeError("trace-chain status requires typed relational RMN");
  const value = decodeRelationalValue(term[1], term[2]);
  if (value?.kind !== kind) throw new TypeError(`trace-chain status expected ${kind}`);
  return value;
}
export function encodeStatusRequest() { const term = ascribe({kind: REQUEST, chain: "eip155:5615610"}); return {term, id: semanticId(term)}; }
export function decodeStatusRequest(term) { const value = decode(term, REQUEST); if (value.chain !== "eip155:5615610") throw new TypeError("status request addresses another chain"); return value; }
export function encodeStatusResponse({request, status}) { const term = ascribe({...status, kind: RESPONSE, request}); return {term, id: semanticId(term)}; }
export function decodeStatusResponse(term) { return decode(term, RESPONSE); }
