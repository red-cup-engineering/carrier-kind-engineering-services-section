---
title: "Capability note: @561-group/computer-sys-poll"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/poll"
---

# Capability note: @561-group/computer-sys-poll

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/poll`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: poll — the POSIX <poll.h> and <sys/select.h> synchronous I/O multiplexing surface, rederived from the ground up over the 561-group paraconsistent computer. Waits on readiness across multiple descriptors (poll, select, pselect) and provides the fd_set manipulators (FD_SET, FD_ISSET, FD_ZERO, FD_CLR), conformant to IEEE Std 1003.1-2017: C signatures, the success/failure return convention, and the per-function errno set. The deliberate deviation is that readiness is a Belnap-FOUR charge that has SETTLED on a descriptor's trace, not a single yes/no poll of a kernel — a descriptor is ready when its readiness charge settles to true. STATUS: scaffold — the headline interfaces are documented stubs that signal ENOSYS until implemented. Node builtins only; no runtime npm dependency tree beyond the in-repo computer substrate.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/poll/README.md: > **poll** — the POSIX `<poll.h>` and `<sys/select.h>` synchronous I/O multiplexing subsystem of a from-the-ground-up, POSIX-conformant OS layer. > It waits on readiness across multiple descriptors, conformant to IEEE Std 1003.1-2017. > The one deliberate deviation: a descriptor is *ready* when its readiness charge has *settled* on the descriptor's trace, not when a kernel is polled instantaneously. > Everything else conforms.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
