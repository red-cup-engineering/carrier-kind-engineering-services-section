# Wire Profiles

Status: candidate standards-binding surface. This file binds already-derived SPOTCOMP objects to Internet protocol representation rules. These representation rules are part of the mathematics as serialization, signature, transport, and admission morphisms after object boundaries are fixed.

## 1. Standards Boundary

The applicable standards attach at the byte/interface boundary:

- JSON objects use RFC 8259.
- Canonicalized JSON profiles inherit RFC 7493/I-JSON constraints through RFC 8785.
- Canonical JSON for row identity and signatures uses RFC 8785.
- JSON text sequences on the wire use RFC 7464 and `application/json-seq`.
- HTTP representation metadata uses RFC 9110 `Content-Type`.
- Problem details use RFC 9457 and `application/problem+json`.
- Ed25519 signatures use RFC 8032.
- X.509/SPKI identifiers for Ed25519 use RFC 8410.
- Media type registration and suffix rules use RFC 6838 and RFC 6839.

The standards do not decide that EAVT, SHP, CGS profiles, or TRC resources exist. They constrain how those already-derived objects are serialized, identified, signed, transported, and reported as errors.

## 2. Registered Versus Candidate Media Types

SPOTCOMP-specific media types such as `application/spotcomp-envelope+json` are candidate names in this workspace. They are not IANA registrations. A profile that uses such a name must declare `registration: "candidate-unregistered"` and cite the registration obligation.

Until registration exists, an implementation can remain wire-conservative by using existing media types:

- `application/json` for one JSON object whose `profile` member declares the SPOTCOMP profile;
- `application/json-seq` for an RFC 7464 stream of JSON texts;
- `application/problem+json` for HTTP API errors.

The `+json` suffix is allowed only for profiles whose representation follows JSON syntax and whose profile declares RFC 6839.

## 3. Signature And Canonicalization

A signed SPOTCOMP JSON profile signs the RFC 8785 canonical JSON bytes of the signed object, with the signature member removed where the object is self-signing.

JSON text sequences have no single canonical JSON form as a sequence. A signed sequence profile must sign canonical item bytes or a separately declared manifest of item row IDs, not raw reserialized sequence bytes.

Ed25519 signatures use RFC 8032. When keys are carried through X.509/SPKI or PEM-derived identifiers, the profile must also declare RFC 8410.

[CANONICAL-IDENTITY.md](./CANONICAL-IDENTITY.md) turns this into row/envelope/stream identity requirements and records the duplicate-name and number-boundary obligations that a real importer must prove before claiming strong wire conformance.

## 4. HTTP

When a SPOTCOMP profile is used over HTTP:

- the sender must provide `Content-Type`;
- the media type must match the declared payload kind;
- `Accept` negotiation should list the specific profile and any existing fallback;
- errors should use RFC 9457 problem details.

HTTP status-code semantics are RFC 9110 semantics. Profile-specific failures should be expressed as problem details whose `type` URI identifies a stable problem class.

## 5. Declaration Probe

[schema/wire-profile.schema.json](./schema/wire-profile.schema.json), [examples/wire-profiles.json](./examples/wire-profiles.json), and [src/wire-profile.mjs](./src/wire-profile.mjs) define a declaration-level checker.

The probe checks:

- RFC declarations required by representation kind;
- `application/json-seq` for JSON text sequences;
- `application/problem+json` for problem details;
- `+json` suffix profiles cite RFC 6839;
- signed JSON profiles use RFC 8785 canonicalization;
- Ed25519 profiles cite RFC 8032 and X.509/SPKI key profiles cite RFC 8410;
- HTTP profiles require `Content-Type` and RFC 9110;
- candidate unregistered media types carry open registration obligations.

The probe does not register media types, validate HTTP exchanges, run TLS, or prove cryptographic implementation correctness.

The federation admission profile adds the receiver-side bundle check:
[schema/federation-admission-profile.schema.json](./schema/federation-admission-profile.schema.json),
[examples/federation-admission-profile.json](./examples/federation-admission-profile.json), and
[src/federation-admission-profile.mjs](./src/federation-admission-profile.mjs).

That probe checks that a received representation has canonical identity,
signature, ordered local admission gates, regime binding, and an outcome before
it is treated as trace or typed-resource evidence. It rejects transport receipt,
signature validity, or problem-detail emission as substitutes for local
recognition, governance, capability, observation/action bounds, and regime
compatibility.
