/**
 * language - the term language: notation, proof discipline, and address
 * grammar. This is part of the pure formal core.
 *
 * The serialized language is named canonical JSON. Positional variables remain
 * private evaluator structure and are never exported through this index.
 */

import { inferTy, checkTy, isClosed } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { evaluate, normalize } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { parseNamedSen } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/named-codec";

export const parse = parseNamedSen;

export function check(term, type) {
  return isClosed(term) && (type === undefined ? inferTy([], term) !== null : checkTy([], term, type));
}

export {
  evaluate,
  normalize,
};

export * from "./catalog.mjs";
export * from "./presentation.mjs";
export { nodeBeingLayerOfFilenameSuffix, nodeDeclarationReference, nodeSubjectAnchor, readNodeSubjectAnchor, nodeSubjectAnchorSource, nodeBeingPredicates, nodeBeingTaxon, readNodeBeingTaxon, nodeBeingTaxonConfidence, readNodeBeingTaxonomy, nodeBeingSpeciesFormula, nodeBeingFormalContext, readNodeBeingSpeciesConcept, readNodeBeingSpeciesConcepts, nodeBeingTaxonNames, nodeBeingLayerNames, nodeBeingLayerFilenameSuffixes, nodeSubjectJSDocTag, nodeSubjectAnchorSchema, nodeBeingPredicateEvidenceBasisNames, nodeBeingPredicateEvidenceSchema, nodeBeingEffectClosureSchema, nodeBeingSpeciesFormulaSchema, nodeBeingFormalContextSchema, nodeBeingSpeciesConceptSchema, nodeBeingReadoutTaxonNames, nodeBeingReadoutSchema, nodeBeingTaxa, nodeBeingTaxonomyIdentity } from "./jsnode/taxonomy.mjs";
export { projectNodeBeingDocumentation, nodeBeingDocumentationProjectionIsValid, nodeDeclarationKinds, nodeBeingDocumentationLossProfile } from "./jsnode/documentation.mjs";
