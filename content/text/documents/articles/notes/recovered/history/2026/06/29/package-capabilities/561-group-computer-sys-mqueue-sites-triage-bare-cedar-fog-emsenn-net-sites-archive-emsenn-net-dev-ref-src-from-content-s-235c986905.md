---
title: "Capability note: @561-group/computer-sys-mqueue"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/mqueue"
---

# Capability note: @561-group/computer-sys-mqueue

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/mqueue`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: mqueue — the POSIX <mqueue.h> message-queue surface, rederived from the ground up over the 561-group paraconsistent computer. Opens named message queues and sends/receives prioritized messages against them (mq_open, mq_send, mq_receive, mq_close, mq_unlink, mq_getattr, mq_notify), conformant to IEEE Std 1003.1-2017: C signatures, the success/failure return convention, and the per-function errno set. The deliberate deviation is that a queue's readiness for a send or a receive — full, empty, or admitting — is a Belnap-FOUR charge that SETTLES on the queue's trace: a blocking send/receive waits on that charge rather than spinning a kernel wait-queue. STATUS: scaffold — the headline interfaces are documented stubs that signal ENOSYS until implemented. Node builtins only; no runtime npm dependency tree beyond the in-repo computer substrate.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/mqueue/README.md: > **mqueue** — the POSIX `<mqueue.h>` message-queue subsystem of a from-the-ground-up, POSIX-conformant OS layer. > It opens named message queues and sends/receives prioritized messages, conformant to IEEE Std 1003.1-2017. > The one deliberate deviation: a queue's readiness for an operation is *complete* when its readiness charge has *settled* on the queue's trace, not when a kernel wait-queue is spun instantaneously. > Everything else conforms.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
