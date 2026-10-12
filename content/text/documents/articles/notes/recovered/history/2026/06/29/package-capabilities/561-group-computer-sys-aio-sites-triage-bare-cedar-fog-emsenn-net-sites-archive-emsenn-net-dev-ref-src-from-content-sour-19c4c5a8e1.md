---
title: "Capability note: @561-group/computer-sys-aio"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/aio"
---

# Capability note: @561-group/computer-sys-aio

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/aio`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: aio — the POSIX <aio.h> asynchronous I/O surface, rederived from the ground up over the 561-group paraconsistent computer. Enqueues read/write requests against a descriptor and reaps their completions out of band (aio_read, aio_write, aio_error, aio_return, aio_suspend, aio_cancel, lio_listio), conformant to IEEE Std 1003.1-2017: C signatures, the success/failure return convention, and the per-function errno set. The deliberate deviation is that an in-flight request's completion is a Belnap-FOUR charge that SETTLES on the request's trace — an operation is in progress (EINPROGRESS) until its completion charge settles, at which point aio_error/aio_return report its outcome. STATUS: scaffold — the headline interfaces are documented stubs that signal ENOSYS until implemented. Node builtins only; no runtime npm dependency tree beyond the in-repo computer substrate.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/aio/README.md: > **aio** — the POSIX `<aio.h>` asynchronous I/O subsystem of a from-the-ground-up, POSIX-conformant OS layer. > It enqueues read/write requests and reaps their completions out of band, conformant to IEEE Std 1003.1-2017. > The one deliberate deviation: an in-flight request is *complete* when its completion charge has *settled* on the request's trace, not when a kernel completion queue is polled instantaneously. > Everything else conforms.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
