# Design and the scheduling realization

This is **understanding-oriented**: it explains how `sched` is put together and why,
rather than how to use it (see the [how-to guides](../how-to/)) or what each call
does (see the [reference](../reference/library-api.md)). The exact signatures and
errno sets are derived in [`../dev/notes/01-conformance-spec.md`](../dev/notes/01-conformance-spec.md).

> What follows states what this repository's files say and, where it reasons beyond
> them, says so plainly. POSIX facts are the contract in the conformance spec;
> substrate facts are read from `computer/process-runtime`.

## The one constraint that shapes everything: the contract is POSIX, the realization is not

`sched` has two faces, and the whole design is about keeping them apart and honest.

- **The contract face is POSIX.** `sched_yield`, `sched_setscheduler`,
  `sched_getscheduler`, `sched_setparam`, `sched_get_priority_max`,
  `sched_get_priority_min` conform to IEEE Std 1003.1-2017 (`<sched.h>`). Their
  signatures, returns, and errno sets are fixed — a caller may rely on exactly what
  POSIX promises and no more.
- **The realization face is the 561-group computer.** `sched` does **not** wrap the
  host kernel's scheduler. It rederives the *meaning* of these calls over
  `computer/process-runtime` and the descent.

Keeping the two apart is why this package documents the contract (this tree, the man
page, the `.d.ts`) separately from the derivation (the conformance spec). It is also
why the scaffold can be conformant before it is implemented: signaling `ENOSYS` is
what POSIX says an unsupported interface must do.

## The honest division of labor

`sched` does not claim to reimplement an operating system's scheduler. It implements
exactly the scheduling interfaces it headlines, and it records where each contract
point came from (the standard) and how it maps onto the substrate. What POSIX
*promises* is one thing; how the paraconsistent computer *realizes* it is another.
The promise is in the [conformance spec](../dev/notes/01-conformance-spec.md) §1–§6;
the realization is §7.

## The core conceptual split: a policy is a trace-advance discipline, not a timer

The substrate's `process-runtime` defines a **process** as a working-system that
**settles to a fixed point**, with **no clock**. Settling is Knaster–Tarski
iteration of the read→fold→settle spine, monotonically accumulating judgments under
the bilattice knowledge order until the settled section stops moving. The decisive
fact for scheduling is the **no clock**:

- A conventional scheduler slices *time* — `SCHED_RR` gives each process a quantum
  of the clock, `SCHED_OTHER` time-shares, `SCHED_FIFO` runs until the process
  blocks. All of that is phrased in ticks.
- This substrate has no tick. So a scheduling **policy** here cannot be a time
  slice. *Beyond the files:* the design reading is that a policy is instead a
  **discipline on how processes' traces are advanced** — the order in which the
  read→fold→settle spine is iterated across the set of ready processes. `SCHED_FIFO`
  advances a chosen trace to its fixed point before moving on; round-robin
  interleaves trace-advance steps; time-sharing is a fairness discipline over the
  same. This mapping is the open design question, flagged in spec §7.

A **scheduling parameter** (`sched_priority`) is then evidence on the trace, not a
mutated field: `sched_setscheduler`/`sched_setparam` append an `{e,a,v,t}` row
recording the policy/priority, and the advance discipline reads the fold.

## Belnap-FOUR and the descent: contradiction is held, not collapsed

Governance decisions in the substrate are **FOUR-valued**: denied `f`, not-yet-settled
`⊥`, contradicted `⊤`, admitted `t`. The law `sched` inherits from the descent is the
paraconsistent one: **a contradiction `⊤` is a held value, surfaced on its own —
never collapsed into a denial, never an error**. A privilege decision about a policy
change (the `EPERM` boundary) is an admission decision; a process trace that carries
conflicting evidence about its own scheduling state holds `⊤` rather than crashing.

The POSIX surface, however, is classical: a call returns a definite policy/priority,
or `-1` and an errno. The design therefore needs a **projection** from FOUR onto the
classical POSIX contract at the boundary, while the underlying trace retains the held
contradiction for audit. *Beyond the files:* the exact projection (which FOUR value
maps to which return/errno per function — e.g. how a denied admission becomes
`EPERM`) is a design decision not yet made; it is flagged in the conformance spec
(§7.4) as `[UNCERTAIN]` to be pinned with provenance when implementing.

## The pipeline (numbered steps)

Reading `process-runtime` and the conformance spec together, the intended scheduling
realization is:

1. **`sched_get_priority_max` / `sched_get_priority_min`** report the priority range
   a policy admits — a pure query of the policy's definition, no trace mutation.
2. **`sched_setscheduler` / `sched_setparam`** append a policy/priority row to the
   target process's trace (after an admission/`EPERM` check), recording the new
   discipline as evidence rather than mutating a field.
3. **`sched_getscheduler`** reads the current policy off the settled section of the
   trace (the fold), never a status field.
4. **`sched_yield`** records that the caller relinquishes the processor — the
   advance discipline may now advance another ready process's trace.

Throughout, **evidence is linear** — never dropped, unioned on fold. No scheduling
row is silently lost; every policy/priority change is conserved in the append-only
trace for audit.

## Why the limits are limits

- **`ENOSYS` everywhere.** This is a scaffold; nothing is implemented. The limit is
  literal — and it is the *conformant* state for unimplemented interfaces, not a
  shortcut.
- **No host delegation.** The interfaces are realized over the 561-group computer by
  design. That is what makes them rederived-from-the-ground-up rather than a thin
  wrapper, and it is why the realization (§7 of the spec) is non-trivial.
- **No clock is the hard one.** Time-sharing and real-time policies are usually
  defined in ticks; this substrate has none, so the policy → trace-advance mapping
  must be derived rather than borrowed. Until it is pinned, it stays flagged.
- **Flagged uncertainties stay flagged.** Where an exact errno set, a constant's
  required presence, or the FOUR→POSIX projection could not be verified, the spec
  names the authoritative source instead of inventing an answer. The repository's
  law is to state what the files say.
