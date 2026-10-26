# POSIX-conformant 561 operating system roadmap

Status: active roadmap.

This note records the active rebuild goal for the repository:

> Rebuild the repository into a literally POSIX-conformant 561 operating system, where
> `math/` supplies the semantic substrate, `computer/sys` and `computer/libc`
> provide the standard-facing OS interface, and existing apps, tools, and games
> are progressively cannibalized into both implementation material and
> conformance pressure tests. Claimed standard APIs must meet the actual specs,
> return conventions, errno behavior, and conformance tests; they are not just
> Unix-inspired Node modules. Preserve POSIX behavior, but expose richer
> 561-native reports and logic carrying paraconsistency, evidence, witnesses,
> traces, provenance, governance, and resource accounting. No backward
> compatibility with current experimental package boundaries is required.

## Current state

The current tree is in transition. `computer/` is now an OS source tree, not an
installed Unix layout:

- `math/` is the semantic substrate: bilattice, Chu spaces, closure,
  obstruction, number, and related kernels.
- `computer/boot` builds the first kernel image Meme from platform, arch,
  calculus, kernel authority, POSIX membrane metadata, and first userspace.
- `computer/plat/host-js` is the first software platform carrier: the Node host
  that carries the kernel while the system is hosted.
- `computer/kernel/process` contains the first kernel process/task authority:
  process Memes, FOUR-valued judgment folds, `Chu(FOUR)` process carriers, and
  conventional process-state projections. It is not yet a POSIX
  `fork`/`exec`/`wait` surface.
- `computer/sys/file` currently contains the first POSIX regular-file operation
  surface: `open`, `read`, `write`, `lseek`, and `close` over explicit file
  stores, descriptor tables, `Chu(FOUR)` file-store carriers, errno shadows, and
  report variants.
- `computer/sys/mmap` currently contains the first implemented POSIX-conformant
  system-interface package.
- `computer/libc/errno` currently contains the first implemented POSIX libc
  membrane package: shared errno cell, typed POSIX errors, and 561-native
  bilattice evidence reports.
- `computer/libc/fd` currently contains the first descriptor-table and
  open-file-description model over the shared errno/report surface. It exposes
  fd tables as `Chu(FOUR)` carriers; POSIX fd integers are projections.
- `computer/libc/fd-typing` currently contains the first TRC-informed companion
  over descriptor state: typed resource witnesses attach to open file
  descriptions, not to the POSIX fd integer.
- `computer/libc/stdio` currently contains the first C/POSIX stream layer over
  `computer/sys/file`: `fopen`, `fread`, `fwrite`, `fseek`, `ftell`, `fclose`,
  stream indicators, and `FILE` stream Memes exposed as `Chu(FOUR)` carriers.
- Root `sys/*` currently contains scaffold material from parallel agents. Treat
  those packages as temporary staging until they move under `computer/sys/*`.
  New code should target `computer/*`, not root `sys/*`.
- Many apps/tools/games still contain legacy imports of archived
  `@561-group/computer/...` subpaths. Those imports are extraction pressure:
  rewrite them into explicit `computer/*` packages as the relevant surfaces are
  identified. Do not restore the old root package as a compatibility facade.
  SWARM's `process-runtime` imports have been rewritten to
  `@561-group/computer-kernel-process`; its remaining failures now point at other
  extraction families such as term memory, filepath addressing, posix
  holography, distribution governance, request queues, event projection, TRC,
  and SSE carriers.
- `apps/` contains the pressure tests: games, engines, web systems, language
  systems, interfaces, and SWARM. These are experimental material to be
  rewritten, not compatibility obligations.

## Layer model

The rebuild should keep these layers distinct without building them in isolation:

1. `math/`: semantic backend.
   Provides the value, evidence, charge, closure, and categorical machinery.

2. `computer/`: OS source tree.
   `boot`, `plat`, `arch`, `calculus`, `kernel`, `mm`, `vfs`, `fs`,
   `drivers`, `ipc`, `lib`, and `user` own the actual machine.

3. `computer/sys`: POSIX system-interface membranes.
   POSIX-conformant interface packages such as file descriptors, memory maps,
   processes, signals, clocks, events, sockets, permissions, and devices.

4. `computer/libc`: POSIX library membrane.
   Errno, descriptor tables, stdio, stdlib, strings, time, signal wrappers,
   environment, locale, pthread-like coordination, and portable constants.

5. `computer/sh` and `computer/bin`: command environment.
   Shell grammar, expansion, redirection, pipelines, jobs, and POSIX utilities.

6. `computer/pkg`.
   Package, workspace, build, install, and provenance substrate. This will
   probably begin as smart use of Node and pnpm conventions, then become a
   561-native package graph and build trace system.

7. `apps/*`.
   Active proving grounds. Games, tools, web apps, language systems, and SWARM
   force the OS surfaces to be useful and honest.

### `sys` and `errno`

The `sys` name must be read carefully. In POSIX and on this Linux/glibc host,
`<sys/mman.h>` is a user-facing header namespace: it declares `mmap()`,
`munmap()`, and friends with the standard return and `errno` behavior. The
kernel syscall ABI underneath does not expose POSIX `errno` as a global lvalue;
it returns a success value or raw error indication, and libc maps that to the
thread-local `errno` cell.

Therefore a `computer/sys/mmap` package that claims the POSIX `<sys/mman.h>`
surface may set and expose errno behavior directly. If we later split out a
lower kernel/syscall primitive under `computer/sys`, that lower primitive should
return raw error values or 561 reports, and the POSIX-facing wrapper should
perform the errno translation. Do not make a `sys` package import
`computer/libc/*` merely to get errno.

## Conformance rule

Each standard-facing API keeps the POSIX behavior it claims. If a package
claims a POSIX header or function, it must satisfy the actual standard contract:
types/constants, return values, `errno` effects, edge cases, and conformance
tests.

The same rule holds for IETF, C, Node package, filesystem, shell, and other
industrial conventions. A package may expose richer Meme-level APIs, but a
claimed standard surface must remain testable against the actual convention.
When a package is only an internal runtime layer, its docs must say which public
standard surface it is not claiming yet.

Each Meme-facing companion API can expose more.

The pattern is:

```txt
standard function -> POSIX return value and errno behavior
report function   -> Meme-level report with value, evidence, witnesses, trace rows,
                     provenance, governance, resource use, and residue
```

For example, a POSIX `read(fd, buffer, count)` should return the byte
count, `0`, or `-1` with errno. A richer `readReport(...)` may report the
settled cell, held contradictions, missing evidence, admitted trace rows, and
cost. The standard API is the portable shadow; the report API describes the
native Meme.

This rule also applies to logic. POSIX may force a boolean, integer, sentinel,
or errno result at the boundary. Internally, the implementation must not erase
unknown, contradictory, or witnessed structure merely because the shadow API
cannot carry it.

## Math descent rule

Every `computer/*` package should be designed from the math substrate before it
is designed as ordinary JavaScript state.

Before writing or reshaping implementation code, identify:

1. the relevant `math/` substrate: bilattice charge/descent, Chu
   carrier/transform, closure/obstruction, number tower, or another explicit
   package;
2. the carrier or object being represented;
3. the morphism being implemented;
4. the POSIX projection required by the standard-facing function;
5. the law or invariant that proves the projection is honest.

The fd/file/stdio slice now follows this pattern in a first form: descriptor
tables, file stores, and `FILE` stream Memes expose `Chu(FOUR)` carriers, while
`open`, `read`, `write`, `lseek`, `close`, `dup`, `fcntl`, `fopen`, `fread`,
`fwrite`, `fseek`, `ftell`, and `fclose` preserve their POSIX/C shadows and
errno behavior.

The boot/platform/kernel slice follows the same rule one layer lower: platform
Memes, kernel image Memes, and process Memes expose `Chu(FOUR)` carriers, while
their projections are conventional shadows. They deliberately do not claim POSIX
process-control calls yet.

## Naming note

`computer` is a working namespace, not the final name. The basic unit of this
system is not a boolean bit but a meme: the irreducible thing-with-evidence that
the operating substrate stores, addresses, settles, and projects. The eventual
name should unpack the useful parts of the POSIX/UNIX/MULTICS lineage while
making the memetic unit visible. "Memetic POSIX" is the current descriptive
phrase; the final acronym/name should wait until the architecture has settled
enough to deserve it.

## Development loop

Do not build the OS bottom-up as a clean-room clone. Do not keep apps as a later
porting problem.

Each slice should use this loop:

1. Pick a live pressure point from an app, tool, game, language system, or
   SWARM.
2. Name the POSIX or Unix surface it is secretly trying to be.
3. Inspect the source-tree owner or create the smallest missing one.
4. Name the math carrier/morphism and the POSIX projection before implementing
   ordinary state.
5. Implement the standard behavior needed by that pressure point.
6. Add the richer report API and tests for evidence, held contradiction,
   unknown, trace, governance, provenance, and resource use where relevant.
7. Rewrite the pressure-point code to consume the new surface, not a preserved
   compatibility import.
8. Delete or retire the cannibalized local implementation.
9. Update this roadmap or the root TODO when a new large surface is discovered.

## First implementation families

The first families should be small enough to land, but central enough to shape
the rest of the OS.

### File and descriptor spine

Target package: `computer/sys/file`.

Target surfaces:

- `open`, `close`, `read`, `write`, `lseek`
- `dup`, `dup2`, `fcntl`
- `pipe`
- descriptor table and open-file-description model
- `libc/fd`
- `libc/stdio`

Pressure tests:

- shell and terminal tools
- TAB/Farstone world logs
- semantic-reader/luca trace reads
- SWARM memory and ledger rows

### Errno and libc constants

Target surfaces:

- `computer/libc/errno`
- `computer/libc/fd`
- POSIX numeric and symbolic constants
- portable error cells with scoped process/thread state
- typed `PosixError` objects for JS code that needs exceptions without losing
  POSIX errno fields
- 561-native success, failure, unknown, and combined reports over the bilattice
  charge carrier
- descriptor table and open-file-description reports that preserve evidence
  beside `close`/`dup`/`dup2`/`fcntl` integer shadows

Pressure tests:

- every `sys/*` package currently has local errno handling or thrown ENOSYS
- libc wrappers need one shared failure discipline

### Memory map

Current package: `computer/sys/mmap`.

Target surfaces:

- `mmap`, `munmap`, `mprotect`, `msync`
- `mlock`, `munlock`
- `shm_open`, `shm_unlink`
- Term-Addressed Memory as the 561-native realization

Pressure tests:

- semantic memory management
- SWARM memory/recall/compaction
- package graph and build cache work

### Process runtime, exec, wait, and scheduling

Current lower package: `computer/kernel/process`.

Later target package: `computer/sys/proc`.

Target surfaces:

- process Meme runtime and judgment carrier
- `fork`, `execve`, `execvp`, `wait`, `waitpid`, `_exit`
- process identity
- readiness, dispatch, and governed execution
- later `sys/sched`, `sys/wait`, `sys/exec`

Pressure tests:

- SWARM governed actuators and subprocess work
- shell pipelines and jobs
- package build/test execution

### Signal and interruption

Target package: `computer/sys/signal`.

Target surfaces:

- `kill`, `raise`, `sigaction`, `sigprocmask`
- signal sets and dispositions
- cancellation/interruption as trace-carried events

Pressure tests:

- shell job control
- SWARM abort/timeout/cancel paths
- process lifecycle tests

## Package quality bar

Each package should use the current `computer/sys/mmap` package style unless a
better standard is derived:

- `package.json` with a narrow package name and exports
- `lib/index.mjs` and `lib/index.d.ts`
- `tests/prove-conformance.mjs`
- `man/` page for the POSIX surface
- `docs/` Diataxis tree when useful
- `docs/dev/notes/01-conformance-spec.md` as the load-bearing standard map
- no runtime dependency tree unless the standard surface genuinely needs one

The tests must cover both:

- POSIX shadow behavior: signatures, return values, errno, constants, and edge
  cases.
- 561-native behavior: evidence, witnesses, trace rows, provenance, governance,
  resource accounting, and explicit residue when the implementation cannot
  settle.

## Migration stance

No current app, tool, game, or package boundary is sacred. Existing code is
research material and implementation material. When a better OS-shaped surface
exists, consumers should be rewritten to use it and their local duplicates
removed.

The only compatibility promise is the one explicitly claimed at POSIX-facing
boundaries.


## June 6 source documents: historical design material

The following documents preserve the June 6 rebuild's original wording and
attribution as engineering research and design history:

- [Source-tree scope, standards pressure and naming](2026-06-06-a4c3a96-computer-posix-rebuild/computer-README.md).
- [Process Meme, judgment fold and carrier](2026-06-06-a4c3a96-computer-posix-rebuild/proc-runtime-README.md).
- [Process-control scaffold](2026-06-06-a4c3a96-computer-posix-rebuild/sys-proc-README.md)
  and its [design explanation](2026-06-06-a4c3a96-computer-posix-rebuild/sys-proc-design.md).
- [Scheduling scaffold](2026-06-06-a4c3a96-computer-posix-rebuild/sys-sched-README.md)
  and its [design explanation](2026-06-06-a4c3a96-computer-posix-rebuild/sys-sched-design.md).

These describe a dated development snapshot and proposed realizations. The
process-runtime note expressly stops short of POSIX process control; the proc
and sched documents declare unimplemented ENOSYS interfaces. Their inclusion
here does not establish a working POSIX implementation, validate the proposed
mathematical realization, or revive the old packages or instructions. Internal
package-relative links and import spellings remain historical references.
