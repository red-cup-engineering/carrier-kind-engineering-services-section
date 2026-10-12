---
name: npc-is-entity-with-a-fiber
description: There is no NPC subsystem and no AI — an NPC is an entity with a fiber, and the only thing distinguishing it from a player is one predication, `mover`. Grounds the actor→npc/player split and the harbormaster's tick-driven response.
---

# An NPC is an entity with a fiber

The predication-world-sim is blunt: *"There is no NPC system.
An NPC is an entity with a fiber.
Its behaviour is respond(npc, situation).
The difference between a player and an NPC isn't type — it's who sends the messages."*

`tab` makes that a single bit of schema.
`actor` is any thing that bears a composable fiber (`perceives`, `intends`).
Its two children differ only in **`mover`**:

- `npc` — `mover: "tick"`.
  Its moves are fired by the tick.
- `player` — `mover: "session"`.
  Its moves are fired by a bound session.

Same schema otherwise, same fold, same algebra.
No behaviour tree, no state machine, no separate AI codepath.
The harbormaster, Takeshi Aoki, is an `npc`: when the world rings the fog bell, `ticking` runs his response — `respond(npc, situation)` collapses, in this seed, to "a ringing bell entails tending it," and he files `tending the-fog-bell`.
A richer fiber would entail richer responses; the mechanism does not change.
The npc *levels up* the same way a player does — by accumulating predications through interaction — because both are just things whose trace grows.

## Why this is the right shape

It means "play as anything" costs nothing structurally (see `player-is-a-fiber`): a player is an `actor` whose `mover` is a session, and *any* `actor` — the wind, a debt, a rumour — could be bound to a session instead of the tick.
The line between inhabitant and inhabited is one predication, and it can be redrawn per entity, per session, without new machinery.

The one thing deferred: actually wiring a session as a `mover` (taking input from a player and firing their moves).
That is the multi-user closure, a next-phase task.
In this seed the player `you` is inert and only the tick moves the world — but the npc already demonstrates the mechanism a player will reuse.

## Sources

- `.../predication-world-sim/predication-world-sim.md` §8 "The NPC system"
- `.../predication-world-sim/library/tasks/pws-cs-npc.md`
