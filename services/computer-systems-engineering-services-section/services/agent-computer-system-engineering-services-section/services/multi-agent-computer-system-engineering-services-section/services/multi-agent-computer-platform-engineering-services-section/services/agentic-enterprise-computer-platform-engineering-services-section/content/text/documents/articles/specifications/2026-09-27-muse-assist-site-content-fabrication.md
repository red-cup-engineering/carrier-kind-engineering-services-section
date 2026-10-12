---
title: Public content fabrication for muse.561.group
date-created: 2026-09-27
type: specification
status: derived; candidate input only; not fabricated or accepted
derived-from: 2026-09-27-muse-assist-public-site-lld.md
derived-from-sha256: accb11b20cbbbac42f4b45d05db7cbfb20f0344becaa2a389e69d3bd13ed44a1
---

## Purpose and admission state

This is the closed public-content and VICTOR configuration input for the public projection specified by the [site LLD](2026-09-27-muse-assist-public-site-lld.md). It is derived under [Requirements](2026-09-27-muse-assist-requirements.md) and [Customer Demand](2026-09-27-muse-assist-customer-demand.md). The artifact is not source HTML, a hand-authored theme, an accepted build, or deployment authorization. The current hand-authored `sites/muse.561.group/public` candidate remains unaccepted migration material. The shared VICTOR canonical authored-home transformation described in L-S05 is a prerequisite and is not accepted or established by this work order. Until that predecessor is accepted, the selected root behavior cannot be claimed or used as proof of the requested site.

The public receiving effect is that a visitor can understand the intended `muse-assist` capability, distinguish it from Meta Muse, find the development method, and see actual evidence/release limits without mistaking an early-alpha project for an available assistant. All product prose below describes project intent or current evidence status, never an unmeasured capability. Supplier descriptions are labeled as supplier claims. No independent comparison, competitive parity, product security assurance, license grant, package release, or deployment is claimed.

## Closed inputs and exact content records

The only authored public content records in this work order are the three JSON objects below. Their keys are closed: `slug`, `title`, `summary`, `dateCreated`, `type`, `status`, and `body`. Reject extra/missing keys, non-string values, a duplicate slug, or any slug outside `muse-assist`, `development`, and `comparison`. UTF-8 and LF are used throughout. For each record, deterministically write `content/<slug>.md` as YAML frontmatter in this exact key order (`title`, `date-created`, `type`, `status`, `summary`), then one blank line, then the exact `body`, then one final LF. Emit JSON string newlines as literal LF in the Markdown body. YAML-quote string values using the existing data serializer; do not hand-edit generated Markdown. No source text beyond these records may enter the public content directory.

```json
[
  {
    "slug": "muse-assist",
    "title": "muse-assist: personal and executive assistance in development",
    "summary": "A 561 Group early-alpha project designing personal, virtual, and executive assistance as a specialized MetroPlat server.",
    "dateCreated": "2026-09-27",
    "type": "page",
    "status": "active",
    "body": "# Assistance that follows work through\n\n`muse-assist` is the 561 Group's early-alpha project for personal, virtual, and executive assistance, designed as a specialized MetroPlat server.\n\nIt is being designed to research decisions, coordinate appointments and follow-through, produce usable computer artifacts, and carry authorized work across interruptions. Relevant context, its sources, and your corrections should remain available as that work continues.\n\nAn action is only part of the job. The design also calls for checking whether the intended result was received by the person or system that needed it, while keeping consequential actions under attributable human authority.\n\n# An open-source project in development\n\nThese are design targets. The complete assistant path has not yet been demonstrated, and this site offers neither a hosted assistant nor a supported public package. We are preparing for open-source release; licensing remains undecided.\n\nRead the [development method and status](/development/) and the [assistant references and comparison evidence](/comparison/). Meta's Muse is a separate product and a reference for this work. No whole-platform parity or measured advantage is claimed."
  },
  {
    "slug": "development",
    "title": "Development method and status — muse-assist",
    "summary": "How muse-assist is being derived from customer demand, what repository capabilities are evidence, and what remains unaccepted.",
    "dateCreated": "2026-09-27",
    "type": "page",
    "status": "active",
    "body": "# From customer demand to generated software\n\nThe governing chain is **Customer Demand → Requirements → arc42 → SAS → HLD → LLD → Specifications → codegen/codemod**. Each stage constrains the next. Existing source is migration evidence: useful capabilities and information must be recovered, while the design follows the requirements.\n\nThe target is a specialized MetroPlat server for personal, virtual, and executive assistance across continuing work: research, planning, coordination, computer operations, usable artifacts, evolving context, and follow-through.\n\n# Current status\n\nThe repository contains reusable journal and work-record transformations. VICTOR already renders public Markdown into a static site; that publishing capability does not demonstrate an integrated assistant. Those foundations do not yet establish the complete assistant. The design must connect them through enforceable authority and execution boundaries, shared-work coordination, and checks of outcomes where the work is received.\n\nThe specifications distinguish a proposed action, an execution attempt, its reported result, and independent acceptance of that result. A recorded operation or a settled chain transaction does not by itself establish that the user's goal was achieved.\n\nThe formal evidence model, isolated execution, shared-work resolution and EVM write path still require design and realization work. The project is early alpha, with specifications ahead of an accepted integrated implementation.\n\n# Release status\n\nThe project is being prepared for open-source release. Its license remains undecided, and no supported public package is available through this site. See the [project overview](/) and [dated supplier descriptions and comparison limits](/comparison/)."
  },
  {
    "slug": "comparison",
    "title": "Assistant references and evidence limits — muse-assist",
    "summary": "A dated comparison frame separating supplier descriptions, muse-assist intent, and independent observations.",
    "dateCreated": "2026-09-27",
    "type": "page",
    "status": "active",
    "body": "# What this comparison says\n\n`muse-assist` is this 561 Group project. Meta's Muse is a distinct product and the primary reference that prompted this work. Microsoft Copilot Cowork and Google Gemini Spark are included as additional supplier-description references. The sources below were reviewed on 2026-09-27. They describe products; they are not independent measurements or endorsements. No live access, common task run, or whole-platform comparison has been performed.\n\nThe comparison dimensions are useful effects to assess, not feature scores. Statements about the other products below summarize their suppliers' published descriptions. A source that does not establish a behavior is not evidence that the product lacks it.\n\n# Continuing work\n\nMeta describes Muse as able to handle concurrent tasks and continue work on schedules or events ([How We Designed Muse](https://introducing.muse.ai/)). Google describes Spark as providing ongoing personal assistance and tasks through connected Workspace applications ([Gemini Spark](https://gemini.google/overview/agent/spark/)). Microsoft's Cowork guide describes task execution across Microsoft 365 applications ([Use Copilot Cowork](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/use-cowork)). These descriptions do not establish equivalent persistence behavior across the products. `muse-assist` intends to carry authorized work across interruptions; that end-to-end behavior has not been demonstrated.\n\n# Connected actions\n\nMeta's description includes computer and browser use; Microsoft's guide discusses work across documents, mail, and meetings; Google's description discusses connected Workspace applications. These are supplier-described integration surfaces, not results from a shared task or verification of receiving-system outcomes. No `muse-assist` integration set or end-to-end connected action is claimed here.\n\n# Context and correction\n\nMeta describes editable memory. The cited Microsoft and Google references do not establish a directly comparable context-editing and correction path. This is a limit of the cited evidence, not a claim that those products lack such a path. `muse-assist` intends to preserve relevant context, provenance, and human corrections; this remains a design goal without an accepted integrated demonstration.\n\n# Usable artifacts\n\nMeta's description includes usable artifacts. Microsoft's guide names work with documents and other Microsoft 365 resources. Those supplier descriptions do not report an independently assessed artifact or its acceptance by a receiving person or system. This project has not measured artifact usefulness or acceptance.\n\n# Human authority and security boundaries\n\nMicrosoft's Cowork guide describes approval before changes to shared systems. Meta separately describes an approach that places execution and credential/permission boundaries outside model control ([Meta security and safety account](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)). These remain supplier statements; this page reports no independent security review. The cited Google Spark description does not establish an equivalent authorization model, which is not evidence of its absence. `muse-assist` intends to keep consequential actions under attributable human authority; its enforcement path is not accepted or demonstrated.\n\n# Outcomes where work is received\n\nNone of these sources supplies a common independent measure of whether work was accepted or had the intended effect in the receiving system. No comparative receiving-outcome results are available. Missing access and results limit what can be concluded; they do not indicate a competitor failure or a `muse-assist` advantage.\n\n# References\n\n- [Meta — How We Designed Muse](https://introducing.muse.ai/) (supplier description; reviewed 2026-09-27).\n- [Meta — How We Built Safety Into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) (supplier technical account; reviewed 2026-09-27).\n- [Microsoft — Use Copilot Cowork](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/use-cowork) (supplier documentation; reviewed 2026-09-27).\n- [Google — Gemini Spark](https://gemini.google/overview/agent/spark/) (supplier product description; reviewed 2026-09-27).\n\nThe [development page](/development/) explains what this project has and has not realized."
  }
]
```

These source records use `page`, `active`, ISO date, and title/summary fields accepted by VICTOR's publication catalog. Slugs deliberately equal the selected home cell and the two required route names. Body headings use a single `#`: VICTOR’s publication dialect adds one level, so these render as H2 beneath the H1 supplied from `title`. The initial two-hash records were refused by the actual catalog (R-10) before candidate build; this revision corrects the authoritative content records, not generated output. All internal hrefs are root-relative public routes; no repository-local/private paths are published. External links correspond to the source table in Requirements. Do not introduce ratings, checkmarks, live-result language, invented quotations, product screenshots, personal data, or unverified destinations.

## Exact VICTOR configuration data

Serialize this closed JSON object as UTF-8 JSON without key reordering, wrapped as the existing VICTOR project module `export default <JSON>\n` in `static-site-publisher.config.mjs`. Do not add configuration properties. The string `home` selector uses the existing VICTOR interface; it becomes a canonical narrative home only after the separate shared authored-home predecessor is accepted. No `publicDir` is configured because this work order admits no public asset records; therefore the existing hand-authored `public` tree is not copied into the candidate.

```json
{
  "configVersion": 1,
  "site": {
    "name": "muse-assist — 561 Group",
    "baseIri": "https://muse.561.group/",
    "language": "en-US",
    "license": "Release licensing undecided; not released",
    "menu": [
      { "label": "muse-assist", "href": "/" },
      { "label": "Development", "href": "/development/" },
      { "label": "Comparison", "href": "/comparison/" }
    ]
  },
  "home": "muse-assist",
  "tufte": false,
  "search": false,
  "archives": false,
  "pwa": false
}
```

The `tufte: false` setting disables TUFTE discovery projections; VICTOR's existing document page renderer remains in use. Search, archives, and PWA are explicitly disabled. No assets are admitted, and the navigation and internal prose links point only to the three specified pages. The license field communicates pending release status; it grants no rights and must not be replaced with a presumed license or default copyright statement.

## Derived README payload

The generated site's README is also content output from this specification, not a hand-maintained claim that the existing `public` tree is source. Replace the public-site README text with the following only after the generated candidate has been staged. The commands refer to the existing `static-site-publisher` CLI syntax and assume that executable is already available in the operator's environment; this work order does not authorize adding/installing a package or inventing a wrapper command.

```markdown
# muse-assist public information site

This static information site describes the 561 Group `muse-assist` early-alpha project. It is not an assistant interface, a supported product package, or evidence of a deployed service. Meta Muse is a separate product. The project license remains undecided and no release is represented here.

## Source and generation

The public pages and VICTOR project configuration are generated from the content records and configuration data in `2026-09-27-muse-assist-site-content-fabrication.md`. The accepted generator inputs, when available, are the derived Markdown records under `content/` and `static-site-publisher.config.mjs`. Generated HTML and other publisher artifacts are outputs; do not edit them by hand. Do not add private repository records, credentials, assay material, or unlisted assets to the public build.

Use a shared VICTOR revision accepted under the canonical authored-home fabrication order. Content and configuration admission, rendered-page observations, and promotion evidence are retained outside the public output tree; the presence of generated files alone does not establish acceptance.

## Stage and check a candidate

From this site directory in the repository, use the existing publisher CLI directly with Node.js. This avoids requiring a globally installed command. After the authored-home predecessor is accepted and the work order is admitted, build into a new empty directory outside the serving tree:

    node ../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/scripts/static-site-publisher.mjs build content /tmp/muse-assist-site-candidate --config=static-site-publisher.config.mjs

Run the publisher's configured double-build check:

    node ../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/scripts/static-site-publisher.mjs check content --config=static-site-publisher.config.mjs

For a local draft preview, bind only to loopback:

    node ../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/scripts/static-site-publisher.mjs serve content --host=127.0.0.1 --port=8561 --config=static-site-publisher.config.mjs

These commands are documented publisher interfaces, not evidence they have run for this candidate. A candidate remains unaccepted until the exact staged bytes pass manifest/refusal checks and independent reading, claim, accessibility, route, and no-script checks required by the site LLD. A local preview is not deployment.

## Release state

The earlier hand-authored public files are migration material; the generated reading destinations replace them only after acceptance. A local build does not establish deployment or a released package. Licensing is pending a customer decision.
```

The command's output path MUST be a newly created empty candidate directory, never the current `public` serving directory. The CLI's success/refusal report, exact candidate manifest and hashes, and independently assessed results are required evidence; a successful command alone is not acceptance. This work order does not provide deployment commands or a release destination.

## Deterministic candidate and acceptance boundary

The fabricator consumes only this specification's JSON objects, the verified VICTOR CLI/config contract, and the accepted shared authored-home predecessor. It deterministically writes the three Markdown records, the module configuration, and the README payload. It does not author HTML/CSS/JavaScript, add a renderer or dependency, change VICTOR, select a license, install tools, or deploy. Outputs must be byte-stable for unchanged inputs and generator identity. Failure on schema, route, selected-home, catalog, or build refusal blocks candidate admission; do not repair generated bytes manually.

Build only in a fresh, empty stage. Verify all artifacts are derived from the three authored records/configuration and allowed assets; inspect generated routes and metadata; run the LLD's independent reading, claim-source, accessibility/reflow, keyboard/no-script, outbound-link, and privacy checks against the exact candidate bytes. Ensure the root route uses the selected content cell with canonical root metadata and that `/muse-assist/` resolves consistently through the accepted authored-home behavior. The standard VICTOR 404 output must lead to the three valid destinations. Require no private/local link, external font, analytics, tracker, embedded supplier interface, unsupported score, or accidental claim that supplier descriptions are independently verified. Record assessor, method, input/generator/candidate digests, findings, unavailable checks, and limitations outside the public tree.

No candidate is accepted or deployed by this specification. The requested public destination is `https://muse.561.group`. Promotion and deployment still require the stated acceptance evidence; license selection remains a customer decision. The current upstream authored-home realization, build admission, independent assessment, and deployment authority are all pending; do not imply any has completed.

## Source and status basis

- [Customer Demand](2026-09-27-muse-assist-customer-demand.md): project intent, distinction from Meta Muse, development chain, and customer-reserved licensing decision.
- [Requirements](2026-09-27-muse-assist-requirements.md): R-12–R-15 and the dated supplier-evidence table.
- [Public-site LLD](2026-09-27-muse-assist-public-site-lld.md): L-S01–L-S07, public page contract, renderer boundary, predecessor home behavior, candidate custody, and acceptance.
- VICTOR CLI and configuration were read from the repository's `static-site-publisher/README.md`, `scripts/static-site-publisher.mjs`, `src/config.mjs`, `src/read-project-config.mjs`, `src/catalog.mjs`, and `src/page.mjs` on 2026-09-27. The executable usage supports `build <contentDir> <outDir> [--config=FILE]`, `check <contentDir> [--config=FILE]`, and `serve <contentDir> [--port=N] [--host=0.0.0.0] [--config=FILE]`. This is implementation-interface evidence, not proof the muse site has been built.
- Supplier claims are linked and attributed inline above. They are not independent product/security measurements. No live supplier comparison was run.

## Unresolved admission questions

1. The upstream shared VICTOR authored-home transformation and its fabrication/independent assays remain unaccepted. Can the resulting exact route, canonical metadata, and reference behavior satisfy L-S05 without product-specific code?
2. The exact `content/` staging location, generated config/README placement, and empty candidate directory must be bound to the receiving fabrication invocation. This work order defines their bytes and scopes but does not claim that invocation exists or has run.
3. Independent assessor, custody, and evidence-bundle destination remain to be supplied by the governing release process. No one has independently admitted the content claims, usability, accessibility, or candidate bytes.
4. License selection remains a customer decision. The public site destination is already specified as `https://muse.561.group`; this content work does not establish a deployment there.
