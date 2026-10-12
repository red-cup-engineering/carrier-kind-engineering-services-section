# Swarm Function Contract

Status: candidate implementation contract for composing the basic SPOTCOMP
functions into a modeled-player swarm.

The swarm runtime is not a separate machine around SPOTCOMP. It is a family of
TRC/TDP function evaluations over local JSONL EAVT SPOTs:
subject-predicate-object cell traces, related by receiver-relative admission,
player-local observation, settlement, and projection.

This file connects [NORMATIVE-FUNCTIONS.md](./NORMATIVE-FUNCTIONS.md) and
[FUNCTION-LAWS.md](./FUNCTION-LAWS.md) to the modeled-player swarm object:

`S = (O, V, r, Players, SharedTrace, Fed, Gov, Settle, Ops)`

## 1. Swarm State As TRC/TDP State

For each observer/player object `o in O`, a runtime keeps:

- `C_o`: the local TRC/TDP catalog/program for `o`;
- `T_o`: the admitted local JSONL EAVT SPOT, the subject-predicate-object
  cell trace;
- `V(o)`: the local settling represented by replay and closure over `T_o`;
- `r(o)`: the local closure-rule system;
- `B_o`: bearer evidence such as keys, inboxes, outboxes, character files,
  skills, capabilities, and host process state;
- `G_o`: governance and capability context;
- `Strat_o`: CGS strategy reference or downgrade.

Only `V(o)` is the modeled-player state. `B_o` can support it, carry it, or
operate it, but does not define it.

## 2. External Ingress

External ingress to observer `o` is the function composition:

`receive -> parse -> identify -> admit_o -> append_o -> dual-file_o -> replay_o -> close_o`

where:

- `receive` obtains bytes or a local presentation;
- `parse` returns a candidate exact EAVT row or typed resource;
- `identify` computes canonical identity for row-shaped evidence;
- `admit_o` applies receiver-relative recognition, governance, capability,
  observation/action bounds, and regime compatibility;
- `append_o` grows the admitted trace;
- `dual-file_o` preserves subject and predicate anchors inside `C_o`;
- `replay_o` rebuilds working state from the admitted frontier;
- `close_o` advances local settlement or records prefix, obstruction, or
  downgrade.

Required law:

`append_o` may occur only after `admit_o` succeeds. Signature validity, parse
success, and row shape do not bypass `admit_o`.

## 3. Local Player Step

A modeled-player step for `o` is:

`observe_o -> project_o -> settle_o -> decide_o -> posit_o -> append_o -> dual-file_o -> replay_o -> close_o`

where:

- `observe_o` selects a permitted player-local frontier from inbox, shared
  trace, local resources, and world observations;
- `project_o` restricts the frontier to the player-local observation surface;
- `settle_o` computes or references `V(o)` under `r(o)`;
- `decide_o` applies `Strat_o` with governance, capability, budget, cost, and
  handedness constraints;
- `posit_o` creates attributed predication-cell evidence for the chosen move.

Required laws:

- `observe_o` is player-local and does not assume a synchronized global
  frontier.
- `decide_o` cannot emit trusted action evidence without governance,
  capability, observation, local-settling, and strategy status.
- `posit_o` is an attributed positing into a ruled observer-local settling,
  not a generic row write.
- The emitted finite row is evidence of the positing event, not the whole
  positing morphism.

## 4. Shared Trace And Federation

Shared trace update is:

`merge(SharedTrace, admitted(T_o))`

Federated publication is:

`settle_o -> project_o -> transport -> receive_p -> parse -> identify -> admit_p`

for each receiver `p`.

Required laws:

- local acceptance at `o` does not force admission at `p`;
- receivers preserve their own recognition, governance, and rule-system
  context;
- merge is G-Set union by canonical row ID over admitted rows;
- rejected or downgraded federation creates audit evidence rather than trusted
  trace evidence.

## 5. Consensus And Disagreement

Consensus is not identical to trace equality. A swarm profile must declare the
surface it uses:

- same admitted row-ID set;
- same replayed state under the same catalog and rules;
- same local settling value;
- graph-sheaf global section or `H0`;
- knowledge-order merge;
- d-frame con-failure witness;
- `H1_t` or `H1_top` cohomology audit.

Required law:

If two observers have different `r(o)`, equal trace frontiers do not imply
equal settlements unless a closure-equivalence theorem is declared.

## 6. Strategy And CGS Handoff

The CGS handoff for observer `o` is a function from settled observation to
strategy evidence:

`V(o), observation_o, r(o), Gov_o -> arena_o, strategy_o, downgrade_o`

A conforming handoff records:

- event-structure arena;
- polarity;
- causality;
- conflict;
- symmetry;
- strategy morphism on `A^perp || B`;
- receptivity and composition obligations or explicit downgrade.

Required law:

A player loop, key, policy table, or prompt template is not a CGS strategy
unless this handoff evidence is present.

## 7. Learning And Transition

A learning step is a modeled-player transition:

`V(o), r(o), evidence -> V'(o), r'(o), transition-evidence`

It may be smooth within a closure-equivalent class, or it may be a regime,
increment, or rule-perturbation transition.

Required laws:

- hidden context, hidden weights, cache mutation, or host preference drift are
  not learning evidence by themselves;
- if `r(o)` changes, the swarm records whether closure-equivalence is preserved
  or a transition has occurred;
- strategy-relevant learning is also CGS/ludic activity or a declared
  downgrade.

## 8. Operations And Cost

The swarm operational path is:

`work-event -> budget-check -> cost-compose -> governed-effect -> audit`

applied around the function compositions above.

Required laws:

- reads do not hide settlement cost;
- budget exhaustion is recorded as governed transition or rejection evidence;
- ledgers are witness projections, not external bookkeeping;
- process, procedure, derivation, and inquiry work types are declared before
  work changes settlement, governance, budget, or player state.

## 9. Aperiodic And Bigraded Boundary

A strong swarm claim needs more than the function loop. The loop must preserve:

- closure KZ and fibration KZ axes;
- truth-order and knowledge-order common-knowledge separation;
- `H1_t` and `H1_top` audit slots when relevant;
- local settlings as tiles/windows for aperiodic claims;
- substitution, patch, direct-limit, MLD, or regime-classification evidence.

Delivery order, peer count, network topology, and clock jitter are not
aperiodic evidence.

## 10. Normative Swarm Traces

A reviewable swarm implementation should be able to produce trace evidence for
at least these event classes:

- external presentation received;
- parse success or parse failure;
- canonical identity computed or downgraded;
- signature verified or rejected;
- admission decision;
- append and dual-filing;
- replay context identity;
- closure step or fixed-point/prefix/downgrade;
- player-local observation;
- strategy decision or strategy downgrade;
- attributed positing;
- projection;
- transport publication;
- receiver rejection, quarantine, downgrade, audit, or acceptance;
- operations cost, budget, and governance decisions;
- learning transition or no-transition evidence.

These are event classes over the same JSONL EAVT SPOT discipline. They are not
separate object systems.

## 11. Minimal Swarm Composition

The minimal reviewable swarm composition is:

1. For each `o`, maintain `C_o`, `T_o`, `V(o)`, and `r(o)`.
2. Admit inbound evidence with `parse -> identify -> admit_o`.
3. Append and dual-file only admitted evidence.
4. Replay and close local frontiers to produce `V(o)` or non-final status.
5. Run player-local observation and strategy against `V(o)`.
6. Emit attributed positings through the same append and admission discipline.
7. Merge admitted shared trace by canonical row ID.
8. Project and transport only typed objects or finite projections.
9. Record rejections, downgrades, obstructions, costs, and learning
   transitions as trace evidence.

Anything less may still be a useful experiment, but it is not enough evidence
for a normative SPOTCOMP swarm implementation.
