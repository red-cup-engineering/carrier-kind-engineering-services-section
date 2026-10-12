# Continuous Learning

Status: source-backed declaration surface. This file records the first
SPOTCOMP treatment of continuous learning for modeled players. It is not a
complete learning theory and does not authorize untracked model-weight changes
as SPOTCOMP evidence.

## 1. Scope

In SPOTCOMP, continuous learning is monotone, governed change in a modeled
player's represented state, skills, memory fragments, or closure-rule surface.
It is part of Subject-Predicate-Object Trace Computer Operating
Modeled-Players because a modeled player is not fixed at registration time. It
has a trajectory.

Learning is not a hidden side channel. A learning step must be legible as
trace-bearing predication activity and must preserve the modeled-player
boundary in [MODELED-PLAYER-SWARM-DYNAMICS.md](./MODELED-PLAYER-SWARM-DYNAMICS.md).

## 2. Answering And Referencing Cycle

The active tree places answering and referencing under learning:

- answering posits a `(subject, predicate, object)` cell and value into the
  predication-cell-set, admitting the cell record at asserted stratum;
- referencing projects information out of the predication-cell-set by product
  projections or coordinate swap.

Together, these form the minimal learn/use cycle:

1. reference an observable frontier or projection;
2. answer by positing a new cell record;
3. close/settle under the modeled player's rule system;
4. expose future references against the updated local settling.

The cycle is continuous when it is iterated along a settling path while
preserving monotonicity, provenance, recognition, and governance.

## 3. Teaching

Teaching is a predication transformer. It confers a recorded skill, memory, or
doctrine on a bearer record by adding the bearer-side predication. The
conferred object is not mutated. Repeated identical teaching is idempotent.
Bearer-record conformance is preserved or the teaching operation refuses.

For SPOTCOMP, teaching is the canonical shape for durable capability learning:

`has-skill(player, skill)`

or, more generally:

`bears(player, conferred-record)`

This changes the modeled player's represented capability surface only through
an auditable predication.

## 4. Skill Improvement As Closure

The agential semioverse source states that skill improvement is a closure
operation over skill specifications. The seed is the existing skill plus the
new requirement. The fixed point is a skill that handles the new case and all
prior cases.

SPOTCOMP therefore treats skill learning as:

- monotone: coverage accumulates;
- inflationary: the improved skill covers at least the prior cases;
- idempotent: improving against an already covered case is a no-op;
- governed: improvement is admitted only through capability and policy gates;
- trace-bearing: improvement emits rows or resource evidence for the changed
  specification.

This is distinct from installing a skill into a host runtime. Installation is
an operating/computer projection. Teaching and skill improvement are modeled
player predication changes.

## 5. Memory And Local Fragments

Agent memory is the persistent-state condition for agentic systems. The
agential semioverse source models memory as a local fragment closed under the
base closure operator. SPOTCOMP adopts that boundary for modeled players:

- memory is a represented local fragment of the player state;
- memory updates happen through governed skills or positings;
- prior provenance is not invalidated;
- approximate retrieval or context-window presence is not itself durable
  learning evidence.

A runtime may use many storage mechanisms, but strong conformance needs the
learned content represented as trace-bearing predication or as a typed
resource linked to the modeled player's settling.

## 6. Rule Learning And Transition

Learning can also alter a modeled player's closure-rule system. That is a rule
perturbation, not just new evidence. It changes `r(o)` in the ruled
multi-observer system and can move the player across a classification
boundary.

SPOTCOMP distinguishes three learning-change classes:

- evidence learning: new increments in the existing rule system;
- skill learning: teaching or improving capabilities while preserving the
  player's rule system;
- rule learning: changing the closure-rule system itself.

The first two may be smooth within-class trajectory changes. Rule learning is
a transition event unless a proof shows the new rule system is
closure-equivalent to the old one.

## 7. Ludic And CGS Boundary

Learning occurs in play. The active ludics note places ludics as a
paraconsistent linear-logic category on the predication-fiber substrate, with
CGS refining dialogical structure by adding causal order and symmetry.

For SPOTCOMP, a learning step in a modeled player must be admissible both as:

- predication activity over the ruled observer-local settling; and
- game activity under the player's strategy and governance bounds when it is
  part of a play.

This prevents a runtime from treating hidden adaptation as outside the game.
If learning changes what a player can observe, infer, or do, then it is a move
or transition in the modeled-player system.

## 8. Declaration Probe

The files [schema/continuous-learning-profile.schema.json](./schema/continuous-learning-profile.schema.json),
[examples/continuous-learning-profile.json](./examples/continuous-learning-profile.json),
and [src/continuous-learning-profile.mjs](./src/continuous-learning-profile.mjs)
define a declaration-level checker for this surface.

The probe checks declarations for:

- answering and referencing as the learn/use cycle;
- teaching as bearer-side predication;
- skill improvement as closure;
- memory as governed local fragment;
- rule learning as rule-system transition;
- ludic/CGS learning boundaries;
- implementation downgrade rules.

It does not prove a skill improvement fixed point, validate live learning
quality, prove closure-equivalence of rule changes, or inspect runtime model
weights.
