---
title: "Capability note: @561-group/computer-sys-sem"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/sem"
---

# Capability note: @561-group/computer-sys-sem

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/sem`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: sem — the POSIX <semaphore.h> surface, rederived from the ground up over the 561-group paraconsistent computer. Named and unnamed counting semaphores for cross-process/thread gating (sem_open, sem_wait, sem_trywait, sem_post, sem_close, sem_unlink, sem_init), conformant to IEEE Std 1003.1-2017: C signatures, the success/failure-plus-errno return convention, and the full per-function errno set. The realization is over the charge — a Belnap-FOUR count held on a shared trace, where a semaphore is the charge that gates which working-system may advance, not a wall-clock wait. STATUS: scaffold — the headline interfaces are documented stubs that signal ENOSYS until implemented. Node builtins only; no runtime npm dependency tree.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/sem/README.md: > **sem** — counting semaphores for a POSIX-conformant OS layer rederived from the ground up: open a named semaphore (`sem_open`), gate on its count (`sem_wait`, `sem_trywait`, `sem_post`), release and remove it (`sem_close`, `sem_unlink`), and initialize an unnamed one in place (`sem_init`). > The interface contract is POSIX; the realization is over **the charge** — a semaphore's count is a Belnap-FOUR datum held on a shared, append-only trace, and a wait/post is a charge that gates which working-system may advance, not a wall-clock wait.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/_harness.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
