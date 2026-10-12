# Wire And Federation Specification

Status: first normative skeleton for the standards-facing wire and federation sub-specification.

This sub-specification owns byte/interface conformance and federation admission.
It binds already-derived SPOTCOMP objects to IETF/RFC-conformant serialization, identification, signing, transport, error, and deployment profiles.
These bindings are part of the mathematics as representation, serialization, signature, transport, and admission morphisms.

## 1. Position In SPOTCOMP

The derivation direction is:

`aperiodic articulating -> transfinite predicating -> Scott-continuous positing -> finite settling`

Wire representations occur after an object boundary is fixed.
JSON bytes, HTTP messages, signatures, media types, and DRIP/UAS Remote ID material are mathematical surfaces, but their role is representational and admissive.
They constrain how trace, packet, player, strategy, or settling objects are serialized, transported, authenticated, and admitted; they do not replace the upstream derivation of those objects.

## 2. Standards Inventory

A wire/federation profile MUST declare the standards it uses.
Current SPOTCOMP surfaces include:

- RFC 8259 for JSON;
- RFC 7493 and RFC 8785 for I-JSON and canonical JSON;
- RFC 7464 and `application/json-seq` for JSON text sequences;
- RFC 9110 for HTTP semantics and representation metadata;
- RFC 9457 and `application/problem+json` for problem details;
- RFC 8032 for Ed25519 signatures;
- RFC 8410 for Ed25519 identifiers through X.
  509/SPKI profiles;
- RFC 6838 and RFC 6839 for media type registration and structured suffixes;
- RFC 3339 for Internet timestamps where timestamp text is carried;
- RFC 9153, RFC 9374, RFC 9434, RFC 9575, and RFC 9886 for DRIP/UAS Remote ID deployments when applicable.

Internet-Drafts can inform a deployment profile, but they are not RFC conformance requirements until the profile explicitly adopts them as such or they are published as RFCs.

## 3. Representation Profiles

A conforming wire profile MUST bind each payload to a known object kind:

- trace row or trace stream;
- signed envelope;
- SHP packet;
- TRC/TDP resource manifest;
- declaration profile;
- problem detail;
- deployment-specific standards evidence.

SPOTCOMP-specific media types are candidate names until registered.
A profile using a candidate name MUST declare the registration obligation.
Conservative deployments SHOULD use registered media types such as `application/json`, `application/json-seq`, or `application/problem+json` with an explicit profile identifier.

## 4. Canonical Identity And Signatures

Signed JSON profiles sign RFC 8785 canonical JSON bytes after applying the profile's signature-member removal rule.
JSON duplicate names, number boundaries, Unicode handling, and I-JSON constraints are part of the precondition for strong wire conformance.

JSON text sequences have item-level canonical identities unless a manifest defines sequence identity.
Raw reserialization of a sequence is not a stable signature input.

Ed25519 signatures MUST follow RFC 8032.
Profiles that carry Ed25519 key material through X.
509/SPKI or related identifiers MUST cite RFC 8410.

## 5. Federation Admission

Federation is not byte receipt.
A federated payload becomes local SPOTCOMP evidence only after the receiver performs the declared admission path:

1. recognize representation kind and profile;
2. parse according to the relevant RFC;
3. verify canonical identity and signatures when required;
4. map external identifiers to local identifiers through declared bindings;
5. apply governance, capability, and player-local observation/action bounds;
6. preserve rejection or downgrade evidence for failed admission;
7. append admitted evidence as trace rows or typed resources;
8. replay or settle under the active regime.

Failed admission may produce audit evidence.
It MUST NOT silently merge as trusted trace evidence.

The finite admission profile makes this reviewable by requiring one bundle that ties together the received representation, canonical identity check, signature check, ordered admission gates, regime binding, and outcome.
The ordered local gates are:

1. representation kind;
2. RFC parse;
3. canonical identity;
4. signature verification;
5. identifier binding;
6. recognition;
7. governance;
8. capability;
9. observation/action bounds;
10. regime compatibility.

This order is not a claim that each gate is mathematically upstream of the others in the full derivation.
It is the conservative finite receiver order for Internet-facing admission: bytes and identifiers must be made safe to inspect before local recognition, governance, player-local bounds, and regime replay can decide whether the payload becomes SPOTCOMP evidence.

## 6. HTTP And Problem Details

When SPOTCOMP objects are represented over HTTP:

- `Content-Type` is required;
- the media type must match the declared payload kind;
- `Accept` negotiation should name the desired profile and registered fallback;
- error responses should use RFC 9457 problem details;
- profile-specific problem `type` values must be stable identifiers.

HTTP status codes carry RFC 9110 semantics.
SPOTCOMP-specific failure meaning belongs in the problem detail object and trace/audit evidence.

## 7. DRIP/UAS Deployment Boundary

DRIP/UAS Remote ID standards attach only for UAS deployment profiles.
Such profiles MUST keep these layers distinct:

- DET or UAS identity and registry lookup;
- broadcast RID authentication;
- local SPOTCOMP recognition and admission;
- modeled-player local settling;
- CGS strategy evidence;
- aperiodic tiling or bigraded swarm evidence.

DRIP evidence can support identity, lookup, and authentication claims.
It does not prove modeled-player conformance, CGS strategy laws, or aperiodic swarm classification.

## 8. Declaration Probes

The current declaration probes are:

- [../../WIRE-PROFILES.md](../../WIRE-PROFILES.md);
- [../../schema/wire-profile.schema.json](../../schema/wire-profile.schema.json);
- [../../examples/wire-profiles.json](../../examples/wire-profiles.json);
- [../../src/wire-profile.mjs](../../src/wire-profile.mjs);
- [../../schema/federation-admission-profile.schema.json](../../schema/federation-admission-profile.schema.json);
- [../../examples/federation-admission-profile.json](../../examples/federation-admission-profile.json);
- [../../src/federation-admission-profile.mjs](../../src/federation-admission-profile.mjs);
- [../../CANONICAL-IDENTITY.md](../../CANONICAL-IDENTITY.md);
- [../../schema/canonical-identity-profile.schema.json](../../schema/canonical-identity-profile.schema.json);
- [../../src/canonical-identity-profile.mjs](../../src/canonical-identity-profile.mjs);
- [../../DRIP-UAS-BINDING.md](../../DRIP-UAS-BINDING.md);
- [../../schema/drip-uas-profile.schema.json](../../schema/drip-uas-profile.schema.json);
- [../../src/drip-uas-profile.mjs](../../src/drip-uas-profile.mjs).

The probes check representation RFC declarations, media type boundaries, signature and canonicalization declarations, HTTP requirements, problem-detail requirements, candidate registration obligations, canonical row/envelope identity, federation admission bundles, and DRIP/UAS boundary declarations.

They do not register media types, validate live HTTP exchanges, run TLS, perform complete canonicalization, query DNS, verify live DET material, or prove local SPOTCOMP admission.
The federation-admission profile is a declaration-level receiver audit; it does not execute networking, parse all JSON edge cases, verify real signatures, or run local settlement.

## 9. Non-Conformance Cases

A wire/federation profile is not conformant when:

- it treats transport receipt as trace admission;
- it signs non-canonical or unspecified bytes for a canonical JSON profile;
- it treats a JSON text sequence as having canonical sequence bytes without a manifest;
- it uses unregistered candidate media types without declaring the registration obligation;
- it omits `Content-Type` for HTTP payloads;
- it reports profile errors without stable problem classes;
- it treats DRIP/UAS identity evidence as a modeled-player, CGS, or tiling proof;
- it skips local recognition, governance, capability, or observation bounds after standards-layer verification.

## 10. Immediate Derivation Work

The next wire/federation specification pass needs:

- exact media type and profile identifier registry plan;
- full canonicalization and duplicate-name parser requirements;
- envelope schema and signature-member removal law;
- JSON text sequence manifest profile;
- HTTP problem-type registry;
- live admission implementation aligned with the admission profile, recognition, governance, and regime federation;
- DRIP/UAS deployment profile examples that stay standards-conformant without collapsing into modeled-player mathematics.
