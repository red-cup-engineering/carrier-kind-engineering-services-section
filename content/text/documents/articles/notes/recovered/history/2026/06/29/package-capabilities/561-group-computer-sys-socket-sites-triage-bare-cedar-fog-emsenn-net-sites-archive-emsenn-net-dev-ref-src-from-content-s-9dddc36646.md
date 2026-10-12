---
title: "Capability note: @561-group/computer-sys-socket"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/socket"
---

# Capability note: @561-group/computer-sys-socket

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/socket`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: socket — the POSIX <sys/socket.h> surface, rederived from the ground up over the 561-group paraconsistent computer. Creates communication endpoints and exchanges datagrams/streams between peers (socket, bind, connect, listen, accept, send, recv, sendto, recvfrom, shutdown), conformant to IEEE Std 1003.1-2017: C signatures, the success/failure return convention, and the full per-function errno set. The one deliberate deviation is that a peer address is a categorical term-path over the distribution/federate substrate, not an opaque sockaddr. STATUS: scaffold — the headline interfaces are documented stubs that signal ENOSYS until implemented. Node builtins only; no runtime npm dependency tree.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/socket/README.md: > **socket** — the POSIX `<sys/socket.h>` sockets subsystem of a from-the-ground-up, POSIX-conformant OS layer. > It creates communication endpoints and exchanges datagrams and streams between peers, conformant to IEEE Std 1003.1-2017. > The one deliberate deviation: a peer address is a categorical term-path over the distribution/federate substrate, not an opaque `struct sockaddr`. > Everything else conforms.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
