---
name: the-self-running-world
description: The tick model — how tab advances a world under its own volition with no input, why one-way settling is the arrow of time, and why crash recovery is free. Grounds ticking.mjs and run.mjs in the prior art (qtmud's tick-universe, voidmath's settle fixpoint, swarm's replay, spacetime's settling).
---

# The self-running world

A database waits to be asked.
A world does not — between turns the tide turns, the ferry sails, fog rolls in.
The predication-world-sim says it plainly: *"the algebra runs on every entity every tick, and what happens is what settlement produces."* `tab` makes that literal.

## The tick

`ticking({root})` is one autonomous advance.
It reads each entity's current functional state and the dimension clock, and `changing`-appends the rows the world's own physics emit this tick:

- the dimension clock increments (the heartbeat everything else reads);
- the tide turns on a semidiurnal cycle; the marsh clam bed exposes at low water;
- the ferry sails docked↔underway unless fog holds it;
- fog rings the harbor bell; the harbormaster (an npc) responds by tending it;
- the permit ages; past its window the world files `overdue` and the cell goes **⊤**.

These are *deterministic functions of state* — no RNG, no LLM.
That is what makes the world **replayable**: the same log produces the same future.
`run.mjs` is the only stateful piece — a loop that ticks, persists (by appending), and sleeps — exactly qtmud's `run-universe` (a thread, a 0.2 s sleep, a schedule drain), rebuilt on EAVT.

## One-way settling is the arrow of time

`changing` is `doing` restricted to **functional** predicates — single-valued over time (one place, one clock, one tide phase).
The trace stays append-only; `supersede` reads the latest-t row, so a change supersedes its predecessor *without mutating history*.
The spacetime tutorial (`development/lab/spacetime/.../introduction-to-spacetime.md`) calls this out: collections settle toward a state and never spontaneously away — "this one-way settling is the origin of the arrow of time."
In `tab` the arrow is made of disk: the latest functional row wins, the past is still all there, and time only points forward because settlement does.

## Crash recovery is free

There is no world object in memory to lose.
The world IS the append-only log.
Kill `run.mjs` mid-tick and restart it: the next tick reads the latest functional rows off disk and carries on; `--replay` re-folds the whole world from scratch and gets the same answer.
This is the swarm replay discipline (`development/lab/swarm/README.md`: status is folded from the trace, never stored) applied to a game world.
The settlement fold itself mirrors `voidmath-kernel`'s `settle.mjs` — iterate a monotone step to a fixed point — except tab's per-tick fold is bounded by the finite trace, so it always terminates.

## What's deferred

`ticking` advances *state*.
The other sense of advance — **growing**, the aperiodic→finite accretion that adds new rooms/entities (the archive's working Fibonacci-word quasicrystal `grow.mjs`) — is a next-phase task.
And genuine **non-confluence** (the tick forking into incomparable settlements: real choice) is also next-phase; today the tick is confluent by construction.

## Sources

- `development/lab/archive/multi-user-dungeon/tab/racket/personal-projects-racket-bcf/racket-qtmud/qtmud.rkt`
- `development/active/voidmath-kernel/.../positing/library/scott-continuous-posit-category/settling/scripts/settle.mjs`
- `development/lab/swarm/README.md` (replay / trace-derived status)
- `development/lab/spacetime/docs/tutorials/introduction-to-spacetime.md` (settling = arrow of time)
- `.../predication-world-sim/predication-world-sim.md` §"What the world does between turns"
