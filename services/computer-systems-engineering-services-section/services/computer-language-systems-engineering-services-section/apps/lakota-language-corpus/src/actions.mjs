/**
 * Lakota actions — the communicating cocone read over the Lakota fiber.
 *
 * `actions(lakota)` from the base supplies communicating's meme-endomorphism
 * operation surface; `codecActions(lakota)` supplies the text↔meme decode codec
 * (decode/articulate/settle) over the Lakota bundle — the only place raw text is
 * admitted. Lakota has no realized prose surface, so it adds no further operations.
 */
import { actions as baseActions, codecActions, manifestActions } from "@red-cup-engineering/communicating";

import lakota from "./compiled.mjs";
import { generateLakotaFormAction, readLakotaCorpusAction } from "./corpus.mjs";
import { analyzeLakotaFramesAction } from "./frames.mjs";
import { manifest } from "./manifest.mjs";
import { readLakotaMaturityAction } from "./maturity.mjs";
import { readLakotaResearchObligationsAction } from "./obligations.mjs";
import { normalizeLakotaOrthographyAction } from "./orthography.mjs";
import { generateLakotaParadigmAction } from "./paradigms.mjs";
import { analyzeLakotaParticlesAction } from "./particles.mjs";

/** The Lakota package's action surface: meme operations + the Lakota decode codec. */
export const actions = Object.freeze([
  ...baseActions(lakota),
  ...codecActions(lakota),
  ...manifestActions(manifest),
  readLakotaCorpusAction,
  generateLakotaFormAction,
  analyzeLakotaParticlesAction,
  analyzeLakotaFramesAction,
  normalizeLakotaOrthographyAction,
  generateLakotaParadigmAction,
  readLakotaResearchObligationsAction,
  readLakotaMaturityAction,
]);
