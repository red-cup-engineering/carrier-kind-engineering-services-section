import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/semantic-content-identity";

/**
 * The one well-known objectKind a contracted executor uses to carry a JSON
 * RMN term as content-addressed bytes inside an A2A RMN part.
 * @type {string}
 */
export const SEN_TERM_OBJECT_KIND = "rsc-quiescent.a2a-json";

/**
 * Encodes a JSON RMN term (e.g. a `[operation, payload]` tuple) as the
 * content-addressed bytes a contracted executor carries in an A2A RMN part.
 * @param {unknown} term
 * @returns {Buffer}
 */
export function encodeSenTerm(term) {
  return identifyJsonSemanticContent({ objectKind: SEN_TERM_OBJECT_KIND, value: term, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
}

/**
 * Decodes bytes produced by {@link encodeSenTerm} back to their JSON RMN
 * term. `admitJsonSemanticContent` itself refuses bytes that do not
 * reproduce their own canonical commitment, so no separate round-trip
 * check is needed here.
 * @param {Buffer|Uint8Array} bytes
 * @returns {unknown}
 * @throws {TypeError} when `bytes` are not the exact RMN-term encoding of some JSON value
 */
export function decodeSenTerm(bytes) {
  return admitJsonSemanticContent({ bytes, objectKind: SEN_TERM_OBJECT_KIND }).value;
}
