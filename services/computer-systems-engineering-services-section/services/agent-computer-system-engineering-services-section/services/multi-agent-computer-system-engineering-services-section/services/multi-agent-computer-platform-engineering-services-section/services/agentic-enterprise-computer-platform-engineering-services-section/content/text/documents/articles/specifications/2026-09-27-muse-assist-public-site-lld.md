---
title: Public information and generation design for muse.561.group
date-created: 2026-09-27
type: specification
status: derived LLD; source and presentation contract; not a deployed site
derived-from: 2026-09-27-muse-assist-hld.md
derived-from-sha256: 5f824fb118e4cdfec8e23cc2f74e8aff667eff420d5e461ffb4c60b8ad57c6e9
---

## What this is

This LLD refines H-06, H-I6 and H-F1–H-F4 of the [HLD](2026-09-27-muse-assist-hld.md) into a public information contract, static projection, and replacement boundary. The receiving effect is a visitor understanding `muse-assist`, its intended useful assistance, actual development state, and relationship to Meta's Muse. It does not implement a hosted assistant, collect personal requests, or accept the earlier handwritten site as a design input.

## Public source and destinations

**L-S01 — One public content boundary.** Only the explicitly authored public content directory and public asset allowlist MAY enter the site build. The repository knowledge corpus, private journals, source-generation prompts, assay material, credentials, and raw operational evidence MUST NOT be scanned into publication. Public statements are derived from identified requirements/design/evidence, with a public-safe source description; a private/local path MUST NOT be rendered as a visitor link.

The site MUST have three substantive reading destinations, a not-found page, a canonical origin of `https://muse.561.group/`, and ordinary links that work without client scripting:

| Destination | Visitor purpose | Required content |
|---|---|---|
| `/` | Understand the product and current availability | Project identity, intended assistance, concrete use examples, early-alpha status, license/release state, next reading links |
| `/development/` | Understand how it is being built | MetroPlat specialization, retained enterprise capabilities, specification chain, authority/evidence principles, implementation gaps and contribution/release information actually available |
| `/comparison/` | Understand the reference and claim limits | Meta Muse distinction, named supplier evidence, comparable effect dimensions, assessment method, absence of live parity measurements |
| `/404.html` | Recover from an unavailable address | Plain explanation and links to the three valid destinations |

A canonical root is an authored narrative rather than a chronological publication list. Navigation labels MUST be `muse-assist`, `Development`, and `Comparison`, and the current page MUST be identifiable. There MUST be no dead install, login, signup, repository, or download destination. A repository/package link may be added only after its actual public destination and rights/release state are verified.

**L-S02 — Required public claims.** The home content MUST communicate the following claims in readable prose:

1. `muse-assist` is the 561 Group's early-alpha project for personal, virtual, and executive assistance, designed as a specialized MetroPlat server.
2. Intended assistance includes researching a decision, coordinating appointments and follow-through, producing usable computer artifacts, and carrying authorized ongoing work across interruptions. These are design goals, not a list of live integrations.
3. Continuing work should preserve context and provenance, keep consequential actions within human authority, and establish outcomes where the work is received. Concrete examples MUST remain visibly illustrative; there are no fabricated user conversations or success metrics.
4. The package is being prepared for open source. Licensing is undecided before release; no supported public package or hosted assistant is available through this site at this stage.
5. Meta's Muse is a distinct reference product. This project has not demonstrated whole-platform parity or a measured advantage.

`/development/` MUST state the complete Customer Demand → Requirements → arc42 → SAS → HLD → LLD → Specifications → codegen/codemod chain. It MUST explain that the existing enterprise and early-alpha code are migration evidence, that current design is ahead of accepted implementation, and that release licensing remains a customer decision. It MUST distinguish recovered journal/renderer capabilities from the missing full personal-assistant, isolated execution, richer formal carrier and EVM write/coordination realization. These statements must be revised when demonstrated evidence changes.

`/comparison/` MUST name Meta Muse, Microsoft Copilot Cowork and Google Gemini Spark as the initial supplier-description comparison set, with dated source links from Requirements. It MUST distinguish supplier descriptions from this project's intended behavior and from independent observations. Comparison dimensions MUST include continuing work, connected actions, context/correction, artifacts, human authority, and receiving outcomes. Each dimension MUST be prose or a readable table without unsupported checkmarks or scores. The absence of live comparison access/results is a limitation, never a competitor failure. Supplier pages are external references, not endorsements.

## Presentation and interaction

**L-S03 — Reading behavior.** Pages MUST use one descriptive H1, logical heading levels, semantic landmarks, descriptive links, a keyboard-operable skip link and visible focus. Core text and navigation MUST be available without JavaScript. Content MUST reflow at a 320 CSS-pixel viewport and remain usable at 200% zoom without clipped controls or a page-wide horizontal scroll requirement. Wide layouts MUST keep prose at a comfortable reading width. Comparison tables, if used, MUST preserve headings and allow access to all cells on narrow screens.

The visual direction is a calm, text-led technical publication using the existing TUFTE document presentation through VICTOR, with clear hierarchy and readable contrast. The old custom CSS, invented product icon, and decorative notebook interface have no preservation requirement. There MUST be no motion required to understand content, external font dependency, analytics, tracking pixel, embedded competitor UI, or form that suggests an operating assistant. If the renderer emits incidental script, the receiving check MUST establish that content/navigation do not depend on it and that no external data transmission occurs.

## Existing projection and the missing home behavior

**L-S04 — Reuse VICTOR.** The selected generator is the existing VICTOR static-site build capability. It consumes public Markdown cells and configuration and emits an artifact inventory, report, conformance findings and release manifest. TUFTE remains its document rendering path. The application MUST NOT own a second Markdown parser, template framework, asset pipeline, catalog, search engine, or hand-maintained generated HTML/CSS.

For this small site, archives, search, atlas/neighborhood discovery, PWA and network discovery advertisements MUST be disabled. Local asset transformation and release manifest verification SHOULD use the existing capabilities. Feed/record outputs emitted by the existing publisher are admissible only if derived entirely from the same public content; they MUST NOT become additional hand-maintained sources. Existing build findings are evidence about checked properties, not proof of all usability or claim accuracy.

**L-S05 — Narrative home selection.** VICTOR can render Markdown detail pages; during derivation, a concurrent change added `home: <published cell name>` as a narrative root selector while retaining the original cell page and its canonical metadata. The selected upstream transformation completes the canonical authored-home behavior through that existing string selector. It does not add a second object-shaped option or an application-specific Muse renderer. Detailed fabrication MUST preserve existing Boolean `home` behavior. A nonempty string MUST select exactly one existing public cell as the root narrative, use the existing document renderer, and emit a canonical root URL. The selected cell's ordinary URL MUST redirect to the root, avoiding two competing canonical pages. References to the cell MUST resolve consistently. A missing, draft-excluded or ambiguous selection MUST refuse generation. Root route collisions MUST refuse rather than overwrite another projector's output.

The home change MUST keep other VICTOR consumers' default behavior and existing Boolean opt-out intact. Its operation signatures, path resolution, metadata, sitemap/feed references and assays belong in a shared publisher fabrication specification before source generation. A custom hard-coded Muse HTML projector would leave the unnecessary second presentation mechanism and MUST NOT be used as the replacement.

## Reproducible generation and promotion

**L-S06 — Candidate custody.** Generation MUST use an empty, isolated candidate directory. VICTOR's current writer writes files directly and does not remove stale outputs; it MUST NOT write directly over the serving directory. Before promotion, the complete candidate tree MUST pass its declared manifest/digest checks, refused build findings MUST be resolved, and the independent reading/claim assays MUST run against those exact output bytes. The evidence bundle MUST retain predecessor/input/generator/candidate digests, method, environment, assessor, results and limitations outside the public tree.

An unchanged admitted source/configuration/generator MUST produce identical artifact bytes except separately identified non-public execution receipts. Changed content MUST rebuild through the same projection; no post-build hand editing is allowed. Costs and operator interventions MUST be recorded where available, including unavailable measurements, without invented zeros.

**L-S07 — Replacement boundary.** The earlier site's `public` directory is an unaccepted candidate, not authoritative source. Before replacing it, the codemod MUST bind the complete current path/digest inventory, identify retained necessary public information, compare current bytes immediately before promotion, and refuse if any affected input changed. Only the declared site outputs/configuration/documentation are writable. Unrelated checkout files, application code, private data and other site consumers MUST remain untouched. Old independently authored HTML/CSS and obsolete guide routes are retired only after the generated destinations preserve required information and navigation; an old public guide URL SHOULD redirect to `/development/` if that URL has actually been distributed.

The site README MUST describe authored inputs, generator invocation, verification and preview. It MUST NOT continue calling generated HTML/CSS the source. Hosting configuration MUST target the verified output tree. A local preview, release manifest, or hostname configuration MUST NOT be reported as successful deployment; deployment requires authenticated publication and an independent fetch of the expected bytes at the public origin.

## Acceptance correspondence

| Observation | What it establishes |
|---|---|
| Text/source comparison including status and licensing | Public claims derive from evidence and design at this revision |
| Keyboard traversal, narrow/wide rendering, zoom and no-script reading | Actual visitor access in the inspected browser/environment |
| Local and external destination checks | Navigation resolves as observed; not future availability |
| Clean candidate manifest plus full inventory | Candidate files match declared digests; no stale output is silently retained |
| Two identical-input generations | Reproducibility for those inputs/environment |
| Changed home-cell content and refused missing/draft/collision selection | Generic home selection and failure contract |
| Concurrent-input change at promotion | Preservation/refusal boundary, not merely a successful overwrite |
| Public-origin fetch after authorized deployment | Observed deployment of the expected revision |

## Implementations

Current VICTOR `src/build.mjs`, `config.mjs`, `page.mjs`, content reader and release verifier provide the selected existing transformation capabilities. The default homepage is a listing. Concurrent string-selector work now supplies a narrative body but duplicates the detail route/canonical URL; L-S05 specifies the remaining correspondence gap. The bindinggenerations.net configuration already consumes the string selector and its useful homepage effect must survive this transformation. Current `sites/muse.561.group/public` HTML/CSS, package scripts and hosting configuration remain unaccepted migration material. No generation, promotion or deployment is established by this LLD.

## Open questions

- **L-SO1:** The shared authored-home fabrication specification must close exact API/metadata/reference transformations and independent assays before changing VICTOR. This is bounded engineering work, not a new website framework.
- **L-SO2:** Source generation must satisfy H-F3's assay custody. Existing inference procurement does not itself isolate generator context from assessor material. This must be established before novel projector source is generated.
- **L-SO3:** Actual hosting authority/public deployment state and package/source release destinations require observed external evidence. They do not block local source/design or preview. Package licensing remains undecided.
