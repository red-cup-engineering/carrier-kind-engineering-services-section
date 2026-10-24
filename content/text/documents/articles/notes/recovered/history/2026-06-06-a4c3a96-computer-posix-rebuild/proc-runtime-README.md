# @561-group/computer-proc-runtime

`computer/proc/runtime` owns the current head of the 561 process runtime: a
process Meme, its FOUR-valued judgment fold, a `Chu(FOUR)` carrier, and a
conventional process-state projection.

This is not yet the POSIX process-control API. It does not claim `fork`,
`exec`, `wait`, signal, session, or process-group conformance. Those
standard-facing surfaces belong in later `computer/sys/*` and `computer/libc/*`
packages. This package is the lower object they should project from.

```js
import {
  FOUR,
  createProcessMeme,
  settleProcess,
  processProjection,
} from "@561-group/computer-proc-runtime";

const proc = createProcessMeme({
  id: "swarm:dispatch",
  judgments: [
    { name: "capability", value: FOUR.T },
    { name: "budget", value: FOUR.BOT, reason: "ledger row not admitted yet" },
  ],
});

const settled = settleProcess(proc);
const shadow = processProjection(settled);
```

## Claimed Surface

- `FOUR`, `asFour`, and the bilattice operations are re-exported from
  `@561-group/math/chu`.
- `toCharge` and `fromCharge` expose the process-boundary two-bit presentation
  of a judgment. The full evidence-carrying charge remains owned by
  `@561-group/math`.
- `meetAdmissibility`, `foldJudgments`, and `isAdmitted` define the local
  process admissibility chain: `top <= f <= bot <= t`.
- `createProcessMeme`, `settleProcess`, `processCarrier`, and
  `processProjection` provide the current process runtime object and its
  conventional shadow.
- `ProcessRuntime` is a small in-memory registry for spawning, settling, and
  reading process Memes.

## Math Grounding

A process is a Meme: the irreducible thing-with-evidence that a conventional
process-state shadow is read from. The carrier is a Chu space over `FOUR`.

- points: `process:<id>`
- states: `present`, `admitted`, `denied`, `unsettled`, `contradicted`, and
  `judgment:<name>`
- values: `FOUR` cells read from the process's own judgments

The admissibility fold is intentionally not one of the two bilattice orders. It
is a process-local obstruction chain over `FOUR`: contradiction is held as
`top`, not collapsed to denial or thrown as an exception.

## Standards Note

This package follows Node package conventions and keeps the POSIX/IETF pressure
explicit, but it does not claim a standard process API yet. When `fork`,
`exec`, `wait`, signals, file-descriptor inheritance, environment handling, or
socket/process IETF-facing behavior are added, the owning package must cite the
specific standard surface and add conformance tests for that surface.
