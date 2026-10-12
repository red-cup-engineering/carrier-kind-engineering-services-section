/**
 * @red-cup-engineering/communicating/speaking/listening/algebra — the generative/compositional foundation of the
 * language chain.
 *
 * Three faces of the same algebraic layer:
 *  - charge readings: communicating-specific status and Lambek residuation over
 *    @red-cup-engineering/relating ChargeCarrier values; the bilattice carrier itself is
 *    owned upstream by relating.
 *  - fiber: the signature of a language — its generating lexicon, morphology,
 *    reference, attachment and segmentation data (the RawBundle/CompiledBundle).
 *  - morphology: the word-form generators that act over a fiber (conjugate,
 *    pluralize, indefiniteArticle, lemma).
 *
 * Everything here is upstream of communicating parsing, but downstream of
 * relating's Mark/Utterance and charge carriers.
 */
export { chargeStatus, fuse, implies } from "./charge.mjs";

export {
  languageRegisterFiber,
  languageRegisterFiberCarrier,
  languageRegisterFiberSchema,
  registerFiberAxes,
  registerFiberDataSchema,
  registerFiberDegradationReceipt,
} from "./register-fiber.mjs";

export {
  grammarProfileFromLegacyBundle,
  languageGrammarProfileCarrier,
  languageGrammarProfileSchema,
  morphotacticPatternRuleCarrier,
  morphotacticPatternRuleSchema,
} from "./profile.mjs";

export {
  bundleFromLanguageManifest,
  chuManifestReceipt,
  compiledBundleFromLanguageManifest,
  discourseCoverManifestReceipt,
  lambekManifestReceipt,
  languageManifestCarrier,
  languageManifestReceipts,
  languageManifestWitnessJournalRows,
  languageManifestSchema,
  loadLanguageManifest,
  loadLanguageManifestFile,
  soficManifestReceipt,
} from "./manifest.mjs";
export { translationFactorChainReceipt, translationFactorReceipt } from "./translation.mjs";

export { conjugate, pluralize, indefiniteArticle, lemma } from "./morphology.mjs";
export { load } from "./compile.mjs";
