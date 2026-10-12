# SHP Specification

Status: first normative skeleton for the Semantic Hypertext Packet sub-specification.

SHP stands for **Semantic Hypertext Packet**.
It is the finite hypertext packet surface of SPOTCOMP.
It is a packet projection from a settled trace frontier, not the trace itself and not the typed resource catalog.

## 1. Position In SPOTCOMP

The derivation direction is:

`aperiodic articulating -> transfinite predicating -> Scott-continuous positing -> finite settling`

SHP appears after finite settlement.
It presents a finite, inspectable packet whose structure can be read by people and machines.
The packet projection is part of the mathematics as a finite restriction/projection morphism.
It MUST NOT be used as the upstream trace object, the source predication object, the TRC/TDP catalog, or the modeled-player object.

SHP is a sibling of TRC/TDP under SPOTCOMP.
A TRC/TDP resource may store or produce an SHP packet, but that storage relationship does not make SHP a catalog-local data model.

## 2. Packet Object

An SHP object MUST declare:

- source trace or trace family;
- finite frontier;
- finite settlement evidence;
- projection morphism;
- packet carrier;
- projection evidence;
- packet identity or content-addressing policy when used on a wire.

The projection MUST be deterministic for a fixed frontier and projection rule set.
The projection MUST be monotone: later evidence can produce a later packet, but cannot mutate the historical packet witness in place.

## 3. Hypertext Carrier

The current carrier is an HTML document.
A conforming SHP packet MUST declare:

- UTF-8 character encoding;
- structural element roles;
- class names as morphism or projection identities;
- `data-*` attributes as input-carrier or frontier coordinates;
- nested element content as output carrier structure;
- no executable scripts required for inspection;
- no required external resources for packet semantics.

Class values are structural names.
Styling may use them, but styling does not define them.

## 4. RFC 7992 Inhabitant Profile

RFC 7992 is the current concrete inhabitant profile for RFC-shaped SHP packets.
It is not the definition of SHP.
It supplies a standards-backed HTML shape with structural classes such as `bcp14`, `xref`, `eref`, `relref`, `selfRef`, `artwork`, and `sourcecode`.

A profile claiming the RFC 7992 inhabitant surface MUST preserve the RFC 7992 document constraints and the stricter SHP packet-safety rule against script execution during inspection.

## 5. Trace Linkage

An SHP packet SHOULD link back to:

- source trace or trace family;
- frontier identity;
- projection rule set;
- modeled player, process, or resource that produced the packet;
- canonical identity evidence when the packet is signed, hashed, or transported.

This linkage may be expressed as trace rows, packet metadata, embedded JSON, or a separately signed manifest.
Signed or hashed JSON metadata MUST use the wire/canonicalization profile owned by the wire-federation sub-spec.

## 6. Boundary To Other Sub-Specifications

PAM owns the predication and settlement kernel.
TRC/TDP owns typed resources, logs, scripts, path identity, and replay.
Wire/federation owns serialization, media types, HTTP, signatures, and transport errors.
Operations owns process and budget evidence.
Modeled-player and CGS own player-model and strategy behavior.

SHP consumes evidence from those layers.
It does not define them.

## 7. Declaration Probe

The current declaration probe is:

- [../../SHP.md](../../SHP.md);
- [../../schema/shp-profile.schema.json](../../schema/shp-profile.schema.json);
- [../../examples/shp-profile.json](../../examples/shp-profile.json);
- [../../src/shp-profile.mjs](../../src/shp-profile.mjs).

The probe checks finite packet object declarations, frontier and settlement evidence, deterministic monotone projection, class-as-morphism identity, `data-*` carrier coordinates, RFC 7992 inhabitant constraints, and packet safety.

It does not prove the SHP object derivation, perform full HTML validation, prove parser safety, or decide projection-morphism placement.

## 8. Non-Conformance Cases

An SHP profile is not conformant when:

- it treats an SHP packet as the trace object;
- it treats the packet as the TRC/TDP catalog;
- it lacks finite frontier and finite settlement evidence;
- it uses class names only as styling hints;
- it requires script execution or external resources to recover packet semantics;
- it claims RFC 7992 conformance without preserving the declared inhabitant constraints;
- it treats a packet as modeled-player or CGS evidence without the relevant local-settling and strategy declarations.

## 9. Immediate Derivation Work

The next SHP specification pass needs:

- exact packet schema for frontier and projection evidence;
- complete HTML validation profile;
- signed metadata and manifest rules aligned with wire-federation;
- proof that SHP projection is a finite restriction of settled trace evidence;
- relation between class-as-morphism identity and the CHL/path-theory column;
- packet safety profile for hostile or unverifiable inbound packets.
