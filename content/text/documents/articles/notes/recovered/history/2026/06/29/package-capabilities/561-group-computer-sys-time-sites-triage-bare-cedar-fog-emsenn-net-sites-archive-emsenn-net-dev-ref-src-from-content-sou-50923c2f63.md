---
title: "Capability note: @561-group/computer-sys-time"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/time"
---

# Capability note: @561-group/computer-sys-time

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/time`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: time — the POSIX <time.h>/<sys/time.h> clocks-and-timers surface, rederived from the ground up over the 561-group paraconsistent computer. Reads time, sleeps, and arms per-process interval timers (clock_gettime, clock_settime, nanosleep, timer_create, timer_settime, gettimeofday), conformant to IEEE Std 1003.1-2017: C signatures, the success/failure return convention, and the full per-function errno set. Time is measured by the computer/posix-holography logical clock, not a hardware oscillator. STATUS: scaffold — the headline interfaces are documented stubs that signal ENOSYS until implemented. Node builtins only; no runtime npm dependency tree.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/time/README.md: > **time** — the POSIX `<time.h>` / `<sys/time.h>` clocks-and-timers subsystem of a from-the-ground-up, POSIX-conformant OS layer. > It reads time, sleeps, and arms per-process interval timers, conformant to IEEE Std 1003.1-2017. > The deliberate deviation: "now" is *measured* by the `computer/posix-holography` logical clock — deterministic and advance-only — not sampled from a hardware oscillator. > Everything else conforms.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
