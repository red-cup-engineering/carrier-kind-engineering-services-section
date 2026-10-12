---
title: Shared VICTOR reading navigation and TUFTE footer reflow
date-created: 2026-09-27
type: specification
status: closed work order; source derivation and acceptance pending
derived-from: 2026-09-27-muse-assist-public-site-lld.md
derived-from-sha256: accb11b20cbbbac42f4b45d05db7cbfb20f0344becaa2a389e69d3bd13ed44a1
realization-contract: 2026-09-27-muse-assist-fabrication-lld.md
realization-contract-sha256: b55a7b9cd27054b2e5ddf6a06463409d22a400176f15196ff921d20dac85fff2
---

# VICTOR shared presentation fabrication order

Status: closed behavioral order; source derivation and independent assessment pending.

## Authority and scope

This order realizes the public-site behavior already required by `2026-09-27-muse-assist-public-site-lld.md` (input SHA-256 `accb11b20cbbbac42f4b45d05db7cbfb20f0344becaa2a389e69d3bd13ed44a1`), especially L-S03 and L-S04. It is bounded to three shared presentation defects observed in the current projection: page navigation has no current-page marker, the not-found route omits the configured menu recovery destinations, and a long content address overflows the footer at a 320 CSS-pixel viewport.

The existing `renderTufteNavigation` API already consumes `{href,label,current:true}` and emits `aria-current="page"`. Reuse it. The common TUFTE stylesheet owns `.tufte-footer`; put token wrapping there, not in a site stylesheet. VICTOR's `site.menu` is the authoritative destination list for both page navigation and not-found recovery.

## Frozen inputs and output boundary

Before source derivation, compare these exact input bytes with their recorded SHA-256 digests:

- VICTOR `apps/static-site-publisher/src/page.mjs`: `5bd98b7331129456bc362e669994f3568c5ad40966f85ff5ef5ddf51e2f33193`
- TUFTE `apps/web-page-tiling-engine/src/tufte-rendering.mjs`: `6ccb48827857a0f862e376fd3076ac9beb2e1ef7bf380c8f9b3d20c0d435ecf7`
- TUFTE `apps/web-page-tiling-engine/src/tufte-browser.mjs`: `c097893be3dcb5318d79cbf1989d44343e5c714d1fd40c167a89f21faf78ee07` (protected API input)
- public-site LLD: `accb11b20cbbbac42f4b45d05db7cbfb20f0344becaa2a389e69d3bd13ed44a1`
- fabrication LLD: `b55a7b9cd27054b2e5ddf6a06463409d22a400176f15196ff921d20dac85fff2`

Only `page.mjs` and `tufte-rendering.mjs` may be generated replacements. `tufte-browser.mjs`, project configuration, content, package manifests, dependencies, and every other file are protected inputs. Refuse derivation or promotion if any frozen input differs. Follow the isolated source invocation, independent assay custody, candidate review, and atomic digest-checked promotion requirements in the fabrication LLD; the source role must not receive the private assay bundle.

## Required observable behavior

**F-P01.** `renderPage` MUST mark the first configured site-menu link whose normalized absolute URL equals `canonicalUrl` with `current:true`, preserving every menu link and its label/href. URL normalization uses `new URL(href, site.baseIri).href` and the canonical URL resolved against the same base. The existing TUFTE renderer MUST consequently emit `aria-current="page"` on exactly that link. If no menu URL matches, none is current. A duplicate equivalent menu URL MUST NOT create another current marker. Recompute this flag without mutating the supplied menu; ignore an inherited current flag. A malformed menu URL MUST NOT throw from current-page matching or become current; existing admission/escaping behavior otherwise remains unchanged. Supplemental Search navigation MUST remain non-current.
**F-P02.** `renderNotFoundPage` MUST retain the existing brand/home link and provide a site navigation containing every entry of `site.menu`, preserving each configured href and label so a visitor can recover to every public destination. Do not hard-code this site's menu or infer destinations from content.
**F-P03.** The shared TUFTE `.tufte-footer` styling MUST allow an unbroken long token to wrap within a 320 CSS-pixel viewport without horizontal document overflow. Footer text, including the full content address, MUST remain present and unchanged. Do not truncate, hide, or replace identifiers.

## Refusal and exclusions

Do not add a new rendering framework, template, dependency, site-specific CSS, content-specific branch, new route, or new configuration grammar. Do not change TUFTE navigation semantics or the browser renderer. Preserve existing renderer signatures and current Boolean/string `home` behavior. This order does not authorize unrelated redesign or claim complete site/application acceptance; the private assay covers only the three behaviors above.

**F-P04 — Output and custody.** Return the L-F02 closed JSON edit record; exact output paths are `victor/src/page.mjs` and `tufte/src/tufte-rendering.mjs`. Each replacement binds its original SHA-256 and a unique exact before string, with clause references from this order. Assays are committed before source and withheld from the source process. Record corrected or rejected executions honestly. Compare all three input hashes before any promotion; preserve both concurrent edits and the candidate on refusal. Source inference may not edit the checkout.
