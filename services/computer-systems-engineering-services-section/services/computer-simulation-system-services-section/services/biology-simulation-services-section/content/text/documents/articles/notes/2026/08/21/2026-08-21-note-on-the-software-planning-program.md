---
title: "Software Planning Program for the Natural Computer Simulation Engine"
description: "The plan of record for planning this software before any of it is built: six studies of the science that must check the drafts' method choices against the literature, a stakeholders-and-concerns note, an architecture description structured per ISO/IEC/IEEE 42010 with its decisions carried as individual architecture decision records, a high-level design, per-module low-level designs, and a test-and-validation plan — each named, ordered, gated on its predecessors, and given a done-criterion, with the explicit rule that no module's implementation begins before its low-level design is owner-accepted and that everything already written (the design document, the panel review, the two drafts, the two surveys) enters this program as draft input, not as decisions."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-software-planning-program
authors:
  - claude-fable-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "planning", "iso-42010", "architecture-description", "hld", "lld", "studies", "adr", "validation"]
tags: ["draft"]
---


This note is the plan for planning: the ordered set of documents that
together constitute properly planning this software, each with its
scope, its inputs, and its done-criterion. The owner's standing
direction, recorded 2026-08-21: preparatory documents are the work;
code is not to be rushed. Everything written before this program
existed — the founding design document, the expert panel review, the
software shell draft, the simulation core draft, and the two research
surveys in the app's `dev/research/` — enters as *draft input*. None
of it is a decision until this program's documents accept it.

## 1. Why a program, stated once

This engine is a relatively novel class of software (a virtual-cell
simulation engine) approached in a novel way (a paraconsistent claim
layer coupled to stochastic chemistry through an admission boundary).
A novel approach to a novel class cannot be planned from priors — the
drafts so far were written substantially from one author's training
memory, and the panel review already demonstrated what that costs:
its single sharpest finding was a load-bearing claim in the founding
design that turned out to be false the moment someone read the actual
code. The studies below exist to apply that same discipline to every
method choice the drafts made, against the actual literature and the
actual prior-art systems, before any design freezes.

## 2. The document set

Seven kinds of document, in dependency order. All are notes in this
section's notes tree, in the house note form, `draft-for-owner-review`
until the owner accepts them.

### 2.1 Studies of the science (S0–S6)

- **S0 — The cell through the settling mathematics** (delivered
  2026-08-21, draft-for-owner-review: `2026-08-21-note-on-the-cell-
  through-the-settling-mathematics.md`). The science itself read
  through obsmetrologia's instruments: detailed balance as exactness
  of the affinity one-cochain, life as a maintained nonexact class,
  the membrane as that class's carrier, held contradictions priced in
  entropy production, the living state as a quasi-stationary
  distribution, division fidelity as naturality of splitting with
  respect to the settling closure, and the thermodynamic uncertainty
  relation as a conformance law. S0 revises the ADR docket's content
  and adds validation targets; its external-physics claims are
  routed to S5 and S6 for literature verification, so S0's
  identifications gate on those studies landing.

Each study is one note; each must end with (a) answers to its named
questions, with citations to sources actually consulted, and (b) an
explicit verdict on each draft decision it was assigned to check:
*confirmed*, *revise* (with the revision), or *open* (with what would
settle it). A study that only summarizes its field without issuing
verdicts is not done.

- **S1 — Stochastic simulation methods.** The SSA family (direct
  method, first-reaction, Gibson–Bruck next-reaction), tau-leaping
  and its negativity problem, hybrid discrete/continuous partitioning,
  stiffness in reaction networks, time-dependent propensities (the
  gradient schedule makes propensities time-varying — the naive SSA
  waiting-time draw is only exact for constant propensities between
  events, and the study must rule on how the engine handles that:
  rejection sampling, integrated-propensity inversion, or
  frame-frozen approximation with stated error). Checks: simulation
  core draft §2 (SSA-native, ODE-conformance), §4 (frame boundary).
- **S2 — Whole-cell and reactor simulator architectures.** Karr 2012's
  28-submodel integration and its published pain points, the Karr
  lab's subsequent whole-cell modeling tooling, VCell, COPASI, E-Cell,
  Tellurium/libRoadRunner, PhysiCell: how each decomposes the problem,
  how submodels with different formalisms share state and time, what
  their maintainers report as the architecture's costs. Checks: shell
  draft §2–§4 (two-layer state, module decomposition, frame loop);
  informs the HLD's integration pattern directly.
- **S3 — Rule-based modeling and membrane-computing implementations.**
  Kappa and BioNetGen (rules over structured agents; the combinatorial
  explosion argument), NFsim's network-free simulation, P-Lingua and
  other P-systems simulators, any implemented brane-calculi work: what
  a "rule" is operationally in each, how admission/locality is
  enforced, what data structure carries the mixture. This is the
  nearest engineering kin to the membrane service and the strongest
  prior art the engine's distinctiveness claim must survive. Checks:
  the panel review's membrane contract §3; the founding design's
  membrane-as-predicate claim.
- **S4 — Knowledge-substrate engineering.** Truth maintenance systems
  (Doyle's JTMS, de Kleer's ATMS), bilattice logic programming
  (Fitting's semantics — the direct academic lineage of the claim
  layer's FOUR-valued charges), state-based CRDTs and join-semilattice
  merge (the `composeFibers` operation is structurally a state-based
  CRDT join and should be engineered with that literature's
  convergence and garbage-collection lessons), event sourcing and
  incremental view maintenance. Checks: shell draft §2 (claim layer),
  the panel review's settling engine §4; informs the claim layer's
  LLD.
- **S5 — Thermodynamic consistency in reaction network models.**
  Wegscheider conditions and cycle constraints, local detailed
  balance, nonequilibrium steady states, entropy-production
  estimators from trajectory data (finite-sampling bias in the
  σ estimator is a real literature and the observable's LLD must
  address it), free-energy transduction models of pumps and synthases
  (Hill's diagram method). Checks: simulation core draft §3 in its
  entirety — the single most load-bearing draft section.
- **S6 — Cell biophysics grounding.** Proton-motive force magnitudes
  and dynamics, minimal-cell reference points (JCVI-syn3.0), division
  size-control (the adder literature), stochastic partitioning at
  division, the modern cell-death nomenclature. This consolidates the
  panel biophysicist's brief — which was written from training memory
  — into a study with verified citations. Checks: simulation core
  draft §1, §5; the four-mode death taxonomy in the panel review §1.

### 2.2 Stakeholders and concerns (per 42010)

One note naming the stakeholders — the owner (researcher and sole
finalizer), future agent sessions (implementers and maintainers who
arrive with no memory), the science program (consumer of results and
of the falsifier verdicts), and the repo's package ecosystem (which
the engine composes) — and each stakeholder's concerns: scientific
falsifiability, bitwise replayability, maintainability by short-lived
sessions, composition with the existing packages, honest scope of
biological claims, and cost of change. Every view in the architecture
description must trace to at least one named concern; a view that
addresses no concern is decoration and gets cut. Done when the owner
confirms the concern list is theirs.

### 2.3 Architecture description (per ISO/IEC/IEEE 42010)

One governing note plus one note per view. Viewpoints, chosen for
this system's actual concerns: **context** (what is outside the
engine — scenarios, traces, the registry packages, the science
notes — and what crosses each boundary), **functional** (modules and
their responsibilities and interfaces), **information** (the scenario,
trace, and snapshot data models, with schemas), **behavioral** (the
frame loop, the SSA event loop inside it, division and death as
events, replay), and **verification** (how each falsifier and each
physics validation target maps onto testable surfaces). Correspondence
rules between views are stated, not assumed — the panel review already
caught one correspondence failure (a tick loop in one draft
contradicting the frame loop in another), which is exactly the class
of defect this structure exists to expose.

Rationale is carried as **architecture decision records**, one note
section per decision, each with: context, options actually considered,
the decision, the consequences accepted, and the study verdicts it
depends on. The ADR docket, with the S1–S6 verdicts folded in
(2026-08-21, all studies delivered; each ADR remains *proposed* until
the owner accepts it, but every one now carries its evidence):

- **SSA as native stepper with ODE conformance backend** — S1
  CONFIRMED both (direct method matches or beats next-reaction at
  this scale; large-N cross-validation is standard practice).
- **Two-layer state with a declared bindings table as sole
  coupling** — S2 CONFIRMED (the universal model/solver separation
  of VCell, COPASI, E-Cell, PhysiCell) with an order-sensitivity
  check added; S4 CONFIRMED the bindings table and the claim layer
  as a genuine relating-fiber join store.
- **Thermodynamic coupling through equilibrium constants with
  Wegscheider load-checking** — S5 CONFIRMED (Schnakenberg
  decomposition verified via Seifert 2012; null-space cycle check is
  the field's standard), with two obligations: the σ observable's
  LLD must state a finite-sampling bias-correction policy, and the
  CME-level Kolmogorov ↔ deterministic Wegscheider equivalence
  citation is still OPEN.
- **Report frames as the discrete/continuous boundary** — S1 and S2
  jointly REVISE: the frame-frozen propensity treatment needs an
  explicit checked bound on frame width (Voliotis et al. 2016
  measured 60–90% error without one; Anderson 2007 is the named
  upgrade path), and PhysiBoSS's documented splitting failure (a 24h
  process reading out at 39h) adds validation target **V7**:
  frame-size convergence and splitting-order sensitivity, required
  before this ADR is accepted.
- **Integer copy numbers with derived concentrations** — S6 REVISE:
  true for regulatory proteins and mRNA (1–10² copies, Taniguchi
  2010), false for metabolites by four to five orders of magnitude
  (10⁵–10⁷, Bennett 2009); the ADR must carry a species-class scope
  boundary, not a blanket claim.
- **Binomial partitioning at division** — S6 CONFIRMED as the
  Stage-1 null model (Huh & Paulsson 2011), real deviations logged
  as out of scope.
- **Membrane as an ordered mosaic of admission predicates with a
  site-presence floor** — S3 CONFIRMED the contract (order
  cheapest-first, digest-check last) and REVISED the distinctiveness
  argument: bounded source-counting is absorbed by Kappa's counter
  extension (Boutillier & Cristescu 2017); the genuine escape is
  open-domain digest-identity deduplication and multi-tick closure
  conditions, which is the corrected justification for the
  provenance gate as a Stage-1 requirement. KaSim's sub-pattern
  indexing and incremental applicability updates go to the LLD.
- **Deterministic seeded replay as an invariant** — S1 REVISE: the
  trace header must pin the SSA algorithm identity and the LLD must
  version the fixed per-frame PRNG draw order; S2 notes per-tick
  state hashing has no surveyed precedent (novel, kept).
- **Four-mode death taxonomy** — S6 CONFIRMED (NCCD 2018
  independently supports the programmed/structural orthogonality).
- *(New, from S4)* **Interior claim-layer semantics** — the relating
  substrate carries a truth order (`joinTruthValue`/`leqTruth`) that
  every draft ignores and whose own doc comment says it is not
  lawfully lifted to evidence carriers; the interior LLD must
  explicitly use it or formally defer it. Join-only settling without
  retraction is CONFIRMED for Stage 1 and OPEN beyond
  (differential-dataflow multiplicity encoding is the named eventual
  mechanism), and evidence-list growth needs a budget test and a
  causal-stability pruning argument.
- *(Corrected, from S5)* **V6, the TUR conformance law** — scoped to
  constant-Δp windows only; the plain steady-state TUR is
  generically false under time-dependent driving (Koyuk & Seifert
  2020), and S0's §6 has been recut accordingly.

Acceptance is evidence-gated, not owner-gated (owner's standing
direction, 2026-08-22): an ADR is accepted when every study verdict
bearing on it is folded and no blocking OPEN remains, with its
obligations carried forward explicitly. The owner holds a standing
veto over anything at any time, but nothing waits on their sign-off.
The acceptance pass is recorded in the architecture-decision-records
note.

### 2.4 High-level design

One note: the system realized against the accepted ADRs — components,
their interfaces as actual signatures, data flows between them, the
file formats, the failure model, and the composition with
`@lenticule-science`/`@red-cup-engineering` packages stated in the
package layer's own terms. The shell draft is this document's raw
material and is superseded by it. Done when every interface named in
the HLD traces to an accepted ADR and no interface exists that the
verification view cannot exercise.

### 2.5 Low-level designs, per module

One note per module (membrane, chemistry, interior, lifecycle,
scenario, trace, engine, prng): algorithms chosen with their
complexity and failure cases, data structures, full function
signatures, error paths, and the module's test plan including the
properties to be property-tested. **The gate: no module's
implementation begins before its LLD exists and is consistent with
the accepted ADRs and study verdicts** — evidence-gated, per the
owner's standing direction; the owner vetoes at will but is not a
checkpoint. Spike code to answer a design question is permitted,
marked disposable, and never merged into src/. The program does not
require all LLDs before the first module may be built.

### 2.6 Test and validation plan

One note consolidating: the physics validation suite with closed-form
targets (V1–V5 in the simulation core draft, revised per S1/S5), the
Lean-conformance property tests and what they honestly do and do not
establish, the golden-trace replay discipline, the falsifier
experiments as research runs distinct from regression tests, and the
statistical acceptance criteria for stochastic tests (a stochastic
suite that asserts point equality is wrong; the plan must state the
tolerance mathematics). Done when every claim in the founding design's
falsifier section maps to a named experiment here.

### 2.7 Standing status

One short, boring, always-current note — name pinned
(natural-computer-simulation-engine, decided 2026-08-21, not to be
reopened), which program documents exist and their statuses, what the
next session's single job is. This is the note a fresh session reads
first, and it exists because sessions have no memory and the owner
should not be the only one who does.

## 3. Order and gating

S0 through S7 are delivered and under owner review. S7 — the study
of obsmetrologia methods for the engine
(`2026-08-21-note-on-the-study-of-obsmetrologia-methods-for-the-
engine.md`) — read the Lean corpus directly against S1–S6's open
questions and rescoped several verdicts: V7 narrows to
chemistry-side splitting error (claim-side order-independence is
`joinList_congr`, proved), the replay ADR's claim-side concern
closes, the interior LLD's truth-order ruling becomes the sectored
disagreement observable per the truth–knowledge long exact
sequence, the two-layer ADR gains one-settling-two-carriers as its
rationale, V2 routes through the house conformance-vector
mechanism, and the earlier audit's "no convergence theorem" is
amended to the driven-regime-only statement. The stakeholders note can be drafted now and confirmed cheaply.
The architecture description's ADRs are written as *proposed* now
(they are, in this note's §2.3 docket) but accepted only as their
studies land. HLD follows the ADR docket's acceptance; LLDs follow
the HLD; implementation follows each LLD's acceptance, module by
module. The packaging migration ruled on in the external drift review
(pnpm workspace, one scope) is a separate program with its own
dedicated session and is a prerequisite for the implementation phase,
not for any planning document.

## 4. Cadence and review

One study or one program document per working chunk, delivered for
owner review before the next begins in that track — the drift review's
finding that artifacts were produced faster than they could be vetoed
is a planning-process defect and this cadence is its correction. Git
commits batch at natural boundaries (a document accepted, a study
landed), not per edit.
