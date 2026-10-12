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

export { compileBundle } from "./bundle.mjs";

export { englishBundle } from "./lexicon.mjs";

export { articulate, span, tokenize } from "./segments.mjs";
export { tag, claimPolarity } from "./tagging.mjs";
export { falseClosureClaim, FALSE_CLOSURE_WARNING, classifyCorrectionCue } from "./pragmatics.mjs";
export { relate } from "./dependency.mjs";
export { construe, wordsInSentence } from "./construing.mjs";
export { fold } from "@red-cup-engineering/communicating/speaking/listening/parsing";
export { parse } from "./parsing.mjs";
export { parseForest, parseForestFromArticulation } from "./forest.mjs";

export {
  lambekProofOfForest,
} from "./lambek.mjs";

