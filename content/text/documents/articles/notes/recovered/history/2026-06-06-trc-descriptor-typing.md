# TRC Descriptor Typing

Status: study note for the POSIX fd/file spine.

This note records how the archived Typed Resource Catalog should inform file
descriptor work without breaking POSIX conformance.

## Source facts

TRC's central rule is that the POSIX path is a typing judgment. Its archived
README says the directory tree is the type language, `library/X` presents an
object, a bare segment presents a morphism/generator, and `hacking/X` marks an
undischarged derivation gap.

The TRC descent begins with `path` as carrier and reaches `file` as settled
result:

```txt
path -> object -> attribute -> file
```

The path-reading spine in the archive does three relevant things:

- `read(path)` validates the path token and articulates it through
  `@561-group/math/bilattice/descent`.
- `witness(path)` routes the path through restriction morphisms such as
  `file -> regular-file -> flatfile -> markdown`; routing is conformance.
- `stat(path)` posits POSIX attributes as charged cells on the object's fiber.

The EAVT row algebra is exactly `{e,a,v,t}`. Row identity is
`sha256(jcs(row))`, where `jcs` is the single canonical JSON implementation.
TRC's stricter trace view adds path-string discipline and dual filing at the
subject and predicate anchors; value-position indexes are caches only.

## Implication for fd

A POSIX file descriptor is still only a small non-negative integer. The standard
surface must not leak TRC objects into the return value of `open`, `read`,
`write`, `lseek`, `close`, `dup`, or `fcntl`.

The TRC-shaped object belongs beside that integer shadow:

- descriptor entry: fd-local flags such as `FD_CLOEXEC`;
- open file description: offset, status flags, access mode, and shared identity;
- typed resource witness: path, resource kind route, POSIX attribute charges,
  schema/log/script witnesses when present, and conformance residue.

That witness should live on the open file description or in a companion report,
not in the fd integer. `dup` and `dup2` must share the same open file
description, so they must also share the same typed resource witness. `fcntl`
descriptor flags must remain fd-entry-local and must not mutate the witness.

## Candidate package boundary

Do not add TRC typing to the core descriptor table by making fd operations
depend on the archived omnibus `@561-group/computer` package.

The likely next package is a companion, for example:

```txt
computer/libc/fd-typing
```

or, if it proves to be a standard-facing file-status surface rather than an fd
companion:

```txt
computer/sys/stat
```

The companion should consume a descriptor table plus a path/resource inspector
and return typed reports:

```txt
typeOpenDescription(path, oflag, store) -> open-file-description metadata
fdTypeReport(fd, table) -> 561 report for the descriptor's resource witness
```

The standard POSIX functions remain separate:

```txt
open/read/write/lseek/close -> integer return values and errno
*Report variants            -> typed resource witness, evidence, residue
```

## Design rule

TRC should type descriptors, not replace descriptors.

The fd table gives POSIX the integer shadow and sharing semantics. TRC gives the
resource witness attached to what the descriptor names: a path-derived object,
its kind route, its attribute charges, and its replayable evidence. Keeping
those separate lets conformance tests inspect POSIX behavior while 561-native
consumers inspect the richer typed object.
