/**
 * Farstone as a parameterization of the FeltOS engine: nothing here lives in the engine core.
 * It composes capabilities that already exist — the shared clock and director, plus
 * `farstone-climate`, `farstone-arcs`, and `depths` — into one playable game definition.
 *
 * The dredging-permit and Hydrant-23 disputes (Farstone's standing off-season situation) are
 * seeded as static `assertions` rather than an imperative `onLoad` hook: `defineGame` is
 * deliberately data-only (functions are excluded by design), and this situation is fixed
 * content for a fixed cast, not a rule that must run against an arbitrary bible. Each seed fact
 * is included only when its subject is actually part of the supplied rooms/things — the same
 * "idempotent and content-tolerant" intent the original imperative seed had, applied at
 * definition time instead of at load time.
 */
import { composeCapabilities } from "./capabilities.mjs";
import { depthsCapability, DEPTHS_FUNCTIONAL } from "./depths.mjs";
import { directorCapability, DIRECTOR_FUNCTIONAL } from "./director.mjs";
import { farstoneArcsCapability } from "./farstone-arcs.mjs";
import { FARSTONE_CLIMATE_FUNCTIONAL, farstoneClimateCapability } from "./farstone-climate.mjs";
import { defineGame } from "./game.mjs";
import { worldClockCapability } from "./world-clock.mjs";

/** Every capability Farstone hands the engine, in the order their `onTick`s run. */
export const FARSTONE_CAPABILITIES = Object.freeze([
  worldClockCapability,
  directorCapability,
  farstoneClimateCapability,
  farstoneArcsCapability,
  depthsCapability,
]);

export const FARSTONE_CAPABILITY_IDS = Object.freeze(FARSTONE_CAPABILITIES.map((capability) => capability.id));

/** The composed runtime a Farstone-capable engine steps with. */
export const farstoneRuntime = composeCapabilities(FARSTONE_CAPABILITIES);

/** The single-valued cells Farstone's own seed facts settle. */
export const FARSTONE_FUNCTIONAL = Object.freeze(["decision-status", "belief:dredging-permit", "water-quality", "advisory"]);

/**
 * Define a Farstone-playable game over a bible's rooms/things: the standing off-season
 * situation is seeded once for whichever of its cast the bible actually contains.
 */
export function farstoneGame({ id, name, start, rooms, things = {}, assertions = [] }) {
  const present = new Set([...Object.keys(rooms), ...Object.keys(things)]);
  const seed = [
    { subject: "the-dredging-permit", predicate: "decision-status", object: "contested" },
    ...(present.has("coilin-vey") ? [{ subject: "coilin-vey", predicate: "belief:dredging-permit", object: "stable" }] : []),
    ...(present.has("brannaugh-ross") ? [{ subject: "brannaugh-ross", predicate: "belief:dredging-permit", object: "stable" }] : []),
    ...(present.has("hydrant-23") ? [
      { subject: "hydrant-23", predicate: "water-quality", object: "contested" },
      { subject: "hydrant-23", predicate: "advisory", object: "boil-water" },
    ] : []),
  ];
  return defineGame({
    id,
    name,
    start,
    rooms,
    things,
    capabilities: FARSTONE_CAPABILITY_IDS,
    functionalPredicates: [...FARSTONE_CLIMATE_FUNCTIONAL, ...DEPTHS_FUNCTIONAL, ...DIRECTOR_FUNCTIONAL, ...FARSTONE_FUNCTIONAL],
    assertions: [...seed, ...assertions],
  });
}
