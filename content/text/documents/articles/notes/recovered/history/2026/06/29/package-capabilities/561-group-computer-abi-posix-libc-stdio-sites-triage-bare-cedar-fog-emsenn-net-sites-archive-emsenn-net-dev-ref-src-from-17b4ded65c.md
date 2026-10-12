---
title: "Capability note: @561-group/computer-abi-posix-libc-stdio"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/libc/stdio"
---

# Capability note: @561-group/computer-abi-posix-libc-stdio

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/libc/stdio`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: POSIX/C stdio stream surface for the 561 computer libc layer, with FILE streams as Chu(FOUR) carriers and standard fopen/fread/fwrite/fseek/ftell/fclose projections.
- Capability tags from manifest/source hints: `workspace-analysis`, `mathematics`
- Bins: none
- Export subpaths: `.`, `./package.json`
- Scripts: `test`
- Dependencies: `@561-group/computer-abi-posix-errno`, `@561-group/computer-abi-posix-libc-fd`, `@561-group/computer-abi-posix-sys-file`, `@561-group/math`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/libc/stdio/README.md: `stdio` is the first C/POSIX stream layer over `computer/sys/file`. It exposes `FILE`-like stream objects while preserving the conventional standard shadows:
- Source hints: `src/index.d.ts`, `src/index.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: none obvious from coarse tags

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
