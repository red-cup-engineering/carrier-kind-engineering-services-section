---
name: proc
description: "The POSIX process-lifecycle subsystem (fork/exec/wait/exit), rederived from the ground up over the 561-group paraconsistent computer. Conforms to <unistd.h> and <sys/wait.h>. STATUS: scaffold — not yet implemented (every call signals ENOSYS)."
---

# @561-group/proc

> **proc** — process lifecycle for a POSIX-conformant OS layer rederived from the
> ground up: create a process (`fork`), replace its image (`execve`, `execvp`),
> reap children (`waitpid`, `wait`), and exit (`_exit`), plus identity
> (`getpid`, `getppid`). The interface contract is POSIX; the realization is the
> 561-group paraconsistent computer, where a process is a working-system that
> settles to a fixed point under the Belnap-FOUR knowledge order, with no clock.

```sh
pnpm --filter @561-group/proc test    # offline conformance proofs (currently: asserts every stub signals ENOSYS)
```

## Status

**Scaffold — not yet implemented.** This package declares and documents the full
POSIX process-control surface, but none of it is implemented. Every interface
currently signals **`ENOSYS`** ("Function not implemented"). That is not a
placeholder accident: `ENOSYS` is the conformant behavior IEEE Std 1003.1 defines
for a process attempting to use a function that is not supported by the
implementation. The contract an implementer must meet — signatures, return
values, and the errno set per function — is written down in
[`docs/dev/notes/01-conformance-spec.md`](docs/dev/notes/01-conformance-spec.md);
implementing this package means making each stub meet that contract.

## What it does, and the honest division of labor

This repository rederives ALL knowledge from the ground up and keeps a
zero-(npm-)dependency discipline. `proc` does not wrap the host kernel's
`fork(2)`/`execve(2)`; it rederives the *meaning* of those interfaces over the
561-group computer.

- **The contract (POSIX).** The headlined interfaces conform to the headers
  [`<unistd.h>`](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/unistd.h.html)
  and
  [`<sys/wait.h>`](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_wait.h.html)
  of IEEE Std 1003.1 (POSIX.1-2017). Their signatures and error contracts are the
  fixed target; see the [conformance spec](docs/dev/notes/01-conformance-spec.md).
- **The substrate (561-group).** The realization is layered on
  `computer/process-runtime` — the aperiodic process model in which a process is a
  working-system that settles to a fixed point (Knaster–Tarski over the
  bilattice knowledge order) — and **the descent**. A POSIX process is a
  process-runtime process; lifecycle calls append `{e,a,v,t}` rows to its
  append-only trace and read the fold, rather than mutating a status field.
- **The split.** What POSIX *promises* (the visible behavior of `fork`/`exec`/
  `wait`/`_exit`) is one thing; how the paraconsistent computer *realizes* it is
  another. The promise is in the conformance spec; the realization rationale is
  in [`docs/explanation/design.md`](docs/explanation/design.md).

## Usage (library)

```js
import { fork, execvp, waitpid, _exit, getpid } from "@561-group/proc";

// SCAFFOLD: every call currently signals ENOSYS until implemented.
try {
  const pid = fork();
  if (pid === 0) {
    execvp("ls", ["ls", "-l"]);   // replaces the image on success; returns -1 only on error
    _exit(127);                    // reached only if execvp failed
  } else {
    const status = {};
    waitpid(pid, status, 0);
  }
} catch (err) {
  // err.code === "ENOSYS" while this package is a scaffold
}
```

## Layout

```
lib/
  index.mjs        the public surface: documented stubs for every headline interface (all signal ENOSYS)
  index.d.ts       hand-authored TypeScript declarations mirroring index.mjs
man/
  proc.2           mdoc(7) manual page (section 2 — POSIX system interfaces)
docs/
  README.md        Diátaxis routing index
  tutorials/       getting-started walkthrough (skeleton)
  how-to/          task recipes (skeleton)
  reference/       library-api.md — the full interface contract to implement
  explanation/     design.md — the paraconsistent-math rationale
  dev/notes/       01-conformance-spec.md — the load-bearing POSIX conformance spec
tests/
  prove-conformance.mjs   asserts every stub currently signals ENOSYS (+ TODOs for real conformance tests)
```

## Documentation

- **[`docs/`](docs/)** — a [Diátaxis](https://diataxis.fr/)-organized tree:
  [tutorial](docs/tutorials/getting-started.md),
  [how-to guides](docs/how-to/),
  [reference](docs/reference/library-api.md), and
  [explanation](docs/explanation/design.md).
- **`man 2 proc`** — a Unix manual page ([`man/proc.2`](man/proc.2), mdoc, section 2).
- **`lib/index.d.ts`** — typed API surface for editors/IDEs.

For contributing and policy, see [`CONTRIBUTING.md`](CONTRIBUTING.md),
[`AGENTS.md`](AGENTS.md), and [`SECURITY.md`](SECURITY.md).

### Derivation specs

The conformance/derivation specification — provenance, exact signatures, the
errno set per function, and the mapping onto the substrate — lives under
[`docs/dev/notes/`](docs/dev/notes/):

- [01-conformance-spec.md](docs/dev/notes/01-conformance-spec.md) — `<unistd.h>` /
  `<sys/wait.h>` process control: signatures, return contracts, errno sets, and
  the realization over `computer/process-runtime` and the descent.

## Notes & limits

- **Not implemented.** This is a scaffold. The whole surface signals `ENOSYS`.
- **Conformance target is POSIX.1-2017 (IEEE Std 1003.1-2017).** Where an exact
  errno set is uncertain, the spec names the authoritative source to consult
  rather than inventing one.
- **No host `fork`/`exec`.** The interfaces are realized over the 561-group
  computer, not delegated to the host kernel.
