---
title: "Research on a Network of MetroPlat Systems: Hole as an Endofunctor"
description: "Asks whether the space of diamonds of a finite causal set itself carries a causal-set structure so that Hole is an endofunctor; finds in the checkout that it recurses for free under one order and not the other, letting a network of running metroplat sites inherit correctness by instantiation rather than new proof."
date-created: 2026-07-01
keywords:
  - functor
  - hole
  - ledger
  - causality
  - diamond
  - site
  - infomaterial
  - settling
  - apex
  - readout
  - witness
status: research-note
packages:
  - sites/metroplat.emsenn.net
  - sites/infomaterial.emsenn.net
lean-anchors:
  - "Infomaterial/Relational/Spacetime/Boundary/Hole.lean"
  - "Infomaterial/Relational/Spacetime/Boundary/HoleDiamondCausalSet.lean"
  - "Infomaterial/Relational/Spacetime/Causal/Cone.lean"
software-anchors:
  - "sites/metroplat.emsenn.net/src/running/induce.mts"
  - "sites/metroplat.emsenn.net/services/http/main.mts"
  - "sites/metroplat.emsenn.net/services/filesystem-store/index.mts"
supersedes-drift:
  - The Lorentzian session called the shroud-source theorem `effect_source_shrouded`; the real declaration is `Hole.effect_source_in_shroud` (with `effect_source_interior`, `effect_source_not_exterior`).
---

This note asks whether the space of diamonds of a finite causal set itself
carries a causal-set structure. If yes, `Hole` takes a causal set in and
produces a causal set out — an **endofunctor** — and a network of running
metroplat sites gets its correctness properties by instantiation, not by new
proof. The answer is already in the checkout: it recurses for free, under one
specific order and not the other.

## What one system is, recalled with checked names

Before the network, fix the single-system vocabulary precisely.

- A running system is a **site** (`sites/<name>/`) — the genus, not a coinage.
  This is the settled reading from the node-directory taxonomy note: a
  `sites/<name>/` root "is the project-level body where a site can carry phases,
  cross an event horizon, hold or expose observations, and leave path-addressable
  residue."
- Its settled interior — the files that survive the process dying — is the
  **plate** (`data/`, the witness `log → state → record → content` chain).
- Its live, ephemeral capacity to mint new interactions — the Node listener that
  evaporates when the process is killed — is the **dish** (`services/http`'s
  `serve(...)` object, distinct from the static `induced` apex and from the
  persistent `dataRoot`).
- A single bounded request/response against it is a **diamond**
  (`Infomaterial.Relational.Spacetime.Causal.Cone.Diamond`, verified to exist:
  `Diamond a b x := C.reaches a x ∧ C.reaches x b`).

The causal-boundary reading of the same site is the `Hole` bundle in
`Infomaterial/Relational/Spacetime/Boundary/Hole.lean`:

- `hole_no_future_to_exterior` — axioms `[]` (no axioms at all): no
  interior event causally precedes any readout-exterior event.
- `Hole.effect_source_in_shroud` — axioms `[]`: every effect's source
  lies on the shroud. Companion theorems `Hole.effect_source_interior` and
  `Hole.effect_source_not_exterior` also hold.
- `EventHorizon` is a structure whose surface is the shroud.

The correspondence to published mathematics is settled (external-name-check
note): `ReadoutExterior(C,R) = J⁻(R)`, `HoleRegion(C,R) = C \ J⁻(R)`, which is
*definitionally* the black-hole-region formula `B = M \ I⁻(𝓘⁺)` when the readout
`R` plays the role of the asymptotic exterior. So a single site is, with real
mathematical authority, a finite readout-relative black-hole region; the diamonds
it mints are causal diamonds; the space of those diamonds is (in the continuum
precedent) a kinematic space.

## The theorem the network rests on: Hole is an endofunctor

The Lorentzian session ended on the correct fork: *does the space of diamonds of
a causal set `C` itself carry a causal-set structure?* If yes, `Hole` takes a
causal set in and produces a causal set out — an **endofunctor** — and then
`Hole`, `Hole²`, `Hole^n` all instantiate from one construction, with every
closure theorem inherited for free. If no, each level needs bespoke proof and the
library grows per level.

**This is no longer open. It is resolved in the checkout**, in
`Infomaterial/Relational/Spacetime/Boundary/HoleDiamondCausalSet.lean` (0 `sorry`;
key theorems verified axiom-clean, `[propext, Quot.sound]`). The file tests
exactly the two candidate orders the session proposed, and the result is a clean
split:

- `DiamondPoint C` — a diamond carried as two listed events with
  `reaches_upper : C.reaches lower.point upper.point`. Finite and with decidable
  equality, because `C.events` is a finite `List`.
- **Nesting** `(a,b) ≺ (a',b')` iff `a' ≤ a ∧ b ≤ b'` — **fails**.
  `nesting_self_edge` proves every diamond point has a self-edge, so
  `nesting_no_strictOrderClosure_of_point` shows it cannot carry the
  `Graph.StrictOrderClosure` a `CausalSet` requires. Nesting is *not* the causal
  order on diamonds.
- **Sequencing** `(a,b) ≺ (a',b')` iff `b ≤ a'` (one interaction's upper endpoint
  reaches the next's lower endpoint) — **succeeds**. `sequencing_lt_trans` and
  `sequencing_lt_irrefl` give a genuine strict order; `sequencingCausalSet C`
  packages the diamonds as a *new* `CausalSet (DiamondPoint C)`.
- Consequently `sequencingHole`, `sequencingEventHorizon`, `sequencingHoleRegion`,
  `sequencingReadoutExterior`, `sequencingShroud` are defined **by direct
  instantiation** of the existing `Hole` machinery on the derived causal set, and
  the four load-bearing laws are re-proved on it with no new argument:
  `sequencing_hole_future_closed`, `sequencing_readoutExterior_past_closed`,
  `sequencing_hole_exterior_disjoint`, `sequencing_hole_no_future_to_exterior`.
- The file does not stop at the generic level: it instantiates against the
  concrete `actualInfomaterialDiamondCausalSet : CausalSet (Fin 4)` and proves the
  same four laws hold there too (`actualInfomaterialDiamond_hole_*`).

So the endofunctor payoff the session hoped for is not hoped-for; it is banked.
The recursion is real, it is cheap, and it selects **sequencing** — temporal
concatenation of interactions — as *the* causal order on diamonds. Nesting
(containment of one interaction inside another) is provably the wrong order.
That is a genuine, checked mathematical fact about metroplat interactions, not a
naming preference.

## The network derivation

Now the network falls out, and this is the whole point of the note.

A "network of metroplat systems" has been the dead question since the
decommissioned `offDiagonalCollectiveCover` (the socializing/computing/gaming
Mayer–Vietoris gluing over packages that no longer exist). Reviving it would be a category error.

The endofunctor makes revival unnecessary. Read the `Hole` construction one level
up, with the event type instantiated at **running sites** instead of individual
events:

- `E := running metroplat sites` (Koios.News, and its peers).
- `C.prec0 :=` the witnessed cross-site relation — site A's witness log actually
  references/observes site B's output. The edges of the network causal set are
  real rows on disk, not invented structure.
- The **diamonds** of this higher causal set are bounded cross-site interactions
  (a request from one site fully answered with reference to another).
- By the endofunctor, the diamonds of the network are themselves a causal set
  under **sequencing** — so the network is closed under the same construction
  again, `Hole³` and beyond, with no new formalism.

The correctness properties come along by instantiation, and this is where it
earns its keep as an engineering spec, not decoration:

- `hole_no_future_to_exterior` at the network scale says: **a site fully inside
  the unobserved interior cannot have already influenced a site you have confirmed
  exterior contact with.** That is a genuine safety property for any
  gossip/witness-propagation protocol between sites — no silent back-influence
  from the unconfirmed interior across the confirmed boundary — and it is a
  theorem, inherited, not a hope.
- `effect_source_in_shroud` at the network scale says: **every cross-site effect
  originates at the shroud** — the set of sites currently at the edge of what has
  been observed — never purely from settled, already-recorded interior data. A
  finished row in someone's `data/` cannot itself originate a new federation
  effect; only a live boundary site can. This is the network-scale version of
  "the dish is where things happen, not the plate."

So: **a network of metroplat systems is a Hole whose events are sites.** It is
the same object as a single site, one level up, because `Hole` is a proven
endofunctor. Federation is re-instantiation of running machinery, not new
machinery.

## Proved vs. open — honest ledger

Proved and live:

- `Hole` is an endofunctor on finite causal sets via the sequencing order;
  nesting provably fails; all four closure laws inherit to `DiamondPoint`, both
  generically and on the concrete `Fin 4` diamond. (`HoleDiamondCausalSet.lean`,
  0 `sorry`, axiom-clean.)
- Single-site hole laws (`hole_no_future_to_exterior`, `effect_source_in_shroud`,
  `EventHorizon`) exist and are axiom-clean.
- `HoleRegion = C \ J⁻(R)` is definitionally the black-hole-region formula
  (external-name-check note, `lean_run_code`-confirmed).

Open, and not to be waved through:

1. **The transport-agreement object is unbuilt** (running-apex note). We have not
   proved one running unit's CLI/HTTP/MCP/OpenAPI faces agree on overlaps
   (`TransportAgreementReport`), so "one site" as a *single glued object across its
   own transports* is still weaker than "one site as a Hole." The network story
   assumes each node is a coherent single apex; that coherence is itself a frontier
   report, not yet a theorem.
2. **The cone/cocone framing stays decorative until a diagram exists.** The
   session's "hole and field are the apices of a cocone and cone" is a specific,
   falsifiable claim requiring an actual functor whose limit is Hole and colimit is
   Field. No such diagram is named. Do not let "apex of a cone" do mathematical
   work until the diagram is built — the same discipline `Region` needed (open
   *and* connected) and `Cut` needed (an actual poset partition).
3. **The genuinely unclaimed external seam is still unclaimed.** No literature puts
   a Hansen–Ghrist cellular sheaf Laplacian on a moduli space of causal
   diamonds/hole-regions (region-moduli memos). Infomaterial is unusually
   positioned — it has `DiamondPoint`, the Alexandrov-opens-as-up-sets result, and
   the open Husainov Čech-vs-derived comparison already in the same repo — but the
   network note above does **not** depend on closing that seam. It is upside, not
   prerequisite. The continuum precedent that the space of diamonds carries causal
   structure (Barrera–Montes de Oca–Solis 2024) is the external corroboration that
   the discrete endofunctor result is plausible, not wishful — and now, in the
   finite case, proven.
4. **Post-collapse dynamics is a real, unanswered physics question, not this
   note's.** "What happens to a `HoleRegion` after its readout condition changes"
   (a site going dark, a peer leaving the federation) is well-posed and deserves a
   real check against causal-set sequential-growth dynamics (Rideout–Sorkin),
   not a freestyle answer.

## One-line result

A network of metroplat systems is not a new construction: it is the proven
`Hole` endofunctor instantiated at `E := running sites`, with `prec0` read from
real cross-site witness residue, whose safety properties (`no_future_to_exterior`,
`effect_source_in_shroud`) are inherited theorems rather than protocol hopes.

Before the network, fix the single-system vocabulary precisely, using only names
I re-verified against the live sources in this pass (not the session transcript,
which drifted on at least one theorem name).

The causal-boundary reading of the same site is the `Hole` bundle in
`Infomaterial/Relational/Spacetime/Boundary/Hole.lean`. I re-verified these
declarations exist and are axiom-clean in this pass:

- `hole_no_future_to_exterior` — verified, axioms `[]` (no axioms at all): no
  interior event causally precedes any readout-exterior event.
- `Hole.effect_source_in_shroud` — verified, axioms `[]`: every effect's source
  lies on the shroud. (The session called this `effect_source_shrouded`; that
  name does not exist. Companion theorems `Hole.effect_source_interior` and
  `Hole.effect_source_not_exterior` do.)
- `EventHorizon` — verified to exist as a structure whose surface is the shroud.

A "network of metroplat systems" has been the dead question since the
decommissioned `offDiagonalCollectiveCover` (the socializing/computing/gaming
Mayer–Vietoris gluing over packages that no longer exist). The transport-agreement
frontier note independently confirms that machinery is gone: a current source
search finds no active modules for `animating`, `communicating`, `knowing`, or
`playing`. Reviving it would be a category error.

- `E := running metroplat sites` (Koios.News, and its peers).
- `C.prec0 :=` the witnessed cross-site relation — site A's witness log actually
  references/observes site B's output. This is not invented; it is exactly the
  `data/logs/YYYY/MM/DD/...jsonl` residue already written on every observation by
  `holeKeratinousBoundary` (called from `services/filesystem-store/index.mts` on
  every request). The edges of the network causal set are real rows on disk.
- The **diamonds** of this higher causal set are bounded cross-site interactions
  (a request from one site fully answered with reference to another).
- By the endofunctor, the diamonds of the network are themselves a causal set
  under **sequencing** — so the network is closed under the same construction
  again, `Hole³` and beyond, with no new formalism.

Proved and live (verified in this pass):

1. **The network causal set is not yet constructed in code.** Nothing today builds
   `CausalSet (running sites)` from real `data/logs` cross-references. The
   endofunctor guarantees the *math* is free; the *wiring* — deriving `prec0` from
   actual witnessed cross-site rows — is unbuilt engineering. Concrete first
   move: two sites (Koios.News and one peer), `prec0` from real log
   cross-references, then instantiate `Hole` on it and confirm the inherited laws
   typecheck against that instance.
2. **The transport-agreement object is unbuilt** (running-apex note). We have not
   proved one running unit's CLI/HTTP/MCP/OpenAPI faces agree on overlaps
   (`TransportAgreementReport`), so "one site" as a *single glued object across its
   own transports* is still weaker than "one site as a Hole." The network story
   assumes each node is a coherent single apex; that coherence is itself a frontier
   report, not yet a theorem.
3. **The cone/cocone framing stays decorative until a diagram exists.** The
   session's "hole and field are the apices of a cocone and cone" is a specific,
   falsifiable claim requiring an actual functor whose limit is Hole and colimit is
   Field. No such diagram is named. Do not let "apex of a cone" do mathematical
   work until the diagram is built — the same discipline `Region` needed (open
   *and* connected) and `Cut` needed (an actual poset partition).
4. **The genuinely unclaimed external seam is still unclaimed.** No literature puts
   a Hansen–Ghrist cellular sheaf Laplacian on a moduli space of causal
   diamonds/hole-regions (region-moduli memos). Infomaterial is unusually
   positioned — it has `DiamondPoint`, the Alexandrov-opens-as-up-sets result, and
   the open Husainov Čech-vs-derived comparison already in the same repo — but the
   network note above does **not** depend on closing that seam. It is upside, not
   prerequisite. The continuum precedent that the space of diamonds carries causal
   structure (Barrera–Montes de Oca–Solis 2024) is the external corroboration that
   the discrete endofunctor result is plausible, not wishful — and now, in the
   finite case, proven.
5. **Post-collapse dynamics is a real, unanswered physics question, not this
   note's.** "What happens to a `HoleRegion` after its readout condition changes"
   (a site going dark, a peer leaving the federation) is well-posed and deserves a
   real check against causal-set sequential-growth dynamics (Rideout–Sorkin),
   not a freestyle answer.
