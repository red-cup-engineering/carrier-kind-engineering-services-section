---
title: "Capability note: @561-group/abrash"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/abrash"
---

# Capability note: @561-group/abrash

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/abrash`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: abrash — the GAME ENGINE on @561-group/daleske: pixel/3D games (the pixel sibling of tsander, which rides arnold). A software 3D renderer (a raycaster over a voxel world) → daleske's RGBA pixel framebuffer, a tick/realtime loop with NO global clock (aperiodic settling), AABB collision against the voxel grid, and the federated-trace WORLD substrate (like tsander's but PIXEL): a 'place' is a subject whose state is the FOLD of predications, unvisited = ⊥, disagreement = ⊤ HELD with both witnesses. THE BILATTICE READOUT in pixels: a ⊤ voxel renders DOUBLED and SHIVERING (driven by tick phase, not RNG, replay-identical), a ⊥ voxel is dim fog, an f voxel is a dark wreck. THE LAW: ⊤ held, append-only trace, evidence linear. Named for Michael Abrash (Quake's software renderer). Built on computer's substrate/federation + daleske's pixel terminal; games ride this engine.
- Capability tags from manifest/source hints: `cli`, `workspace-analysis`, `game-or-play`, `mathematics`, `persistence`
- Bins: `abrash`
- Export subpaths: `.`, `./world`, `./raycaster`, `./collision`, `./engine`, `./math`, `./package.json`
- Scripts: `test`, `demo`
- Dependencies: `@561-group/daleske`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/abrash/README.md: > A **pixel/3D GAME ENGINE** over [`@561-group/daleske`](../daleske) (the kitty/sixel pixel terminal) — the **software-3D sibling** of [`@561-group/tsander`](../tsander) (the wireframe engine over the cell terminal arnold). abrash casts a **software raycaster** over a federated voxel world into daleske's RGBA framebuffer, with a tick loop, grid collision, and the paraconsistent trace substrate. > It sits ABOVE [`@561-group/computer`](../../../computer) (the EAVT substrate) and `@561-group/daleske`; neither depends on it. > Named for **Michael Abrash**, who documented the software 3D renderer behind Quake.
- Source hints: `bin/abrash.mjs`, `src/collision.mjs`, `src/engine.mjs`, `src/index.mjs`, `src/math.mjs`, `src/raycaster.mjs`, `src/world.mjs`, `tests/_harness.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `game-or-play`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
