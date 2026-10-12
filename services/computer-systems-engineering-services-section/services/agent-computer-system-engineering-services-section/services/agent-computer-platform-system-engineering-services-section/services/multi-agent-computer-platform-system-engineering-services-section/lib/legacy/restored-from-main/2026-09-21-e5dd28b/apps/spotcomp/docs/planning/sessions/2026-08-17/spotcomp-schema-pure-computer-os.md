# Plan: Derive SPOTCOMP as a schema-pure, self-contained, standards-conformant computer-OS

## Context

The lab's goal chain (root `AGENTS.md`) is `voidmath → spotcomp → swarm-intelligence → claude-code-harness`, each link depending on the one below. **SPOTCOMP is link 2: the IETF-conformant computer operating system.** Today it is a sprawl of ~57 "candidate declaration surface" docs plus `src/*-profile.mjs` *shape-validators* (which "pass" if a JSON field literally says `fixedPointTheorem: "Knaster-Tarski"`), one real module (`src/trace.mjs`), my throwaway `src/eavt-core.mjs`, and a partial descent scaffold I copied from voidmath.
It is sound math wearing a spec costume, not a built computer.

Meanwhile the actual mathematics is **already proven** — but in `lab/`, in **pre-disambiguation language** (written before the team split the four *stages* `articulating/predicating/positing/settling` from the four *regimes* `finite<scott<transfinite<aperiodic` by closure ordinal κ).
Key bodies: `lab/hacking/articulating/` (nucleus algebra σ/Δ/commutating → the rich potential/active/stable/absurd cell quartet, plus the four-regime-dichotomy / aperiodicity-characterization / MLD-classification theorems) and `lab/archive/relationality-repo/.../predication-categories/` (159 proved theorems with Lean 4 proofs, cohomology, CRDT/consensus, six-functor) and its 78-file `predicated-computing` theorem set.

**Decisions fixed by the user:** - **Work only in `development/experimental/spotcomp/`.** Do not modify voidmath.
If spotcomp ends up with everything voidmath has and more, that is the goal. - **Re-create voidmath's discipline, not its files**: everything is a typed `$thing` with schema + `$ref`s + closure-rule scripts + EAVT positing logs — **no arbitrary data, every datum a categorical object.** - **Derive the math myself.** Lab/voidmath are cross-check and understanding, not copy-sources.
Re-deriving is what bakes in the stage/regime disambiguation correctly.
(So the schemas already rehosted from voidmath are scaffolding to *verify by re-derivation*, not trusted copies.) - **Disambiguation authority:** `development/experimental/swarm-intelligence/docs/GENEALOGY.md` (two orthogonal axes; commuting grid, not a ladder; the stage↔regime correspondence is a default diagonal, not a law).

## Principles (the discipline every artifact obeys)

1. **$thing shape.** Each node is a directory: `<slug>.schema.json` — a morphism schema declares `input`/`output` via `$ref` to its domain/codomain object schemas, and **nothing else structural**; do **not** declare `variance` or `monotone` (those are derivation facts about the morphism, not schema data).
  Plus `<slug>.jsonl` (EAVT positing log), `scripts/<verb>.mjs` (Ajv-validated closure rule, imperative verb name e.g. `articulate.mjs`), `library/` (generated objects).
  Generators (morphisms) sit unwrapped; objects under `library/`; `hacking/` marks admitted-not-derived.
2. **No arbitrary data.** Every `.jsonl` row validates against its schema; every `$ref` resolves; scripts validate input against `domain` and output against `codomain` (the `articulate.mjs`/`posit.mjs`/`settle.mjs` pattern).
3. **Two-axis naming.** Name by `(stage, regime)` explicitly; never collapse to a ladder.
  `token`/`claim` are JSON-Schema *documents* (type-stating units), not strings; EAVT `{e,a,v,t}` is strict — E any entity, A any morphism, V any object, T any trace.
  A cell's value lives in the rich fiber `A_p = (L×L)^(E×E)` over a **general** residuated lattice `L` — never a fixed finite truth-set.
  The rich four-fold is the **cells** (potential/active/stable/absurd Chu-phases), NOT a four-valued logic; a four-valued bilattice is at most an optional side compatibility shadow and is not constructed in the core.
  The value lattice `L` is a **residuated lattice with Lambek residuation** (a fusion `⊙` and its left/right residuals `\`,`/`); this residuated structure — lifted through the twist-product to the bilattice fiber — is **load-bearing and bigger than it first looks**: it drives negation/twist, the fusion/residual on `A_p`, and the hyperdoctrine quantifier-adjoints.
  Derive it early and carefully; do not bolt it on.
4. **Derive, then cross-check.** Produce spotcomp's own derivation; verify against lab's proofs and voidmath's encoding; where lab's language conflates stage/regime, disambiguate in the derived artifact.

## Approach (phased; Phase A is the immediate executable start)

### Phase A — Schema-purity foundation + make the descent run - **Wire `spotcomp/package.json`**: `type: module`, `imports` `#`-alias map (mirroring the descent paths, as voidmath does), `dependencies` on `ajv`/`ajv-formats` (already root deps), so closure-rule scripts resolve and run. - **Verify-by-re-derivation** the descent scaffold already present (`articulating → predicating → positing → settling`, derivations 1–4): confirm each is schema-pure, `$ref`s resolve, scripts Ajv-validate; re-derive any copied piece that doesn't meet the bar or carries pre-disambiguation language. - **Smoke test**: `utterance [token,claim] → articulate → predicate → posit → settle` runs end-to-end under Ajv validation, producing a finite settlement.

### Phase B — Derive the regime witnesses (what voidmath gestures, lab proves) - **Derive the residuated-lattice / Lambek residuation on `L` first** (fusion `⊙` + residuals), then the twist-product → bilattice fiber algebra `A_p` on top of it.
The closure operators, regime machinery, and the hyperdoctrine adjoints all depend on this residuated structure, so it is the floor of Phase B, not an afterthought. - Derive in spotcomp, schema-pure: the **nucleus algebra** — `saturating` (σ), `transferring` (Δ), `commutating` (σ∘Δ=Δ∘σ) → the rich potential/active/stable/absurd cell quartet (the Chu-shape phases; not collapsed to a four-valued logic) — as morphism/object `$thing`s with closure-rule scripts. - Derive `closure-ordinal`, `settling-endofunctor`, `closure-2-monad`, and the **four-regime-dichotomy** as schema-pure objects carrying an explicit **κ-witness**, so regime placement is *proved*, not asserted.
Disambiguate "predication settling" → settling-stage object classified by regime property.

### Phase C — Derive the computer-OS chain (the bulk I had been dodging) - `thing → system → operating-system → computer-operating-system` as schema-pure `$thing`s, with the OS ontology: `closure-position` (process/procedure/derivation/inquiry = the four σ/Δ corners — *a process is a closure orbit*), `work`, `resource-file`, `script`, `session`/`turn`/`respond-loop`, `message`, `time`, `mcp`/`tool-use`/`skill-use`. - **Conformance core, for real (not gestured):** `path-category` (POSIX paths → Yoneda categorical identity; the schema/log/script triad; dual-filing at subject `e` and predicate `a` anchors), strict EAVT `{e,a,v,t}`, canonical identity (`sha256(jcs(row))`, real RFC 8785 JCS), G-Set CRDT merge, `positing-log` — re-homing `eavt-core`'s tested logic (JCS, row-id, G-Set, the knowledge-order join over general L, LFP closure) into proper morphism `$thing`s, with values in general L (no fixed truth-set). - **CGS layer**: concurrent game semantics (event structures, polarity, strategies-as-morphisms, modeled players) as schema-pure `$thing`s, derived from the lab/spotcomp CGS math.

### Phase D — Standards conformance + a real test suite - Real **POSIX function conformance**: enforce capability/effect on the `posix-…-esm-node` functions (replace the bypassable regex lint). - **IETF wire/identity** conformance: RFC 8259/7493/8785/7464/3339/8032/7992 as actual checks on rows, envelopes, SHP. - Replace `src/*-profile.mjs` shape-validators with a **behavioral conformance suite**: closure idempotence/monotonicity, least-fixed-point, order-independence (trace-monoid/CRDT), canonical-id stability, strict-`{e,a,v,t}`, end-to-end descent.

## Critical files / patterns

- **Discipline to re-create (reference, derive own):** voidmath `articulating/scripts/articulate.mjs`, `…/positing/scripts/posit.mjs`, `…/settling/scripts/settle.mjs` (Ajv-validated closure-rule pattern); the `kind: morphism` schema shape.
- **Math to re-derive + cross-check:** `lab/hacking/articulating/{articulating,saturating,transferring,commutating}.md` and `…/aperiodic-articulation-category/docs/dev/theorems/{four-regime-dichotomy,aperiodicity-characterization,aperiodic-regime-classification}.md`; `lab/archive/relationality-repo/.../predication-categories/` (Lean proofs); `lab/archive/.../engineering/.../organizing/predicated-computing/theorems/` (computing bridge).
- **Disambiguation authority:** `development/experimental/swarm-intelligence/docs/GENEALOGY.md`.
- **Existing spotcomp to reconcile (don't blind-delete):** the 57 `*.md` declaration surfaces (become derivation references; superseded as real `$thing`s land), `src/trace.mjs` (real), `src/eavt-core.mjs` (logic to re-home), `src/*-profile.mjs` (replaced by behavioral tests).
- **All work under** `development/experimental/spotcomp/`.

## Verification

- `npm install` (workspace) → Ajv resolves spotcomp's `#`-aliases.
- Each closure-rule script: run on example input; assert Ajv-valid input (domain) and output (codomain).
- End-to-end: `utterance → articulate → predicate → posit → settle` → finite EAVT settlement; assert the cell value (in general L) and phase, canonical id, trace.
- Schema-purity audit: every `.jsonl` row validates against its `$thing` schema; every `$ref` resolves; grep for arbitrary (non-schema'd) data → none.
- Conformance suite (Phase D): closure laws, LFP, CRDT order-independence, RFC 8785 canonical-id stability, strict `{e,a,v,t}`.
