# I/O As Articulation

Status: source-backed SPOTCOMP interpretation layer.

The active proof tree does not primarily phrase itself as an I/O theory.
This workspace needs that reading because SPOTCOMP has to implement real interfaces while preserving the mathematics.
The rule is:

`external I/O -> utterance -> articulating -> predicating -> positing -> settling`

Transport bytes, prompts, completions, hook payloads, argv vectors, HTTP requests, and tool-call envelopes are not trace evidence by themselves.
They are presentations that must be admitted through token/claim/utterance and articulating before later stages can treat anything as predication evidence.

## 1. Token, Claim, Utterance

The active tree makes token and claim the two non-assembling primitives.
An utterance is the ordered pair of one token and one claim.
The string or JSON presentation of either side is finite carrier material, not categorical identity.

For SPOTCOMP I/O, this means an outside system never directly writes a settlement.
It supplies or induces an utterance-shaped carrier:

- token side: the identity-bearing, type-stating, addressing, or presented form side;
- claim side: the content-bearing or asserted side;
- utterance: the ordered carrier pair that articulating can act on.

The token-before-claim reading is a declared working reading.
A conforming I/O profile must state the ordering it preserves and must not hide that choice in a parser.

## 2. Articulating Is The I/O Gate

Articulating has domain `utterance` and codomain the aperiodic articulation or predication category whose initial presentation carries the potential aperiodic predication cell.
This is the first SPOTCOMP-internal operation at the I/O boundary.

Locutionary handlers decode an environment into typed input.
They do not replace articulating.
If a handler accepts bytes and emits a positing event, it must show the component morphisms: environmental decoding, utterance construction or reference, articulating, stage selection, pure illocution, and downstream perlocution/settlement.

## 3. LLM And Outside-System Boundary

An LLM is an outside system unless it is itself represented as a modeled player with local settling, governance, capability bounds, memory/state, and CGS strategy evidence.

For a non-modeled external LLM:

- a prompt is transport presentation, not a settled premise;
- a completion is transport presentation, not a proof or settlement;
- model sampling is not SPOTCOMP closure;
- hidden context is not trace evidence unless admitted as trace;
- a tool call is a locutionary handler event until typed input is proved;
- generated text can propose claims, but claims become SPOTCOMP evidence only through typed admission, articulating, positing, and settlement.

For a modeled-player LLM, these same interactions still enter through utterance and trace.
The difference is that the player record can supply local settling, handedness, governance, strategy, and learning evidence.
The model's opaque internal state is not by itself a SPOTCOMP witness.

## 4. Irresolvable And Partial Functions

SPOTCOMP exists because ordinary total-function interfaces are insufficient for predication work.
The active tree repeatedly uses partial functions, bottom/default extensions, closure orbits, bounded prefixes, and downgrade rules.
Read from the I/O boundary, these are all instances of the same problem: an outside presentation may not resolve to a total, final, globally known function.

The proof engine handles that by preserving stage, evidence, and regime:

- articulating admits the possibility space rather than forcing resolution;
- predicating opens the transfinite predication category;
- positing adds Scott-continuous evidence monotonically;
- settling projects to finite fixed points only when the closure/regime evidence allows it;
- TRC/TDP records the executable proof tree so unresolved cases can remain typed, replayable, and auditable.

An implementation that converts unresolved input into a host exception, an unchecked null, or a silent default has left the SPOTCOMP object.
Failure, partiality, contradiction, abstention, and downgrade are typed predication content or typed boundary results.

## 5. Standards Boundary

IETF/RFC conformance attaches to the presentation and transport surfaces after the mathematical object boundary is fixed:

- JSON syntax constrains the finite carrier;
- canonicalization constrains identity bytes for admitted objects;
- signatures authenticate the carrier and sender, not mathematical settlement;
- HTTP semantics constrain request/response handling, not predication truth;
- media types bind derived object profiles, not arbitrary parser behavior;
- problem details can report pre-illocution failure without implying that a positing occurred.

This is why SPOTCOMP needs the categorical proof engine for standards conformance.
The standards can only be applied correctly once the object being serialized, signed, transported, or rejected is known.

## 6. Declaration Probe

[schema/io-articulation-profile.schema.json](./schema/io-articulation-profile.schema.json), [examples/io-articulation-profile.json](./examples/io-articulation-profile.json), and [src/io-articulation-profile.mjs](./src/io-articulation-profile.mjs) define a declaration-level probe for this boundary.

The probe checks that profiles declare:

- I/O as utterance-shaped presentation before SPOTCOMP evidence;
- token/claim/utterance preservation;
- articulating as the I/O gate into the aperiodic category;
- locution/illocution/perlocution separation;
- LLM prompts, completions, hidden context, and tool calls as outside-system presentations unless modeled-player evidence is supplied;
- unresolved or partial functions as typed proof-engine content or downgrade;
- standards conformance after the mathematical object boundary is fixed.

The probe does not validate live LLM behavior, prove articulating category generation, inspect HTTP traffic, verify signatures, or execute settlement.
