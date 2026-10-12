---
title: "Capability note: @561-group/computer-abi-posix-sys-file"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/file"
---

# Capability note: @561-group/computer-abi-posix-sys-file

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/file`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: POSIX file-operation surface for the 561 computer: open/read/write/lseek/close over explicit file stores, descriptor tables, errno shadows, and 561-native evidence reports.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`, `mathematics`, `persistence`
- Bins: none
- Export subpaths: `.`, `./package.json`
- Scripts: `test`
- Dependencies: `@561-group/computer-abi-posix-errno`, `@561-group/computer-vfs-descriptor`, `@561-group/computer-vfs-fd-typing`, `@561-group/computer-vfs-io`, `@561-group/computer-vfs-mount`, `@561-group/computer-vfs-name`, `@561-group/computer-vfs-store`, `@561-group/math`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/file/README.md: `sys/file` is the first regular-file operation surface for the 561 POSIX rebuild. It provides POSIX-shadow functions over an explicit in-memory file store:
- Source hints: `src/index.d.ts`, `src/index.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
