---
title: "Capability note: @561-group/computer-sys-stat"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/stat"
---

# Capability note: @561-group/computer-sys-stat

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/stat`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: stat — the POSIX file-metadata subsystem (stat/fstat/lstat, chmod/fchmod, mkdir, mkfifo, umask), rederived from the ground up over the 561-group paraconsistent computer. Realizes the <sys/stat.h> interfaces over computer/posix-holography, where a file is a categorical term-path whose attributes (type, mode, size, ids, times) are read through the descent and whose permission/creation operations settle into the path's trace, with no clock. STATUS: scaffold — the interfaces are declared and documented but not yet implemented; every call currently signals ENOSYS (Function not implemented), which is itself the conformant behavior for an unimplemented POSIX interface. Node builtins only; no runtime dependency tree.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/stat/README.md: > **stat** — file metadata for a POSIX-conformant OS layer rederived from the ground up: query a file's attributes (`stat`, `fstat`, `lstat`), set its permission bits (`chmod`, `fchmod`), create a directory (`mkdir`) or a FIFO (`mkfifo`), and set the file mode creation mask (`umask`). > The interface contract is POSIX; the realization is the 561-group paraconsistent computer, where a file is a categorical term-path that classifies itself through the descent — its `st_mode` type bits are the file's own settled kind, not a host `stat(2)` call.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/_harness.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
