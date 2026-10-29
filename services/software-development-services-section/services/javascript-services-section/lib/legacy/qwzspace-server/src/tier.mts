/**
 * Render-tier negotiation and the per-tier reading of a scene entry.
 *
 * The server emits one `SceneEntry` per body. A tier is not a different
 * payload — it is how richly a client *reads* that entry. This module is the
 * reference reading for each tier (the visual agent's renderer is the real
 * one) and the negotiation that picks a client's tier. Fallback is therefore
 * lossless at the source: every client gets the same world; a weaker client
 * reads less of it.
 *
 *   webgl    — the full ℝ³ frame: position, facing, existence glyph.
 *   canvas2d — the ground plane: the (x, z) of position, existence glyph.
 *   text     — place and truth: kind, existence glyph, lattice site, depth —
 *              a MUD line, no floats needed.
 */

import { RENDER_TIERS, type RenderTier, type SceneEntry } from "./protocol.mjs";

const RANK: Record<RenderTier, number> = { webgl: 3, canvas2d: 2, text: 1 };

/** Pick the richest tier a client can drive. A client advertises the tiers it
 *  supports; absent or empty falls back to `text` — the universal floor. */
export const negotiate = (clientAccepts: readonly unknown[] | undefined): RenderTier => {
  if (!Array.isArray(clientAccepts)) return "text";
  const supported = clientAccepts.filter((t): t is RenderTier => (RENDER_TIERS as readonly unknown[]).includes(t));
  if (supported.length === 0) return "text";
  return supported.reduce((best, t) => (RANK[t] > RANK[best] ? t : best), supported[0]!);
};

export interface WebglReading {
  readonly tier: "webgl";
  readonly id: string;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly charge: SceneEntry["charge"];
}

export interface Canvas2dReading {
  readonly tier: "canvas2d";
  readonly id: string;
  readonly kind: string;
  readonly x: number;
  readonly z: number;
  readonly charge: SceneEntry["charge"];
}

export interface TextReading {
  readonly tier: "text";
  readonly id: string;
  readonly kind: string;
  readonly charge: SceneEntry["charge"];
  readonly site: SceneEntry["site"];
  readonly depth: number;
  /** A ready-to-print MUD line. */
  readonly line: string;
}

export type TierReading = WebglReading | Canvas2dReading | TextReading;

const GLYPH_WORD: Record<SceneEntry["charge"], string> = {
  "t": "here",
  "⊤": "here, and slain — risen",
  "f": "destroyed",
  "⊥": "unknown",
};

/** Read a scene entry at a tier — the reference projection each renderer mirrors. */
export const readAtTier = (entry: SceneEntry, tier: RenderTier): TierReading => {
  switch (tier) {
    case "webgl":
      return Object.freeze({ tier, id: entry.id, kind: entry.kind, x: entry.x, y: entry.y, z: entry.z, yaw: entry.yaw, charge: entry.charge });
    case "canvas2d":
      return Object.freeze({ tier, id: entry.id, kind: entry.kind, x: entry.x, z: entry.z, charge: entry.charge });
    case "text":
      return Object.freeze({
        tier, id: entry.id, kind: entry.kind, charge: entry.charge, site: entry.site, depth: entry.depth,
        line: `${entry.kind} ${entry.id} — ${GLYPH_WORD[entry.charge]} (depth ${entry.depth.toFixed(2)})`,
      });
  }
};
