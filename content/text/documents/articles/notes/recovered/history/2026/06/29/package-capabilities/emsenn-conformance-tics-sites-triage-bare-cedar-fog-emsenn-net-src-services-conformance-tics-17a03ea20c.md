---
title: "Capability note: @emsenn/conformance-tics"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/src/services/conformance-tics"
---

# Capability note: @emsenn/conformance-tics

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/src/services/conformance-tics`
- Package kind: `src-service`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: Live package-conformance service: runs conformance checks on demand for paths registered at startup.
- Capability tags from manifest/source hints: `service`, `workspace-analysis`, `operations`
- Bins: `conformance-tics`
- Export subpaths: `.`, `./server`, `./package.json`
- Scripts: `check`, `serve`
- Dependencies: `@emsenn/jsnode-ick`, `@emsenn/http-server`

## Local Evidence

- No nearby README/AGENTS/CLAUDE paragraph was found by the measurement script.
- Source hints: `src/index.ts`, `src/server.ts`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
