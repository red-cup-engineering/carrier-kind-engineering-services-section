---
title: "Capability note: @emsenn/waggle"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/src/apps/waggle"
---

# Capability note: @emsenn/waggle

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/src/apps/waggle`
- Package kind: `src-app`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: The Hive+ledger compound app: an offline, codified, multidimensionally-witnessed record of what is in a person's Hive wallet, owning the local key store. Composes @emsenn/computing-with-hive chain reads/writes and organizing accounting record-state.
- Capability tags from manifest/source hints: `application`, `cli`, `workspace-analysis`, `persistence`
- Bins: `waggle`
- Export subpaths: `.`, `./keystore`, `./sync`, `./book`, `./cli`, `./package.json`
- Scripts: `clean`, `check`, `build`, `prepack`, `rebuild`
- Dependencies: `@emsenn/computing-with-hive`, `@emsenn/computing-with-ledgers`, `@emsenn/organizing`, `@emsenn/relating`

## Local Evidence

- No nearby README/AGENTS/CLAUDE paragraph was found by the measurement script.
- Source hints: `eslint.config.mjs`, `src/book.mts`, `src/cli.mts`, `src/crypto.mts`, `src/index.mts`, `src/keystore.mts`, `src/sync.mts`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
