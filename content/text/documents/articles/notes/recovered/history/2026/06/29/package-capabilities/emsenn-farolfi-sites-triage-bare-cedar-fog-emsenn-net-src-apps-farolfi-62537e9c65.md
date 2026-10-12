---
title: "Capability note: @emsenn/farolfi"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/src/apps/farolfi"
---

# Capability note: @emsenn/farolfi

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/src/apps/farolfi`
- Package kind: `src-app`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: Command-line app for paraconsistent double-entry accounting with @emsenn/ledger.
- Capability tags from manifest/source hints: `application`, `cli`, `workspace-analysis`, `persistence`
- Bins: `farolfi`, `ledger`
- Export subpaths: `.`, `./cli`, `./package.json`
- Scripts: `clean`, `check`, `build`, `prepack`, `rebuild`
- Dependencies: `@emsenn/computing-with-ledgers`, `@emsenn/organizing`, `@emsenn/relating`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/src/apps/farolfi/README.md: Farolfi is the command-line application for `@emsenn/trading/ledger`.
- Source hints: `src/bin/farolfi.mts`, `src/cli/args.mts`, `src/cli/datom-journal.mts`, `src/cli/dispatch.mts`, `src/cli/io.mts`, `src/cli/parse.mts`, `src/index.mts`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
