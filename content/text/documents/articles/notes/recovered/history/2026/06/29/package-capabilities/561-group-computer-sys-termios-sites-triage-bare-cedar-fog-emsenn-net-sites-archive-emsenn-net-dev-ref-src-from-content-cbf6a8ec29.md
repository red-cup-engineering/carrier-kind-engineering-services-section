---
title: "Capability note: @561-group/computer-sys-termios"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/termios"
---

# Capability note: @561-group/computer-sys-termios

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/termios`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: termios — the POSIX <termios.h> terminal-control surface, rederived from the ground up over the 561-group paraconsistent computer. Queries and configures the terminal line discipline and baud rates (tcgetattr, tcsetattr, cfsetispeed, cfsetospeed, cfgetispeed, tcflush, tcdrain), conformant to IEEE Std 1003.1-2017: C signatures, the success/failure-plus-errno return convention, and the full per-function errno set. The one deliberate deviation is that a terminal's controlling state is a Belnap-FOUR charge on the interface membrane rather than opaque device-driver state. STATUS: scaffold — the headline interfaces are documented stubs that signal ENOSYS until implemented. Node builtins only; no runtime npm dependency tree.
- Capability tags from manifest/source hints: `cli`, `workspace-analysis`, `operations`, `persistence`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/termios/README.md: > **termios** — the POSIX `<termios.h>` terminal-control subsystem of a from-the-ground-up, POSIX-conformant OS layer. > It queries and configures the terminal line discipline and baud rates, conformant to IEEE Std 1003.1-2017. > The one deliberate deviation: a terminal's controlling state is a Belnap-FOUR charge on the interface membrane (`apps/interface`), not opaque device-driver state. > Everything else conforms.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
