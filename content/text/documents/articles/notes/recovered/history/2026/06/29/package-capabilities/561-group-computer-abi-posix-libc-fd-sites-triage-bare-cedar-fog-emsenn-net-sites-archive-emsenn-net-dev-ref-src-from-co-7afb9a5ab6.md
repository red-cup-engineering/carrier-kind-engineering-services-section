---
title: "Capability note: @561-group/computer-abi-posix-libc-fd"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/libc/fd"
---

# Capability note: @561-group/computer-abi-posix-libc-fd

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/libc/fd`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: POSIX file-descriptor table and open-file-description model for the 561 computer libc layer, with conformant close/dup/dup2/fcntl shadows and richer evidence reports.
- Capability tags from manifest/source hints: `workspace-analysis`, `mathematics`
- Bins: none
- Export subpaths: `.`, `./package.json`
- Scripts: `test`
- Dependencies: `@561-group/computer-abi-posix-errno`, `@561-group/computer-vfs-descriptor`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/libc/fd/README.md: `fd` is the libc file-descriptor table for the 561 operating-system rebuild. It models POSIX file descriptors and open file descriptions without owning any filesystem or byte I/O mechanism.
- Source hints: `src/index.d.ts`, `src/index.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: none obvious from coarse tags

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
