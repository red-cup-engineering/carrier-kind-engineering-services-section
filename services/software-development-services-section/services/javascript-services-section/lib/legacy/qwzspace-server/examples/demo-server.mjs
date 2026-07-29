#!/usr/bin/env node
/**
 * Example: drive the QwzSpace scene kernel headlessly and print what it emits.
 *
 * This is a developer's sample, not a deployed service — it binds no port. It
 * shows the engine's substrate working: bodies placed on the icosahedral
 * quasicrystal, existence as a bilattice charge (with paraconsistent undeath),
 * the text-tier reading of the wire contract, and the causal order of the
 * settling. A real game wires `createQwzspaceScene().app` into an HTTP server
 * and lets clients render `SceneEntry`s; the visual agent builds that.
 *
 *   node examples/demo-server.mjs
 */

import { Scene, readAtTier, causalOrder } from "../dist/index.mjs";

const scene = new Scene({ worldRadius: 2 });
console.log(`world: ${scene.bodyCount()} bodies, places within radius ${scene.worldRadius}\n`);

// Tick 1 — spawn three bodies with different death-rules at the Settled Reach.
scene.runTick(1, [
  { k: "spawn", id: "hero", bodyKind: "player", deathRule: "mortal" },
  { k: "spawn", id: "wight", bodyKind: "monster", deathRule: "undead", site: [1, 0, 0, 0, 0, 0] },
  { k: "spawn", id: "golem", bodyKind: "monster", deathRule: "construct", site: [0, 1, 0, 0, 0, 0] },
]);

// Tick 2 — the hero strikes the wight and the golem.
scene.runTick(2, [
  { k: "strike", by: "hero", target: "wight" },
  { k: "strike", by: "hero", target: "golem" },
]);

const show = (id) => {
  const entry = scene.snapOf(id);
  if (!entry) return console.log(`  ${id}: culled (not rendered)`);
  console.log(`  ${readAtTier(entry, "text").line}  @ (${entry.x.toFixed(2)}, ${entry.y.toFixed(2)}, ${entry.z.toFixed(2)})`);
};

console.log("after the hero's strikes:");
for (const id of ["hero", "wight", "golem"]) show(id);

console.log("\n  the wight is undead: alive AND slain settles to ⊤, and it still renders.");
console.log("  the golem is a construct: struck to ⊤, it is unmade — removed from the world.\n");

const order = causalOrder(scene.firingEvents());
console.log(`causal order: ${order.events.length} firing events`);
order.events.forEach((e, i) => {
  console.log(`  [${i}] tick ${e.tick}  ${e.subject} ${e.what}  → precedes {${order.precedes[i].join(", ")}}`);
});
