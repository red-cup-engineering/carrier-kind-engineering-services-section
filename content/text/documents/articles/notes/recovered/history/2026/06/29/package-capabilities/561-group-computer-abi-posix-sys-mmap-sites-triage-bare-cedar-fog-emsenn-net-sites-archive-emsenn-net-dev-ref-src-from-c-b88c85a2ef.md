---
title: "Capability note: @561-group/computer-abi-posix-sys-mmap"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/mmap"
---

# Capability note: @561-group/computer-abi-posix-sys-mmap

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/mmap`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: POSIX <sys/mman.h>-conformant memory-management unit (mmap/munmap/mprotect/msync/mlock/shm_*) projected over @561-group/computer-mm-term-memory. The address is a categorical term-path (a valid POSIX path) derived from a datum's meaning, never assigned, so the store needs no index; a cell holds a four-valued Belnap charge, so contradiction (top) is live data, not a fault.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`, `persistence`
- Bins: none
- Export subpaths: `.`, `./package.json`
- Scripts: `test`
- Dependencies: `@561-group/computer-mm-address-space`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/mmap/README.md: POSIX `<sys/mman.h>` memory management over term-addressed, paraconsistent memory.
- Source hints: `src/constants.mjs`, `src/errno.mjs`, `src/index.d.ts`, `src/index.mjs`, `src/mman.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
