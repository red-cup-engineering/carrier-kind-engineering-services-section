# Operational Mathematical Functions

Status: candidate operational function specification.

This file fills a gap left by the row, schema, and packet specifications. Data
carriers are necessary, but they are not enough to implement SPOTCOMP. A
normative implementation must also expose the mathematical functions that move
from articulation through predication, positing, settling, operation, and
modeled-player play.

This is a function specification, not a new subsystem. The same implementation
may fuse several functions for speed, but conformance evidence must still name
the functions, their inputs, their outputs, and the evidence emitted for each
boundary.

## 1. Shared Parameters

Every function below is relative to an explicit context:

`K = (C, E, Pi, L, A, Rules, Regime, Gov, Ops)`

where:

- `C` is the TRC/TDP catalog/program;
- `E` is the entity set;
- `Pi` is the predicate category;
- `L` is the declared value lattice;
- `A_p = (L x L)^(E x E)` is the predication fiber at predicate `p`;
- `Rules` is the closure-rule program;
- `Regime` is strict, Scott-continuous, transfinite-bounded, or aperiodic;
- `Gov` is the active governance and capability context;
- `Ops` is the active operational cost, budget, ledger, and process context.

Hidden host state is not an implicit parameter. If a function depends on a
cache, environment variable, prompt context, filesystem state, clock, process,
key, network peer, or model output, that dependency must enter through a typed
presentation, bearer witness, or operational record.

## 2. Ingress And Reification

### `articulate`

`articulate(presentation, handler, K) -> utterance | obstruction | rejection`

Places an outside presentation at the articulating boundary. The result is an
utterance-shaped carrier, not trace evidence and not settlement.

Required behavior:

- parse and validate handler-local shape before illocution;
- preserve token-before-claim order when token and claim are present;
- record handler class, source, and validation status;
- reject or obstruct without creating positing evidence when validation fails.

### `reify`

`reify(utterance, model, K) -> message | rejection | downgrade`

Turns an utterance into a reified PAM message with attribution, identity,
payload claim introspection, ordering or ordinal witness, and traceability to
the originating presentation.

Required behavior:

- no direct geometry mutation;
- no direct append into a trusted trace;
- malformed or inadmissible input produces rejection/downgrade evidence.

## 3. Fiber Operations

### `fiber`

`fiber(K, p) -> A_p | fiber-error`

Returns the declared predication fiber for predicate `p`.

Required behavior:

- verify that `p in Pi`;
- verify the declared `L`, `E`, and `A_p = (L x L)^(E x E)` reading;
- reject FOUR-only assumptions unless a boolean finite specialization boundary
  is declared.

### `delta-cell`

`delta-cell(phi, q, K) -> delta_(phi,q)`

Constructs the single-cell update concentrated at `phi = (s, p, o)` with datum
`q in L x L`.

Required behavior:

- verify `s, o in E`;
- verify `p in Pi`;
- verify `q` inhabits the declared value fiber;
- produce the knowledge-bottom value everywhere except the named cell.

### `reindex`

`reindex(f, v, K) -> f*(v) | downgrade`

Applies the predicate-category morphism `f` to a fiber valuation.

Required behavior:

- declare whether `f` is specialization, converse, subject-projection,
  object-projection, or a proved composite;
- preserve pointwise bilattice and residuated operations;
- preserve the datum used by positing while moving the cell coordinate;
- downgrade when the generator action or theorem status is unknown.

### `exists-f` and `forall-f`

`exists-f(f, alpha, K) -> exists_f(alpha) | downgrade`

`forall-f(f, alpha, K) -> forall_f(alpha) | downgrade`

These are the left and right adjoints to `reindex(f, -, K)` in the declared
knowledge and truth orders.

Required behavior:

- state which order is active for the call;
- cite the adjunction law being used;
- preserve the separation between knowledge-order and truth-order adjoints;
- refuse generic fusion-Frobenius claims unless the required theorem is
  supplied.

## 4. Positing

### `posit`

`posit(v, phi, q, K) -> v' | obstruction | downgrade`

Operational definition:

`v' = v join_k delta_(phi,q)`

where `join_k` is the knowledge-order join in the active fiber.

Required behavior:

- call `fiber` and `delta-cell` for the active predicate context;
- be monotone in the knowledge order;
- be the least extension that adds datum `q` at cell `phi`;
- preserve positing naturality:

  `reindex(f, posit(v, phi, q, K), K) =
   posit(reindex(f, v, K), reindex(f, phi, K), q, K)`

  whenever the relevant theorem is available;
- emit only finite event-presentation evidence when a row is needed.

The finite EAVT row is evidence that positing occurred. It is not the whole
positing morphism.

## 5. Trace Operations

### `present-row`

`present-row(positing-event, K) -> row | presentation-error`

Presents a positing or closure event as an exact EAVT row:

`{"e": subject, "a": predicate, "v": object, "t": transaction}`

Required behavior:

- no hidden trace axes as row fields;
- row identity is `sha256(jcs(row))`;
- causal, recognition, provenance, and refinement axes remain trace metadata
  or declared projections, not extra EAVT fields.

### `append-trace`

`append-trace(T, row, K) -> T' | rejection`

Extends a JSONL EAVT SPOT after admission.

Required behavior:

- monotone trace growth;
- idempotence by canonical row ID;
- no destructive correction of historical rows;
- subject and predicate dual filing retain the same row ID.

### `merge-trace`

`merge-trace(T1, T2, K) -> T`

Computes G-Set union over admitted canonical row IDs.

Required behavior:

- commutative, associative, idempotent union;
- no receiver is forced to admit another receiver's rows;
- merge evidence is finite carrier evidence, not final settlement evidence.

## 6. Replay, Closure, And Settlement

### `replay`

`replay(C, frontier, K) -> valuation-state | obstruction`

Interprets an admitted trace frontier through the declared catalog, imports,
types, morphisms, and rules.

Required behavior:

- deterministic under fixed catalog/program context;
- no dependence on hidden working state;
- output is replayed state, not final settlement.

### `delta-pass`

`delta-pass(state, increments, K) -> state'`

Accumulates new evidence by knowledge-order join.

Required behavior:

- monotone evidence accumulation;
- compatible with append/G-Set trace merge;
- no contestation resolution beyond declared knowledge-order join.

### `sigma-pass`

`sigma-pass(state, Rules, K) -> state'`

Applies active closure rules, including contested-cell resolution through the
declared tensor/fusion machinery when applicable.

Required behavior:

- apply only declared closure rules;
- emit new entries only when the rule result differs from current value;
- preserve rule monotonicity and predicate-reindexing naturality or downgrade.

### `close`

`close(state, Rules, K) -> fixed-point | prefix | obstruction | downgrade`

Iterates `delta-pass -> sigma-pass` according to the active regime.

Required behavior:

- strict and finite profiles may stop only with fixed-point evidence;
- Scott-continuous profiles must preserve omega-chain continuity evidence;
- transfinite-bounded profiles must carry ordinal trajectory evidence when an
  endpoint alone is insufficient;
- aperiodic profiles must carry trajectory, tiling, cohomology, or direct-limit
  evidence as declared by the swarm/audit profile;
- bounded fuel without fixed-point evidence returns `prefix` or `downgrade`.

### `settle`

`settle(C, frontier, K) -> settled-frontier | non-final-result`

Operational definition:

`settle(C, frontier, K) = close(replay(C, frontier, K), Rules, K)`

plus the fixed-point, prefix, obstruction, or downgrade evidence needed for the
declared regime.

## 7. Recognition, Governance, And Admission

### `recognize`

`recognize(receiver, candidate, K) -> recognized | unrecognized | downgrade`

Recognizes candidate evidence relative to receiver-local rules, roles,
capabilities, observation/action bounds, and trace axis requirements.

Required behavior:

- shape recognition is not sufficient;
- key identity is not player identity;
- role flags are not recognition cells;
- rejected recognition may produce conflict or audit evidence.

### `govern`

`govern(receiver, candidate, K) -> permitted | forbidden | budgeted | downgrade`

Applies modal restriction, capability fiber, budget, and policy constraints.

Required behavior:

- do not amplify capability by transport receipt;
- represent budget exhaustion as governed transition or rejection;
- cite the governance rule or downgrade.

### `admit`

`admit(receiver, presentation, K) -> accepted-extension | rejection | quarantine | downgrade | audit`

Operational order:

`receive -> parse -> identify -> verify -> recognize -> govern -> append-trace`

Required behavior:

- signature validity, parse success, and row shape are preconditions, not
  admission;
- accepted evidence appends only after receiver-local admission;
- failure paths emit explicit evidence.

## 8. Projection, Read, And Transport

### `project`

`project(source-frontier, projection, K) -> artifact | downgrade`

Produces a finite projection such as an SHP packet, observation view,
governance view, ledger view, or audit object.

Required behavior:

- name source frontier and projection morphism;
- declare preserved and forgotten trace axes;
- remain downstream of settlement or explicitly state non-final status.

### `read`

`read(C, query, K) -> witness | failure`

Returns witness evidence from replayed or settled state.

Required behavior:

- no mutation;
- no hidden settlement;
- if settlement is needed, perform `settle` first and account for its cost.

### `transport`

`transport(artifact, profile, K) -> presentation | transport-error`

Serializes an already typed SPOTCOMP object or projection.

Required behavior:

- bind media type, canonicalization, signature, HTTP, and problem-detail
  profiles when applicable;
- do not turn presentation into truth, admission, or settlement.

## 9. Modeled-Player And CGS Functions

### `observe-o`

`observe-o(o, C_o, T_o, K) -> observation_o | obstruction`

Selects a player-local frontier from admitted trace, local resources, and
world observations.

Required behavior:

- no synchronized global-frontier assumption;
- preserve observation bounds and handedness;
- record forgotten axes when producing a projection.

### `decide-o`

`decide-o(o, V(o), observation_o, strategy_o, K) -> move | downgrade`

Applies a CGS/ludic strategy to settled local observation.

Required behavior:

- require event-structure arena, polarity, causality, conflict, symmetry, and
  strategy morphism evidence;
- reject key, prompt, policy-table, or local loop identity as sufficient
  strategy evidence;
- account for governance, capability, budget, and cost.

### `act-o`

`act-o(o, move, K) -> positing-event | rejection | downgrade`

Turns an admitted modeled-player move into attributed positing evidence.

Required behavior:

- call `posit` rather than write rows directly;
- preserve external-player/modeled-player/character boundaries;
- emit trace evidence through the same admission and append discipline.

### `learn-o`

`learn-o(o, V(o), r(o), evidence, K) -> V'(o), r'(o), transition-evidence`

Changes modeled-player state or rules under declared learning discipline.

Required behavior:

- hidden cache, hidden weights, prompt preference, or retrieval side effect is
  not learning evidence by itself;
- closure-equivalent changes cite equivalence evidence;
- rule changes are regime transitions unless closure-equivalence is proved;
- strategy-relevant learning is CGS/ludic activity or a downgrade.

## 10. Operational Cost And Witness Functions

### `work-event`

`work-event(kind, subject, procedure, K) -> work-record | rejection`

Creates an operational work record before work changes settlement, governance,
budget, or modeled-player state.

Required behavior:

- `kind` is process, procedure, derivation, or inquiry;
- the record names preconditions, actor, procedure/process, and expected
  witnesses;
- host scripts are only operating projections of declared procedures.

### `budget-check`

`budget-check(resource, scope, amount, K) -> available | exhausted | downgrade`

Checks resource bounds before costful settlement, admission, transport, or
modeled-player action.

Required behavior:

- budget exhaustion is governed evidence;
- reset/coherence policy is declared;
- reads remain quantale-unit only when they do not trigger settlement.

### `cost-compose`

`cost-compose(path, costs, K) -> total-cost | downgrade`

Composes operation costs in the declared Lawvere quantale.

Required behavior:

- serial paths compose by the quantale tensor or distance addition;
- alternatives and parallel branches combine by declared join;
- settlement cost cannot be hidden inside reads.

### `ledger-project`

`ledger-project(witness, K) -> balanced-postings | downgrade`

Projects operational witnesses into ledger postings.

Required behavior:

- debit and credit postings balance per commodity;
- each posting cites the originating witness;
- ledgers remain projections, not the source of operational truth.

## 11. Minimal Operational Trace Evidence

A reviewable implementation needs trace or audit evidence for these operations:

- articulation/reification result;
- fiber and value-context selection;
- reindexing theorem or downgrade;
- positing operation and finite row presentation;
- append, dual filing, merge, and replay context;
- delta pass, sigma pass, fixed point, prefix, obstruction, or downgrade;
- recognition, governance, and admission decision;
- projection/read/transport boundary;
- modeled-player observation, decision, action, and learning transition;
- work event, budget check, cost composition, and ledger projection.

Without this evidence, an implementation may be useful code, but it is not yet
reviewable as a normative SPOTCOMP implementation.

## 12. Math Gap Lookup Queue

The next implementation-driven math lookups should be explicit:

| Gap | Needed For | Current Lookup Surface |
| --- | --- | --- |
| General `L` datum schema and non-FOUR values | `fiber`, `delta-cell`, `posit` | [PREDICATION-FIBER-ALGEBRA.md](./PREDICATION-FIBER-ALGEBRA.md), active predication-fiber algebra notes |
| Reindexing direction and adjoints for every generator | `reindex`, `exists-f`, `forall-f`, positing naturality | [PREDICATION-FIBER-QUANTIFIERS.md](./PREDICATION-FIBER-QUANTIFIERS.md), predication-fiber-functor and hyperdoctrine lab notes |
| Predicate-generator exhaustiveness | legal primitive/derived PAM instructions | [PREDICATION-FIBER-ALGEBRA.md](./PREDICATION-FIBER-ALGEBRA.md), predicate-generator-exhaustiveness archive notes |
| Closure 2-monad computation evidence | `close`, `settle`, replay correctness | [CLOSURE-SETTLING.md](./CLOSURE-SETTLING.md), closure-2-monad and settling-endofunctor lab notes |
| Trace-monoid normal forms and independence inference | order-independent settlement and CRDT convergence | [TRACE-MONOID-SETTLEMENT.md](./TRACE-MONOID-SETTLEMENT.md), trace-monoid lab notes |
| Recognition-cell settlement | `recognize` and receiver admission | [RECOGNITION.md](./RECOGNITION.md), recognition-fiber/proof-engine notes |
| Governance as modal restriction/capability fiber | `govern`, `budget-check`, admission and player action | [GOVERNANCE.md](./GOVERNANCE.md), governance/capability lab notes |
| CGS arena and strategy construction from traces | `observe-o`, `decide-o`, `act-o` | [CGS-EMBEDDING.md](./CGS-EMBEDDING.md), [CGS-STRATEGY-LAWS.md](./CGS-STRATEGY-LAWS.md), event-structure/arena lab notes |
| Learning as closure-equivalent or regime transition | `learn-o` | [CONTINUOUS-LEARNING.md](./CONTINUOUS-LEARNING.md), modeled-player dynamics notes |
| Lawvere cost, stationarity, and Laplacianization | `cost-compose`, `ledger-project`, operations loop | [library/operations/specification.md](./library/operations/specification.md), [MODULI-DESCENT-LAPLACIAN.md](./MODULI-DESCENT-LAPLACIAN.md) |
