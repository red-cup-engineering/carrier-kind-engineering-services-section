/**
 * @emsenn/language-algebra — the generative/compositional foundation of the
 * language chain.
 *
 * Three faces of the same algebraic layer:
 *  - charge: the four-valued bilattice word for grammatical judgments, aligned
 *    with meme-topology's ChargeValue, with lossless evidence accumulation.
 *  - fiber: the signature of a language — its generating lexicon, morphology,
 *    reference, attachment and segmentation data (the RawBundle/CompiledBundle).
 *  - morphology: the word-form generators that act over a fiber (conjugate,
 *    pluralize, indefiniteArticle, lemma).
 *
 * Everything here is upstream of topology: it is the algebra the settlement
 * engine is parameterized by.
 */
export * from "./charge.mjs";
export type {
  BundleMeta, BundleLexicon, SuffixRule, BundleMorphology,
  PronounFeatures, BundleReference, BundleAttachment, BundleSegmentation,
  RawBundle, CompiledBundle,
} from "./fiber.mjs";
export { conjugate, pluralize, indefiniteArticle, lemma } from "./morphology.mjs";
export { load } from "./compile.mjs";
