# computer/

This is the working tree for the 561 operating-system rebuild. It is not a
workspace package. Packages live below explicit POSIX surfaces such as
`computer/sys/*` and `computer/libc/*`.

Current shape:

- `@561-group/computer-sys-file` — POSIX regular-file operations
  (`open`/`read`/`write`/`lseek`/`close`) over explicit file stores,
  descriptor tables, `Chu(FOUR)` file-store carriers, errno shadows, and
  evidence reports.
- `@561-group/computer-sys-mmap` — POSIX `<sys/mman.h>`-conformant memory
  management over term-addressed, paraconsistent memory.
- `@561-group/computer-libc-errno` — POSIX errno discipline plus richer
  561-native evidence reports.
- `@561-group/computer-libc-fd` — POSIX descriptor-table and open-file-description
  discipline over the shared errno/report surface, with fd tables exposed as
  `Chu(FOUR)` carriers and POSIX fds as projections.
- `@561-group/computer-libc-fd-typing` — TRC-informed typed resource
  witnesses attached to open file descriptions, without changing the fd integer
  shadow.
- `@561-group/computer-libc-stdio` — C/POSIX stream functions over
  `computer/sys/file`, with `FILE` stream Memes exposed as `Chu(FOUR)` carriers
  and standard `FILE *` behavior as projections.
- `@561-group/computer-proc-runtime` — math-grounded process Meme runtime:
  FOUR-valued judgments, process carriers, and conventional process-state
  projections for later POSIX process-control surfaces.

The older omnibus `@561-group/computer` package is being replaced rather than
kept as a facade. New code should target explicit package surfaces instead of
adding broad root behavior here.

## Math Descent Rule

Before adding or reshaping a `computer/*` implementation, identify the
`math/` substrate it descends from: bilattice charge/descent, Chu carrier and
transform, closure/obstruction, number tower, or another explicit math package.
The POSIX-facing value is the standard projection. The richer 561 object should
be named as a Meme when it is the native thing-with-evidence, and should remain
inspectable as a carrier, witness, morphism, report, or trace.

## Standards Pressure

Claimed standards are binding. A package that claims POSIX, IETF, C, or another
industrial standard must cite the actual surface in its docs, preserve return
values and error behavior, and add conformance tests for the subset it claims.
Internal packages such as `computer/proc/runtime` may exist before a public
standard surface, but they must say what standard API they are not claiming yet.

## Naming

`computer` is a temporary working namespace. The unit this operating substrate
computes over is a meme, not a boolean bit: an irreducible thing-with-evidence
that can settle to `t`, `f`, `⊥`, or `⊤`. When the system name is clear, rename
the public identity around that memetic unit rather than around generic
"computer" language.
