import { decodeSemantic, semanticBytes, semanticId as identifySemanticTerm } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { immutable, semanticId, semanticTerm } from "./canonical.mjs";

/** Present a TRC receipt at the same RMN coordinate that identifies its body. */
export function receiptRmn(receipt) {
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) throw new TypeError("receipt must be an object");
  const { id, ...body } = receipt;
  if (semanticId(body) !== id) throw new TypeError("receipt id does not identify its canonical RMN body");
  const term = semanticTerm(body);
  return Object.freeze({
    mediaType: "application/rmn+json",
    term,
    semanticId: id,
    bytes: semanticBytes(term),
  });
}

export function decodeReceiptRmn(bytes) {
  const term = decodeSemantic(bytes);
  if (!Array.isArray(term) || term.length !== 3 || term[0] !== "ascribe") throw new TypeError("expected one ascribed RMN relational value");
  const body = decodeRelationalValue(term[1], term[2]);
  const id = identifySemanticTerm(term);
  if (semanticId(body) !== id) throw new TypeError("decoded receipt does not retain its RMN identity");
  return immutable({ ...body, id });
}
