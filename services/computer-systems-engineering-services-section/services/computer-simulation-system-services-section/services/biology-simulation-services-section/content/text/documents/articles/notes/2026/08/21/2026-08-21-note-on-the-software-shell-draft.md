---
title: "Software Shell Draft for the Natural Computer Simulation Engine"
description: "A first draft of the engine's software shell — process shape, module decomposition and import discipline, two-layer state model, tick pipeline, scenario and trace file formats, CLI, error policy, testing strategy, and milestones — written before the formal planning program (architecture description per ISO/IEC/IEEE 42010, HLD, LLD, and the studies of the science) existed, and therefore a draft input to that program rather than a decided architecture; its §4 fixed-step tick is already superseded by the simulation-core draft's frame loop."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-software-shell-draft
authors:
  - claude-fable-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "software-architecture", "module-decomposition", "trace", "replayability", "cli", "testing"]
tags: ["draft"]
---


The design doc says what the simulator claims; the panel review says
what survived. This draft sketches the software shell: the process,
the modules, the data model, the main loop, the file formats, the
CLI, the tests, and the milestones. It predates the formal planning
program (the 42010 architecture description, HLD, and LLD) and is an
input to it, not a decision record — where the program's documents
come to disagree with this draft, they win.

## 1. What kind of program this is

A deterministic, discrete-tick, single-threaded simulation engine,
shipped as a library with a thin CLI. No server, no UI, no database.
One run = one process invocation (or one library call) that loads a
scenario, executes N ticks, and writes a trace file. Everything a run
does is a pure function of (scenario, seed, tick count); replaying the
same inputs reproduces the trace byte-for-byte. That property is the
single most important architectural invariant and several decisions
below exist only to protect it.

Runtime: Node >= 20, ESM, plain `.mjs`, no build step, no TypeScript,
no bundler. Dependencies: `@red-cup-engineering/relating` (pinned) and
the Node standard library. Nothing else without a stated reason.

## 2. The two-layer state model (the load-bearing decision)

The theory documents describe interior state as evidence-charged
claims. Taken literally that is unimplementable for chemistry: Euler
integration needs a vector of nonnegative floats, not a lattice
element. The actual architecture is two coupled layers with an
explicit, narrow interface between them:

**Chemistry layer** — plain numbers. A species vector
`Float64Array` indexed by species id, a reaction table, a scalar
gradient input. Advanced by mass-action Euler steps. No `relating`
types anywhere in this layer. This is ordinary numerical simulation
code and is written, tested, and profiled as such.

**Claim layer** — a `relating` predication site plus valuation.
Holds admitted marks: configuration claims, signals, injected
assertions, and any statement about the cell that can be contested
(two sources disagreeing). Advanced by `composeFibers` joins. No
floats-as-charges anywhere in this layer.

**Coupling, exactly two directions and nothing else:**
- Claim → chemistry: an admitted, settled claim may set a chemistry
  parameter (a rate constant, an injection of species amount) at the
  start of a tick. The mapping is a declared table in the scenario
  (`bindings`), never ad-hoc code.
- Chemistry → claim: designated observables (cycle flux, W_pool,
  species amounts crossing declared thresholds) are published as
  machine-authored claims at the end of a tick, so the claim layer can
  reason about them and so division/death rules read one substrate.

This split is what makes the falsifier experiments cheap: the
last-write-wins control build swaps only the claim layer's merge
function; the no-gradient control zeroes only one chemistry input.

## 3. Module decomposition

```
src/
  engine.mjs      createEngine(scenario, opts) -> engine
                  engine.tick() -> TickRecord
                  engine.run(ticks) -> RunResult
                  engine.state() -> Snapshot          (frozen)
                  Owns the loop and the phase order. No domain rules.
  chemistry.mjs   createNetwork(speciesDefs, reactionDefs) -> net
                  step(net, state, gradient, dt) -> nextState
                  propensity(reaction, state) -> number
                  observables(net, state) -> {flux, ...}
                  Pure functions over Float64Array. No I/O, no relating.
  membrane.mjs    createMembrane(site, predicates, journal) -> m
                  m.admit(mark) -> Verdict             (records crossing)
                  m.predicates: ordered named list; site-presence check
                  is always predicate[0]. No fs access — it writes
                  through the journal interface it is handed.
  interior.mjs    createInterior(siteDef) -> interior
                  interior.apply(memes) -> {valuation, changed}
                  interior.chargeAt(cell) -> Charge
                  Thin wrapper over relating; the only module that
                  imports relating. Everything else sees plain data.
  lifecycle.mjs   checkDivision(snapshot, rules) -> null | DivisionPlan
                  applyDivision(snapshot, plan) -> [snapA, snapB]
                  checkDeath(snapshot, rules) -> null | DeathRecord
                  pcd.mjs-style state machine lives here as data-driven
                  stages, not a class hierarchy.
  scenario.mjs    loadScenario(path|object) -> Scenario   (validated)
                  Validation is total and up-front: a bad scenario
                  fails before tick 0 with a path-precise error.
  trace.mjs       createJournal(writable) -> journal
                  journal.record(TickRecord)
                  replay(tracePath) -> {scenario, seed, verify()}
                  JSONL, one object per line, schema in §5.
  prng.mjs        createPrng(seed) -> () => number   (mulberry32)
                  The only randomness source. Math.random is banned;
                  a lint check greps for it in CI.
bin/
  ncse.mjs        CLI, see §6.
test/
  *.test.mjs      unit + property + golden-trace tests, see §7.
experiments/
  *.mjs           the falsifier minimal-pairs; run on demand, not in CI.
```

Import discipline: `engine` imports everything; nothing imports
`engine`. `chemistry`, `prng`, `trace` import nothing from `src/`.
`membrane` and `lifecycle` import `interior`'s data shapes only. A
cycle in this graph is a build failure (checked by a 20-line script in
CI, not by convention).

## 4. The tick, exactly

```
tick(n):
  1. gradient = scenario.gradientSchedule(n)          // pure fn of n
  2. inbox    = scenario.markSchedule(n) ++ pendingTransforms
  3. verdicts = inbox.map(membrane.admit)             // journal each
  4. memes    = verdicts.filter(admitted).map(toMeme)
  5. {valuation, changed} = interior.apply(memes)     // join, <=3 passes
  6. params   = bindings.claimToChemistry(valuation)  // declared table
  7. chem'    = chemistry.step(net, chem, gradient, dt, params)
  8. obs      = chemistry.observables(net, chem')
  9. autoMemes = bindings.chemistryToClaim(obs)       // machine claims
 10. interior.apply(autoMemes)
 11. event   = lifecycle.checkDeath(...) ?? lifecycle.checkDivision(...)
 12. journal.record({n, gradient, verdicts, changed, obs, event, stateHash})
```

Notes that are decisions, not commentary: step 5 caps join passes at 3
and throws `EngineInvariantError` beyond that (finite site ⇒ settling
must terminate; exceeding the bound is a bug, and we want the crash,
not a silent spin). Step 12's `stateHash` is a SHA-256 over the
canonical serialization of (chem state, valuation) — replay
verification compares hashes per tick, so a divergence is localized to
its first tick instead of discovered at the end. Death and division
are *events in the record*, never exceptions: the engine runs to its
tick budget regardless, because a dead cell's trace tail is data (that
is how the death scenarios get asserted).

## 5. Data model and file formats

**Scenario** (JSON, validated by `scenario.mjs`):
```json
{
  "name": "stage1-baseline",
  "dt": 0.01,
  "species":   [{"id": "S_in", "initial": 0.0}, ...],
  "reactions": [{"id": "R3", "reactants": {"I1": 1, "L": 1},
                 "products": {"I2": 1, "H": 1, "W": 1},
                 "k": 2.0, "gradientCoupled": true}, ...],
  "gradient":  {"kind": "constant", "value": 1.0}
               | {"kind": "cut", "value": 1.0, "atTick": 500}
               | {"kind": "table", "values": [...]},
  "site":      {"predicates": ["metabolizes", "signals", ...],
                "cells": [...]},
  "membrane":  {"predicates": ["sitePresence", "provenance", ...]},
  "bindings":  {"claimToChemistry": [...], "chemistryToClaim": [...]},
  "division":  {"rule": "adder", "increment": 5.0},
  "marks":     [{"atTick": 10, "mark": {...}}, ...]
}
```
The SBML-subset reader (design doc §3) is a converter *into* this
format (`ncse import model.xml > scenario.json`), not a second input
path through the engine.

**Trace** (JSONL): line 0 is a header `{version, scenarioHash, seed,
engineVersion}`; every subsequent line is a TickRecord as in §4.12.
Traces are append-only and self-contained: `ncse replay` needs nothing
but the trace file and the scenario file it names by hash.

**Snapshot**: `{tick, chem: Float64Array-as-array, valuation,
lifecycle: {phase, pcdStage|null, deaths: [...]}}` — frozen, cheap to
hash, and the unit both `lifecycle` rules and tests operate on.

## 6. CLI

```
ncse run scenario.json --seed 42 --ticks 2000 --out runs/base.jsonl
ncse replay runs/base.jsonl --verify        # re-executes, diffs hashes
ncse observe runs/base.jsonl --metric flux  # tabulates a column
ncse import model.xml                       # SBML subset -> scenario
```
Exit codes: 0 ok, 1 bad input (validation error with JSON-pointer
path), 2 replay divergence (prints first divergent tick), 3 engine
invariant violation. No interactive mode, no watch mode, nothing that
reads the terminal.

## 7. Testing strategy

- **Unit**: each module in isolation; `chemistry` and `prng` need no
  fixtures at all.
- **Property tests** (chemistry): the three conformance properties
  from the Lean statements — propensity nonnegativity; step identity
  at `dt=0` and at a zero field; detailed-balance ⇒ fixed point within
  declared epsilon — over generated random networks. Plain
  `node:test` with a small generator helper; no property-test
  framework dependency unless this outgrows ~200 lines.
- **Golden traces**: three committed scenario+seed pairs with their
  expected final `stateHash`. Any engine change that alters a hash
  must update the golden file in the same commit with an explanation.
  This is the replay guarantee, enforced.
- **Scenario tests**: the four death modes and the division adder as
  runs over committed scenarios, asserting on the trace (e.g. "PCD
  completes while flux > 0 at every stage transition").
- **Characterization**: `substrate-admission.test.mjs` (exists,
  passing) pins the substrate's permissiveness.
- **Experiments** (`experiments/`, not CI): the falsifier minimal
  pairs. They print a verdict table; they do not assert, because their
  outcome is a research result, not a regression.

CI is `npm test` plus the import-cycle check plus the Math.random
grep. All of it runs in seconds; there is no reason for this package
ever to have a slow test suite at Stage 1 scale (tens of species,
tens of claims — performance is explicitly a non-goal until a profile
says otherwise, and no code is written "for speed" before then).

## 8. Error handling policy

Three error classes, used consistently: `ScenarioError` (bad input,
thrown only before tick 0, always with a JSON-pointer path),
`EngineInvariantError` (a bug — join-pass overrun, NaN in the species
vector, hash mismatch during verify; always fatal, never caught
internally), and domain outcomes (death, rejection at the membrane,
failed division) which are **data in the trace, never exceptions**.
`membrane.admit` never throws on a mark; a malformed mark is a
rejection verdict with reason `malformed`, recorded like any other.

## 9. What is deliberately not built

No plugin system, no config-file discovery, no environment-variable
behavior, no logging framework (the trace *is* the log), no
persistence beyond trace files, no concurrency, no organelle nesting
(Stage 2), no perceive/act loop (`animating` deferred), no
multi-cell anything (Stages 3–4). The membrane's promotion to a
sibling service (`services/membrane`) happens when a second consumer
exists or Stage 2 starts, whichever is first — promoting a
single-consumer module now is speculative packaging, and the module
boundary in §3 already keeps the extraction mechanical.

This supersedes the [panel review](2026-08-21-note-on-the-stage-1-expert-panel-review.md)'s build order on one point: the
synthesis put promotion first; this document defers it, for the
reason above. Everything else in its build order maps
onto the milestones below.

## 10. Milestones, each with an acceptance test

**M1 — chemistry runs.** `chemistry.mjs`, `prng.mjs`, `scenario.mjs`
(chemistry fields only), minimal `engine` loop, `trace.mjs`, `ncse
run`/`replay`. Acceptance: the 7-reaction baseline scenario reaches a
nonequilibrium steady state (cycle flux nonzero and stable for the
last 500 of 2000 ticks); the gradient-cut scenario's flux decays to
< 1% of NESS within its trace; `ncse replay --verify` passes on both;
property tests green.

**M2 — claims and the membrane.** `interior.mjs`, `membrane.mjs`,
bindings, mark schedules. Acceptance: the substrate-admission
scenario now *rejects* at the membrane (mirror of the
characterization test); the provenance gate rejects a
witness-duplicate resubmission that the type gate admits; a
claim-bound rate constant provably changes chemistry output; join
passes never exceed 3.

**M3 — lifecycle.** `lifecycle.mjs`. Acceptance: adder division fires
at the configured increment across three different birth sizes;
daughter fthen continues running; all four death scenarios produce
their distinct trace signatures, including PCD-with-live-flux and
bioenergetic-death-without-PCD.

**M4 — experiments.** The four falsifier pairs run and print their
verdict table from committed scenarios. Whatever they show, the
results go in `dev/research/` as a dated report; if a mechanism fails
its falsifier, the design doc gets corrected the way it was corrected
on 2026-08-21, and the mechanism gets simplified out.

Version 0.1.0 at M1; 0.2.0 at M2; 0.3.0 at M3. The package stays
`private: true` throughout Stage 1.
