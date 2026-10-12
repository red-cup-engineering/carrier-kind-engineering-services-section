---
title: "Capability note: @561-group/apps"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps"
---

# Capability note: @561-group/apps

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: 561-group applications — real tools built on the @561-group/math floor, addressed by subpath. The language stack lives under @561-group/apps/language: syntaxis (a zero-statistics formal-linguistics engine), koine (a prose linter on syntaxis), and the syntaxis-* language bundles. Each tool keeps its own resolution scope; this package is the facade that exposes them.
- Capability tags from manifest/source hints: `application`, `service`, `cli`, `agent-harness`, `workspace-analysis`, `game-or-play`, `mathematics`, `persistence`, `frontend`
- Bins: none
- Export subpaths: `./language/syntaxis`, `./language/*`, `./package.json`
- Scripts: `test`
- Dependencies: `@561-group/math`

## Local Evidence

- No nearby README/AGENTS/CLAUDE paragraph was found by the measurement script.
- Source hints: `games/aletheon/bin/aletheon-server.mjs`, `games/aletheon/client/gl/camera.mjs`, `games/aletheon/client/gl/mesh.mjs`, `games/aletheon/client/gl/renderer.mjs`, `games/aletheon/client/gl/shader.mjs`, `games/aletheon/client/gl/terrain.mjs`, `games/aletheon/client/main.mjs`, `games/aletheon/client/math/mat4.mjs`, `games/aletheon/client/math/quat.mjs`, `games/aletheon/client/math/vec3.mjs`, `games/aletheon/client/net/connection.mjs`, `games/aletheon/client/ui/hud.mjs`, `games/aletheon/client/view2d.mjs`, `games/aletheon/server/app.mjs`, `games/aletheon/server/net/session.mjs`, `games/aletheon/server/world/claims.mjs`, `games/aletheon/server/world/combat.mjs`, `games/aletheon/server/world/dispute.mjs`, `games/aletheon/server/world/field.mjs`, `games/aletheon/server/world/kernel.mjs`, `games/aletheon/server/world/marks.mjs`, `games/aletheon/server/world/powers.mjs`, `games/aletheon/server/world/richness.mjs`, `games/aletheon/server/world/seed.mjs`, `games/aletheon/server/world/spacetime.mjs`, `games/aletheon/server/world/store.mjs`, `games/aletheon/server/world/thermo.mjs`, `games/aletheon/server/world/ticking.mjs`, `games/aletheon/server/world/trade.mjs`, `games/aletheon/server/world/value.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`, `agent-harness`, `game-or-play`, `frontend`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
