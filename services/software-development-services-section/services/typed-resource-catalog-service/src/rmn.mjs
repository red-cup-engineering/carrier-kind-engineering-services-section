import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import { immutable, semanticId } from "./canonical.mjs";

const RESOURCE_KIND = "typed-resource-catalog.resource";

/** Present a TRC receipt at the same RMN coordinate that identifies its body. */
export function receiptRmn(receipt) {
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) throw new TypeError("receipt must be an object");
  const { id, ...body } = receipt;
  if (semanticId(body) !== id) throw new TypeError("receipt id does not identify its canonical RMN body");
  const identified = identifyJsonSemanticContent({ objectKind: RESOURCE_KIND, value: body, witnessRoot: EMPTY_WITNESS_ROOT });
  return Object.freeze({
    mediaType: identified.mediaType,
    term: identified.envelope.settledBody,
    semanticId: id,
    bytes: identified.bytes,
  });
}

export function decodeReceiptRmn(bytes) {
  const identified = admitJsonSemanticContent({ bytes, objectKind: RESOURCE_KIND });
  return immutable({ ...identified.value, id: identified.token });
}
