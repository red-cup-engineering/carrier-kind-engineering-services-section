/**
 * Latin actions — the communicating cocone read over the Latin fiber.
 *
 * `actions(latin)` from the base supplies communicating's meme-endomorphism
 * operation surface; `codecActions(latin)` supplies the text↔meme decode codec
 * (decode/articulate/settle) over the Latin bundle — the only place raw text is
 * admitted. Latin has no realized prose surface, so it adds no further operations.
 */
import { actions as baseActions, codecActions, manifestActions } from "@red-cup-engineering/communicating";

import latin from "./compiled.mjs";
import { manifest } from "./manifest.mjs";

/** The Latin package's action surface: meme operations + the Latin decode codec. */
export const actions = Object.freeze([
  ...baseActions(latin),
  ...codecActions(latin),
  ...manifestActions(manifest),
]);
