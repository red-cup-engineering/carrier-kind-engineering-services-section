---
title: "Capability note: @561-group/computer-sys-thread"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/thread"
---

# Capability note: @561-group/computer-sys-thread

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/thread`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: thread — the POSIX threads-and-synchronization subsystem (spawn/join threads and coordinate with mutexes, conditions, and rwlocks), rederived from the ground up over the 561-group paraconsistent computer. Realizes the <pthread.h> interfaces (pthread_create, pthread_join, pthread_mutex_lock, pthread_mutex_unlock, pthread_cond_wait, pthread_cond_signal, pthread_rwlock_rdlock) over the descent / federate — a thread is a working-system that settles to a fixed point under the Belnap-FOUR knowledge order, with no clock, so synchronization is a discipline on how concurrent traces are ordered and folded, not a wall-clock wait. STATUS: scaffold — the interfaces are declared and documented but not yet implemented; every call currently signals ENOSYS (Function not implemented), which is itself the conformant behavior for an unimplemented POSIX interface. Node builtins only; no runtime dependency tree.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`, `knowledge`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/thread/README.md: > **thread** — threads and synchronization for a POSIX-conformant OS layer rederived from the ground up: spawn and join threads (`pthread_create`, `pthread_join`), guard a critical section with a mutex (`pthread_mutex_lock`, `pthread_mutex_unlock`), wait on and signal a condition (`pthread_cond_wait`, `pthread_cond_signal`), and take a read lock (`pthread_rwlock_rdlock`). > The interface contract is POSIX; the realization is the 561-group paraconsistent computer, where a thread is a working-system that settles to a fixed point under the Belnap-FOUR knowledge order, with no clock.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/_harness.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`, `knowledge`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
