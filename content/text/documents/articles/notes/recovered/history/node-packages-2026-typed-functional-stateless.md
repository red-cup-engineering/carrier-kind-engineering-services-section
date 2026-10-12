# 2026 Node packages — typed, functional, stateless (research notes)

Distilled from a multi-source, adversarially-verified deep-research pass (2025–2026 state).
Lens: pure ESM `.mjs`, no classes/mutation, plain immutable shapes + pure functions, JSON-Schema-first
(this repo already uses `ajv` + `ajv-formats`). All findings below verified 3-0 unless noted.

## Recommendation at a glance (for `@561-group/computer`)

| Need | Use | Avoid / caveat |
|---|---|---|
| Schema + static types, JSON-Schema-first | **TypeBox** | it *is* JSON Schema; pairs with Ajv with zero impedance mismatch |
| Result-typed errors (no throws) | **neverthrow** | stateless, no runtime framework |
| Exhaustive pattern matching over shapes | **ts-pattern** | `.exhaustive()` forces every union case |
| Canonical/deterministic JSON (RFC 8785 JCS) | **canonicalize** or zero-dep **json-canonicalize** | do NOT hand-roll (we hand-roll this ~5×) |
| Content hashing | **`node:crypto`** | no dependency needed |
| Filesystem walking | **tinyglobby** | smaller dep footprint than fast-glob/globby |
| Utility belt (if needed) | **es-toolkit** (or Remeda) | tree-shakeable, TS-first; not Lodash/Ramda |
| Immutability helper | **none** in a pure style | if ever needed, Mutative > Immer |
| Full FP effect system | **Effect** *only if* adopting its runtime | bundles a fiber runtime = lock-in; use `Micro` (~5kb) if bundle-critical |

## 1. Typed functional cores

- **fp-ts is a dead end for new code.** It officially merged into **Effect** (Giulio Canti joined
  the Effect org; Effect is "fp-ts v3" — confirmed by fp-ts's *own* README). Don't start anything on fp-ts.
- **Effect** is powerful but bundles a **fiber runtime** → larger bundle + framework lock-in. For a
  stateless codebase, this is the thing to flag. Escape hatch: the **`Micro`** module (~5kb gzipped,
  no Layer/Ref/Queue) for when you want pieces without the whole runtime.
- **neverthrow** — `Result<T,E>` (Ok/Err) + async `ResultAsync`, ~98% TS. Encodes failure in the type
  system instead of throwing. Pure values, no framework. Good fit for a functional style.
- **ts-pattern** — exhaustive matching over nested objects/arrays/tuples/sets/maps/primitives with
  type narrowing; `.exhaustive()` enforces total case coverage. Ideal for switching over plain
  immutable shapes (e.g. dispatching on a datom/cell kind).

## 2. Runtime schema + static type inference

- **TypeBox** is the standout for *this* repo: it builds in-memory **JSON Schema** objects that infer
  as TS types via `Static<typeof T>`, are usable **directly with Ajv**, and it ships its own
  high-perf JIT validator (Draft 3 → 2020-12) with a dynamic fallback. So our schemas stay real JSON
  Schema (no lock-in) while gaining static types — and we can keep Ajv or use TypeBox's validator.
- **Zod 4** — now has first-party `z.toJSONSchema()` (draft-04/07/2020-12/openapi-3.0). Nice from the
  TS-first side, but Zod schemas are a Zod-specific runtime, not JSON Schema; heavier than TypeBox for
  a schema-first design. `json-schema-to-zod` bridges the reverse direction but is **unmaintained as
  of March 2026**.
- **ArkType / Valibot** — strong validators; not JSON-Schema-native the way TypeBox is. Verdict: for a
  JSON-Schema-first repo, TypeBox first; Ajv stays the validator of record.

## 3. Functional utility belts

- **es-toolkit** — tree-shakes out of the box, built-in TS types/guards, up to ~97% smaller than
  Lodash. Modern default.
- **Remeda** — tree-shakeable, TS-typed, dual CJS/ESM. Also good.
- **Ramda** — older/larger (~6–7kb tree-shaken vs Rambda ~4kb); smaller than Lodash (~70kb) but
  outclassed by es-toolkit/Remeda for new code.
- Note: in a truly pure-functional style we may not need a belt at all — most needs are a few small
  local helpers.

## 4. Immutability helpers

- In a plain-immutable-shape style, **Mutative/Immer are largely unnecessary** — we already never
  mutate. If a draft-mutation helper is ever wanted, **Mutative beats Immer** substantially (~17×
  with defaults, mostly because Immer auto-freezes by default). (The "17×" detail was 2-1; the
  "largely unnecessary" headline was 3-0.)

## 5. Sensible upstreams for things we hand-roll

- **Canonical JSON (RFC 8785 JCS):** `canonicalize` (by an RFC co-author) or zero-dep
  `json-canonicalize`. We currently hand-roll this in tab, farolfi, aletheon, syntaxis (≥5 copies).
- **Content hashing:** `node:crypto` (sha256/sha1/hmac/ripemd160). No dependency needed; call it once
  inside the canonical `rowId`, don't re-implement per app.
- **Filesystem walking:** `tinyglobby` (uses picomatch directly; smaller than fast-glob/globby which
  pull micromatch + 4 subdeps). Or `node:fs/promises` glob where that suffices.

## How this lands in the consolidation

- The `upstreamReplacements` from the hand-roll survey map onto these directly: one blessed RFC-8785
  impl (canonicalize) behind `posix-holography/eavt.jcs`; `node:crypto` once behind `rowId`; tinyglobby
  for fs walks.
- **TypeBox** is the candidate to type the canonical dataclasses (datom, cell, charged cell, settled
  section) as JSON Schema + inferred TS in one place, validated by the Ajv we already run.
- Keep **Effect's runtime out** of the stateless OS core; if we want Result/pattern ergonomics, reach
  for the lightweight, composable **neverthrow + ts-pattern**, not a framework.

_Source: deep-research run, 106 agents, 12 verified findings; full transcript in the session task output._
