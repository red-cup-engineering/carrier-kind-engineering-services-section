---
title: "Capability note: @emsenn/research.561.group"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/src/apps/research.561.group"
---

# Capability note: @emsenn/research.561.group

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/src/apps/research.561.group`
- Package kind: `src-app`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: Thin package-bin transporter for organizing 561 Group knowledge vaults.
- Capability tags from manifest/source hints: `application`, `service`, `cli`, `workspace-analysis`, `content-production`, `knowledge`, `persistence`
- Bins: `admit-document`, `admit-corpus`, `apply-endomorphism`, `assert-fact`, `compose-document`, `concept-map`, `create-document`, `draft-document`, `endomorphism-strategy`, `find-name`, `grep-text`, `inspect-health`, `inspect-root`, `inspect-topic`, `corpus-catalog`, `list-path`, `measure-gap`, `nominate-placement`, `normalize-corpus`, `observe-corpus`, `plan-normalization`, `prepare-document`, `read-facts`, `read-file`, `settle-corpus`, `update-body`, `update-frontmatter`, `upload-triage-file`
- Export subpaths: `.`, `./organizing-with-a-knowledge-vault`, `./knowledge-vault-web-server`, `./server`, `./package.json`
- Scripts: `serve`, `check`, `normalize`
- Dependencies: `@emsenn/content`, `@emsenn/http-server`, `@emsenn/jsnode-ick`, `@emsenn/knowing`, `@emsenn/organizing`, `@emsenn/organizing-a-knowledge-vault`, `@emsenn/producing-content`, `@emsenn/relating`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/src/apps/research.561.group/README.md: A thin HTTP transporter for the 561 Group research library's **categorical research computer**. The package exposes knowledge-vault functions through `package.json#bin` scripts; `@emsenn/jsnode-ick/package-bin-web` projects that script computer as HTTP JSON endpoints, OpenAPI, MCP, and a package-bin inspection UI at `/computer`. The public browser pages are a thin HTML reading surface over the same source functions, not a second operation API.
- Source hints: `scripts/admit-corpus.mjs`, `scripts/admit-document.mjs`, `scripts/apply-endomorphism.mjs`, `scripts/assert-fact.mjs`, `scripts/check-scripts.mjs`, `scripts/compose-document.mjs`, `scripts/concept-map.mjs`, `scripts/corpus-catalog.mjs`, `scripts/create-document.mjs`, `scripts/draft-document.mjs`, `scripts/endomorphism-strategy.mjs`, `scripts/find-name.mjs`, `scripts/grep-text.mjs`, `scripts/inspect-health.mjs`, `scripts/inspect-root.mjs`, `scripts/inspect-topic.mjs`, `scripts/list-path.mjs`, `scripts/measure-gap.mjs`, `scripts/nominate-placement.mjs`, `scripts/normalize-corpus.mjs`, `scripts/observe-corpus.mjs`, `scripts/plan-normalization.mjs`, `scripts/prepare-document.mjs`, `scripts/read-facts.mjs`, `scripts/read-file.mjs`, `scripts/settle-corpus.mjs`, `scripts/update-body.mjs`, `scripts/update-frontmatter.mjs`, `scripts/upload-triage-file.mjs`, `src/knowledge-vault-web-server/app.mts`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`, `content-production`, `knowledge`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
