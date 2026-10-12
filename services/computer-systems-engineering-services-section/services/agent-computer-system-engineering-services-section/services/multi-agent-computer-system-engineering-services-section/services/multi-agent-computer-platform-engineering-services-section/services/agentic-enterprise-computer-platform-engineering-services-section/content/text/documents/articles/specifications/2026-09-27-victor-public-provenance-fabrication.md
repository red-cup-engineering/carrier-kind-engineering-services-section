---
title: Portable public document provenance in VICTOR
date-created: 2026-09-27
type: fabrication specification
status: derived order; acceptance requires observed generation
derived-from: 2026-09-27-muse-assist-public-site-lld.md
derived-from-sha256: accb11b20cbbbac42f4b45d05db7cbfb20f0344becaa2a389e69d3bd13ed44a1
---

This order refines L-S01 and L-S06: public document provenance identifies the admitted document, and identical source content remains portable between build directories. The effect is the same published reading destinations and verifiable release inventory without exposing the filesystem location used by the builder. Retain the existing admitted semantic content address and private source descriptor; remove the publication of local source location from the built-in document projectors. No new provenance subsystem, option, wrapper, parser, dependency, or site-specific code is required.

**F-V01 — Public identity.** The built-in page-tree and neighborhood projectors MUST use the admitted cell's existing `address` as the artifact `source`, including the selected authored root and its former-route redirect. This is a semantic content address, not a claim to identify original Markdown bytes. Do not recompute an address or replace it with a filesystem URI, route, or sanitized local pathname. All admitted publication and vault cells already carry this address. Preserve projector identity and release digest calculation.

**F-V02 — Private evidence.** The returned catalog MUST retain its existing full source descriptor for receiving evidence outside the public tree. Do not modify readers, catalog admission, returned source provenance, diagnostics, or external projector contracts. This order addresses built-in document provenance; it does not claim to sanitize arbitrary third-party projectors or refusal diagnostics.

**F-V03 — Closed transformation.** The only writable source is `victor/src/build.mjs`, captured SHA-256 `6586b7f5668dd69616117cae6a91bc4d664c4fa75fed1e41e7830cd66d7d96cd`. Replace the three built-in document source expressions described in F-V01. Preserve all other behavior, particularly canonical routes, feeds, shared presentation and release verification. Output exact unique-substring edits with original input digest and clause references under the existing fabrication LLD. A stale captured input refuses before any mutation. No generated artifact may be patched by hand.

**F-V04 — Independent receiving observation.** Before source derivation, commit a private assay that builds the same public records/configuration from two different absolute directories. Observe byte equality for the complete artifact inventory, no local file URI or either source root in emitted artifacts, semantic content addresses on the root/detail/redirect/neighborhood provenance, and preserved local source provenance in returned catalogs. Establish a baseline failure on the existing source. After acceptance, rebuild the actual muse-assist public candidate, verify its release inventory and retain input/output/assessment evidence outside the serving tree. Existing rendering checks need not be repeated if every reading-page byte is unchanged.
