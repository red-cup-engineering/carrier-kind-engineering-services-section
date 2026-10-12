---
title: Deterministic normalization of source selector newline escaping
date-created: 2026-09-28
type: fabrication-specification
derived-from: 2026-09-27-source-patchset-fabrication.md
status: narrowly bounded mechanical source-selector transformation
---

## Purpose and boundary

The declaration-generation provider produced replacement bodies but repeatedly double-escaped a JavaScript newline escape in two source selectors. These candidates remain rejected by the strict source-patchset materializer. Repeating inference to reproduce already-known input bytes adds cost without deriving product behavior. This order permits one deterministic transformation of source selectors before the existing strict materializer. It does not relax that materializer or authorize handwritten repairs to generated replacement bodies.

## N-S01 — Exact input and transformation

Bind the rejected candidate, original complete source inventory and each source hash. Process replacements in their declared order against the guarded original source and the preceding generated replacements. Keep an already unique exact selector unchanged. Reject an empty selector or a selector that matches more than once.

Only when a selector has zero exact matches, replace each literal sequence of two backslashes followed by the letter n with one backslash followed by n, once. This is literal character replacement, not JSON decoding or interpretation of other escapes. Require that this changes the selector and yields exactly one match in the current source. Otherwise refuse the entire transformation. Never infer an insertion point, choose the closest text, change offsets, or normalize other escape sequences.

Change only replacement.before. Preserve every replacement.after byte-for-byte, every operation/path/hash/clause, and replacement order. Never normalize emitted product source. If a generated replacement body contains an error, it remains a generated candidate requiring fresh derivation. The normalizer writes a new candidate and receipt; it never changes the checkout or overwrites the rejected provider output.

## N-S02 — Receiving and evidence

Record original and normalized candidate hashes, inventory/specification hashes, and each changed selector's hashes. Prove replacement bodies and all other fields identical. Run the existing strict guarded materializer on the normalized candidate into a new external stage. Run the same private declaration-generation, discovery, authorization and recovery receiving conditions committed before the provider invocation. Preserve the original rejection and provider provenance; do not fabricate a new provider invocation or claim the provider produced the normalized selector strings.

Normalization and successful staging are not behavioral acceptance. Connected promotion still requires all F-G04 obligations. This fabrication-only mechanical transformation creates no application compatibility adapter, registry, or new runtime obligation.
