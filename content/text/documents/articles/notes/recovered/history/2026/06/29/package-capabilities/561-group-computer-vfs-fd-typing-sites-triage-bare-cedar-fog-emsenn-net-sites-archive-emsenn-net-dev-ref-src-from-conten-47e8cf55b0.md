---
title: "Capability note: @561-group/computer-vfs-fd-typing"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/vfs/fd-typing"
---

# Capability note: @561-group/computer-vfs-fd-typing

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/vfs/fd-typing`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: TRC-informed typed resource witnesses for open file descriptions: attach 561-native path/resource evidence without owning a libc or syscall surface.
- Capability tags from manifest/source hints: `workspace-analysis`, `mathematics`
- Bins: none
- Export subpaths: `.`, `./package.json`
- Scripts: `test`
- Dependencies: `@561-group/math`, `@561-group/computer-vfs-descriptor`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/vfs/fd-typing/README.md: `fd-typing` attaches Typed Resource Catalog style witnesses to POSIX open file descriptions. It does not change descriptor behavior: a file descriptor remains a small non-negative integer, and `dup`/`dup2` still share the same open file description.
- Source hints: `src/index.d.ts`, `src/index.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: none obvious from coarse tags

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
