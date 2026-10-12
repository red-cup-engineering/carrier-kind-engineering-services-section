---
title: Bind a personal context's expected journal to its source owner
date-created: 2026-09-27
type: specification
status: closed bounded fabrication order; generated receiving required
---

## Derivation and useful effect

L-C02 requires a selected context's admitted journal binding to be verified; L-J02 makes journal identity operator-bound rather than caller-selected; L-O01 gives the source owner custody of the exact host configuration. The accepted owner currently has no expected-identity argument and no identity accessor. Its immutable configuration is private. Passing a journal string beside an unchecked owner would duplicate an assertion without checking it. Re-reading the host file in the application would create a second custody path. Keep the existing source owner and add the check where the host configuration is already verified. The context host must use this check before creating any private ports. This does not authenticate a context or authorize a request by itself.

## F-B01 — Exact constructor interface

Refine openSourceOwner(storeDirectory) to openSourceOwner(storeDirectory, expectedJournal). Omitting the second argument or supplying undefined preserves the accepted unbound internal constructor behavior. A supplied value must be a nonempty string containing at most 512 Unicode scalar values and no unpaired surrogate; use the existing scalarString law. Reject all other supplied values with TypeError before any directory, host or lock access. Do not coerce values, trim, normalize, read object properties or accept options objects. The primitive value cannot be mutated after binding.

## F-B02 — Protected matching

After the existing constructor has acquired the journal gate and parsed the admitted host configuration, but before returning any owner, compare expectedJournal, when supplied, exactly with host.configuration.journal. A mismatch throws the existing branded journalUnavailable storage-unavailable reason using the existing unavailable helper. Its public message must reveal neither expected nor observed identity nor root. Do not misclassify a valid different journal as source-corrupt, initialize it, change its configuration or publish any source. Follow existing constructor cleanup on failure: release the gate and close the descriptor. Keep the existing root/lock/host validation and source parsing rules, including permanent owner invalidation after binding replacement. A successful match binds through the owner's existing exact immutable host bytes for its entire lifetime; no permission or identity cache is introduced.

## F-B03 — Subsequent connected host obligation and current preservation

This source order does not implement host composition; that remains a subsequent connected transformation with its own source bindings. L-C02/F-C03 host composition must pass the journal identity from the admitted context definition as expectedJournal. Requests do not supply this parameter. Ordinary internal maintenance and fixture callers may retain the one-argument form. Keep initializeJournal and the ten-method protected scope unchanged; do not expose configuration or a general root capability to application code. This order refines F-C05's dependent owner interface, but production personal dispatch remains unmounted until domain authority, work interfaces, prepared dispatch and migrated consumers have connected acceptance. No new helper service, registry, public API route or package export is needed.

## F-B04 — Bounded derivation and receiving

The source provider implements F-B01/F-B02 only, preserving F-B03's existing owner surface. F-B03's future host migration and F-B04's independent receiving are obligations of their respective host/assessor roles, not additional generator outputs or prerequisites requiring access to private assessment. A candidate claims a proposed source transformation, never independently assessed acceptance. Use L-F01–L-F07's fresh isolated GPT-6 Luna provider and edit-only output contract. Only src/journal/filesystem/source-owner.mjs may change, and only the constructor's optional parameter, pre-I/O validation and protected comparison. Supply the exact original constructor and existing scalarString/diagnostic helper contracts, bound to the full original source digest; preserve all outside bytes. No private receiver feedback or manual behavioral repairs. Before generation commit independent observations for matching/omitted identity, wrong identity with zero callback effects and unchanged source bytes, cleanup permitting a later correct open, invalid values rejected before filesystem access, Unicode exactness and bounds, and later host replacement invalidation. Run the original accepted owner receiver on the complete resulting module as preservation evidence. Compare all input/dependency/specification hashes before materializing and before promotion. Keep failed candidates and diagnostic results. Acceptance establishes checked host binding only, not personal authorization or a working assistant.
