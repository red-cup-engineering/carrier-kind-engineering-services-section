---
title: "Capability note: @561-group/arnold"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/arnold"
---

# Capability note: @561-group/arnold

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/arnold`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: arnold — a generic, composable TUI framework over pure node (builtins only, no heavy deps). It lights up a SETTLED SECTION in the terminal: the terminal analogue of shp (the HTML projector at computer/L8). A screen/cell buffer with a DIFFED render (only changed cells repaint), box/flex layout, core widgets (text, list, table, input, status line), raw-mode keyboard input + an event loop, and ANSI styling. CRITICAL: a clean PROJECTOR seam — a pure project(settledSection) -> terminal frame mapping a @561-group/computer settled section {affirmed,denied,contradicted} to a renderable frame, rendering ⊤ as CONTESTED (both sides + both witnesses shown, no winner picked), ⊥ as pending. THE LAW: ⊤ shown, never hidden. The projector boundary is kept clean so it can later be PROMOTED into computer/ as the terminal projector.
- Capability tags from manifest/source hints: `application`, `cli`, `workspace-analysis`
- Bins: `arnold`
- Export subpaths: `.`, `./ansi`, `./buffer`, `./render`, `./layout`, `./widgets`, `./input`, `./projector`, `./app`, `./package.json`
- Scripts: `test`, `demo`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/arnold/README.md: > A generic, composable **TUI framework** over pure node (builtins only, no heavy deps). arnold lights up a **settled section** in the terminal — the terminal analogue of [`shp`](../../../computer/semantic-hypertext-packet) (the HTML projector at `computer`/L8). > It sits ABOVE [`@561-group/computer`](../../../computer) (the EAVT substrate); `computer` never depends on it.
- Source hints: `bin/arnold.mjs`, `bin/lantern.mjs`, `src/ansi.mjs`, `src/app.mjs`, `src/buffer.mjs`, `src/index.mjs`, `src/input.mjs`, `src/layout.mjs`, `src/projector.mjs`, `src/render.mjs`, `src/widgets.mjs`, `tests/_harness.mjs`, `tests/prove-buffer.mjs`, `tests/prove-input.mjs`, `tests/prove-layout.mjs`, `tests/prove-projector.mjs`, `tests/prove-render.mjs`, `tests/prove-widgets.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
