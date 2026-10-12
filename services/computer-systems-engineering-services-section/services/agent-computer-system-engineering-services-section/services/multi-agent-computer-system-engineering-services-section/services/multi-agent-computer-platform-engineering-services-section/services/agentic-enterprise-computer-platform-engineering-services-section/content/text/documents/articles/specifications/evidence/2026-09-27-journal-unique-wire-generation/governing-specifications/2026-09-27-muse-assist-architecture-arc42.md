---
title: muse-assist architecture description in arc42 form
date-created: 2026-09-27
type: architecture-description
status: derived draft; input to SAS; no implementation conformance claimed
derived-from: 2026-09-27-muse-assist-requirements.md
derived-from-sha256: 934d4353b2cca21b3d8034780f88dc3844984eb9e6e9a7755c850a540173faff
---

## What this is

This arc42 description derives an architecture for the [requirements](2026-09-27-muse-assist-requirements.md), which derive from the [customer demand](2026-09-27-muse-assist-customer-demand.md). It describes useful transformations and their boundaries before allocating implementation contracts in SAS, HLD, and LLD. It is an inference-assisted design artifact, not a report of a deployed system or a claim of conformance to an external architecture standard. Decisions below are engineering derivations and remain distinguishable from customer quotations and unresolved questions.

## 1. Introduction and goals

The system turns a person's authorized intent into continuing, accountable work and useful effects. A request can involve research, communication, scheduling, computer execution, artifacts, and coordination with other people or agents. Its completion belongs to the receiving context. A public site lets prospective users and contributors understand that capability and its actual state of realization.

The quality priorities are: preserve authority and meaningful outcomes (R-01, R-06–R-09); retain context and continuity with honest uncertainty (R-03–R-05); achieve assessable competitive capability at sustainable cost (R-02, R-10–R-11); and make development reproducible from specifications (R-14–R-16). These priorities do not turn incomplete work into accepted work.

Stakeholders are the person receiving assistance, other affected people, holders of personal/organizational records, operators, capability providers, the 561 Group's engineering and operating functions, and prospective users/contributors. One person may occupy several roles. Authority must remain attributable to the role and scope in which an action occurs.

## 2. Constraints

`muse-assist` specializes [MetroPlat](../../../../../../../../../../../../../../../../../content/text/glossary/terms/metroplat.md), a platform on [MARSH](../../../../../../../../../../../../../../../../../content/text/glossary/terms/marsh.md), rather than redefining the current Node host as the platform. MARSH is the EVM library for group operations, with off-chain effects supplied through other packages. Its current definition requires [FeltOS](../../../../../../../../../../../../../../../../../content/text/glossary/terms/feltos.md). FeltOS is defined as a multi-agent MUD engine intended to add ActivityPub++ over shared execution capabilities; actual protocol conformance remains an acceptance obligation. The [JSNode Hoare engine](../../../../../../../../../../../../../../../../../content/text/glossary/terms/jsnode-hoare-engine.md) is the unnetworked package-execution capability, not a personal assistant. These definitions constrain decomposition; the existence of packages does not establish an end-to-end realization.

The dependency direction remains data → code → networking → systems. Private context, credentials, and unrelated organizational records cannot be published merely because platform coordination uses on-chain state. Existing rights remain unchanged pending the release license decision. Every source change and migration must have the specified ancestry and generation/codemod path.

The naming and dependency definitions have changed over time. The September 26 MARSH definition takes precedence over its retained earlier specialization table for MARSH's current meaning. Detailed integration must expose any remaining incompatibility instead of choosing whichever historical definition makes existing code easiest to retain.

## 3. Context and scope

| Boundary participant | Input to the assistant | Result or constraint carried back |
|---|---|---|
| Person requesting work | Intent, corrections, preferences, grants, decisions | Plan, useful result, progress, requested decision, attributable effects |
| Enterprise knowledge and work | Relevant records, duties, applicable procedures, conflicting evidence | Scoped observations, obligations, decisions and witnessed outcomes |
| MetroPlat/MARSH platform | Shared work and resource relations, admitted coordination and settlement facts | Lawful platform transitions with references to externally established effects |
| Computer and connected services | Authorized observations, tools, execution environments, provider outcomes | Bounded commands; acknowledged effects or explicit unknown/refusal |
| Other people and agents | Authorized messages, commitments, delegated results | Attributable requests and responses within separately held authority |
| Public visitors | Reading and navigation | Accurate product, development, evidence, and release information |
| Fabrication process | Governing specifications and current input carriers | Derived artifacts, proposed transformations, independent evidence and realization receipts |

The application owns the personal interaction and composition of these effects. It does not acquire ownership of general inference, execution, credential custody, networking, scheduling, or knowledge semantics merely because it uses them. The site has no authority to execute personal work or expose private work records.

## 4. Solution strategy

**A-01 — One continuing work path (R-01–R-05, R-08).** Represent intent, selected work, attempts, human decisions, and receiving evidence as related records in their proper carriers. Derive personal views from those records. Do not create an independent commitment notebook whose status competes with operational work. Preserve distinctions between a request, a plan, an authorized attempt, and an accepted effect.

**A-02 — Proposals separated from effect authority (R-06–R-07, R-09).** Inference may suggest work and tool inputs. Authorization, credential use, effect admission, and acceptance operate at independently enforced boundaries. Untrusted source content cannot grant rights. The same controls apply to foreground conversation, scheduled work, and delegated agents.

**A-03 — Platform specialization with explicit off-chain carriers (R-08–R-09).** The specialization must establish a lawful MetroPlat/MARSH platform boundary and declared off-chain computer/service capabilities. Before allocating any shared work or resource transition, HLD must define its carrier, authority, confidentiality, and proof/reference semantics. The platform definitions alone do not establish that user intent, grants, personal context, or accepted external effects have an admissible on-chain representation. Retain private personal evidence at an appropriately controlled carrier. Exchange only the facts and references required for the shared transition under explicit authority; a digest is not automatically safe to publish. Finality of an on-chain transaction is not proof that an email, booking, or artifact was correctly received.

**A-04 — Derive views and implementations (R-11–R-16).** The website, human work views, runtime composition, and upstream transformations receive separate fabrication obligations derived from the same requirements. Avoid a new universal framework merely to implement this chain. Existing generators and codemods are candidates where their contracts fit; missing transformations receive specifications before realization.

## 5. Building-block view

These are responsibilities, not mandated packages, processes, databases, or new services.

| Responsibility | Transformation and necessary property | Governing requirements |
|---|---|---|
| Personal interaction | Interpret a request in relevant context; present progress, artifacts, and attributable decisions | R-01, R-02, R-04, R-05, R-06 |
| Knowledge and evidence | Retain scoped observations and sources; derive warranted context without erasing contradiction | R-04, R-09 |
| Work selection and coordination | Relate intent to executable, authorized work; preserve continuity and dependencies | R-01, R-03, R-06, R-08 |
| Effect execution | Admit a bounded operation, use protected credentials where required, obtain its real result | R-01, R-06, R-07 |
| Receiving and learning | Compare observed effect with the receiving condition; retain uncertainty, refusal, and correction | R-01, R-03, R-04, R-09 |
| Public presentation | Project substantiated product/development/release information for visitors | R-10, R-12, R-13 |
| Fabrication and transformation | Derive artifacts and migrations from closed specifications; retain independent evidence | R-11, R-14, R-15, R-16 |

HLD must allocate these responsibilities to the smallest coherent composition. Existing code may supply several responsibilities or none. A general mechanism's suitable owner must be derived from its capability and consumers; moving a directory or extracting a wrapper is not sufficient.

## 6. Runtime view

**Conversation to effect.** A person's input is interpreted with authorized context. The assistant relates the intended outcome to relevant duties, tools, and receiving conditions. A proposed next action is checked against authority and constraints. If a human decision is needed, work remains waiting with a clear proposed effect. An admitted action executes at its actual capability boundary. Observation of the result feeds the next selection or the receiving assessment. The user sees progress and a usable result without needing to interpret internal machinery.

**Continuation and concurrent work.** Relevant events and time conditions make existing work eligible; they do not recreate intent or issue new authority. Selection uses current evidence, grants, dependencies, and conflict information. After interruption, a new executor recovers the recorded attempt and checks whether an effect occurred before retrying. Several goals may proceed concurrently while their context and authorities remain separate. Contested resource or time constraints surface a real decision rather than an invented preference.

**Correction, refusal, and revocation.** A correction changes subsequent eligible context and preserves the provenance needed to explain earlier decisions. A revoked or expired grant prevents later effects, including those proposed before revocation. An effect whose outcome cannot be established remains uncertain. Cancellation stops further selected work and reports effects already committed or still uncertain; it does not pretend to undo them.

**Development change.** A changed demand produces revised requirements and affected architectural/design obligations. Fabrication consumes the resulting specification and the declared input state. Independent assays evaluate the result; failed candidates do not become accepted through in-place improvisation. A codemod applies only to an input satisfying its preconditions and demonstrates retained effects in receiving consumers. The public view changes only when its evidence inputs justify the claim.

## 7. Deployment view

The public informational site and authenticated personal operation have distinct exposure and data requirements. A public asset deployment does not imply deployment of the assistant. The intended operational composition includes a personal interaction surface, off-chain execution and protected data boundaries, and access to the MetroPlat/MARSH platform under explicit identities and authority.

No provider, container product, database, chain endpoint, browser broker, or multi-user topology is selected solely from existing code. HLD must choose a deployment realization that enforces R-03, R-06, and R-07, with failure/recovery and confidentiality boundaries. Existing local Node operation hosts are migration evidence; they cannot stand in for a demonstrated MetroPlat/MARSH specialization.

## 8. Cross-cutting concepts

**Identity and authority:** distinguish person, context owner, operator, worker, provider, issuer, and recipient. Link delegation to scope, time, and revocation. Authority cannot arise from model fluency or a caller-supplied identifier alone.

**Evidence and uncertainty:** distinguish source claims, observations, deductions, proposals, effects, and receiver acceptance. Preserve incompatible evidence. Show what remains unknown and which observation or decision could resolve it.

**Continuity and costs:** preserve work independently of an open browser or one process. Retain enough attempt and effect information for recovery without unbounded repetition. Record generation/inference cost and human intervention where available; exact budgets belong to the declared operating envelope.

**Privacy and external effects:** isolate credentials and restrict data use and disclosure. Shared on-chain coordination must not silently export personal context. Provider acknowledgements, settlement, and human acceptance are different observations.

**Distribution:** distributable source and site artifacts must retain ownership and dependency provenance while excluding private operational records and credentials. SAS/HLD and fabrication contracts must carry this boundary through staging and release; an unresolved license does not excuse losing provenance during development.

**Derivation:** each document has a predecessor and each obligation carries a requirement source. Assays are derived from the contract, not reverse-engineered from candidate source. Public product claims have an evidence boundary distinct from engineering intent.

## 9. Architecture decisions and alternatives

A-01 replaces a duplicate notebook with views of continuing work because a notebook alone does not produce or establish the receiving effect. A-02 keeps effect authority outside model discretion because the model processes untrusted material. A-03 honors the intended platform specialization while preventing on-chain records from being confused with private context or external outcomes. A-04 uses specifications as production inputs and prevents the first implementation from becoming its own justification.

Retaining the present all-purpose Node package as the target would simplify initial wiring but contradict the current platform definition and retain mixed maintenance obligations. Recreating every mechanism in a personal-agent server would duplicate both semantics and enforcement. Copying Meta's VM topology would not establish the required effects or fit the local platform by itself. These alternatives are rejected as default destinations; individual existing mechanisms remain eligible where the derived contracts justify them.

## 10. Quality requirements

The Requirements scenario table is the initial quality-scenario source. SAS must make correspondence and acceptance obligations explicit; HLD must show each scenario crossing the necessary responsibilities; LLD must expose preconditions, state transitions, failures, and receiving conditions; fabrication specifications must close each generated or transformed artifact's contract.

No quality claim is established by this document. Particular evidence must distinguish live effects from fixtures, state the operating context and limits, and substantiate the breadth of any competitive claim. “Meet then beat” remains a measured product objective, not an architectural adjective.

## 11. Risks and technical debt

The largest demonstrated risk is process substitution: writing code first and calling a later description its specification. Existing session changes exhibit that risk. A second risk is using the legacy MetroPlat package concentration as the intended system boundary. A third is mistaking a scheduler and bounded tool loop for reliable continuing assistance. A fourth is conflating platform settlement with external effect or receiver acceptance. A fifth is treating supplier claims as independently measured baseline performance.

Current source-bearing JSNode projection is useful for materialization but does not discharge source-free derivation. It must not be advertised as doing so. The current app candidate also references an HTTP module absent from its source; this is evidence of candidate incompleteness, not a reason to repair that implementation before its design is derived.

## 12. Glossary

Customer demand is the desired change and its authoritative constraints. A requirement is an assessable obligation on the receiving world or supplied behavior. A specification constrains admissible realizations. Fabrication derives an artifact; a codemod transforms an existing carrier under stated preservation obligations. Admission, successful execution, observed effect, and receiver acceptance are distinct. Muse names Meta's reference product; `muse-assist` names this project.

## Open questions

- **A-O1 — Platform integration.** HLD/LLD must establish which MetroPlat/MARSH transitions represent personal/enterprise work and which evidence must stay off-chain. The necessary privacy, authority, finality, and effect contracts must precede integration code.
- **A-O2 — Formal correspondence.** SAS must name the applicable current science definitions and what evidence would establish their relation to R-09. No correspondence is asserted from terminology alone.
- **A-O3 — Generation and independent assessment.** SAS/HLD must specify the smallest missing derivation capability and its separation from independent assays; the existing source projector does not determine that design.
- **A-O4 — Operating envelope.** Requirement Q-01 remains open for live comparison access, representative tasks, and numerical cost/quality thresholds. Engineering can continue deriving the architecture and protocol without claiming competitive acceptance.
- **A-O5 — Live grants and release.** Requirement Q-02 and Q-05 remain decisions of their named authorities. No live external action or public package release is authorized by this draft.
