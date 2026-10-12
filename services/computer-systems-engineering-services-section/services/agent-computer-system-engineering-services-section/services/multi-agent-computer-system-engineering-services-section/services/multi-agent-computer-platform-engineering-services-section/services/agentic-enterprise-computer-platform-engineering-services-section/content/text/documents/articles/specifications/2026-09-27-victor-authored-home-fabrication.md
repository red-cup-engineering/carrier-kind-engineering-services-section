---
title: Fabrication of an authored VICTOR home from a public content cell
date-created: 2026-09-27
type: specification
status: closed behavioral work order; generation admission pending independent assay custody
derived-from: 2026-09-27-muse-assist-public-site-lld.md
derived-from-sha256: accb11b20cbbbac42f4b45d05db7cbfb20f0344becaa2a389e69d3bd13ed44a1
realization-contract: 2026-09-27-muse-assist-fabrication-lld.md
realization-contract-sha256: b55a7b9cd27054b2e5ddf6a06463409d22a400176f15196ff921d20dac85fff2
---

## What this is

This fabrication work order derives the generic authored-home transformation required by L-S04/L-S05 of the [public-site LLD](2026-09-27-muse-assist-public-site-lld.md). It governs a source-free behavioral derivation and constrained codemod of VICTOR, preserving its default publication behavior while allowing a published content cell to be the canonical narrative at `/`. It contains no implementation body or prescribed private test source; current code is transformation input and migration evidence.

## Authority and constraints

**F-H01.** The work MUST follow L-S04–L-S07, H-F1–H-F4, and R-14–R-16 through the predecessor chain. The local [code-fabrication specification][fabrication-rule] supplies source derivation, assay ordering/custody and rejection rules. These project engineering rules are the applicable authority; no external standards certification follows from using VICTOR's existing conformance checks. Existing source and dependency rights MUST remain unchanged.

**F-H02.** The change MUST use VICTOR's existing catalog, content reader, renderer, projection collision handling, artifact inventory and release verifier. It MUST NOT introduce a second renderer/parser, application-specific template, publication database, scheduler, model gateway, package dependency or browser framework. The output is transformed shared publisher source and associated documentation/assay evidence, not deployed site assets.

## Input and output contracts

**F-H03 — Home option.** `build` and the normalized project configuration MUST accept the same union:

| Input | Defined behavior |
|---|---|
| Omitted or `true` | Preserve existing root index/archive behavior |
| `false` | Preserve existing root omission/custom-projector behavior |
| Nonempty string naming one catalog cell | Render that published cell as the authored root |
| Null, array, object, other primitive, empty/whitespace name | Record a configuration refusal; result is not releasable |

The selected name is a catalog identity, not a file path or arbitrary URL. Selection MUST resolve to exactly that cell; aliases MUST NOT silently select another cell. A duplicate catalog identity remains a catalog refusal. A missing cell or one excluded by the build's `drafts` policy MUST refuse. Explicit preview `drafts:true` MAY render a potential cell, but the resulting preview MUST NOT establish release under `drafts:false`. Neither invalid selection nor refusal may fall back to a plausible-looking accepted index.

**F-H04 — Projection output.** The existing build result shape `{artifacts, artifactRecords, report, catalog, site}` MUST be preserved. With valid authored home selection it MUST contain exactly one root narrative, the selected cell's ordinary route as a noindex redirect to `/`, other published pages with their existing routes, and existing optional projections under the selected configuration. The cell's identity, content address, publication membership, references and evidence MUST NOT be mutated merely to make its URL empty. No raw source or runtime object MUST enter a public artifact.

## URL correspondence

**F-H05.** One resolved canonical page URL MUST govern HTML canonical links, social metadata, structured-data page identity, reference resolution, feeds and sitemap. For the selected home this is the site's origin with trailing `/`; other cells retain their original URLs. A site's WebSite identity and its home page identity MAY share a URL but MUST retain their correct structured-data types/relationships without a self-containing page assertion. Redirect targets MUST be ordinary root-origin URLs, never protocol-relative `//` values produced by concatenating an empty name.

Existing renamed-from aliases of the selected home MUST resolve to `/` without loops. References, backlinks, chapter entries, archive entries and TUFTE navigation to that cell MUST lead to its canonical root. The sitemap MUST include the root once and MUST NOT list the selected cell's redirect as a canonical page. Feeds retain the same content/identity and use the canonical page URL. The implementation MUST preserve direct callers' default rendering/resolver behavior when no home-route option is supplied.

**F-H06.** With authored home and archives enabled, the authored cell owns `/`; the archive projector MUST omit only its competing root artifact and retain its non-root date/section/tag/type/status routes. It MUST NOT silently move existing archive paths to invented destinations. Navigation whose stated purpose requires the omitted complete publication listing MUST either use an existing truthful archive route or be omitted; it MUST NOT label the new product page as that listing. With Boolean home options, existing archive behavior remains unchanged. A competing custom/public-asset root MUST retain the normal collision refusal instead of overriding either artifact.

## Transformation boundary

**F-H07.** The generator MUST receive the predecessor chain digests, this order, the current bytes of declared transformation inputs, their dependencies/interfaces needed to preserve behavior, and public examples. Existing source is reference/codemod input; it MUST NOT replace the behavior clauses. No private assay material may enter its context, tool results, filesystem or inherited conversation. The source result MUST identify each changed path, resulting bytes/digest, input digest, and clause correspondence; it MUST NOT apply its own patch to the shared checkout.

The first captured inputs were refused as stale before generation. Concurrent work added the string homepage selector and a bindinggenerations.net consumer. The revised order preserves that selector and consumer effect while completing canonical correspondence. No source was generated under the stale revision. Current transformation inputs, re-read for this revision:

| File | SHA-256 |
| [src/build.mjs](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/src/build.mjs) | `de4a1252849b6164fb474007f74ffe59401259d5185564317c00520e9c07d730` |
| [src/config.mjs](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/src/config.mjs) | `1f0ebaef65e7a551b672e1f7790c6c7f4153323f3ccfe5c24c3b672d3ad5c80f` |
| [src/catalog.mjs](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/src/catalog.mjs) | `399ee4bae62828d28f52a750898398d2e0b22f3239e96708ea1b76054eca6d62` |
| [src/page.mjs](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/src/page.mjs) | `f25e8728d26fa61c2fdf9549a58e0fc41aca2eff712a7435a051f5980dd568d9` |
| [src/feeds.mjs](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/src/feeds.mjs) | `66806b5a6b5b462c12beabd966344d58694d7db01a25c5eb5cd8f92945c1998d` |
| [src/tiles.mjs](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/src/tiles.mjs) | `7c18b229db8e5a38c982fc71f2a43c781dfb93fd8b93c8ccb9ec15b242dda61a` |
| [src/publication-archives.mjs](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/src/publication-archives.mjs) | `f37cd3509e4dfee0a3d90542350303eda9f9a75bc991a985bdb5a83461b249a5` |
| [README.md](../../../../../../../../../../../../computer-knowledge-systems-services-section/apps/static-site-publisher/README.md) | `8bf413b63bebe8cf7ae9bce4f034fc86fcd4e48d15c52d6876be0d55c1b0a641` |

Other existing shared URL/projection consumers may require changes if inspection establishes they participate in F-H05. Before adding an affected file, the derivation MUST bind its current bytes/digest and record why the existing correspondence requires it; unrelated cleanup is prohibited. Existing imports/dependency versions MUST be preserved unless the closed behavioral contract proves a change necessary and a revised work order admits it. New dependencies are prohibited by F-H02.

**F-H08.** Candidate materialization MUST occur outside the shared checkout. Promotion MUST compare every changed input against the captured digest immediately before replacement. A changed input causes `stale-input` refusal; no force overwrite or automatic merge of uninspected concurrent changes is allowed. Obsolete special-case root generation, if any is found within this change, MUST be removed once the shared route demonstrates the same effect. This order does not authorize deletion of unrelated code, data, or existing site outputs.

## Public examples and independent acceptance

The following examples constrain behavior without prescribing private assays:

- A published cell named `overview`, selected by `home: "overview"`, supplies the root body. `/overview/` redirects to `/`; a different cell linking to `overview` links to `/`.
- Omitted `home` still generates the usual publication root. `home:false` still permits a custom root projector without a built-in competing root.
- A selected cell absent from the catalog causes a refusal. A selected potential cell is refused in release mode and available only in an explicitly enabled draft preview.
- Selecting a home while another projector claims `index.html` causes a collision refusal. A theme-only change does not rename the selected cell or alter its address.

**F-H09.** Behavioral assays MUST be derived before source and held outside the generator's accessible context under F-H07. They MUST cover the input union; default/false compatibility; Markdown body at root; canonical/social/structured-data consistency; alias/reference/feed/sitemap/archive/TUFTE links; missing/draft/duplicate selection; collision refusal; unchanged-input repeatability; and stale-input promotion refusal. The assessor MUST exercise the actual build and inspect rendered navigation and metadata in the generated artifacts. Structural admission or a schema pass alone is insufficient.

**F-H10.** Acceptance evidence MUST bind work-order/input/candidate/assay digests and record method, environment, assessor identity, outcomes and limitations. The existing generic receipt's locator+digest MAY refer to this richer evidence bundle; it MUST NOT claim to contain or validate that evidence itself. Failed candidates remain rejected. A revised candidate MUST have changed governing evidence or specification with a recorded derivation, not an invisible post-test hand patch.

## Implementations

VICTOR already supplies Markdown detail rendering, Boolean root selection and a partially realized string selector, route collision detection, artifact provenance and release checks. Its hard-coded cell URLs and current Boolean root checks are migration obligations, not reasons to add a Muse-only renderer. No candidate has yet been derived or accepted under this work order.

## Open questions

- **F-HO1 — Provider custody:** The [bounded realization LLD](2026-09-27-muse-assist-fabrication-lld.md) selects an operator-mediated isolated Luna invocation and independent assessment using existing tools. Its L-F04 boundary probe and actual model availability remain admission conditions. An unrestricted shared-checkout subagent is not substituted for that boundary.
- **F-HO2 — Assay custody:** The assessor must commit the independent assay bundle before the source provider receives the admitted order. Exact private assay content is intentionally absent here; acceptance method and coverage are governed by F-H09.

[fabrication-rule]: ../../../../../../../../../../../../../../../../../../science-services-section/services/engineering-science-services-section/services/fabrication-science-services-section/services/computer-fabrication-science-services-section/services/computer-code-fabrication-science-services-section/content/text/documents/articles/specifications/2026-09-04-code-fabrication-from-a-specification.md
