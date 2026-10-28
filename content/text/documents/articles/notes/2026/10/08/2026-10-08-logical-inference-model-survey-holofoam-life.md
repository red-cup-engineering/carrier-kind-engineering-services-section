---
title: "Logical inference model survey: holofoam-life"
description: "What this area of the tree actually computes, its abstractions with their theoretical readings, capabilities a logical inference model can build on, gaps and slop, and attachment points."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - signstuff
  - survey
  - holofoam-life
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Logical inference model survey: holofoam-life

## Summary

PATH PREFIX (relative to /home/emsenn/bare-cedar-fog): services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-simulation-system-services-section/apps/holofoam (abbrev HF/). Files: README.md, app.mjs (browser studio, 122 lines), fork-view.mjs, src/{simulation 415, admission 37, checkpoint 39, comparison 27, operations 190, legacy-state 63, rendering 434, capture 72, structure 351, flight 210, orbit 660, rigid-body 64}.mjs, scripts/{build,rocket-demo,orbit-demo}.mjs, tests, dist/app.bundle.mjs (8.6k generated lines, committed build artifact, ignore).

WHAT THE ORGANISM LAB ACTUALLY IS (src/simulation.mjs). A 'world' is 420-620 point-particles (default 'bloom' population 420) on a toroidal unit square, derived entirely from (seed via mulberry32, preset, dims, config, initial rules, 3 default genomes) plus a log of admitted events. Each organism has x,y,vx,vy,heading,hue,trait,energy,lineage(id%3),modelId,model. Each tick: (1) build spatial hash (cell size ~0.12) (2) diffuse a 24x24 Float32 'signal' field (5-point stencil, decay .88) (3) every organism 'senses' (favorable-flow present/absent from analytic field sum>.00006; same/other-lineage neighbor counts within SENSE_RADIUS .12; signal threshold .006; 'unknown' kept distinct from absent when a sensor is disabled) (4) updateModel keeps last 4 observations and 12 time-indexed witnesses, derives atoms (5) selectAction looks up a 4-bit mask (flow=1, signal=2, crowded(same+other>6)=4, mixed(both lineages present)=8) in the genome's precompiled 16-row policy table -> action in {explore, approach, avoid, inspect} (6) act(): steer by flow + neighbor affinity (+1 same lineage, -0.45 other) scaled by action (avoid=-1, approach=+1, else .35), laying signal (.0015 if approach else .0002) (7) integrate, wrap, push out of circular barriers. The field fieldAt() is a closed-form travelling sinusoid plus a vortex, parameterised by 4 rules (east, north, whirl, porous) times config.field.

THE SignStuff COMPOSITION IS REAL BUT THIN. compileModel(genome) builds up to 4 SignChain rule() objects (one per enabled edge flow/signal/crowded/mixed; antecedent = sensed SignCell atLeast 'potential', consequent = policy-recommends cell at reading 'potential'), then for each of 16 sensor masks calls SignCraft settleCells(sensedCells, rules). Rule semantics are fixed: flow,signal -> 'approach-for'; crowded,mixed -> 'approach-against'. Settled valuation: both told => 'inspect' (the paraconsistent BOTH case), only for => approach, only against => avoid, neither => explore. Witnesses (rule derivations) are retained per row. Settlement runs only 16x per genome (memoised in compiledTables Map, capped 256) -- the per-tick cost is a table lookup, so SignStuff is a policy-table compiler, not an inner-loop engine. Net: the 'genome' is 4 booleans; the 'AI' is a 16-entry lookup table that is a boolean function of 4 bits.

HISTORY/REPLAY IS THE GENUINELY STRONG PART. Experiment = SignCraft history: cell holofoam.experiment/defines (definition), holofoam.experiment/reaches (terminal tick, functional predicate), and tick:N/event cells {seq,...event}. admitEvent bounds every event (rule, pulse, select, barrier, adopt, mutate); replay(history) re-derives the world by stepping organism-by-organism with events enacted at their ticks, bit-identical; heads address = historyHeads join. derived Map (24 entries) memoises worlds by address as acceleration only. checkpoint = checkpointHistory cut; comparison/forkCompare forks one history cut into baseline vs one field-rule intervention and diffs displacement/energy/changed actions/policy/genome. Legacy v1 explicit state imported as an 'origin' cell. Work bounds (MAX_REPLAY_ORGANISM_TICKS 20M etc.) guard replay. This is a faithful 'state is a derived function of an event history' design.

HOW ALIVE IS IT. Honest answer: it is a flocking/advection toy with a policy lookup, not an artificial life system. NO reproduction (organism count fixed; no birth/death). NO metabolism in effect: organism.energy increments +0.02 when flow present, -0.004 on 'avoid', clamped [0,1], and is read only by rendering lightness and summary()/compareWorlds stats -- it never gates behaviour, death, or selection. NO membranes/compartments (only global spatial hash, barriers are user-drawn disks). NO differentiation within a lineage (all organisms in a lineage share one table; the 3 lineages are fixed at creation, hue/trait random but trait only scales steering). NO autonomous selection or mutation: 'select' just picks the UI-highlighted organism; 'adopt' and 'mutate' are user clicks (adopt switches an organism to lineage+1 mod 3; mutate flips ONE edge boolean of a whole lineage, creating a new genome id with parent link = a rudimentary phylogeny). config.mutation (0.08-0.31) is validated and carried in presets but NEVER read by the dynamics (grep confirms). Genetic variation exists only as human intervention events. Signal field is the only stigmergy; it is a weak ecological coupling (organisms deposit, then sense via one threshold bit). Organism-organism interaction is local (3x3 hash cells) and truly distributed-like, which is good.

ADJACENT MODULES (same app, share the history pattern, not the organism lab): structure.mjs = ship design as cells, body-bar rigidity sheaf via signgraph/cellular-sheaf (exact rational H0/H1, Maxwell count), loads by CG, breakage as settlement firing; flight.mjs and orbit.mjs = law-over-time trajectories (universal-variable two-body conics, deterministic bisection of segment ends), causal diamonds (startEvent,endEvent), reaches(a,b) light-cone predicate (|dx| < c*dt), eventLeq, precedes/nests, sequencingCheck, kinematicRegion/visibility/comm as exterior/hole readouts, mergePlans = history merge with seams()=H1 contested cells. These (orbit.mjs especially) are the real light-cone/causal-order machinery in the app, and are cleaner than the organism lab, but orbit/structure are unrelated to organisms.

STUDIO (app.mjs, rendering.mjs, capture.mjs). Canvas browser UI with field tools, undo/redo through history, named saves, share links via btoa(JSON), PNG/WebM capture, 'local-senses' rendering; loopCirculation is explicitly 'finite grid quadrature ... not a global H1 result' (honest label). NOTICE-FLUODDITY-MIT.md indicates the visual/origin derives from an MIT project 'Fluoddity'. The README says 'foam' nowhere in code: there are no cells, films, vertices, pressure or surface tension -- 'Holofoam' is a name; the dynamics are particles in a flow.

## Abstractions

### Experiment-as-SignCraft-history

- **File:** `HF/src/simulation.mjs (createExperiment, definitionCell, eventCell, reachesCell, snapshot, describeHistory)`
- **Computes:** Observes one 'defines' cell (seed, preset, dims, config, rules, genomes), one functional 'reaches' tick cell, and per-event cells at tick:N into a SignCraft history. Input spec -> world+history; history head string is the address.
- **Theory:** Event sourcing where state is the unique fold of the log; history is a presheaf-like append-only content-addressed set, 'reaches' functional predicate ~ terminal-time section. Realised faithfully; the history itself carries no organism semantics beyond opaque JSON.

### replay(history) deterministic derivation

- **File:** `HF/src/simulation.mjs replay, enact, derived memo`
- **Computes:** history -> worldOf(definition) then step()/enact() in tick order up to terminalTick; memoised by head address (24 entries) with structuredClone. Work-bound checked (population*ticks<=20M).
- **Theory:** Initial algebra / fold over the event stream; determinism relies on mulberry32 + IEEE math (Math.sin/cos/atan2 in act/fieldAt are NOT deterministic-math, unlike orbit.mjs, so cross-engine bit-identity is claimed but unguaranteed).

### compileModel genome -> policy table

- **File:** `HF/src/simulation.mjs compileModel, ATOMS, EDGE_OF_ATOM, RECOMMENDS`
- **Computes:** genome{edges:{flow,signal,crowded,mixed}} -> frozen 16-row table mask -> {action, values, witnesses}; each row from settleCells(sensed SignCells, SignChain rules). Cached by genome id+edge bits.
- **Theory:** A (fixed-shape) four-atom Horn program evaluated in a paraconsistent valuation where approach-for and approach-against may both hold (-> 'inspect'). Real use of SignChain/SignCell/SignCraft but the logic is propositional, monotone, 4 atoms, 2 outcomes; a bitmask lookup would compute the same.

### Genome (4-boolean edge set + parent link)

- **File:** `HF/src/simulation.mjs DEFAULT_GENOMES, enact 'mutate'`
- **Computes:** Three lineage genomes lineage-N-base; mutate flips one edge and yields id lineage-N-t{tick}-r{rev} with parent=previous id.
- **Theory:** Called 'SignChain rules' in README but the rules are hardcoded templates; only on/off per template varies. Genome space = 2^4 per lineage. Phylogeny chain exists as parent ids; no crossover, no new atoms, no rule-structure evolution.

### sense / updateModel (SignCell observation)

- **File:** `HF/src/simulation.mjs sense, updateModel, SENSE_RADIUS`
- **Computes:** Local observation {favorableFlow present|absent|unknown, crowding {same,other}|unknown, signal present|absent|unknown, flow vec, steering vec}; model keeps 4 observations and 12 time-indexed witnesses and derives mixed=(same>0&&other>0).
- **Theory:** Three-valued sensing with unknown != absent (genuine partial-information design, matches the 'monitoring' role). Witnesses are time-indexed but never feed settlement: the only atoms used are the current-tick thresholded bits; history of witnesses is dead data.

### selectAction / resolvePolicy / act

- **File:** `HF/src/simulation.mjs`
- **Computes:** mask = flow|signal<<1|(same+other>6)<<2|mixed<<3 -> table row -> action in {explore,approach,avoid,inspect}; act() sets heading/velocity with scale -1/+1/.35 (inspect and explore both .35), updates energy, deposits signal.
- **Theory:** Policy = decision of a settled valuation. 'inspect' and 'explore' are behaviourally identical (scale .35), so the paraconsistent BOTH state has no behavioural consequence distinct from neither.

### Field rules (fieldAt) and signal diffusion

- **File:** `HF/src/simulation.mjs fieldAt, diffuseSignals, signalIndex`
- **Computes:** fieldAt: closed-form 2-vector (east,north sinusoids with phase=tick*.012 plus whirl*porous vortex). diffuseSignals: 24x24 torus stencil .56 centre, .11 each neighbour, *.88.
- **Theory:** An imposed analytic background flow plus a scalar stigmergic reaction-diffusion-lite layer. Organisms do not alter the flow; only the scalar signal is two-way coupled. No pressure, incompressibility, or conservation: 'foam physics' is not present.

### Event admission and the six event kinds

- **File:** `HF/src/admission.mjs admitEvent, admitSpec, presets; simulation.mjs enact`
- **Computes:** Validates/clamps rule(value 0..1), pulse(x,y,radius,force), select(id), barrier(x,y,radius,erase), adopt(id,lineage<3), mutate(lineage<3,edge). Presets bloom/tide/braid/ember.
- **Theory:** Interventions as typed total admission (boundary guard). Lineage count 3 hard-coded in admission, enact, and DEFAULT_GENOMES; config.mutation validated but unused (dead parameter).

### Selection (UI only) / adoption / mutation events

- **File:** `HF/src/simulation.mjs enact; HF/app.mjs lines 78-86`
- **Computes:** select sets world.selected; adopt rotates organism to lineage+1 mod 3 (uses UI button); mutate flips one genome edge for all organisms of a lineage and rebuilds tables.
- **Theory:** All evolutionary operators are exogenous interventions recorded in the history. There is no fitness function, no differential reproduction, no stochastic mutation driven by config.mutation. Selection pressure is the human.

### Checkpoint = history cut

- **File:** `HF/src/checkpoint.mjs checkpoint, restoreCheckpoint, readingOf`
- **Computes:** checkpointHistory(snapshot(world)) -> {kind holofoam.checkpoint/v2, tick, paused, history}; restore = replay(cut). Legacy v1 explicit state imported as origin.
- **Theory:** Cut of the history lattice at a head; fast-restore cache keyed by address. Good fit for light-cone/past-cone talk: a checkpoint is a past cone.

### Field-intervention fork and compare (What-if)

- **File:** `HF/src/comparison.mjs compareField; HF/src/operations.mjs forkCompare, compareWorlds`
- **Computes:** Fork a checkpoint into baseline vs one rule-event variation, step both n<=256 ticks, report changedActionCount, meanDisplacement (toroidal), deltaMeanEnergy, per-organism last witness, policy/genome/observation held|changed.
- **Theory:** A counterfactual via history branching = intervention calculus without a causal graph; compares by aggregate statistics, not a type-theoretic or bisimulation equivalence. Documents store inputs not derived futures.

### Operation registry

- **File:** `HF/src/operations.mjs operations{admit,step,observe,intervene,forkCompare}`
- **Computes:** JSON-schema'd actions shared by browser and headless callers with per-call work budgets (MAX_ACTION_TICKS 256, MAX_ORGANISM_TICKS 100k, population<=1000); summary() reports meanEnergy only.
- **Theory:** A tool/API surface an agent could drive today. This is the natural attachment point for a model-driven controller.

### Orbit causal diamonds and light-cone order

- **File:** `HF/src/orbit.mjs reaches, eventLeq, precedes, nests, diamonds, sequencingCheck, kinematicRegion`
- **Computes:** reaches(a,b): b.t>a.t && |dx|<c*dt. A trajectory segment -> diamond (startEvent,endEvent); precedes(p,q) iff p.b <= q.a; sequencingCheck verifies pairwise order, not nesting. kinematicRegion lifts a readout to exterior/hole.
- **Theory:** Genuine causal-order (Alexandrov/causal-diamond) construction in 1+3 with c = 299792458; ties to Obsmetrologia separation laws. Applied to orbital segments only; the organism lab has NO light-cone concept (its sense radius is Euclidean, update is synchronous).

### mergePlans / seams (H1 of contested cells)

- **File:** `HF/src/orbit.mjs mergePlans, seams, ContestedCell`
- **Computes:** SignCraft history merge of vessel plans; two laws at one (vessel,epoch) are 'told both'; seams reports contested cells; poseAt refuses from the contested epoch.
- **Theory:** Order-independence of merge (CRDT-style union) and 'H1=0 iff every merge order reads the same' -- a Cech-style disagreement-as-obstruction idiom, the closest thing in the app to sheaf gluing for decisions.

### Body-bar rigidity sheaf and breakage settlement

- **File:** `HF/src/structure.mjs rigidity, structureOf, loads, failure, observeFirings`
- **Computes:** Design cells -> rigid clusters -> exact rational H0/H1 via signgraph/cellular-sheaf bodyBarSheaf; CG solve of R^T f = -p; overstressed members 'fire' and are removed, re-settled to fixpoint.
- **Theory:** Real use of SignGraph sheaf machinery with exact arithmetic, plus settlement-to-fixpoint as a physical failure cascade. Closest to a 'foam-structure' mechanic (rigid clusters connected by constraints) but for ship parts.

### Flight as law over time

- **File:** `HF/src/flight.mjs launch, setThrottle, stage, bodiesAt; HF/src/rigid-body.mjs`
- **Computes:** Segment cells per rigid body, pose derived by fixed-dt symplectic integration from epoch, told only when inputs change.
- **Theory:** State-as-derived-law applied uniformly; validates the Holofoam thesis that history cells hold laws and replay holds state.

### Studio + circulation display

- **File:** `HF/app.mjs, HF/src/rendering.mjs, HF/src/capture.mjs, loopCirculation/potentialLoopIntegral in simulation.mjs`
- **Computes:** Canvas render of organisms (hue, energy lightness), local-senses overlay, finite midpoint quadrature of field around a loop; PNG/WebM capture; btoa share link.
- **Theory:** loopCirculation is labelled 'not a global H1 result'; the comparison with potentialLoopIntegral (=0 for gradients) is a Stokes-style sanity display only.

## Capabilities a logical inference model can build on

- A complete, deterministic, content-addressed event-sourcing substrate: any AI 'foam' state can be a pure fold over an admitted event stream with checkpoint-cuts, forks, and merge (history merge in orbit.mjs) already working and bounded.
- A tool-style operation registry (admit/step/observe/intervene/forkCompare) with schemas and compute budgets, directly drivable by an agent or by a predication model as controller.
- A working pattern for compiling a rule set to a 16-row settled-valuation table with retained rule-derivation witnesses (compileModel): extendable into a general 'settle once, look up per tick' predicate-evaluator with proofs attached.
- Three-valued sensing (present/absent/unknown) and four-valued policy (approach/avoid/inspect/explore), i.e. a paraconsistent decision layer already wired through SignCell/SignChain/SignCraft.
- Counterfactual machinery: fork a cut, apply a single typed intervention, compare continuations (compareWorlds) -- usable as a causal-effect evaluator and as the training signal for rule revision.
- Real causal-order primitives (reaches, precedes, nests, diamonds, sequencingCheck) and contested-cell H1 diagnostics in orbit.mjs, reusable for organism event light cones if the organism lab is given a speed bound.
- Exact sheaf rigidity (structure.mjs) as a ready model of 'which constrained clusters move together', a possible membrane/cell-adhesion kernel.
- Local spatial hash + bounded sensing radius: already a distributed-style locality model with O(population) step cost.

## Gaps and slop

- README title 'complex multicellular foam' is aspirational: organisms are non-interacting-in-structure point particles in an imposed analytic flow; no cells, films, vertices, tension, pressure or topology change.
- Not alive by any standard: no birth/death/reproduction, no metabolism with consequences (energy is cosmetic: only render lightness and summary mean), no membranes/compartments, no within-lineage differentiation, no autonomous selection or mutation.
- config.mutation is validated and shipped in presets but never read by any dynamics (dead knob); 'selection' event only highlights a UI organism; adopt/mutate are manual clicks.
- Genome is four booleans toggling four hardcoded rule templates; RECOMMENDS maps are constants. 'SignChain rules as genomes' overstates it; no rule creation, composition, or typing (no CHL content) in the lab.
- Policy table is 16 entries over a monotone Horn fragment; equivalent to a bitmask boolean function. 'inspect' and 'explore' behave identically (scale .35), so the paraconsistent BOTH outcome changes nothing; settlement is invoked only at compile time, not in the loop.
- Witness history (12 time-indexed records) and observations (4) are stored but never consulted by policy; atoms use only the current tick, so there is no temporal or past-cone reasoning.
- Lineage count 3 hard-coded in admission.mjs, simulation.mjs (id%3, DEFAULT_GENOMES, adopt bounds); compiledModels indexed by organism.lineage.
- Determinism claim: orbit.mjs correctly uses deterministic-math, but simulation.mjs act()/fieldAt() use native Math.sin/cos/atan2/hypot, so bit-identity across engines is not guaranteed (same-engine replay is).
- Replay cost is O(population x ticks) with no snapshot compaction beyond a 24-entry cache; structuredClone of world on each remember.
- Unused-looking helpers: loopCirculation/potentialLoopIntegral are demo-only; they do not feed any rule or policy. No tile/FCA/bead/Chu content in the organism lab; sheaf and diamonds live only in the ship/orbit modules, separated from organisms.
- dist/app.bundle.mjs (8.6k lines) is a checked-in build artifact; fork-view.mjs, dist/ duplicates of index.html and style.css, and NOTICE for Fluoddity indicate the renderer/visual idea is borrowed.
- Experiment 'stats' are only mean energy, count, and event count; no entropy, lineage abundance, lifespan or diversity measures, so nothing measures aliveness.

## Attachment points

- Replace the 16-entry table with a predication model: let each lineage genome be a typed SignChain proof term (CHL: rule composition = program) over a richer predicate vocabulary (neighbour-lineage, signal gradient, age, energy, witness history); compileModel generalises to compile-to-FCA-lattice: sensory contexts as objects, atoms as attributes, concept lattice as the decision structure, with the action a closed concept.
- Use the existing witness list as the past light cone: give each organism a causal speed bound (cells/tick), define reaches/eventLeq over (tick,x,y) using the orbit.mjs pattern, and let the policy settle against only events in the organism's past cone; fork-compare then becomes a future-cone effect measurement.
- Make real aliveness first: couple energy to flow/signal (uptake), cost per action, death at 0, reproduction at threshold producing a child organism with a mutated genome sampled via mulberry32 from config.mutation (record birth/death as admitted events or derive them deterministically in step, so replay stays a fold). Selection then arises from the field.
- Foam layer beside the lab: add a Voronoi/Delaunay cell complex over the organisms (or over a coarse grid) as a SignGraph cellular sheaf where cell adhesion/film tension are edge data and H0/H1 give coherent clusters/vacuoles; reuse structure.mjs body-bar sheaf as the rigidity kernel, with membrane rupture as a 'firing' settlement exactly like failure().
- Tile/bead view: treat the 24x24 signal grid (or a coloured Voronoi) as a Wang-tile configuration whose colours are settled predicates; admit only matchings consistent with a substitution/sofic rule set; a bead-weave readout (two hands = two lineages crossing) becomes the finite observable stored as cells in the history.
- Make 'select' real: a fitness predicate settled by SignCraft over derived summaries (diversity, lineage coverage, energy) with the fork/compare operator as the evaluation oracle, giving an outer evolutionary loop that proposes mutate/adopt events through the existing operations registry.
- Attach a learning/proposal model at operations.intervene: it reads observe() summaries plus witnesses, emits typed events, and its proposals are validated by admitEvent and scored by forkCompare; contested proposals from several agents merge via mergePlans/seams, giving coordination-free multi-agent steering with H1 as disagreement signal.
- Add richer measurements (lineage abundance, Shannon diversity, mean lifetime, spatial autocorrelation, circulation H1 estimates from loopCirculation over many loops) as derived observables in operations.summary so any AI can be evaluated on whether the foam behaves as living.

