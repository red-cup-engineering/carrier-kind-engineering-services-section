/**
 * Tokipona actions — the communicating cocone read over the Tokipona fiber.
 *
 * `actions(tokipona)` from the base supplies communicating's meme-endomorphism
 * operation surface; `codecActions(tokipona)` supplies the text↔meme decode codec
 * (decode/articulate/settle) over the Tokipona bundle — the only place raw text is
 * admitted. Tokipona has no realized prose surface, so it adds no further operations.
 */
import { actions as baseActions, codecActions, manifestActions } from "@red-cup-engineering/communicating";

import tokipona from "./compiled.mjs";
import { manifest } from "./manifest.mjs";

/** The Tokipona package's action surface: meme operations + the Tokipona decode codec. */
export const actions = Object.freeze([
  ...baseActions(tokipona),
  ...codecActions(tokipona),
  ...manifestActions(manifest),
]);
