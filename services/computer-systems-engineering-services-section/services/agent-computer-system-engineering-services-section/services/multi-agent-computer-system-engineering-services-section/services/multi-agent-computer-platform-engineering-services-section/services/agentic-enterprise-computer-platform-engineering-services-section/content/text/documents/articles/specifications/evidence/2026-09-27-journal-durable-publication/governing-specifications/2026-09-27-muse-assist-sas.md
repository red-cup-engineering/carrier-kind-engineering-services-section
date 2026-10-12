---
title: System architecture specification for muse-assist
date-created: 2026-09-27
type: specification
status: derived draft; architectural obligations; not implementation acceptance
derived-from: 2026-09-27-muse-assist-architecture-arc42.md
derived-from-sha256: b8755ca2f08784696b1ddbb5c5bfc85245e5b25ec2045ccd3bce7c94513425e8
---

## What this is

This SAS governs the architecture derived in [arc42](2026-09-27-muse-assist-architecture-arc42.md) to satisfy the [requirements](2026-09-27-muse-assist-requirements.md). It states invariants, allocation rules, correspondence obligations, and evidence required of HLD and its downstream realizations. It does not import the historical MetroPlat SAS as the current platform boundary or claim conformance to ISO/IEEE standards not assessed here. Normative MUST/MUST NOT clauses constrain this project; proposed theory and unresolved mathematical correspondence remain labeled as such.

## Architectural identity and scope

**S-01 — Identity and coverage (arc42 §§1–3, A-01; R-01, R-02, R-12).** The system MUST retain the full personal, delegated digital, and executive work family and the public informational site as distinct receiving contexts. The HLD MUST map every Requirements assessment scenario through knowledge, selection, execution, human interaction, and outcome wherever those participate. A representation of work is not its effect. No narrower current implementation may redefine this scope.

**S-02 — Specialization and allocation (arc42 §2, A-03; R-08).** The application MUST specialize the intended MetroPlat platform on MARSH. The HLD MUST state which platform capability it uses, its input/output carrier, authority, and observed effect. Merely loading a module into the current Node package MUST NOT count as platform specialization. Generic data, code, networking, and system responsibilities MUST follow their dependency order and remain available to other consumers. Existing package placement MUST NOT determine ownership.

Before placing a personal-work fact on-chain, design MUST determine its meaning, disclosure authority, confidentiality consequences, update/revocation semantics, and relationship to external observations. Until that contract exists, a platform requirement MUST remain explicit and unresolved; it MUST NOT be replaced by a private copy of a vaguely similar runtime.

## Work, continuity, and receiving effects

**S-03 — Work correspondence (A-01; R-01, R-03, R-05).** A selected action MUST identify its originating intent, relevant context, applicable authority, preconditions, expected effect, and receiving condition. The work view MUST distinguish proposed work, ready work, execution in progress, waiting for evidence, waiting for a human decision, blocked/refused work, cancellation, and receiving acceptance. LLD MUST define transitions and allowed actors; these names do not prescribe a second task store or one enumerated state for all orthogonal conditions.

**S-04 — Recovery before repetition (arc42 §6; R-03, R-07).** Every externally consequential attempt MUST have a stable identity and enough retained evidence to reconcile an interruption. Before retrying an uncertain effect, the system MUST inspect the receiving carrier or use the receiver's idempotency contract. If neither can establish safe repetition, work MUST wait with the unknown outcome visible. Process restart, client disconnect, and date rollover MUST NOT erase open work or create new authority. Concurrency MUST preserve each goal's authority and context and prevent conflicting attempts under the same effect identity.

**S-05 — Acceptance is a separate observation (A-01, A-03; R-01, R-05, R-07, R-09).** An execution result, provider acknowledgement, model completion statement, platform settlement, and recipient acceptance MUST remain separately identifiable. Work requiring an external effect MUST close only under a declared receiving predicate backed by scoped evidence. Learning from an outcome MUST preserve the distinction between what was observed and what was inferred. A person may accept a result or revise the goal; the record MUST distinguish these acts from successful realization of the original goal.

## Authority, personal context, and execution

**S-06 — Independent authority (A-02; R-06, R-07).** Human/context-owner identity, request origin, worker identity, delegation issuer, provider, and recipient MUST be represented separately. Every effect boundary MUST enforce the applicable action, data, recipient/destination, time, and spending/resource scope. Retrieved content and model output MUST NOT issue or enlarge a grant. HLD MUST identify the enforcing boundary and how an executor cannot bypass it; describing a policy in a prompt is insufficient.

The decision carrier MUST bind a proposed effect to the deciding principal and the version of the proposal. A change of destination, substance, scope, or governing grant MUST invalidate reliance on an obsolete decision. Denial, expiry, revocation, and cancellation MUST be checked before further effects. Already committed and uncertain effects MUST remain visible after cancellation. Policy can permit classes of routine actions in advance; the system MUST preserve the difference between that prior grant and a newly requested decision.

**S-07 — Private knowledge and credentials (arc42 §§3, 8; R-04, R-06, R-07, R-13).** Personal context MUST have a use and disclosure scope, accessible provenance, and correction/retention behavior. Credentials MUST remain outside model-visible inputs and outputs and be used only by the authorized effect boundary. Private context, secret material, and operational journals MUST NOT enter public site/package outputs through fabrication, logging, fixtures, or diagnostic bundles. Distribution provenance MUST remain available without disclosing private operational evidence.

## Epistemic and regulatory properties

**S-08 — Evidence is not a boolean status (arc42 §8; R-04, R-09).** The knowledge carrier MUST preserve source-dependent support and opposition and keep informational accumulation distinct from truth evaluation. Contradictory evidence MUST NOT entail arbitrary conclusions, disappear through last-write-wins replacement, or silently become permission to act. HLD MUST name the selected science-defined carrier, its orderings, and the admissible projection to UI/control decisions. A finite four-valued display MUST NOT be represented as realization of the user's transfinitely-valued requirement without the required carrier and correspondence.

This obligation is grounded in the science [bilattice definition][bilattice] and its [engineering interpretation][engineering-bilattice]. Those sources establish conceptual distinctions, not an implemented muse-assist carrier or the complete requested transfinite construction. That exact correspondence is an open design obligation below.

**S-09 — MAPE-K without invented service boundaries (arc42 §8; R-09).** Monitoring MUST retain observations; analysis MUST expose the evidence and uncertainty behind a proposed adaptation; planning MUST identify an admissible change; execution MUST apply it through effectors; knowledge MUST support subsequent regulation. The [MAPE-K definition][mape-k] does not prescribe an algorithm or separate service per function. HLD MUST preserve these transformations without multiplying components solely to mirror the acronym.

A formal derivation MUST identify its premises, model/rules, conclusion, and applicable bound. Authorization to execute MUST be checked separately under S-06; receiving effects MUST be established separately under S-05. Heuristic model proposals MUST remain labeled proposals until the relevant proof and authority obligations are discharged. No declaration of “deductive planning” or “database-proof execution” is established by a chat response, schema check, or transaction alone.

## Fabrication, migration, and distribution

**S-10 — Directed derivation (A-04; R-11, R-14–R-16).** Each stage MUST carry the identity and digest of its predecessor inputs and trace derived obligations to those inputs. The next stage MUST refuse stale or incompatible input revisions and unresolved choices necessary to its output. A document stage need not cite future documents; final implementation must retain the complete applicable ancestry. Engineering choices may be resolved within the user's authorized scope with explicit rationale; a provider MUST NOT invent consequential product intent or an external grant.

**S-11 — Source-free behavior derivation (A-04; R-14, R-15).** Implementation source MUST be an output of a derivation from a sufficiently closed fabrication specification. Existing source MAY be used as migration evidence or a labeled reference case, but MUST NOT replace the behavioral contract. Existing source-bearing projectors MAY materialize the derived result; their structural validation MUST NOT be represented as derivation of the behavior. The missing source-free step MUST have a bounded contract, provider identity/configuration, cost/provenance where available, and explicit refusals. It MUST NOT become a new application-specific copy of generic execution or a universal framework without a demonstrated need.

**S-12 — Independent assay and receipt (A-04; R-11, R-15).** Acceptance obligations and assays MUST be derived before implementation source, with non-public assay material withheld from its generator, as required by the local code-fabrication specification. Evidence MUST identify the evaluated artifact/input digests, method, environment, assessor, result, and limits. Structural admission, complete trace fields, provider identity, and realization receipts alone MUST NOT establish semantic correctness or recipient acceptance. Failed candidates MUST enter the rejection path; revised specifications or changed evidence may justify a new candidate, but an unchanged retry is not a new independent channel.

**S-13 — Capability-preserving transformation (A-04; R-08, R-16).** A migration MUST name the input revision/carrier, retained effect and information, admissible transformation, refused inputs, destination, affected consumers, and obsolete route. It MUST be demonstrated against the consuming workflow and preserve unrelated concurrent work. Removal follows established replacement effects; neither a wrapper extraction nor a path move alone discharges this obligation. Source and dependencies retained for distribution MUST retain rights/provenance; public package release remains blocked on the license decision.

## Public claims and comparative acceptance

**S-14 — Evidence-bounded presentation (arc42 §§3, 10; R-10, R-12, R-13).** The site MUST project a coherent account of customer purpose, actual realization, limitations, development status, and release availability from identified sources. Meta's Muse MUST remain the reference product name; this project is `muse-assist`. Public factual claims MUST identify whether they are supplier assertions, observed outcomes, or intended behavior. Rendering success or a configured hostname MUST NOT be reported as a live deployment.

**S-15 — Comparative protocol (arc42 §10; R-02, R-10, R-11).** The initial comparison set is Meta Muse, Microsoft Copilot Cowork, and Google Gemini Spark, using their cited current supplier descriptions as capability evidence. Before a performance claim, each comparison MUST record platform/access/version date, task corpus and receiving conditions, supplied context, allowed actions, relevant settings, human intervention, time, cost where observable, result artifacts, failures, and limits. Evaluation MUST exercise personal, delegated digital, and executive scenarios, including interruption and authority failures. Unavailable access MUST be reported, not scored as the competitor's failure. “Beat” MUST name the measured advantage and any observed regression; no aggregate score or threshold may conceal an unmet required capability.

## HLD correspondence and acceptance obligations

| HLD view must establish | SAS obligations | Required evidence downstream |
|---|---|---|
| Carrier and responsibility allocation | S-01, S-02, S-08, S-09 | Named types/relations and transformations, actual consumers, science correspondence and explicit gaps |
| Work and human interaction | S-03–S-07 | Complete scenario paths, state transitions/actors, recovery and refusal cases, usable recipient result |
| Platform and off-chain effects | S-02, S-04–S-07 | Exact capability contract, privacy/authority/finality handling, independent external effect evidence |
| Derivation and migration | S-10–S-13 | Content-bound ancestry, closed work orders, independent assays, generated/codemodded output, retirement evidence |
| Site and comparison | S-14, S-15 | Source-to-claim correspondence, rendered behavior, current evaluation context and honest release state |

All R-01–R-16 requirements are allocated above. A correspondence table establishes coverage of statements, not their truth. HLD MUST refine these obligations without quietly deleting a hard requirement or imposing a package layout unrelated to the capability.

## Implementations

The recovered generic artifact-fabrication contract currently checks closed records, trace coverage, input digests, and plan/receipt completeness. Its authority fields and evidence locators do not themselves verify authorization, refinement, or independence. The JSNode projector consumes supplied JavaScript. These are useful existing capabilities under S-10–S-12, with a missing behavior-derivation step. No current application or upstream implementation is admitted by this SAS.

## Open questions

- **S-O1 — Evidence carrier (S-08, S-09).** Resolve the requested transfinitely-valued representation and formal execution correspondence from current science definitions before detailed epistemic contracts or claims. A boolean/four-state substitute is not an implicit resolution.
- **S-O2 — Platform representation (S-02).** Determine admissible MetroPlat/MARSH personal-work/resource relations and the off-chain proof/reference boundary. Existing resource ownership is not presumed to confer application authority.
- **S-O3 — Derivation realization (S-11, S-12).** Select a bounded provider/tool protocol and independent assay custody in HLD/LLD. An operator-mediated first realization may use existing capabilities if its evidence and separation satisfy the same contract; automation is not assumed from a tool name.
- **S-O4 — Comparison and operation (S-15).** Live access, numerical operating envelopes, and representative evaluation data remain Requirements Q-01/Q-02. They limit live claims, not derivation of the protocol.
- **S-O5 — Release (S-13, S-14).** Customer license decision remains required before package publication. It does not prevent source/provenance preparation.

[bilattice]: ../../../../../../../../../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/content/text/glossary/terms/bilattice.md
[engineering-bilattice]: ../../../../../../../../../../../../../../../../../content/text/glossary/terms/bilattice.md
[mape-k]: ../../../../../../../../../../../../../../../../../../science-services-section/services/engineering-science-services-section/services/systems-engineering-science-services-section/content/text/glossary/terms/mape-k.md
