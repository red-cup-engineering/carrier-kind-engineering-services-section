# Trace, Packet, And Transport Rules

Status: candidate implementation rulebook. This file consolidates the
implementation rules that can already be stated for EAVT logs, finite packets,
and transport surfaces.

This is not a replacement for the trace, packet, wire, or federation
sub-specifications. It is the implementer-facing spine that lines them up as
one mathematical surface. These entries name functions/morphisms over the
TRC/TDP cell trace: the JSONL EAVT SPOT, or subject-predicate-object trace.
They are not a demand for separate implementation subsystems.

## 1. Mathematical Placement

SPOTCOMP treats rows, logs, packets, signatures, transports, and admission
records as part of the proof system:

- an EAVT row is a finite event presentation of trace evidence;
- a JSONL EAVT log is the local append carrier by which a SPOT, a
  subject-predicate-object trace, grows in the computer substrate;
- a canonical row ID is the finite identity morphism used for merge;
- an SHP packet is a finite projection object from a settled frontier;
- a signed envelope is a representation plus signature witness;
- a transport exchange is a presentation morphism, not admission by itself;
- receiver admission is the local recognition/restriction morphism that decides
  whether the presentation participates in the receiver's settling.

Packets and transports therefore are part of the mathematics. They also do not
replace the rest of the mathematics: trace axes, TRC/TDP replay, PAM closure,
modeled-player local settling, CGS strategy, and governance remain separate
obligations.

## 2. EAVT Row Rules

TPT-ROW-1. A finite EAVT row has exactly these members:

```json
{"e":"subject","a":"predicate","v":"object-or-value","t":"transaction"}
```

TPT-ROW-2. `e` is the subject/entity coordinate.

TPT-ROW-3. `a` is the predicate/attribute coordinate.

TPT-ROW-4. `v` is the object/value coordinate. It is not a privileged
bilattice field and not an authority anchor for filing.

TPT-ROW-5. `t` is the transaction coordinate.

TPT-ROW-6. No other trace axis may be smuggled into the row as an extra field.
Recognition, causality, provenance, refinement, and evidence trajectory require
declared trace-axis resources or profiles.

TPT-ROW-7. Corrections, denials, withdrawals, and supersessions are new rows.
Rows are not mutated.

## 3. JSONL Log Rules

TPT-LOG-1. JSONL is the local POSIX append carrier: one complete JSON object per
LF-delimited line.

TPT-LOG-2. Empty lines, comments, partial JSON texts, and line-spanning row
objects are not valid EAVT log entries.

TPT-LOG-3. JSONL is not the conservative Internet wire profile. When an
Internet stream needs a registered media type, use RFC 7464 JSON text sequences
with `application/json-seq`.

TPT-LOG-4. Log line number, byte offset, arrival order, array index, file name,
and database primary key are not trace identity.

TPT-LOG-5. A local log may be dually filed at subject and predicate anchors
only when both filings preserve the same canonical row identity.

TPT-LOG-6. Value-position indexes, projections, caches, and snapshots are
non-authoritative unless a separate projection rule says exactly what they
preserve and forget.

## 4. Canonical Identity Rules

TPT-ID-1. The row identity formula is:

`sha256(jcs(row))`

where `jcs(row)` is the RFC 8785 JSON Canonicalization Scheme serialization of
the exact EAVT row.

TPT-ID-2. Strong identity requires duplicate member-name rejection after JSON
escape processing.

TPT-ID-3. Strong identity preserves Unicode strings as supplied and does not
apply hidden normalization.

TPT-ID-4. Strong identity stays inside the JCS/I-JSON number boundary, or
represents larger exact quantities as typed strings.

TPT-ID-5. Object members are sorted recursively by JCS and array order is
preserved.

TPT-ID-6. Rows with the same canonical row ID are the same finite merge event.
Rows with different canonical IDs remain distinct even if a later projection
treats them as equivalent.

## 5. Append And Merge Rules

TPT-MERGE-1. Trace storage is append-only.

TPT-MERGE-2. Merge is G-Set union by canonical row ID.

TPT-MERGE-3. Merge must be commutative, associative, and idempotent over the
canonical row-ID set.

TPT-MERGE-4. Append is monotone: appending a valid row does not retract prior
rows.

TPT-MERGE-5. Rows that fail row shape, canonicalization, recognition, or
admission are rejected, quarantined, downgraded, or recorded as audit evidence.
They are not silently merged as trusted trace evidence.

TPT-MERGE-6. These finite merge laws do not by themselves prove the full
trace-monoid-to-settlement functor.

## 6. Trace Axis Projection Rules

TPT-AXIS-1. A finite EAVT log is a trace carrier only with declared axis
preservation and forgetting.

TPT-AXIS-2. The required trace axes are event record,
temporal/causal precedence, evidence trajectory, recognition fiber,
categorical refinement, and constitutive provenance.

TPT-AXIS-3. Finite row presentations normally forget recognition fiber,
categorical refinement, and constitutive provenance unless those axes are
carried by separately declared resources.

TPT-AXIS-4. A projection must identify its source frontier, output kind,
preserved axes, forgotten axes, and evidence.

## 7. SHP Packet Rules

TPT-PACKET-1. An SHP packet is a finite semantic hypertext packet projected
from a trace frontier or trace family.

TPT-PACKET-2. A packet profile declares source trace, finite frontier,
settlement evidence, projection morphism, packet carrier, and deterministic
monotone projection rule.

TPT-PACKET-3. Structural classes carry morphism or projection identities.

TPT-PACKET-4. `data-*` attributes carry finite source or carrier coordinates.

TPT-PACKET-5. Packet semantics do not require script execution or external
resources.

TPT-PACKET-6. A packet is not the trace, not the TRC/TDP catalog, not a
modeled-player local settling, and not a CGS strategy.

## 8. Wire Representation Rules

TPT-WIRE-1. Wire profiles attach after the SPOTCOMP object boundary is fixed.
HTTP, media types, JSON, signatures, and problem details do not decide that the
mathematical object exists.

TPT-WIRE-2. JSON object profiles use RFC 8259.

TPT-WIRE-3. Canonical JSON profiles use RFC 8785 and its I-JSON boundary.

TPT-WIRE-4. Conservative Internet streams use RFC 7464 JSON text sequences and
`application/json-seq`.

TPT-WIRE-5. SPOTCOMP-specific media type names are candidate-unregistered until
IANA registration exists. Profiles using `+json` declare RFC 6838 and RFC
6839 discipline.

TPT-WIRE-6. HTTP profiles declare `Content-Type` under RFC 9110 and use RFC
9457 problem details for profile-level errors.

## 9. Signature Rules

TPT-SIG-1. Ed25519 signatures use RFC 8032 when that signature profile is
declared.

TPT-SIG-2. X.509/SPKI Ed25519 key profiles declare RFC 8410.

TPT-SIG-3. A self-signing JSON envelope signs the RFC 8785 canonical JSON bytes
of the envelope with the `signature` member removed.

TPT-SIG-4. A stream signature signs canonical item bytes or a manifest of row
IDs. It does not sign raw reserialized sequence bytes as if the sequence had a
canonical JSON representation.

TPT-SIG-5. Signature verification happens before trace merge.

TPT-SIG-6. Signature validity is not receiver admission.

## 10. Admission Rules

TPT-ADM-1. Parsing is not admission.

TPT-ADM-2. Shape validity is not admission.

TPT-ADM-3. Transport receipt is not admission.

TPT-ADM-4. Receiver admission performs, in order, representation recognition,
parse, canonical identity checks, signature checks when required, object-kind
and trace-axis recognition, governance/capability checks, modeled-player bounds
when relevant, regime compatibility, and outcome recording.

TPT-ADM-5. Accepted evidence is appended only after the local admission path
succeeds.

TPT-ADM-6. Failed admission produces rejection, quarantine, downgrade, audit,
or problem-detail evidence. It does not become trusted trace evidence.

## 11. Minimum Function Surface

A candidate implementation that claims coverage of this rulebook must expose
these functions, either directly or as a bundled command whose component
morphisms are declared:

- `parse`;
- `identify`;
- `append`;
- `dual-file`;
- `merge`;
- `replay`;
- `posit`;
- `close`;
- `settle`;
- `project`;
- `read`;
- `transport`;
- `admit`.

The existing declaration-level probe for the wider implementation surface is
[src/implementation-core-profile.mjs](./src/implementation-core-profile.mjs).
It checks the same commitments at profile shape level. It does not replace a
complete JSON parser, JCS implementation, cryptographic library, HTTP stack, or
proof of the open categorical obligations.
