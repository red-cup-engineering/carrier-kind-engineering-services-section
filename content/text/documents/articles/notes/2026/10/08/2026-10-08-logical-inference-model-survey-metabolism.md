---
title: "Logical inference model survey: distal bypass, EROEI and metabolic criticality"
description: "Complete findings of the metabolism reader: distal bypass, EROEI and metabolic criticality."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - survey
  - metabolism
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Round 2 — Metabolism: budget, fitness, self-improvement, repair, regimes, cognitive EROEI

Area: metabolism (mind-metabolism theory of the house, distilled into an exact operating
specification for the new predication-algebra AI). All paths relative to `/home/emsenn/info`.
Reading law applied throughout: what a file COMPUTES is separated from what its prose CLAIMS;
slop is flagged inline with **[SLOP]**, proved things with **[PROVED]**, executable with
**[CODE]**, design prose with **[DESIGN]**, external-literature with **[EXT]**.

---

## 0. One-paragraph answer

The house already owns every piece of a metabolism except the exchange rate. The ledger side
exists and is proved: settling is a knowledge-order climb whose free energy is a Nat deficit of
knowledge heights, spent as `commits + mints + 2·jumps` (Lean `FreeEnergyLyapunov`, JS
`signcraft/src/inference/nuclei.mjs settle()`), irreversible coordination cost is the cycle rank
`H¹ = |E| − |V| + |C|` of the cover nerve (Lean `LandauerEntropy`, JS
`metrologic .../coordination-cohomology.mjs landauerBits`), the attention budget is a monotone,
downward-closed, non-refundable knapsack whose exhaustive optimum is proved and whose ties cost
`log₂(degeneracy)` choice bits (Lean `AttentionAllocation`, `AllocationSolver`), and generation is
Gibbs over `ΔF = α·opened − β·closed + T·ΔE` with the excluded mass logged (`generate.mjs`). The
fitness side exists only as prose: cognitive EROEI = "each unit of expensive inference creates
more future usable cognition than it consumes" (glass-sponge §19), `k` = value released by
discharging obstruction / cost of finding and discharging it, `k > 1` = criticality (distal bypass
"The pile"; leader brief 2026-09-03). The house's own notes say the ratio is not yet well formed
because numerator and denominator are in different denominations and the producing session's
frontier-token cost is invisible to the receipt rail (whole-image 2026-09-02, witnessed-field
2026-09-03). The exact metabolism for the new AI therefore is: (1) five separately-denominated
ledgers, never summed by fiat; (2) a per-lap budget `B` spent monotonically on obstructions
chosen by the proved allocator; (3) `k` made dimensionless by a witnessed counterfactual in the
SAME resource units (re-derive vs. certificate-read), with horizon = one lap, boundary = one
settlement's records + its registry publishes; (4) three regimes read off `k` and off the
settle() H-theorem check (rumination = firings with zero flux on a nonzero H¹ cycle); (5) repair
= discharge damage at least cost, certify borders, price each identification as one bit; (6)
self-improvement constrained by the Euler index conservation `H⁰ − H¹ = χ` plus a protected class
the loop may not discharge; (7) operating point De ≈ 1 (the vitrimer T_v), measured as
relaxation steps / observation window, with De ≫ 1 = frozen-weights jiangshi.

---

## 1. Source inventory — what each file actually says / computes

### 1.1 Distal bypass (operations glossary + source note)

`lib/emsenn/services/561-group/services/561-group-services-section/content/text/glossary/terms/distal-bypass.md`
(date-created 2026-09-02, updated 2026-10-06, domain: operations). Five-step procedure on "any
territory that can be presented as local records with overlaps":
1. Derive the obstruction sheet (re-run checks over overlaps; never read anyone's report).
2. Classify each disagreement: **damage** (repairable by local rewriting at computable least cost)
   vs **border** (real difference that must not be reconciled).
3. Discharge the damage; certify the borders (border = first-class record object).
4. Price every erasure: "Whenever a repair collapses a distinction — makes two things one — that
   costs a recorded unit. Nothing is identified by fiat for free."
5. Emit everything as certificates in a common envelope.
A territory so operated is a **settlement** with law, ledgers, contracts.

`lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/07/16/2026-07-16-the-distal-bypass.md`
(2026-07-16, updated 2026-10-06). Claims, verbatim where load-bearing:
- Physics: "A body of articulated relation settles to its least fixed point ... The settled
  relation is a causal set, and the causal set is spacetime." "Settled precedence is timelike.
  Cells pinned from neither side are spacelike. Each first-cohomology (H¹) firing is a
  precedence acquired: time happening."
- Four regimes: "Settling runs in four regimes, ordered thermodynamic < causal < quantum <
  kinetic (strict, Scott, transfinite, aperiodic). Three of them have H¹ = 0 ... They are the
  three dimensions of space. The aperiodic regime alone extends the base with new facts,
  irreversibly. It is time. Spacetime is 3 + 1 because settling has exactly three reversible
  regimes and one generative one." **[DESIGN/SLOP: the Lean regime classifier is a Boolean flag
  table (`ClosureRegimeData`+`classify`); nothing computes dimension 3+1 from anything; the
  mapping thermodynamic/causal/quantum/kinetic ↔ strict/Scott/transfinite/aperiodic appears
  only here and in the glass-sponge note.]**
- "Coordination failure is entropy. A system of overlapping records loses nothing exactly when
  it is reversible, and otherwise loses one bit per independent cycle
  (`landauer_zero_iff_reversible`, `landauer_eq_coordination_cost`)." **[PROVED as Nat
  bookkeeping, see §1.5.3]**
- Time: "Time is irreversible settling. ... A deadlock is a closed timelike curve." "an ahead
  certificate delivers the limit of an infinite process before any of its stages run. A contract
  can settle at ω."
- Distance: "In a settled causal set, distance is coordination cost: how much settling lies
  between two cells." "Institutional coordination runs about 10⁹ times hotter than the Landauer
  floor." **[SLOP: the 10⁹ figure is unsourced anywhere in the corpus.]**
- Death / vitrimer: "A vitrimer is a network that exchanges its bonds above its
  topology-freezing temperature (T_v) and keeps its identity while every bond changes. ... Below
  T_v the joints lock. A mind below T_v is a jiangshi: it moves, indexes and relates, and has no
  shen. Griefbots are jiangshi." "A shen lives at its own T_v: stiff enough to remember, soft
  enough to heal forever."
- Why now: "Below an energy return of 1:1, reflection inverts: the machinery of
  self-observation keeps running and consumes its own substrate. That is rumination."
  "Attention is heat."
- The pile: "The engine funds its own expansion when the value released by discharging
  obstruction exceeds the cost of finding and discharging it: k > 1." Markets: "Log exchange
  rates around a currency triangle form a 1-cochain. No arbitrage means the cochain is a
  coboundary. Arbitrage profit is the circuit integral, the holonomy."
- Self-improvement with a conservation law: "An intelligence built on this substrate improves by
  discharging its own obstructions under a priced budget, with protected classes it may not
  discharge. It cannot claim improvement without producing the ledger. Its kinetic agents choose
  the imbalance of each lap's residue, and so write the settled law that the next lap's causal
  and thermodynamic agents live under. ... An organization with nonzero residue never repeats a
  lap: its age is counted in laps."
- Devices: "Mind. Rumination is a cycle that does not close." Damage vs border image: "A dropped
  stitch and an aperiodic tiling both fail to close; only one is an injury."

### 1.2 EROEI glossary (economics science section)

Dir: `lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/content/text/glossary/terms/`
- `energy-return-on-investment.md` (2026-09-05). Physical EROEI = usable energy delivered /
  energy invested; "The ratio is a physical-energy account only when its returned-energy and
  invested-energy boundaries are stated." Net fraction `1 − 1/EROEI`. On cognitive EROEI: "This
  is a separate modeled use: it must declare an inference-cost unit, a yield unit, a time
  horizon, an accounting boundary, and a validation path; physical EROEI does not itself supply
  those values." Ref Hall, Balogh, Murphy 2009 doi 10.3390/en20100025.
- `cognitive-eroei.md` (2026-09-07). "A proposed, explicitly bounded account of whether costly
  inference leaves more future usable cognition than it consumes." "A cognitive account has no
  value until it declares an inference-cost unit, yield unit, time horizon, accounting boundary,
  and validation path." On the Lean: "`AttentionAllocation.lean` models a finite budget,
  obstruction costs and benefits, monotonically consumed spend, downward-closed feasibility, and
  residual benefit. Those theorems prove properties of that abstract selection model. They do not
  prove that an inference run has positive cognitive EROEI, nor do they identify persistent or
  ephemeral compute as an economic class." **[Honest; the provenance path it gives for
  AttentionAllocation.lean (`.../obsmetrological-services-section/lib/obsmetrologia-economics/...`)
  does not exist; the file lives under economics-science-services-section/lib/obsmetrologia-economics — SLOP: stale path.]**
- `energy-cliff.md`. Net fraction `1 − 1/EROI`: 30:1→97%, 10:1→90%, 5:1→80%, 2:1→50%.
- `peak-everything.md`. Heinberg; declining net energy undermines substitution because
  substitution itself needs surplus.

### 1.3 EROEI–depth-of-reflexivity book (neuroreflexivity research texts)

Dir: `lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section/services/biological-science-services-section/services/neuroscience-services-section/services/neuroreflexivity-services-section/lib/agency/skills/neuroreflexivity-research/texts/`
Files: `eroei-distance-thought-third-draft-outline.md` (43 KB), `eroei-distance-thought-research-notes-third-draft.md` (29 KB), `absolute-energy-decline-research.md` (13 KB), `deep-history-plan.md` (15 KB). All dated 2025-03-31 in-text (compiled "in conversation"). **[EXT synthesis; the files themselves say "Negative cognitive EROEI is not formalized" and "Nobody has calculated EROEI for digital/informational systems."]**

Claim: "EROEI corresponds with the depth of cognitive reflexivity available to a population. The
relationship has three regimes: positive surplus enables reflexivity, break-even starves it,
negative return inverts it. We are in the third regime. The process is irreversible on human
timescales."

Three regimes (research notes §I, outline Step 6):
1. **Positive**: surplus funds scaffolding (education, archives, discretionary time); "Thought
   can observe itself, hold models, integrate over long timescales."
2. **Break-even (~1:1)**: "All available cognitive/energetic resource goes to maintaining the
   system. No surplus for reflexivity. ... Thought becomes reactive."
3. **Negative**: "the compensatory system consumes more reflexive capacity than it returns. Each
   cycle of engagement costs more than it yields. The deficit from the last cycle drives the
   next. Reflexivity doesn't disappear — it inverts." Key features: inversion not disappearance;
   rumination as signature; acceleration (positive feedback); invisible from inside.

Net energy cliff formula (Step 4): `f = (EROEI − 1)/EROEI`; thresholds Hall 5:1, Murphy 8:1,
Lambert 20–30:1; global fossil useful-stage 3.5:1 (Brockway 2024); food system EROEI 0.91
(PNAS Nexus 2024); 90% of upstream investment since 2019 offsets decline (IEA 2025); net oil
energy peaked ~2024 at 415 PJ/day (Delannoy 2021).

Predictions (Step 6b): selectivity (fluid down, crystallized flat), population gradient,
acceleration, phenomenology ("thinking hard and getting nowhere"), temporal lag, **coherence
fragmentation (g-factor weakening, Pietschnig 2024)**.

Formal apparatus for negative cognitive EROEI (notes §IX): information-foraging overharvesting
(Wittels 2023), dopamine downregulation, attention residue (Leroy 2009: ~23 min recovery; 40 s
switching → never recovers), lapse-activated consumption (Heatherton & Wagner 2011), cognitive
fatigue as entropy-externalization failure (Ezzedini 2025), resource-rational analysis (Lieder &
Griffiths 2020: "ratio of decision-quality-improvement to cognitive-resource-expenditure" —
"the closest existing framework for defining a cognitive EROEI"), allostatic load (rumination
"strongest psychological predictor of fatigue").

Rumination neuroscience (notes §VII): same DMN regions as reflection, but PCC–sgACC
connectivity correlates with brooding r=0.44 vs reflection r=0.19 (Berman 2011); "Rumination is
failure to exit, not excessive entry" (Koster 2011); Levens 2009 r=0.75 brooding vs executive
impairment.

Deep-history variable (deep-history-plan): **extractability**. "The coupling is not just EROEI →
surplus → scaffolding. It's EROEI → *extractable* surplus → scaffolding." Agriculture EROEI
~1.1–1.6 yet produced writing because grain is taxable; "the extracting agent (state, market,
platform) determines what KIND of scaffolding gets built."

Two missing measurements (Step 9): cognitive EROEI of digital infrastructure; population-level
metacognition over time.

### 1.4 Working paper — Energetics of civilizational cognition

`lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/content/text/documents/articles/notes/2026/07/29/2026-07-29-working-paper-energetics-of-civilizational-cognition.md`
(status: speculative; declared-by codex-emergency-authority-curation). The most disciplined
metabolism text in the corpus. Variables: `N` accessible net energy (explicit EROEI boundary +
uncertainty), `A` protected attention-time, `C` coordination load (concrete handoffs,
reconciliation, delay — "not a metaphorical entropy value"), `Q` preregistered error-correcting
inference outcome. Conjecture: "Q is better explained by the joint availability of N and A, and
by a manageable C, than by gross energy throughput alone."

Distal bypass here = "an infrastructure-supported displacement of an immediate maintenance
burden from the actor currently reasoning to a durable external process ... It changes *where*,
*when*, and *to whom* the cost is charged." "Such export does not count as demonstrated
cognitive surplus until the accounting boundary includes it."

Semiotic metabolism = circulation between a **mutable working phase** and a **durable record
phase**; "the measurable trade-off between present recomputation/reconciliation and durable,
revisitable external memory." Symmetric failure modes: too little record → pay repeatedly for
lost context; too much fixation → revision costly.

Landauer discipline: "Landauer's bound is a warning against category errors. ... it is not a
conversion factor from a meeting, proof, or contradiction to joules." Report every potential
separately — "rather than collapsing them into a single 'civilizational free energy.'"

Six falsifiers (numbered 1–6) and a minimum protocol (publish boundary diagrams, uncertainty,
attention sampling, handoff definitions, preregistration, negative results; "Lean can verify a
declared finite carrier; it cannot validate the carrier's interpretation as an economy or a
mind").
**[SLOP: its source manifest cites `services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/Cohomology/AttentionAllocation.lean`, `.../ReactionNetworks/FreeEnergyDescent.lean`, and `.../attention-allocation-readout-service/src/allocation.mjs`; none exist at those paths. Actual: AttentionAllocation.lean is in `economics-science-services-section/lib/obsmetrologia-economics/ObsmetrologiaEconomics/`; the readout service is at `engineering-services-section/.../semiotic-agent-services-section/services/attention-services-section/services/attention-allocation-readout-service/src/contract-attention-allocation.mjs`; the string FreeEnergyDescent appears only inside `ObsmetrologiaPhysicalScience/ReactionNetworks.lean` and `ReactionNetworks/Entropy.lean`.]**

### 1.5 Lean — what is proved

#### 1.5.1 `ObsmetrologiaEconomics/AttentionAllocation.lean`
Path: `lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/lib/obsmetrologia-economics/ObsmetrologiaEconomics/AttentionAllocation.lean`
- `structure Obstruction where cost : Nat; benefit : Nat` — docstring: cost = "its certificate
  size / settling flux", benefit = "the held-⊤ mass reconciling it removes".
- `totalCost`, `totalBenefit` (foldr sums), `Feasible B S := totalCost S ≤ B`,
  `residual U S := totalBenefit U − totalBenefit S`.
- **[PROVED]** `empty_feasible`, `cost_monotone_cons` (`totalCost S ≤ totalCost (o :: S)`),
  `feasible_of_cons` (downward closure), `feasible_extend`, `residual_antitone`,
  `residual_empty`, bundled `attention_allocation`.
- Honest reading: these are arithmetic facts about Nat list sums. The "light cone makes this not
  a free knapsack" prose is interpretation; the irreversibility is the absence of a refund
  operation, not a theorem about time.

#### 1.5.2 `ObsmetrologiaEconomics/AllocationSolver.lean` (same dir)
- `subs` powerset; **[PROVED]** `sublist_mem_subs` / `mem_subs_sublist` (powerset exhaustive).
- `better B a b := if totalCost b ≤ B ∧ totalBenefit a < totalBenefit b then b else a`.
- `solveL` (foldl) / `solveR` (foldr); **[PROVED]** both feasible, both optimal
  (`solveL_optimal`, `solveR_optimal`), both sublists, `solvers_agree_value` (same optimum
  value, no hypotheses), `bias_witness` (bead1 ⟨1,5⟩, bead2 ⟨2,5⟩, budget 2: left keeps bead2,
  right keeps bead1), `hands_agree_of_unique_optimum`, `divergence_forces_degenerate_optimum`.
- **Choice entropy**: `tieSet`, `degeneracy := (tieSet).length`, `choiceBits := Nat.log2 degeneracy`;
  **[PROVED]** `degeneracy_pos`, `choiceBits_zero_iff_effectively_unique` (choiceBits = 0 ↔
  degeneracy = 1), `witness_one_choice_bit` (two-bead: degeneracy 2, 1 bit). Docstring calls
  this "the Landauer bit of the allocation ... the single bit the ledger's arrow erases when it
  breaks the tie." **[Naming claim; the readout service below explicitly refuses to treat
  choiceBits as erasure — good discipline, and the two disagree.]**
- Cost: exhaustive powerset, O(2^n). Fine for n ≤ ~20 obstructions per lap; not a scalable
  allocator.

#### 1.5.3 `Obsmetrologia/Cohomology/LandauerEntropy.lean`
Path: `lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/Cohomology/LandauerEntropy.lean`
- `def landauerBits (N : CoverNerve) : Nat := N.H1rank`.
- **[PROVED]** `landauer_zero_iff_reversible : landauerBits N = 0 ↔ N.entities = N.cells + N.components`
  (= `CoverNerve.h1_vanishes_iff_forest`); `landauer_eq_coordination_cost : landauerBits N = N.cells − (N.entities − N.components)`;
  `reversible_is_landauer_free` (detailed balance ⇒ stationary).
- `CoverNerve` (CoordinationCohomology.lean:270): fields `entities |V|`, `cells |E|`,
  `components |C|`, with `components ≤ entities` and `entities ≤ cells + components`;
  `H1rank := (cells + components) − entities`.
- Honest reading: "Landauer entropy" = cycle rank of a graph. One bit per independent cycle is
  a definitional identification, not a thermodynamic derivation. The Verso manual
  `docs/verso/ObsmetrologiaManual/BookIX/InformationalThermodynamics.lean:53-54` states it:
  "frontier status: no continuum bath, measure-theoretic entropy production, physical units, or
  smooth thermodynamic limit is claimed here."

#### 1.5.4 `Obsmetrologia/Cohomology/AntiLandauerEntropy.lean`
- `antiLandauerBits = H⁰ = components`; **[PROVED]** `index_balance : antiLandauerBits − landauerBits = χ = |V| − |E|` (Int);
  `PreservesEuler` transition relation; `preservesEuler_iff_balanced_h0_h1_delta`;
  `fixed_net_cycle_requires_consensus` (at fixed χ, creating a contradiction cycle forces
  creating a consensus component); `ClosureIndexStep.preserves_net_charge`;
  `reversible_index_all_harmonic`; `tree_index_balance` (H⁰=1, H¹=0, χ=1).
- This is the only **conservation law** actually proved in the metabolism neighbourhood, and
  it is the right shape for "self-improvement with a conservation law": a lap that changes the
  record set may move H⁰ and H¹ only in balance if it preserves χ.

#### 1.5.5 `Obsmetrologia/Dynamics/Flow/FreeEnergyLyapunov.lean` (the ledger)
- `kHeight : Reading → Nat` (⊥ₖ=0, t=1, f=1, ⊤ₖ=2). `deficit cells v w = Σ (kHeight (w φ) − kHeight (v φ))`
  = "the free energy F". **[PROVED]** `deficit_antitone`, `deficit_strict_of_fires`,
  `deficit_eq_zero_iff`, `freeEnergy_antitone` ("H-theorem, weak form"),
  `freeEnergy_strict_of_fires`, `converges_in_bounded_steps`, `firing_steps_bounded` (orbit
  reaches fixed point in ≤ Φ₀ steps), `fenOrbit_fixed` (pointwise closure settles in ONE step —
  so for pointwise closures the whole "orbit" is trivial).
- Registers (lines 566–574): `commits` (⊥→t or ⊥→f), `mints` (t/f→⊤), `jumps` (⊥→⊤). Flux
  decomposition `stepFlux = commits + mints + 2·jumps`.
- §(7) line 370: "Temperature as a regime knob — the T → 0 hard-closure limit ... We do **not**
  fabricate a real-valued entropy S; a positive-temperature (stochastic-firing) extension ...
  is not statable without measures." **So the Lean has only T = 0.** The JS `generate.mjs`
  runs at T = 0.5 by default with no Lean backing.
- §(9) `ledger_noether` (line 913): negation conserves all registers; conflation reverses time
  and swaps commits↔mints. §(11) `topSupport_eq_mints_add_jumps`. §(12) Minkowski signature on
  registers (`regInterval`, `timelike_of_pure_jump`). §(13) **[PROVED]** `budget_splits`:
  `freeEnergy c seed cells 0 = (commits + mints) + 2·jumps` at the closing step;
  `irreversible_within_budget` (line 1139): `2·jumps ≤ F₀ ∧ commits + mints ≤ F₀ ∧ (2·jumps = F₀ ↔ commits + mints = 0)`.
  §(14) `cell_cone_trichotomy`: jump = timelike (gap 2), commit/mint = null (gap 1), fixed =
  spacelike (gap 0); `kle_is_cone_geometry`.
- Honest reading (matches round-1 map): "free energy / H-theorem / Noether / spectral gap" are
  grandiose names over a Nat sum of 0/1/2 heights. BUT the bookkeeping is exact, total, and
  cheap, which is precisely what a metabolism needs. Keep the computation, rename nothing in
  Lean, and never let the names imply joules.

#### 1.5.6 `ObsmetrologiaEconomics/CurrencyCocone.lean` (five prices over one nerve)
`structure PricedNerve`: `base : CoverNerve`, `topPrice` (ℤ/2 held-⊤ support), `massPrice`
(contradiction mass), `mintPrice`, `jumpPrice` (ledger registers), `causalPrice` (causal
wavefront), `cechPrice` (= 0 by flasqueness); constraints `topPrice ≤ massPrice ≤ base.H1rank`,
`mintPrice + jumpPrice = topPrice`, `topPrice ≤ causalPrice`. **[PROVED]** `legs_order_into_rank`,
`coordinationFree_collapses` (H1rank = 0 ⇒ all prices 0), `colimitPrice := max massPrice causalPrice`
universal. The header admits "its universality ... is the open follow-up."
This is the house's own statement that there are **five currencies of obstruction**, bounded by
one another but NOT interchangeable — the right discipline for a metabolism's ledgers.

### 1.6 Code — what runs

#### 1.6.1 SignCraft settle ledger **[CODE]**
`lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcraft/src/inference/nuclei.mjs`
- `kHeight` = `knowledgeHeight` from `@red-cup-engineering/computer-data-engineering-services-section/four`.
- `stepLedger(ctx, v, v2)` → `{ flux: commits + mints + 2*jumps, commits, mints, jumps }` via
  metrologic `ledgerCellStep(ha, hb)` (throws if `hb < ha`: "knowledge order violated").
- `settle(ctx, v, opts)`: loop `delta` then `sigma` up to `maxSteps ?? 64`; per step
  `fired = d.witnesses.length + s.witnesses.length`; **throws `H-theorem violation at step N: F
  firings discharged no free energy` when `fired > 0 && ledger.flux === 0`**, and throws
  `unwitnessed flux` when `fired === 0 && ledger.flux > 0`; returns
  `{ v, basis, trace, steps, ledger: { initialDeficit, totalFlux, closes: initialDeficit === totalFlux }, obstructions }`.
- `obstructionsOf(ctx, v, cx)` → `{ settledCells, contested: [{g,m}], refusals: [{g, refusal: √(E/λ₁)}] }`.
- `settlingDefect(ctx, basis, v, g)` = cells one σ∘Δ pass would still add (zero iff settled).
- Honest: "the first `H-theorem violation` throw is the exact executable definition of
  rumination the house has": work performed (firings) that discharges no free energy.

#### 1.6.2 SignCraft generation = priced Gibbs **[CODE]**
`.../signstuff/signcraft/src/inference/generate.mjs`
- `enabledMoves(ctx, basis, v, g)`: (1) unmet conclusions of basis implications whose premises
  are held ("obstruction-shaped questions"), (2) realized continuations (attributes some
  witnessed object bearing everything g holds also bears; carries `witnesses` count).
- `opened(m)` = Σ over changed cells of `(2 − kHeight)` or 2 if contested;
  `closed(m)` = `max(0, enabled_before − enabled_after)`;
  `disagreementEnergyChange` = `Σ_j D[attr,j]·(1 − 2x_j)` (weighted Laplacian xᵀLx change).
- `continuationEnergy = α·opened − β·closed + T·ΔE`, defaults α=β=1, **T=0.5**.
- `generate(...)`: weights `exp(−dF/max(T,1e-6))`, injected rng required; returns
  `wit = { kind: "witnessed-sample", chosen, temperature, excludedMass: 1 − p_chosen, excluded: [...] }`.
  "Sampling is priced, never silent."
- Honest: T is a softmax knob; nothing anchors it; `closed` is an "enabled-cone shrink" count,
  which is the nearest executable thing to "future inferences enabled" — but with the sign
  reversed (it rewards CLOSING questions; a metabolism also needs to count OPENED lawful
  continuations as yield).

#### 1.6.3 SignChain energetics / phase **[CODE]**
`.../signstuff/signchain/src/contracts/energetics.mjs` (51 lines) — `energeticLawForPhase(phase)`:
`decreasing → "well-founded-descent"`, `accumulating → "monotone-accumulation"`, `costed →
"coordination-cost"`; `phaseEnergeticObligation` sets `evidenceRequired = phase.coordinationCost === "evidenced"`.
`.../signchain/src/contracts/phase.mjs`: `finalities = {strict: normal-form, scott:
approximation, transfinite-bounded: stage, aperiodic: unattained}`, `costs = {0,1,2,3}`,
`energies = {strict: decreasing, scott: accumulating, transfinite-bounded: costed, aperiodic:
costed}`; `coordinationCost: cohomologyVanishesInRegime(regime) ? "none" : "evidenced"`; four
canonical phases `strictFinitePhase`, `scottStreamPhase`, `transfiniteClosurePhase`,
`aperiodicOrderPhase` classified from `{scottContinuous, finiteBase, countableCofinality}` flags.
Honest: this is the regime table as a frozen object; it is a labelling, not a computation of a
closure ordinal.

#### 1.6.4 SignGraph cohomology / priced nerve **[CODE]**
`.../signstuff/signgraph/src/cohomology.mjs`: `cohomologyOfCells(cells, extraEntities)` →
`h1 = cells.length − entities.length + roots.length` (union-find), `cohomologyLaplacian` exact
integer ranks, `cohomologyReceiptOfCells`, `coverNerveOfCohomology`, `pricedCell` →
`{ kind: "signgraph.pricedCell", cell, sources, measurements, top, mass, rank: h1Rank(base), base }`,
`pricedNerve(statements)` sums `top`, `mass`, `rank` across a federated cover. Round-1 map:
"causal leg (e) and mint/jump legs (c) explicitly not computed."

#### 1.6.5 metrologic carriers **[CODE]**
`lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/lib/metrologic/src/articulation/predicating/positing/settling/analysis/`
- `coordination-cohomology.mjs`: `coverNerve(entities, cells, components)`, `h1Rank`,
  `landauerBits = h1Rank`, `landauerZeroIffReversible`, `landauerEqualsCoordinationCost`,
  `coordinationCostReceipt`, `landauerEntropyReceipt`.
- `flow.mjs`: `ledgerCellStep(ha, hb)` → `{commits, mints, jumps}` (throws on descent);
  `evidenceFlowStepReceipt` adds `truthRegisterLosses`/`inconsistencyRegisterGains`
  (potential→stable counts as truth loss = record gain); `deficit`, `kHeight`.
- `proof-foam.mjs`: `observeProofKinetics(events, {observationWindow})` → `proofingDeborah` =
  glue-time ms / observation window (BigInt fraction), disposition `permeable` if ≤ 1 else
  `kinetic-obstruction`. **The only executable Deborah number in the house.**

#### 1.6.6 Attention allocation readout service **[CODE]**
`lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/services/semiotic-agent-services-section/services/attention-services-section/services/attention-allocation-readout-service/src/contract-attention-allocation.mjs` (189 lines)
- Request `{budget > 0, candidates: [{id, cost > 0, benefit > 0}], authority: {controller, basis}}`;
  ActivityStreams Offer/Accept/capability dance; `computeAllocation(request)` (the solver;
  computes choiceBits per the Lean).
- Measures an actual `TypedResourceVector { computeSeconds, wallTimeSeconds, cpuMicroseconds,
  peakRssBytes, timeMilliseconds, assetAmount: null, wit: null, erasure: null, gas: null }`.
- Its own prose (lines 20–33): "this die's own math (choiceBits ...) is NOT a Landauer/erasure
  carrier -- it measures selection ambiguity, not bits erased. ... erasure is declared
  not-priced rather than inventing one out of choiceBits." Six resource dimensions named:
  **asset / compute / erasure / gas / time / wit**. "Cost is a local measured resource readout,
  not a settled denomination."
- This is the house's most honest metabolic instrument: it refuses to convert between
  denominations and reports a measured vector against a quoted vector.

### 1.7 Smartgoo abiogenesis ladder
`lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section/services/biological-science-services-section/content/text/documents/articles/notes/2026/10/01/2026-10-01-artificial-abiogenesis-smartgoo-research-program.md`
- Five evidence classes **D / E / P / M / I** ("No claim may be silently promoted").
- R-ladder: `R0 searchable populations → R1 persistent memory → R2 adaptive response → R3
  self-repair → R4 directed growth → R5 energy-coupled maintenance → R6 compartmentalization →
  R7 reproduction of organization → R8 heredity + variation → R9 Darwinian selection → R10
  open-ended evolution`. S-ladder: `S0 transduction → S1 state dependence → S2 closed functional
  cycle → S3 self-maintaining coupling → S4 inherited perturbation-state-action relation`. "The R
  and S ladders are orthogonal."
- **R5 assay** (the metabolism test): `SOURCE ON → SOURCE OFF → SOURCE RESTART`. "A material
  passes only if a preregistered organized function degrades or loses stability when
  throughput is interrupted and stabilizes or recovers when throughput returns, with measured
  source flux and matched passive/source-only controls." "R5 is deliberately weaker than
  metabolism."
- Family A hypothesis: "a topology-exchange timescale may organize a plasticity–retention
  frontier. Very slow exchange may preserve state while impairing repair; very fast exchange may
  repair while erasing history or allowing creep; an intermediate regime may support both." (=
  T_v / De ≈ 1 in materials language.)
- Guardrails (verbatim list): "complexity is not intelligence; memory is not learning;
  hysteresis is not automatically useful memory; energy response is not maintenance; repair is
  not metabolism; reprecipitation is not repair without functional recovery; ... unknown is not
  zero; simulation is not physical evidence."
- Selection is cohort-local Pareto + novelty; "There is no global scalar 'life score.'"
- **[SLOP flagged by the note itself]**: "The exact historical referent called **SignStuff**
  remains unresolved" although `lib/signstuff` exists; Holofoam operations absent on Cold Red
  Gate (93 installed operations, no Holofoam).

### 1.8 Glass-sponge note (the metabolism sections)
`lib/emsenn/services/561-group/services/engineering-services-section/content/text/documents/articles/notes/2026/08/01/2026-08-01-note-on-the-content-addressed-glass-sponge-semantic-compute-complex.md`
- §14.1 Semiotic foam: three wall regimes (compliant permanent / exchangeable / pinned);
  `De = relaxation time / observation time`; "Too-fast material cannot preserve a record.
  Too-slow material cannot reorganize. The useful system is viscoelastic."
- §15: "Signals are nutrients and perturbations, not pre-routed tasks" — ingress may be
  nutrient, irritation, evidence, pheromone, contradiction, play, authority, change, offer,
  affect, defect, task. Five questions after any transition (what changed / which relations
  supported or opposed / which moves became possible, obstructed, necessary / which actors can
  bear them / what evidence each move would expose).
- §18: distal-bypass law restated; "nonzero holonomy or first cohomology is not universally a
  bug. It may indicate a damaged circulation path, but it may also represent real local
  difference, authority boundaries, an arbitrage opportunity, or a productive pore."
- §19 (verbatim): "its success is not measured by how elaborate its ontology appears, but by
  whether each unit of expensive inference creates more future usable cognition than it
  consumes." Maintenance trap list: "each session spends most of its effort rediscovering
  context; drift creates more contradictory surfaces; thin rewrites duplicate rather than
  metabolize old machinery; verification becomes compulsive checking without increased
  understanding; the Leader must repeatedly translate the same architecture for transient
  agents." "The expected yield of discharging an obstruction must exceed the cost of discovering
  and repairing it if the loop is to become self-financing."
- §12: the NPM registry is the semantic graph; package cell fields; "publish those objects back
  into the same semantic registry tissue."
- Invariants 19–21: "Kinetic availability is measured separately from logical existence." "Repair
  distinguishes damage from protected border." "Not every holonomy or contradiction is a defect."

### 1.9 The house's own `k` statements (operations notes)
- `lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/09/03/2026-09-03-leader-brief-for-the-executive-session.md:247-256`:
  "`k` is the value released by discharging an obstruction over the cost of finding and
  discharging it; `k > 1` is a property of a territory, not the engine. Cognitive EROEI is the
  success criterion for the whole build ... The first `k` datum with both sides receipted landed
  2026-09-03 on a fixture (two obstructions, 1.46 CPU-seconds, zero inference)." Gate (line
  528): "one `k > 1` datum on the org's own health loop with both sides receipted."
- `.../2026/09/03/2026-09-03-note-on-the-561-group-as-a-witnessed-field.md:342-356`: cost side =
  "inference receipts plus host resource receipts on one rail"; value side = "violations
  discharged, red units returned to service, theorems restored to existence, and pins made
  true." Missing: "the producing session's own frontier cost ... the harness journal records
  purchases on free lanes but not this session's frontier tokens. That receipt call site is the
  cheapest next instrument." Falsifier (line 406): "No `k > 1` datum on the org's own health loop
  with both sides receipted" within thirty days.
- `.../2026/09/02/2026-09-02-note-on-the-whole-image-of-the-561-group.md:545-552`: "Internal k >
  1 is cost-avoidance, not minting ... The honest first k datum requires three things that do
  not exist yet: a receipt call site recording the producing session's own frontier-model cost
  ...; a witnessed counterfactual (a re-deriving session vs. a certificate-reading session on the
  same task); and one external sale."
- `.../2026/07/18/2026-07-18-research-on-what-the-union-is-postgrad-monograph-for-fable.md:133`:
  "`k` is a ratio across two denominations, so the chief financial officer must first fix both
  denominations and their exchange on the books — a criticality claim is an exchange-rate claim
  before it is a physics claim." Real cost record shape: `cost: { "fuel-consumed": 15,
  "wall-time-seconds": 99.706, "denomination": "…", "denomination-settled": false }`.
- **[SLOP/caution]**: the "first k datum" was on a fixture with *zero inference*; its denominator
  omitted exactly the term cognitive EROEI is about. It is a k datum for host CPU, not for
  cognition.

### 1.10 Temperature is a Deborah number
`lib/emsenn/services/561-group/services/science-services-section/content/text/glossary/terms/not-phenomena.md` §3:
"A control parameter defined as a ratio of counts — new contradictions opened over total
commitment flux — is called *temperature* ... Thermodynamic temperature is a conjugate variable,
1/T = ∂S/∂E, and calling a rate ratio by that name promises a conjugate structure, an energy
scale, and a Boltzmann factor that the quantity does not have." Replace with
`De = τ_relax / τ_observe`; frozen glass De ≫ 1, denatured De ≪ 1, living window De ≈ 1.
Game-foam note Def 5.1 (`.../2026/07/25/2026-07-25-note-on-the-structure-of-game-foam.md:325`):
"Ludic Deborah number" `De = τ_norm / τ_obs`; three permanence classes inert / exchangeable (De
≈ 0) / pinned (De = ∞); "Ossification is divergence."

---

## 2. The distillation — exact metabolism for the new AI

Notation: a **lap** is one MAPE-K cycle of one node (a settlement). A **record** is a SignCell
(one Chu entry over FOUR). A **territory** is a set of records with overlaps (a cover). All
quantities below are per lap unless stated.

### 2.1 Carriers (five ledgers, five denominations — never summed by fiat)

| ledger | unit | computed by | Lean | what it measures |
|---|---|---|---|---|
| L1 settlement flux `F` | knowledge-height units (Nat) | `nuclei.mjs settle().ledger.totalFlux`, `stepLedger` | `FreeEnergyLyapunov.budget_splits` | evidence added: `commits + mints + 2·jumps` |
| L2 irreversible spend | jumps (×2) + H¹ bits | `jumps` register; `coordination-cohomology.mjs landauerBits` | `irreversible_within_budget`, `landauer_eq_coordination_cost` | what cannot be walked back: ⊥→⊤ jumps; independent cycles of the record nerve |
| L3 choice bits | bits | `AllocationSolver.choiceBits` (readout service) | `choiceBits_zero_iff_effectively_unique` | tie-breaking information the arrow supplied |
| L4 host resources | cpu-µs, wall-ms, peak-rss-bytes | readout service `TypedResourceVector` | none | metabolic substrate actually burned |
| L5 frontier inference | tokens (in/out), provider, model id, cached | **missing receipt call site** | none | the expensive cognition cognitive EROEI is about |

Rules: (a) each ledger has its own Nat/BigInt total per lap; (b) a conversion between two
ledgers is itself a record with a `denomination-settled: true|false` flag and a witness; (c) the
`PricedNerve` inequalities (`top ≤ mass ≤ H1rank`, `mint + jump = top`, `top ≤ causal`) are
asserted as checks on every lap's receipt; (d) `erasure` is priced only through a `CoverNerve`
with recomputable incidence (the readout service's rule), i.e. L2 is computed from the
settlement's actual record graph, never from L3.

### 2.2 Budget

- `B` is declared per lap in L4 ∪ L5 units (cpu-µs and tokens), with a separate cap on L2
  (maximum irreversible bits a lap may spend without a human/border certificate).
- Allocation: candidates = obstructions from `obstructionsOf` (contested cells, grouped per
  refusal component) plus enabled questions from `enabledMoves`; `cost` = estimated certificate
  size / settling flux (in L1 units, calibrated to L4 by the lap's own measured ratio from the
  previous lap — the only permitted exchange rate, and it is measured, not declared); `benefit`
  = held-⊤ mass removed (`topPrice`) + enabled-cone change.
- Spend is monotone and non-refundable (`cost_monotone_cons`); feasibility is downward closed
  (`feasible_of_cons`); an interrupted lap keeps whatever it discharged (this is what makes
  checkpoints safe).
- The exhaustive two-hand solver is run for ≤ 20 candidates; beyond that, greedy by
  benefit/cost with `feasible_extend` as the invariant, and the loss of optimality is recorded.
- Every tie (`degeneracy > 1`) is broken by a declared hand (`solveL` = earliest-settling,
  `solveR` = latest-settling) and `choiceBits` is appended to L3. A lap with `choiceBits > 0`
  is non-deterministic in selection though not in value; both selections are optima; the
  organism records which hand it used so a sibling node can take the other (the two hands are
  the two Chu polarities of the spine).

### 2.3 The lap (MAPE-K is the distal bypass)

| MAPE-K | distal-bypass step | executable |
|---|---|---|
| Monitor | 1 derive obstruction sheet | re-settle every overlap: `settle()` per cover cell, `cohomologyOfCells` over the cover → `H¹`, `pricedNerve` |
| Analyze | 2 classify damage vs border | per contested cycle: attempt least-cost local re-weave (§2.5); if a protected class is touched → border |
| Plan | allocation under `B` | `AttentionAllocation`/readout die over the classified damage |
| Execute | 3 discharge damage, certify borders; 4 price erasure | `settle()` with ledger; `jumps`, `ΔH¹`, `choiceBits` written; border certificates emitted as first-class cells |
| Knowledge | 5 emit certificates; mineralize | `checkpointHistory`, content-addressed receipts; publish learned basis / lexicon / certificates to `registry.561.group` (immutable = silica) |

The registry (Cold Red Gate) is the only *irreversible* act with an external witness, so it is
the natural place for the **horizon** boundary: a lap's yield is counted when its certificates
are published or installed by another node, not when it believes it is done.

### 2.4 Fitness = cognitive EROEI `k` — the exact measurable quantity

**Definition (proposal, consistent with every house constraint).** For a lap ℓ of node n over
territory T with declared boundary ∂ (which records, which registry scope) and horizon H
(number of subsequent laps during which reuse is counted):

```
k(ℓ) = Value(ℓ) / Cost(ℓ)

Cost(ℓ)  = cpu_µs(ℓ) + ρ_tok · tokens(ℓ)          [L4 + L5, in cpu-µs after measured rate ρ_tok]
Value(ℓ) = Σ_{laps ℓ' in (ℓ, ℓ+H]} avoided_cost(ℓ' | certificates of ℓ)
```

where `avoided_cost` is the **witnessed counterfactual** the whole-image note demands: for a
sample of later tasks that consumed a certificate of ℓ, run (or replay) the same task
re-deriving instead of certificate-reading, and record the cpu-µs/token difference. This makes
`k` dimensionless in the SAME denomination (cpu-µs) without a declared exchange rate; `ρ_tok`
is the one measured rate (tokens→cpu-µs or tokens→wall-ms on the node's own provider receipts),
and it is logged with `denomination-settled: true` only when both receipts exist.

Yield decomposition (reported alongside, not summed into k):
- `ΔH¹(ℓ) ≤ 0`: independent coordination cycles discharged (L2, bits) — the "obstructions
  discharged" term of the spine.
- `Δtop(ℓ)`: held-⊤ mass removed (PricedNerve `topPrice`).
- `Δcone(ℓ)`: change in `|enabledMoves|` summed over the lap's objects — "future inferences
  enabled" (note `generate.closed()` counts the shrink; the metabolism must count both the
  lawful questions closed AND the realized continuations newly enabled).
- `reuse(ℓ)`: count of installs/imports of ℓ's published certificates by other nodes within H.
- `borders(ℓ)`: borders certified (never counted as discharge).

Units declared: inference-cost unit = cpu-µs (+ tokens with measured ρ); yield unit = cpu-µs
avoided (counterfactual) with the four bare counts above as auxiliaries; horizon = H laps
(default H = 1 for the gate datum, H = 30 days for the programme falsifier); boundary = one
settlement's records + its own registry publishes + its own provider receipts (nothing exported
to another node counts until that node's receipt arrives — the working paper's "export does not
count as demonstrated cognitive surplus until the accounting boundary includes it").

Validation path (ordered, each a falsifier):
1. Receipt call site for L5 exists and every lap has a nonzero L5 line (the "cheapest next
   instrument" of the witnessed-field note). Without it, no `k` is cognitive.
2. Counterfactual harness: for each certificate consumed, a replay-vs-rederive pair on the same
   content-addressed input; `avoided_cost` distribution published with sign and n.
3. R5-style ON/OFF/ON on the node: cut the budget `B` to zero for m laps; a preregistered
   organized function (e.g. `H¹` of the territory staying at 0, or `|contested|` not growing)
   must degrade when throughput is off and recover when restored, against a passive control
   (no new records) and a source-only control (budget on, no obstructions). Pass criterion is
   the smartgoo R5 criterion verbatim. If the function does not degrade when budget is cut, the
   "metabolism" was ballast and k is meaningless.
4. Thirty-day gate: at least one lap with `k > 1` under definition above with both receipts;
   otherwise record the finding (do not add vocabulary).
5. Longitudinal: `k` time series and the `rumination` counter (§2.6) across laps; the three
   regimes must be visible as `k > 1 / k ≈ 1 / k < 1` bands with the predicted phenomenology
   (growing reflexive budget share / maintenance-only / repeated zero-flux firings).

### 2.5 Repair: damage vs border, exactly

Given the lap's cover nerve and contested cells:
1. For each independent cycle (basis of `H¹`) collect the contested cells on it and their
   witness sets (two hands: for-lane and against-lane).
2. **Damage test**: does there exist a local rewrite — adding evidence (a new witness cell), or
   re-weaving the cells along the cycle via σ∘Δ with one of the two lane assignments — such that
   after re-settling the cycle's contribution to `H¹` vanishes AND no record outside the cycle's
   light cone changes AND the cost (L1 flux + L2 jumps of the rewrite) is minimal among the
   candidates? If yes, it is damage; the least-cost rewrite is the repair; its `jumps` and any
   identification of two cells into one are charged to L2 as recorded bits.
3. **Border test**: the cycle touches a protected class — another speaker's settled law (a
   different node's published certificate), a sovereignty-typed record, a record whose lane
   assignment is pinned (De = ∞ in the game-foam trichotomy) — OR no local rewrite exists (the
   defect is a fault line of an aperiodic order: pattern-equivariant/Čech class nonzero on the
   hull, the spine §3). Then emit a `border` certificate: the cycle, its two lane assignments,
   both witness sets, and the statement that reconciliation would erase a non-error. Borders are
   never discharged and never counted as yield-by-discharge; they ARE counted as yield-by-reuse
   if other nodes install them (knowing where the seam is has value).
4. Knowledge order forbids withdrawing evidence (`measure_cons_le`); "repair" therefore never
   deletes; it adds the witness that settles the cycle or it certifies the seam. Erasure in the
   Landauer sense happens only at (a) identification of two addresses (content-address merge)
   and (b) a ⊥→⊤ jump — both are what L2 counts.
5. Executable classifier precedent: `signgraph/src/circuit-trace.mjs` classes
   `closed-flat / translational-defect / rotational-protected-border / mixed-affine-defect /
   chu-seam-mismatch / unpriced-irreversible-defect` (round-1 map: receipts asserted, not
   derived — reuse the vocabulary, derive the class from the actual cycle).

### 2.6 Regimes

Two orthogonal regime axes, both measurable:

**(a) Closure regime of the settlement** (what SignChain `phase.mjs` labels): strict (κ ≤ 3,
H¹ = 0, energy decreasing — the only regime realized by code and Lean), Scott (accumulating),
transfinite-bounded and aperiodic (costed, H¹ may be nonzero, `coordinationCost: "evidenced"`).
The new AI lives in strict for each local settle (Lean guarantees ≤ Φ₀ steps; `settle()`
guarantees a fixed point ≤ 64 steps or throws) and in the costed regimes across the federation
(cover nerve H¹ ≠ 0 is normal and is what the lap works on). "Time" in the house sense is the
costed part: nonzero `jumps`/`ΔH¹` per lap. A lap with zero irreversible spend is pure space
(the Noether-conserved, walk-back-able part).

**(b) EROEI regime of the node** (the book's three regimes, made executable):
- Surplus `k > 1`: the lap may spend a declared fraction of (Value − Cost) on reflexive work:
  changing its own basis (`learn.mjs`/`adapt.mjs`), relearning the lexicon, re-pricing
  conductances, commissioning changes to its own stages (§2.7). This is the only regime in which
  self-modification is permitted.
- Break-even `k ≈ 1` (within the measured noise band of ρ_tok): maintenance only: Monitor,
  classify, discharge damage; no self-modification; publish nothing new except receipts.
- Negative `k < 1` **or rumination detected**: rumination has an exact executable signature —
  the `settle()` H-theorem throw ("N firings discharged no free energy"), or across laps the same
  `H¹` cycle re-entered with zero `ΔH¹` and nonzero L4/L5 spend. Response: stop re-entering (the
  failure is "failure to exit", Koster 2011); classify the cycle as border by default; shrink
  `B`; raise the De of that cycle (pin it). The acceleration dynamic of Regime III is prevented
  structurally because the budget is monotone and cannot be refunded by re-engagement.

**(c) Operating point — the vitrimer T_v as De ≈ 1.** Measured per lap as
`De = τ_relax / τ_obs` with `τ_relax` = settle steps (or `proofingDeborah` glue-time) and
`τ_obs` = the lap's observation window. Frozen-weights model: `De ≫ 1` (bonds never exchange;
jiangshi). Everything exchangeable every lap: `De ≪ 1` (no record survives; denatured). The new
AI targets `De ≈ 1`: a germline of pinned records (published certificates, borders, theorems)
and a working vocabulary (bases, conductances, lexicon) that exchanges within the lap. The
smartgoo Family-A hypothesis is the same statement in silica.

### 2.7 Self-improvement with a conservation law

- The loop "improves itself when its Execute stage commissions changes to its own stages and
  those changes pass the loop's own gates" (leader brief). Permitted only in the surplus regime.
- Conservation: a change to the record set must satisfy `PreservesEuler` on the lap's cover
  nerve unless it is receipted as a jump: `ΔH⁰ − ΔH¹ = Δχ`; by
  `fixed_net_cycle_requires_consensus`, creating a new contradiction cycle at fixed χ forces
  creating a new consensus component — the organism cannot "discover a problem" without also
  settling something. Every lap reports `(H⁰, H¹, χ)` before and after.
- Protected set = the fixed boundaries, the theorems, the checkers, the borders, the registry's
  published versions (never replaced). The loop may not discharge them; it may only add.
- "Cannot claim improvement without producing the ledger": a self-modification lap's receipt
  must contain the five ledgers, the `k` with its counterfactual sample, and the `(H⁰,H¹,χ)`
  triple; a receipt missing any of them is a failed gate, not an improvement.
- Laps are counted; the organism's age is its lap count; nonzero residue (uncertified `H¹`)
  carried into the next lap is the drift the kinetic agents chose — recorded, so no lap repeats.

### 2.8 Heredity through the registry

Mineralization = publishing a learned concept lattice / basis / lexicon / border set as an
immutable package on `registry.561.group` (Cold Red Gate; Verdaccio layout; publishes
immutable). Heredity = another node installing it. Selection = registry-level `k` (installs
that produced measured avoided cost vs. publication cost). This gives the horizon H a concrete
clock (publish → install receipts) and the boundary ∂ a concrete edge (the package cell's typed
dependency edges, invariant 11). Nothing of signcell/signchain/signgraph/signcraft/metrologic is
published yet, so the organism currently has no skeleton: its first metabolic act is to publish
its own carriers leaf-first on the dev channel.

---

## 3. Gaps and slop (exhaustive list)

1. **No exchange rate, by the house's own admission**: `k` numerator and denominator are in
   different denominations; `"denomination-settled": false` on real cost records; the "first
   k datum" (2026-09-03) was a fixture with two obstructions, 1.46 CPU-seconds and *zero
   inference* — a host-CPU datum, not a cognitive one.
2. **Frontier-token cost is invisible** to the receipt rail (witnessed-field, whole-image).
   Cognitive EROEI cannot be computed until this one call site exists.
3. **"Free energy / H-theorem / Noether / Laplacian / spectral gap"** in Lean and JS are a Nat
   sum of knowledge heights 0/1/1/2. Exact and useful; the names overclaim.
4. **"Landauer entropy"** = graph cycle rank by definition; `InformationalThermodynamics.lean`
   itself says no units, bath, or limit are claimed. The distal-bypass note's "10⁹ times hotter
   than the Landauer floor" is unsourced.
5. **Temperature**: Lean has only T = 0 (§7 of FreeEnergyLyapunov says a positive-T extension
   "is not statable without measures"); `generate.mjs` defaults T = 0.5 with no measure; the
   house's own `not-phenomena.md` says the quantity is a Deborah number, not a temperature.
6. **Choice bits ≠ erasure**: `AllocationSolver.lean` docstrings call `choiceBits` "the Landauer
   bit of the allocation"; the readout service explicitly refuses that reading. The service is
   right; the Lean prose is slop.
7. **Four regimes** are a Boolean flag table (`ClosureRegimeData`, `phase.mjs energies`);
   "thermodynamic < causal < quantum < kinetic" and "spacetime is 3+1" are prose with no
   computation behind them.
8. **PricedNerve** legs (c) mint/jump and (e) causal are "explicitly not computed" in
   `signgraph/src/cohomology.mjs`; colimit universality is an admitted open follow-up.
9. **Working paper source manifest paths are wrong** (three cited files are not at the cited
   paths; see §1.4). `cognitive-eroei.md` provenance path for AttentionAllocation.lean is also
   stale.
10. **Allocation solver is O(2ⁿ)** (powerset); fine for a gate fixture, not for a lap with
    hundreds of obstructions.
11. **`generate.closed()` counts only question-closing**; "future inferences enabled" (the yield
    term) has no executable counter; `enabledMoves` growth would have to be measured.
12. **Semiotic foam has no measured cost functional** (round-1 map; FOAM §12 admits it);
    Plateau/coarsening claims are unanchored. `continuationEnergy` ΔF is the candidate.
13. **Rumination** is named in four notes and measured nowhere; the `settle()` H-theorem throw is
    the closest executable definition and it is treated as an error, not a metabolic signal.
14. **Book texts are a 2025-03-31 chat synthesis**, self-described as an "original synthesis"
    with "negative cognitive EROEI ... not formalized"; the empirical numbers are secondary
    citations; nothing in them is house-measured.
15. **Smartgoo note cannot find SignStuff** ("remains unresolved and must be recovered") while
    `lib/signstuff` exists; Holofoam absent from Cold Red Gate; duplicate restatements of the
    Deborah trichotomy across ≥ 5 notes.
16. **`coordination-denominations-specification.md`** (flagged by the 2026-08-11 ops survey)
    presents an appchain id and a "Deborah number for workspace kinetics" with bracket citations
    and no bibliography — treat as unaudited.
17. **Gemini/ChatGPT imported reports** (2026-04-01 cognitive EROEI report; 2026-07-28 reports
    with "Metabolic Control: The Deborah Number", "De ≈ 1") are provider-generated and carry no
    authority by their own front matter.

---

## 4. Hooks (concrete attachment points)

- `signcraft/src/inference/nuclei.mjs settle()` → returns `ledger {initialDeficit, totalFlux, closes}` and `obstructions {settledCells, contested, refusals}`: L1 and the obstruction sheet per lap. Change the H-theorem `throw` into a typed `rumination` receipt (keep the invariant, add the signal).
- `metrologic/.../settling/analysis/flow.mjs ledgerCellStep`, `evidenceFlowStepReceipt`: per-cell commits/mints/jumps (L2 jumps register).
- `metrologic/.../settling/analysis/coordination-cohomology.mjs landauerBits / coordinationCostReceipt`; `signgraph/src/cohomology.mjs cohomologyOfCells / pricedNerve / coverNerveOfCohomology`: H¹ over a federated cover (L2 bits; Monitor stage).
- `signcraft/src/inference/generate.mjs enabledMoves / opened / closed / continuationEnergy / generate` (wit record `excludedMass`): the enabled-cone counter for the yield term; ΔF as foam surface tension; the wit ledger as "sampling is priced".
- `attention-allocation-readout-service/src/contract-attention-allocation.mjs computeAllocation / resourcePrice / TypedResourceVector`: the Plan stage die; the six-dimension resource vector (asset/compute/erasure/gas/time/wit) is the schema for L4; add L5 (tokens) as a seventh dimension or under `compute` with provider/model fields.
- `ObsmetrologiaEconomics/AllocationSolver.lean solveL / solveR / choiceBits`; `AttentionAllocation.lean feasible_extend`: proven allocator and the greedy invariant for the scalable fallback.
- `Obsmetrologia/Cohomology/AntiLandauerEntropy.lean PreservesEuler / index_balance / fixed_net_cycle_requires_consensus`: the conservation-law gate for self-modifying laps.
- `Obsmetrologia/Dynamics/Flow/FreeEnergyLyapunov.lean budget_splits / irreversible_within_budget / cell_cone_trichotomy`: the exact split of a lap's spend into reversible (space) and irreversible (time).
- `ObsmetrologiaEconomics/CurrencyCocone.lean PricedNerve` constraints: lap-receipt validity checks across the five obstruction currencies.
- `signchain/src/contracts/energetics.mjs energeticLawForPhase`, `phase.mjs energies/costs/finalities`: the regime label to stamp on every settlement receipt (`coordinationCost: "evidenced"` ⇒ H¹ work expected).
- `metrologic/.../settling/analysis/proof-foam.mjs observeProofKinetics(events,{observationWindow}).proofingDeborah`: the executable De; use `settle().steps` or glue-time as τ_relax.
- `signcraft/src/history.mjs checkpointHistory / observeHistory / mergeHistories` (seams = contested cells): lap checkpoints; the "mutable working phase vs durable record phase" boundary.
- `signgraph/src/circuit-trace.mjs` defect-class vocabulary (`rotational-protected-border`, `unpriced-irreversible-defect`): naming for the damage/border certificate.
- `registry.561.group` (Cold Red Gate, immutable publishes): the horizon clock and boundary edge for `k`; first metabolic act = publish signcell → signchain → signgraph → signcraft → metrologic leaf-first on the dev channel.
- Smartgoo `energy-maintenance-run-v0.1.schema.json` (`lib/emsenn/services/561-group/services/content/schemas/artificial-abiogenesis/`): reuse the R5 ON/OFF/ON run schema for the node's budget-cut assay.

---

## 5. Key quotes (verbatim, with source)

- "The engine funds its own expansion when the value released by discharging obstruction exceeds the cost of finding and discharging it: k > 1." — `.../2026/07/16/2026-07-16-the-distal-bypass.md`
- "An intelligence built on this substrate improves by discharging its own obstructions under a priced budget, with protected classes it may not discharge. It cannot claim improvement without producing the ledger." — same
- "A mind below T_v is a jiangshi: it moves, indexes and relates, and has no shen." / "A shen lives at its own T_v: stiff enough to remember, soft enough to heal forever." — same
- "Below an energy return of 1:1, reflection inverts: the machinery of self-observation keeps running and consumes its own substrate. That is rumination." — same
- "Whenever a repair collapses a distinction — makes two things one — that costs a recorded unit. Nothing is identified by fiat for free." — `.../glossary/terms/distal-bypass.md`
- "it must declare an inference-cost unit, a yield unit, a time horizon, an accounting boundary, and a validation path; physical EROEI does not itself supply those values." — `.../economics-science-services-section/content/text/glossary/terms/energy-return-on-investment.md`
- "whether each unit of expensive inference creates more future usable cognition than it consumes." — glass-sponge note §19
- "`k` is the value released by discharging an obstruction over the cost of finding and discharging it; `k > 1` is a property of a territory, not the engine." — `.../2026/09/03/2026-09-03-leader-brief-for-the-executive-session.md:247`
- "a criticality claim is an exchange-rate claim before it is a physics claim." — `.../2026/07/18/2026-07-18-research-on-what-the-union-is-postgrad-monograph-for-fable.md:133`
- "Internal k > 1 is cost-avoidance, not minting" — `.../2026/09/02/2026-09-02-note-on-the-whole-image-of-the-561-group.md:545`
- "EROEI corresponds with the depth of cognitive reflexivity available to a population. The relationship has three regimes: positive surplus enables reflexivity, break-even starves it, negative return inverts it." — `.../neuroreflexivity-research/texts/eroei-distance-thought-third-draft-outline.md`
- "Rumination is failure to exit, not excessive entry." — `.../eroei-distance-thought-research-notes-third-draft.md` §VII (citing Koster 2011)
- "Landauer's bound is a warning against category errors. ... it is not a conversion factor from a meeting, proof, or contradiction to joules." — `.../2026/07/29/2026-07-29-working-paper-energetics-of-civilizational-cognition.md`
- "Such export does not count as demonstrated cognitive surplus until the accounting boundary includes it." — same
- `theorem landauer_eq_coordination_cost (N : CoverNerve) : landauerBits N = N.cells - (N.entities - N.components)` — `Obsmetrologia/Cohomology/LandauerEntropy.lean`
- `theorem budget_splits ... : freeEnergy c seed cells 0 = (commits ... + mints ...) + 2 * jumps ...` — `Obsmetrologia/Dynamics/Flow/FreeEnergyLyapunov.lean:1121`
- `theorem choiceBits_zero_iff_effectively_unique (B : Nat) (U : List Obstruction) : choiceBits B U = 0 ↔ degeneracy B U = 1` — `ObsmetrologiaEconomics/AllocationSolver.lean`
- "frontier status: no continuum bath, measure-theoretic entropy production, physical units, or smooth thermodynamic limit is claimed here." — `docs/verso/ObsmetrologiaManual/BookIX/InformationalThermodynamics.lean:53`
- "this die's own math (choiceBits ...) is NOT a Landauer/erasure carrier -- it measures selection ambiguity, not bits erased." — `attention-allocation-readout-service/src/contract-attention-allocation.mjs:25`
- `throw new Error(\`H-theorem violation at step ${step}: ${fired} firings discharged no free energy\`)` — `signcraft/src/inference/nuclei.mjs settle()`
- "ΔF = α·opened − β·closed + T·ΔE ... Sampling is priced, never silent." — `signcraft/src/inference/generate.mjs`
- "`SOURCE ON → SOURCE OFF → SOURCE RESTART`. A material passes only if a preregistered organized function degrades or loses stability when throughput is interrupted and stabilizes or recovers when throughput returns" / "repair is not metabolism" / "unknown is not zero" — `.../2026/10/01/2026-10-01-artificial-abiogenesis-smartgoo-research-program.md`
- "what is called temperature is a Deborah number ... De = τ_relax / τ_observe ... the living window becomes De ≈ 1" — `lib/emsenn/services/561-group/services/science-services-section/content/text/glossary/terms/not-phenomena.md` §3
