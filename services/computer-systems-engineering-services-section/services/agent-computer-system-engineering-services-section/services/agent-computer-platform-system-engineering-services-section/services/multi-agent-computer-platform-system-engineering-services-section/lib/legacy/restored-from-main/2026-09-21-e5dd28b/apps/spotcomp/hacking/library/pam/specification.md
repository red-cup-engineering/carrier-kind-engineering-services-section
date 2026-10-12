# PAM Specification

Status: first normative skeleton for the SPOTCOMP sub-specification family.

PAM stands for **Predicate Algebra Modeling**.
In the handrolled SPOTCOMP specification it is the CPU view of SPOTCOMP: the instruction-set layer whose cell-level generators operate over subject-predicate-object predication.

This file is not a complete implementation standard.
It fixes the shape that a later full PAM specification must satisfy.

## 1. Position In SPOTCOMP

SPOTCOMP expands in this workspace as Subject-Predicate-Object Trace Computer Operating Modeled-Players.
PAM occupies the predication-modeling part of that stack.
It is below modeled-player strategy, federation, SHP projection, and operational resource catalogs, and above the abstract predication-fiber algebra.

PAM is not a database API, a task system, or a policy engine.
Those can be encoded as substrate content or exposed through operating projections, but the PAM kernel is the algebraic model and settlement machinery.

## 2. Mathematical Parameters

A conforming PAM profile MUST declare:

- entity object set `E`;
- predicate category or predicate graph `Pi`;
- value algebra `L`;
- per-predicate fiber algebra `A_p = (L x L)^(E x E)` or an explicitly derived specialization;
- knowledge and truth preorders, when the profile uses bilattice readings;
- supported morphism declarations;
- closure or settlement operator;
- input reification discipline;
- read/witness discipline.

The handrolled finite profile derives FOUR as the minimal adequate value algebra for multi-agent predicating.
In this workspace that result is treated as a finite profile of the more general predication-fiber machinery.
A SPOTCOMP PAM specification MUST NOT treat the finite FOUR profile as the universal value substrate.

## 3. Cell And Claim Model

A PAM cell is a subject-predicate-object position:

`(s, p, o) in E x Pi x E`

A claim adds a value at that position.
The value MAY be a finite boolean settlement class in a finite profile, but the profile MUST state the active value algebra and projection boundary.

PAM implementations MUST preserve the distinction between:

- cell position `(s, p, o)`;
- value in the declared algebra;
- event or trace row that introduced evidence;
- settled fiber state after closure;
- witness returned to a caller.

## 4. Instruction Surface

The handrolled SPOTCOMP specification names four cell-level instruction classes and proves them complete under the stated equivariance hypothesis:

- specialization: from `(s, p_specific, o)` to `(s, p_general, o)`;
- converse: from `(s, p_forward, o)` to `(o, p_reverse, s)`;
- subject projection: from `(s, p_binary, o)` to `(s, p_unary, s)`;
- object projection: from `(s, p_binary, o)` to `(o, p_unary, o)`.

The older predication-algebra package also names specialization, inversion, composition, fusion, implication, and constraint detection.
A full PAM specification MUST reconcile these vocabularies by deriving each instruction surface from the predicate category, fiber algebra, and residuated operations, then declaring whether it is primitive, derived, restricted, or an alias.

Unknown instruction status blocks strong PAM conformance.

## 5. Message And Reification Boundary

Every external input to PAM MUST enter as a reified message.
The prior runtime documents `message(model, claim)`, `messageBatch(geometry, reified)`, and `reify()` as the public discipline, with bare assertion internal to the wavefront.

A PAM message boundary MUST preserve:

- sender attribution;
- message identity;
- payload claim introspection;
- traceability from derived cells to originating message evidence;
- event ordering or ordinal evidence sufficient for replay;
- rejection evidence for malformed or inadmissible inputs.

Direct external calls that mutate geometry without reification are not PAM conformant.

## 6. Settlement And Wavefront

PAM settlement is the closure-wavefront behavior that applies declared morphism rules to claims until the profile's fixed-point condition is reached or a declared partial/fuel boundary is encountered.

A conforming PAM profile MUST state:

- initial geometry construction;
- rule dispatch criteria;
- monotonicity obligations;
- conflict or inconsistency representation;
- fixed-point condition;
- partial-settlement downgrade rule;
- relationship to the SPOTCOMP closure/settling operator.

When the profile claims order-independent settlement, it MUST also cite the trace-monoid and closure-merge obligations in [../../TRACE-MONOID-SETTLEMENT.md](../../TRACE-MONOID-SETTLEMENT.md).

## 7. Reads And Witnesses

PAM reads are witnesses over settled geometry.
They are not imperative decision-driving queries inside reducers or event translators.

Permitted read shapes:

- response/output walks at an I/O surface after message settlement;
- internal walks that implement the read primitive itself.

All other reads are out of bounds for the PAM kernel.
If behavior needs a conditional, the condition belongs in substrate content as predication and morphism declarations, not as host-language branching over hidden model state.

The witness is the answer.
Projection to a scalar label, status string, or UI summary is an output projection of the witness, not the PAM result itself.

## 8. Event Log And Replay

The prior PAM runtime treats the event log as source of truth and working geometry as replay artifact.
A SPOTCOMP PAM profile MUST preserve that direction:

`events/messages -> replay -> geometry -> witness/projection`

Snapshots, indexes, and caches are acceleration structures.
They are not authoritative unless separately derived as trace-preserving projections.

Retraction, supersession, or elision MUST be represented at the event or trace layer and replayed into geometry.
PAM MUST NOT rely on destructive in-place mutation as mathematical evidence.

## 9. Boundary To Other SPOTCOMP Views

The handrolled specification names six co-present views:

- PAM: Predicate Algebra Modeling, the CPU/instruction-set view;
- TDP/TRC: Theory Derivation Program and Typed Resource Catalog, one on-disk closure-rule program and resource-memory view;
- MAS: Messaging Agentic Swarm, the legacy networking view;
- SHP: Semantic Hypertext Packet, the language/packet view;
- SPOTCOMP: the whole computer in which all views are co-present.

PAM MUST expose enough evidence for these adjacent specifications, but it MUST NOT absorb their responsibilities into the kernel.

## 10. Conformance Classes

Draft PAM conformance classes:

- `pam-finite-profile`: declares finite value algebra, finite settlement, and finite instruction set.
- `pam-scott-profile`: declares Scott-continuous trace/fiber behavior and continuity evidence.
- `pam-transfinite-profile`: declares transfinite closure ordinal behavior.
- `pam-aperiodic-profile`: declares aperiodic predication-category behavior and compatible witness invariants.

Every class MUST still satisfy the message/reification, witness, settlement, and event-replay boundaries above.

## 11. Immediate Derivation Work

The next PAM specification pass needs:

- reconciliation of four cell-level instruction classes with the older five algebra morphism classes;
- profile-parametric replacement of finite FOUR assumptions;
- exact relation between PAM wavefront, TRC/TDP closure rules, and SPOTCOMP closure/settling;
- typed message/reification schema aligned with EAVT trace rows;
- event-log replay law aligned with trace-monoid settlement;
- witness-object schema;
- proof that output walks are projections rather than hidden kernel queries.
