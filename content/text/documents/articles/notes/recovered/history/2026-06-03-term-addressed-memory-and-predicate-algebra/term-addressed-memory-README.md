# term-addressed-memory

> Paths and EAVT logging: address a thing by a term, log facts about it as append-only
> predication-cell datoms, read them back folded.

`term-addressed-memory` (TAM, `@561/development.experimental.term-addressed-memory`) is a
small, focused thing: a **term-addressed EAVT log**. It addresses a thing by a **term** — by
the Curry–Howard / Yoneda reading the posix path *is* the term's coordinate, and a thing is
its arrows-in (its log) — and records facts about it as append-only EAVT datoms. That's all
it does: make paths, and log/read EAVT. The disk touch and the fold are
[voidmath-posix-holography](../voidmath-posix-holography)'s. How the cells are *interpreted*
(belief, negation, functionality, …) is a separate concern, out of scope here.

## The model

A fact is a **predication cell** `(subject, predicate, object)`, stored as one EAVT datom
`{e, a, v, t}` — `e` the subject (the term), `a` the predicate (the key), **`v` the object
(the value)**, `t` the transaction (the witness/provenance). A write only ever **affirms** a
cell: monotone, append-only, never a retract. A term's value is read off its own log
(`<dir>/<slug>.jsonl`) and folded per cell by the knowledge-join — distinct objects for one
`(subject, predicate)` are distinct cells, so a memory is a **predication graph**.

## Quick start

```sh
pnpm test    # 15 checks (software _tests.mjs + math proof-*.mjs), no network
```

```js
import write from "@561/development.experimental.term-addressed-memory/writing";
import read  from "@561/development.experimental.term-addressed-memory/reading";

const root = "./.memory";
write(root, "creatures/ada", { color: "blue", legs: 4 }); // affirm two cells
read(root, "creatures/ada").assignments;                  // the settled cells (subject, predicate, object, charge)
// on disk: ./.memory/creatures/ada/ada.jsonl  (EAVT datoms)
```

Interpreting those cells as belief (`affirmed` / `denied` / `contradicted`) is a separate
layer applied on top; TAM only produces the cells.

## Layout — the path is the coordinate

```
addressing/                              resolve a term ⇄ its on-disk coordinate  (TAM's own)
  library/address/                       the primitive: a term coordinate
    writing/  → write = affirm a cell    (append a datom)                 [→ VPH eavt append]
    reading/  → read  = fold the cells   (the settled memory)            [→ VPH eavt read + settle]
```

| morphism | does |
| --- | --- |
| `addressing` (`logPath`/`termOf`) | a term → its `.jsonl` log path, and back |
| `writing` (`write`) | affirm `{predicate: object}` facts — append datoms, monotone |
| `reading` (`read`) | fold an address's datoms to its settled section of cells |

## Where it sits

- [`voidmath-posix-holography`](../voidmath-posix-holography) — the disk and the `eavt` file kind (append, read, settle). The bytes and the fold live there.

## Status

- **Working (`pnpm test`, 15/15):** addressing resolves term ⇄ path; writing appends
  predication-cell datoms; reading folds them to the settled cells. Proofs: *affirmation is
  monotone* and *eavt is a predication cell (the memory is a graph)*.
- See [`TODO.md`](TODO.md) and [`docs/dev/journal/`](docs/dev/journal/).
