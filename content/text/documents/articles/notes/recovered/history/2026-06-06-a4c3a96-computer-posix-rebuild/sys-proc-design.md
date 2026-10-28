# Design and the process-lifecycle realization

This is **understanding-oriented**: it explains how `proc` is put together and why,
rather than how to use it (see the [how-to guides](../how-to/)) or what each call
does (see the [reference](../reference/library-api.md)). The exact signatures and
errno sets are derived in [`../dev/notes/01-conformance-spec.md`](../dev/notes/01-conformance-spec.md).

> What follows states what this repository's files say and, where it reasons beyond
> them, says so plainly. POSIX facts are the contract in the conformance spec;
> substrate facts are read from `computer/process-runtime`.

## The one constraint that shapes everything: the contract is POSIX, the realization is not

`proc` has two faces, and the whole design is about keeping them apart and honest.

- **The contract face is POSIX.** `fork`, `execve`, `execvp`, `waitpid`, `wait`,
  `_exit`, `getpid`, `getppid` conform to IEEE Std 1003.1-2017 (`<unistd.h>`,
  `<sys/wait.h>`). Their signatures, returns, and errno sets are fixed — a caller
  may rely on exactly what POSIX promises and no more.
- **The realization face is the 561-group computer.** `proc` does **not** wrap the
  host kernel's `fork(2)`/`execve(2)`. It rederives the *meaning* of those calls over
  `computer/process-runtime` and the descent.

Keeping the two apart is why this package documents the contract (this tree, the man
page, the `.d.ts`) separately from the derivation (the conformance spec). It is also
why the scaffold can be conformant before it is implemented: signaling `ENOSYS` is
what POSIX says an unsupported interface must do.

## The honest division of labor

`proc` does not claim to reimplement an operating system. It implements exactly the
process-control interfaces it headlines, and it records where each contract point
came from (the standard) and how it maps onto the substrate. What POSIX *promises*
is one thing; how the paraconsistent computer *realizes* it is another. The promise
is in the [conformance spec](../dev/notes/01-conformance-spec.md) §1–§8; the
realization is §9.

## The core conceptual split: a POSIX process is a settling process

The substrate's `process-runtime` defines a **process** as a working-system that
**settles to a fixed point**, with **no clock**. Settling is Knaster–Tarski
iteration of the read→fold→settle spine, monotonically accumulating judgments under
the bilattice knowledge order until the settled section stops moving
(`process-runtime/src/process.mjs`). Two consequences shape `proc`:

1. **State is a trace, not a status field.** A process's state is an append-only
   `{e,a,v,t}` (EAVT) trace; the current value is the *fold* of that trace. So a
   lifecycle call (`fork`, `exec`, `wait`, `_exit`) is realized as **appending a
   row**, not mutating a field. The pid is the trace's entity id.
2. **There is no tick.** Reaping a child (`wait`/`waitpid`) is reading whether the
   child has reached its fixed point — not polling a clock. `WNOHANG` returning 0 is
   the child reading as not-yet-settled (`⊥`); blocking is iterating until the fold
   stops moving.

## Belnap-FOUR and the descent: contradiction is held, not collapsed

Governance decisions in the substrate are **FOUR-valued**: denied `f`, not-yet-settled
`⊥`, contradicted `⊤`, admitted `t`. The law `proc` inherits from the descent is the
paraconsistent one: **a contradiction `⊤` is a held value, surfaced on its own —
never collapsed into a denial, never an error** (`process-runtime/README.md`,
`src/process.mjs`). So a process trace that carries conflicting evidence about its
own lifecycle holds `⊤` rather than crashing.

The POSIX surface, however, is classical: a call returns a definite pid and status,
or `-1` and an errno. The design therefore needs a **projection** from FOUR onto the
classical POSIX contract at the boundary, while the underlying trace retains the held
contradiction for audit. *Beyond the files:* the exact projection (which FOUR value
maps to which return/errno per function) is a design decision not yet made; it is
flagged in the conformance spec (§9.4) as `[UNCERTAIN]` to be pinned with provenance
when implementing.

## The pipeline (numbered steps)

Reading `process-runtime` and the conformance spec together, the intended lifecycle
realization is:

1. **`fork`** allocates a new process id and seeds a child trace ordered *after* the
   parent (the happens-before / predecessor edge — `orderProcess`).
2. **`execve` / `execvp`** record an image-replacement on the existing trace
   (`executeProcess` — "record an executor advancing the process"); `execvp` first
   resolves `file` against `PATH`.
3. The child **settles** toward its fixed point as its trace folds (no clock).
4. **`_exit`** records terminal status (the low 8 bits) on the child's trace.
5. **`wait` / `waitpid`** read the child's settled section (`readProcessValue`) — its
   `{ affirmations, denials, contradicted, unsettled }` — and project a reapable
   child's status onto the POSIX status int.
6. **`getpid` / `getppid`** read identity off the trace (the entity id, and the
   predecessor edge to the parent).

Throughout, **evidence is linear** — never dropped, unioned on fold
(`conserveEvidence` is the audit). No lifecycle row is silently lost.

## Why the limits are limits

- **`ENOSYS` everywhere.** This is a scaffold; nothing is implemented. The limit is
  literal — and it is the *conformant* state for unimplemented interfaces, not a
  shortcut.
- **No host delegation.** The interfaces are realized over the 561-group computer by
  design. That is what makes them rederived-from-the-ground-up rather than a thin
  wrapper, and it is why the realization (§9 of the spec) is non-trivial.
- **Flagged uncertainties stay flagged.** Where an exact errno set or the FOUR→POSIX
  projection could not be verified, the spec names the authoritative source instead
  of inventing an answer. The repository's law is to state what the files say.
