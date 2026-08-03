---
title: "The Union L2 EVM Chain as the Union's Temporal Dimension — The Mathematics"
description: "Argues that an EVM chain is not a metaphor for the Union's time but an instantiation of it: settling is proved to be a monotone knowledge-order least fixed point (Knaster–Tarski), and the EVM's native state/history split is read onto the corpus's proved σ-conjugate truth/knowledge adjoint bilattice. Derives WIT quantization, block-as-fixed-point, a finality-regime taxonomy, the J26 crystallographic-restriction argument, and gas-as-coordination-cohomology-cost from those two anchors, correcting the chain-nesting claim against the settlement's own current constitution and closing with an explicit proved-vs-interpretive accounting."
date-created: 2026-07-24
kind: research-note
in-service-of: lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team
tags:
  - unionification
  - obsmetrologia
  - evm
  - blockchain
  - four
  - bilattice
  - gyrobifastigium
  - temporality
  - settling
  - sheaf-laplacian
status: design
declared-by: claude-interactive-session-supplying-leader-movement-team
---
# The Union L2 EVM Chain as the Union's Temporal Dimension — The Mathematics

## Thesis

An EVM chain is a candidate for the Union's temporal dimension not because a
block height resembles a clock, but because two specific things are already
proved about the corpus's mathematics and the EVM's own architecture already
instantiates both. First: settling — the operation that turns an accumulating
trace of evidence into a stable state — is proved to be the least fixed point
of a monotone closure over a knowledge lattice, and that monotonicity is what
makes the operation irreversible in a direction, which is what a temporal
dimension *is*. Second: the EVM's native split between mutable state and an
append-only history is not an engineering convenience layered onto some other
"real" chain semantics — it is the same shape as a bilattice the corpus proves
carries two adjoint quantifier systems, one on a knowledge order and one on a
truth order, related by an explicit involution. Everything else in this note —
the WIT as time's quantum, a block as a settled fixed point, a taxonomy of
finality regimes, the J26 crystallization reading, gas as a coordination-cost
identification, and the relation between colony chains and a shared Union
chain — is argued from those two anchors, and the note closes by naming
exactly which of those arguments are carried by machine-checked Lean and which
are this note's own reading laid on top of that math.

## 1. Time is the least fixed point of a monotone closure

Knaster–Tarski, formalized standalone over any complete lattice with no
finiteness or continuity hypothesis
(`Obsmetrologia/Calculus/Order/KnasterTarskiStandalone.lean`), says: for a
monotone endomap `f` on a complete lattice `C`, define `lfp(f)` as the meet of
all *pre-fixpoints* — `⋀ {x | f(x) ≤ x}`. The theorem proves two things about
that meet: it is itself a fixed point (`lfp_fixed : f(lfp f) = lfp f`), and it
is the least one, both among pre-fixpoints and among fixed points
(`lfp_least`, `lfp_least_of_fixed`). Nothing about finiteness or a
Scott-continuity hypothesis enters; completeness of the lattice is the only
structure the argument uses, because the meet needs to exist.

Settling is exactly this construction specialized to the knowledge lattice of
valuations. The corpus's own definition: settling "iterates the closure
possibilize∘necessitate on the trace until the last valuation stops changing.
Termination is by Knaster–Tarski... the residue drains to zero, `H¹ = 0`"
(`settling.md`, the settling node under
`knowledge-least-valuation/settling/`). Each step of that iteration is
monotone in the knowledge order `≤ₖ`.

The claim this note needs is the next one, and it is where the proved math
ends and the reading begins: **monotonicity in `≤ₖ` is what an arrow of time
is.** The knowledge order has a least element `⊥ = ⟨0,0⟩` — nothing recorded —
and it rises only by recording evidence; negation preserves `≤ₖ` rather than
reversing it, and a correction is stated to add negative evidence rather than
delete positive evidence ("Corrections add negative evidence; they do not
delete history," `2026-07-19-a-prospective-constitution.md:207-209`). An order
that only rises and never retracts has a fixed past and an open future by
construction — which is the property a temporal dimension needs and a
symmetric order does not have. A blockchain is a machine purpose-built to
produce exactly that shape: a monotone, append-only accumulation with a fixed
past and an open future. Reading "the chain is where `≤ₖ` lives physically" is
therefore not decoration on top of "the chain has timestamps" — the
timestamps are evidence carried inside transactions, never the order itself,
which is why the corpus's own wall-clock-as-data lint exists at all: a system
clock reading is data about the world, not a claim about which transaction
came first.

## 2. WIT is the quantum of chain time

A WIT is defined as "one cover transition in the FOUR knowledge order for a
typed grounded predication" (`2026-07-19-a-prospective-constitution.md:41`).
FOUR carries two evidence bits `(pos, neg)`; one WIT flips exactly one bit:
`neither→true`, `neither→false`, `true→both`, `false→both`. The constitution
is explicit that a WIT is not an ERC-20 token and not a bearer asset (`:65-66`
— "WIT is not an ERC-20 token," "WIT is not a bearer asset"). The settlement's
glossary entry for the unit (`content/glossary/terms/wit.md`) goes further
than the constitution and ties the same distinction-step to three other
carriers at once: physically, one bit erased costs `kT ln 2` (Landauer);
topologically, "kept bits minus erased bits is the Euler characteristic (the
index balance `H⁰ − H¹ = χ`)"; in proof, the house standard prices
`Quot.sound` as one unpriced collapsed distinction. That cross-carrier
identification is exactly the move §8 below makes for gas specifically, and
it is worth flagging now that it is not this note's invention — the glossary
already commits to it as the unit's own definition.

The consequence for chain time: the atomic unit of the Union's knowledge and
the atomic unit of its time are the same object, one step up in `≤ₖ`. A chain
whose ordering totally orders WIT-bearing events denominates its own ticks in
witnessed distinctions rather than in seconds. This is also why the chain must
never collapse `⊤ = ⟨1,1⟩` (contradiction) down to a Boolean: doing so would
erase a witnessed distinction that was already paid for, which is to say it
would destroy time already recorded. The on-chain FOUR profile
(`FourMixConsensusProfile.sol`, in the ethereum-services-section) holds this
line structurally rather than by convention — its `Charge` struct is a literal
pair of booleans, `positiveEvidence` and `negativeEvidence`, with no ordinal
or single-bit encoding anywhere in the type.

## 3. The EVM's state/history split is a proved σ-conjugate adjoint bilattice

This is the section that does the real work, because it is where a genuinely
formalized result and a piece of blockchain architecture turn out to have the
same shape without anyone having designed the chain to match the theorem.

The corpus's predication substrate carries two parallel Lawvere quantifier
systems on one fibration: `∃ᵏ ⊣ f* ⊣ ∀ᵏ` on the knowledge order `≤ₖ`, and
`∃ᵗ ⊣ f* ⊣ ∀ᵗ` on the truth order `≤ₜ`. The load-bearing theorem
(`Language/Predicating/HyperdoctrineDual.lean`) is that the second system is
not a fresh construction independently bolted beside the first — it is the
**σ-conjugate** of it, where `σ` is the order-swap involution carrying
`(Charge, ≤ₖ) ≅ (Charge, ≤ₜ)`. Concretely: `galoisK_to_galoisT` is a generic
transport lemma — any `≤ₖ` Galois connection `L ⊣ R` conjugates through `σ` to
a `≤ₜ` Galois connection `(σ∘L∘σ) ⊣ (σ∘R∘σ)`. `dual_adjoint_system`
instantiates that transport at the fiber existential/universal quantifiers
and proves something stronger than "a dual system exists": it proves the
σ-transport of the knowledge-order quantifiers is *equal*, not merely
isomorphic, to the truth-order quantifiers that a separate module
(`Equality`) built independently and directly. Nothing is re-postulated —
two independently constructed adjoint systems are proved to be the same
system read through `σ`. `two_equalities_one_diagonal` runs the identical
argument one level down, showing the classical (`≤ₜ`) and paraconsistent
(`≤ₖ`) equality predicates are the same diagonal fiber pushed through the two
adjoint systems: `classicalEq = σ ∘ paraconsistentEq` pointwise.

Now read the EVM's native architecture against that structure:

| Bilattice axis | EVM structure | Character |
| --- | --- | --- |
| truth order `≤ₜ` (least `f`, greatest `t`) | state (mutable `stateRoot`) | revisable by later transitions; current disposition |
| knowledge order `≤ₖ` (least `⊥`, greatest `⊤`) | history (append-only blocks/receipts) | monotone, never retracted; time itself |

The EVM did not need Obsmetrologia's bilattice designed into it — it already
has a mutable, revisable current-state layer and an append-only,
never-retracted history layer, and those are exactly the two roles `≤ₜ` and
`≤ₖ` play in a proved dual adjoint system. A current balance is legitimately a
`≤ₜ` value: it can go up, go down, or be superseded, and none of that is a
correction to history. A finalized transaction is a `≤ₖ` fact: it can be
joined with more evidence but never retracted. Contract state that has to
hold an actual contradiction — both a positive and a negative claim live at
once — uses the explicit `(pos, neg)` bit pair from §2, never a collapsed
Boolean and never a bare FOUR ordinal, because either collapse would erase
the distinction the σ-conjugate structure exists to keep separate.

What is proved here is the σ-conjugacy of the two adjoint systems inside the
abstract predication hyperdoctrine. What is this note's reading, not a
formalized claim about the EVM, is the identification of `stateRoot` with the
`≤ₜ` carrier and the block/receipt log with the `≤ₖ` carrier — that step maps
a piece of software architecture onto a piece of proved order theory, and the
map is argued by structural resemblance (mutable vs. append-only, revisable
vs. monotone), not derived inside the Lean development.

## 4. A block is a settling fixed point; the lifecycle is articulate→predicate→posit→settle

The four base verbs the corpus stacks predication on — articulating,
predicating, positing, settling — map onto the transaction/block lifecycle
without needing to be stretched:

1. **articulate** — a transaction is submitted: a one-way act bringing an
   articulation into being, with no arrow back to the pre-relational mempool
   state.
2. **predicate** — it asserts a directed state transition `(subject,
   predicate, object)`, `from → to` under a call; predicating produces arrows
   that compose into a category, and transactions compose into the block's
   ordered trace.
3. **posit** — it is charged in FOUR: signature validity, nonce, balance, and
   gas are positive/negative evidence admitted or refused.
4. **settle** — block finality is §1's construction run on the trace:
   settling "iterates the closure... until the last valuation stops
   changing," terminating by Knaster–Tarski, with the residue draining to
   zero, `H¹ = 0` (`settling.md`).

A block, on this reading, is a settled fixed point of the state-transition
closure over an ordered transaction set: the EVM's transition function plays
the role of the closure, and the block boundary is where the fixed point gets
packaged and shipped. This is the same object the descriptive definition of a
block already names — a finite ordered context committing to its predecessor,
its admitted transactions, its receipts, and its successor state root — with
§1's fixed-point theorem supplying the reason that construction terminates
at all rather than merely being asserted to.

## 5. Finality is a choice of settling regime

Settling's closure carries what the corpus calls a regime signature: how far
the iteration has to run before it reaches its fixed point. The general cases
are strict-finite (`κ<ω`), Scott-continuous (`κ=ω`), transfinite-bounded, and
aperiodic (`κ≥ω₁`). One instance of the strict-finite case is proved directly
for causal orders: `causal_diffusion_gap_one`
(`CausalSets/Causal/Laplacian.lean`) states that applying the causal closure
twice equals applying it once — `causalLaplacian C (causalLaplacian C S) =
causalLaplacian C S` — and the proof is exactly `causalClosure_idem`: because
the causal precedence relation is *already transitively closed*, there is
nothing left for a second closure step to add. Diffusion over an
already-transitive order reaches its harmonic (future-closed) kernel in one
step, not in the limit of an infinite chain of steps.

That gives a real criterion, not just an analogy, for classifying finality
mechanisms by which settling regime they realize:

- Deterministic instant finality (BFT-style: Tendermint/CometBFT, single-slot
  finality) targets the strict-finite regime: the consensus closure is
  supposed to reach its fixed point in a bounded number of rounds, the same
  shape `causal_diffusion_gap_one` proves for an already-transitive causal
  order.
- Probabilistic finality (Nakamoto/longest-chain) is Scott-continuous
  (`κ=ω`): the fixed point is only the limit of an unbounded chain of
  confirmations, so "finalized" is asymptotic rather than strict-finite by
  construction.
- A chain that never durably finalizes is aperiodic: a floor of unsettled
  circulation that no finite sequence of closure steps discharges.

This taxonomy is this note's own extension of the proved regime vocabulary to
consensus mechanisms in general — `causal_diffusion_gap_one` is a theorem
about causal orders that are already transitively closed, not a theorem about
Tendermint or Nakamoto consensus specifically. What it licenses is the
observation that "one-step closure" and "BFT bounded-round finality" are the
same mathematical shape, which is enough to make the classification precise
rather than rhetorical, but the classification of any particular running
chain into one of these regimes still has to be checked against that chain's
actual consensus rules, not read off this note.

## 6. The crystallization front: J26 tessellates, the fivefold order does not

The corpus's crystallographic-restriction argument is an algebraic one about
spectral gaps, and it is precise enough to state exactly rather than gesture
at. `Flow.tile_gap_char_root`
(`Dynamics/Flow/ChromaticTileGap.lean`) proves that for `1 ≤ d ≤ 4`, the value
`2 − √d` is a root of the characteristic polynomial `x² − 4x + (4−d)` — the
spectral gap of a path-graph Laplacian at rotation order `N`, where `d ∈
{1,2,3}` gives the crystallographic orders `N ∈ {3,4,6}` (`cos(π/3)=½`,
`cos(π/4)=√2/2`, `cos(π/6)=√3/2`), plus the degenerate `N=2` case at `d=0`.
The pentagon's gap value sits at `d=5`, which needs a strictly larger leading
coefficient (`a=3` rather than `a=2`) to stay a quadratic surd at all —
`tile5_first_noncrystallographic_quadratic_surd` proves both halves of this
at once: `¬(5 ≤ 2·2)`, i.e. `d=5` falls outside the `a=2` crystallographic
family's bound, and the gap is still `√`-constructible one level up
(`tile5_gap_char_root`, at `a=3`). So the fivefold order is not excluded by
assertion; it is excluded because its specific spectral-gap value provably
does not fit the algebraic family that generates `{2,3,4,6}`, while still
being a well-formed quadratic irrational in its own right.

Read onto the chain: finalized state is the crystallized J26 lattice — three
dimensions of committed information (state) plus one dimension of
temporality given by block ordering. The J26 quarter-turn gyro between
adjacent cells — the twist that makes gap-free space-filling possible at all —
would be read as each block reorienting relative to its predecessor. The
mempool, the pre-finality zone, would be the whirling zone: unsettled order
with no rest frame, never booked to a single position until it crystallizes,
because the order it would need to occupy is exactly the one the
crystallographic-restriction theorem excludes. A pending transaction has no
settled position in the temporal lattice; finality is its crystallization
into the tessellation, and the chain tip is the crystallization front.

This section is the most interpretive one in the note and should be labeled
as such precisely. The crystallographic restriction and the fivefold
exclusion above are proved. Grepping the full Obsmetrologia tree for any
declaration connecting J26 specifically to one-dimensional temporality, or
any `sheafLaplacian`-over-J26-cell-faces construction, returns nothing beyond
the single-cell combinatorial development in `AperiodicOrder/Tiling/J26.lean`
(vertices, edges, faces, the quarter-turn gyro between the two prisms, and a
cell-complex incidence structure) — there is no honeycomb/tiling-of-space
carrier and no Laplacian-over-faces object in the tree at all. "J26 carries
one-dimensional temporality" and "cross-cell interfaces are a sheaf Laplacian
over J26 faces" are therefore this note's thesis, resting on real proved
boundary mathematics (the crystallographic restriction), not a formalized
claim about J26 itself.

## 7. One Union chain, not a chain per colony — corrected against the settlement's own law

A draft of this argument (and an earlier working note under this file's
history) proposed that "L2" names a recursive tower — one chain per colony,
each colony's chain anchoring to a nation-chain, nations to the Union, so that
"every chain but the sovereign root is an L2 of its parent." That picture
traces to informal leader-speech transcripts, not to any adopted record, and
checking it against the settlement's own current constitutional text
(`2026-07-19-a-prospective-constitution.md`, five days prior to this note and
not superseded by anything later in the corpus) shows it is not what the
Union actually settled:

> "The Union operates one shared chain as its common finalized
> settlement-time coordinate. That chain belongs to the whole Union of
> Harmonious Colonies, not to any constituent colony, machine, session, or
> ambient operator." (`:192–197`)

> "Settlements may additionally bind accounts and sell or purchase services on
> external EVM and non-EVM chains. Each contract names its execution chain...
> External chains are settlement arenas and possible parent chains; none
> substitutes for the Union's own shared settlement-time coordinate."
> (`:199–212`)

So the constitution settles a flatter structure than recursive per-colony
nesting: there is exactly one Union chain acting as shared coordinate time,
and any other chain a settlement touches is an external arena or a possible
parent — not a local proper-time chain slotted into a colony-by-colony L2
tower. The recursive-nesting reading should be treated as discarded, not
carried forward as an open question.

What survives this correction, and is better grounded once the recursive
picture is dropped, is the causal-geometry argument underneath it. The corpus
proves general cone-field geometry for causal orders
(`CausalSets/Causal/Cone.lean`): `causal_reachability_is_cone_geometry`
bundles reflexivity, transitivity, and antisymmetry of causal precedence with
symmetry of `Spacelike x y := ¬reaches x y ∧ ¬reaches y x` and transitivity of
future cones, all in one theorem. That is a proved fact about any causal
order, independent of how many chains realize it. Two events recorded in
different settlements' local EAVT/RWIL histories with no cross-settlement
transaction between them are spacelike-separated in exactly this sense — they
have no forced order, and nothing should give them one by wall-clock. Lamport
happened-before is a partial order; extending it to a total order is a
protocol artifact, and the constitution's own description of the Union
chain's job — "it orders the Union's nonfactorable commitments" without
"acquir[ing] a global view of settlement interiors" — is that protocol
artifact stated in the settlement's own words: one shared chain performing
the causal-partial-order-to-total-order extension, not a tower of
local-time chains whose existence has to be inferred from conversation.

## 8. Gas is a coordination-cohomology cost, and one step of the identification is definitional rather than derived

`Cohomology/CoordinationCohomology.lean` builds the source–stance bipartite
nerve of a federated cover (`CoverNerve`, with counts `entities`, `cells`,
`components`) and proves the coordination cost of gluing local sections is
the rank of `Ȟ¹` of that nerve. Precisely: `h1_vanishes_iff_forest` proves
`N.H1rank = 0 ↔ N.entities = N.cells + N.components` — the obstruction
vanishes exactly when the nerve's Euler characteristic equals its component
count, i.e. the nerve is a forest. `h1rank_is_coordination_cost` restates the
rank itself as `N.cells - (N.entities - N.components)` — the number of cells
in excess of a spanning forest, each one an irreducible coordination
obstruction. `tree_coordination_free` is the fully graph-backed witness of
the easy direction: any finite tree's nerve has `H1rank = 0`, using only the
tree's own spanning identity `|E| + 1 = |V|`, no separate assumption.

`Cohomology/LandauerEntropy.lean` then names that same rank thermodynamically
— but it is worth being exact about what kind of theorem does that naming,
because it is weaker than "an independently derived physical quantity turns
out to agree with a topological one." `landauerBits` is *defined* as
`N.H1rank` (`def landauerBits (N : CoverNerve) : Nat := N.H1rank`), and
`landauer_eq_coordination_cost` — "the entropy is the cycle count" — is proved
by directly citing `h1rank_is_coordination_cost`'s first component. The
identification of Landauer entropy with coordination cost is a naming
decision backed by a definitional unfolding, not two independently
constructed quantities shown equal the way §3's dual adjoint system was. That
is still a coherent and useful identification — it is exactly the same move
the `wit.md` glossary entry makes when it ties one witnessed distinction to
one erased bit — but it should not be cited as though it carries the
evidentiary weight of an independent agreement between two different
formalisms.

Reading this onto the chain: each face between colony cells is where two
settlements' local states overlap, and a cross-colony settlement transaction
glues two local sections into one global section — gluing being the least
upper bound in the knowledge order. Gas consumed at such a seam is this
note's candidate identification with the `Ȟ¹` rank of that gluing: the number
of independent cycles the merge has to reconcile. Coordination-free merges
(forest-shaped covers, CRDT/CALM-style convergence, `H¹=0`) are cheap by this
account; cyclic merges cost gas proportional to the erasure they force. That
gas prices coordination, and that coordination is provably distinct from
economic value (value is what the books and the customer's released effect
record; gas on this reading is the Landauer-bits cost of the seam) is the
strongest part of this section, resting on the proved cohomology rank
directly. Whether every FOUR-divergent pair actually requires an on-chain
settlement — the bridge from local disagreement to a required chain
transaction — remains an open, unformalized question; this note does not
resolve it.

## 9. What is proved, and what is this note's own argument

Proved in Lean, no `sorry` in the cited files, matching the house axiom-free
standard (verified directly against the source, not assumed from the
citation):

- Knaster–Tarski's least-fixed-point theorem over any complete lattice, with
  the least-fixed-point construction proved both a fixed point and least
  (`Calculus/Order/KnasterTarskiStandalone.lean`).
- The truth-order adjoint quantifier system is the σ-conjugate of the
  knowledge-order one, and the σ-transport is proved *equal* — not merely
  isomorphic — to an independently built truth-order system
  (`Language/Predicating/HyperdoctrineDual.lean`: `galoisK_to_galoisT`,
  `dual_adjoint_system`, `two_equalities_one_diagonal`).
- A causal closure over an already-transitively-closed order reaches its
  fixed point in one step (`CausalSets/Causal/Laplacian.lean`:
  `causal_diffusion_gap_one`).
- The general cone-field geometry of any causal order — cones, spacelike
  separation, causal diamonds — as one bundled theorem
  (`CausalSets/Causal/Cone.lean`: `causal_reachability_is_cone_geometry`).
- The crystallographic-restriction algebra: the `{2,3,4,6}` family of
  spectral-gap characteristic roots and the pentagon's gap falling outside
  that family's bound while remaining a well-formed quadratic surd
  (`Dynamics/Flow/ChromaticTileGap.lean`: `tile_gap_char_root`,
  `tile5_first_noncrystallographic_quadratic_surd`).
- The coordination-cohomology iff and cost, and the tree witness
  (`Cohomology/CoordinationCohomology.lean`: `h1_vanishes_iff_forest`,
  `h1rank_is_coordination_cost`, `tree_coordination_free`), with the Landauer
  naming (`Cohomology/LandauerEntropy.lean`: `landauer_eq_coordination_cost`)
  a definitional unfolding of that same rank, not an independent derivation.
- The FOUR profile's on-chain evidence-bit encoding as literal source
  (`FourMixConsensusProfile.sol`'s `Charge` struct).
- The Union's one-shared-chain structure, quoted directly from the
  settlement's own current constitutional record
  (`2026-07-19-a-prospective-constitution.md:190–212`).

This note's own argument, not formalized anywhere in the corpus:

- That monotonicity in `≤ₖ` *is* an arrow of time, rather than merely being
  consistent with one (§1).
- The identification of the EVM's `stateRoot` with the `≤ₜ` carrier and its
  block/receipt log with the `≤ₖ` carrier (§3) — the σ-conjugacy is proved;
  the mapping onto EVM architecture is this note's reading of it.
- The classification of specific consensus mechanisms (BFT, Nakamoto, a
  never-finalizing chain) into the strict-finite/Scott-continuous/aperiodic
  taxonomy (§5) — the one-step-closure fact is proved for already-transitive
  causal orders, not for any named consensus protocol.
- The entire J26-crystallization-as-block-ordering reading, including "J26
  carries one-dimensional temporality" and "colony seams are sheaf Laplacians
  over J26 faces" (§6) — confirmed to have no Lean carrier anywhere in the
  tree beyond the single-cell combinatorial development.
- That gas specifically, as opposed to some other chargeable quantity, is the
  right thing to identify with the `Ȟ¹` coordination-cohomology rank at a
  cross-colony seam (§8).
- Whether every FOUR-divergent pair requires an on-chain settlement (§8),
  left open.

The recursive per-colony chain-nesting picture from an earlier draft of this
argument is not carried forward at all: checked against the settlement's own
constitution, it is superseded by the flatter one-shared-chain structure
quoted in §7.
