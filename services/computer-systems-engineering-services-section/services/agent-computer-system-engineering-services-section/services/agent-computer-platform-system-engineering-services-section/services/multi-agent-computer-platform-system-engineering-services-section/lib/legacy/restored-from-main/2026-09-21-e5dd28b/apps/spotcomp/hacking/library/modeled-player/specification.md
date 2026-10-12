# Modeled Player Specification

Status: first normative skeleton for the modeled-player sub-specification.

This sub-specification owns the SPOTCOMP meaning of modeled players and swarms.
A modeled player is not a peer record, a public key, a character file, or an external human.
It is the system-held model of an external player as a ruled observer-local settling, bound to governance, handedness, trace evidence, and CGS strategy obligations.

## 1. Position In SPOTCOMP

SPOTCOMP expands here as Subject-Predicate-Object Trace Computer Operating Modeled-Players.
The modeled-player layer depends on:

- PAM for Predicate Algebra Modeling and settlement behavior;
- TRC/TDP for typed resources, trace evidence, and replayable proof-tree placement;
- operations for work, governance, cost, budget, and process evidence;
- CGS for event-structure and strategy morphism laws;
- continuous learning for governed player-model changes over time.

It owns the player/model boundary, local-settling carrier, handedness, observation/action bounds, swarm observer structure, and the point at which player behavior may be reviewed as CGS-shaped.

The derivation direction is:

`aperiodic articulating -> transfinite predicating -> Scott-continuous positing -> finite settling`

A finite player record is a downstream settlement witness.
It does not generate the modeled-player object by itself.
Strong modeled-player claims must preserve the upstream aperiodic, transfinite, and Scott-continuous structure that makes finite settlement meaningful.

## 2. Player Boundary

A conforming modeled-player profile MUST keep these positions distinct:

- external player: the person, system, organization, device, character, or other actor being modeled;
- modeled player: the SPOTCOMP-local model of that actor;
- character or peer record: an implementation bearer with keys, skills, memory, host state, capabilities, or operational status;
- persona, role, skill, method, and tool surface: possible implementation structure, not the player model itself;
- CGS strategy: game-semantic behavior over an arena.

The external player is outside the local SPOTCOMP object unless separately represented by trace evidence.
The modeled player is inside SPOTCOMP as a settling.
A character may carry or operate a modeled-player profile, but a character is not the definition of player.

## 3. Ruled Observer-Local Settling

The categorical object for a modeled-player swarm is a ruled multi-observer system:

`(O, V, r)`

where:

- `O` is the observer category;
- `V : O -> Settlings_B` assigns each observer a settling over the common base;
- `r(o)` assigns each observer its closure-rule system.

Each modeled player is an object `o` of `O`.
Its represented state is `V(o)`.
Its inference and closure behavior is `r(o)`.
The profile MUST NOT replace this with a single global frontier or a global rule default unless it has a restriction theorem for that case.

## 4. Agentive Positing And I/O

Player I/O enters SPOTCOMP as articulation before it can be trace or settlement evidence.
A modeled-player input pipeline MUST preserve:

`external signal -> token/utterance -> articulating -> predicating -> positing -> settling`

An agentive posit is attributed to an observer/player and updates the observer-local settling and the merged settling under the declared policy.
Assertion versus claim status is relational: it depends on comparison between local value and merged or closed value, not on the local event alone.

LLM prompts, completions, tool calls, hidden context, transport payloads, and operator messages are outside-system presentations until admitted through this boundary.
They are not modeled-player learning, strategy, or settlement evidence by themselves.

## 5. Player Record Surface

A modeled-player record MUST declare at least:

- stable modeled-player identifier;
- external-player reference or boundary statement;
- local-settling reference `V(o)`;
- per-observer rule-system reference `r(o)`;
- identity authority or key material when applicable;
- capability declaration;
- governance regime;
- observation bound;
- action bound;
- handedness: receive, send, actuate, observe;
- input trace references and output trace references;
- CGS strategy reference or explicit downgrade;
- learning and transition policy when the model can change.

Input and output traces are ordinary trace evidence.
An output row may witness a player action only after the profile has preserved attribution, governance, capability, observation, and strategy boundaries.

## 6. CGS Handoff

The modeled-player layer hands the following to CGS:

- observer-local settling read by the strategy;
- observation frontier available to the player;
- event-structure arena for the play;
- Player/Opponent polarity assignments;
- player-polarity events the strategy may emit;
- causality and conflict evidence relevant to those moves;
- symmetry classes and strategy quotient obligations;
- receptivity and composition obligations;
- restriction evidence for deterministic, sequential, or innocent profiles.

The CGS strategy does not replace the modeled-player object.
It is the game-semantic law governing one aspect of modeled-player behavior.

## 7. Swarm Dynamics

A modeled-player swarm is a finite or directed family of modeled players over a shared base and federation discipline.
A conforming swarm profile MUST support player-local partial observation and MUST NOT assume every player sees the same trace frontier at the same time.

The swarm profile MUST declare which consensus or disagreement surface it uses:

- cellwise meet;
- knowledge-order merge;
- graph-sheaf global sections or `H0`;
- pointwise bilattice divergence;
- d-frame con-failure witness;
- cohomological obstruction such as `H1_t` or `H1_top`.

These surfaces are related, but they are not interchangeable.

## 8. Aperiodic And Bigraded Obligations

Strong modeled-player swarm claims require the bigraded diamond surface:

- closure KZ and fibration KZ axes remain separated;
- truth-order and knowledge-order common-knowledge fixed points remain distinct unless a scoped theorem identifies them;
- truth-axis and inconsistency-axis cohomology slots are preserved;
- modeled-player local settlings are the relevant tiles or windows;
- substitution, patch, direct-limit, MLD, or regime-classification evidence witnesses aperiodicity.

A swarm is not aperiodic because it has many peers, shuffled delivery order, graph cycles, asynchronous execution, clock jitter, or an unmapped routing topology.
DRIP/UAS conformance, when applicable, is identity and authentication evidence for UAS deployment; it is not an aperiodic tiling proof and does not prove CGS strategy conformance.

## 9. Learning And Transition

A modeled player may change only through governed, trace-bearing model transitions.
Admissible learning surfaces include:

- answering and referencing that add or project predication evidence;
- teaching that confers a skill, memory, or doctrine on a bearer;
- skill closure that preserves prior cases while reaching a new fixed point;
- memory-fragment transition with durable evidence;
- rule-system perturbation with regime and closure-ordinal evidence;
- strategy-relevant change reviewed under CGS or ludic boundaries.

Hidden weights, hidden context, unlogged prompt adaptation, cache mutation, or host-local preference drift are not SPOTCOMP modeled-player learning evidence.

## 10. Declaration Probes

The current declaration probes are:

- [../../PLAYER-CHARACTER-BOUNDARY.md](../../PLAYER-CHARACTER-BOUNDARY.md);
- [../../schema/player-character-profile.schema.json](../../schema/player-character-profile.schema.json);
- [../../examples/player-character-profile.json](../../examples/player-character-profile.json);
- [../../src/player-character-profile.mjs](../../src/player-character-profile.mjs);
- [../../MODELED-PLAYER-SWARM-DYNAMICS.md](../../MODELED-PLAYER-SWARM-DYNAMICS.md);
- [../../schema/modeled-player-swarm-dynamics-profile.schema.json](../../schema/modeled-player-swarm-dynamics-profile.schema.json);
- [../../examples/modeled-player-swarm-dynamics-profile.json](../../examples/modeled-player-swarm-dynamics-profile.json);
- [../../src/modeled-player-swarm-dynamics-profile.mjs](../../src/modeled-player-swarm-dynamics-profile.mjs);
- [../../CONTINUOUS-LEARNING.md](../../CONTINUOUS-LEARNING.md);
- [../../schema/continuous-learning-profile.schema.json](../../schema/continuous-learning-profile.schema.json);
- [../../src/continuous-learning-profile.mjs](../../src/continuous-learning-profile.mjs).

The probes check declaration shape for external/model/character separation, ruled observer-local settlings, agentive positing, configuration space versus trajectory, network-sheaf consensus, d-frame disagreement, strategy preconditions, transition dynamics, aperiodic witnesses, and learning boundaries.

They do not prove local-settling correctness, compute consensus, compute cohomology, prove MLD equivalence, validate live outside systems, verify DRIP/UAS exchanges, or prove the CGS embedding.

## 11. Non-Conformance Cases

A modeled-player profile is not conformant when:

- it treats the external player and the local model as the same object;
- it treats a key, mailbox, inbox/outbox pair, character file, or capability row as sufficient player evidence;
- it lacks `V(o)` or `r(o)`;
- it assumes global synchronized observation;
- it emits player actions without governance and capability bounds;
- it treats LLM output or outside-system I/O as settlement evidence without articulation and admission;
- it claims strategy conformance without CGS event-structure and strategy-law evidence;
- it claims aperiodicity without substitution, patch, direct-limit, MLD, or regime-classification evidence;
- it uses DRIP/UAS identity evidence as a substitute for modeled-player, tiling, or strategy proof.

## 12. Immediate Derivation Work

The next modeled-player specification pass needs:

- exact schema for modeled-player records over `(O, V, r)`;
- exact handoff schema from local settling to CGS strategy declaration;
- theorem connecting agentive positing to trace rows and merged settlement;
- implementation law for player-local partial observation;
- consensus and disagreement computation profiles for graph-sheaf swarms;
- aperiodic witness format connected to local-settling tiles;
- governed learning transition schema;
- boundary theorem connecting operations work/cost records to modeled-player state changes.
