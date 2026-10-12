# Modeled Player Swarm Dynamics

Status: source-backed declaration surface. This file refines the modeled-player
surface by importing the lab's multi-observer, agentive-positing, network-sheaf,
and agential-dynamics machinery. It is not a completed proof that SPOTCOMP
embeds into CGS or that every swarm has a final aperiodic classification.

## 1. Player Boundary

A modeled player is not the player. The local player schema says the player is
external and SPOTCOMP holds a settling representing the model. The model
therefore has three separate positions:

- external player: the actor or system being modeled;
- modeled player: the observer object whose state is a settling;
- character or peer record: a possible implementation bearer with skills,
  capabilities, keys, and operational state.

Key identity, inbox/outbox shape, role labels, and capability rows may identify
or bound an implementation bearer. They do not by themselves produce the
modeled-player object.

## 2. Ruled Observer-Local Settling

The categorical object for a modeled-player swarm is a ruled multi-observer
system:

`(O, V, r)`

where:

- `O` is the observer category.
- `V : O -> Settlings_B` assigns each observer a settling on the common base.
- `r(o)` assigns each observer its closure-rule system.

For SPOTCOMP, each modeled player is an object `o` of `O`. Its represented
state is `V(o)`, not a free-standing peer record. Its rule surface is `r(o)`,
not an ambient global default. This distinction is load-bearing because two
players can share evidence but settle differently under different rule systems.

The underlying unruled multi-observer system gives consensus as a limit:

`V_cons = lim_O V`

and disagreement as either pointwise bilattice divergence or first
cohomological obstruction, depending on the observer category. The ruled
extension separates:

- evidence-layer disagreement: agents posit different evidence;
- inferential-layer disagreement: agents share evidence but apply different
  closure rules.

The joint stage of a per-observer-rule system is bounded by the supremum of
observer closure ordinals. An implementation must preserve that supremum
instead of pretending every local player settles in one shared finite stage.

## 3. Agentive Positing

An agentive positing is an attributed positing morphism:

`posit^a_(phi,q) : v^a -> v^a join_k delta_(phi,q)`

where `a` is the observer/player, `phi` is the predication cell, and `q` is the
datum. As an action on the whole multi-observer system, it updates both the
individual settling and the merged settling:

`(v^a, v_bar) -> (v^a join_k delta_(phi,q), v_bar join_k delta_(phi,q))`

The assertion/claim distinction is relational. A posit is an assertion only
when the merged settling still agrees with the observer's local value at the
cell. It becomes a claim when the merged settling diverges, typically because
another observer has posited incompatible evidence and the merge reaches top.

SPOTCOMP consequence: actor attribution is part of the trace event evidence,
but the attributed event is still a positing into a ruled observer-local
settling. A runtime must not classify speech-act status from the local event
alone; it must compare the observer-local value with the current merged or
closed settling under the declared closure policy.

## 4. Configuration Space And Trajectory

The lab split between configuration space and trajectory is normative for
modeled players. The predication fiber functor gives the configuration space:

`F : C^op -> DBiLat(L)`

and a settling is the trajectory through the product of those fibers. Two
modeled players over the same base may differ only by trajectory; two modeled
players over different bases differ by configuration-space parameters as well.

SPOTCOMP consequence: a player profile must name the base/fiber surface
separately from the current local trace frontier. A row set or current state
cannot stand in for the whole modeled-player space.

## 5. Network-Sheaf Swarm Reading

For an agent graph `G`, take the observer category as the graph incidence
poset. The network-sheaf theorem then gives:

- consensus as `H0`, global sections, or the categorical limit;
- disagreement as pointwise bilattice join/top content and, for non-trivial
  topology, `H1` obstruction;
- coordination-free merge by the CRDT/Mayer-Vietoris vanishing theorem;
- CALM-compatible monotone computation on local views.

The bilattice extension keeps the d-frame structure, including consistency
and totality relations. This matters because the abelian shadows can show the
two sides separately while the d-frame records the con-failure cell that is
the top-valued disagreement witness.

SPOTCOMP consequence: a swarm profile must say whether it is using cellwise
meet, graph-sheaf global sections, knowledge-order merge, or a d-frame
disagreement join. These are related, but they are not interchangeable.

## 6. Strategy Boundary

The CGS reading starts after the modeled player has a ruled observer-local
settling. A CGS strategy is not a local loop and not a public key. It is a
concurrent strategy over a prime event structure with causality, conflict,
polarity, and symmetry, on `A^perp || B`.

SPOTCOMP strategy evidence must therefore bind:

- which observer-local settling the strategy reads;
- which event structure supplies observed histories;
- which player-polarity events the strategy may emit;
- receptivity and symmetry obligations;
- handedness, governance, and capability bounds;
- how the strategy preserves the bigraded and ruled-settling evidence.

Sequential or innocent strategies are permitted only as restrictions of the
concurrent strategy surface.

## 7. Dynamics And Transitions

The lab's agential-dynamics narrative reads an agent's behavior over time as a
settling path. Smooth paths preserve MLD classification: a modeled player
evolves within one class unless a non-smooth transition occurs.

SPOTCOMP transition events have three mathematical sources:

- regime jump: strict, Scott-continuous, transfinite, or aperiodic stage
  changes;
- increment event: new evidence or observation changes the trajectory;
- rule perturbation: the observer's closure-rule system changes.

For multi-observer swarms, collective classification changes only when one or
more observer-local paths cross such a boundary and the change propagates
through the consensus/disagreement structure.

## 8. Aperiodic Swarm Witness

Aperiodic swarm claims need an actual aperiodic witness. A modeled-player
swarm is not aperiodic because it has many players, shuffled deliveries, graph
cycles, clock jitter, or asynchronous execution. It is aperiodic when its
observer-local settlings and interaction covers carry substitution, patch,
direct-limit, MLD, or regime-classification evidence.

For SPOTCOMP, this means:

- modeled-player local settlings are the tiles/windows;
- substitution or patch rules describe local interaction recurrence;
- finite windows are projections, not the whole object;
- direct-limit cohomology and bigraded `H1` slots carry classification;
- DRIP/Remote ID conformance remains a separate identity/authentication layer
  for UAS deployments.

## 9. Declaration Probe

The files [schema/modeled-player-swarm-dynamics-profile.schema.json](./schema/modeled-player-swarm-dynamics-profile.schema.json),
[examples/modeled-player-swarm-dynamics-profile.json](./examples/modeled-player-swarm-dynamics-profile.json),
and [src/modeled-player-swarm-dynamics-profile.mjs](./src/modeled-player-swarm-dynamics-profile.mjs)
define a declaration-level checker for this surface.

The probe checks declarations for:

- external player versus modeled-player versus character boundary;
- ruled multi-observer system structure;
- agentive positing attribution and relational assertion/claim status;
- configuration-space/trajectory separation;
- network-sheaf consensus and d-frame disagreement boundaries;
- CGS strategy evidence;
- continuous versus transition dynamics;
- aperiodic-swarm witness obligations;
- implementation downgrade rules.

It does not compute consensus, prove cohomology, compute MLD invariants,
validate CGS morphism composition, or validate DRIP/UAS exchanges.
