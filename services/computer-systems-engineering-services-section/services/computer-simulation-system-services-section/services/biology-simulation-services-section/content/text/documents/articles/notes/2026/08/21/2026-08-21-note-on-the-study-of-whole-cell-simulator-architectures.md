---
title: "Study of Whole-Cell Simulator Architectures"
description: "A literature study of Karr 2012 and its wc_sim/WC-Lang successor, VCell, COPASI, E-Cell, Tellurium/libRoadRunner, and PhysiCell/PhysiBoSS finds the drafts' two-layer state model, module decomposition, and SBML-subset import path already match the field's mature practice, but finds the report-frame operator-splitting design underspecified against the one failure mode every documented multi-timescale coupling in this survey keeps hitting — splitting error and order dependence — and revises it to require a frame-size convergence check before the ADR is accepted."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-study-of-whole-cell-simulator-architectures
authors:
  - claude-sonnet-5
status: draft-for-owner-review
keywords: ["whole-cell-modeling", "karr-2012", "wc-sim", "wc-lang", "vcell", "copasi", "e-cell", "tellurium", "libroadrunner", "physicell", "physiboss", "operator-splitting", "splitting-error", "reproducibility", "sed-ml", "combine-archive"]
tags: ["draft", "study"]
---


This is S2: a study of six real simulator architectures, read for one
purpose — checking the software shell draft's two-layer state model
(§2), module decomposition (§3), and frame loop (§4) against how
systems that actually shipped solved the same problems, and feeding
whatever it finds into the HLD's integration pattern. The systems are
Karr et al.'s 2012 whole-cell *Mycoplasma genitalium* model and its
successor tooling from the same lab (wc_sim, WC-Lang), VCell and
COPASI (general-purpose reaction-network simulators with heavy
production use), E-Cell and Tellurium/libRoadRunner (multi-algorithm
and performance-oriented designs), and PhysiCell/PhysiBoSS (an
agent-based multicellular simulator with a discrete logic layer bolted
onto a continuous substrate — the nearest published analogue to this
engine's claim-layer-on-chemistry coupling). Method: published
architecture papers, project documentation, and source repositories,
read for the mechanism, not the headline claim — what data structure
actually holds shared state, what actually triggers a submodel to run,
what happens at a synchronization boundary. Every load-bearing claim
below carries its source; where a source could not be verified to the
sentence level (a paraphrase from a fetch rather than a checked quote),
it is marked as such rather than quoted.

## 1. Karr et al. 2012 and what the Karr lab built next

**A Whole-Cell Computational Model Predicts Phenotype from Genotype**
(Karr, Sanghvi, Macklin, Gutschow, Jacobs, Bolival, Assad-Garcia,
Glass, Covert; *Cell* 150(2):389–401, 2012) integrated **28 submodels**
— the paper's own words: "We divided *M. genitalium* into the 28
functional processes illustrated in Figure 1, and modeled each process
independently on a 1 s time scale using different mathematics and
different experimental data" — through **16 shared cell-state
variables** (metabolite/RNA/protein copy numbers; metabolic reaction
fluxes; nascent DNA/RNA/protein polymers; molecular machines; cell
mass/volume/shape; the external environment; time). The integration
mechanism is a three-phase loop repeated every 1-second tick:
**allocate** (limited shared resources — metabolites, enzymes — are
apportioned among competing submodels at the start of the timestep, an
explicit rationing step, not a plain broadcast of state), **execute**
(each of the 28 submodels runs independently on its allocated
resources, in its own formalism), and **update** (each submodel's
local changes are written back into the 16 global variables). Whether
submodel execution order within a tick was fixed or resampled per tick
is documented in the paper's supplement, not its main text, and this
study could not confirm it from the sources consulted — worth pulling
directly if the exact ordering matters. What is confirmed: this is a
fixed-Δt, sequential allocate/execute/update scheme with no stated
error bound on the splitting itself (each submodel's own numerics were
separately validated; the coupling scheme was not). This is the direct
ancestor of the shell draft's report-frame pattern, and its shape —
fixed Δt, sequential update, no coupling-level error analysis — is
what §5 below returns to.

The pain points are documented by the lab's own later work, in
specific and citable terms. **Waltemath, Karr, Bergmann, et al.,
"Toward Community Standards and Software for Whole-Cell Modeling"**
(*IEEE Transactions on Biomedical Engineering* 63(10):2007–2014, 2016;
Karr is a co-author) reports on an independent attempt, at a 2015
whole-cell-modeling summer school, to re-encode the 2012 model in
SBML, and states plainly: "The model is difficult to understand,
reuse, and extend because it is described directly in terms of its
numerical simulation rather than in a software-independent format,"
that the code "is large, complex, and intertwined with the details of
the *M. genitalium* model," and that it "requires the proprietary
MATLAB software package" and runs slowly. The re-encoding team
replaced "the ad hoc stochastic simulation algorithms and rate laws
used by the original submodels with the Gillespie algorithm and mass
action kinetics" — the word *ad hoc* is the 2016 paper's own
characterization of the 2012 submodels, not an outside critique — and
replaced the allocate/execute/update scheme with "a central controller
that accepts or rejects" submodel-proposed changes at each tick's end,
calling that alternative "computationally efficient and generalizable"
by contrast. **Macklin, Ruggero, and Covert, "The future of whole-cell
modeling"** (*Current Opinion in Biotechnology*, 2014, pp. 111–115 —
Covert is the 2012 paper's senior author, so this is close to an
insider retrospective) frames seven unsolved challenge areas
(experimental interrogation, data curation, model building and
integration, accelerated computation, analysis and visualization,
model validation, collaboration/community) and attributes bottlenecks
to "the incompatibility among published models" and "the lack of
adequate software tools for building, calibrating, and validating
models," naming model building/integration and validation of a
many-submodel model as two of the seven top-level open problems.
**Szigeti, Roth, Sekar, Goldberg, Pochiraju, and Karr, "A blueprint for
human whole-cell modeling"** (*Current Opinion in Systems Biology*
7:8–15, 2018) records that building the 2012 model took **over ten
person-years**, attributed in part to the absence of suitable "data
sources, model design tools, model description formats, and
simulators" — a tooling-gap admission, not a physics one.

What the lab built in response is two separate artifacts on top of a
third, and the separation itself is the lesson. **WC-Lang**
(`KarrLab/wc_lang`) is a declarative language for describing a
whole-cell model as a reaction network, with each submodel's shared/
boundary species declared explicitly as its coupling interface — the
model description is a versioned artifact independent of simulator
code, directly answering the 2016 paper's "described directly in terms
of its numerical simulation" critique. **wc_sim**
(`KarrLab/wc_sim`, Goldberg and Karr) executes WC-Lang models with a
"meta-algorithm" supporting ODE integration, conventional (Gillespie)
stochastic simulation, network-free stochastic simulation,
flux-balance analysis, and logical simulation, assignable per submodel
within one run. wc_sim is built on **DE-Sim** (Goldberg and Karr,
"DE-Sim: an object-oriented, discrete-event simulation tool for
data-intensive modeling of complex systems in Python," *Journal of
Open Source Software* 5(55):2685, 2020), a general discrete-event
engine in which "models are implemented by defining logical process
objects which read the values of a set of variables and schedule
events to modify their values at discrete instants in time" — each
submodel becomes an independent process that schedules its own
next-event time, not a participant forced through a shared global
1-second clock. DE-Sim states its reproducibility guarantee directly:
"repeated executions of the same simulation with the same
configuration and same random number generator seed produce the same
results." The motivation for moving to (optimistic, parallel)
discrete-event scheduling specifically is stated in **Goldberg, Chew,
and Karr, "Toward Scalable Whole-Cell Modeling of Human Cells"**
(Proceedings of the 2016 ACM SIGSIM Conference on Principles of
Advanced Discrete Simulation): a human-cell model needs roughly 100
times more species and 10,000–100,000 times more molecules than the
bacterial 2012 model, at which scale a fixed-timestep sequential
architecture does not scale computationally — the event-driven
redesign is explicitly a scaling fix, not only a cleanliness fix. This
is architecturally the same move E-Cell made a decade earlier (§3),
and the study treats it as convergent evidence: two independent
lineages tried a fixed global tick with hard-wired coupling, found it
did not scale past a minimal genome, and moved to declared interfaces
plus event-driven per-submodel scheduling.

## 2. VCell and COPASI: model/solver separation as production discipline

Both systems separate what a model *is* from how it is *numerically
advanced*, and both let one declared model run through several solver
backends without duplication — the pattern most directly worth
imitating here.

**VCell** (Loew and Schaff, *Trends in Biotechnology* 19(10):401–406,
2001; Moraru, Schaff, Slepchenko, Blinov, Morgan, Lakshminarayana, Gao,
Li, Loew, *IET Systems Biology*, 2008, also PMC2711391; Cowan, Moraru,
Schaff, Slepchenko, Loew, *Methods in Cell Biology* 110:195–221, 2012)
structures a model in four layers: **Physiology** (species,
compartments, reactions — pure biology), **Application** (a Physiology
bound to a geometry, initial/boundary conditions, and parameters — one
Physiology can have many Applications), **Math Description**
(auto-generated, solver-agnostic equations stripped of biological
semantics), and **Simulation** (solver choice, mesh, timestep — many
Simulations can spawn off one Application). The same Math Description
is consumed by deterministic ODE solvers (a combined stiff solver
choosing between IDA and CVODE), spatial PDE solvers (semi-implicit
and fully-implicit finite volume), a non-spatial stochastic solver
(Gibson–Bruck next-reaction), and spatial stochastic engines (Smoldyn,
NFSim) wired in as external backends under the same geometry
abstraction — one declared model, several solver families, no
duplication. VCell is also a client-server system with a central
database, a simulation-dispatch/quota service, and message-queue-
mediated worker pools built to serve a thousand-plus concurrent web
users on a shared cluster; that infrastructure is explicitly
irrelevant to a single-process local engine and is called out below as
scale not to imitate. VCell's SBML/SED-ML/COMBINE support is real and
current — recent releases add SED-ML/OMEX import-export with "math
simplification on import" and ship containerized headless solvers
(`ghcr.io/virtualcell/biosimulators_vcell`) registered with
BioSimulators (*Nucleic Acids Research* 50(W1):W108–W114, 2022) — but
VCML, not SBML, remains the authoritative native format, because SBML
"currently support[s] [only limited] spatial modeling" and cannot
carry VCell's geometry and advanced membrane-transport features
losslessly (Moraru et al. 2008).

**COPASI** (Hoops, Sahle, Gauges, Lee, Pahle, Simus, Singhal, Xu,
Mendes, Kummer, "COPASI — a COmplex PAthway SImulator," *Bioinformatics*
22(24):3067–3074, 2006) keeps a native XML format, CopasiML, that is a
**strict superset** of SBML — the model plus, in separate sections,
the tasks, methods, reports, and plots to run against it. SBML is
import/export only, and the round-trip is documented as lossy in both
directions: COPASI does not support SBML algebraic rules or delay
functions on import (they return `NaN`), and tasks/reports/plots are
not exported to SBML because SBML has no schema slot for them
(copasi.org user manual). The Model/Task/Method pattern is COPASI's
version of VCell's layering: one `<Model>` block is referenced by an
arbitrary number of `<Task>` blocks (steady state, time course,
parameter estimation, sensitivity, and others), each independently
choosing a `<Method>` — for time course specifically, six solvers
selectable without touching the model: LSODA/LSODAR and RADAU5
(deterministic), Gibson–Bruck, tau-leap, and adaptive SSA/tau-leap
(stochastic), and three hybrid variants that partition reactions by
particle-count threshold, solving high-count reactions deterministically
and low-count reactions stochastically *within the same run* — one
model instance, one mixed-fidelity trajectory, no duplication. COPASI
imports/exports SBML, SED-ML, and COMBINE archives, and ships a
BioSimulators-compliant CLI/Docker wrapper. Concretely and
load-bearingly for reproducibility: the stochastic Time Course task
exposes a **"Use Random Seed" toggle with a user-settable seed value**
(default off — reseeds randomly each run), documented at
copasi.org/Support/User_Manual/Methods/Time_Course_Calculation/Stochastic_Simulation/.

What is worth imitating: the declared-model / task-selects-method
separation itself (a single canonical model definition, with solver
choice and run parameters as objects that reference it rather than
copies of it); a native format that is a strict, documented superset
of SBML rather than SBML itself; SED-ML-style task specification and
COMBINE-archive-style portable bundling as the unit of a reproducible
run; an explicit, always-recordable random-seed field. What is scale
this engine does not need: VCell's client-server split, central
multi-user database, message-queue worker dispatch, spatial
finite-volume/mesh/geometry subsystem, and compiled-executable job
dispatch; and both systems' GUI-embedded plot/report objects
serialized into the model file, which a non-UI local engine has no use
for.

## 3. E-Cell and Tellurium/libRoadRunner

**E-Cell** (Tomita, Hashimoto, Takahashi, Shimizu, Matsuzaki, Miyoshi,
Saito, Tanida, Yugi, Venter, Hutchison, "E-CELL: software environment
for whole-cell simulation," *Bioinformatics* 15(1):72–84, 1999;
Takahashi, Kaizu, Hu, Tomita, "A multi-algorithm, multi-timescale
method for cell simulation," *Bioinformatics* 20(4):538–546, 2004; the
fullest mechanism description is Addy and Takahashi, "Foundations of
E-Cell Simulation Environment Architecture," in the Madame Curie
Bioscience Database) is the strongest prior art in this survey for
coupling heterogeneous formalisms on one shared timeline without a
single fixed global tick. Its model is a set of **Variables** and a
set of **Steppers**; each Stepper owns a set of **Processes** (one
reaction/algorithm rule each), a local clock, and its own timestep,
and is one of four types — **DifferentialStepper** (continuous ODE,
adaptive), **DiscreteTimeStepper** (state-dependent-next-time discrete
stochastic, e.g. Gillespie), **DiscreteEventStepper**
(state-independent discrete events), and **PassiveStepper** (fires
only when another Stepper triggers it). Different regions of one cell
model are assigned different Stepper types by the modeler. The
scheduling mechanism is the load-bearing detail: a **priority queue of
Steppers ordered by next-fire time**. Each iteration pops the
minimum-time Stepper, uses each Variable's **Interpolant** objects
(Hermite-style local interpolation from recorded derivative
contributions) to give every other Stepper a consistent value for that
Variable at the fired time without forcing every Stepper to actually
integrate to that instant, fires the selected Stepper's Processes, and
then propagates interruptions along a **precomputed accessor/mutator
dependency graph** — each Process declares which Variables it reads
and writes, the kernel derives at model-load time which Steppers
depend on which, and only dependent Steppers are woken to recompute
their own next-fire time. No global fixed frame exists at all; each
subsystem advances only when its own state says it is due, and the
kernel's job is entirely synchronization, not scheduling by wall clock
or tick count.

**Tellurium and libRoadRunner** (Somogyi, Bouteiller, Glazier, König,
Medley, Swat, Sauro, "libRoadRunner: a high performance SBML
simulation and analysis library," *Bioinformatics* 31(20):3315–3321,
2015; "libRoadRunner 2.0," *Bioinformatics* 39(1):btac770, 2023; Choi,
Medley, König, Stocking, Smith, Gu, Sauro, "Tellurium," *Biosystems*
171:74–79, 2018) solve a different problem — raw execution speed for
one well-defined SBML model run many times — with a technique worth
citing on its own terms. libRoadRunner **JIT-compiles SBML rate
equations to native code via LLVM**, resolving SBML's declarative,
possibly-out-of-order rule dependencies at compile time through a
"symbol forest" (a hash table from symbol names to their defining
ASTs) and caching intermediate results within a call to cut repeated
evaluation overhead roughly tenfold. The performance argument is a
**compile-once, run-many** separation: model loading/compilation is a
one-time cost fully decoupled from repeated simulate calls, which the
2015 paper demonstrates concretely — 500 replica runs of a Brusselator
model scale as *N* (linear in run count) against libRoadRunner, versus
*N*^2.6 against the older interpreter-based Jarnac, because Jarnac
re-interprets the model's math every run while libRoadRunner reuses
already-compiled native code. Solvers sit behind a stable
**Integrator** interface (CVODE, RK4, Gillespie direct method,
interchangeable against one compiled `ExecutableModel` with, per the
authors, "no changes to existing code" required to swap one for
another). Tellurium layers a human-authoring format (Antimony,
compiling to SBML) and a human-readable SED-ML surface (phraSED-ML)
over libRoadRunner as the execution core, with Jupyter notebooks as
the shareable, reproducible unit of a study.

Lessons for this engine: E-Cell's accessor/mutator-declared
dependency graph waking only the Steppers that actually need to
resynchronize is a stronger, more general mechanism than a single
fixed report frame for "how does a discrete layer know when to
re-check state a continuous layer changed," and is worth naming as
the more sophisticated alternative even where the drafts choose not to
build it yet. libRoadRunner's compile-once/run-many separation and
solver-behind-a-stable-interface pattern is directly relevant should
this engine's chemistry layer ever need real speed — the interface the
core draft already specifies (`advance(state, tEnd, rng) -> state`) is
structurally compatible with slotting a compiled backend in later
without redesign.

## 4. PhysiCell and PhysiBoSS: the nearest published analogue

**PhysiCell** (Ghaffarizadeh, Heiland, Friedman, Mumenthaler, Macklin,
"PhysiCell: An open source physics-based cell simulator for 3-D
multicellular systems," *PLoS Computational Biology* 14(2):e1005991,
2018, built on the BioFVM diffusion solver) is an agent-based
multicellular simulator whose discrete cell agents are coupled to
continuous diffusing substrate fields through an **explicit
three-tier operator-splitting scheme** with justified, validated
timestep ratios: Δt_diff = 0.01 min (diffusion, BioFVM), Δt_mech = 0.1
min = 10·Δt_diff (mechanics/position, inertialess), Δt_cells = 6 min =
600·Δt_diff (phenotype, cycle, death). The justification is explicit
timescale separation — "the cell phenotypes and arrangement (operating
on slow time scales) can be treated as quasi-static" while advancing
the fast PDE — and it is not merely asserted: the paper reports a
convergence check finding ≤5% relative error at Δt_diff = 0.01 min
with 20 μm voxels, i.e. the splitting choice is validated against a
finer reference, not just argued for. The update order each cycle is
diffusion first (every Δt_diff), then phenotype (when t ≥ t_cells),
then mechanics (when t ≥ t_mech). Agent–field coupling is not a
separate step: each cell's secretion/uptake enters the PDE as
cell-centered source/sink terms solved by backward Euler directly into
the voxel containing the cell's center, at the fast diffusion cadence
— tighter than a report-frame design that would batch this coupling
once per larger frame.

**PhysiBoSS** (Letort, Montagud, Stoll, Heiland, Barillot, Macklin,
Zinovyev, Calzone, "PhysiBoSS: a multi-scale agent-based modelling
framework integrating physical dimension and cell signalling,"
*Bioinformatics* 35(7):1188–1196, 2019; Ponce-de-Leon, Montagud, Noel
et al., "PhysiBoSS 2.0," *npj Systems Biology and Applications*, 2023)
is exactly the pattern this study was sent to check: a discrete
Boolean logic network (MaBoSS — itself a continuous-time,
Gillespie-style stochastic engine, not lockstep-discrete) attached to
each PhysiCell agent, read and written at fixed synchronization
points. The synchronization parameters are `scaling` and
`intracellular_dt`, reconciling PhysiCell's minute-based clock with
MaBoSS's own time unit; documented worked examples span a wide range
(scaling=60/intracellular_dt=1440 min for a TNF cell-fate model,
scaling=1/intracellular_dt=6 min for an immune-differentiation model).
Between synchronization points each cell's Boolean network free-runs
its own stochastic trajectory; at the boundary, node state is read out
and mapped onto phenotype parameters (division/death rates, motility,
secretion) — architecturally the closest published match to this
engine's report frame. The 2024 methods paper (*Briefings in
Bioinformatics* 25(6):bbae509) states plainly that "the synchronization
of the two time scales is a difficult task as intracellular and
extracellular events may not have the same scales," and gives a
concrete, quantified instance: a cell-cycle model calibrated for a
24-hour period produced a **39-hour** cycle in simulation, attributed
to incomplete cycles at synchronization boundaries, and fixed only by
manually correcting the scaling factor after the discrepancy was
noticed against the known experimental period. PhysiCell itself scales
approximately linearly in agent count (∼10⁶ agents in ∼70 hours
wall-clock on a 24-core HPC node per the 2018 paper), with necrosis-
heavy runs costing up to two orders of magnitude more — a caveat about
uneven cost across phenotype states, not about the coupling scheme.

## 5. The recurring pattern and its documented failure mode

Every system surveyed that couples subsystems of different formalisms
and timescales does it the same way in outline: **operator splitting
at a shared synchronization interval** — each subsystem advances
independently across the interval using state frozen at the interval's
start, then publishes updated state at the boundary for the other
subsystem to read next interval. Karr 2012 is the most naive instance
(fixed 1 s, sequential previous-tick freeze, no error analysis of the
coupling itself, separate from validating each submodel). PhysiCell is
the most disciplined instance (three explicit tiers, a stated
timescale-separation justification, and a numerical convergence check
against a finer reference). E-Cell is the outlier that avoids a shared
fixed interval altogether by making every subsystem's next-fire time
state-dependent and interpolating between them. Where a discrete logic
layer syncs onto a continuous agent/field simulation specifically —
PhysiBoSS — the coupling is a fixed interval, exactly the shell
draft's shape, and it is the one system in this survey with a
documented, quantified failure of that shape in production: a
known-24-hour process reading out at 39 hours because state left
incomplete at a sync boundary went uncaught until compared against an
external ground truth.

The literature names this failure mode precisely rather than leaving
it as folklore. Hellander, Lawson, Drawert, and Petzold, "Local error
estimates for adaptive simulation of the Reaction-Diffusion Master
Equation via operator splitting" (*Journal of Computational Physics*
266:89–100, 2014), decompose the one-step error of exactly this
sequential (Lie–Trotter-style) splitting into three parts: a
stochastic-flow truncation error, a **commutator error** arising
because the two update operators do not commute (doing subsystem A
then B is not the same trajectory as B then A, and the discrepancy is
literally the operators' commutator), and the ordinary discretization
error internal to each subsystem's own integrator. The commutator term
*is* order dependence, named as a specific, nonzero, characterizable
quantity rather than a vague worry — and it is fixable in principle by
symmetric (Strang) splitting, which halves one operator, applies the
other in full, then applies the first half again, cancelling the
leading-order commutator term that plain sequential splitting leaves
uncancelled. None of the systems surveyed here (Karr 2012, wc_sim's
per-submodel event scheduling, PhysiCell's fixed tiers, PhysiBoSS's
fixed sync interval) uses Strang splitting; all use one-directional
sequential splitting, and PhysiBoSS's 39-hour result is a real
instance of the commutator/incomplete-state error this class of scheme
predicts.

The core draft's §4 frame loop — gradient and marks read, membrane
admission, claim join, `claimToChemistry` bindings applied,
`chemistry.step`, observables, `chemistryToClaim` bindings published,
lifecycle checks, journal — is architecturally in the same family as
Karr 2012's own pattern (fixed Δt_report, sequential one-directional
update, no stated bound on the splitting error) and in the same family
as PhysiBoSS specifically (a discrete logic layer synced onto a
continuous simulation at a fixed interval), which is the system that
actually hit this failure in a documented, quantified way. The report-
frame boundary is the right load-bearing idea — auditable, replayable,
and it is what makes the falsifier experiments cheap, per the shell
draft's §2 — but as specified it has exactly the shape the literature
keeps finding trouble with, and nothing in the current drafts checks
for it. This is this study's central finding and is carried into the
verdicts below and into S1's frame-boundary ruling (they share the
same boundary).

## 6. Reproducibility discipline, concretely

COPASI's mechanism is the most concrete and the most directly
comparable: a per-task "Use Random Seed" toggle with a stored,
user-settable seed value, off by default, so a run either records
exactly what it needs to reproduce or explicitly declines to. Its
native CopasiML file bundles model, task, method, and report
definitions in one portable document. VCell leans more heavily on
COMBINE/OMEX archives and SED-ML for portable reproduction plus a
central, versioned database (BioModel/Application/Simulation/results,
with citations and provenance recorded per version) for a heavier,
server-side provenance story appropriate to a shared multi-user
service; this survey did not find documented, exposed seed control for
VCell's stochastic (Gibson–Bruck) solver in the sources consulted,
which is worth flagging as a gap in what was found rather than
asserting as a gap in VCell itself. Both tools, plus Tellurium's
phraSED-ML, converge on the same cross-tool standard: **SED-ML**
(Simulation Experiment Description Markup Language — a model
reference, a KiSAO-identified algorithm and its exact parameters, and
declared outputs, independent of any one tool) packaged in a
**COMBINE archive** (Bergmann et al., "COMBINE archive and OMEX
format: one file to share all information to reproduce a modeling
project," 2014) as the exchange unit, with BioSimulators (*Nucleic
Acids Research* 50(W1):W108–W114, 2022) formally verifying that a
tool's containerized wrapper reproduces an archive's declared outputs.
For the Karr lineage specifically, **Medley, Goldberg, and Karr,
"Guidelines for Reproducibly Building and Simulating Systems Biology
Models"** (*IEEE Transactions on Biomedical Engineering* 63(10):
2015–2020, 2016 — the companion paper to the Waltemath et al. 2016
community-standards paper in §1, from the same summer school, using
the *M. genitalium* model as its case study) derives three concrete
requirements the 2012 model did not meet: **models must be
regenerable** ("researchers should record the provenance of every data
source and assumption used to build models"), **simulations must be
regenerable** ("record every parameter value, algorithm, and
simulation software option used"), and **cross-tool agreement must be
checked** ("researchers should ensure that multiple simulation
software tools generate statistically identical results"). And
DE-Sim, the discrete-event engine under wc_sim (§1), states its own
reproducibility contract directly in its own words: "repeated
executions of the same simulation with the same configuration and same
random number generator seed produce the same results." Between them
these give the Karr lineage's reproducibility discipline the same
concreteness as COPASI's seed toggle: record every input (data
provenance, not just parameters), record every run configuration
(algorithm and seed), and check agreement across independent
implementations rather than trusting one simulator's self-consistency.

Set against this, the shell draft's own discipline — a JSONL trace
whose header records `{version, scenarioHash, seed, engineVersion}`,
a per-tick `stateHash` for localized divergence detection, and golden-
trace hash comparison enforced in CI — already matches or exceeds
COPASI's bar (the seed is always recorded, not optional) and is a
minimal, single-engine analogue of the SED-ML/COMBINE-archive contract
(declare the model, the exact run parameters, and the expected output,
in one portable, checkable unit) without the standardization overhead
a single local engine does not need. Per-tick hashing for divergence
localization was not found documented in any of the surveyed systems'
public architecture papers — this looks like the drafts are ahead of
this survey's documented practice here, not behind it, so there is no
external pattern to check it against.

## Verdicts

**Two-layer state with a declared bindings table as the sole
coupling — CONFIRMED, with one addition.** Every mature system
surveyed separates a declarative "what the model is" layer from a "how
it is numerically advanced" layer and couples them through declared
read/write interfaces rather than code reaching across the boundary:
VCell's Physiology/Application/MathDescription split, COPASI's
Model/Task separation, E-Cell's Variable/Stepper split with
accessor/mutator-declared dependencies, PhysiCell/PhysiBoSS's
agent/field split. The bindings table is exactly the "explicitly
documented interface" Macklin, Ruggero, and Covert (2014) named as
what the 2012 model needed and did not have. Confirmed as the right
shape. Addition: attach an order-sensitivity check (§5) to the ADR —
this does not change the shape, only what the validation plan must
demonstrate before the coupling is trusted.

**Module decomposition and import discipline — CONFIRMED.** The
engine-owns-the-loop, no-domain-rules-in-engine, acyclic-import-graph
discipline matches COPASI's Task-references-Model-without-modifying-it
pattern, VCell's strictly layered dependency direction, and
libRoadRunner's explicit "components are easy to add or replace...
swapping requires no changes to existing code" interface design.
Nothing surveyed suggests a different module boundary is needed at
Stage-1 scale. No revision.

**Report-frame operator-splitting design — REVISE.** This is the
study's central finding. The report frame is architecturally closest
to Karr 2012's own fixed-tick, sequential, unbounded-error coupling —
the pattern its own authors' 2014 retrospective flagged for
replacement — and closest in intent to PhysiBoSS's fixed-interval
discrete-logic-onto-continuous sync, which is the one system in this
survey with a documented, quantified failure of exactly this shape (a
24-hour process reading out at 39 hours). The literature names the
failure mode precisely: splitting error with a commutator
(order-dependence) term that plain one-directional sequential
splitting does not cancel (Hellander et al. 2014). Revision: before
the report-frame ADR is accepted, add a validation target analogous to
PhysiCell's own convergence check — run a scenario at several
Δt_report values and show the core draft's observables (flux, σ,
division timing) converge as Δt_report → 0 — and state the
claim-before-chemistry-vs-chemistry-before-claim ordering as a named
decision, tested for sensitivity to being swapped. This belongs as a
new validation entry alongside V6 (call it V7: frame-size convergence
and splitting-order sensitivity) and should be resolved jointly with
S1's ruling on the frame boundary, since both studies converge on the
same seam.

**The SBML-subset import path — CONFIRMED.** COPASI's production
choice to keep a native format that is a strict, documented superset
of SBML, treating SBML as import/export only with an explicitly
acknowledged lossy round-trip, is exactly the shell draft's "converter
into this format, not a second input path" rule, drawn from a mature
project's actual practice rather than an assumption. VCell's
experience — SBML cannot yet carry its spatial features, so VCML stays
authoritative — is the cautionary complement: every system surveyed
treats SBML as an interchange format, never as the native source of
truth. No revision.

**Trace/replay discipline — CONFIRMED, meets or exceeds the surveyed
baseline.** COPASI's explicit, user-settable random-seed field is the
concrete mechanism the shell draft's always-recorded seed already
implements more strictly. The header-plus-per-tick-record shape is a
minimal, single-engine analogue of the field's own SED-ML/COMBINE-
archive reproducibility contract, without infrastructure a local
engine does not need. One item is OPEN rather than confirmed or
revised: per-tick state hashing for localized divergence detection was
not found documented in any surveyed system, so there is no prior-art
pattern to validate its design against — its correctness rests
entirely on the drafts' own golden-trace test plan, and stays open in
that narrow sense until the test-and-validation plan (§2.6 of the
planning program) demonstrates it catches the regressions it claims
to.
