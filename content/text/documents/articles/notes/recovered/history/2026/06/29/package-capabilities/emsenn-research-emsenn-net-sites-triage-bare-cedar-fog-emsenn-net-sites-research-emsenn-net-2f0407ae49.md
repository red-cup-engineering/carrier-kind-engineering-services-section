---
title: "Capability note: @emsenn/research.emsenn.net"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/research.emsenn.net"
---

# Capability note: @emsenn/research.emsenn.net

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/research.emsenn.net`
- Package kind: `site`
- Declared workspace entries: `sites/research.emsenn.net`
- Description: Thin research.emsenn.net box: mounts ICK ⊕ the knowledge-vault face over ./content.
- Capability tags from manifest/source hints: `application`, `service`, `content-production`, `knowledge`, `persistence`
- Bins: none
- Export subpaths: none
- Scripts: `serve`, `check`
- Dependencies: `@emsenn/content`, `@emsenn/http-server`, `@emsenn/organizing`, `@emsenn/organizing-a-knowledge-vault`, `@emsenn/producing-content`, `@emsenn/relating`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/research.emsenn.net/README.md: Personal dev workbench for the emsenn.net knowledge vault. Runs locally on port 18800. Federated with `research. 561.group` by shared data format (`content/` submodule) only — no code dependency between the two sites.
- Source hints: `scripts/admit-corpus.mjs`, `scripts/admit-document.mjs`, `scripts/apply-endomorphism.mjs`, `scripts/assert-fact.mjs`, `scripts/check-scripts.mjs`, `scripts/compose-document.mjs`, `scripts/concept-map.mjs`, `scripts/corpus-catalog.mjs`, `scripts/create-document.mjs`, `scripts/draft-document.mjs`, `scripts/endomorphism-strategy.mjs`, `scripts/find-name.mjs`, `scripts/grep-text.mjs`, `scripts/inspect-health.mjs`, `scripts/inspect-root.mjs`, `scripts/inspect-topic.mjs`, `scripts/list-path.mjs`, `scripts/measure-gap.mjs`, `scripts/nominate-placement.mjs`, `scripts/normalize-corpus.mjs`, `scripts/observe-corpus.mjs`, `scripts/plan-normalization.mjs`, `scripts/prepare-document.mjs`, `scripts/read-facts.mjs`, `scripts/read-file.mjs`, `scripts/settle-corpus.mjs`, `scripts/update-body.mjs`, `scripts/update-frontmatter.mjs`, `scripts/upload-triage-file.mjs`, `src/knowledge-vault-web-server/library-web-ux.mts`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: none found by name
- Capability classes not directly realized by infography's exported package surface: `application`, `content-production`, `knowledge`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
