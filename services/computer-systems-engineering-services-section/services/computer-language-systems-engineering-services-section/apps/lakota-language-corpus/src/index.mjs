/**
 * @emsenn/communicating-in-lakota — the Lakota fiber over @emsenn/communicating.
 *
 * The base package is language-neutral machinery whose every reading morphism is
 * parameterized over a `CompiledBundle`. This package is one such bundle made
 * concrete: it supplies the compiled Lakota vocabulary and binds the base reading
 * morphisms to it. The runnable `communicate` / `communicate-serve` bins project
 * this package's actions.
 */
import { read as readOver } from "@red-cup-engineering/eavt-services-section/verbs";
import { articulateCommunication, admitCommunication } from "@red-cup-engineering/communicating";

import lakota from "./compiled.mjs";

export { lakota, default } from "./compiled.mjs";
export { rawBundle } from "./bundle.mjs";
export { manifest, receipts } from "./manifest.mjs";
export {
  corpus,
  generateLakotaForm,
  readLakotaCorpusAction,
  generateLakotaFormAction,

} from "./corpus.mjs";
export {
  analyzeLakotaParticles,
  analyzeLakotaParticlesAction,
  lakotaParticleRules,

} from "./particles.mjs";
export {
  analyzeLakotaFrames,
  analyzeLakotaFramesAction,
  lakotaFrameRules,

} from "./frames.mjs";
export {
  lakotaOrthographyRules,
  normalizeLakotaOrthography,
  normalizeLakotaOrthographyAction,

} from "./orthography.mjs";
export {
  generateLakotaParadigmAction,
  generateLakotaParadigms,

} from "./paradigms.mjs";
export {
  lakotaResearchObligations,
  readLakotaResearchObligations,
  readLakotaResearchObligationsAction,

} from "./obligations.mjs";
export {
  lakotaMaturityData,
  readLakotaMaturity,
  readLakotaMaturityAction,

} from "./maturity.mjs";

/** Read a sentence at every layer at once, over the Lakota bundle. */
export const read = (text) => readOver(text, lakota);

/** Settle a sentence through the engine, over the Lakota bundle. */
export const settle = (text) => readOver(text, lakota).parse;

/** Articulate admitted Lakota text into its articulation carrier. */
export const articulate = (text) =>
  articulateCommunication(admitCommunication(text), lakota);

export { actions } from "./actions.mjs";
