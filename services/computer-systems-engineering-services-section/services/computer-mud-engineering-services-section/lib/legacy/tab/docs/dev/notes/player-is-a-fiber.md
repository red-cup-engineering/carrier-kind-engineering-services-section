---
name: player-is-a-fiber
description: The player controls any closed/settled fiber — a person, but in principle the wind, a debt, a rumour — and the UI is fiber-agnostic. Why tab has no privileged player entity-type, only an `actor` whose mover is a session.
---

# The player is a fiber

In most simulations the player is a privileged entity type with hardcoded subsystems rocks and rivers don't have.
The predication-world-sim refuses that: *"the player assumes control of ANY closed fiber… you see the world through your entity's predicates, you act by choosing which messages to send, what happens is what respond() computes."* Playing as a person, the wind, a debt, or a rumour are the same mechanics — only the fiber differs.

`tab` keeps the door open structurally.
There is no `player` machinery distinct from `actor`: a player is an `actor` (anything with a composable fiber) whose `mover` is a session.
The interface does not need to know what you *are*; it shows you what your fiber contains (your settled cells), what it perceives (the Umwelt projection), and what changed (the last tick's settlement).
A person sees rooms and a bell; a different fiber in the same harbor would see pressure or debt or salinity.
Same UI structure, different content, because different fiber.

This is why `actor` sits where it does in the descent — directly under `thing`, as *"a thing that bears a composable fiber"* — and why item is a sibling, not a parent: passivity is the absence of a fiber, not a different kind of thing.
Promoting an item to an actor (giving the storm lantern a fiber and binding a session to it) is admissible later with no new machinery.

What this seed does **not** yet do: take session input and fire a player's moves from it.
The player `you` is present and perceives the world but is inert; only the tick moves things.
Binding a session as a `mover` is the multi-user closure (a next-phase task).
The mechanism is already proven by the npc, which fires moves the same way the player will — the question is only who pulls the trigger.

## Sources

- `.../predication-world-sim/predication-world-sim.md` §"The player IS a fiber", §"What the player actually does"
- `being/library/thing/thing.md` (the actor/item split)
