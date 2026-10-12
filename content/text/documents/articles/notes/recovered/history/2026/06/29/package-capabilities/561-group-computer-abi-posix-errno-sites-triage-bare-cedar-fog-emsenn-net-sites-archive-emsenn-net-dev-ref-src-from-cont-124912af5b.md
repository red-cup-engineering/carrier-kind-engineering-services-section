---
title: "Capability note: @561-group/computer-abi-posix-errno"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/errno"
---

# Capability note: @561-group/computer-abi-posix-errno

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/errno`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: POSIX errno discipline for the 561 computer ABI: a conformant errno cell, symbolic error table, typed POSIX errors, and richer 561-native reports carrying bilattice evidence.
- Capability tags from manifest/source hints: `workspace-analysis`, `mathematics`
- Bins: none
- Export subpaths: `.`, `./package.json`
- Scripts: `test`
- Dependencies: `@561-group/math`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/errno/README.md: `errno` is the first libc package for the 561 operating-system rebuild. It provides the POSIX-facing error cell and symbolic error table that `computer/sys` packages need, plus richer 561-native report objects that preserve evidence.
- Source hints: `src/index.d.ts`, `src/index.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: none obvious from coarse tags

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
