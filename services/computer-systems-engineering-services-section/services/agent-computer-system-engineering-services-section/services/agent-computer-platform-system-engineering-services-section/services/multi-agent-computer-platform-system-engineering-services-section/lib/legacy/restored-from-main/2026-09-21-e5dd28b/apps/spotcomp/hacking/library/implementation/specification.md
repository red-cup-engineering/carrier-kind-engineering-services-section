# Implementation Core Specification

Status: first consolidated skeleton for the implementable SPOTCOMP core.

This file collects what this workspace can already specify about a SPOTCOMP implementation without pretending the open proof obligations are closed.
It is downstream of the categorical derivation, but it is not outside the mathematics.
Files, rows, packets, signatures, transports, and admission gates are representation and restriction morphisms in the same proof system.

[TRACE-PACKET-TRANSPORT.md](../../TRACE-PACKET-TRANSPORT.md) extracts the row/log/packet/wire/admission subset of this specification into a compact implementation rulebook.
[NORMATIVE-FUNCTIONS.md](../../NORMATIVE-FUNCTIONS.md) states the same surface as basic TRC/TDP functions over JSONL EAVT SPOTs: subject-predicate-object cell traces.
[FUNCTION-LAWS.md](../../FUNCTION-LAWS.md) records their implementation laws and standards attachment points.
[OPERATIONAL-MATH-FUNCTIONS.md](../../OPERATIONAL-MATH-FUNCTIONS.md) records the operational mathematical function contracts needed before those carriers can be treated as an executable SPOTCOMP implementation.

## 1. Derivation Direction

The implementation MUST preserve the SPOTCOMP derivation direction:

`aperiodic articulating -> transfinite predicating -> Scott-continuous positing -> finite settling`

Finite rows, files, packets, envelopes, and process records are downstream witnesses.
They are not free-standing replacements for the upstream objects.
An implementation can operate on finite witnesses only when it records which axes are preserved, which axes are forgotten, and which proof obligations remain open.

## 2. Trace Carrier Rules

The finite computer carrier for transactionally located trace evidence is an EAVT row:

```json
{"e":"subject","a":"predicate","v":"object-or-value","t":"transaction"}
```

A conforming core implementation MUST enforce:

- exactly four members: `e`, `a`, `v`, and `t`;
- `e` is the subject/entity coordinate;
- `a` is the predicate/attribute coordinate;
- `v` is the object/value coordinate, not a privileged bilattice field;
- `t` is the transaction coordinate;
- no hidden axis data is added as extra row fields;
- corrections, denials, supersessions, and withdrawals are new rows;
- row identity is independent of local line number, byte offset, arrival order, array index, or database key.

The finite row carrier is part of the mathematics as a presentation of trace evidence.
It is not the whole trace object.
Trace profiles still have to account for event records, temporal/causal precedence, evidence trajectory, recognition fiber, categorical refinement, and constitutive provenance.

## 3. JSONL And Stream Identity

On disk, this workspace uses JSONL as the finite append carrier: one complete JSON object per LF-delimited line.
For strong identity claims, each line MUST be canonicalized item-by-item before row identity, signature-manifest, or merge evidence is accepted.

JSONL is not the conservative Internet wire profile.
When rows are streamed over Internet protocols with existing registered media types, the conservative profile is RFC 7464 JSON text sequences using `application/json-seq`.

Neither JSONL nor JSON text sequences have canonical sequence bytes by default.
Sequence-level signatures therefore require either:

- item canonical bytes; or
- a separately declared manifest of row IDs or item IDs.

## 4. Canonical Row Identity

The canonical row ID is:

`sha256(jcs(row))`

where `jcs(row)` is the RFC 8785 canonical JSON serialization of the exact EAVT row.

A conforming implementation MUST reject or downgrade strong identity claims when it lacks evidence for:

- duplicate-name rejection after JSON escape processing;
- valid Unicode string preservation without hidden normalization;
- finite interoperable JSON number handling under the JCS/I-JSON boundary;
- recursive object-property sorting;
- array-order preservation;
- canonical output without insignificant whitespace.

Rows with the same canonical ID are the same trace event for merge purposes.
Rows with different canonical IDs remain distinct even when a projection later treats them as equivalent.

## 5. Append And Merge

Trace storage is append-only.
Merge is G-Set union by canonical row ID.
A conforming implementation MUST preserve:

- append monotonicity;
- merge commutativity;
- merge associativity;
- merge idempotence;
- rejection or quarantine for rows that fail canonicalization or admission;
- non-authoritative status for indexes, caches, snapshots, and value-position files.

This gives the finite computer substrate a deterministic federation law.
It does not by itself prove the full trace-monoid-to-settlement functor, but it is enough to specify the row store and merge behavior.

## 6. Recognition And Admission

Parsing is not admission.
Shape validity is not admission.
Signature validity is not admission.

Before external evidence enters local play, the receiver MUST perform the declared admission path:

1. identify the representation profile;
2. parse under the relevant RFC or local carrier profile;
3. validate canonical identity preconditions;
4. verify signatures when required;
5. recognize object kind and trace axes;
6. apply governance and capability gates;
7. apply modeled-player observation/action bounds when relevant;
8. append accepted evidence to the local trace or typed resource;
9. record rejection, downgrade, or audit evidence for failed admission.

Admission is a mathematical boundary: it is the local recognition and restriction morphism that determines whether a presentation participates in a receiver's settling.

## 7. TRC/TDP Runtime Surface

A SPOTCOMP implementation is a TRC/TDP when its typed resource catalog is the running theory derivation program.
The implementable core MUST expose:

- one catalog root for local path resolution;
- typed resource schemas;
- trace logs as inhabiting evidence;
- scripts as morphism witnesses when a resource is a morphism;
- co-location of schema/log/script witnesses;
- dual filing of admitted rows at subject and predicate anchors;
- canonical row identity preserved across dual filing;
- replay from trace evidence into working state;
- closure execution to fixed point, prefix, obstruction, downgrade, or declared non-final status.

TDP is not a subsystem beside TRC.
It is the running view of the catalog as an executable proof tree.

## 8. PAM And Closure Surface

PAM supplies the Predicate Algebra Modeling kernel.
The implementation core can already require:

- declared entity set `E`;
- declared predicate category or predicate graph;
- declared value algebra `L`;
- fiber algebra or derived specialization;
- reified message boundary for external mutation;
- event/message replay into geometry;
- monotone rule dispatch;
- witness-producing reads;
- fixed-point, prefix, fuel-bound, or downgrade status.

The implementation MUST NOT treat the finite FOUR profile as the universal value substrate.
FOUR is one finite profile downstream of the general predication-fiber machinery.

## 9. SHP Packet Surface

SHP packets are finite semantic hypertext packets projected from settled trace frontiers.
They are part of the mathematics as finite projection objects.

An implementation producing SHP MUST declare:

- source trace or trace family;
- finite frontier;
- settlement evidence;
- projection morphism;
- packet carrier;
- deterministic monotone projection rule;
- class names as morphism or projection identities;
- `data-*` attributes as carrier coordinates;
- packet safety: no script execution and no required external resources for packet semantics.

An SHP packet does not replace the trace, TRC/TDP catalog, modeled-player local settling, or CGS strategy.
It is the finite packet object in the projection branch.

## 10. Wire And Federation Surface

Wire and federation profiles are part of the mathematics as representation, serialization, signature, transport, and admission morphisms.
They attach after object boundaries are fixed.

The implementable core can already require:

- RFC 8259 JSON for JSON objects;
- RFC 7493/I-JSON and RFC 8785 for canonical JSON profiles;
- RFC 7464 and `application/json-seq` for conservative wire streams;
- RFC 9110 `Content-Type` handling for HTTP;
- RFC 9457 problem details for profile-level HTTP errors;
- RFC 8032 Ed25519 signatures where Ed25519 is declared;
- RFC 8410 when Ed25519 key identifiers use X.
  509/SPKI profiles;
- RFC 6838/RFC 6839 media type and suffix discipline;
- candidate-unregistered status for SPOTCOMP-specific media type names until registration exists.

Signature verification happens before trace merge.
Governance and recognition still happen after signature verification.

## 11. Modeled Player Runtime Surface

A modeled-player runtime MUST keep finite peer records downstream of the modeled-player object.
The implementable core can already require:

- external-player reference or boundary statement;
- modeled-player identifier;
- observer-local settling `V(o)`;
- per-observer rule system `r(o)`;
- identity authority or key material when applicable;
- capabilities and governance;
- handedness: receive, send, actuate, observe;
- input and output trace references;
- player-local partial observation;
- CGS strategy reference or explicit downgrade;
- learning transition policy.

Output rows can witness player action only after attribution, governance, capability, observation, local-settling, and strategy boundaries are preserved.

## 12. Operations Surface

The implementation core can specify operational witnesses for:

- being/doing/working/governing strata;
- process, procedure, derivation, and inquiry work types;
- operations-loop stages;
- process and procedure records;
- ledgers as balanced projections from witness events;
- budgets with scope, exhaustion policy, and reset/coherence evidence;
- Lawvere-quantale cost composition;
- stationarity and Laplacian handoff declarations.

Operational records are substrate content.
They are not external project management notes and not host bookkeeping by themselves.

## 13. Minimum Runtime Components

A minimal implementation profile SHOULD name these components:

- trace parser and row validator;
- duplicate-detecting JSON importer or downgrade path;
- canonical row ID calculator;
- append-only trace store;
- G-Set merge engine;
- envelope signer/verifier;
- admission and recognition gate;
- governance and capability gate;
- TRC/TDP catalog resolver;
- replay and closure executor;
- PAM message/reification interface;
- finite projection engine;
- SHP producer when packets are emitted;
- wire profile handler when network transport is used;
- modeled-player registry over `(O, V, r)`;
- player-local observation/action loop;
- CGS declaration linker;
- learning transition recorder;
- operations ledger/budget/cost recorder;
- audit and downgrade recorder.

Each component may be small, but none may be hidden if its evidence is used for conformance.

## 14. Non-Conformance Cases

An implementation profile is not conformant when:

- it treats row order, file line number, or database ID as trace identity;
- it accepts extra row fields as trace axes;
- it silently discards duplicate JSON names before identity evidence;
- it mutates historical rows in place;
- it merges valid signatures without recognition and governance admission;
- it treats JSONL as an Internet wire standard;
- it treats packets or transport bytes as outside the mathematics;
- it treats packets or transport bytes as the whole mathematics;
- it treats public keys, inboxes, or outboxes as modeled players;
- it claims CGS strategy conformance without event-structure and strategy-law declarations;
- it hides learning, cost, budget, or rejection evidence in runtime state.

## 15. Declaration Probe

The current declaration probe is:

- [../../schema/implementation-core-profile.schema.json](../../schema/implementation-core-profile.schema.json);
- [../../examples/implementation-core-profile.json](../../examples/implementation-core-profile.json);
- [../../src/implementation-core-profile.mjs](../../src/implementation-core-profile.mjs).

The probe checks declaration shape for:

- aperiodic-to-finite derivation direction;
- exact EAVT row carrier rules;
- JSONL item identity and RFC 7464 stream boundary;
- canonical row ID and JCS/I-JSON preconditions;
- append-only and G-Set merge laws;
- recognition and admission gates;
- TRC/TDP replay, PAM closure, SHP packet projection, wire/federation, modeled-player, and operations runtime surfaces;
- minimum runtime component inventory;
- non-conformance boundaries.

It does not implement canonical JSON, inspect live files, execute replay or closure, validate signatures, compute recognition, prove CGS laws, or prove the open derivation obligations.

## 16. Immediate Derivation Work

The next implementation-core pass needs:

- exact schemas for rows, envelopes, manifests, audit records, and downgrade records;
- a duplicate-detecting JSON import implementation profile;
- executable canonicalization test vectors;
- JSONL file append discipline and crash-recovery profile;
- subject/predicate dual-filing replay law;
- admission algorithm tied to recognition and governance profiles;
- packet and wire profile examples that demonstrate their mathematical placement without collapsing them into trace or settlement;
- conformance class names for trace-only, packet-producing, federating, TRC/TDP, and modeled-player swarm runtimes.
