// Type declarations for @lenticule-science/metrologic/chu/four — the Belnap naming of the
// charge bilattice. The Chu space itself belongs to
// @lenticule-science/articulating/predicating/positing/logic/linear-logic-chu.

/** The four Belnap–Ginsberg bilattice values, by name. Compare with `===`. */
export type Four = "t" | "f" | "bot" | "top";

import type { ChargeValue } from "@lenticule-science/articulating/predicating/positing/bilattice-charge";

export const FOUR: { readonly T: "t"; readonly F: "f"; readonly BOT: "bot"; readonly TOP: "top" };
export const GLYPH: { readonly t: string; readonly f: string; readonly bot: string; readonly top: string };
export function isFour(v: unknown): v is Four;
export function asFour(v: unknown): Four;
export function toCharge(v: Four): ChargeValue;
export function fromCharge(value: ChargeValue): Four;
export function negate(v: Four): Four;
export function conflate(v: Four): Four;
export function knowledgeJoin(a: Four, b: Four): Four;
export function knowledgeMeet(a: Four, b: Four): Four;
export function truthJoin(a: Four, b: Four): Four;
export function truthMeet(a: Four, b: Four): Four;
