---
title: VICTOR per-site public record metadata presentation
date-created: 2026-09-28
type: specification
status: derived; source candidate not generated or accepted
derived-from: 2026-09-27-muse-assist-public-site-lld.md, 2026-09-27-muse-assist-site-content-fabrication.md
---

## Observed effect and scope

The current VICTOR article footer renders `Created <date> · status <cell.status> · <cell.address> · <site.license>` for every normal publication page. In the bound Muse candidate, visitors see `status active` beside `Release licensing undecided; not released` and an opaque `ni:///sha-256;…` identifier. Those values describe the catalog record, not the assistant's operating or release state, and the digest has no visitor use. The dated comparison prose already states when its supplier sources were reviewed. The independent L-S06 receiver found no page-wide overflow, missing local destinations, keyboard-focus failure, or JavaScript dependency; it did find this misleading and non-useful footer metadata.

This work adds one per-site switch to the existing shared renderer. It does not change cell identity, status semantics, content-addressed evidence, machine-readable metadata, publication membership, or the accepted authored-home implementation. `bindinggenerations.net` remains a compatibility consumer whose current default publication footer is useful and must remain unchanged.

## Exact shared API

Add `site.showRecordMetadata`, a boolean normalized by the existing VICTOR `normalizeSite` path. Omitted means `true`. Explicit `true` preserves the exact existing normal publication footer bytes: optional `Created <date> · `, `status <cell.status> · <cell.address> · `, followed by the existing `site.license`. Explicit `false` omits only the per-cell creation date, catalog status and opaque content address from the visitor-facing article footer; it retains the exact site-level `site.license` text. Any other supplied type yields the existing configuration-refusal form.

The option changes only the human-visible footer. It MUST NOT remove or rewrite `cell.status`, `cell.address`, `dateCreated`, or their uses in the catalog, stable selection, JSON-LD, feeds, route resolution, sitemap, noindex redirect, or release manifest. Omitted and `true` configurations MUST produce equivalent artifact bytes. Existing consumers that omit the option retain their current publication behavior.

The Muse configuration in the bound content specification sets `site.showRecordMetadata: false`. Its home and ordinary detail pages retain root canonical/reference behavior and the existing site-level release/licensing statement. No `active` or `ni:///sha-256;` record metadata appears in visitor-visible page footers.

## Bound source and consumer effect

The public input packet binds exactly two writable source files: VICTOR's shared publication page renderer and its configuration normalizer. It binds the existing publication application and static-site build as read-only propagation dependencies. The receiver builds the exact Muse input and the unchanged Binding Generations configuration/content. The latter omits `showRecordMetadata`; it must continue to show its original record date, status, address and site license. Its authored root, menu, content, canonical URL and output-directory custody remain unchanged.

No source file, configuration, authored content, or generated distribution belonging to Binding Generations is writable. No public site asset, CSS/theme, destination route, application renderer, global metadata policy, or hidden ambient setting is admitted. The accepted authored-home fabrication work order is a predecessor only; this unit does not amend its accepted source target scope.

## Independent receiving and acceptance

Before source generation, the independent assay inventory and receiver bytes are committed in the private evidence directory and withheld from the source provider. The receiver uses actual VICTOR config normalization and build with exact bound inputs. It checks: omitted versus explicit `true` artifact equality; the current Binding Generations root still includes its metadata footer; explicit `false` on Muse removes only the three per-cell footer values and preserves the license; invalid values refuse configuration; authored body, root canonical and selected-cell redirect remain correct; feed, sitemap and stable record behavior are retained; the complete artifact set has no refused findings.

The previously received Muse output is not evidence for this contract: it visibly contains catalog `active` and an opaque `ni` identifier and is superseded. Acceptance requires a fresh generated source candidate, exact-target diff review, private receiver success against those bytes and unchanged preservation inputs, and repeatable candidate hashes. Local acceptance does not establish deployment, a license choice, released package, or assistant operation.
