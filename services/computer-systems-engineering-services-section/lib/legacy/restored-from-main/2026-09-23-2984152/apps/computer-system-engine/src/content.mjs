import { encodeCanonical } from "./identity/cbor-codec.mjs";
import { canonicalCborToNiUri } from "./identity/cbor-ni.mjs";
/** RFC 6920 identity over the existing canonical CBOR representation. */
export const identifyContent = (value) => canonicalCborToNiUri(encodeCanonical(value));
