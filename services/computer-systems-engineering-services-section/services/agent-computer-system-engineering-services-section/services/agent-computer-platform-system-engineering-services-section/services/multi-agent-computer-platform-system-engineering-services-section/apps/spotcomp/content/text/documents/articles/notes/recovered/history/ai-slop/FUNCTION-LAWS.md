# Basic Function Laws

Status: candidate law sheet for implementation-facing SPOTCOMP functions.

[NORMATIVE-FUNCTIONS.md](./NORMATIVE-FUNCTIONS.md) names the basic functions.
This file records the minimum laws those functions must preserve before an
implementation can claim that it is operating a TRC/TDP over JSONL
EAVT SPOTs: subject-predicate-object cell traces.

The laws are intentionally stated as function contracts. They are not a new
subsystem and not a separate profile layer.

## 1. Shared Objects

Let:

- `C` be a TRC/TDP catalog/program;
- `T` be a JSONL EAVT SPOT, meaning a subject-predicate-object cell trace;
- `r` be an exact EAVT row;
- `id(r)` be `sha256(jcs(r))`;
- `F` be a finite trace frontier;
- `S` be replayed state;
- `Cl` be the active closure operator;
- `P` be a declared projection;
- `R` be a receiver with recognition, governance, and rule-system context.

Every function below is relative to declared catalog version, import set,
schema set, closure-rule set, and regime. Hidden mutable host state is never an
unstated parameter.

## 2. Parse Laws

`parse(bytes) -> row | parse-error`

Required laws:

- Soundness: if `parse(bytes) = r`, then `r` has exactly `e`, `a`, `v`, and
  `t`.
- Line locality: for local JSONL, one LF-delimited line contributes at most one
  row.
- Axis separation: parse never invents recognition, causality, provenance,
  refinement, or evidence-trajectory axes as row fields.
- Non-admission: parse success does not imply `admit`.

Failure behavior:

- malformed JSON, duplicate names without duplicate-detecting evidence, extra
  row fields, empty lines, comments, and line-spanning local rows produce
  `parse-error` or downgrade evidence.

## 3. Identity Laws

`identify(row) -> row-id | identity-error`

Required laws:

- Formula: `id(r) = sha256(jcs(r))`.
- Determinism: equal exact rows have equal IDs.
- Presentation invariance: object member order does not change ID.
- Content sensitivity: different exact rows have different identity claims
  unless SHA-256 collision handling is explicitly invoked as a cryptographic
  failure.
- Location independence: line number, byte offset, arrival order, file path,
  and database key do not affect ID.

Preconditions:

- RFC 8785 JCS input conditions;
- duplicate member-name rejection after escape processing;
- Unicode preservation without hidden normalization;
- finite JSON number handling or typed string representation for larger exact
  quantities.

## 4. Append And Dual-Filing Laws

`append(C, r) -> C'`

`dual-file(C, r) -> C'`

Required append laws:

- Monotonicity: `Rows(C) subset Rows(append(C, r))`.
- Non-mutation: existing rows are not edited or deleted.
- Idempotence by identity: appending an already present `id(r)` does not create
  a second authoritative trace event.
- Admission precondition: trusted append requires prior local admission.

Required dual-filing laws:

- Subject filing: `r` appears at the subject anchor determined by `e`.
- Predicate filing: `r` appears at the predicate anchor determined by `a`.
- Identity preservation: both filings carry the same `id(r)`.
- Value non-authority: `v` may feed indexes or projections but is not an
  authoritative filing root.

## 5. Merge Laws

`merge(T1, T2) -> T`

Trace merge is join in the finite G-Set of canonical row IDs.

Required laws:

- Commutativity: `merge(T1, T2) = merge(T2, T1)`.
- Associativity: `merge(merge(T1, T2), T3) = merge(T1, merge(T2, T3))`.
- Idempotence: `merge(T, T) = T`.
- Identity: `merge(T, empty) = T`.
- Append relation: `append(T, r) = merge(T, singleton(r))` after admission and
  canonical identity.

Boundary:

- These are finite carrier laws. They do not prove closure convergence,
  recognition settlement, or final truth.

## 6. Replay Laws

`replay(C, F) -> S`

Required laws:

- Catalog relativity: replay is defined only relative to a declared catalog,
  imports, schemas, morphisms, rules, and frontier.
- Determinism under fixed context: same `C` and same `F` produce the same
  replayed state or the same explicit obstruction.
- Trace authority: replayed state is not authoritative apart from the trace and
  declared rules that produced it.
- Prefix monotonicity: extending a frontier cannot erase prior trace evidence,
  though it may change derived projections or settlements by adding later
  evidence.

Boundary:

- Replay is not closure by itself. It prepares the state on which closure acts.

## 7. Positing Laws

`posit(S, cell, datum) -> S'`

Required laws:

- Cell typing: `cell` has subject, predicate, and object/value positions under
  the active predication context.
- Datum preservation: predicate reindexing moves cell position while preserving
  the datum in the sense required by positing naturality.
- Fiber locality: the update lands in the declared predicate fiber.
- Event presentation: any emitted row is finite evidence of the positing, not
  the whole positing morphism.

Naturality obligation:

`f*(posit_(phi,q)(v)) = posit_(f*(phi),q)(f*(v))`

for declared predicate morphisms where the relevant theorem or downgrade is
available.

## 8. Close And Settle Laws

`close(C, S, Rules) -> fixed-point | prefix | obstruction | downgrade`

`settle(C, F, Rules) -> settled-frontier | non-final-result`

Required closure laws:

- Monotonicity: closure does not retract knowledge-order evidence.
- Inflationary unit: `S <= Cl(S)` in the declared order.
- Idempotence at fixed point: if `Cl(S) = S`, further closure does not change
  the result.
- Regime declaration: strict, Scott-continuous, transfinite-bounded, and
  aperiodic behavior are not interchangeable.

Required settlement laws:

- `settle(C, F, Rules)` is `close(C, replay(C, F), Rules)` plus fixed-point,
  prefix, obstruction, or downgrade evidence.
- A bounded prefix is not final settlement without fixed-point evidence.
- FOUR-valued finite settlement is a projection or specialization, not the
  universal substrate.

## 9. Projection And Read Laws

`project(settled-frontier, P) -> artifact`

`read(C, query) -> witness`

Required projection laws:

- Source declaration: projection names its source frontier.
- Rule declaration: projection names the projection morphism or rule.
- Axis declaration: projection says which trace axes it preserves and forgets.
- Monotonicity: a projection that claims monotonicity must preserve the stated
  order under frontier extension.
- Non-substitution: the artifact is not the trace, not the catalog, not a
  modeled player, and not a CGS strategy.

Required read laws:

- Witness output: reads return witness evidence or explicit failure.
- Non-mutation: reads do not append trace rows.
- Cost boundary: reads do not consume settlement fuel unless the operations
  profile declares a costed read-as-work rule.

## 10. Transport And Admission Laws

`transport(artifact, profile) -> presentation`

`admit(R, presentation) -> accepted-extension | rejection | downgrade | quarantine | audit`

Required transport laws:

- Object-first: transport serializes an already typed object or projection.
- Profile binding: media type, representation, canonicalization, signature, and
  error format are declared by profile.
- Non-admission: transport receipt does not imply receiver admission.

Required admission laws:

- Receiver relativity: admission is relative to receiver recognition,
  governance, capability, observation/action bounds, and regime compatibility.
- Signature-before-merge: when signatures are declared, verification occurs
  before trusted merge.
- Admission-before-append: accepted evidence appends only after local admission.
- Failure evidence: rejection, downgrade, quarantine, audit, and problem-detail
  outcomes are explicit evidence, not silent host errors.

## 11. Standards Attachment

Standards attach to functions rather than replacing them:

| Function | Standards Surface |
| --- | --- |
| `parse` | RFC 8259 JSON; local JSONL line discipline; RFC 7464 for Internet JSON text sequences |
| `identify` | RFC 8785 JCS and the I-JSON boundary used by JCS |
| `transport` | RFC 6838/RFC 6839 media type discipline, RFC 9110 HTTP representation metadata, RFC 9457 problem details |
| `admit` | RFC 8032 Ed25519 when declared; RFC 8410 when Ed25519 keys use X.509/SPKI profiles |

JSONL remains an on-disk carrier discipline. It is not an IETF wire standard.

## 12. Composition Laws

The standard external-ingress path is:

`parse -> identify -> admit -> append -> dual-file -> replay -> close/settle`

The standard local-positing path is:

`posit -> append -> dual-file -> replay -> close/settle`

The standard publication path is:

`settle -> project -> transport`

An implementation may fuse functions internally only when the fused command is
extensionally equal to the declared composition at the level of trace evidence,
canonical identity, replay context, closure status, projection evidence, and
admission outcome.

## 13. Implementation Evidence

A normative implementation needs evidence for each law class:

- parser behavior and duplicate-name policy;
- canonicalization and row-ID calculation;
- append-only persistence and dual-filing;
- merge by row-ID set union;
- replay context identity;
- positing naturality or declared downgrade;
- closure fixed-point or prefix evidence;
- projection source and forgotten-axis declaration;
- transport profile and RFC bindings;
- receiver admission outcome evidence.

Missing evidence does not necessarily make a local experiment useless, but it
blocks a claim of normative SPOTCOMP implementation conformance.
