---
title: Customer demand for muse-assist and muse.561.group
date-created: 2026-09-27
type: customer-demand
status: draft transcription of explicit customer demand
---

## What this is

This document records the customer demand expressed by emsenn in the 2026-09-27 development session. It is the input to requirements derivation for `muse-assist` and `https://muse.561.group`. It does not adopt the session's handwritten implementation as the design, declare competitive parity, or authorize public release.

## Requested change in the world

**CD-01 — Useful personal assistance.** The customer wants a new package, `muse-assist`, that is a specialized MetroPlat server, designed to “meet-then-beat the capabilities of current available AI personal/virtual/executive assistant platforms.” The receiving context is the 561 Group's existing enterprise and human operations, serving Pheží Ocháǧe; it is not a greenfield demonstration. The desired result is useful work performed on a person's behalf, with the knowledge, relationships, obligations, and authority necessary to do that work preserved.

**CD-02 — Public understanding.** The customer wants `https://muse.561.group` to present information about that package. Visitors must be able to understand the intended product and distinguish demonstrated capabilities from work still under development.

**CD-03 — Actual competitive reference.** The customer's correction identifies Meta's Muse as a platform that must be studied. Meta's product is Muse; this package is `muse-assist`. A separate context/commitment notebook does not satisfy CD-01. The comparison must concern the actual assistant capability family rather than a shared name or a few convenient features.

## Required development method

**CD-04 — Derivation before realization.** The customer explicitly requires:

Customer Demand → Requirements → arc42 → SAS → HLD → LLD → Specifications → codegen/codemod.

Each downstream artifact must be derived from its upstream inputs. Reconstructing specifications around code already written does not satisfy this demand. Missing generation or transformation abilities must themselves receive governing specifications before their realization. This requirement concerns development cost and operating sustainability as well as correctness.

**CD-05 — Recover capability and methods.** The repository is early-alpha migration material containing significant prior work. Recover the actual useful transformations, necessary information, architectural theory, and development methods. Existing packages, schemas, services, topology, and tests do not independently establish design intent or entitlement to survive. The user's governing dependency order is data → code → networking → systems; science → engineering → operations → internal/external service. MAPE-K operation and the stated Huidu Guanli/Rendanheyi organizational context constrain the realization; terminology alone is not evidence that those properties operate.

**CD-06 — Preserve the enterprise.** Preserve meaningful capabilities, user data, relationships, authority, and unrelated concurrent work when replacing mechanisms. Demonstrate effects in their receiving context. Test counts, source volume, directory existence, and successful publication are not substitutes for useful effects.

## Release and collaboration constraints

**CD-07 — Open-source preparation.** The customer intends an open-source package and answered: “Prepare Muse for open source; decide licensing before release.” That answer refers to this project, now consistently named `muse-assist`. License selection remains with the customer before release. Existing upstream rights are not changed by this demand.

**CD-08 — Delegation.** The customer requested up to three GPT-6 Luna subagents: one for theory and real-world conditions; one for upstream systems aligned with architectural plans and theory; one for the application. Delegation must follow CD-04, not create parallel handwritten implementations.

## Provenance and status

CD-01, CD-02, CD-07, and CD-08 transcribe the initial request and licensing answer. CD-03 records the first product correction. CD-04 records the second development-method correction. CD-05 and CD-06 preserve the user-supplied working agreement and architectural instructions for `/home/emsenn/info`.

This document is a traceable transcription for derivation, not a claim that the customer has separately approved a requirements baseline. Prior session edits under `apps/muse-assist`, `sites/muse.561.group`, and upstream runtime files are unaccepted implementation candidates. Their behavior may be examined as evidence; their existence must not determine the requirements.

The repository's [requirements-to-specification account][requirements-method] supplies the distinction between world requirements, machine guarantees, environmental expectations, and decisions. Its hypothesis labels are retained; adopting its distinctions does not assert a proof of refinement. The [specification format][spec-format] requires settled claims, prohibitions, and explicit open questions.

## Open questions

- **CD-O1 — Release license.** Customer decision required before public package release; not a blocker to requirements or design.
- **CD-O2 — Competitive acceptance.** The concrete comparison scenarios, operating contexts, and evidence sufficient for “meet” and “beat” must be derived in Requirements and refined downstream. Supplier descriptions establish reference claims, not observed performance or customer acceptance.
- **CD-O3 — Operating economics.** The customer identifies development and operational cost as consequential. Requirements must expose those costs and later evaluation must establish the acceptable envelope; no numerical budget was supplied in this session.

[requirements-method]: ../../../../../../../../../../../../../../../../../../science-services-section/services/engineering-science-services-section/services/fabrication-science-services-section/content/text/glossary/topics/requirements-to-specification.md
[spec-format]: ../../../../../../../../../../../../../../../../../../science-services-section/services/engineering-science-services-section/services/technology-science-services-section/services/specification-services-section/content/text/glossary/topics/specification.md
