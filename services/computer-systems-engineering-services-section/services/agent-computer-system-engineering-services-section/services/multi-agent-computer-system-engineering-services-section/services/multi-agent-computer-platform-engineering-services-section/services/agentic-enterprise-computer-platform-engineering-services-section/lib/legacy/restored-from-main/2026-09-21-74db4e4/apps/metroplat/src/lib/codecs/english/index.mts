/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/metroplat/codecs/english` — an English text codec: plain
 * English prose decoded into metroplat's own parser structures.
 *
 * Text is segmented into a tiered span hierarchy, words are tagged and related
 * by dependency rules, and every accepted arc becomes a real predication `Cell`
 * (`core/calculus/predicating`). A `ParseForest` reading's gluing is read by
 * metroplat's own arc-graph cohomology (`core/cohomology`'s `cohomologyOfCells`:
 * H⁰ = connected components via union-find, H¹ = cycle rank via the incidence
 * matrix) — a word attached to two competing heads closes a cycle, so genuine
 * structural ambiguity (e.g. PP-attachment) shows up as H¹ > 0 directly, with no
 * bespoke conflict bookkeeping. `lambekProofOfForest` reads each reading as a
 * Lambek sequent evidenced by metroplat's own finite Lambek algebra law witness
 * (`core/closure/analysis/lambek-calculus`). The public schemas
 * (`ParseForest`/`SentenceParse`/`LambekForestProof`/
 * `LambekParseProof`) are schema-backed at
 * `src/core/codecs/english/schema.mts` and asserted at construction, the same
 * convention every other text codec in this package follows.
 *
 * Re-earned from `lib/emsenn/lib/triage`'s `communicating` faculty parser: the
 * same tiered-span/tag/dependency/forest pipeline, but the settling layer is
 * rebuilt on metroplat's own predication/cohomology machinery instead of a
 * hand-rolled fixed-point loop and conflict counter, with the cross-linguistic
 * register-fiber/translation-factor apparatus descoped (English-only; that scope
 * served the quarry's own translation ambition, not jural-position extraction).
 */
export type { RawBundle, CompiledBundle, BundleLexicon, BundleMorphology, BundleReference, BundleAttachment, BundleSegmentation, PronounFeatures, RoleRelation, RoleStrategy, SuffixRule } from "./bundle.mts";
export { compileBundle } from "./bundle.mts";

export { englishBundle } from "./lexicon.mts";

export type { Tier, Span, ContainmentEdge, SequenceEdge, ArticulateResult, Word, Arc, Proposal, ConstrainedResult, Agreement, ParsedWord, ParsedArc, FoldPath, FoldTower, ParseResult, SentenceParse, ParseForest } from "./types.mts";

export { articulate, span, tokenize } from "./segments.mts";
export { tag, claimPolarity, type ClaimPolarityClassification } from "./tagging.mts";
export { falseClosureClaim, FALSE_CLOSURE_WARNING, classifyCorrectionCue, type FalseClosureClaimDetection, type CorrectionCueClassification } from "./pragmatics.mts";
export { relate } from "./dependency.mts";
export { construe, wordsInSentence } from "./construing.mts";
export { fold } from "./folding.mts";
export { parse } from "./parsing.mts";
export { parseForest, parseForestFromArticulation } from "./forest.mts";

export {
  lambekProofOfForest,
} from "./lambek.mts";
export type {
  LambekForestProof,
  LambekParseProof,
  LambekHypothesis,
  LambekProofRule,
  LambekProofStep,
  LambekSequent,
} from "./lambek.mts";
