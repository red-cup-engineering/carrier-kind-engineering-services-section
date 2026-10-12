# @emsenn/qwzspace-server

QwzSpace — a 3D real-time graphics web engine for making browser games and rich web apps, derived from the meme substrate.
This is the **server-side authoritative half**: a developer imports it to build *their* game's server.
It is an engine, not a service — it claims no port and runs no daemon; the game built on it does that.

## Conceptual upstream apex

`@emsenn/relating` provides the charge-valued relational substrate; web transport comes from `@emsenn/organizing-with-the-web` and `@emsenn/http-server`.
The engine is a downstream realization of those concepts; it does not modify them.

## The substrate, made into an engine

- **Space — `icosahedral`.** Space is a genuine icosahedral ℤ⁶→ℝ³ cut-and-project quasicrystal (the canonical aperiodic order of three-space).
  Each place's coordinates are *produced by the cut*, exact in ℚ(√5); the internal projection whose acceptance window decides realization is the componentwise Galois conjugate √5 ↦ −√5.
  The exact single-site judgment (`siteRealization`) is the decidable source of truth; a float boundary read (`modelSet`) enumerates whole worlds fast and is provably exact for rational windows.
  A body may only ever stand on a realized place.
- **Existence — `existence`.** A body has no boolean `alive`.
  Its visibility *is* a four-valued bilattice charge: `joinKnowledge(alive?t:⊥, slain?f:⊥)`, yielding `⊥` unknown / `t` real / `f` destroyed / `⊤` the held contradiction.
  The undead are `⊤` — alive *and* slain — rendered, not crashed.
  The five deaths are policy over that charge, not five code paths.
- **Time — `time`.** Time is the tick: a single-writer monotone settling, state only accumulating.
  Firing events carry a causal order (light cones, timelike/spacelike separation) realizing meme-geometry's temporal geometry over the scene.
- **Scene — `scene`.** The kernel composing the three, exposing exactly the surface `web-qwzspace` drives: `runTick` / `subjectsOf` / `snapOf`.
- **Tiers — `tier`.** `webgl → canvas2d → text` are not different payloads but coarser *readings* of the one scene section the server emits.
  Fallback is lossless at the source.

## Usage

```ts
import { createQwzspaceScene } from "@emsenn/qwzspace-server";

const { app, scene, step } = createQwzspaceScene({ worldRadius: 2 });
// mount `app` in your web-server, spawn bodies through `scene`, drive `step()`.
```

The wire **contract** the visual/UX agent codes against is `./protocol` — `SceneEntry` (one body's renderable projection, carrying float positions and the existence glyph) and the client→server `Intent` union.
See `examples/` for a runnable sample server and `client/` for the contract handoff stub.

## Scope

This package is the **backbone**: geometry, existence, time, scene kernel, transport wiring, and the tier contract.
The actual rendering — WebGL/Canvas clients, meshes, shaders, UX — is deliberately out of scope here and is the visual agent's work against `./protocol`.

## Scripts

- `pnpm run build` — emit `dist/`.
- `pnpm run test` — build and run the exact-geometry and existence tests.
- `pnpm run demo` — run the example server (`examples/demo-server.mjs`).
