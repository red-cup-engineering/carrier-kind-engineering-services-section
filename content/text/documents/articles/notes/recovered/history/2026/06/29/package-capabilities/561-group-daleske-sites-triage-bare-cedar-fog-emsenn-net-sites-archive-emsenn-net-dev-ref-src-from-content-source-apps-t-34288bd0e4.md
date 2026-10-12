---
title: "Capability note: @561-group/daleske"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/daleske"
---

# Capability note: @561-group/daleske

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/daleske`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: daleske — the PIXEL terminal framework, the raster analogue of arnold (the cell terminal). A pure RGBA framebuffer + encoders for the KITTY graphics protocol AND SIXEL (capability-detected, falling back gracefully), a DIFFED pixel blit (only changed tiles re-encode), raw-mode input, and a clean PROJECTOR seam — project(settledSection) -> a PIXEL frame (the pixel analogue of arnold's cell projector), painting ⊤ as CONTESTED (both faces shown, no winner) and ⊥ as pending. THE LAW: ⊤ shown, never hidden. The projector boundary is kept clean so it can later be PROMOTED into computer/ as the pixel terminal projector. Pure where possible; node builtins; deps only @561-group/computer.
- Capability tags from manifest/source hints: `cli`, `workspace-analysis`
- Bins: `daleske`
- Export subpaths: `.`, `./framebuffer`, `./kitty`, `./sixel`, `./capability`, `./blit`, `./input`, `./projector`, `./screen`, `./package.json`
- Scripts: `test`, `demo`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/daleske/README.md: > A **PIXEL terminal framework** over pure node (builtins only, no heavy deps) — the raster analogue of [`@561-group/arnold`](../arnold) (the cell terminal). daleske lights up a **settled section** as a raster scene over the **kitty graphics protocol** or **sixel** (capability-detected, falling back gracefully). > It sits ABOVE [`@561-group/computer`](../../../computer) (the EAVT substrate); `computer` never depends on it.
- Source hints: `bin/daleske.mjs`, `src/blit.mjs`, `src/capability.mjs`, `src/framebuffer.mjs`, `src/index.mjs`, `src/input.mjs`, `src/kitty.mjs`, `src/projector.mjs`, `src/screen.mjs`, `src/sixel.mjs`, `tests/_harness.mjs`, `tests/prove-capability.mjs`, `tests/prove-framebuffer.mjs`, `tests/prove-kitty.mjs`, `tests/prove-projector.mjs`, `tests/prove-sixel.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: none obvious from coarse tags

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
