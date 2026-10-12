/**
 * becoming — stage 1 of the descent (the animate seed) and the whole descent it
 * roots. The descent engine (`descend`) and its four stage readings nest from
 * here, generated each within the one before.
 */
export { animate } from "./animate.mjs";
export { admitSeed, descend, utteranceLabel } from "./descending.mjs";

export * from "./prehending/index.mjs";
export * from "./doing/index.mjs";
