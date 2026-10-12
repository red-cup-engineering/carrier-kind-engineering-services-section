---
title: High-level design for muse-assist
date-created: 2026-09-27
type: specification
status: derived draft; responsibilities and interfaces; detailed contracts pending
derived-from: 2026-09-27-muse-assist-sas.md
derived-from-sha256: aa5e289627b2a73e0327060496b68a8ab32337e6817424f6a10c53b8d5579735
---

## What this is

This HLD refines the [SAS](2026-09-27-muse-assist-sas.md) into carriers, transformations, interfaces, and lifecycle responsibilities. It allocates the full Requirements scenario family without preserving the current package topology. Names below denote interfaces/responsibilities, not demands for one package, database, or process per row. LLD must close the unresolved detailed contracts before dependent fabrication.

## Carrier and responsibility decomposition

| Element | Carrier and transformation | Inputs and outputs | SAS |
|---|---|---|---|
| H-01 Personal interaction | A person's conversation and decisions become attributable intent/corrections; work evidence becomes understandable progress/results | Authenticated principal/context scope + message/decision → intent or decision event; scoped work projection → accessible view/artifact | S-01, S-03, S-06, S-07 |
| H-02 Knowledge and observation | Sourced observations become admissible context while preserving provenance, conflict, freshness, and use scope | Scoped observation/correction + evidence rules → evidence carrier/query result, never a grant | S-07–S-09 |
| H-03 Work regulation | Intent and current context become proposed, authorized, and recoverable next work | Intent + eligible observations + rules + applicable authority → plan/attempt/decision request; result → next eligible work or receiving assessment | S-03–S-06, S-09 |
| H-04 Capability execution boundary | An admitted action becomes a bounded effect and separately observed result | Typed operation request + live authority + effect identity → refusal, uncertain attempt, or effect result | S-04–S-07 |
| H-05 Platform participation | Shared resource/work facts become lawful MetroPlat/MARSH state and independently verified reads | Admissible platform transition + controller authorization + expected head → observed chain result; resource reference → verified state/evidence | S-02, S-04–S-06 |
| H-06 Public information projection | Approved source claims and release facts become accessible public pages | Public content/specification + evidence references + presentation constraints → static/public assets and claim correspondence | S-07, S-13–S-15 |
| H-07 Specification realization | Closed behavioral/design obligations become source, codemods, assets, and independent evidence | Content-bound ancestry + work order + provider/assay conditions → candidate or typed refusal; candidate + independent assessment → realization evidence | S-10–S-13 |

H-01 and the domain-specific choices in H-03 form the personal application. H-02's data semantics, H-04's general execution, H-05's platform semantics, and H-07's fabrication capabilities remain shared. A module may implement multiple related transformations where that is the smallest coherent realization. The MAPE-K functions run across H-02/H-03/H-04, without separate stage services.

## Data precedes executable behavior

LLD must first define these data contracts and their laws:

- **Intent:** accountable origin, context owner/scope, requested receiving outcome, applicable constraints, source and revision. An inferred plan is a separate derivation.
- **Observation:** subject, source, method, time/freshness, value, use/disclosure scope and conflicting evidence relation. Its truth/knowledge carrier is governed by S-08; a boolean is insufficient.
- **Work reference:** identity, intent/derivation reference, relevant dependencies, selected action or waiting condition, and outcome evidence. This is a projection/reference onto operational work, not a new authoritative notebook.
- **Effect proposal:** operation and version, input, destination/recipient, data disclosed, resource/cost scope, expected receiving condition, applicable authority, and stable effect identity.
- **Decision:** exact proposal revision, deciding principal and authority, disposition and validity interval. Natural-language discussion alone is not the machine's decision evidence.
- **Attempt/outcome:** proposal/decision references, executor/provider, current attempt state, acknowledgements, observed receiving state, errors/uncertainty, and causal evidence. An attempt can finish while the goal remains open.
- **Artifact:** content identity, representation/media type, receiving/use constraints, source and goal relationships, access and retention scope. An artifact can outlive one chat.
- **Platform reference:** chain identity, contract address/code identity, resource key and kind, controller, expected/current content head, sequence, verified block boundary, and resolution/evidence policy. It is neither a personal identity nor proof of a receiver's effect.

These logical contracts may reuse current records when their actual semantics conform. LLD must state lossless mapping and refused legacy cases before a migration. No new table is implied by listing a logical contract.

## Interface and dependency design

**H-I1 — Admit intent and decisions.** H-01 invokes declared H-03 transitions under authenticated human authority. Input cannot override principal identity or access another context. H-03 emits a work reference, a clarification/refusal with a specific missing condition, or an attributable decision result. H-01 receives scoped progress through a query/event interface. It must not infer success from HTTP status or a final model message.

**H-I2 — Query and correct context.** H-03 requests context from H-02 with goal, use scope, evidence/freshness constraints, and query. H-02 returns claims and their support/opposition and limitations, not a flattened answer declared true. H-01's correction path supplies attributable correction evidence and controls future use; it does not erase independent history or circumvent retention obligations.

**H-I3 — Propose and execute capability.** H-03 selects an operation and proposes exact input/receiver/effect scope. H-04 checks the current grant, any required human decision, contract preconditions, resource limits, and effect identity before execution. Model-generated code or browser operations run in an execution environment unable to bypass H-04's credential/disclosure/egress boundary. LLD must select and assay that enforcement boundary; the present Node worker alone does not supply it.

**H-I4 — Observe and receive.** H-04 returns provider observations, including unknown or partial outcomes. H-02 retains the evidence; H-03 compares it with the receiving predicate and routes any necessary human acceptance. Reconciliation queries the receiving system under its own authority. Recovery cannot simply rerun the last model request.

**H-I5 — Participate in the platform.** H-03/H-04 use H-05 only for a defined shared resource/work contract. H-05 validates the semantic transition and disclosure before preparing a controller-authorized EVM operation; it verifies the actual chain result at the declared boundary and resolves off-chain evidence under access control. Platform settlement and external receiving assessment are separate. A local fixture that bypasses H-05 cannot establish a conformant deployed MetroPlat specialization.

**H-I6 — Fabricate and publish information.** H-07 realizes H-06 from a public content contract and presentation specification. The result contains no private operational context. Content updates are transformations of source claims and evidence; deployment is a separately recorded effect. No public page may imply a supported package or comparative result absent from its inputs.

## Platform contract: recovered capability and required transformation

The current [MARSH EVM resource contract][marsh-contract] retains a controller, kind, content/evidence hashes, sequence, and existence flag. Its first admission selects the calling controller; later updates require that controller and the expected previous content. The [`read-marsh-resource` path][marsh-read] reads a head at a provider-verified block. These mechanisms are candidates for generic controlled resource retention. They do not yet establish personal work, delegation, or receiver acceptance.

**H-P1 — Separate semantics from head retention.** MetroPlat must define the admitted shared resource/work relation and its allowed transitions; MARSH may retain the corresponding content head and evidence digest/reference; evidence bodies and their validation remain outside that storage primitive. The off-chain record resolver must verify content identity, schema/kind, authorization to read, and transition evidence. Missing content or invalid semantics produces an explicit unavailable/refused result, never inferred platform truth.

**H-P2 — Bind identity and authority.** The current `resourceId` helper derives a domain-separated key, but `admitResource` accepts an arbitrary key without enforcing that derivation. A consumer must not assume the key proves the controller relationship. For the controller-bound identity used by this realization, resource admission must enforce the derivation at the on-chain boundary. LLD must specify that transition and its migration/compatibility behavior. Validation of a legacy arbitrary key can detect/refuse the wrong controller but cannot prevent another caller from claiming the key first; it is not an equivalent admission guarantee. Existing arbitrary-key resources may remain readable as explicitly unbound legacy records, without inheriting authority or automatic migration. Ordinary resource control must not be interpreted as personal/office delegation.

**H-P3 — Define the write effect.** Current MetroPlat catalog integration exposes reads, not a complete EVM signing/broadcast/confirmation/reconciliation route. A shared EVM transition capability must be specified with signer custody, grant checks, expected head, chain/contract identity, transaction reconciliation, and finality policy. No personal key enters model context. The parallel Hive Engine intent code does not fulfill the current entirely-EVM MARSH definition and must not be substituted silently.

**H-P4 — Choose shared facts deliberately.** Personal conversation, credentials, raw documents, and private task details stay in controlled off-chain carriers. A shared allocation or result may be represented on-chain only after its disclosure and semantic contract are determined; hashes may reveal correlation and are not automatically private. LLD must define what real platform work the application uses, not add an ornamental blockchain dependency to a separate agent runtime.

The exact resource/work relation remains a detailed-design gap. These constraints resolve the boundaries and required transformation, not the relation itself. Dependent runtime generation is refused until that contract is closed.

## Whole-work scenario allocation

| Scenario | Required path and receiving check |
|---|---|
| Personal coordination | H-01 intent/correction → H-02 constraints → H-03 schedule/communication proposal → human decision where needed → H-04 calendar/message action → receiving-system observation through H-02/H-03 → H-01 usable outcome |
| Executive operations | H-01 office-scoped request → H-02 institutional knowledge/duties → H-03 dependencies and delegated work → H-05 defined shared allocation where applicable → H-04 bounded effects → H-03 accountability/receiving assessment → H-01 brief and follow-through |
| Delegated digital work | H-01 goal → H-02 relevant source/constraints → H-03 plan → H-04 authorized research/computer/browser/artifact operations → H-02 artifact/evidence → H-03 receiving/use check → H-01 usable result |
| Proactive continuation | Relevant event/time condition → H-02 observation → H-03 selection against live authority and progress → H-04/H-05 admitted attempt → H-03 meaningful update or waiting condition → H-01 notification governed by user preferences |
| Interruption and correction | H-01 cancellation/revocation/correction or process recovery → H-03 reconcile retained attempts and H-02 context → H-04 inspect receiver if authorized → stop/wait/resume with no duplicate effect or renewed authority |
| Public understanding | Public specification/evidence → H-07 generation and independent checks → H-06 rendered content/navigation → visitor understands scope, release, limits, and development path |

Every path must also exercise its adverse case from Requirements. Native client, email/calendar, browser, or agent-tool details are adapters to this same authority/work path, not parallel product runtimes.

## Fabrication design and independent channels

**H-F1 — Preserve the existing useful substrate.** The generic [artifact-fabrication admission/plan/receipt contract][fabrication] retains source spans, requirement/prohibition IDs, constraints, projections, acceptance obligations, traceability, and content digests. It rejects blocking open questions and incomplete trace coverage. Use those capabilities where their actual contracts fit. A nonempty `authority` string or evidence locator is not verification of authority or evidence content.

**H-F2 — Add only the missing derivation.** The new behavior-derivation boundary consumes resolved, content-verified predecessor artifacts and a closed language-neutral work order, target contract, bounded provider configuration, and commitments to independently held assays. It emits a typed refusal or candidate source/asset specification with clause-level correspondence and provider/cost provenance. Source text is output. Existing [`projectJsnodeModules`][projector] may then materialize generated JavaScript and schemas. Do not add a new general scheduler, model gateway, package manager, or application-specific fabricator merely to bridge this boundary.

**H-F3 — Keep assessor custody separate.** A distinct derivation prepares the behavioral assays from the work order before source generation. The source generator receives admitted examples and public constraints, not the private assay material. The assessor executes against content-bound candidate output and records results and limitations. Structural admission and semantic review are separate checks; semantic judgments must name their basis and unresolved points. Failed candidates remain rejected; a changed order or new evidence is a new derivation, not a rewrite of history.

**H-F4 — Transform consumers, not only files.** Each migration work order identifies actual input bytes/revision, retained capabilities/data, affected consumers, stale-input refusal, and retired route. Materialization occurs in a stage. The committed receiving state must be checked against the expected source revision before any replacement. The private operational record carrier must not be swept into generated package contents.

## Deployment and lifetime design

The informational site is a public read-only projection. Personal interaction is authenticated. The executor, authority/credential boundary, private evidence carrier, and platform signing boundary have separately stated trust and lifetime constraints, even if a deployment hosts some on one machine. Browser/client disconnection ends a response subscription, not the work obligation. Worker lifecycle and effect cancellation are distinct; shutdown must leave reconciliable attempts.

No claim of multi-user isolation follows from per-request IDs. LLD must determine enforcement between principals, untrusted code/browser content, stored credentials, and network destinations. A development fixture may exercise the contracts but must be labeled as such. Production topology and live accounts are not inferred from this document.

## Implementation and retirement allocation

Recover generic inference, typed execution, journal/knowledge, scheduling, protocol, and resource capabilities from current implementations by their actual effects. The application must not reproduce them privately. Retire the initial notebook operations, duplicate status authority, and any obsolete route only through a specified replacement that preserves necessary data and unrelated consumers. The first candidate's broken HTTP export is not repaired as an independent completion target.

The public site may be realized earlier through a closed content/presentation specification while platform and execution contracts are being completed. Its claims must continue to show that incompleteness; this ordering does not reduce the application objective or establish a product release.

## Open questions

- **H-O1:** Close the exact science-defined evidence carrier and formal-execution correspondence (S-O1) in LLD before epistemic runtime generation. It must preserve the requested richer carrier rather than silently reducing it to current four-valued plumbing.
- **H-O2:** Close the actual MetroPlat/MARSH work/resource relation, identity binding, signer/authority mapping, and finality/receiver contract (H-P1–H-P4). Current storage/read capabilities do not resolve these choices.
- **H-O3:** Select concrete runtime isolation and broker mechanisms for H-I3 with enforceable credential/data/egress controls. Reuse must be demonstrated, not assumed from current worker APIs.
- **H-O4:** Close source-free derivation request/result and independent assay custody in LLD. Existing admission and projection can be reused; no operational derivation claim is made yet.
- **H-O5:** Choose live evaluation/deployment context and obtain its actual external grants before live effects or competitive claims. License remains a pre-release customer decision.

[marsh-contract]: ../../../../../../../../../../../../computer-blockchain-system-services-section/apps/multi-agent-resource-sharing-host/src/MARSH.sol
[marsh-read]: ../../../../../../../../../../../../computer-blockchain-system-services-section/apps/multi-agent-resource-sharing-host/src/resource-read.mjs
[fabrication]: ../../../../../../../../../../../../computer-code-development-system-services-section/apps/computer-code-development-engine/src/artifact-fabrication.mjs
[projector]: ../../../../../../../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/src/project-jsnode-modules.mjs
