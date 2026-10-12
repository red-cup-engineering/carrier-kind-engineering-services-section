---
title: "Capability note: @561-group/computer-sys-dir"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/dir"
---

# Capability note: @561-group/computer-sys-dir

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/dir`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: dir — the POSIX directory-stream subsystem (opendir/readdir/rewinddir/closedir, and the thread-safe readdir_r), rederived from the ground up over the 561-group paraconsistent computer. Realizes the <dirent.h> directory-stream interfaces over computer/posix-holography, where a directory is a categorical term-path whose entries are read through the descent. A directory stream (DIR *) is a settled handle that iterates that path's entry trace in order, with no clock. STATUS: scaffold — the interfaces are declared and documented but not yet implemented; every call currently signals ENOSYS (Function not implemented), which is itself the conformant behavior for an unimplemented POSIX interface. Node builtins only; no runtime dependency tree.
- Capability tags from manifest/source hints: `workspace-analysis`, `operations`
- Bins: none
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `man`
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/computer/abi/posix/sys/dir/README.md: > **dir** — directory streams for a POSIX-conformant OS layer rederived from the ground up: open a directory stream (`opendir`), read its entries one at a time (`readdir`, and the thread-safe `readdir_r`), rewind it to the start (`rewinddir`), and close it (`closedir`). > The interface contract is POSIX; the realization is the 561-group paraconsistent computer, where a directory is a categorical term-path whose entries are read through the descent, and a directory stream (`DIR *`) is a settled handle that iterates that path's entry trace in order, with no clock.
- Source hints: `lib/index.d.ts`, `lib/index.mjs`, `tests/_harness.mjs`, `tests/prove-conformance.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `operations`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
