---
title: Exact decision-text ordering in causal reconstruction
date-created: 2026-09-27
type: fabrication specification
status: closed candidate correction; independent receiving required
derived-from: 2026-09-27-muse-assist-journal-operation-lld.md
derived-from-sha256: a88f18b3b61b5643745e6582a8b4f0677bfbf5954d0c7aaa84067ab883d7fb77
---

## F-R05 — Canonical decision text is the secondary ordering key

L-O22 and F-R01 require retained decisions sorted by event reference, then by the canonical JSON text of the decision itself. The unaccepted generated candidate bound below instead uses the canonical JSON text of the containing {event, obstruction} record as its secondary key. Whole-record ordering is not equivalent when one decision encoding is a prefix of another: the surrounding punctuation affects comparison. Canonical record identity remains useful for validation but must not substitute for the specified comparison dimension.

Perform an isolated exact-substring source-patchset codemod on `src/semiotic-eavt/journal/substrate.mjs` in the bound staged candidate root. Its input SHA-256 is `6695957bf6ac70b25095a48072bd7760081d120481fafdf197840da74c6e262f`. Change only the internal secondary comparison-key construction so it is the exact canonical text of the already snapshotted obstruction value, using the existing imported canonicalizeJson and JSON_RESOURCE_ENVELOPE. The record returned to callers remains the exact immutable event/obstruction snapshot. Preserve event-first comparison, exact-decision deduplication, collection validation, blocking and reception rules, snapshots and exports. Do not rewrite the surrounding module or change its host boundary.

The staged candidate is migration input, not an accepted implementation. All L-O22/F-R01–F-R04 requirements still govern the composed candidate. Use the existing source-patchset edit representation and isolated GPT-6 Luna provider, with no checkout or private receiving data. Before invocation, commit independent receiving for the whole composed behavior, including exact decision-order semantics. Recheck all read-only inputs and the original repository source before any promotion. Root materialization remains mechanical; no hand repair is authorized. Acceptance of the corrected pure reconstruction remains separate from source-owner integration and the complete assistant workflow.
