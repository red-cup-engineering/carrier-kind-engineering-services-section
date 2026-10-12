/**
 * @emsenn/communicating-in-tokipona — the Tokipona fiber over @emsenn/communicating.
 *
 * The base package is language-neutral machinery whose every reading morphism is
 * parameterized over a `CompiledBundle`. This package is one such bundle made
 * concrete: it supplies the compiled Tokipona vocabulary and binds the base reading
 * morphisms to it. The runnable `communicate` / `communicate-serve` bins project
 * this package's actions.
 */
import { read as readOver } from "@red-cup-engineering/eavt-services-section/verbs";
import { articulateCommunication, admitCommunication, settle as settleOver } from "@red-cup-engineering/communicating";

import tokipona from "./compiled.mjs";

export { tokipona, default } from "./compiled.mjs";
export { rawBundle } from "./bundle.mjs";
export { manifest, receipts } from "./manifest.mjs";

/** Read a sentence at every layer at once, over the Tokipona bundle. */
export const read = (text) => readOver(text, tokipona);

/** Settle a sentence through the engine, over the Tokipona bundle. */
export const settle = (text) => settleOver(text, tokipona);

/** Articulate admitted Tokipona text into its articulation carrier. */
export const articulate = (text) =>
  articulateCommunication(admitCommunication(text), tokipona);

export { actions } from "./actions.mjs";
