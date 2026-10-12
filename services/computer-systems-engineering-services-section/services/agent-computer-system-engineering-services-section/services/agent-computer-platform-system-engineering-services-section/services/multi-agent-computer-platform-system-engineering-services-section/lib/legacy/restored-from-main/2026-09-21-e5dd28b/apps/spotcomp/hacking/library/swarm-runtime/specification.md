# Swarm Runtime Specification

Status: first normative skeleton for the SPOTCOMP swarm runtime sub-specification.

This sub-specification consolidates the runtime loop for a SPOTCOMP swarm.
It does not replace the mathematical derivation.
It states the finite runtime surfaces that must be present before a deployment can be reviewed as a SPOTCOMP swarm rather than as a signed log replicator or agent harness.

[../../SWARM-FUNCTIONS.md](../../SWARM-FUNCTIONS.md) restates this runtime as compositions of the basic TRC/TDP functions over JSONL EAVT SPOTs: subject-predicate-object cell traces.

## 1. Derivation Direction

A swarm runtime MUST preserve the SPOTCOMP derivation direction:

`aperiodic articulating -> transfinite predicating -> Scott-continuous positing -> finite settling`

Runtime objects are finite witnesses downstream of that chain.
A federation payload, player record, row store, packet, or process record can witness a swarm step only when the profile declares the upstream trace, local-settling, recognition, governance, CGS, and aperiodic/bigraded obligations it preserves or downgrades.

## 2. Swarm Object

A SPOTCOMP swarm runtime is a family of modeled players over a shared federation and settling discipline:

`S = (O, V, r, Players, SharedTrace, Fed, Gov, Settle, Ops)`

where:

- `O` is the observer category;
- `V : O -> Settlings_B` assigns observer-local settlings;
- `r(o)` assigns per-observer rule systems;
- `Players` binds external players, modeled-player identities, and possible character or peer bearers;
- `SharedTrace` is admitted trace evidence, merged by canonical row ID;
- `Fed` is the signed delivery, verification, admission, and merge relation;
- `Gov` is the governance and capability restriction surface;
- `Settle` is the closure/settlement process and its output status;
- `Ops` is the operational witness surface for costs, budgets, procedures, ledgers, and audit.

This object is not just a set of peers.
Public keys, inboxes, and outboxes are finite bearer evidence, not the modeled-player swarm object itself.

## 3. Federation And Admission Loop

The inbound federation loop is:

1. receive a representation;
2. identify the wire profile and object kind;
3. parse under the declared carrier profile;
4. validate exact EAVT row shape or typed resource shape;
5. validate canonical identity preconditions;
6. verify signatures when required;
7. recognize trace axes, source role, and swarm role;
8. apply governance and capability restrictions;
9. apply player-local observation/action bounds when the payload is a move;
10. admit by appending to trace or typed resources;
11. record rejection, quarantine, downgrade, or audit evidence when a gate
    fails.

Signature verification happens before trace merge, but signature validity is not admission.
Parsing is not admission.
Shape validity is not admission.

## 4. Trace Store And Federation State

A swarm runtime MUST expose:

- exact EAVT rows with only `e`, `a`, `v`, and `t`;
- canonical row ID `sha256(jcs(row))`;
- duplicate-name rejection or downgrade path for JSON import;
- append-only local logs;
- G-Set merge by canonical row ID;
- subject/predicate dual filing for admitted rows when using TRC/TDP;
- audit trace for rejection and downgrade rows;
- non-authoritative status for snapshots, indexes, and value-position caches.

JSONL is the local append carrier.
RFC 7464 JSON text sequences are the conservative registered wire stream profile.

## 5. Player-Local Loop

Each modeled player acts from a player-local view:

1. select an observable frontier from inbox, shared trace, resources, and world observations permitted by handedness;
2. project that frontier through recognition and information-to-game observation maps;
3. settle the local view under `V(o)` and `r(o)` to the declared status;
4. evaluate governance, capability, budget, and cost constraints;
5. apply the strategy or record an explicit strategy downgrade;
6. emit candidate output rows, typed resources, packets, or actions;
7. admit outputs through the same local trace and governance discipline;
8. sign or publish federation payloads only after admission.

A swarm runtime MUST NOT require one synchronized global frontier.
Different players may observe different prefixes and settle under different rule systems.

## 6. Modeled-Player State

Each runtime player profile MUST preserve:

- external-player boundary;
- modeled-player identifier;
- observer-local settling `V(o)`;
- per-observer rule system `r(o)`;
- identity authority when applicable;
- capabilities and governance;
- handedness: receive, send, actuate, observe;
- input and output trace references;
- learning transition policy;
- CGS strategy reference or downgrade;
- character/persona/role/skill bearer bindings when applicable.

The runtime MUST keep the represented state separate from transient host process state, hidden model context, or transport session state.

## 7. CGS And Ludic Handoff

A swarm runtime MUST provide enough evidence for CGS review:

- event-structure arena for observations, trace appends, settlements, federation deliveries, governance checks, tool actions, and learning transitions;
- Player/Opponent polarity assignments;
- causality and minimal conflict declarations;
- symmetry classes;
- strategy morphism declaration on `A^perp || B`;
- receptivity and composition obligations or explicit downgrade;
- sequential or innocent restrictions only when declared as restrictions.

Learning or adaptation that changes observation, inference, capability, or action behavior is part of play and must be reviewed under CGS or the relevant ludic boundary.

## 8. Settlement, Projection, And Packets

The runtime MUST distinguish:

- trace evidence;
- local settling trajectory;
- finite settlement status;
- projection morphism;
- packet object;
- wire representation.

SHP packets are finite projection objects from settled frontiers.
Wire representations are serialization, signature, transport, and admission morphisms.
Both are mathematical surfaces.
Neither replaces trace, local settling, or CGS strategy evidence.

## 9. Operations, Governance, And Cost

A swarm runtime MUST expose operational evidence for:

- process, procedure, derivation, and inquiry work types;
- operations-loop stages;
- governance and capability decisions;
- budget scopes, exhaustion policy, and reset/coherence evidence;
- Lawvere-quantale cost composition;
- ledger projections from witness events;
- stationarity and Laplacian handoff claims when used;
- audit and downgrade rows for failed gates.

Reads must not hide settlement cost.
If a read triggers settlement, the runtime records settlement first and read second.

## 10. Bigraded And Aperiodic Swarm Obligations

Strong swarm claims require the bigraded and aperiodic witness surface:

- closure KZ and fibration KZ axes remain separated;
- truth-order and knowledge-order common-knowledge fixed points remain distinct unless a theorem identifies them in scope;
- `H1_t` and `H1_top` audit slots are preserved when relevant;
- consensus and disagreement surfaces are named;
- local settlings are treated as tiles or windows when tiling language is used;
- substitution, patch, direct-limit, MLD, or regime-classification evidence supports aperiodic claims.

Peer count, delivery jitter, asynchronous scheduling, and topology alone are not aperiodic evidence.

## 11. Standards Boundary

IETF/RFC conformance attaches to representations and deployment interfaces after object boundaries are fixed.
A swarm runtime may need:

- RFC 8259 JSON;
- RFC 8785 canonical JSON with RFC 7493/I-JSON preconditions;
- RFC 7464 JSON text sequences;
- RFC 9110 HTTP representation metadata;
- RFC 9457 problem details;
- RFC 8032 Ed25519 signatures;
- RFC 8410 Ed25519 key identifiers through X.
  509/SPKI profiles;
- RFC 6838/RFC 6839 media type and suffix discipline;
- DRIP/UAS RFCs for UAS Remote ID deployments.

DRIP/UAS evidence is identity, lookup, and authentication evidence for that deployment layer.
It does not prove modeled-player, CGS, or aperiodic swarm conformance.

## 12. Declaration Probe

The current declaration probe is:

- [../../schema/swarm-runtime-profile.schema.json](../../schema/swarm-runtime-profile.schema.json);
- [../../examples/swarm-runtime-profile.json](../../examples/swarm-runtime-profile.json);
- [../../src/swarm-runtime-profile.mjs](../../src/swarm-runtime-profile.mjs).

The probe checks declaration shape for:

- aperiodic-to-finite derivation direction;
- swarm object positions `(O, V, r, Players, SharedTrace, Fed, Gov, Settle, Ops)`;
- federation and admission gates;
- trace store and federation state;
- player-local loop;
- modeled-player state;
- CGS/ludic handoff;
- settlement, projection, packet, and wire boundaries;
- operations, governance, cost, audit, and downgrade;
- bigraded and aperiodic obligations;
- IETF/RFC standards boundary;
- non-conformance shortcuts.

It does not validate a live swarm, compute closure, prove cohomology, verify real signatures, execute CGS composition, query DRIP registries, or prove final SPOTCOMP conformance.

## 13. Non-Conformance Cases

A swarm runtime profile is not conformant when:

- it treats signed replication as swarm conformance;
- it treats parse success, row shape, or signature validity as admission;
- it assumes a global synchronized observation frontier;
- it treats keys, inboxes, or outboxes as modeled players;
- it omits `V(o)` or `r(o)` for modeled-player state;
- it emits player actions without governance, capability, observation, settling, and strategy boundaries;
- it treats packets or wire bytes as outside the mathematics;
- it treats packets or wire bytes as the whole mathematics;
- it claims CGS strategy conformance without event-structure and strategy-law evidence;
- it claims aperiodicity without substitution, patch, direct-limit, MLD, or regime-classification evidence;
- it hides learning, costs, budgets, rejections, or downgrades in runtime state.

## 14. Immediate Derivation Work

The next swarm-runtime pass needs:

- exact schema for a live swarm profile over `(O, V, r)`;
- executable admission algorithm tied to recognition and governance;
- duplicate-detecting JSON import implementation;
- subject/predicate dual-filing replay test profile;
- player-local observation and action proof obligations;
- CGS event-structure construction for the runtime loop;
- audit row vocabulary for rejection, quarantine, downgrade, and obstruction;
- examples for trace-only, packet-producing, federating, and modeled-player swarm classes.
