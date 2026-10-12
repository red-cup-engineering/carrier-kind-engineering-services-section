---
title: VICTOR authored-home shared fabrication contract
date-created: 2026-09-28
type: specification
status: derived; source candidate not yet generated or accepted
derived-from: 2026-09-27-muse-assist-public-site-lld.md, 2026-09-27-muse-assist-hld.md, 2026-09-27-muse-assist-requirements.md, 2026-09-27-muse-assist-fabrication-lld.md
derived-from-sha256: see evidence/2026-09-28-victor-authored-home-fabrication/public-input.json
---

## Scope and carrier

This closes L-SO1 for the shared VICTOR transformation required by L-S04–L-S07. Its carrier is the published-cell catalog and the generated static artifact inventory. The effect is selection of one already-published Markdown cell as the document at the site's root URL, while preserving the selected cell's identity, ordinary route semantics, references, feeds, discovery records, and all other publisher consumers. It adds no Muse renderer, site framework, route alias language, or content registry.

This is a source-fabrication contract, not evidence of an accepted change. The public input packet at `evidence/2026-09-28-victor-authored-home-fabrication/public-input.json` binds the requirement chain and exact shared input file bytes. The private receiving contract and digest are in the sibling evidence directory and MUST remain unavailable to the source provider.

## Shared target and consumer boundary

The only shared implementation targets admitted for this unit are:

- `lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/apps/web-page-tiling-engine/src/publication/application.mjs`
- `lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/apps/web-page-tiling-engine/test/publication-application.test.mjs`

The test file is allowed only for focused shared-capability regression evidence. No static-site-publisher consumer, site configuration, authored content, generated output, network service, or unrelated package is writable in this unit.

`bindinggenerations.net` is the existing external consumer obligation. Its exact current configuration and authored root cell are bound by the public input packet. Its `home: 'index'` continues to render that authored cell at `https://bindinggenerations.net/` through the same VICTOR renderer; the cell remains a stable catalog identity, its content/navigation remains available, and generated metadata must identify the root canonical URL. The receiving check invokes the existing builder against those inputs in an isolated temporary destination and observes the output. It MUST NOT edit its configuration/content, write its `dist`, deploy, or infer deployment from local generation.

## Input, selection, and refusal contract

The existing public API is the string form of `home`, supplied through VICTOR's current build/configuration input. A nonempty string MUST exactly equal the canonical catalog cell name as stored (the source reader derives it from the record identity); the selector performs no case, whitespace, title, filename-suffix, URL, renamed-from-alias, or fuzzy matching. Its target MUST be exactly one cell in the normal published set. The source catalog already refuses duplicate cell names (R-01); the selection MUST NOT conceal that refusal by selecting whichever duplicate arrived first. A redirect alias is not a second cell identity and cannot satisfy the selector.

For an ordinary public build (`drafts` absent or false), absent, unknown, or potential/draft-excluded names MUST refuse the whole generation as a configuration finding; the build MUST NOT silently fall back to the listing or expose the excluded cell. Draft preview may select a potential cell only when the caller explicitly opts into draft publication, and its output is not a public release artifact. Root ownership conflict with any archive or external projector MUST be reported as an error and MUST NOT overwrite a claimed route. Existing VICTOR collision detection remains the common collision authority.

When a valid named cell is selected:

- the cell's existing TUFTE/document rendering transformation supplies `index.html`; it is not copied into a bespoke template;
- its canonical URL and social/article URL identify `site.baseIri` (the root URL); there is one canonical document for that narrative;
- the cell's ordinary `/<name>/` page is a noindex redirect to the root and declares the root as canonical;
- references, chapter links, neighborhood/atlas links, and feed item URLs that resolve to the selected cell use `/` consistently;
- the sitemap includes the root and does not advertise `/<name>/` as a second page;
- home selection does not alter the cell’s catalog or publication membership, or its eligibility for feeds under the existing feed rules; it retains its stable identity and authored body.

Redirects that target the selected cell resolve to the root. Other cells and redirects retain existing paths and meanings. No redirect, reference, feed, or sitemap entry may be silently dropped to make the root claim pass.

## Default and Boolean compatibility

Omitted `home` and `home: true` preserve the existing default listing root and must produce equivalent publication artifacts for identical inputs. `home: false` continues to suppress VICTOR's own root projection so an independently supplied projector can own `/`; this does not grant a projector permission to overwrite a claimed route. Existing route collision refusal applies. String mode must not change either Boolean's output or refusal behavior. No caller is required to provide a new object-shaped home option.

## Fabrication and assessment

The source provider receives only `public-input.json` and the admitted target bytes. Before invocation, an independent assessor commits the private assay inventory digest in `private-assay/receiving-commitment.json`. The assessor's fixture/assertion bytes and conversation are not mounted, prompted, or sent to the provider. Apply L-F01–L-F07 of the fabrication LLD: fresh isolated source context; no shared-checkout write access; no assessor material; deterministic materialization; candidate-bound, network-denied assessment; full byte comparison immediately before any later promotion. No source generation, promotion, release, or deployment is established by this specification.

The precommitted private cases cover: omitted/true equivalence and default listing; false-mode projector ownership and root collision refusal; successful named-root rendering, canonical and ordinary route metadata, redirect, references, sitemap, and feed; missing/draft-excluded/alias-only/duplicate identity and collision refusals; and the real `bindinggenerations.net` config plus `content/index.md` consumer. The exact observations and nonclaims are in `private-assay/assay.json`.

## Acceptance boundary

A candidate can be accepted for this unit only if the independent receiver establishes every private case against the exact candidate bytes and the unchanged bound `bindinggenerations.net` inputs. A passing local build establishes the shared transformation and this consumer's generated artifact behavior in that environment. It does not establish a public site at `muse.561.group`, hosted publication, deployment, license selection, whole-assistant capability, or Meta Muse parity. Those remain governed by the public-site LLD and other predecessor specifications.
