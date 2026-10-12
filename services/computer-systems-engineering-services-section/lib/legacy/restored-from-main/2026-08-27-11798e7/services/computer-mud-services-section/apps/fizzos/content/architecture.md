# Current FizzOS architecture

## Kernel laws

FizzOS keeps the small semantic center of the archived engines while moving
their breadth behind composable module boundaries. The kernel owns five laws:

1. assertions form an immutable, inspectable trace;
2. positive and negative evidence join in Belnap FOUR without explosion;
3. functional predicates settle by admitted sequence;
4. actor perception is a real restriction of world state;
5. only an ordered tick executes admitted actor commands.

Games own inert content. Capabilities own optional policy. Transports own
sessions and delivery. Persistence owns exact encoding and trace compaction.
None of them can mutate a world behind the tick or create a second source of
world truth.

## Runtime flow

```text
game data -> assertions -> immutable world -> capability queries
                         ^          |
actor/session -> queue -> tick ------+-> addressed events
                         |
                         +-> receipt -> snapshot/checkpoint
```

`tell` is the primitive transition. Commands, ecology, markets, governance,
NPCs, automation, instancing, and federation either produce assertions through
that boundary or compute immutable projections from it. Capabilities compose in
an explicit registry; importing an optional system cannot silently modify the
kernel.

## System boundaries

- World substrate: FOUR (the join read from the house `@lenticule-science/metrologic`
  bilattice floor, FizzOS's one exact-pinned runtime dependency), assertions,
  functional settlement, perception.
- Execution: commands, deterministic ticks, confluence assays, stable sessions.
- Continuity: exact snapshots, atomic files, bounded checkpoints, replay.
- Simulation: clock/weather, fields, ecology, markets, crafting, campaigns.
- Actors: skills, social/reputation/crime, NPC agency, interiority, predication.
- Institutions: governance, communication, knowledge, play, ships and routes.
- Extension: bounded Lisp, components, instances, shard federation.
- Delivery: terminal tools, JSON HTTP service, and source-direct client.

Public export names correspond one-to-one with current module boundaries. The
archived packages remain read-only evidence under `lib/legacy`; the current
package has no runtime dependency on them and exposes no compatibility layer.

## Acceptance invariant

A capability is current only when its implementation, executable test, and
archived benchmark category are connected in
`capability-concordance.json`. Verification checks the complete union of the
July and August archived test names, imports every public export, validates all
executables, runs the current suite, and assays the packed artifact. This turns
"meet or beat" into a reproducible repository property rather than a source
inventory claim.
