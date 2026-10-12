---
title: Preserve logical journal paths in query predicates
date-created: 2026-09-28
type: fabrication specification
status: exact candidate correction; independent receiving required
derived-from: 2026-09-27-muse-assist-journal-operation-lld.md
derived-from-sha256: 2c272385eaf95608d61af963637f4e1dfb43abb5390a96059903e13cfd87cc4d
---

## F-Q07 — Logical paths use the journal directory

L-O24/L-O29 and F-Q03 preserve absolute logical journal paths as inputs to trusted feed-selection predicates. The unaccepted generated facade with SHA-256 `5d738b7fe967fa7e3916e19850e48457b5239bba8d05a0979be67d54c78fe81f` passes settlementRoot/feed to those predicates. A feed membership is relative to journalDirectoryOf(settlementRoot), so that path drops the journal-directory component and changes selection. This affects date and through-date predicates, including scans that correctly exclude unrelated pending feeds.

Use an isolated exact source-patchset codemod of that staged facade, changing only the logicalPath assignment in feedsForDate and feedsThroughDate. Both functions receive a settlement root. Resolve that root through the existing imported journalDirectoryOf before calling feedPath. Preserve listFeeds calls that already pass an actual store directory, all instance custody fixes, row and callback contracts, causal closure selection, exact source-status meanings and every other source byte. The owner file is staged as an unchanged dependency with SHA-256 `e2d23997600464f4ee72f5bf5b102c1b18bd6fd5a20bd504276718d012e8eee9`.

The provider receives the exact two unique loop/assignment snippets, relevant helper source, public contract and input digest. Return one ordinary source-patchset edit with two replacements; no new helper, import, runtime, storage layer or manual source repair. The strict materializer applies the generated edit in a new staging root. Bind the complete two-file staged input and current repository dependencies. Before generation, commit the unchanged full query receiver from attempt07; receiving must exercise the entire composed candidate, not just matching path text. Source review must verify every byte outside these two assignments is unchanged. Earlier candidates remain unaccepted; passing this correction does not authorize disconnected runtime promotion.
