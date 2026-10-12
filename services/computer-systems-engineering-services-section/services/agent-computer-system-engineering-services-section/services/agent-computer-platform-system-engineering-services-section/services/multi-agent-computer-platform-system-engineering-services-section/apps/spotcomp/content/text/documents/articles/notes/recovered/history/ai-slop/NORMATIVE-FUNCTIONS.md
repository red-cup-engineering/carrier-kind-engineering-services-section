# Normative Function Surface

Status: candidate normative function surface for basic SPOTCOMP operations.

SPOTCOMP is a TRC/TDP: the typed resource catalog is the running theory
derivation program. A local implementation is not a pile of services around a
trace format. It is a catalog/program whose basic operations are categorical
functions over subject-predicate-object predication cells and their traces.

This file states those functions in implementation-facing language without
turning each one into a separate subsystem.

The companion law sheet is [FUNCTION-LAWS.md](./FUNCTION-LAWS.md). It states
the algebraic and pre/postcondition laws these functions must preserve.
[OPERATIONAL-MATH-FUNCTIONS.md](./OPERATIONAL-MATH-FUNCTIONS.md) gives the
more detailed mathematical operation contracts behind these implementation
functions.

## 1. Carrier

An EAVT JSONL log is the local finite carrier for a SPOT:
subject-predicate-object trace. In this document, "cell trace" means this
subject-predicate-object trace carrier, not a separate trace kind.

Each row is one transactionally located predication-cell event:

```json
{"e":"subject","a":"predicate","v":"object","t":"transaction"}
```

The row reads as:

- `e`: subject/entity position;
- `a`: predicate/attribute position;
- `v`: object/value position;
- `t`: transaction or occurrence position.

The JSONL file is not a generic event stream. In SPOTCOMP it is the local
computer carrier for the SPOT: the trace of subject-predicate-object
predication cells. Every higher operation below is a function on that carrier,
a projection of it, or an admission/restriction into it.

## 2. Catalog/Program Object

Let `C` be a local TRC/TDP catalog. `C` contains typed resources, schemas,
logs, scripts, import aliases, path identities, and closure rules.

The basic implementation state is not just a database:

`C = (Root, Types, Logs, Morphisms, Imports, Rules, State)`

where:

- `Root` is the catalog root and path-category base;
- `Types` are resource schemas/propositions;
- `Logs` are JSONL EAVT SPOTs, meaning subject-predicate-object cell traces;
- `Morphisms` are declared scripts or functions with type witnesses;
- `Imports` bind canonical script/schema identities;
- `Rules` are closure rules;
- `State` is replayed working state, never the authority over the trace.

The trace is authoritative. `State` is a replay/cache/projection of trace under
declared rules.

## 3. Basic Functions

### `parse`

`parse(bytes) -> row | parse-error`

Parses one local JSONL line or one received JSON object. It returns a candidate
row only if the value is exactly an EAVT row. Parse success is not admission.

Normative requirements:

- exactly `e`, `a`, `v`, and `t`;
- one JSON object per JSONL line for local logs;
- no hidden trace axes as row fields;
- no row mutation.

### `identify`

`identify(row) -> row-id | identity-error`

Computes finite row identity:

`row-id = sha256(jcs(row))`

using RFC 8785 JCS over the exact row. This is the merge identity and dual
filing identity. Line number, byte offset, arrival order, and database key are
not identity.

### `append`

`append(C, row) -> C' | append-error`

Adds an admitted row to the relevant local JSONL trace. Append is monotone:
existing trace evidence is not retracted. Corrections, denials, withdrawals,
and supersessions are expressed as later rows.

`append` is not generic mutation. It is the finite trace-growth function for a
predication-cell trace.

### `dual-file`

`dual-file(C, row) -> C'`

Files the same admitted row at the subject and predicate anchors required by
the TRC/TDP path layout. Both filings preserve the same canonical row ID.

The `v` coordinate does not become an authoritative filing anchor. Value
indexes are caches or projections unless separately derived.

### `merge`

`merge(T1, T2) -> T`

Merges two admitted traces by G-Set union over canonical row IDs.

Normative laws:

- commutative;
- associative;
- idempotent;
- monotone.

This is enough to specify finite trace federation at the row carrier. It does
not by itself prove final settlement.

### `replay`

`replay(C, frontier) -> state`

Replays a trace frontier through the typed catalog/program into working state.
Replay interprets rows as predication-cell events under the active resource
types and morphism declarations.

Replay is deterministic only relative to a declared catalog version, import
set, rule set, and frontier.

### `posit`

`posit(state, cell, datum) -> state'`

Adds a predication datum at a cell position under the active predication
fibration. It is not merely "write this row." The row is the finite event
presentation; positing is the categorical update that preserves predicate
fiber, reindexing, and datum obligations.

### `close`

`close(C, state, rules) -> fixed-point | prefix | obstruction | downgrade`

Runs the TDP closure-rule program. A final result requires fixed-point evidence
for the active regime. Bounded fuel returns a prefix unless fixed-point
evidence is present.

### `settle`

`settle(C, frontier, rules) -> settled-frontier | non-final-result`

Settles a trace frontier by replaying and closing it. This is the core TDP
execution function: the program is the closure-rule set, and the execution log
is the trace.

### `project`

`project(settled-frontier, projection) -> artifact`

Produces a finite projection, such as an SHP packet, governance view, ledger
view, player-local observation, or audit artifact.

Projection is a categorical function with declared source frontier, rule,
preserved axes, forgotten axes, and target carrier. It is not the trace itself.

### `read`

`read(C, query) -> witness`

Reads produce witnesses from a replayed or settled frontier. Reads do not
mutate trace and do not consume settlement fuel unless the active operations
profile explicitly declares a costed read-as-work rule.

### `transport`

`transport(artifact, profile) -> presentation`

Serializes an already typed SPOTCOMP object or projection for a transport
surface. JSON, RFC 7464 JSON text sequences, HTTP, signatures, and problem
details attach here.

Transport is a presentation function. It does not decide admission and does
not make the transported object true.

### `admit`

`admit(receiver, presentation) -> accepted-extension | rejection | downgrade | quarantine | audit`

Restricts an external presentation into a receiver's local TRC/TDP. The
receiver checks representation, parse, canonical identity, signature when
declared, recognition, governance, capability, observation/action bounds, and
regime compatibility before append.

Admission is receiver-relative. Signature validity and parse success are
preconditions, not settlement.

## 4. Function Composition

A compact runtime command may bundle these functions, but the normative shape
is still the composition:

`parse -> identify -> admit -> append/dual-file -> replay -> close/settle -> project -> transport`

or, for a local already-admitted operation:

`posit -> append/dual-file -> replay -> close/settle -> project`

The implementation may fuse steps for performance only when it preserves the
same trace, row identity, replay, closure, projection, and admission evidence.

## 5. Standards Attachment

IETF/RFC obligations attach at specific functions:

- `parse`: RFC 8259 JSON; local JSONL line discipline; RFC 7464 for JSON text
  sequences on Internet streams;
- `identify`: RFC 8785 JCS and the I-JSON boundary cited by JCS;
- `transport`: RFC 9110 for HTTP `Content-Type`, RFC 9457 for problem
  details, RFC 6838/RFC 6839 for media types and `+json` suffixes;
- `admit`: signature verification before merge; Ed25519 uses RFC 8032 and
  X.509/SPKI Ed25519 key profiles use RFC 8410.

JSONL itself is local on-disk discipline, not an IETF wire standard.

## 6. Non-Conformance Shortcuts

An implementation is not conformant when it:

- treats JSONL as a generic event log rather than a SPO cell trace carrier;
- treats row append as context-free assertion;
- uses line number, byte offset, arrival order, or database key as trace
  identity;
- mutates historical rows;
- treats parse success, schema success, signature validity, or transport
  receipt as admission;
- treats packets or wire payloads as the whole mathematical object;
- reports bounded closure prefixes as final settlement;
- separates TRC from TDP as if catalog and running derivation program were
  different implementation objects.

## 7. Relation To Other Files

[TRACE-PACKET-TRANSPORT.md](./TRACE-PACKET-TRANSPORT.md) gives the carrier and
IETF-facing rules in more detail. This file gives the smaller function view:
the same rules expressed as SPOTCOMP operations over the TRC/TDP cell trace.

[library/trc-tdp/specification.md](./library/trc-tdp/specification.md) owns the
catalog/program object. [TRACE-AXES.md](./TRACE-AXES.md) owns the richer trace
axes. [PREDICATION-FIBER-ALGEBRA.md](./PREDICATION-FIBER-ALGEBRA.md) and
[PREDICATION-FIBER-QUANTIFIERS.md](./PREDICATION-FIBER-QUANTIFIERS.md) own the
fiber and reindexing mathematics behind `posit`. [CLOSURE-SETTLING.md](./CLOSURE-SETTLING.md)
owns fixed-point settlement.
