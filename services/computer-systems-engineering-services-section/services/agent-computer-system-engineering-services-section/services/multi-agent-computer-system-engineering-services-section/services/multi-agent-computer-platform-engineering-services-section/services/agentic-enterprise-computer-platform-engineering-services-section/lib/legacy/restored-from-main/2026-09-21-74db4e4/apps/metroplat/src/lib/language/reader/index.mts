/** RMN admission and named syntax, with Metroplat's array/object tags and digest. */
import type { Tm } from "../ast/index.mts";
import { canonicalBytes, digest } from "../../identity/index.mts";
import {
  canonicalNamedRmn as serializeNamedRmn,
  namedArray,
  namedObject,
  namedString as sharedNamedString,
  type NamedTm,
} from "@red-cup-engineering/relation-model-notation/named-codec";
import { parse as parseJson } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export { RMN_JSON, isRelationalTerm, parseRmn, settleRmn, extractRelationalScripts,
  htmlIsRelational, settleRelationalHtml, sessionIsRelational, settleRelationalSession
} from "@red-cup-engineering/relation-model-notation/reader";
export { type NamedTm, namedArray, namedBool, namedGenerator, namedObject, compileNamedRmn,
  parseNamedRmn } from "@red-cup-engineering/relation-model-notation/named-codec";

/**
 * Preserve Metroplat's Unicode scalar admission for opaque string marks,
 * then delegate to the shared package's own tagged string encoding — the
 * validation is Metroplat-specific (JCS/I-JSON domain admission), the
 * encoding shape is not, so only the validation stays local.
 */
export function namedString(value: string): NamedTm {
  canonicalBytes(value);
  return sharedNamedString(value);
}

/** Serialize shared named syntax within Metroplat's JCS/I-JSON domain. */
export function canonicalNamedRmn(term: Tm): string {
  return canonicalBytes(parseJson(serializeNamedRmn(term)));
}


/** Retain Metroplat artifact identity over the canonical named representation. */
export function digestNamedRmn(term: Tm): string {
  return digest(canonicalNamedRmn(term));
}
