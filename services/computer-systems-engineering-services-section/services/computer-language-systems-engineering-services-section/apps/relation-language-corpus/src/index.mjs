/**
 * @emsenn/communicating-in-relation-conlang - a manifest-first conlang over
 * @emsenn/communicating.
 *
 * The language facts live in data/manifest.json. This package supplies only the
 * loader, compiled bundle, receipts, and runnable action surface.
 */
import {
  admitCommunication,
  articulateCommunication,
  parseCommunication,
  read as readOver,

} from "@red-cup-engineering/communicating";

import relationConlang from "./compiled.mjs";

export { actions } from "./actions.mjs";
export { relationConlang, default } from "./compiled.mjs";
export { manifest, receipts } from "./manifest.mjs";

export const read = (text) => readOver(text, relationConlang);

export const settle = (text) =>
  parseCommunication(admitCommunication(text), relationConlang);

export const articulate = (text) =>
  articulateCommunication(admitCommunication(text), relationConlang);
