# DRIP UAS Binding

Status: standards-binding surface. This file records the IETF DRIP/UAS Remote
ID obligations that attach when SPOTCOMP is used for unmanned aircraft system
deployments. It is not part of the aperiodic tiling mathematics and it does
not define modeled-player identity.

## 1. Current RFC Surface

As of 2026-05-28, the IETF DRIP working-group document list records five RFCs:

- RFC 9153: DRIP requirements and terminology.
- RFC 9374: DRIP Entity Tags for UAS Remote ID.
- RFC 9434: DRIP architecture.
- RFC 9575: DET authentication formats and protocols for broadcast RID.
- RFC 9886: DETs in the Domain Name System.

The working group also has active Internet-Drafts. Those drafts can inform
future work, but this workspace does not treat them as RFC conformance
requirements until they are published as RFCs or otherwise adopted by a
declared deployment profile.

## 2. Standards Boundary

DRIP attaches at the standards-facing UAS Remote ID layer:

- UAS identifiers and DRIP Entity Tags;
- registry discovery and lookup;
- authentication of broadcast Remote ID messages;
- observer assessment of trustworthy RID information;
- DNS/DIME registry behavior for DET lookup and verification.

SPOTCOMP's local-settling, bigraded common-knowledge, aperiodic tiling, and CGS
strategy evidence may structure swarm behavior and audit. They do not satisfy
DRIP by themselves.

## 3. DET Identity Boundary

RFC 9374 makes DET/HHIT-style identifiers the DRIP identity surface for UAS RID
use. A SPOTCOMP deployment profile that crosses into UAS RID must therefore
declare:

- how a modeled-player, vehicle, controller, operator, or registry object maps
  to the applicable DET or UAS ID role;
- which registry can be identified from that identifier;
- how uniqueness and non-spoofability are verified at the RID layer;
- which local slugs, row IDs, or player IDs are internal only.

SPOTCOMP row identity, path identity, and modeled-player identity cannot be
silently reused as DET identity. They need an explicit binding.

## 4. Broadcast Authentication Boundary

RFC 9575 defines DET authentication formats and protocols for broadcast RID.
For SPOTCOMP, that means:

- authentication is checked before RID-derived evidence is admitted into a
  local settling;
- signed broadcast data and freshness or uniqueness evidence are part of the
  admission surface;
- an unauthenticated or unverifiable RID message may still become local audit
  material, but it cannot become trusted swarm evidence.

This is parallel to SPOTCOMP's signature-before-trace-merge rule, but it is not
the same signature profile. The deployment must say which layer is being
verified.

## 5. DNS And DIME Boundary

RFC 9886 defines DNS functionality for DRIP Identity Management Entities around
DETs. A SPOTCOMP UAS deployment that uses DET registry lookup must keep these
positions distinct:

- DET issuance;
- DET discovery;
- registry lookup;
- verification of registration data;
- local SPOTCOMP admission after standards-layer checks.

DNS lookup does not itself prove modeled-player conformance, CGS strategy
correctness, or aperiodic swarm structure. It supplies registry and lookup
evidence that the local recognition/admission layer may consume.

## 6. Declaration Probe

The files [schema/drip-uas-profile.schema.json](./schema/drip-uas-profile.schema.json),
[examples/drip-uas-profile.json](./examples/drip-uas-profile.json), and
[src/drip-uas-profile.mjs](./src/drip-uas-profile.mjs) define a
declaration-level checker for this standards boundary.

The probe checks declarations for:

- the five current DRIP RFCs;
- non-normative treatment of active drafts;
- separation between DRIP evidence and swarm mathematics;
- DET/UAS ID mapping and local-identifier boundaries;
- broadcast RID authentication and downgrade behavior;
- DNS/DIME registry lookup separation;
- local SPOTCOMP recognition/admission after standards-layer checks.

It does not validate live RID broadcasts, query DNS, verify DET cryptographic
material, implement ASTM or civil-aviation rules, or prove modeled-player
swarm conformance.
