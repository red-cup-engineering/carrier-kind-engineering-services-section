
/**
 * Content negotiation as representation selection.
 *
 * `Accept`, `Accept-Encoding`, and `Accept-Language` header values decode into
 * ranked preferences. The negotiate functions then choose from the caller's
 * offered representations. The offered list is deliberately authoritative:
 * this package can rank and compare representation names, but it does not know
 * which codecs, files, locales, or platform capabilities a server actually has.
 *
 * `negotiateRepresentation` adds the bilattice asymmetry: it first drops any
 * offered representation whose content corner exceeds the settled value's, so
 * negotiation may settle a value down but never fabricate a richer form.
 *
 * @packageDocumentation
 */

export { negotiateType, parseAccept } from "./accept.mts";
export type { AcceptEntry } from "./accept.mts";

export { isCoding, isCompressionCoding, negotiateEncoding, parseAcceptEncoding, parseContentEncoding } from "./accept-encoding.mts";
export type { Coding } from "./accept-encoding.mts";

export { negotiateLanguage, parseAcceptLanguage } from "./accept-language.mts";
export type { AcceptLanguageEntry } from "./accept-language.mts";

export { extensionType, isCompressible, mediaTypeCorner } from "./media-type.mts";

export { negotiateRepresentation, representationFits } from "./representation.mts";
