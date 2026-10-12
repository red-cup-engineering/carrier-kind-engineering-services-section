/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/metroplat/core/language/reader/projecting` is the bridge between JSON values
 * and RMN terms.
 *
 * This module retains the established local import path but owns no second
 * JSON⇄term bridge runtime: it re-exports the canonical
 * `@red-cup-engineering/relation-model-notation/json-codec` package exactly,
 * so every stdlib term this bridge builds or decodes matches the same
 * bridge `evaluateRunTerm` (from `@red-cup-engineering/relation-model-notation/eval`)
 * uses elsewhere — one JSON tag vocabulary, one Boolean crossing, no
 * parallel "metroplat.term.*" carrier disagreeing with it. In particular,
 * JSON booleans are not FOUR charges and strings such as `"held"` remain
 * strings; `booleanResultTerm`/`booleanConditionTerm` are the explicit
 * crossing between a native RMN truth-axis condition and this bridge's
 * JSON Boolean carrier.
 */
export {
  arrayTag,
  objectTag,
  nullTag,
  booleanTag,
  stringTag,
  numberTag,
  listTerm,
  typedListTerm,
  typedListItems,
  listTy,
  termList,
  isValueTerm,
  arrayHeadTail,
  objectTerm,
  arrayTerm,
  stringTerm,
  booleanResultTerm,
  booleanConditionTerm,
  projectField,
  objectTy,
  arrayTy,
  jsonToTerm,
  encodeJsonTermCanonical,
  termToJson,
  scalarDescriptor,
  nullDescriptor,
  booleanDescriptor,
  numberDescriptor,
  stringDescriptor,
  listDescriptor,
  recordDescriptor,
  descriptorTy,
  encodeDescriptor,
  decodeDescriptor,

} from "@red-cup-engineering/relation-model-notation/json-codec";
