---
name: sched
description: "The POSIX scheduling subsystem (yield the processor, set scheduling policy/priority), rederived from the ground up over the 561-group paraconsistent computer. Conforms to <sched.h>. STATUS: scaffold — not yet implemented (every call signals ENOSYS)."
---

# @561-group/sched

> **sched** — processor scheduling for a POSIX-conformant OS layer rederived from
> the ground up: yield the processor (`sched_yield`), set and read a process's
> scheduling policy (`sched_setscheduler`, `sched_getscheduler`), set its
> scheduling parameters (`sched_setparam`), and query the priority range a policy
> allows (`sched_get_priority_max`, `sched_get_priority_min`). The interface
> contract is POSIX; the realization is the 561-group paraconsistent computer,
> where a process is a working-system that settles to a fixed point under the
> Belnap-FOUR knowledge order, with no clock.

```sh
pnpm --filter @561-group/sched test    # offline conformance proofs (currently: asserts every stub signals ENOSYS)
```

## Status

**Scaffold — not yet implemented.** This package declares and documents the full
POSIX scheduling surface, but none of it is implemented. Every interface
currently signals **`ENOSYS`** ("Function not implemented"). That is not a
placeholder accident: `ENOSYS` is the conformant behavior IEEE Std 1003.1 defines
for a process attempting to use a function that is not supported by the
implementation. The contract an implementer must meet — signatures, return
values, and the errno set per function — is written down in
[`docs/dev/notes/01-conformance-spec.md`](docs/dev/notes/01-conformance-spec.md);
implementing this package means making each stub meet that contract.

## What it does, and the honest division of labor

This repository rederives ALL knowledge from the ground up and keeps a
zero-(npm-)dependency discipline. `sched` does not wrap the host kernel's
`sched_yield(2)`/`sched_setscheduler(2)`; it rederives the *meaning* of those
interfaces over the 561-group computer.

- **The contract (POSIX).** The headlined interfaces conform to the header
  [`<sched.h>`](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sched.h.html)
  of IEEE Std 1003.1 (POSIX.1-2017). Their signatures and error contracts are the
  fixed target; see the [conformance spec](docs/dev/notes/01-conformance-spec.md).
- **The substrate (561-group).** The realization is layered on
  `computer/process-runtime` — the aperiodic process model in which a process is a
  working-system that settles to a fixed point (Knaster–Tarski over the
  bilattice knowledge order) — and **the descent**. Because the substrate has
  **no clock**, a scheduling policy is not a timer: it is a discipline on *how a
  process's trace is advanced* (the order in which the read→fold→settle spine is
  iterated across processes), and a scheduling parameter is evidence on the trace,
  not a mutated field.
- **The split.** What POSIX *promises* (the visible behavior of `sched_yield`,
  the policy/priority calls) is one thing; how the paraconsistent computer
  *realizes* it is another. The promise is in the conformance spec; the
  realization rationale is in [`docs/explanation/design.md`](docs/explanation/design.md).

## Usage (library)

```js
import {
  sched_yield, sched_setscheduler, sched_getscheduler, sched_setparam,
  sched_get_priority_max, sched_get_priority_min, SCHED_FIFO,
} from "@561-group/sched";

// SCAFFOLD: every call currently signals ENOSYS until implemented.
try {
  sched_yield();                                          // relinquish the processor
  const hi = sched_get_priority_max(SCHED_FIFO);          // top priority for the policy
  sched_setscheduler(0, SCHED_FIFO, { sched_priority: hi });
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
  sched.3          mdoc(7) manual page (section 3 — library functions)
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
- **`man 3 sched`** — a Unix manual page ([`man/sched.3`](man/sched.3), mdoc, section 3).
- **`lib/index.d.ts`** — typed API surface for editors/IDEs.

For contributing and policy, see [`CONTRIBUTING.md`](CONTRIBUTING.md),
[`AGENTS.md`](AGENTS.md), and [`SECURITY.md`](SECURITY.md).

### Derivation specs

The conformance/derivation specification — provenance, exact signatures, the
errno set per function, and the mapping onto the substrate — lives under
[`docs/dev/notes/`](docs/dev/notes/):

- [01-conformance-spec.md](docs/dev/notes/01-conformance-spec.md) — `<sched.h>`
  scheduling: signatures, return contracts, errno sets, the scheduling-policy and
  priority-range constants, and the realization over `computer/process-runtime`
  and the descent.

## Notes & limits

- **Not implemented.** This is a scaffold. The whole surface signals `ENOSYS`.
- **Conformance target is POSIX.1-2017 (IEEE Std 1003.1-2017).** Where an exact
  errno set, a policy constant's required presence, or a priority range is
  uncertain, the spec names the authoritative source to consult rather than
  inventing one.
- **No host scheduler.** The interfaces are realized over the 561-group computer,
  not delegated to the host kernel's scheduler.
- **No clock.** The substrate has no tick; a scheduling policy is a trace-advance
  discipline, not a time slice. How POSIX time-sharing (`SCHED_OTHER`) and
  real-time (`SCHED_FIFO`/`SCHED_RR`) policies project onto a clockless,
  settle-to-fixed-point model is the open design question (see the design doc and
  the conformance spec's flagged uncertainties).
