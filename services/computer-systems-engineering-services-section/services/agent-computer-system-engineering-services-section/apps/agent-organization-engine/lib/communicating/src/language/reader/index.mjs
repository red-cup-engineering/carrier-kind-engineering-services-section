/** SEN admission and named syntax, with Metroplat's array/object tags and digest. */

import { admitArtifact } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import {
  canonicalNamedSen as serializeNamedSen,
  namedArray,
  namedObject,
  namedString as sharedNamedString,

} from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/named-codec";
import { parse as parseJson } from "@red-cup-engineering/json-services-section";

export { SEN_JSON, isRelationalTerm, parseSen, settleSen, extractRelationalScripts,
  htmlIsRelational, settleRelationalHtml, sessionIsRelational, settleRelationalSession
} from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/reader";
export { namedArray, namedBool, namedGenerator, namedObject, compileNamedSen,
  parseNamedSen } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/named-codec";

/**
 * Preserve Metroplat's Unicode scalar admission for opaque string marks,
 * then delegate to the shared package's own tagged string encoding — the
 * validation is Metroplat-specific (JCS/I-JSON domain admission), the
 * encoding shape is not, so only the validation stays local.
 */
export function namedString(value) {
  canonicalJson(value);
  return sharedNamedString(value);
}

/** Serialize shared named syntax within Metroplat's JCS/I-JSON domain. */
export function canonicalNamedSen(term) {
  return canonicalJson(parseJson(serializeNamedSen(term)));
}

/** Retain Metroplat artifact identity over the canonical named representation. */
export function digestNamedSen(term) {
  return admitArtifact(canonicalNamedSen(term)).ref;
}
