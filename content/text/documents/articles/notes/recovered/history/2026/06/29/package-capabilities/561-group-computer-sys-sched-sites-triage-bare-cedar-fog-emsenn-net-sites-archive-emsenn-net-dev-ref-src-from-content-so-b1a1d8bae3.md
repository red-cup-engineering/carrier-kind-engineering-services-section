---
title: "Capability note: @561-group/computer-sys-sched"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/sched"
---

# Capability note: @561-group/computer-sys-sched

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/sched`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: sched — the POSIX scheduling subsystem (yield the processor, set scheduling policy/priority), rederived from the ground up over the 561-group paraconsistent computer. Realizes the <sched.h> interfaces (sched_yield, sched_setscheduler, sched_getscheduler, sched_setparam, sched_get_priority_max, sched_get_priority_min) over computer/kernel/process and the descent — a process is a working-system that settles to a fixed point under the Belnap-FOUR knowledge order, with no clock, so a scheduling policy is a discipline on how a process's trace is advanced, not a timer. STATUS: scaffold — the interfaces are declared and documented but not yet implemented; every call currently signals ENOSYS (Function not implemented), which is itself the conformant behavior for an unimplemented POSIX interface. Node builtins only; no runtime dependency tree.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`, `knowledge`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/sched/README.md: > **sched** — processor scheduling for a POSIX-conformant OS layer rederived from the ground up: yield the processor (`sched_yield`), set and read a process's scheduling policy (`sched_setscheduler`, `sched_getscheduler`), set its scheduling parameters (`sched_setparam`), and query the priority range a policy allows (`sched_get_priority_max`, `sched_get_priority_min`). > The interface contract is POSIX; the realization is the 561-group paraconsistent computer, where a process is a working-system that settles to a fixed point under the Belnap-FOUR knowledge order, with no clock.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/_harness.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`, `knowledge`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
