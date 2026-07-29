/**
 * The wire contract — the one boundary between this engine and a client.
 *
 * This is what the visual/UX agent codes against. It carries plain numbers
 * (float render positions, the boundary read of the exact cut) and bilattice
 * glyphs (the world-truth of each body's existence) — never meshes, never
 * matrices, never the exact field. A renderer turns a `SceneEntry` into
 * whatever its tier can draw; the server never knows or cares which.
 *
 * Render tiers are not different data — they are coarser *readings* of the one
 * scene section the server emits. A `webgl` client reads the full ℝ³ frame; a
 * `canvas2d` client reads the ground plane; a `text` client reads only kind,
 * existence glyph, and lattice adjacency. Every client receives the same
 * `SceneEntry`; the tier governs what it does with it. So fallback is lossless
 * at the source: a weaker client is not sent a degraded world, it reads the
 * same world less richly.
 */

import type { DeathRule } from "./existence.mjs";

/** The progressive render tiers, richest first. A client advertises the tiers
 *  it can drive; the server picks the richest shared one. */
export type RenderTier = "webgl" | "canvas2d" | "text";

export const RENDER_TIERS: readonly RenderTier[] = Object.freeze(["webgl", "canvas2d", "text"]);

export const isRenderTier = (value: unknown): value is RenderTier =>
  typeof value === "string" && (RENDER_TIERS as readonly string[]).includes(value);

/** The bilattice glyph of a body's existence, as it rides the wire. */
export type ExistenceGlyph = "⊥" | "t" | "f" | "⊤";

/**
 * One body's renderable projection of the settled scene — a web-qwzspace
 * `SnapshotEntry` (a JSON record with a string `id`). Every field is a boundary
 * read; the exact site is carried so a text/exact client can reason about
 * adjacency without floats.
 */
export type SceneEntry = Record<string, unknown> & {
  readonly id: string;
  /** What the body is — the renderer's model/mesh key. */
  readonly kind: string;
  /** Float render position (normalized icosahedral ℝ³). */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Facing, absolute radians. */
  readonly yaw: number;
  /** Existence as a bilattice glyph — world-truth the client may show. */
  readonly charge: ExistenceGlyph;
  /** The exact lattice site (six integers) the body occupies — the text tier's
   *  handle on place and adjacency; exactness preserved across the wire. */
  readonly site: readonly [number, number, number, number, number, number];
  /** Distance of the place from the window centre — a natural depth/danger
   *  grade, the internal-space radius. */
  readonly depth: number;
};

// ---------- client → server intents ----------

export type Intent =
  | SpawnIntent
  | MoveIntent
  | FaceIntent
  | StrikeIntent
  | ReviveIntent;

/** Admit a body into the world (positive `alive` evidence). */
export interface SpawnIntent {
  readonly k: "spawn";
  readonly id: string;
  readonly bodyKind: string;
  readonly deathRule?: DeathRule;
  /** Optional starting site (six integers); defaults to the origin place. */
  readonly site?: readonly [number, number, number, number, number, number];
}

/** Step a body by a lattice delta (six integers). The move only takes if it
 *  lands on a realized place — movement is constrained to the quasicrystal. */
export interface MoveIntent {
  readonly k: "move";
  readonly id: string;
  readonly step: readonly [number, number, number, number, number, number];
}

/** Turn a body to face an absolute yaw. */
export interface FaceIntent {
  readonly k: "face";
  readonly id: string;
  readonly yaw: number;
}

/** Land a killing blow: negative `slain` evidence on the target. What the
 *  target's existence settles to is read from its death-rule. */
export interface StrikeIntent {
  readonly k: "strike";
  readonly by: string;
  readonly target: string;
}

/** Add positive `alive` evidence (heal / resurrect). Against a body slain to a
 *  held contradiction (⊤), this is how it returns. */
export interface ReviveIntent {
  readonly k: "revive";
  readonly id: string;
}

export const isIntentLike = (value: unknown): value is { readonly k: string } =>
  typeof value === "object" && value !== null && typeof (value as { k?: unknown }).k === "string";

// ---------- server → client framing helpers (thin; transport carries them) ----------

/** Sent once on connect, before snapshots: the negotiated tier and the world's
 *  acceptance-window half-extent so a client can size its view. */
export interface Hello {
  readonly k: "hello";
  readonly tier: RenderTier;
  readonly tick: number;
  readonly worldRadius: number;
}

export const hello = (tier: RenderTier, tick: number, worldRadius: number): Hello =>
  Object.freeze({ k: "hello" as const, tier, tick, worldRadius });
