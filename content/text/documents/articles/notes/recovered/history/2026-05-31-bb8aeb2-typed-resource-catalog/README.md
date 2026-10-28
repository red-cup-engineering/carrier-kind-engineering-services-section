# @561/development.active.typed-resource-catalog

The **codomain of voidmath**: an on-disk Typed Resource Catalog (TRC). Where
[voidmath](../voidmath/) is the computational kernel — a four-regime descent that settles an
utterance to a finite fixed point — the TRC is the thing that descent *generates*: a catalog of
typed resources realized as bytes on disk.

```sh
pnpm test    # spine proofs: read → witness → stat → frontmatter → conforming on fixtures
```

## The one idea

**The directory tree IS the type language.** A path is a typing judgment:

- `library/X` — `X` is an object (a term) generated under the category at this position;
- bare `X` — `X` is a morphism / generator;
- `hacking/X` — `X` is admitted *without* derivation (the Lean `sorry`), placed at the finest-true
  ancestor. The count of `/hacking/` segments on a path is its open-derivation depth: how many steps
  from the voidmath kernel remain to be discharged. Deriving a step removes one `/hacking/` and
  promotes the gap to a real generator.

Two hard constraints shape the whole catalog:

- **No higher than POSIX filesystems.** The most abstract thing the catalog names at its head is a
  `file`; there is no storage abstraction above it. Bytes-onto-disk is how the work is realized.
- **Composites are downstream, not filed.** A more specific kind is reached by *restriction* (narrow
  membership by a MUST predicate, descending the taxonomy) and a node's affixed structure by
  *extension* (a markdown-document is a markdown file extended by frontmatter) — never a node
  duplicated across regions. RFC-2119 modalities (MUST/SHOULD/MAY) decorate these moves, realized as
  voidmath's `necessitating`/`possibilising` charges, so routing IS conformance.

## The carrier and its descent

The catalog runs voidmath's four-regime descent with the POSIX **`path`** as carrier (where voidmath's
carrier is the `utterance`). The backbone is a generated chain — read each edge as `generated-by` — and
it mirrors voidmath's structure-sequence:

| chain       | voidmath structure | generator / regime        |
|-------------|--------------------|---------------------------|
| `path`      | cell               | articulate / aperiodic    |
| `object`    | fiber              | predicate / transfinite   |
| `attribute` | presheaf           | posit / scott-continuous  |
| `file`      | sheaf              | settle / finite           |

`file` is the *settled result*, not the carrier; the former filesystem taxonomy
(`file → regular-file → flatfile → {markdown, json}`, …) hangs off it as the sheaf-end. Each node owns
its **restriction** — its MUST-membership test, as `scripts/restrict.mjs` — and routing down the
taxonomy IS conformance, because a kind's defining MUST is its conformance contract.

## What runs

The spine runs end to end on real files; `pnpm test` exercises it on hermetic fixtures:

- `library/path/reading/scripts/read.mjs` — **read** = articulate: lifts a path into voidmath's
  utterance and returns the cell.
- `library/path/reading/scripts/witness.mjs` — **witness** = routing: composes each node's
  `restricting/scripts/restrict.mjs` to route a path to the deepest kind it inhabits.
- `library/path/reading/scripts/stat.mjs` — **stat** = positing: charges each POSIX attribute onto the
  object's fiber.
- `…/markdown/extending/scripts/frontmatter.mjs` — **frontmatter** = the document-extension
  (`markdown → markdown-document`) as a modal fiber algebra (MUST have frontmatter, SHOULD YAML, MAY
  TOML), with RFC modalities as `necessitating`/`possibilising` charges.
- `…/markdown-document/conforming/scripts/conform.mjs` — **conform**: the markdown-document's
  `conforming/` morphism settles its modal charges through `posit`/`settle` into a verdict
  (`conforming/library/verdict`) that is a glued sheaf section (a MUST whose settled charge is negative
  is an undrained obstruction → non-conformant).

## Layout

- `docs/dev/specification.md` — every node carries its own spec (markdown-document + spec-of-specs
  conventions). Primitives are **ported** from prior definitions already in the repo where they
  exist; only true gaps are first-authored and marked.
- `scripts/` — the **meta-tooling** that manages the catalog (scaffold / claim / project / create /
  audit; see below), over the shared `cohering` engine and `locating` resolver. Each verb imports the
  feature packages (holography's EAVT + flatfile I/O, math-kernel's settle, the json/schema `unfold`
  codec) — none is reimplemented here.
- `tests/` — the kernel proofs.

## Meta-tooling: managing the catalog (`scripts/`)

A **kind** is three co-located files — its `$thing` triple: the human prose
`docs/dev/specification.md`, the scott-continuous claim-log `<slug>.jsonl`, and the settled
`<slug>.schema.json`. The schema is never hand-authored: it is the **finite projection** of the log
(posit → settle). The verbs operate ON the catalog:

- **scaffold** — `pnpm scaffold <thing-path> --name … --description …` (`scaffolding.mjs`): write a new
  kind node's human spec. Placement (object under `library/`, morphism bare, gap under `hacking/`) is
  your choice of `<thing-path>`.
- **claim** — `pnpm claim <kind-dir> '<schema-fragment>'` (`claiming.mjs`): make a claim about a kind —
  a JSON-Schema fragment (the frontmatter shape; an `x-trc-*` closure rule) — appended to its
  `<slug>.jsonl`. The log is the scott-continuous trace: claims **accumulate**, never overwrite.
- **project** — `pnpm project <kind-dir>` (`projecting.mjs`): settle the trace into
  `<slug>.schema.json`, the single source of truth. Two claims that disagree at one slot drive it to ⊤
  (over-determined): project writes nothing and **reports the contradiction** to sort out.
- **create** — `pnpm create <kind-dir> --at <thing> --name … --description … [--slug …]`
  (`realizing.mjs`): realize a conformant instance — the schema run **forward**. Placement, filename,
  frontmatter, and body all come from the settled schema (`x-trc-placement`,
  `x-trc-filename[-template]`, `x-trc-body-skeleton`).
- **audit** — `pnpm audit <path> [--kind <kind-dir>]` (`auditing.mjs`): check existing bytes — the SAME
  schema run **backward**. Reports every violation (filename, placement, frontmatter); with no
  `--kind`, the kind is detected by matching placement + filename.

The CRUD reading holds underneath: **create** = scaffold/claim/project a node, or realize an instance;
**read** = project (log → schema) + audit; **update** = a further claim (append-only, never a line
rewrite); **delete** = a countering claim, or removing the node's directory.

## Status

The spine runs: a real POSIX path descends `read → witness → stat → frontmatter → conforming` to a
settled conformance verdict, covered by `pnpm test`. The **meta-tooling engine** now runs too —
`claim → project` settles a kind's claim-log into its schema (surfacing contradictions), and that
schema drives `create` (forward) and `audit` (backward) on real bytes; `development-journal-entry` is
the first kind with a complete `$thing` triple. What remains is breadth, not mechanism — the triple
completed per remaining node, more nodes' restriction morphisms, more closure rules claimed, a stdio
MCP server wrapping the five verbs, and two queued structural moves (`typing` placement; the journal
decomposition redone as restriction/extension).
