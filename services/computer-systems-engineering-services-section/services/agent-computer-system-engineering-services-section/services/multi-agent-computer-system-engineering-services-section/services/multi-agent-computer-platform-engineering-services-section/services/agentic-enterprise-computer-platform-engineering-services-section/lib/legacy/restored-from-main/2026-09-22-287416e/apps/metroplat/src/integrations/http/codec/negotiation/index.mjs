
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

export { negotiateType } from "../../../../../../../../../../../../../../../../computer-networking-engineering-services-section/services/http-services-section/src/negotiation.mjs";
export { parseAccept } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/preferences.mjs";

export { negotiateEncoding } from "../../../../../../../../../../../../../../../../computer-networking-engineering-services-section/services/http-services-section/src/negotiation.mjs";
export { parseAcceptEncoding } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/preferences.mjs";
export { isCoding, isCompressionCoding, parseContentEncoding } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/content-coding.mjs";

export { negotiateLanguage } from "../../../../../../../../../../../../../../../../computer-networking-engineering-services-section/services/http-services-section/src/negotiation.mjs";
export { parseAcceptLanguage } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/preferences.mjs";

export { extensionType, isCompressible } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/media-type.mjs";
export { mediaTypeCorner } from "./media-type.mjs";

export { negotiateRepresentation, representationFits } from "./representation.mjs";
