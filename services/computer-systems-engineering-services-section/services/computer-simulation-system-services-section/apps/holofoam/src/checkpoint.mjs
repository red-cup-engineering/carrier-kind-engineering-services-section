/** A checkpoint is a cut of the experiment's SignCraft history; the world it names is derived by replay. */
import { checkpointHistory } from "@red-cup-engineering/signcraft/history";
import { describeHistory, experimentFromLegacy, rememberDerived, replay, snapshot } from "./simulation.mjs";
import { LEGACY_CHECKPOINT_KIND, MAX_CHECKPOINT_TICK } from "./legacy-state.mjs";

export { MAX_CHECKPOINT_TICK };
export const CHECKPOINT_KIND = "holofoam.checkpoint/v2";
export { LEGACY_CHECKPOINT_KIND };

export function checkpoint(world) {
  rememberDerived(world);
  const cut = checkpointHistory(snapshot(world));
  return Object.freeze({ kind: CHECKPOINT_KIND, provenance: "history", tick: world.tick, paused: world.paused, history: cut });
}

/** The world a checkpoint derives. A v1 explicit current-state checkpoint is imported as the origin of a history. */
export function restoreCheckpoint(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("checkpoint must be an object");
  if (value.kind === LEGACY_CHECKPOINT_KIND) {
    const world = experimentFromLegacy(value);
    world.paused = value.world.paused;
    return world;
  }
  if (value.kind !== CHECKPOINT_KIND || value.provenance !== "history" || typeof value.paused !== "boolean") throw new TypeError("checkpoint provenance is not admitted");
  const described = describeHistory(value.history);
  if (described.terminalTick !== value.tick || value.tick > MAX_CHECKPOINT_TICK) throw new TypeError("checkpoint tick is not admitted");
  const world = replay(described.history);
  world.paused = value.paused;
  return world;
}

/** A readable, derived view of a world for display; it is not the experiment's record. */
export function readingOf(world) {
  return Object.freeze({
    tick: world.tick, width: world.width, height: world.height, rules: { ...world.rules }, selected: world.selected,
    genomes: world.genomes.map((genome) => ({ id: genome.id, lineage: genome.lineage, parent: genome.parent, edges: { ...genome.edges } })),
    organisms: world.organisms.map(({ id, lineage, x, y }) => ({ id, lineage, x, y })),
  });
}
