---
title: "Revised design for Infography's content-addressed catalog readout"
description: "Adversarially revised architecture for a generated, frontier-relative capability catalog over witnessed settlement matter."
date-created: 2026-07-12
date-revised: 2026-07-12
status: working revised architecture; five input choices ratified; adversarial revision proposed; M1 constitutive slice authorized separately; later runtime layers unauthorized
adversarial-assessment: ../../../../reports/2026-07-12-content-addressed-catalog-adversarial-assessment.md
implementation-campaign: 2026-07-12-m0-m3-clean-target-implementation-campaign.md
---

# Revised design for Infography's content-addressed catalog readout

## 0. Status and revision verdict

This note proposes to supersede its first catalog-centric design while
preserving its five ratified choices. The adversarial assessment found that a content-addressed
catalog cannot be the settlement's source, ontology, or first architectural
spine. That would reify a reading as matter, the recurring Infography category
error identified independently in the system monograph, generated-interface
research, work-ledger research, and causal-carrier note.

The catalog survives in a narrower and more useful role:

> A catalog is a finite, content-addressed, frontier-relative readout of the
> generated programs, carriers, instruments, lenses, boundary ports, and
> presentations available for appraisal and possible activation in a
> settlement.

The source spine is witnessed, causally related matter. Catalogs, schemas,
names, endpoint descriptors, protocol surfaces, source projections, state
cuts, records, and content are readings of that matter. A catalog can be
deleted and rebuilt from its causal source and derivation receipt. Deleting its
source matter cannot be repaired from the catalog.

This is architecture and proof-target design, not a claim that the live runtime
realizes these rules. A separately approved implementation campaign authorizes
only the isolated M1 constitutive slice; it does not authorize later runtime
layers or redirect the bootstrap runtime onto the new surface.

### 0.1 Ratified choices retained

1. **Object-reference surface.** The canonical external form is one
   self-describing string carrying reference version, canonicalization profile,
   digest algorithm, and digest. Structured carriers may use the equivalent
   object. Bare `sha256:<hex>` is rejected by every target boundary.
2. **Settlement frontier.** A frontier is purely causal: a canonical maximal
   antichain of witnessed event references plus its dependency-closed root and
   causal interpretation profile. No clock, writer sequence, territory cursor,
   fencing generation, or imposed total order participates in its identity.
3. **Genesis authority and recovery.** The bare site rule names no privileged
   subject, key, operator, quorum, or voting set. Authority is an emergent
   FOUR-valued appraisal of authenticated claims and situated measurements.
   Recovery uses the same reconciliation calculus and has no administrative
   bypass.
4. **Retention.** Collection is a semantic, causal, FOUR-valued judgment. Time
   may be an admitted measurement but never grants deletion by itself. Missing
   release evidence is unknown, not permission.
5. **Bootstrap compatibility.** No current Infography identifier, schema, verb,
   URI, route, package export, stored form, or wire shape is a target
   compatibility obligation. Optional offline migration is re-articulation,
   not a runtime adapter or identity-preserving import.

### 0.2 Adversarial revision trail

| Revision | Assessment findings | Result |
|---|---|---|
| Catalog demotion from matter to readout | ACX-01, 02, 20, 22 | Witnessed settlement is source; generated catalog is rebuildable projection. |
| Artifact/semantic identity split | ACX-03, 16, 25 | Exact bytes and earned semantic equivalence have different references and proof obligations. |
| Multi-writer causal admission | ACX-04, 05, 12, 13, 19, 26 | No territory-wide writer or root certificate; reception, structural admission, appraisal, and effect coordination are distinct. |
| Dynamic readout model | ACX-06, 17, 21, 24, 27 | Static discovery and governed observer-relative readouts have different identities and lifecycle stages. |
| Open-regime and encounter correction | ACX-07, 08, 14, 23 | Prefixes, proxy readouts, candidate diamonds, terminal sections, and external time observations remain distinct. |
| Exact FOUR terminology | ACX-09 | Normative gates name `dT`, `dK`, and `dTop`; “held” is never used ambiguously. |
| Scoped retention and privacy | ACX-10, 18, 26 | Collection is custody-scoped; sensitive boundary material is not semantic matter by default. |
| Stratified self-generation | ACX-15, 28 | Constitutive rule, operational policy, derived proposal, and ratification live at distinct causal levels. |
| Promissory formal targets | ACX-11 and exact-scope audit | Strong Yoneda, Hole, CALM, encounter, and endpoint claims are targets to earn, never spent in advance. |

### 0.3 Completion rule

The architecture is coherent only if every target mechanism answers:

1. what is matter and what is a reading;
2. which identity relation it uses;
3. which pure causal frontier and observer/custody cut it reads;
4. which program, lens, policy, and resource envelope derive it;
5. which FOUR cut governs visibility, invocation, or collection;
6. how failure, concurrency, restart, and partial replication behave; and
7. what evidence would prove the claimed formal and runtime correspondence.

No target object may be implementable in two semantically different ways while
satisfying these rules.

## 1. System placement

### 1.1 Matter, settlement, and readings

The architecture has one source direction:

```text
bare SiteConstitution
  → received artifact bytes
  → structurally admitted witnessed articulations
  → causally closed witnessed matter
  → settlement/appraisal at a FrontierRef
  → generated semantic and analytical readouts
  → CatalogReadout
  → ActivationReadout
  → protocol/human/agent presentations and governed effects
```

The arrows do not reverse. A readout may be witnessed as a new proposal only by
crossing the primordial articulation aperture as a new utterance that names its
derivation and source. It does not become matter merely because a process wrote
its projection bytes into the plate.

### 1.2 Bare site and inhabited settlement

A `SiteConstitution` is a bare rule, not an authority claim:

```text
SiteConstitution {
  version,
  markAndArticulationProfile,
  causalProfile,
  FOURProfile,
  languageAndTypingProfiles,
  measurementKernelProfile,
  appraisalKernelProfile,
  coordinationAndReconciliationProfiles,
  identityAttestationProfiles,
  resourceEnvelopeProfile,
  formalCorrespondenceRefs
}
```

`SiteRef = address(SiteConstitution)` identifies the rule under which bytes can
become matter and matter can be read. It selects no winner, trusted claimant,
key, administrator, or initial capability. Changing a constitutive profile
creates a new `SiteRef`; a causal succession or consolidation relation may
connect sites, but one site's meaning is never edited in place.

A settlement is a site inhabited by at least one structurally admitted
articulation. The plate is its durable matter; a dish is one ephemeral live
readout/effect surface. Neither process possession nor filesystem access
confers semantic authority.

### 1.3 Primordial articulation aperture

The bounded Mark/Utterance/articulation aperture belongs to the bare site rule,
not to a catalog. Otherwise an empty site would need a catalog endpoint before
the first matter capable of generating that endpoint could enter.

The aperture may perform only bounded framing, resource-envelope enforcement,
canonical artifact verification, identity-attestation verification, and
structural articulation checks. These checks determine whether a candidate can
become witnessed matter. They do not decide whether its claim is true, whether
its author has standing, or whether an effect is allowed.

### 1.4 Catalog readout

A `CatalogReadout` is finite because it reads one finite witnessed causal
closure under one finite derivation profile. It contains generated descriptors
and their typed relations, standing readouts, gaps, and obstruction evidence.
It is not:

- the settlement or plate;
- a registry scanned for familiar shapes;
- a mutable operation table;
- an authority or capability list;
- a set of process handlers;
- a protocol tool list; or
- proof that an open settlement has globally terminated.

Different faithful catalog readouts may be derived from the same matter under
different admitted lenses. They are different readings of one settlement, not
competing semantic worlds. An activation names the precise readout it uses.

## 2. Revised invariants

| ID | Invariant |
|---|---|
| CR-1 | Witnessed, causally closed articulation is source matter; every catalog, descriptor, name, schema presentation, cut, index, and protocol surface is a reading or artifact. |
| CR-2 | Every exact artifact identity names its canonical profile; semantic identity is claimed only through a typed normalization/equivalence witness. |
| CR-3 | The primordial articulation aperture exists independently of generated catalogs and grants no semantic standing. |
| CR-4 | Reception, structural admission, semantic appraisal, binding appraisal, invocation appraisal, and effect coordination are distinct transitions. |
| CR-5 | A frontier is a purely causal maximal antichain relative to its exact dependency-closed observed set; it claims no unseen global completeness. |
| CR-6 | Structurally valid monotone matter admits and replicates without a territory-wide writer, total order, root certificate, or global fence. |
| CR-7 | Coordination and fencing are scoped to a proved non-monotone decision/effect coordinate; they never order the whole settlement. |
| CR-8 | Normative FOUR gates state their mask exactly. Effects require truth-only `dT`; knowledge visibility may use `dK`; contradiction remains explicit at `dTop`. |
| CR-9 | Programs and carriers are generated/recognized through admitted language and morphism structure. Authored domain/codomain records alone confer no semantic identity. |
| CR-10 | Boundary ports, host handlers, measurements, roles, scenes, and accountability relations are explicit witnessed structures rather than hidden closures or ambient configuration. |
| CR-11 | Static discovery and dynamic observer-relative readouts are different derivations with different receipts. |
| CR-12 | Lossy output is explicitly receipted; invocation input must decode injectively over its admitted domain or require disambiguation. |
| CR-13 | Open prefixes, shroud proxies, candidate diamonds, terminal claims, and quiescent sections never impersonate one another. |
| CR-14 | Semantic time is causal. External clock readings are witnessed measurements; host watchdogs may stop local resource use but cannot silently change standing. |
| CR-15 | Self-generation derives proposals and readings but cannot ratify itself, amplify duplicate support, or feed a projection back as novel matter without re-articulation. |
| CR-16 | Identity splitting, duplicate claims, and ungrounded circular support cannot increase authority standing; this is a release-blocking formal obligation. |
| CR-17 | Collection authority is custody-scoped and requires explicit release; local absence never proves global dispensability. |
| CR-18 | Bootstrap surfaces are rejected by the target. Migration creates new target matter and receipts, never inherited identity or authority. |

## 3. Identity hierarchy

### 3.1 Exact artifact references

```text
ArtifactRef {
  referenceVersion,
  canonicalProfile: CanonicalProfileId,
  digestAlgorithm,
  digest
}
```

The canonical external spelling is a self-describing string; structured
carriers use the equivalent object. `referenceVersion` fixes the envelope
grammar, field escaping, profile-identifier grammar, algorithm identifiers, and
digest encoding directly. Those bootstrap rules do not depend on another
`ArtifactRef`. `CanonicalProfileId` then identifies the canonical byte profile
used for the addressed payload. A profile artifact may provide the complete
specification and vectors, but the identifier-to-profile binding is part of the
mounted `SiteConstitution` and reference version rather than a recursively
self-addressed field.

The payload profile specifies Unicode, key order, escaping, number grammar,
duplicate-key rejection, invalid values, and byte/depth limits. A site cannot
reinterpret an existing `CanonicalProfileId`; changed rules require a new
identifier and usually a successor site constitution.

An `ArtifactRef` proves exact byte identity under one profile. It proves no
authorship, admission, meaning, equivalence, truth, or authority.

### 3.2 Witnessed articulation identity

```text
WitnessCore {
  site,
  articulation,
  causes: sorted WitnessRef[],
  referencedArtifacts: sorted ArtifactRef[],
  attestationRefs: sorted ArtifactRef[],
  boundaryObservationRefs: sorted ArtifactRef[]
}

WitnessRef = address(WitnessCore)
```

Wall time, append position, process identity, local pathname, transport request
ID, and directory enumeration are excluded unless the articulation itself
contains an admitted observation of them. Causes carry semantic time.

### 3.3 Program and semantic identity

`ProgramArtifactRef` names exact serialized term bytes. A semantic key is:

```text
ProgramSemanticKey {
  languageProfile,
  canonicalType,
  canonicalNormalForm,
  reductionOrEquivalenceProfile
}

ProgramSemanticRef = address(ProgramSemanticKey)
```

Typing derivations, normalization traces, proof artifacts, and conformance
receipts are eligibility evidence linked to the key, not fields of semantic
identity. This prevents two valid proofs of one type/normal form from splitting
one semantic class. Two artifacts share semantic identity only when the pinned
relation is discharged. Where the relevant runtime language extension lacks
confluence, normalization, or type correspondence, the system retains separate
artifact identities and an unproved equivalence claim. It does not hash a JSON
projection and call the result semantic identity.

Host functions never receive `ProgramSemanticRef`. They are deployment
artifacts behind explicit boundary ports and binding attestations.

### 3.4 Pure causal frontier identity

```text
FrontierManifest {
  version,
  causalProfile,
  tips: canonicalSortedMaximalAntichain<WitnessRef>,
  closureRoot,
  closureWitnessRoot
}

FrontierRef = address(FrontierManifest)
```

The closure root names the exact observed causally closed set relative to which
the tips are maximal. A partial replica therefore makes no claim that its tips
are globally maximal. Custody, observer, replica, territory, and protocol are
not frontier coordinates; derivation/readout receipts name those scopes
separately.

The maximal-antichain representation and its merge/reconstruction laws remain
formal targets to earn.

### 3.5 Readout and lifecycle identities

```text
CatalogReadoutManifest {
  version,
  readoutProfile,
  descriptorRefs: canonicalSortedSet<GeneratedDescriptorRef>,
  typedRelationRefs: canonicalSortedSet<TypedRelationRef>,
  locusSelectionRoot,
  standingReadoutRoot,
  obstructionAnnexRoot
}

CatalogReadoutRef = address(CatalogReadoutManifest)

CatalogGenerationReceipt {
  version,
  site,
  sourceFrontier,
  derivationProgram,
  readoutProfile,
  semanticLens,
  resourceEnvelope,
  catalogReadout,
  derivationEvidenceRoot
}

CatalogGenerationRef = address(CatalogGenerationReceipt)

ActivationRef = address(ActivationManifest)

DynamicReadoutRef = address(DynamicReadoutReceipt)
```

- `CatalogReadoutRef` identifies a finite descriptor graph, independent of
  runtime process and protocol envelope.
- `CatalogGenerationRef` identifies the derivation of that readout from a site,
  source frontier, derivation program/profile, lens, and evidence roots.
- `ActivationRef` identifies one proposed deployment/appraisal coordinate:
  generation, bindings, policies, roles, effect ports, and coordination
  requirements. It is not proof that activation standing is truth-only.
- `DynamicReadoutRef` identifies one observer/query/budget-relative projection
  result.

An ephemeral runtime observation names dish instance, observed frontier,
activation, bindings, effect-coordinate leases, and host watchdog state. It is
never a semantic identity.

## 4. Generated readout system

### 4.1 Proposals are matter; descriptors are readings

Authors, programs, instruments, and dishes may articulate proposals concerning
programs, schemas, representations, ports, resources, prompts, policies,
measurements, roles, and laws. These proposals are witnessed matter with FOUR
standing. They are not declarations made true by insertion into a registry.

A derivation program recognizes/generates descriptor readouts from the admitted
matter and language spine. The target descriptor coproduct is closed per
readout profile:

```text
GeneratedDescriptor =
    CarrierSchemaReadout
  | RepresentationLegReadout
  | ProgramMorphismReadout
  | GeneratedEndpointReadout
  | BoundaryPortReadout
  | ResourceLensReadout
  | PromptProgramReadout
  | ControlReadout
  | EncounterProfileReadout
  | PolicyAppraisalReadout
  | MeasurementInstrumentReadout
  | RoleOfficeReadout
  | LawCorrespondenceReadout
  | DerivationReadout
```

Adding a variant changes the readout profile. Unknown variants may be retained
as artifacts/proposals but cannot be interpreted by an older profile.

### 4.2 Generated endpoints and carriers

A true endpoint is recovered from a generated program morphism and its carrier
readouts:

```text
GeneratedEndpointReadout {
  programSemanticRef,
  domainCarrier,
  codomainCarrier,
  typingAndReductionEvidence,
  HoarePrePostEvidence,
  causalAndSettlementCarrier,
  representationLegs,
  admissibleCompositionEdges,
  witnessPolicy,
  claimedFormalCorrespondences
}
```

The stronger target is that carrier objects are recovered arrows-first through
the promised Yoneda/CHL specialization. Current generic Yoneda results do not
yet earn that endpoint theorem. Until it is earned, a carrier proposal remains
`target-unproved` and cannot claim generated semantic identity merely because
an authored schema ID matches.

A genuine host effect cannot be disguised as a morphism. It uses a
`BoundaryPortReadout` with explicit effect, retry, reconciliation,
cancellation, resource, privacy, and witness obligations.

### 4.3 Schemas and representation legs

A carrier schema is a readout of admitted carrier/type structure. JSON Schema,
TypeScript types, forms, EAVT rows, Lean terms, and protocol schemas are
representation legs. Each leg states:

- semantic domain and codomain;
- decode, validate, normalize, encode, and project functions;
- direction-specific totality/injectivity/surjectivity claims;
- what a lossy direction forgets;
- canonical bytes, if the leg is eligible for artifact identity; and
- conformance vectors and formal correspondence.

Future evolution uses explicit witnessed relations:

```text
sameArtifact | normalizationEquivalent | representationEquivalent |
isomorphic | refinement | quotientLoss | semanticReplacement
```

No compatibility-major integer decides these relations.

### 4.4 Stable loci

Human/protocol names are readout loci, not identities:

```text
ReadoutLocus { descriptorKind, namespace, name }
```

Two truth-only selections for one locus in the same catalog derivation are an
obstruction. A successor generation may select another descriptor only with an
explicit semantic evolution relation. Bootstrap names have no target standing.

### 4.5 Measurement and instruments

Non-rooted authority requires measurement to be first-class. An instrument
readout includes:

```text
MeasurementInstrumentReadout {
  program,
  lensAndSituatedScope,
  calibrationAndProvenance,
  inputAndResultCarriers,
  uncertaintyAndFOURInterpretation,
  resourceAndPrivacyEnvelope,
  effectsAndWitnessPolicy,
  lawCorrespondences
}
```

Individual observations are witnessed matter. Instrument descriptions are
generated readouts. Contradictory instruments remain visible; key count or
instrument count is never a vote.

### 4.6 Role, scene, and accountability

Governed effects may require a situated `RoleOfficeReadout` carrying principal,
incumbent/subject, duties, privileges, powers, immunities, affected-party loci,
scene evidence, refusal/escalation conditions, repair obligations, and
accountability chain. These relations are witnessed and appraised, not inferred
from a personality, prompt, credential, or operation name.

## 5. Standing and non-rooted authority

### 5.1 Exact FOUR cuts

Normative prose uses exact masks:

```text
unknown     = knowledge bottom
truth-only  = for and not against      = dT
falsity-only= against and not for      = dF
both        = for and against          = dTop
knowledge-designated = truth-only or both = dK
```

- Knowledge/adjudication views may retain all `dK`, including both.
- A governed effect, activation selection, binding use, or collection act
  requires `dT` under its exact policy.
- `dTop` is held as matter and contested as permission. It is never erased or
  treated as callable.

### 5.2 Independent judgments

At minimum the architecture distinguishes:

```text
SemanticStanding(object, frontier, policy)          ∈ FOUR
BindingStanding(endpoint, binding, activation, F)   ∈ FOUR
InvocationStanding(subject, role, scene, endpoint,
                   resource, policy, F)             ∈ FOUR
ProjectionStanding(readoutRequest, policy, F)       ∈ FOUR
CollectionStanding(custodyObject, policy, F)        ∈ FOUR
```

Structural admission is a deterministic witness/obstruction, not a FOUR vote.
Catalog visibility may expose unknown/false/both descriptors with their exact
standing. Callability is never inferred from visibility.

### 5.3 Authentication without root authority

An attestation says which claimant/key/process presented bytes and under which
profile. It grants no standing. Identity continuity, replacement, repudiation,
and compromise are themselves witnessed claims and measurements.

There is no authority-issued admission certificate required before a claim can
be observed. That would require authority to exist before the evidence from
which authority is supposed to emerge.

### 5.4 Capability evidence

Capability claims relate subject, role/office, action, resource, scene,
affected-party loci, constraints, delegation/accountability, appraisal policy,
and causal validity conditions. Attenuation can narrow but not widen a parent
claim. Delegation never removes accountability.

Clock expiry is not intrinsic. A witnessed external-time observation may
satisfy a policy predicate. A host deadline may abort local computation but
does not add denial evidence unless its occurrence is articulated.

### 5.5 Non-amplification release gate

Before non-rooted authority can govern real effects, the appraisal calculus
must earn at least these properties:

- duplicate claims and replay add no standing;
- splitting one identity into many ungrounded identities adds no standing;
- a support cycle with no independent measured premise cannot bootstrap itself;
- representation duplication across protocols adds no standing;
- contradictory evidence remains both rather than being winner-selected; and
- adding causally independent valid evidence is order-independent under the
  precise realized merge profile.

This is a proof/formalization obligation, not a configuration promise.

### 5.6 Policy stratification

The constitutive `SiteConstitution` interprets matter but does not appraise its
own replacement. Operational policies are generated readouts appraised under a
meta-policy fixed at a prior frontier. A policy cannot select or ratify itself
at the same frontier. Replacing the constitutive rule creates a new site
identity.

## 6. Reception, admission, derivation, and publication

### 6.1 Four distinct transitions

```text
RECEIVED_BYTES
  → QUARANTINED_ARTIFACT
  → STRUCTURALLY_ADMITTED_WITNESS
  → SEMANTICALLY_APPRAISED_MATTER
  → DERIVED_READOUT
  → WITNESSED_PUBLICATION_CLAIM
```

Reception may be concurrent and out of causal order. An artifact remains
quarantined until all referenced objects and causes are present and validate
under the pinned site/profile. Structural admission verifies canonical bytes,
hashes, types, dependency closure, and causal acyclicity. It never checks
whether the claim is favorable or the claimant authoritative.

The set of structurally admitted witness objects is monotone. Later dependency
arrival can move an object from quarantine to admitted, but later evidence may
not make an already admitted object's bytes or causal closure invalid. Corrupt
or same-reference/different-byte observations are integrity obstructions.

### 6.2 Multi-writer storage law

Any dish/replica may publish immutable candidate artifacts with create-only
semantics. There is no territory-wide lock. Physical publication:

1. write canonical bytes under a private preparation name;
2. flush the file;
3. verify the computed `ArtifactRef`;
4. publish create-only at the address path;
5. if the path exists, compare exact canonical bytes before treating it as the
   same artifact;
6. flush the containing directory; and
7. treat indexes and materialized closures as rebuildable projections.

Multi-object material is not valid because files happened to land together.
Dependency closure supplies logical atomicity: it becomes structurally admitted
only when the complete referenced set validates. Deterministic admission
receipts may be reproduced by many validators and have one identity.

### 6.3 Pure causal frontier construction

A frontier derivation:

1. selects an exact observed admitted witness set;
2. verifies causal down-closure;
3. removes every event dominated by another selected event;
4. canonically sorts the remaining maximal antichain;
5. commits the complete closure root and validation witness root; and
6. emits no claim about unseen peers or global latest state.

Frontier merge unions observed admitted sets, closes causes, and derives a new
antichain. It never orders spacelike events.

### 6.4 Catalog derivation

```text
deriveCatalogReadout(
  site,
  sourceFrontier,
  derivationProgram,
  readoutProfile,
  semanticLens,
  resourceEnvelope
) -> CatalogGenerationReceipt | DerivationObstruction
```

The derivation:

1. reconstructs exact witnessed source matter;
2. evaluates admitted program/type/morphism recognition;
3. appraises proposals and measurements at the named frontier;
4. generates carrier, endpoint, instrument, policy, role, law, and boundary
   descriptors;
5. constructs typed semantic relations and stable locus selections;
6. computes standing without filtering away unknown/false/both material;
7. derives the protocol-independent catalog readout;
8. runs required formal/conformance correspondences; and
9. emits descriptor graph, obstruction annex, and deterministic receipt.

Filesystem enumeration, wall time, random state, process environment, network
state, host closure identity, and protocol request order cannot affect the
result unless first witnessed as explicit input.

### 6.5 Derivation obstructions

Obstructions include missing causal dependencies, invalid term/type/profile,
unearned semantic-equivalence claims, free domain/codomain invention, locus
collision, prohibited semantic cycles, missing measurement calibration,
unstated loss, defaulted effects/replay/coordination, self-appraising policy,
unmet law hypotheses, and exceeded resource envelopes.

An obstruction is a readout, not deletion. Candidate matter remains present.

### 6.6 Generation publication

A catalog generation is the content-addressed derivation receipt. Publishing it
means making its immutable artifacts available and optionally witnessing a
publication claim. No root signer or singular process makes the mathematical
derivation true. Two dishes deriving identical inputs and profile obtain the
same readout and generation identities.

## 7. Binding, activation, and coordination

### 7.1 Boundary ports and bindings

```text
BoundaryPortReadout {
  inputAndOutputCarriers,
  effectCapabilities,
  replayAndReconcileContract,
  cancellationAndCheckpointContract,
  resourceAndPrivacyEnvelope,
  witnessContract,
  hostABIProfile
}

BindingAttestation {
  endpoint,
  port,
  deploymentArtifact,
  exportLocator,
  buildProvenance,
  runtimeABI,
  attenuatedEffectPorts,
  conformanceEvidence,
  claimantAttestation
}
```

Runtime tables key by `BindingRef`, never JavaScript object identity, verb,
import order, or closure address.

### 7.2 Activation is an appraised proposal

An `ActivationManifest` names generation, exact bindings, policies, roles,
effect coordinates, protocol projection programs, recovery conditions, and
predecessor relations. It does not contain a mutable `active` flag.

`ActivationStanding(ActivationRef, FrontierRef, PolicyRef) ∈ FOUR` is derived
from witnessed activation claims and current binding/policy evidence. Only
truth-only standing permits new governed effects. Both/unknown/false
activations remain visible for adjudication and rollback analysis.

There need not be one globally current activation. A request names an
activation or a readout policy derives a unique truth-only selection for its
scope. Multiple truth-only incompatible selections for one exclusive effect
coordinate are a coordination obstruction.

### 7.3 Scoped coordination and fencing

Coordination is required only for a concrete non-monotone coordinate whose
classification and law correspondence are evidenced. A
`CoordinationWitnessRef` names decision domain, participants/measurement scope,
causal frontier, protocol, selected result, and safety evidence.

Fencing tokens and leases protect only the named host effect coordinate. They
are runtime/effect observations, not semantic time, frontier identity, or
territory-wide writer authority. Monotone witness admission never requires
them.

### 7.4 Successor, rollback, and revocation

- Upgrade derives a successor catalog generation and activation proposal.
- Rollback proposes a new activation over an older generation with current
  bindings and policy evidence.
- Semantic correction adds new witnessed matter and derives a successor; it
  never edits an old artifact.
- Revocation is opposing evidence appraised at a new frontier. Historical
  decisions retain their exact source frontier.
- Constitutive-rule change creates a successor site, not a generation update.

## 8. Static discovery and dynamic readouts

### 8.1 Static catalog projection

Static discovery is a pure projection of:

```text
(CatalogGenerationRef, ActivationRef?, ProjectionProfileRef)
```

It describes generated endpoints, carriers, standing at the generation
frontier, port requirements, and presentation affordances. It does not read
live resources or claim activation freshness.

### 8.2 Governed dynamic readout

Live cuts, feeds, suits, orientation lenses, generated forms, visualizations,
resource reads, and observer-relative views use:

```text
DynamicReadoutRequest {
  site,
  sourceFrontier,
  derivationProgram,
  semanticLens,
  authenticatedSubject,
  roleAndScene,
  authorityCut,
  query,
  resourceBudget,
  representationLeg
}
```

The result and receipt identify every input and declared loss. A dynamic
readout is not a new catalog generation. `authenticatedSubject` is a protected
subject locus or continuity reference, never a password, bearer token, private
key, session secret, or raw identifying artifact. A privacy profile determines
whether the durable receipt retains that locus, a scoped commitment to it, or a
non-linkable authorization witness; it must still preserve enough evidence to
audit the authority cut without disclosing the credential used at the boundary.

### 8.3 Direction-specific protocol safety

- Descriptor omission is allowed only when the protocol profile declares it.
- Lossy output names forgotten structure and cannot be used for semantic
  round-trip identity.
- Invocation input must decode injectively over the admitted domain or carry an
  explicit disambiguating witness.
- A read-only lossy protocol cannot silently become an invocation surface.
- Delivery IDs wrap governed invocation/outcome IDs and never replace them.

### 8.4 Generated human and agent surfaces

Forms derive from carrier schemas; cuts/feeds derive from witnessed matter;
charged visualizations derive from valuation/settlement readings; status and
handoff views are dynamic readout receipts. Hand-authored UX may supply an
interpretive lens, but cannot introduce an alternate ontology or authority
path.

### 8.5 Agreement and sealing order

Generation and activation manifests commit to projection programs, profiles,
and obligations, not descriptor bytes that contain their own not-yet-known
references. After identities exist, projections are generated and checked for
overlap agreement. Serving readiness is a later witnessed predicate.

This avoids circular `ActivationRef → descriptor → agreement → ActivationRef`
identity. The promised transport gluing theorem remains to be earned from an
explicit cover/agreement object.

## 9. Invocation, effects, and encounters

### 9.1 Governed invocation identity

A semantic invocation binds at least:

```text
site, activation, endpoint, semantic input, arguments,
authenticated subject, role/office, principal, resource,
scene and affected-party loci, policy, appraisal frontier,
repair/reconciliation obligations, stable request key
```

Protocol envelope, connection, process, and wall-clock arrival do not change
semantic identity.

### 9.2 Effect state machine

```text
ARTICULATION_ADMITTED
  → INVOCATION_WITNESSED
  → APPRAISAL_WITNESSED
  → COORDINATION_WITNESSED?
  → EFFECT_INTENT_WITNESSED
  → EFFECT_NOT_STARTED | EFFECT_POSSIBLY_STARTED
  → OUTCOME_WITNESSED | INDETERMINATE
  → REPAIR_OR_RECONCILIATION?
```

No handler receives an effect port before truth-only invocation standing and
required coordination evidence. No success response precedes witnessed
outcome.

### 9.3 Redelivery and retry

- Same stable request key resolves to the same invocation.
- A witnessed outcome is re-projected without re-execution.
- A local execution already holding the scoped effect coordinate may be
  followed/attached.
- Before possible effect start, reacquisition follows the explicit replay
  profile.
- Possibly-started external effect without outcome is `indeterminate`; automatic
  retry is forbidden.
- Reconciliation is a separately generated endpoint and invocation.
- Deliberate retry creates a new invocation with `retryOf` evidence.

### 9.4 Encounter geometry

An encounter before terminal evidence is a causally closed prefix/future cone
from its opening. It is not yet an ordinary completed diamond.

A terminal claim supplies a candidate upper endpoint and candidate diamond.
Multiple incompatible terminal claims produce a contested family of candidate
diamonds. A truth-only terminal appraisal may yield a completed bounded region.

A deshrouded live proxy is a distinct `ProxyDiamondReadout` with its own proof
target and standing. It cannot satisfy terminal-only policies until the promised
proxy-to-true relation is earned and explicitly selected.

Streaming projects witnessed prefixes; finite response folds an admissible
terminal section. Reader cancellation detaches the reader. Execution
cancellation is a governed invocation whose outcome causally supports a
terminal claim. Checkpoint/resumption exists only under a declared port profile.

Productive transfinite/aperiodic encounters may remain open. Their policies name
prefix-local safety, resource bounds, and observation cuts without claiming
global quiescence.

## 10. Replication, crash recovery, and multi-dish operation

### 10.1 Replica product

The replicated source product contains immutable artifacts, witness cores,
causal dependencies, constitutive profiles, attestations, measurement matter,
and scoped coordination witnesses. Quarantine is separate from admitted matter.
Catalogs, indexes, heads, protocol descriptors, state, records, and content are
rebuildable readouts.

Replica merge is component-wise validated set union. The product convergence
theorem—not FOUR join alone—must prove canonical-map union, dependency
validation monotonicity, causal closure, settlement homomorphism, and equal
derivation from equal inputs.

### 10.2 Partial observation and shrouds

Every dish reports its observed source frontier and readout lens. A partial
replica may serve read-only results only with that exact coordinate and loss/
staleness statement. It never claims absence outside its closure.

Cross-settlement effects originate at live boundaries and are witnessed in the
participating causal histories. Conurbation remains non-hierarchical. The
stronger Hole/diamond functoriality target is retained but not claimed as
already proved.

### 10.3 Recovery

Recovery:

- ignores private preparations;
- verifies exact bytes at every address;
- reconstructs dependency closure from source objects, never indexes;
- quarantines missing-profile, missing-cause, cyclic, corrupt, or conflicting
  material with explicit obstructions;
- deterministically rebuilds admitted sets, frontiers, catalog generations,
  standing, indexes, and protocol projections;
- reconstructs encounter prefixes and effect intents;
- never retries a possibly-started effect automatically; and
- never elects a root authority because a process restarted first.

The fault suite interrupts every prepare, flush, create-only publication,
directory flush, dependency arrival, validation, derivation, intent, effect,
outcome, and response boundary under concurrent writers and readers.

### 10.4 Resource exhaustion boundary

“Witness every ingress” applies only after bounded structural articulation. A
site may reject oversized, malformed, over-budget, or incomplete transport
frames before they become semantic matter. It may witness bounded aggregate
refusal measurements without retaining attacker-controlled payloads.

Unique-input flooding, dependency bombs, canonicalization depth, causal fanout,
proof checking, derivation work, and quarantine custody all have explicit
resource envelopes. Exceeding one yields a bounded obstruction and cannot force
unbounded plate growth.

### 10.5 Confidentiality

Secret-bearing payloads are excluded from semantic identity and durable matter
by default. A privacy profile may admit:

- minimal canonical metadata;
- a keyed commitment rather than a guessable bare digest;
- encrypted custody material with a governed disclosure policy; or
- a prohibited-capture obstruction.

Key access and cryptographic erasure are governed effects with receipts.
Collection claims state what metadata, ciphertext, commitments, and inference
risk remain; “deleted” never means more than the proven custody scope.

## 11. Self-generation and autonomic action

Self-generation may derive endpoint/readout proposals, obstructions,
conformance evidence, forms, protocol projections, work obligations, activation
recommendations, repair plans, and collection candidates.

Every derivation names source matter frontier, program, lens, policy, and
resource envelope. Repeating it from semantically identical support has one
identity and zero surprisal.

An autonomic feedback move must prove one of:

- new causal exterior evidence supports the new articulation;
- the derivation is idempotent at its source frontier;
- a well-founded measure decreases; or
- it belongs to an explicitly bounded/transfinite/aperiodic productive regime
  whose resource and observation policy is admitted.

A projection cannot be its own novel premise. A generated proposal crosses the
articulation aperture and is appraised like any other claimant. It cannot grant
itself capability or select its own policy.

## 12. Retention and collection

### 12.1 Custody-scoped roots

Retention roots include the site constitution, retained witnessed causal
closures/frontiers, open reconciliation/effect intents, retained generations
and activations, artifacts needed to reconstruct promised readings, role and
accountability evidence, replica/export custody promises, privacy/key custody,
and explicit retention claims.

### 12.2 Collection standing

```text
CollectionStanding(custodyScope, artifact, frontier, policy) ∈ FOUR
```

Truth-only collection requires explicit evidence of non-reachability within the
named custody scope, discharged obligations, closed reconciliation windows,
released replica/export promises, preserved reconstruction commitments, and
satisfied grace/resource measurements. Unknown or both blocks deletion.

A local collection receipt never claims global erasure. Offline constituents
may retain their copies. Collection receipts themselves remain durable matter
unless separately and lawfully collected under a higher custody proof.

## 13. Representation map

| Semantic/material object | Durable form | Runtime/readout form | Protocol form | Required evidence |
|---|---|---|---|---|
| site constitution | canonical immutable artifact | mounted bare rule | site identity/profile descriptor | profile schema and law correspondences |
| witnessed articulation | witness core + referenced artifacts | causally indexed matter | utterance/evidence projection | structural admission and causal closure |
| frontier | pure causal manifest | selected closure/antichain | exact as-of coordinate | closure/maximal-antichain vectors and proof target |
| program semantic class | term artifact + typing/normalization/equivalence receipts | evaluator input/readout | portable program descriptor where lawful | Lean/runtime language correspondence |
| generated descriptor | derivation output artifact | immutable decoded readout | discovery/schema/form/tool/resource view | derivation and standing receipt |
| catalog readout | descriptor graph manifest | finite indexed reading | static discovery | permutation/rebuild equality |
| catalog generation | derivation receipt | reconstructed generation | generation coordinate | source frontier/program/lens evidence |
| binding | attestation artifact | least-privilege handler port | provenance readout only | ABI/effect/replay/recovery conformance |
| activation | manifest plus standing claims | scoped deployment reading | activation coordinate/status | binding/policy/coordination appraisal |
| dynamic readout | result plus receipt | observer/query/lens result | cut/feed/form/rendered resource | source, authority, budget, loss receipt |
| invocation/effect | causal witness chain | supervised local execution | request/response/stream envelope | truth-only gates, retry/crash evidence |
| encounter | prefix, terminal claims, proxy/diamond readouts | reconstructed causal region | stream/finite presentation | prefix/terminal/proxy laws |
| measurement | observation witness | situated instrument result | evidence/readout projection | calibration, provenance, uncertainty, privacy |
| collection | standing and deletion receipts | custody-scoped physical action | audit readout | non-reachability/release proof |

## 14. Conformance and adversarial vectors

No implementation claims this architecture until it supplies:

1. canonical artifact vectors and independent implementation;
2. explicit rejection of `sha256:<hex>` and every bootstrap target form;
3. typed term/normalization/equivalence vectors separating artifact from
   semantic identity;
4. structural-admission corpora for missing causes, causal cycles, corrupt
   bytes, same-address/different-byte, profile gaps, and dependency bombs;
5. concurrent multi-writer crash/fault matrices with no global writer lock;
6. pure frontier reconstruction and merge under input permutation, partial
   observation, spacelike events, and dominated-tip removal;
7. exhaustive FOUR cut vectors for visibility, binding, invocation, projection,
   activation, and collection;
8. identity-splitting, duplicate-support, circular-support, and cross-protocol
   non-amplification attacks;
9. generated endpoint/carrier derivation and free-schema rejection vectors;
10. explicit maturity for every promissory Yoneda/CHL/Hoare/Hole/CALM claim;
11. semantic evolution vectors for equivalence, refinement, loss, and
    replacement;
12. static discovery versus dynamic observer/lens/query separation tests;
13. protocol input-injectivity and output-loss round-trip matrices;
14. transport-overlap agreement and non-circular sealing tests;
15. role/scene/affected-party/refusal/repair/accountability scenarios;
16. effect intent/crash/indeterminate/reconciliation/redelivery tests;
17. encounter prefix, multiple terminal, proxy, cancellation, checkpoint, and
    productive open-regime tests;
18. replica convergence for the whole validated product, not only FOUR values;
19. resource exhaustion tests for framing, canonicalization, quarantine,
    dependency closure, proof checking, and autonomic feedback;
20. privacy tests for low-entropy secrets, disclosure, key loss/erasure, and
    residual inference claims;
21. custody-scoped retention tests with offline replicas and late promises;
22. deletion/rebuild equality for every derived readout; and
23. clean-site and optional re-articulation migration proofs.

Every receipt names exact claim scope. A narrow green test cannot discharge a
broader mathematical or operational claim.

## 15. Migration from bootstrap machinery

The default migration is a clean target site. Nothing in the current runtime is
important data or an external compatibility obligation.

### M0 — inventory and disposition

Inventory catalogs, operations, schemas, terms, mounts, handlers, capability
witnesses, protocols, journals, resources, prompts, policies, and live writable
paths. Mark each concept `re-articulate`, `rederive`, `boundary-port candidate`,
`research evidence`, or `discard`. Current existence confers no target standing.

### M1 — constitutive profiles and artifact identity

Specify `SiteConstitution`, self-describing `ArtifactRef`, canonical bytes,
primitive articulation, resource envelopes, and exact rejection of bootstrap
references. Establish a clean target site.

### M2 — causal witnessed matter

Implement immutable multi-writer reception, quarantine, deterministic structural
admission, pure causes, frontier derivation, partial replication, and recovery.
Do not introduce catalog or effect execution yet.

### M3 — language and generated readouts

Earn runtime/formal term profiles, artifact/semantic identity distinction,
carrier generation, representation legs, measurement instruments, roles, and
law correspondences. Re-articulate selected useful concepts as new target
matter.

### M4 — catalog generations

Derive finite catalog readouts and generations from target frontiers. Verify
permutation/rebuild equality and obstruction visibility. Current
`OperationCatalog` is only an inventory oracle, never an adapter.

### M5 — bindings and activation appraisal

Replace `WeakMap` handler identity with binding refs and boundary ports. Add
truth-only activation/binding/invocation appraisal, non-amplification evidence,
and scoped coordination witnesses. No territory-wide authority process is
introduced.

### M6 — protocols and generated surfaces

Build new target protocol profiles, static discovery, dynamic readouts,
generated forms/UI, transport agreement, and direction-specific loss laws.
Bootstrap names and wire shapes remain rejected.

### M7 — effects, encounters, autonomy, and collection

Enable governed effects only after crash/retry/reconciliation evidence passes.
Then enable encounter open-regime handling, idempotent autonomic feedback,
privacy custody, and semantic collection in that order.

### M8 — remove bootstrap paths

Remove bootstrap catalogs, synthesized standing, direct handlers, alternate
protocol runtimes, read-time writes, old journals, and source authority. Offline
research importers may remain outside the target runtime and produce only new
articulations plus transformation receipts.

## 16. Current-to-target disposition

| Current mechanism | Target disposition |
|---|---|
| `contentAddress(canonical JSON)` | exact bootstrap artifact mechanism only; replace with profiled `ArtifactRef`, never semantic identity |
| `Operation` authored domain/codomain | proposal/inventory input; target endpoint/carrier is generated and witnessed |
| `OperationCatalog` | remove; target catalog is a derived readout over settlement matter |
| default effects/replay/coordination | remove; omission is obstruction |
| direct `projectSurface` collection → held | remove; no ungoverned synthesized standing |
| `WeakMap<Operation, handler>` | binding-ref keyed boundary-port table |
| package schema `$id` | bootstrap presentation only; target carrier and representation loci are generated afresh |
| inline/stored RMN terms | re-articulate under a pinned target language/type profile or discard |
| content-addressed statement files | useful prototype; replace legacy refs, silent corruption skip, missing-cause admission, and index-authority seams |
| cause side indexes | rebuildable acceleration only, never cycle/closure authority |
| process-local encounter control | effect-port observation only; durable cancellation/terminal evidence governs semantics |
| current resources/prompts/forms | inventory of candidate derivation programs/lenses; no compatibility surface |
| singular authority bins/process | protocol/dish readouts; monotone matter is multi-writer and effects coordinate only by locus |
| theorem-name strings | scoped law-correspondence readouts with exact signatures, hypotheses, axioms, and realization evidence |

## 17. Formal targets to earn

The architecture deliberately keeps stronger intended mathematics as targets:

1. pure causal maximal-antichain frontier identity, closure uniqueness, merge,
   and partial-observation laws;
2. a category of lawful causal sets/morphisms and the promised Hole/diamond
   endofunctor with identity/composition preservation;
3. the Infography-specific Yoneda/CHL theorem deriving endpoint carriers from
   admitted program morphisms;
4. RMN runtime/formal syntax, typing, normalization, resource, and semantic
   equivalence correspondence;
5. generated Hoare/keratinous carrier composition with identity and
   associativity;
6. whole validated replica-product convergence;
7. non-rooted appraisal non-amplification and grounding;
8. measurement/instrument realization correspondences;
9. transport cover/agreement and gluing;
10. prefix/proxy/true-diamond relations, including deshrouding;
11. Sequencing–Whirling/open-regime laws needed for productive encounters; and
12. custody-scoped collection safety.

Current exact theorem signatures and axiom audits are recorded in the linked
adversarial assessment. Promissory targets constrain design but cannot be cited
as current guarantees.

## 18. Implementation gate

The architecture has survived the adversarial pass only in this revised form.
The assessment maps every counterexample to a normative rule, the requirement
audit finds no contradiction with the five ratified choices, and the exact
formal-scope audit separates checked theorem scope from target-unproved claims.

The separately proposed and approved M0–M3 campaign now fixes those boundary
decisions and locally realizes only M1. M2 causal witnessed-matter design may
now be proposed from the campaign's fixed interface, but M2 implementation
requires separate approval. Catalogs, generated readouts, bindings, activation,
protocols, governed effects, migration adapters, and semantic collection remain
unauthorized until their corresponding campaign stage is separately reached
and verified.
