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

## Boards

`board` gives Holofoam ground contact on the same footing as flight: a ride is its park, its start and its inputs at their ticks, and every pose is derived by fixed-dt stepping (1/64 s, only + − × ÷ and sqrt), so a submitted ride is verified by replaying it.

- **A park** (`boardPark`) is a floor, convex planar surfaces (flat, ramps, ledge tops) and rail segments. `groundAt` reads the highest surface under a point that is not above a step, and the wall beside it.
- **Five contact laws.** `rolling`: the wheels hold the board to its heading, so motion is one signed speed (negative is fakie) under the slope's share of gravity, rolling resistance and drag; pushes add speed to a top speed; turns carve; rolling off an edge flies with the surface's own velocity, so a ramp's lip throws you up. `air`: ballistic; held turn spins; a timed air action (a flip or grab the caller names) must finish before landing; a landing bails when sideways or too hard. `grind`: constrained to a rail under its slope and friction, locked on from the air while the grind is held and a rail is in reach. `manual`: rolling on two wheels. `bailed`: down until `recover`.
- **Balance is a law, not a reflex.** A grind or manual's lean drifts with a push growing with time held; the correction cancels at most its share, so every rider who asks for the same hold gets the same outcome and `balanceLimit` is the longest. A game makes the hold a skill by giving a smaller drift.
- `ride(park, start, inputs, { ticks, laws, sample })` returns the final state, the ride's events (push, launch, spin, action-begin/complete, land, grind-begin/end, manual-begin/end, wall, bail, recover) and an optional pose trace; `stepRide` is one tick for a predicting client.

## Orbits

`orbit` flies vessels on the same footing: a trajectory is a law over time, so time warp and multiplayer come free. The celestial system (star, homeworld, moon; `mu`, radius, parent, SOI, orbit elements) is admitted as cells. A vessel's flight plan is a set of segment cells keyed by (vessel, epoch): a **coast** is the exact two-body conic from a state at its epoch (universal variables, elliptic and hyperbolic, using only `deterministic-math` so every node derives identical bits), a **powered** law is fixed-dt integration under the parent's point gravity with a steering programme and an optional apoapsis cutoff. Segment ends (SOI exit/entry, impact, burnout) are derived by deterministic bisection and the successor coast is the same worldline in the new parent's frame; `poseAt(plan, t)` is one call for any `t`, years ahead included, with nothing ticked.

- **Kinematic points.** `diamonds(plan)` gives each segment as a causal diamond (startEvent, endEvent); `sequencingCheck` verifies endpoints reach and the order is (a,b) ≺ (c,d) iff b ≤ c, never nesting. `kinematicRegion(name, readout)` lifts a readout on diamonds to exterior/hole with the Obsmetrologia separation laws; `visibilityRegion` (line of sight past body radii) and `commRegion` are readouts, `visibleFrom` / `commRange` the instantaneous forms.
- **Multiplayer.** `mergePlans(...plans)` is SignCraft history merge, so the result is order-independent. Two different laws at one (vessel, epoch) are told both: `seams(plan)` reports H¹ and the contested cells, and `poseAt` refuses that vessel from the contested epoch on. H¹ = 0 exactly when every merge order reads the same.
- **What-if.** `whatIf(plan, { kind: "impulse", t, dv })` (or a powered law) forks the history and returns the resulting apsides and next SOI event; the document keeps the head address and the candidate, and `reopenManeuver` replays it.

`node scripts/orbit-demo.mjs` launches a point vessel (the slice-3 rocket is a rigid body under uniform gravity, so it is not coupled to a central field), circularizes, transfers to the moon, changes SOI, captures, warps ten years, merges two players with one deliberate conflict, and prints a history head that is identical on every run.

## Vessels

`vessel` is a rocket stacked from parts (pod, tank, engine, decoupler; top first). `stagesOf` reads the stack as stages bottom first, with Tsiolkovsky's Δv for each stage and thrust-to-weight at ignition. A stage burns only its own fuel and falls away with the decoupler above it. `stackDesign` gives the same stack as a `structure` design (welds, plus a decoupler joint below each decoupler). `tellAscent` tells a staged gravity-turn ascent into an orbit plan as one powered law per stage, up to an apoapsis cutoff. `spend` and `deltaVLeft` keep the propellant ledger beside the plan, so an impulsive burn is admitted only when the attached stages can pay for it. Farstone's Sky Yard (causeway-services/farstone `src/farstone-spaceflight.mjs`) is its first game. A body may carry a sidereal `rotationPeriod` (`surfaceVelocity`; the ascent starts with the ground's velocity and turns by ground-relative prograde) and an `atmosphere` `{ height, scaleHeight, density }` (`airDensity`, ρ₀·e^(−h/H) cut at the height, as KSP cuts its atmospheres); a part's `drag` (Cd·A) sums over what is attached, and a powered law with a `dragArea` pays ½ρ|u|u·CdA against the turning air. A coast that carries the vessel's `mass` and `dragArea` ends where its conic dips into the air (`atmosphere-entry`); the derived successor is an unpowered integrated segment under gravity and drag that ends on impact or on climbing back out (`atmosphere-exit`), where a fresh conic takes over: re-entry and aerobraking. Laws without drag are unchanged.

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

The measured product baseline is [data/records/competitive-baseline-records/competitive-baseline.json](data/records/competitive-baseline-records/competitive-baseline.json).
