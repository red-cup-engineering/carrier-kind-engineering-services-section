---
title: "Imagining the tower regime: the whole loop as a turn-carrying node, and the foam of such nodes"
description: "What the tower regime of the cascade (the whole MAPE-K loop across SignCell, SignChain, SignGraph and SignCraft) does in operation as part of the next-generation AI the README describes, built only on what the adversarial check confirmed: a node is a position on the regime spiral (RegimeCycle.Turn) carrying a trace of articulatings, a measured valuation, a settled valuation, a per-cell tally record and a lap residue; its four moves are the four stages of Stage.next; its laps are the spiral of iterSeq_residueBump and dervish; it publishes ahead and germ certificates instead of states; many such nodes over a site are a foam whose films are the Landauer bits of a cover nerve, whose composite regime is computed by ClosureRegimeData.both, whose clock is the dyadic odometer and whose crossings are weave readings. Every mechanism is a named Lean structure or a precisely stated extension of one, marked which; the sigma/Delta rung conflict is reported to the founder, not smoothed over; worked examples use real FOUR readings, real rules, real words and real crossings."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - cascade-imagine
  - regime-tower
  - regime-cycle
  - turn
  - residue
  - dervish
  - ahead-certificate
  - germ-certificate
  - regime-gate
  - regime-composition
  - autopoiesis
  - cover-nerve
  - landauer-entropy
  - odometer
  - weave-draft
  - mape-k
  - foam
  - signstuff
  - obsmetrologia
status: imagine-stage-note-built-on-the-adversarial-check-not-yet-reviewed-by-the-founder
produced-by: imagine stage, regime "tower" (Claude Fable 5.1), reading Obsmetrologia and ObsmetrologiaFibercraft Lean statements and the signstuff JavaScript directly at the checked-out working tree, after the 2026-10-08 adversarial check of the tower regime
---

# Imagining the tower regime: the whole loop as a turn-carrying node, and the foam of such nodes

## 0. What this note stands on, and how to read its marks

This is the IMAGINE stage for the regime called "tower": the whole loop of the README
(MAPE-K; `/home/emsenn/bare-cedar-fog/README.md` lines 10 to 25) across the four libraries SignCell,
SignChain, SignGraph and SignCraft. It builds only on what the adversarial check
`2026-10-08-cascade-check-tower.md` (beside this note, "the check") confirmed, and it keeps the
check's corrections. Where the governing cascade note
(`2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md`,
"the note") said something the check marked WRONG or UNSUPPORTED, this note does not repeat it.

The corrections kept, in one list, so the reader can hold the imagining to them:

1. The library's cascade object is the **four-stage cycle** `Stage.next` with a **spiral lift**
   `Turn`, in `Closure/RegimeCycle.lean`; not `BigradedTower` (a K4-graded family of nuclear squares
   on one algebra) and not `SettlementSpiral` (Padovan/Fibonacci/n-bonacci number theory, which
   disavows the regime map). Rank descends 3 to 0 along the spine by a declared table
   (`spine_rank_table_descends`, marked OPEN in-file) and returns 0 to 3 in one jump
   (`return_rank_table_ascends`). No Lean statement gives a stepwise strict, Scott, transfinite,
   aperiodic realization pass; "algebra, logic, language, geometry" are the founder's names, not
   the library's.
2. Regimes are **declared** (`Stage.regime`, `ClosureRegimeData` flags, `classify`), with one
   derived family of carriers per rung (`regime_tower`) and a three-flag gate (`RegimeGate`).
3. **Sigma and Delta.** Every `Order.Nucleus` in Lean carries `idem` as a field. The library proves
   `mu` is the identity at strict and Scott (`mu_identity_of_cohomologyVanishes`), proves lax slack
   impossible on any antisymmetric carrier (`no_laxSlack_of_antisymm`), and inhabits lax slack only
   on the germ preorder of record sequences, filed at the aperiodic rung (`tally_lax_slack`,
   `mu_content_exactly_at_valued_gate`). The founder's correction ("KZ-lax in the Scott regime")
   conflicts with this filing. Section 5 designs the loop so that it is right either way and states
   the decision the founder has to make.
4. **Two different H1s** exist in Lean: the Cech `H1` of `SettlingCohomologyH1`, which vanishes
   for every datum in every regime, and the cycle rank `CoverNerve.H1rank` of
   `CoordinationCohomology`, which `LandauerEntropy` names in bits. This note uses the second for
   the foam's films and says so each time.
5. `Cohomology/DifferentialBypass.lean` is the mu/nu agreement certificate of closure algebra and
   settling coalgebra, not the economics notes' distal bypass. Not conflated here.
6. One `sorry` exists (`Closure/Collatz/SemigroupGap.lean:406`); the library is not sorry-free.
7. In the code, `runMachineAction` (`signcraft/src/inference/kernel.mjs`) has four actions, an
   always-empty `effects` list, and a `tell` that accepts caller-supplied readings. There is no
   node loop in the tree. What follows is therefore an imagining of a thing to be built, anchored
   in theorems, not a description of a thing that runs.

Marks used below:

- **[LEAN]** a named Lean structure, definition or theorem, cited by file and name. The claim is what
  the statement says, not what its docstring says.
- **[EXT]** a precisely stated extension of a named Lean structure: new data or a new theorem whose
  statement is written out here and whose proof is not in the tree.
- **[FRAME]** the founder's frame or this note's design reading, not a Lean fact.
- **[CODE]** a fact about the JavaScript as it is.

Lean root `L/` is `lib/.../obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/`.
Fibercraft root `F/` is `lib/.../fibercraft-services-section/lib/obsmetrologia-fibercraft/ObsmetrologiaFibercraft/`.
Code root `S/` is `lib/.../computer-engineering-services-section/lib/signstuff/`.

FOUR is `Reading := Articulating.Corner` (`L/Language/Positing/Reading.lean:31`), with the poles
`kBot := absurd` (told neither, ⊥), `tTop := potential` (told true only, **t**),
`tBot := active` (told false only, **f**), `kTop := stable` (told both, ⊤) (`Reading.lean:52-58`);
`ofSlots p n` builds a reading from the two told-bits, `joinK` is the knowledge join, `negate`
swaps the two sides (`Reading.lean:40,63,71`).

## 1. The tower regime's model, named: a turn-carrying node

The regimes "algebra", "logic", "language", "geometry" each have a model of their own in the
sibling IMAGINE notes. The tower regime's model is not a fifth model beside them. It is the thing
that **carries** them around the loop and **returns**: the position on the spiral, the lap counter,
the residue a lap leaves behind, and the certificates a lap can publish. It owns exactly the edge
the other four do not: `Stage.next Stage.settling = Stage.articulating`.

### 1.1 State

A node in the tower regime is the following record. Each field has a Lean type or a marked
extension.

| field | type | mark | where |
|---|---|---|---|
| `turn` | `Turn` = ⟨`lap : Nat`, `stage : Stage`⟩ | [LEAN] | `L/Closure/RegimeCycle.lean`, `structure Turn` |
| `trace` | `List Articulating` | [LEAN] | `L/Articulation/Articulating.lean`, `inductive Articulating` (`utter`, `pair`) |
| `k` | `Contradictory` (the involution pairing each claim with its denial mark) | [LEAN] | `L/Language/Positing/Measure.lean`, `structure Contradictory` |
| `measured` | `CValuation := measured k trace` (a `Valued` at every cell: a reading plus its two witness lists) | [LEAN] | `Measure.lean`, `def measured`, `def measure`; `L/Language/Positing/Evidence.lean`, `structure Valued` |
| `closure` | `Reading.Closure` (inflationary, monotone, idempotent by field) | [LEAN] | `L/Language/Settling.lean:65`, `structure Closure` |
| `settled` | `Valuation := CValuation.settle closure measured` | [LEAN] | `L/Language/Settling/Cones.lean`, `def settle` |
| `brim` | `Valuation := CValuation.brim closure measured` | [LEAN] | `Cones.lean`, `def brim` |
| `tally` | `PredicationCell → Record` | [EXT 1] | `L/Language/Positing/Record.lean`, `structure Record` (pos, neg : Nat); extension below |
| `residue` | `Record` (what this lap added, summed over cells) | [LEAN]/[EXT 1] | `RegimeCycle.lean`, `def Record.residueBump`, `def Turn.carried` |
| `regime` | `ClosureRegimeData` and the three gate flags | [LEAN] | `L/Closure/Regime.lean`, `structure ClosureRegimeData`; `L/Closure/RegimeGate.lean`, `hasFixedPoint`, `attainedAtFiniteStage`, `weaklyQuiescent` |
| `certificates` | an `AheadCertificate` or a `GermCertificate` for the orbit of the carried record, when one exists | [LEAN] | `RegimeCycle.lean`, `structure AheadCertificate`, `structure GermCertificate` |

**[EXT 1] The per-cell tally.** Lean's `measure k trace φ` returns a `Valued` whose `evidence`
is a pair of witness lists (`Measure.lean`, `def measure`: `(witnesses φ trace, witnesses
(φ.contradictory k) trace)`). Define

```
def Record.ofValued (x : Valued) : Record := ⟨x.evidence.1.length, x.evidence.2.length⟩
```

and the claim to prove: `Record.reading (Record.ofValued x) = x.presence`, where
`Record.reading r := Reading.ofSlots (r.pos != 0) (r.neg != 0)` (`Record.lean:329`) and
`Valued.presence` is the reading of which sides are nonempty (`Evidence.lean:56`). This is a
one-line structural fact about `List.length` and `List.isEmpty`; it is not in the tree. With it,
the node's `tally φ := Record.ofValued (measured φ)` is the **record** carrier of the regime tower
(`regime_tower`'s second conjunct is about `Record.succPos`, the one-step tally increment,
`Regime.lean:293`), and `tally φ |>.reading` is its **FOUR** quotient. The node therefore holds, at
every cell, both the antisymmetric quotient (a reading) and the thing it quotients (a tally). This
is the whole of section 5's design.

### 1.2 Moves

The node has exactly one move, `Turn.advance` (`RegimeCycle.lean`, `def Turn.advance`), and what
it does depends on the stage. The regimes in the third column are the declared table
`Stage.regime` (`L/Closure/Regime.lean`, `def Stage.regime`); the ranks are `ClosureRegime.rank`
(`RegimeCycle.lean`). The MAPE-K letters are this note's proposal [FRAME]: the README names MAPE-K
once and does not assign letters to stages (check, section 5).

| stage | regime (table) | rank | what the node does | MAPE-K [FRAME] | Lean |
|---|---|---|---|---|---|
| `articulating` | aperiodic | 3 | appends articulatings to `trace`: its own effects (`pair u a`, an utterance articulated over a further articulating) and the articulatings other nodes hand it | E (execute) and the start of the next M | `Articulating.pair`, `Articulating.head`, `Articulating.depth` |
| `predicating` | transfiniteBounded | 2 | reads each new articulating's oriented cell `⟨head.token, head.claim, tail.head.token⟩` (reflexive on the floor) | M (monitor: which cells are in play) | `L/Language/Predicating/Oriented.lean`, `def orientedCell`; `L/Language/Spine.lean`, `def predicate` |
| `positing` | scott | 1 | **measures** the reading at every cell from the trace, never accepts one: for-witnesses are the head tokens of articulatings on `φ`, against-witnesses those on `φ.contradictory k` | A (analyze: evidence substrate) | `Measure.lean`, `def measure`, `theorem measure_measured`, `theorem no_denial`, `theorem measure_contradictory_negate` |
| `settling` | strict | 0 | closes the measured valuation; computes `settle` and `brim`; the cells where they differ are `Void`; publishes the fixed point | P (plan: the settled valuation is the plan) | `Cones.lean`, `def settle`, `def brim`, `def Void`, `theorem settle_le_brim`; `Settling.lean`, `theorem settle_fixed` |
| return | strict → aperiodic | 0 → 3 | `lap + 1`; the lap's residue is added to the carried record | K (knowledge: what persists across laps) | `RegimeCycle.lean`, `Turn.advance ⟨l, settling⟩ = ⟨l+1, articulating⟩`, `theorem Turn.advance_four`, `def Turn.carried` |

Facts about the move as the library states them:

- Four advances return the stage and add one lap: `t.advance.advance.advance.advance =
  ⟨t.lap + 1, t.stage⟩` (`theorem Turn.advance_four`) [LEAN].
- No stage is its own successor (`theorem Stage.next_ne`) [LEAN]; the period is exactly four
  (`theorem Stage.next_four`) [LEAN].
- The spine is the measured composite: `Spine.run closure k trace a := runTrace closure k
  (a :: trace) (predicate a)`, and `run_pos`: the settled reading at the articulated cell has
  `pos = true` ("what is articulated is told for") (`L/Language/Spine.lean`) [LEAN]. The node's
  positing stage is `Spine.measure`, not `Spine.posit`; `posit` and `runSupplied` exist in the same
  file and admit a caller-supplied reading, and the node must not call them (check, C1.3d).
- Evidence has an arrow of time: `measure_cons_le`, prepending an articulating only climbs the
  measured value in `≤ₖ` (`Measure.lean`) [LEAN]. So within one lap the measured valuation is
  monotone in the trace, and the settled valuation is monotone in the measured one
  (`Reading.Closure.mono`).

### 1.3 What a lap is, in one sentence each per library

[FRAME] The four libraries are the four stages' carriers in the house layering (data, code,
networking, systems; `AGENTS.md`; the check confirms the `package.json` layering and confirms that
nothing ties it to a regime). Read as what a lap touches:

- **SignCell (data)** holds the trace's cells with their witness sets and FOUR value (the `Valued`
  shape; [CODE] `S/signcell/src/cell.mjs` header: "This is Obsmetrologia's Valued", content-addressed
  by triple alone so identity does not move when evidence arrives).
- **SignChain (code)** holds the closure the settling stage applies (rules; [CODE]
  `S/signcraft/src/settle.mjs` imports `fireRuleIn` from `@red-cup-engineering/signchain/rules`).
- **SignGraph (networking)** holds the site, the cover and the nerve over which many nodes'
  valuations are compared ([CODE] `S/signgraph/src/cohomology.mjs`: "the foam's wall graph",
  `H¹` rank = cycle rank, imports `coverNerve`, `h1Rank` from metrologic's coordination-cohomology).
- **SignCraft (systems)** holds the history and the settlement ([CODE] `S/signcraft/src/history.mjs`:
  "A revision observes its parents; it never orders concurrent observations by arrival";
  `settle.mjs` reports a closure ordinal and reads a regime name off it).

The tower regime's model adds to these the `Turn`, the residue and the certificates, which none of
the four libraries has today [CODE: the check, section 8, found no lap, no residue, no certificate].

## 2. What flows in and what flows out

The check established that the only passages in Lean are the descent along the spine (rank 3 to
0, table) and the return (rank 0 to 3, one jump). So the tower regime's model has exactly two
ports.

**In, at rank 3 (articulating).** Articulatings. From the world: an utterance `⟨token, claim⟩`
(`Utterance`, `L/Articulation/Articulating/Utterance.lean:47`) made of two `Mark`s, each a
`String` surface (`L/Primitive/Mark.lean:15`), wrapped as `utter u` or composed as `pair u a`.
From other nodes: their articulatings, handed over the site. From itself: the effects it executed
last lap, which are articulatings too (section 1.2, row 1). Nothing else enters. In particular no
reading enters (`Spine.run`), no rule enters mid-lap (the closure is fixed for the lap), and no
regime flag enters (the flags are the node's own declaration, section 4.3).

**Out, at rank 0 (settling).** The settled FOUR valuation `settled : Valuation`, the brim, the void
(the cells where they differ), and the per-cell tallies. These are what the algebra regime's model
(SignCell) consumes as its data. The check's row 1 point stands: `Meme := ⟨cell, reading⟩` carries
no regime field, so what flows out at rank 0 is readings and tallies; the regime is carried by the
node, not by the value (section 4.3 proposes the pairing as [EXT]).

**The return edge, owned by the tower.** From rank 0 back to rank 3 the node does three things
none of the regimes' own models does: it increments `lap`, it adds the lap's residue to the
carried record (`Turn.carried c s ⟨lap+1, _⟩ = residueBump c (Turn.carried c s ⟨lap, _⟩)`, by
`def Turn.carried` and `def Record.iterSeq`), and it decides whether to publish a certificate
(section 4). The founder's cascade (realization through logic and language) would be further
structure on this edge [FRAME]; the library gives the edge as one jump and this note leaves it so.

**Across laps.** The one thing that persists is the carried record and the trace. The trace grows
by what was articulated; the carried record grows by the residue. Everything else (measured,
settled, brim, void) is recomputed from the trace each lap. This is SignCraft's own discipline
([CODE] `history.mjs`: query indexes are "disposable readings of that carrier") made the law of
the loop.

## 3. The lap and the residue: why the loop is a spiral and not a circle

This is the library's one proved account of "what happens when the loop goes round again", and it
is the heart of the tower regime.

### 3.1 The theorems

All in `L/Closure/RegimeCycle.lean`, namespace `Record` unless noted [LEAN]:

- `def residueBump (c : Record) (s : Nat → Record) : Nat → Record := fun n => add (s n) c`: add one
  residue to every term of a record sequence.
- `theorem iterSeq_residueBump (c) (k) (s) (n) : iterSeq (residueBump c) k s n = ⟨(s n).pos + c.pos * k,
  (s n).neg + c.neg * k⟩`: **the tiling**, `k` laps add `k` copies of the residue.
- `theorem residue_dichotomy (c)`: if `c = kBot` then every iterate equals the seed; if `c ≠ kBot`
  then the bump fixes no sequence, consecutive iterates are never equal, and every iterate is
  mutually `DomBy` with the seed (one germ class).
- `theorem residue_topMass (c) (s) (k) (n) : topMass c * k ≤ topMass (iterSeq (residueBump c) k s n)`:
  after `k` laps every term carries at least `k` copies of the residue's contradiction mass
  (`topMass r := min r.pos r.neg`, `Record.lean:386`).
- `def Balanced (c : Record) : Prop := c.pos = c.neg`.
- `theorem balanced_residue_holds_bias (c) (hc : Balanced c) (s) (k) (n)`: along a balanced
  residue's orbit, `(iter k).pos + (s n).neg = (iter k).neg + (s n).pos` (bias fixed, cross-added
  to stay in `ℕ`) and the contradiction mass grows by at least `topMass c` per lap.
- `theorem unbalanced_residue_drifts (c) (hc : ¬ Balanced c) (s) (k) (n)`: one lap moves told-true
  against told-false by the imbalance; no two laps share a bias.
- `theorem dervish (c) (s)` (namespace `Obsmetrologia`): for every `Turn`, four advances return
  the stage; if `c ≠ kBot`, four advances never return the carried record and every carried record
  is mutually `DomBy` with the seed; if `c = kBot`, every position carries the seed.

### 3.2 What they mean in operation

The residue `c` of a lap is the record of what the lap told that was not already told: the new
witnesses, counted. [EXT 1] gives it as a `Record` per cell; sum over cells for the lap's scalar
residue, or keep it per cell (section 3.4).

- **Residue `kBot`: the node is a thermostat.** `dervish`'s third conjunct: the spiral is a circle,
  every position carries the seed. Nothing was learned; the loop is a fixed point of the loop. A
  node whose every lap has residue `kBot` is, as data, dead (section 6.7 uses this as the
  definition).
- **Residue nonzero: the node never repeats.** `dervish`'s second conjunct. The stage comes back
  (the node is doing the same four things), the record never does. The orbit stays in one germ
  class (`DomBy` both ways): there is a representative `s` and every lap's record is within a
  bounded difference of it. That is what "a steady state that is a class, not a point" means
  (section 4.2).
- **Balanced residue: contradiction accumulates, bias holds.** A lap that told as much against as
  for (the canonical case `topBump`, residue `⟨1, 1⟩`, `theorem topBump_eq_residueBump`) leaves the
  node's truth bias exactly where it was and raises its `topMass` by one. Operationally: the node is
  hearing both sides equally; its FOUR reading at those cells is `kTop` and stays `kTop`; what grows
  is how much contradiction it has held. The check (section 6, item 5) is right that the library
  calls this residue, not improvement; this note takes that literally: **the carried contradiction
  mass is the node's record of unresolved disagreement, and it is monotone**. A film of the foam
  (section 6.2) is thick in proportion to it.
- **Unbalanced residue: bias drifts.** A lap that told more for than against moves every term's
  bias by the imbalance. This is the only thing in the library that changes direction across laps,
  and it is exactly the shape of learning that the FOUR quotient cannot see: `Record.reading
  ⟨k, 0⟩ = tTop` for every `k ≥ 1` (`reading_not_injective`, `Record.lean:371`), so the reading is
  constant while the tally drifts. **A node that only kept readings could not learn across laps;
  a node that keeps tallies can.** This is the operational reason the node holds both (section 5).

### 3.3 The one guarantee an LLM does not have

`dervish` is a theorem that a nonzero-residue loop never returns to a prior data state. An
autoregressive model has no such statement about its own iteration; it can and does repeat. The
tower node, given that its laps have nonzero residue, cannot. It is not a claim of improvement
(the check is right); it is a claim of **irreversibility as data**, and it is proved.

### 3.4 [EXT 2] Lap-indexed residue

Lean's residue is one fixed `c`. In operation the residue differs lap by lap. State the extension:

```
def Record.residueSeqBump (c : Nat → Record) (k : Nat) (s : Nat → Record) : Nat → Record :=
  fun n => add (s n) (partialSum c k)        -- partialSum c k := Σ_{i<k} c i
```

with the claims to prove: (i) `partialSum` generalizes `iterSeq_residueBump` (take `c` constant);
(ii) if `c i ≠ kBot` for all `i` then consecutive stages differ and no stage is fixed (the
`dervish` second conjunct); (iii) if `c i` is balanced for all `i`, bias holds
(`balanced_residue_holds_bias` lap by lap); (iv) `DomBy` with the seed both ways holds when
`partialSum c k` is bounded over `k` and fails otherwise (the germ class may be left: a node whose
residues do not stay bounded leaves its class, which section 4 reads as a change of certificate).
None of this is in the tree; all of it is elementary arithmetic in the style of
`iterSeq_residueBump`.

## 4. Certificates: the node runs ahead of its own iteration

### 4.1 The two shapes

`L/Closure/RegimeCycle.lean`, section (D) [LEAN]:

```
structure AheadCertificate {α} (le : α → α → Prop) (step : α → α) (orbit : Nat → α) where
  limit : α
  unreached : ∀ k, orbit k ≠ limit
  below : ∀ k, le (orbit k) limit
  least : ∀ b, (∀ k, le (orbit k) b) → le limit b
  fixed : step limit = limit

structure GermCertificate {α} (le : α → α → Prop) (step : α → α) (orbit : Nat → α) where
  representative : α
  collapse : ∀ k, le (orbit k) representative ∧ le representative (orbit k)
  moving : ∀ k, orbit (k + 1) ≠ orbit k
  unfixed : ∀ x, step x ≠ x
```

- `theorem AheadCertificate.jump`: there is a fixed point no finite stage reaches.
- `theorem AheadCertificate.limit_unique`: over an antisymmetric order two ahead certificates
  agree on the limit.
- `def omega_ahead : AheadCertificate ORecord.OKLE ORecord.osuccPos omegaOrbit` with
  `limit := ORecord.omegaPos` (`ORecord` is the completed record, `Option Nat` coordinates with
  `none` for ω, `Record.lean:591,771`).
- `def residue_germ_ahead (c) (hc : c ≠ kBot) (s) : GermCertificate Record.DomBy (residueBump c)
  (fun k => iterSeq (residueBump c) k s)` with `representative := s`.
- `theorem gap_flags_split (r)`: `HasGap r ↔ (hasFixedPoint r ∧ ¬ attainedAtFiniteStage r) ∨
  (¬ hasFixedPoint r ∧ weaklyQuiescent r)`: a gap is exactly the ahead shape or the germ shape, read
  off the gate's flags (a finite check of tables, as the file says).
- `theorem gap_flags_beside_certificates`: strict and Scott have no gap; transfinite-bounded has a
  gap, `hasFixedPoint = true`, and `omega_ahead` inhabits it; aperiodic has a gap, `hasFixedPoint =
  false`, and every nonzero residue gives a germ certificate. The file's own OPEN comment: the
  pairing of a certificate with a rung is the house's reading, not derived from a closure.

### 4.2 What the node does with them

**A node publishes certificates, not stages.** This is the single most consequential design
choice in this note and it is forced by the shapes above.

- At the strict rung (settling, FOUR), the node needs no certificate: `spine_settles_by_three`
  (`Regime.lean`): every inflationary endomap of FOUR fixes `iter f 3 x`. The settled valuation is
  attained, and the node hands it on. This is the only rung where "the state" is a complete report.
- At the ahead shape, the node holds a tally orbit whose completion it can name without reaching
  it. Worked: a cell told true on every lap and never against has tallies `⟨k, 0⟩`; in `ORecord`
  the orbit is `iter osuccPos k kBot = ⟨some k, some 0⟩` (`ORecord.iter_osuccPos_pos`), the limit
  `omegaPos = ⟨none, some 0⟩` is fixed (`osuccPos_omegaPos`), never reached
  (`iter_ne_omegaPos`), above every stage (`iter_le_omegaPos`) and least among bounds
  (`omegaPos_least`). The node publishes `omegaPos`: "this cell is told true at the limit of my
  iteration, and I will not reach that limit at any finite lap." A consumer that holds this
  certificate acts on the limit and need not wait for lap `k+1`. Its reading is `tTop` either way;
  the certificate says something the reading cannot: that the orbit has a completion and where it
  is.
- At the germ shape, the node holds an orbit with no fixed point at all but a bounded drift from a
  representative. It publishes `⟨representative, collapse, moving, unfixed⟩`: "I will never settle
  as data, and I will never leave this class." For the balanced residue `⟨1, 1⟩` the representative
  is the seed and the covering constant after `k` laps is `⟨k, k⟩` (`topBump_flux`, `Record.lean:1044`).
  A consumer that holds this certificate knows the node's FOUR reading at those cells is `kTop`
  forever and that asking again will not change it; it also knows the node is alive (section 6.7).

**Where ahead-ness comes from in practice.** [FRAME] A node can issue an ahead certificate when its
closure is a finite-antecedent rule system: `Closure.Scott.finite_antecedent_scott_continuous`
(`L/Closure/Scott.lean:298`) says `fire ante concl (sup S) = sup (S.map (fire ante concl))` for
every directed family; so the firing at the limit is determined by the firings at the stages, and
the node can compute the limit from a finite presentation. The link from `fire` to `AheadCertificate`
is [EXT 3]: for a rule system whose `Tstep` is a finite join of `fire`s over a countable cell set,
the orbit from `knowledgeLeast` has an `AheadCertificate` with `limit := ⋁ₖ orbit`. The check's
caution applies: `RuleSystem.lean`'s lfp theorems are stated under the hypothesis that the
three-fold iterate is already fixed (strict), and the ω-chain version is this extension.

### 4.3 The gate the node declares

`L/Closure/RegimeGate.lean` [LEAN]: three Boolean flags per regime, `hasFixedPoint`,
`attainedAtFiniteStage`, `weaklyQuiescent`, combined as `gate r := (hasFixedPoint r &&
attainedAtFiniteStage r) || !weaklyQuiescent r`, with `gate_eq_cohomologyVanishes` (pointwise
equality of two tables) and `scott_vanishes_without_attaining`: at Scott the record carrier has no
fixed point at all (`scott_no_fixed_point : ∀ r, Record.succPos r ≠ r`) yet the declared cohomology
vanishes. The naive one-flag gate is false at Scott.

The node reports all three flags for each orbit it carries, never one. [CODE] `S/signcraft/src/settle.mjs:90`
reports `regime: closureRegimeName(regimeOfOrdinal(ofNat(settledAt), true, true))`: a regime name
from a finite ordinal with the two other flags hard-wired `true`. That is a one-flag report and, by
`regimeOfOrd`'s definition (`L/Closure/Ordinal.lean:33`), it can only ever say `strict`. The
tower node replaces it with the three flags plus the certificate shape.

**[EXT 4] Regime-tagged output.** The check's row 1 point: `Meme` carries no regime. Define

```
structure Tagged where
  meme : Meme
  gate : Bool × Bool × Bool          -- hasFixedPoint, attainedAtFiniteStage, weaklyQuiescent
  cert : Option (Sum AheadShape GermShape)
```

with the law to prove: `gate = (true, true, true)` iff `cert = none` and the reading was attained
at stage ≤ 3 (`Reading.strict_finite`); `gate = (true, false, true)` iff `cert = some (inl _)`;
`gate = (false, false, true)` iff `cert = some (inr _)`. This is `gap_flags_split` carried on the
value.

### 4.4 A limit the library sets on the aperiodic rung

`theorem Ord.regimeOfOrdHonest_ne_aperiodic (κ) (scottContinuous) : regimeOfOrdHonest κ
scottContinuous ≠ aperiodic` (`L/Closure/Ordinal.lean:150`) [LEAN]: no ordinal this library can
build reaches the aperiodic rung. The sibling geometry check made the same point. So in the
running system **aperiodicity is never evidenced by an ordinal**; it is evidenced by a germ
certificate on a non-antisymmetric carrier (`residue_germ_ahead`, `germ_order_not_antisymm`), or
by the composite jump of section 6.3. A node that reports "aperiodic" must be able to show one of
those two things, and nothing else counts.

## 5. Sigma and Delta in the tower: the design that is right either way, and the decision that is not

### 5.1 What is settled

Three pairs are called σ and Δ (the note's section 1.4; the check confirms they must not be
identified):

1. `Autopoiesis.saturating Q := Q.j1`, `Autopoiesis.transferring Q := Q.j2` for an abstract
   `Order.CommutingNuclei H` (`L/AperiodicOrder/Tiling/Autopoiesis.lean`). The history-filtration
   formulas are docstring only; Lean constructs no history nuclei.
2. `Reading.joinSquare c1 c2` on `Reading.heytingK` (`L/Language/Positing/Bigraded.lean:234`), the
   value-order pair; `BigradedTower.towerSquare g := joinSquare (gradePoles g).1 (gradePoles g).2`.
3. `sigma`/`delta` in `S/signcraft/src/inference/nuclei.mjs` (DG-basis closure; Galois transfer)
   [CODE]; the algebra check ran them and found `delta` not monotone and `sigma` not
   meet-preserving on random contexts, so they are not `Order.Nucleus` values.

Settled in Lean [LEAN]:

- `structure Order.Nucleus` has `idem : ∀ a, j (j a) = j a` as a field
  (`L/Language/Positing/NucleusAndCommutingNuclei.lean`). Every σ, Δ typed as a nucleus is strictly
  idempotent wherever it is used.
- `theorem nuclear_autopoiesis_cell {H} (Q : Order.CommutingNuclei H) : AutopoiesisCell Q`:
  for any Heyting algebra and any commuting pair, `A* = Fix π = Fix σ ∩ Fix Δ`
  (`autopoieticCore_iff`), four corners, joint corner is intersection. It holds on FOUR
  (`readingNuclearPair c1 c2`) as well as anywhere else.
- `theorem mu_identity_of_cohomologyVanishes (d) (hcoh : cohomologyVanishes (classify d) = true)
  (v) : closureOp M (closureOp M v) = closureOp M v` (`L/Closure/Monad/KZ.lean:121`): `mu` is the
  identity at strict and Scott.
- `theorem no_laxSlack_of_antisymm {V} (hanti) (T : LaxVClosure V) (v) : ¬ HasLaxSlack T v`
  (`L/Closure/Monad/LaxSlack.lean:297`): no lax slack on any antisymmetric carrier.
- `theorem Record.tally_lax_slack : HasLaxSlack tallyLaxClosure germPreValue.bot`
  (`Record.lean:915`) and `topBump_lax_slack` (`Record.lean:1015`): lax slack inhabited on the germ
  preorder `DomBy` of record sequences, which is not antisymmetric (`germ_order_not_antisymm`,
  `Record.lean:876`).
- `theorem mu_content_exactly_at_valued_gate (M)` (`LaxSlack.lean:346`): on the spine `mu` is the
  identity and no valuation has lax slack; at `aperiodic` the cohomology table reads `false` and
  `tally_lax_slack` holds; and two distinct mutually-dominating sequences exist.
- `theorem Reading.kz_iff_strict` (`L/Closure/Monad.lean`): on FOUR, the KZ inequality for a
  monotone inflationary `f` is equivalent to strict idempotence.

### 5.2 The design

The node holds, at every cell, a tally (`Record`) and its reading (`Record.reading`). Across laps
it holds the sequence of tallies (`Nat → Record`, the germ carrier). The two carriers have
different order structure, and the library says exactly what each supports:

- On **FOUR** (readings), antisymmetric and finite: every closure is strictly idempotent
  (`Reading.Closure.idem` is a field; `kz_iff_strict`), settles by stage 3
  (`Reading.strict_finite`), and `mu` is the identity. This is the finite regime, and it exists
  because FOUR is the **antisymmetric quotient** of the tally: `Record.reading` is surjective
  (`reading_surjective`) and not injective (`reading_not_injective`), and it is a bilattice
  homomorphism for all four operations (`reading_joinK`, `reading_meetK`, `reading_joinT`,
  `reading_meetT`, `Record.lean:343-358`). **That is the operational content of "this is why a
  finite regime exists at all"**: quotient the tally by "is it nonzero" and antisymmetry returns,
  and with it idempotence, three-step settling and `H¹ = 0` in the declared table.
- On the **germ preorder** of tally sequences, not antisymmetric: the lap bump is a `LaxVClosure`
  (inflationary, monotone, KZ) with genuine slack and no idempotence. [EXT 5] `residueBump c` for any
  `c` is a `LaxVClosure germPreValue` (the proofs of `tallyLaxClosure` and `topBumpLaxClosure` go
  through with `⟨1,0⟩`, `⟨1,1⟩` replaced by `c`; `kz := fun s => ⟨c, fun _ => kle_refl _⟩`), with
  `HasLaxSlack` at the seed iff `c ≠ kBot`. So **the lap itself is the lax closure**: closing twice
  (two laps) is dominated by closing once at cost `c`, and is not equal to it. The 2-cell `mu` of
  the closure 2-monad has content here and nowhere on FOUR.

Under this design the node's σ and Δ are:

- on FOUR, the two commuting join-nuclei of `Reading.joinSquare` (pair 2), or more generally any
  `Order.CommutingNuclei` on the settled fiber (pair 1's abstract shape), idempotent, giving the
  autopoiesis cell `nuclear_autopoiesis_cell` with `A* = Fix π` the doubly quiescent readings;
- across laps, two commuting lax closures on the germ carrier [EXT 6]: `residueBump c₁` (what the
  past forces: the saturating direction) and `residueBump c₂` (what the one-step future transfers:
  the transferring direction), which commute because `add` is commutative (`residueBump c₁ ∘
  residueBump c₂ = residueBump (add c₁ c₂)` by `Nat.add_assoc`/`Nat.add_comm`), with `π := residueBump
  (add c₁ c₂)`. Whether these are "the" history nuclei of `Autopoiesis`'s docstring is exactly the
  open identification the note's section 6 item 4 names; this note does not claim it. It claims
  only that a commuting lax pair exists on the lap carrier, which `Order.CommutingNuclei` cannot
  express because its components carry `idem`. [EXT 6] therefore also needs a `LaxCommutingPair`
  structure with `kz` in place of `idem` and a proof that `Fix`-style quiescence becomes
  germ-class quiescence (`DomBy` both ways), the `GermCertificate` shape.

### 5.3 The decision for the founder

The founder's correction says σ and Δ are KZ-lax in the **Scott** regime. The library files the
only lax slack it has at the **aperiodic** rung, and its Scott-rung carrier (`Record` under
`succPos`) is antisymmetric with no fixed point (`scott_no_fixed_point`), hence by
`no_laxSlack_of_antisymm` has no lax slack. The design above does not need the rung decided: lax
slack lives on the non-antisymmetric carrier wherever that carrier is filed. But the node's regime
report (section 4.3) does need it decided, because `gate scott = true` and `gate aperiodic = false`
are different reports. The two consistent options are the check's (section 4, C1.4a):

- (i) re-file the germ preorder and its lax closures at Scott, changing `regime_tower`,
  `unattained_settling_gate`, `RegimeGate.weaklyQuiescent scott` and `gate_scott`; or
- (ii) keep the library and read the correction as "lax where antisymmetry fails", which the
  library files aperiodic.

This note builds the loop on (ii) because that is what is proved, and marks every place the choice
of (i) would change a report. It does not pretend the correction is proved as stated.

## 6. The foam: many nodes over a site

### 6.1 A node is an autopoiesis cell; a population is a square family

[LEAN] `nuclear_autopoiesis_cell` gives every node, over its own settled Heyting algebra `H` of
readings (concretely `Reading.heytingK`, `Bigraded.lean:215`, or `Autopoiesis.readingHeyting`) and
its own commuting pair `Q`, an `AutopoiesisCell Q`: self-production (`a ∈ A* ↔ Fix σ a ∧ Fix Δ a`),
four corners, joint corner is intersection. The doubly quiescent layer `A*` is what the node
reports as settled under both nuclei.

[LEAN] A population of nodes is a `SquareFamily H I` (`Bigraded.lean:187`): a nuclear square per
index `i : I`. `SquareFamily.Varies := ∃ i i', (square i).j1.j ≠ (square i').j1.j ∨ (square i).j2.j ≠
(square i').j2.j` (`Bigraded.lean:196`); `Autopoiesis.HistorySeparating family := family.Varies`.
`Reading.varyingFamily : SquareFamily heytingK Bool` varies (`varyingFamily_varies`). So **two nodes
with different nuclei already separate histories** in the library's sense. What is open is
`HistorySeparationForcesAperiodicity settlingOf`: for every varying family, `(settlingOf
family).regime = aperiodic`, with `settlingOf` a parameter nobody has defined
(`Autopoiesis.lean:203`, in-file OPEN).

[EXT 7] A candidate `settlingOf` that is not vacuous: give each node its `ClosureRegimeData`
(section 4.3) and define the family's regime datum as the fold of `ClosureRegimeData.both` over the
family. Then `HistorySeparationForcesAperiodicity` becomes the claim "a varying family's composite
datum classifies aperiodic", which is **false** in general (two FOUR nodes with different join
nuclei both have `finiteBase = true`, so their composite is strict by `classify_both_eq_costlier`) and
**true** exactly when the family contains the jump of section 6.3. That is a sharper statement than
the open axiom: history separation does not force aperiodicity; a Scott-uncountable node beside a
non-Scott node does. The founder's axiom, if it is to be kept, needs a `settlingOf` that reads the
history, not the flags; this note records that the flag reading refutes it.

### 6.2 The films: Landauer bits of the cover nerve

Nodes cover a site. Where two nodes' covers overlap they compare readings. The overlap graph is a
nerve, and the library counts its holes exactly.

[LEAN] `structure CoverNerve` (`L/Cohomology/CoordinationCohomology.lean:270`): `entities`,
`cells`, `components`, with `components ≤ entities` and `entities ≤ cells + components`.
`H1rank N := (N.cells + N.components) - N.entities` (`:291`); `CoordinationFree N := N.H1rank = 0`;
`h1_vanishes_iff_forest : H1rank N = 0 ↔ N.entities = N.cells + N.components`;
`h1rank_is_coordination_cost`. `CoverNerve.ofIndexedCoverIncidence` builds it from an incidence;
`coverNerve_h1_from_incidence`.

[LEAN] `Landauer.landauerBits N := N.H1rank` (`L/Cohomology/LandauerEntropy.lean:44`);
`landauer_zero_iff_reversible : landauerBits N = 0 ↔ N.entities = N.cells + N.components`;
`landauer_eq_coordination_cost : landauerBits N = N.cells - (N.entities - N.components)`.

Operational reading [FRAME on top of the theorems]: a **film** of the foam is an independent cycle
of mutual observation among nodes. Each film is one bit that no settling can recover reversibly:
to dry the foam there (to make the nodes agree by a global section) one bit must be erased. The
**dry foam** is a forest (`landauer_zero_iff_reversible`); there the nodes' readings glue with no
cost, and this is the CALM regime: [LEAN] `calm_monotone_coordination_free (M) (seed)`
(`L/Cohomology/CRDTCohomologicalCALM.lean:185`): the closure orbit is `≤ₖ`-monotone in the settle
index and the merge is independent of order and multiplicity (`joinList l = joinList l'` for
lists with the same members); `Sheaf.section_lub` (`L/Site/Sheaf.lean:56`). The check is right that
this holds in every regime because the knowledge join is a semilattice; the films are not where
CALM fails, they are where **more than CALM is needed**: a cycle means two independent paths of
observation reach the same cell, and if they carry different one-sided readings the join is
`kTop`, a held contradiction, which is correct and coordination-free and costs the bit. The film is
thick in proportion to the `topMass` accumulated there across laps (section 3.2).

This `H1rank` is **not** the Cech `H1` of `SettlingCohomologyH1`, which vanishes for every datum
(`h1_vanishes : ∀ D, H1Vanishes D`, `L/Cohomology/SettlingCohomologyH1.lean:210`). The glued
section there is a `Settlement` (`L/Settlement.lean`, `def Settlement.ofCech1`): content admitted
by the site's own law. Both are used by the foam: the Cech gluing says any agreeing family of
local readings has a unique global reading (so the dry foam is consistent), the nerve rank says how
many bits it cost to get agreement. [CODE] `S/signgraph/src/cohomology.mjs` computes the nerve rank
("cycle rank |cells| − |entities| + |components|") and `cellular-sheaf.mjs` computes a numeric
sheaf Laplacian whose kernel is `H⁰`; neither is connected to a settlement today (check, section 9,
item 6).

### 6.3 The composite regime of a foam

[LEAN] `L/Closure/RegimeComposition.lean`: `ClosureRegimeData.both d e` has flags `d.f && e.f`
for each of the three flags; `classify_both_ge : (classify d).rank ≤ (classify (d.both e)).rank ∧
(classify e).rank ≤ …` (a composite is never cheaper than its costlier part);
`classify_both_eq_costlier (h : d.jumps e = false) : classify (d.both e) = (classify d).costlier
(classify e)`; `classify_both_jump : classify scottUncountable = scott ∧ classify transfiniteDatum =
transfiniteBounded ∧ classify (scottUncountable.both transfiniteDatum) = aperiodic`, where
`scottUncountable := ⟨true, false, false, _, _⟩` and `transfiniteDatum := ⟨false, false, true, _, _⟩`.

Operational reading: **a foam's regime is computed from its cells', not declared**, and it can be
strictly higher than any cell's. A Scott-continuous node whose state space has uncountable
cofinality is harmless alone (cofinality is idle when Scott-continuity holds, as the file says); run
together with a node that is not Scott-continuous, the two make an aperiodic foam. This is the one
place in the library where **multicellularity creates a regime that no cell has**, and it is the
theorem to build the "complex multicellular foam" claim on rather than on prose. Which cells may be
joined into one settlement is therefore a regime decision with a computable answer, and the foam's
gate report (section 4.3) is the `gate` of its composite datum.

### 6.4 Gluing: the foam's knowledge is global, its memory is local

[LEAN] `L/Closure/Odometer.lean`: `tower_gluing_dichotomy : (∀ c : Nat → Reading, ∃ b, ∀ n, KLE
(c n) b) ∧ (∃ r : Nat → Record, (∀ n, KLE (r n) (r (n+1))) ∧ ¬ ∃ b, ∀ n, KLE (r n) b)`;
`hull_settling_gluing_dichotomy : (∀ D : CylinderDatum readingKPreValue, ∃ g, D.GluesTo g) ∧
(∃ D : CylinderDatum recordKPreValue, ¬ ∃ g, D.GluesTo g)`; `omega_escape_profile` (readings never
escape; records escape along ℕ; completed records never escape; germs are ℕ-bounded,
`germ_omega_family_bounded`, yet have no top, `germ_no_top`).

Operational reading: over the foam's refinement tower (deeper cylinders, longer histories), **any
knowledge-monotone family of FOUR readings has a global section** (because FOUR has a top, `kTop`),
and **some knowledge-monotone family of tallies has none** (the tally climb `⟨n, 0⟩`). So the foam
can always say what it collectively knows (a FOUR valuation, glued), and it cannot in general say
what it has collectively counted unless it completes (`ORecord`, where the double infinity absorbs:
`okle_kTop`). A node's memory that grows without bound must be **checkpointed as a completed record**
(`omegaPos`, the ahead certificate) or it has no global section. [CODE] SignCraft's checkpoints
("A checkpoint retains their active raw evidence and frontier; the durable archive retains their
complete ancestry", `history.mjs`) are the right shape; the completed record is the type they should
carry.

### 6.5 The clock: the dyadic odometer

[LEAN] `L/Closure/Odometer.lean`: `vershik : List Bool → List Bool` (little-endian +1 with carry);
`vershik_succ`; `vershik_replicate_true` (the maximal path wraps to the minimal); `vershikIter_fixed_iff
(m) (p) : vershikIter m p = p ↔ 2 ^ p.length ∣ m` (each stage is one `2^L`-cycle);
`vershikHullIter_ne_self (m) (hm : 0 < m) (t)` (no positive iterate fixes a hull thread);
`tower_periodicity_dichotomy`; `vershikHull_minimal_aperiodic`; `bernoulliLaw_vershik_invariant`
(the uniform mass `1/2^n` per depth-`n` cylinder is preserved).

Operational reading [FRAME on the theorems]: the foam's time is the odometer. A node of history
depth `L` is periodic with period `2^L` in the odometer's serial order (its finite lap counter
wraps); the foam as a whole, the hull, has no periodic point and every orbit is dense. This is the
precise sense in which **each finite node is a clock and the foam is not**: aperiodicity of the
whole is a theorem about the inverse limit, not a property any node has. The `Turn.lap : Nat` of
section 1.1 is one odometer digit stream; the `dyadicTower` thread is the foam's. The invariant
Bernoulli law gives the foam a uniform measure on cylinders that the clock preserves, which is the
measure-theoretic floor under any later "attention temperature" (the inference kernel's Gibbs
sampler, [CODE] `generate.mjs`), stated exactly.

### 6.6 Crossings: two nodes at one cell

[LEAN] `F/WeaveDraft.lean`: `crossingReading (warpOver weftOver : Bool) : Reading`;
`hole_is_kBot : crossingReading false false = kBot`; `miscrossing_is_kTop : crossingReading true true =
kTop`; `overUnder_swap_is_negate`; `warpAlt_eq_completeGraph`; `warp_sofic`;
`both_claims_infeasible : ¬ Feasible 1 [warpClaim, weftClaim]`; `hands_grant_one_claim`;
`handed_tiebreak_avoids_miscrossing`. The sibling geometry check found `plainWeave_entropy_collapse`
proved (stale docstring says open); this note does not rely on it either way.

Operational reading: when two nodes (warp, weft) both claim "over" at one cell, the crossing reads
`kTop`, a held contradiction, which under a one-unit attention budget is infeasible
(`both_claims_infeasible`); the hands grant one claim (`hands_grant_one_claim`); a handed tiebreak
avoids the mis-crossing (`handed_tiebreak_avoids_miscrossing`). This is the foam's local law for
contested cells with a budget: hold the contradiction (the reading stays `kTop` in the record;
`topMass` grows), and when one unit of attention is available, resolve by handedness, which is a
declared orientation of the site, not a vote. A cell no node claims is a hole, `kBot`. The weave is
the two-node foam seen one crossing at a time.

### 6.7 Abiotic digital organic simulation: what "alive" means, exactly

The house's "complex multicellular foam" (the Holofoam README, surveyed in
`2026-10-08-logical-inference-model-survey-holofoam-life.md`) is today a flocking toy with a
16-row policy table; the survey says so. This note does not inherit its biology. It defines
aliveness by the theorems above, and nothing else:

- A node is **alive** on a lap iff its residue is nonzero (`residue_dichotomy`, second branch): it
  will never return to a prior data state (`dervish`). It is **dead** iff its residue is `kBot`
  (first branch): a circle.
- A node is **steady** iff it holds a `GermCertificate`: alive, unfixed, and in one class. It is
  **completing** iff it holds an `AheadCertificate`: a limit exists it will not reach.
- A node's **contradiction load** is `topMass` of its carried record; under balanced residue it
  grows by exactly `topMass c` per lap (`balanced_residue_holds_bias`); its **bias** drifts iff the
  residue is unbalanced (`unbalanced_residue_drifts`).
- A foam's **films** are the `landauerBits` of its cover nerve; it is **dry** iff zero (forest).
- A foam's **regime** is `classify` of the `both`-fold of its cells' data; it is **aperiodic as a
  whole** iff some pair jumps (`classify_both_jump`) or some cell holds a germ certificate.
- A foam's **knowledge glues** always (`reading_cylinder_datum_glues`); its **memory glues** iff the
  tallies are bounded or completed (`record_cylinder_datum_not_glues` otherwise).
- A foam's **clock** is the odometer; a cell's **age** is its history depth `L`, with period `2^L`.

[EXT 8] Division and death as moves. Lean has no cell division. State it: a node whose `topMass`
at a cell exceeds a declared budget `B` splits its cover at that cell into two covers (two nodes,
one per lane of the contradiction), so that each new node's tally at the cell is one-sided
(`Record.reading = tTop` or `tBot`) and the nerve gains one entity and one cell (the film between
them), raising `landauerBits` by at most one (`landauer_eq_coordination_cost`). A node whose every
lap has residue `kBot` for `D` laps is removed and its cover merged into its neighbours
(`CoverNerve` loses one entity; `components` unchanged if it was connected). The claims to prove:
division never lowers the composite regime (`classify_both_ge`), and removal of a dead node never
raises `landauerBits`. This is the abiotic organic simulation: no metabolism is simulated; the
dynamics are the theorems of sections 3, 4, 6.2 and 6.3 run as moves.

## 7. What this does that a large language model cannot

Each item names the theorem that makes it a property of the machine, not a hope.

1. **Hold a contradiction as a value and keep both witnesses.** `Reading.kTop` is a value;
   `Valued` keeps both lists; `evidence_accumulates_joinK` (`Evidence.lean:140`). The crossing law
   `miscrossing_is_kTop`. An LLM has no value for "told both" distinct from "told neither".
2. **Never accept a reading; only measure one.** `measure_measured` (by definition), `no_denial`
   (a negative pole exists only if some articulating landed on the contradictory cell),
   `measure_contradictory_negate` (negation is measured). An LLM's beliefs are supplied by its
   weights; there is no trace from which they are read.
3. **Never repeat a data state while alive.** `dervish`, `residue_dichotomy`. An autoregressive
   model has no statement about its own iteration.
4. **Publish the limit of its own iteration without reaching it.** `AheadCertificate`,
   `omega_ahead`, `AheadCertificate.jump`, `AheadCertificate.limit_unique`. An LLM emits stage
   `k`; it has no notion of the ω-th stage.
5. **Report a steady state that is a class, not a point.** `GermCertificate`,
   `residue_germ_ahead`, `topBump_flux`.
6. **Compute the regime of a composite from its parts and detect when composition raises it.**
   `classify_both_ge`, `classify_both_eq_costlier`, `classify_both_jump`.
7. **Count irreversibility in bits, exactly.** `landauerBits`, `landauer_zero_iff_reversible`,
   `landauer_eq_coordination_cost`.
8. **Merge without coordination and know when that was free.** `calm_monotone_coordination_free`,
   `section_lub`; films are where the merge held a contradiction.
9. **Keep knowledge global while memory is local, and know the difference.**
   `hull_settling_gluing_dichotomy`, `omega_escape_profile`.
10. **Settle in at most three steps where the carrier is FOUR.** `Reading.strict_finite`,
    `spine_settles_by_three`; and know that this is a property of the quotient
    (`reading_surjective`, `reading_not_injective`), not of the world.
11. **Replay.** [CODE] SignCraft's history is a fold over admitted observations with
    content-addressed checkpoints; `Spine.run` makes the valuation a function of the trace. An
    LLM's state is not a function of a trace it can show.

What it cannot do that an LLM can: produce fluent text. That is the language regime's job
(SignGraph; its IMAGINE note), downstream of what this loop settles.

## 8. Worked examples

All readings are `Reading` values named as in section 0; all records are `Record` pairs
`⟨pos, neg⟩`; all theorem names are as cited above.

### 8.1 One lap of the spine, with real words

Marks: `sun`, `shines`, `not-shines`. `Contradictory k` with `k.c ⟨shines⟩ = ⟨not-shines⟩` and
`k.c ⟨not-shines⟩ = ⟨shines⟩` (`invol` holds).

Lap 1, articulating: the world hands `a₁ := utter ⟨⟨sun⟩, ⟨shines⟩⟩`. `trace := [a₁]`.
Predicating: `predicate a₁ = orientedCell (utter u) = ⟨sun, shines, sun⟩` (the reflexive seed,
`predicate_utter`). Positing: `measure k [a₁] ⟨sun, shines, sun⟩ = ⟨ofSlots true false, ([sun], [])⟩`
= `⟨tTop, ([sun], [])⟩`: told true, one for-witness (`measure_self_pos`). Tally [EXT 1]: `⟨1, 0⟩`.
Settling with `closure := joinClosure kBot` (the identity-like closure, `Settling.lean:88`):
`settle = tTop`; `brim`: presume the free side present, `presumeFree ⟨tTop, ([sun], [])⟩` has value
`kTop`, so `brim = kTop`; `Void` holds (`oneSided_void`): **the cell is space**, under-determined;
the node knows it has heard only one side. `run_pos` holds: `pos = true`. Residue of the lap:
`⟨1, 0⟩`, unbalanced.

Lap 2, articulating: another node hands `a₂ := utter ⟨⟨sun⟩, ⟨not-shines⟩⟩`. `trace := [a₂, a₁]`.
Predicating: `orientedCell a₂ = ⟨sun, not-shines, sun⟩`, which is `⟨sun, shines, sun⟩.contradictory k`.
Positing at `⟨sun, shines, sun⟩`: for-witnesses `[sun]` (from `a₁`), against-witnesses `[sun]`
(from `a₂`, `no_denial` tells us this is the only way the negative pole appears); value `ofSlots
true true = kTop`. By `measure_contradictory_negate`, measuring `⟨sun, not-shines, sun⟩` gives
`negate kTop = kTop`. Tally: `⟨1, 1⟩`, `topMass = 1`. Settling: `settle = kTop`; `brim = kTop`
(`presumeFree_of_full`: nothing free to presume); `Void` fails (`not_void_of_full`): **the cell is
no longer space; it is a held contradiction**. Residue of the lap: `⟨0, 1⟩`, unbalanced the other
way. Across the two laps the net residue is `⟨1, 1⟩`, balanced: bias held, contradiction mass 1.

The node's report at the end of lap 2, as a `Tagged` [EXT 4]: cell `⟨sun, shines, sun⟩`, reading
`kTop`, tally `⟨1, 1⟩`, gate `(true, true, true)` (FOUR attained at stage ≤ 3), no certificate. If
the two sources keep this up every lap, the tally orbit is `topBump` from seed `⟨1, 1⟩` and the node
issues the germ certificate `residue_germ_ahead ⟨1,1⟩ _ s`: steady, alive, contradiction load `k`
after `k` laps (`topBump_flux`).

### 8.2 A rule firing in the settling stage

Closure `fire ante concl` (`L/Closure/Scott.lean:262`): `fire ante concl x = if KLE ante x then
joinK x concl else x`. Take the rule "if `⟨sun, shines, sun⟩` is told true then `⟨sky, bright, sky⟩`
is told true", with `ante := tTop` read at the first cell and `concl := tTop` written at the second
(a two-cell valuation; `fire` is pointwise so the cell-indexed version is `Valuation.settle`,
`Settling.lean:462`). With the lap-1 measured value `tTop` at the first cell: `KLE tTop tTop` holds,
so the second cell becomes `joinK kBot tTop = tTop`. With the lap-2 value `kTop`: `KLE tTop kTop`
holds (`tTop ≤ₖ kTop`), so the second cell is still `tTop`: **a contradiction in the premise still
fires the rule**; this is Fitting-style paraconsistent consequence, and it is what `fire_mono`
gives. `fire_infl` and `fire_mono` are proved by finite exhaustion over FOUR. On a directed family
of stages, `finite_antecedent_scott_continuous` says the firing at the join is the join of the
firings: the node may compute this rule's limit from its stages (section 4.2, [EXT 3]).

### 8.3 Residue laps, numerically

Seed `s := fun _ => kBot` (nothing told). Residue `c := ⟨1, 1⟩`. After `k` laps,
`iterSeq_residueBump`: `⟨k, k⟩` at every term; reading `kTop` for `k ≥ 1`; `topMass = k`
(`residue_topMass` gives `≥ k`; here equality); bias: `k + 0 = k + 0` (`balanced_residue_holds_bias`).
Four advances from `⟨0, articulating⟩` reach `⟨1, articulating⟩` with carried record `⟨1,1⟩`-bumped
(`dervish`); never `s` again. Residue `c := ⟨1, 0⟩` instead: `⟨k, 0⟩`, reading `tTop` for all
`k ≥ 1` (constant), bias drifts by one per lap (`unbalanced_residue_drifts`): the reading cannot see
the learning; the tally can. Residue `kBot`: `s` forever (`residueBump_kBot`): dead.

### 8.4 The foam's films

Three nodes A, B, C. Covers overlap pairwise: A–B, B–C, C–A. `CoverNerve` with `entities := 3`,
`cells := 3`, `components := 1`: `H1rank = (3 + 1) - 3 = 1`. One film; `landauerBits = 1`; not a
forest (`landauer_zero_iff_reversible` fails: `3 ≠ 3 + 1`). Remove the C–A overlap: `cells := 2`,
`H1rank = 0`, dry. In the cyclic case, if A measures `⟨sun, shines, sun⟩` as `tTop` and C measures it
as `tBot`, B's merge of the two is `joinK tTop tBot = kTop` regardless of which arrived first
(`calm_monotone_coordination_free`, second conjunct), and the one bit the film costs is the bit
that would decide which of A and C to believe. The foam holds it instead.

### 8.5 The composite regime

Node P declares `ScottFace.regimeData = ⟨true, false, true, _, _⟩` (`L/Cohomology/ScottFace.lean`,
`classify_regime_is_scott`). Node Q declares `transfiniteDatum = ⟨false, false, true, _, _⟩`.
`P.both Q = ⟨false, false, true⟩`: `classify = transfiniteBounded`, the costlier
(`classify_both_eq_costlier`; `jumpsFlags true true false true = false`). Node R declares
`scottUncountable = ⟨true, false, false, _, _⟩`. `R.both Q = ⟨false, false, false⟩`:
`classify = aperiodic` (`classify_both_jump`). Two Scott nodes, one harmless alone, give two
different foams with Q. The foam's gate report differs: `gate transfiniteBounded = false` with
`hasFixedPoint = true` (ahead shape); `gate aperiodic = false` with `hasFixedPoint = false` (germ
shape) (`gap_flags_split`).

### 8.6 A crossing

Warp node claims over, weft node claims over at one cell: `crossingReading true true = kTop`
(`miscrossing_is_kTop`). Budget one unit: `both_claims_infeasible`. `hands_grant_one_claim`; the
handed tiebreak sets `crossingReading true false = tTop` or `crossingReading false true = tBot`
(`overUnder_swap_is_negate`: the two are each other's negation), avoiding the mis-crossing
(`handed_tiebreak_avoids_miscrossing`). Nobody claims: `crossingReading false false = kBot`, a hole.

### 8.7 The clock

Node of depth 2: paths `[a, b]`; `vershik_two_cycle`: four successors return it. Node of depth `L`:
`vershikIter_fixed_iff`: fixed by `m` steps iff `2^L ∣ m`. The hull: `vershikHullIter_ne_self`: no
positive iterate fixes any thread. The foam's lap counter is the hull's; each node's is one digit
stream of it.

## 9. From here to code: what the present kernel would have to become

Engineering belongs to the ENGINEER stage; this section only names the deltas the imagining
forces, each against a [CODE] fact.

1. `runMachineAction` (`S/signcraft/src/inference/kernel.mjs`) returns `effects: Object.freeze([])`
   on every path. The tower node's articulating stage is where effects live: an effect is an
   articulating appended to the trace. The actor must return articulatings as effects, and the next
   lap must read them back (`Spine.run`).
2. `tell` accepts `isReading(action.reading)`. The tower node has no `tell`; it has `articulate`
   (an `Utterance`), and readings are `measure`d (`Spine.run`, not `runSupplied`). [CODE]
   `membrane.mjs` already parses utterances to told-for/against cells by negation parity; that is
   the `Contradictory k` of `Measure.lean` in code, and it should be the only entry.
3. `settle.mjs:90` reports a one-flag regime from a finite ordinal. The node reports the three gate
   flags and a certificate shape ([EXT 4]).
4. No lap, residue or carried record exists. Add `Turn`, per-cell `Record` tallies ([EXT 1]), a lap
   residue, and the `iterSeq_residueBump` bookkeeping; test `dervish` as a property (no repeated
   data state under nonzero residue) and `balanced_residue_holds_bias` numerically against the Lean
   statement as a golden vector, the way `signstuff-evm` does for FOUR.
5. `nuclei.mjs`'s `sigma`/`delta` are not nuclei (algebra check). On FOUR the node's nuclei should
   be `Reading.joinSquare`-shaped (two join-nuclei, proved); on the lap carrier they are lax
   closures ([EXT 5], [EXT 6]) and must be typed as such, with `kz` tested and `idem` not asserted.
6. `cohomology.mjs`'s cycle rank is `CoverNerve.H1rank`; connect it to the settlement so that the
   foam's `landauerBits` is reported per lap. Do not report it as Cech `H¹`.
7. `history.mjs` checkpoints should carry the completed record (`ORecord`) for unbounded tallies
   (section 6.4).

## 10. Lean targets specific to the tower regime

In the order the imagining needs them; each is stated above with its mark.

1. [EXT 1] `Record.ofValued` and `reading_ofValued_eq_presence`.
2. [EXT 2] lap-indexed residue `residueSeqBump` with the four claims of section 3.4.
3. [EXT 3] an `AheadCertificate` for the ω-orbit of a finite-antecedent rule system over a countable
   cell set, from `finite_antecedent_scott_continuous`.
4. [EXT 4] `Tagged` and the three-way law tying gate flags to certificate shape.
5. [EXT 5] `residueBump c : LaxVClosure germPreValue` for all `c`, slack iff `c ≠ kBot`.
6. [EXT 6] `LaxCommutingPair` (two commuting `LaxVClosure`s) and germ-class quiescence as its `A*`;
   then the open identification with `Autopoiesis`'s docstring nuclei, or its refutation.
7. [EXT 7] `settlingOf` as the `both`-fold, and the resulting refutation of
   `HistorySeparationForcesAperiodicity` under the flag reading; a history-reading `settlingOf` if
   the founder keeps the axiom.
8. [EXT 8] division and removal as moves on `CoverNerve` with the two monotonicity claims.
9. [OPEN, founder] the rung of lax slack (section 5.3), and with it `RegimeGate.weaklyQuiescent
   scott`.
10. [OPEN, library] regimes derived from closures rather than declared (`Regime.lean` and
    `RegimeCycle.lean` in-file OPEN comments); until then every regime report in the running
    system is a declaration plus a certificate, and must say so.

## 11. Sources read

Lean, statements read in full: `L/Closure/RegimeCycle.lean`, `L/Closure/Regime.lean`,
`L/Closure/RegimeGate.lean`, `L/Closure/RegimeComposition.lean`, `L/Closure/Monad/KZ.lean`,
`L/Closure/Monad/LaxSlack.lean`, `L/Language/Positing/BigradedTower.lean`,
`L/AperiodicOrder/Tiling/Autopoiesis.lean`, `L/Language/Spine.lean`, `L/Language/Positing/Measure.lean`,
`L/Language/Settling/Cones.lean`, `L/Language/Positing/Value/PreCategory.lean`,
`L/Cohomology/LandauerEntropy.lean`, `L/Cohomology/DifferentialBypass.lean`, `L/Cohomology/ScottFace.lean`,
`L/Settlement.lean`, `L/Articulation/Articulating.lean`. Declarations and selected sections:
`L/Language/Positing/Record.lean` (germ order, lax closures, ⊤-flux), `L/Closure/Odometer.lean`
(gluing dichotomies, cylinder data), `L/Closure/SettlementSpiral.lean` (header and declarations),
`L/Closure/Scott.lean` (`fire`, Scott continuity), `L/Cohomology/CoordinationCohomology.lean`
(`CoverNerve`), `L/Cohomology/SettlingCohomologyH1.lean`, `L/Site/Sheaf.lean`, `L/Closure/Ordinal.lean`
(`regimeOfOrd`, `regimeOfOrdHonest_ne_aperiodic`), `L/AperiodicOrder/Tiling/ChromaticLorentzian.lean`,
`L/AperiodicOrder/Tiling/Classification.lean` (`clinv_dichotomy`), `L/Language/Positing/Bigraded.lean`
(`SquareFamily`, `Varies`, `joinSquare`), `L/Language/Positing/Evidence.lean`,
`L/Language/Positing/Reading.lean`, `L/Language/Predicating/Oriented.lean`,
`L/Articulation/Articulating/Utterance.lean`, `L/Cohomology/CRDTCohomologicalCALM.lean`
(`calm_monotone_coordination_free`); `F/WeaveDraft.lean`, `F/LenticleCrossing.lean` (declarations).
Notes: the check (full), the cascade note (full), the 2026-04-06 Rosetta note (full), the 2026-05-21
SPOTCOMP note (Part I through settling; the six subsystem-views section), the README, the
holofoam-life, theory-foam-life-language and multicellular-lens survey and vision notes (summaries,
capabilities, attachment points), the algebra, logic and geometry adversarial checks (section 0 of
each). Code: `S/signcraft/src/inference/kernel.mjs`, `S/signcraft/src/inference/nuclei.mjs`,
`S/signcraft/src/settle.mjs` (header, `settle`, export list), `S/signcraft/src/history.mjs` (header),
`S/signcraft/src/membrane.mjs` (header), `S/signgraph/src/cohomology.mjs` and `cellular-sheaf.mjs`
(headers), `S/signcell/src/cell.mjs` (header). No Lean build was run; "proved" here means the
statement is in the tree with a term, not that it was re-checked in this session.
