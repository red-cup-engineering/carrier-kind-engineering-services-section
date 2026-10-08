# Holofoam

Holofoam is a SignCraft simulation engine: a deterministic laboratory of
localized organisms acting on a shared field, with a browser studio at
<https://holofoam.561.group>. It composes SignCell, SignChain, SignGraph and
SignCraft and re-implements none of them.

## Experiments are SignCraft histories

An experiment's record is a SignCraft history. The definition (seed, preset,
dimensions, configuration, initial field rules, genomes) and every admitted
event (`rule`, `pulse`, `select`, `barrier`, `adopt`, `mutate`) are cells
observed into the history, events at their tick. Organism positions,
velocities, signals and models are never written: they are derived by
deterministic replay of the definition and events, so the same history
yields a bit-identical world. Everything that crosses a boundary is a
content-addressed history.

- `./simulation` - `createExperiment`, `step`, `applyEvent` (bounded
  `admitEvent`), `snapshot` (the history), `replay(history)`,
  `encodeExperiment` / `decodeExperiment`.
- `./checkpoint` - a checkpoint is a SignCraft `checkpointHistory` cut;
  `restoreCheckpoint` derives its world. A `holofoam.current-state/v1`
  checkpoint is still readable: it is imported as the origin of a history.
- `./comparison` - What-if. The document (`holofoam.field-comparison/v2`;
  v1 documents reopen as v2) names one history cut, one field-rule
  intervention and a continuation length. Reopening forks the history into
  two continuations that differ only by that intervention, and compares them.
- `./operations` - the JSON action registry shared by the browser and
  headless callers: admit, step, observe, intervene, fork-compare.

## Ship structure and flight

`structure` and `flight` give Holofoam spaceflight on the same footing as experiments: a ship design is observed into a SignCraft history as part, mass, position, joint and strength cells, and everything else is derived by replay.

- **Rigidity is cohomology.** Welds fuse parts into rigid clusters; struts, decouplers (ball joints) and hinges are constraints between clusters, read as a body-bar rigidity sheaf (`signgraph/cellular-sheaf`) exactly over the rationals: H⁰ motions, mechanisms (motions minus 6 per connected piece), self-stresses H¹, and the Maxwell identity.
- **Loads are equilibrium on the sheaf.** `loads` solves Rᵀf = −p with deterministic conjugate gradients (`solveNormal`); an over-braced design takes the minimum-norm (harmonic) solution and a mechanism returns its obstruction rather than NaN.
- **Breakage is a settlement event.** A member over its strength is told against its design cell (FOUR ⊤), fires, and vanishes (T2; a split is also T1); `failure` re-settles until nothing fires and `observeFirings` records each step.
- **Flight is law, not state.** `launch`, `setThrottle` and `stage` tell one segment cell per rigid body, only when its inputs change; `bodiesAt(flight, tick)` derives the pose by fixed-dt symplectic integration from the segment's epoch. `node scripts/rocket-demo.mjs` flies a staged rocket and prints the same history address on every run.

## Orbits

`orbit` flies vessels on the same footing: a trajectory is a law over time, so time warp and multiplayer come free. The celestial system (star, homeworld, moon; `mu`, radius, parent, SOI, orbit elements) is admitted as cells. A vessel's flight plan is a set of segment cells keyed by (vessel, epoch): a **coast** is the exact two-body conic from a state at its epoch (universal variables, elliptic and hyperbolic, using only `deterministic-math` so every node derives identical bits), a **powered** law is fixed-dt integration under the parent's point gravity with a steering programme and an optional apoapsis cutoff. Segment ends (SOI exit/entry, impact, burnout) are derived by deterministic bisection and the successor coast is the same worldline in the new parent's frame; `poseAt(plan, t)` is one call for any `t`, years ahead included, with nothing ticked.

- **Kinematic points.** `diamonds(plan)` gives each segment as a causal diamond (startEvent, endEvent); `sequencingCheck` verifies endpoints reach and the order is (a,b) ≺ (c,d) iff b ≤ c, never nesting. `kinematicRegion(name, readout)` lifts a readout on diamonds to exterior/hole with the Obsmetrologia separation laws; `visibilityRegion` (line of sight past body radii) and `commRegion` are readouts, `visibleFrom` / `commRange` the instantaneous forms.
- **Multiplayer.** `mergePlans(...plans)` is SignCraft history merge, so the result is order-independent. Two different laws at one (vessel, epoch) are told both: `seams(plan)` reports H¹ and the contested cells, and `poseAt` refuses that vessel from the contested epoch on. H¹ = 0 exactly when every merge order reads the same.
- **What-if.** `whatIf(plan, { kind: "impulse", t, dv })` (or a powered law) forks the history and returns the resulting apsides and next SOI event; the document keeps the head address and the candidate, and `reopenManeuver` replays it.

`node scripts/orbit-demo.mjs` launches a point vessel (the slice-3 rocket is a rigid body under uniform gravity, so it is not coupled to a central field), circularizes, transfers to the moon, changes SOI, captures, warps ten years, merges two players with one deliberate conflict, and prints a history head that is identical on every run.

## Policies are settled by SignCraft

Each organism senses a bounded local neighborhood and keeps a short
time-indexed witness record. A lineage genome's edges are SignChain rules;
the sensed atoms (`favorable-flow`, `signal`, `crowded`, `mixed`) are
SignCells told for by the observation. SignCraft's `settleCells` settles
each sensory signature, and the policy reads `approach-for` and
`approach-against` off the settled valuation, with the rule derivations as
witnesses. Both gives `inspect`, support only `approach`, opposition only
`avoid`, neither `explore`. Unknown sensors stay unknown and do not erase
other cues. Mutation changes a lineage's rules and so its settled table and
model identity.

## Studio

Field tools, pause and forced single-step, undo/redo, named local saves,
share links and file import/export (both histories), PNG and WebM capture,
local-senses rendering, and the What-if comparison. The circulation display
is finite midpoint quadrature over the app field.

The measured product baseline is [data/records/competitive-baseline.json](data/records/competitive-baseline.json).
