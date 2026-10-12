---
title: "Capability note: @561-group/computer-abi-posix-sys-proc"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/proc"
---

# Capability note: @561-group/computer-abi-posix-sys-proc

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/proc`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: POSIX process-lifecycle and identity surface for the 561 computer: process identity, wait-status projections, syscall-backed reports, and ENOSYS shadows for unimplemented lifecycle calls.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: `@561-group/computer-abi-posix-errno`, `@561-group/computer-kernel-process`, `@561-group/computer-kernel-syscall`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/proc/README.md: > **proc** — process lifecycle for a POSIX-conformant OS layer rederived from the ground up: create a process (`fork`), replace its image (`execve`, `execvp`), reap children (`waitpid`, `wait`), and exit (`_exit`), plus identity (`getpid`, `getppid`). > The interface contract is POSIX; the realization is the 561-group paraconsistent computer, where a process is a working-system that settles to a fixed point under the Belnap-FOUR knowledge order, with no clock.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
