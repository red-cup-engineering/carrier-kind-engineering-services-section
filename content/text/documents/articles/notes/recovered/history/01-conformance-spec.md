# SPEC — file: POSIX file descriptors and byte I/O (`<fcntl.h>`, `<unistd.h>`)

> Provenance: the normative source is **IEEE Std 1003.1-2017 (POSIX.1-2017)**, the
> Open Group Base Specifications Issue 7. The per-function contracts below are to be
> read against the System Interfaces volume pages for `open`, `close`, `read`,
> `write`, `lseek`, `dup`, `dup2`, `fcntl`, and `pipe`, and the Base Definitions
> header pages `<fcntl.h>` and `<unistd.h>`. Flags marked **[UNCERTAIN]** /
> **[NOTE]** mark where the exact set or value must be confirmed against the standard
> text rather than restated from memory. This is a *spec*, not an implementation; the
> implementation will live in `lib/index.mjs`. The realization over the 561-group
> substrate (§9) is derived from reading `computer/posix-holography` (its `README.md`
> and `src/` modules — `posix.mjs`, `flatfile.mjs`, `binary-file.mjs`, the EAVT
> append/read/settle modules).
>
> **Authoritative source to consult for any errno set stated as inexact here:** IEEE
> Std 1003.1-2017, the per-function "ERRORS" section of each interface (the
> `pubs.opengroup.org` Issue 7 pages are the public rendering of that text). Do NOT
> invent an errno not listed there for the function in question.

This package realizes the POSIX file-descriptor and byte-I/O interfaces over
`computer/posix-holography` and the descent. The POSIX behavior in §1–§9 is the
**contract** (what callers may rely on); §9's realization notes are how the
paraconsistent computer is meant to meet it. While the package is a scaffold, every
interface signals `ENOSYS` — see §10.

---

## 0. Constants

### 0.1 Headers conformed to

```
<fcntl.h>     open, fcntl, the O_* open flags, and the F_* fcntl commands / FD_CLOEXEC
<unistd.h>    close, read, write, lseek, dup, dup2, pipe, and the SEEK_* whence constants
```

`read`, `write`, `lseek`, `close`, `dup`, `dup2`, and `pipe` are declared by
`<unistd.h>`; `open`, `fcntl`, and the `O_*`/`F_*` constants by `<fcntl.h>`.
**[NOTE]** the `SEEK_*` whence constants are defined in `<unistd.h>` (and also in
`<stdio.h>`); confirm placement against the header pages.

### 0.2 `<fcntl.h>` `open()` flags

POSIX requires `<fcntl.h>` define these. Their numeric *values* are
implementation-defined; only their behavior is fixed. This implementation adopts the
conventional Linux/BSD bit layout so the usual bitwise-OR idioms compose as a C
caller expects. Exactly one access mode is REQUIRED; the rest are modifiers.

```
O_RDONLY   access mode: open for reading only
O_WRONLY   access mode: open for writing only
O_RDWR     access mode: open for reading and writing
O_ACCMODE  mask to extract the access-mode bits

O_CREAT    create the file if it does not exist (consults the mode argument)
O_EXCL     with O_CREAT, fail (EEXIST) if the file already exists
O_NOCTTY   do not make a terminal device the controlling terminal for the process
O_TRUNC    truncate an existing regular file opened for writing to length 0
O_APPEND   the file offset is set to end-of-file before each write
O_NONBLOCK open (and subsequent I/O) in non-blocking mode
O_DSYNC    synchronized I/O data integrity completion
O_SYNC     synchronized I/O file integrity completion        [NOTE] value to confirm
O_RSYNC    synchronized read I/O; pairs with O_DSYNC/O_SYNC  [NOTE] often aliased; confirm
O_CLOEXEC  set the close-on-exec flag on the returned fd     [NOTE] value to confirm
```

**[UNCERTAIN]** the exact numeric values of `O_SYNC`, `O_RSYNC`, and `O_CLOEXEC` (and
whether `O_RSYNC` is distinct from `O_SYNC` on this platform) are not pinned; confirm
against the `<fcntl.h>` page and the target platform's headers before relying on them.

### 0.3 `<unistd.h>` `lseek()` whence constants

```
SEEK_SET   offset is set to `offset` bytes from the start of the file
SEEK_CUR   offset is set to its current value plus `offset` bytes
SEEK_END   offset is set to the size of the file plus `offset` bytes
```

POSIX fixes these symbolic names (conventionally `0`, `1`, `2`).

### 0.4 `<fcntl.h>` `fcntl()` commands and flags

```
F_DUPFD          duplicate fildes to the lowest available fd >= arg
F_DUPFD_CLOEXEC  as F_DUPFD, but also set close-on-exec on the new fd   [NOTE] value to confirm
F_GETFD          get the file-descriptor flags (currently only FD_CLOEXEC)
F_SETFD          set the file-descriptor flags
F_GETFL          get the file-status flags and the file access mode
F_SETFL          set the file-status flags (only some are settable, e.g. O_APPEND, O_NONBLOCK)

FD_CLOEXEC       the close-on-exec file-descriptor flag, manipulated via F_GETFD/F_SETFD
```

POSIX also defines record-locking commands (`F_GETLK`, `F_SETLK`, `F_SETLKW`) on
`fcntl`. **[NOTE]** this subsystem headlines only the duplicate/flag commands above;
record locking is out of scope for the scaffold — add it (with provenance) if/when
the subsystem grows to cover it.

### 0.5 Error reporting convention

POSIX functions report failure by return value and set `errno`. In this package's JS
realization the host `errno` is surfaced as a thrown `Error` whose `.code` is the
POSIX errno name (e.g. `"ENOSYS"`, `"EBADF"`) and whose `.errno` carries the symbolic
identifier. The *return-value* contract below (e.g. "returns -1 on error") describes
the POSIX C contract that the realization must preserve in spirit; see §9.5 for how
the JS surface maps the C `-1`/`errno` convention.

---

## 1. `open` — open or create a file, returning a descriptor

```c
int open(const char *path, int oflag, ... /* mode_t mode */ );
```

- **Success:** returns a non-negative integer, the **lowest file descriptor not
  currently open** for the process. The file offset is 0 (or end-of-file with
  `O_APPEND`).
- **Failure:** returns **-1**, no file is opened/created, `errno` is set.
- **errno set:**
  - `EACCES` — search permission denied on a path prefix, or the requested access is
    not permitted, or `O_CREAT` and the parent directory is not writable, or
    `O_TRUNC` and write permission is denied.
  - `EEXIST` — `O_CREAT` and `O_EXCL` are set and the file already exists.
  - `EINTR` — the open was interrupted by a signal.
  - `EISDIR` — `path` is a directory and the access mode requested write.
  - `ELOOP` — too many symbolic links in resolving `path`.
  - `EMFILE` — all file descriptors available to the process are in use.
  - `ENAMETOOLONG` — a path component exceeds `NAME_MAX`, or `path` exceeds `PATH_MAX`.
  - `ENFILE` — the system file table is full.
  - `ENOENT` — `O_CREAT` is not set and the file does not exist, or a path prefix
    component does not exist, or `path` is empty.
  - `ENOSPC` — `O_CREAT` and the directory/file system has no space for the new file.
  - `ENOTDIR` — a component of the path prefix is not a directory.
  - `ENXIO` — `O_NONBLOCK` set, a FIFO opened write-only, and no reader is present;
    or `path` is a special file and the device does not exist.
  - `EOVERFLOW` — the file is a regular file and its size cannot be represented in an
    `off_t`.
  - `EROFS` — write access requested on a read-only file system.
- **Notes:** `mode` is consulted only when `O_CREAT` (or `O_TMPFILE`) creates the
  file; the actual permission bits are `mode & ~umask`. **[NOTE]** the full ERRORS
  list on the `open` page is longer (e.g. `EAGAIN`, `ETXTBSY`, `EDQUOT`); confirm and
  pin the members this subsystem honors.

## 2. `close` — close a file descriptor

```c
int close(int fildes);
```

- **Success:** returns **0**; `fildes` is no longer a valid descriptor and is
  available for reuse.
- **Failure:** returns **-1** and sets `errno`. (On many systems `fildes` is closed
  even when an error is reported; do not retry the close on `EINTR` portably.)
- **errno set:**
  - `EBADF` — `fildes` is not a valid open descriptor.
  - `EINTR` — the close was interrupted by a signal.
  - `EIO` — an I/O error occurred while flushing/closing.

## 3. `read` — read bytes from a descriptor

```c
ssize_t read(int fildes, void *buf, size_t nbyte);
```

- **Success:** returns the **number of bytes actually read** (0 ≤ n ≤ `nbyte`), and
  advances the file offset by that amount. A return of **0** means end-of-file. A
  read may return fewer bytes than requested.
- **Failure:** returns **-1** and sets `errno`; the offset is unchanged.
- **errno set:**
  - `EAGAIN` — `O_NONBLOCK` is set and no data is available.
  - `EBADF` — `fildes` is not open for reading.
  - `EINTR` — interrupted by a signal before any data was read.
  - `EINVAL` — the fd or position is unsuitable for reading.
  - `EIO` — a physical I/O error.
  - `EISDIR` — `fildes` refers to a directory. **[NOTE]** Linux/XSI; confirm level.
  - `EOVERFLOW` — the offset cannot be represented.
- **Notes:** if `nbyte` is 0, `read` returns 0 and may detect errors. On the JS
  surface `buf` is a `Uint8Array`/`Buffer` the call fills.

## 4. `write` — write bytes to a descriptor

```c
ssize_t write(int fildes, const void *buf, size_t nbyte);
```

- **Success:** returns the **number of bytes actually written** (0 ≤ n ≤ `nbyte`),
  and advances the file offset by that amount. A write may be partial.
- **Failure:** returns **-1** and sets `errno`.
- **errno set:**
  - `EAGAIN` — `O_NONBLOCK` is set and the write would block.
  - `EBADF` — `fildes` is not open for writing.
  - `EFBIG` — the write would exceed the maximum file size or the process limit.
  - `EINTR` — interrupted by a signal before any data was written.
  - `EINVAL` — the fd or position is unsuitable for writing.
  - `EIO` — a physical I/O error.
  - `ENOSPC` — no space remains on the device.
  - `EPIPE` — writing to a pipe/FIFO with no reader (also raises `SIGPIPE`).
  - `ERANGE` — the request was outside the range supported by the device. **[NOTE]**
    confirm membership on the `write` page.
- **Notes:** with `O_APPEND`, the offset is set to end-of-file before each write,
  atomically. If `nbyte` is 0 the behavior is as the standard specifies (no data
  transferred; may return 0).

## 5. `lseek` — reposition the file offset

```c
off_t lseek(int fildes, off_t offset, int whence);
```

- **Success:** returns the **resulting offset** as measured in bytes from the start
  of the file.
- **Failure:** returns **(off_t)-1** and sets `errno`; the offset is unchanged.
- **errno set:**
  - `EBADF` — `fildes` is not an open descriptor.
  - `EINVAL` — `whence` is invalid, or the resulting offset would be negative.
  - `EOVERFLOW` — the resulting offset cannot be represented in an `off_t`.
  - `ESPIPE` — `fildes` is a pipe, FIFO, or socket (not seekable).
- **Notes:** `whence` is `SEEK_SET`/`SEEK_CUR`/`SEEK_END` (§0.3). Seeking past
  end-of-file is permitted and creates a gap (a hole) on later write.

## 6. `dup` — duplicate a descriptor (lowest available)

```c
int dup(int fildes);
```

- **Success:** returns a **new descriptor** — the lowest-numbered available — that
  shares the open file description (and thus the file offset and status flags) with
  `fildes`. The `FD_CLOEXEC` flag on the new fd is **clear**.
- **Failure:** returns **-1** and sets `errno`.
- **errno set:**
  - `EBADF` — `fildes` is not open.
  - `EMFILE` — all descriptors available to the process are in use.

## 7. `dup2` — duplicate a descriptor onto a specific number

```c
int dup2(int fildes, int fildes2);
```

- **Success:** returns **`fildes2`**, now referring to the same open file description
  as `fildes`. If `fildes2` was open it is **closed first** (atomically). If `fildes`
  equals `fildes2`, `dup2` returns `fildes2` without closing it.
- **Failure:** returns **-1** and sets `errno`.
- **errno set:**
  - `EBADF` — `fildes` is not open, or `fildes2` is outside the valid descriptor range.
  - `EINTR` — interrupted by a signal.

## 8. `fcntl` — control a descriptor

```c
int fcntl(int fildes, int cmd, ... /* arg */ );
```

- **Success:** the return value is **`cmd`-dependent** — e.g. the new fd for
  `F_DUPFD`/`F_DUPFD_CLOEXEC`; the flags for `F_GETFD`/`F_GETFL`; `0` for the `SET`
  commands.
- **Failure:** returns **-1** and sets `errno`.
- **errno set (for the headlined commands):**
  - `EACCES` — a requested operation is denied (e.g. a locking conflict, for the
    locking commands not headlined here).
  - `EBADF` — `fildes` is not open.
  - `EINTR` — interrupted by a signal.
  - `EINVAL` — `cmd` is invalid, or `arg` is invalid for the given `cmd`.
  - `EMFILE` — `F_DUPFD`/`F_DUPFD_CLOEXEC` and no descriptor >= `arg` is available.
- **Notes:** headlined commands are `F_DUPFD`, `F_DUPFD_CLOEXEC`, `F_GETFD`,
  `F_SETFD`, `F_GETFL`, `F_SETFL` (§0.4). `F_SETFL` can change only some status flags
  (e.g. `O_APPEND`, `O_NONBLOCK`); the access mode and creation flags are ignored.
  Record-locking commands are out of scope (§0.4 [NOTE]).

## 9. `pipe` — create a pipe

```c
int pipe(int fildes[2]);
```

- **Success:** returns **0**, and populates `fildes` with two new descriptors:
  `fildes[0]` is open for reading (the read end), `fildes[1]` for writing (the write
  end). Data written to the write end is buffered until read from the read end.
- **Failure:** returns **-1** and sets `errno`; `fildes` is unchanged.
- **errno set:**
  - `EMFILE` — fewer than two descriptors are available to the process.
  - `ENFILE` — the system file table is full.
- **Notes:** on the JS surface `pipe` populates the passed 2-element array and returns
  0. **[UNCERTAIN]** whether to additionally return the `[readFd, writeFd]` pair —
  pin in `docs/reference/library-api.md` and `lib/index.d.ts` (cf. §9.5).

---

## 9. Realization over the 561-group substrate

This is the rederivation layer: how the POSIX contract above is *meant* to be met
over `computer/posix-holography` and the descent. It is the design target for the
implementation, not yet implemented (§10). Source: `posix-holography/README.md` and
`src/` (`posix.mjs`, `flatfile.mjs`, `binary-file.mjs`, the EAVT modules).

### 9.1 A POSIX file is a categorical term-path; its bytes are read through the descent

In the substrate, **a file classifies itself**: the POSIX filepath is the
*coordinate*, and `read` descends a taxonomy of kinds
(`file → regular-file → {binary-file, flatfile → …}`) by what the file's own bytes
*are*, never its extension. The descent math (`articulate → predicate → posit →
settle`, the bilattice charge operations) is what reads a path to the richest
structure it admits, and `write` puts it back. So the bytes-on-disk this subsystem's
`read`/`write` move are the substrate's leaf-level byte primitives
(`binary-file.readBinaryFile` / `writeBinaryFile`, `flatfile` text I/O), and `open`
fixes the path-coordinate the rest of the calls operate at.

### 9.2 A file descriptor is a settled handle onto a path's byte trace

A POSIX `int` fd is an indirection: a small integer naming an *open file description*
(path + offset + status flags). The realization target is to model the open file
description as a substrate handle onto the path's byte content, and the fd table as
the per-process map from small integers to those handles. `dup`/`dup2`/`F_DUPFD`
create a second integer naming the **same** description (shared offset), which is the
classic fd-table-vs-description distinction; the substrate must preserve that sharing.

### 9.3 The file offset and `lseek` without a clock

The substrate settles to a fixed point with **no clock**. The file offset is part of
the open file description's settled state, not a wall-clock-ordered mutation; `read`
and `write` advance it and `lseek` repositions it as updates to that settled section.
Appends (`O_APPEND`) and EAVT-style append-only logs (`posix-holography`'s
`eavt/writing/appending`) are the natural model for write-extending a file: a write
is appending bytes, conserved in the trace, never silently dropped.

### 9.4 Belnap-FOUR and the descent: contradiction is held, not collapsed

`posix-holography` reads charge through the descent and (per its README) charges `⊤`
on a malformed/contradictory structure rather than crashing — the paraconsistent law:
a contradiction `⊤` is a **held** value, surfaced on its own, **never collapsed into
a denial, never an error**. The POSIX surface, however, is classical: a call returns
a definite fd/count/offset, or -1 + errno. The realization therefore needs a
**projection** from the FOUR-valued substrate read onto the classical POSIX contract
at the boundary, while the underlying trace retains the held contradiction for audit.
**[UNCERTAIN]** the exact projection FOUR → (return value, errno) per function is a
design decision to pin when implementing — record it here with provenance.

### 9.5 The C `-1`/`errno` convention on the JS surface

The C "return -1, set `errno`" convention is surfaced as a thrown `Error` with
`.code` = the errno name (§0.5). The byte buffers (`read`/`write`'s `buf`) are
`Uint8Array`/`Buffer`; the out-array for `pipe` is a passed 2-element array the call
populates. **[UNCERTAIN]** whether `read` should additionally return a `{ bytesRead,
buffer }` shape (closer to `node:fs`) or strictly the C `ssize_t` count — pin in the
API reference. **[UNCERTAIN]** whether `pipe` also returns `[readFd, writeFd]`.

### 9.6 Evidence linearity

The substrate's law: **evidence is linear** — never dropped, unioned on the fold (the
EAVT settle is the `joining-knowledge` join over the full cell). A byte-I/O operation
must never silently drop a trace row; every `open`/`write`/`close` is conserved in the
append-only trace, so the lineage of a file's bytes is auditable.

---

## 10. Scaffold behavior: `ENOSYS`

Until a function is implemented, it signals **`ENOSYS`** ("Function not
implemented"). POSIX defines `ENOSYS` as the error for a function not supported by
the implementation, so a stub that signals it is *conformant for an unimplemented
interface* rather than a placeholder violation. In the JS surface this is a thrown
`Error` with `.code === "ENOSYS"` (§0.5). The conformance suite
(`tests/prove-conformance.mjs`) asserts exactly this for every interface today; as
each function is implemented, its `ENOSYS` assertion is replaced by the real
conformance checks the relevant section above calls for.

---

## End-to-end summary

| Interface | Header | Success return | Failure | errno (principal) |
| --- | --- | --- | --- | --- |
| `open` | `<fcntl.h>` | lowest available fd (>= 0) | -1 | `EACCES`, `EEXIST`, `EINTR`, `EISDIR`, `ELOOP`, `EMFILE`, `ENAMETOOLONG`, `ENFILE`, `ENOENT`, `ENOSPC`, `ENOTDIR`, `ENXIO`, `EOVERFLOW`, `EROFS` |
| `close` | `<unistd.h>` | 0 | -1 | `EBADF`, `EINTR`, `EIO` |
| `read` | `<unistd.h>` | bytes read (0 at EOF) | -1 | `EAGAIN`, `EBADF`, `EINTR`, `EINVAL`, `EIO`, `EISDIR`, `EOVERFLOW` |
| `write` | `<unistd.h>` | bytes written | -1 | `EAGAIN`, `EBADF`, `EFBIG`, `EINTR`, `EINVAL`, `EIO`, `ENOSPC`, `EPIPE`, `ERANGE` |
| `lseek` | `<unistd.h>` | resulting offset | -1 | `EBADF`, `EINVAL`, `EOVERFLOW`, `ESPIPE` |
| `dup` | `<unistd.h>` | new fd (>= 0) | -1 | `EBADF`, `EMFILE` |
| `dup2` | `<unistd.h>` | `fildes2` | -1 | `EBADF`, `EINTR` |
| `fcntl` | `<fcntl.h>` | cmd-dependent | -1 | `EACCES`, `EBADF`, `EINTR`, `EINVAL`, `EMFILE` |
| `pipe` | `<unistd.h>` | 0 (populates fildes[2]) | -1 | `EMFILE`, `ENFILE` |

---

## Flagged uncertainties (consolidated)

- **[§0.2]** numeric values of `O_SYNC`, `O_RSYNC`, `O_CLOEXEC`, and whether `O_RSYNC`
  is distinct from `O_SYNC` — confirm against the `<fcntl.h>` page and target headers.
- **[§0.4]** numeric value of `F_DUPFD_CLOEXEC`, and the decision to omit the
  record-locking commands (`F_GETLK`/`F_SETLK`/`F_SETLKW`) from scope.
- **[§1]** the full `open` ERRORS list (e.g. `EAGAIN`, `ETXTBSY`, `EDQUOT`) — confirm
  and pin which members this subsystem honors.
- **[§3]** `read` `EISDIR` conformance level (XSI/Linux) — confirm on the `read` page.
- **[§4]** `write` `ERANGE` membership — confirm on the `write` page.
- **[§9.4]** the FOUR → (return value, errno) projection per function — a design
  decision to record with provenance when implementing.
- **[§9.5]** `read`/`pipe` return-shape modeling on the JS surface (C `ssize_t` count
  vs. a richer object; whether `pipe` returns the fd pair) — pin in
  `docs/reference/library-api.md` and `lib/index.d.ts`.
- **General:** all errno sets above are stated to be **read against IEEE Std
  1003.1-2017**; where this spec could not verify an exact member from the primary
  text it is flagged rather than asserted. Consult the Open Group Base Specifications
  Issue 7 System Interfaces pages before relying on a set.
