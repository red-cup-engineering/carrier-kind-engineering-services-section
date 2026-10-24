---
name: "Development Journal — Specification"
description: "Specification for SPOTCOMP development journals: the per-thing directory at <thing>/docs/dev/journal/ that aggregates dated journal entries recording the development history of the parent thing, with chronological filename ordering and an append-only entry-collection discipline."
spec-id: development-journal
version: 0.1.0
release-date: 2026-05-26
stability: draft
status: draft
category: convention
requires:
  - markdown-document
  - specification
references:
  - id: bradner1997
    type: standard
    author:
      - family: Bradner
        given: Scott
    title: "Key Words for Use in RFCs to Indicate Requirement Levels"
    publisher: "IETF"
    number: "RFC 2119"
    issued:
      date-parts:
        - [1997, 3]
    URL: "https://www.rfc-editor.org/rfc/rfc2119"
    accessed:
      date-parts:
        - [2026, 5, 26]
  - id: iso86012019
    type: standard
    author:
      - literal: "International Organization for Standardization"
    title: "Date and time — Representations for information interchange — Part 1: Basic rules, ISO 8601-1:2019"
    publisher: "ISO"
    issued:
      date-parts:
        - [2019, 2]
    URL: "https://www.iso.org/standard/70907.html"
    accessed:
      date-parts:
        - [2026, 5, 26]
  - id: leiba2017
    type: standard
    author:
      - family: Leiba
        given: Barry
    title: "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words"
    publisher: "IETF"
    number: "RFC 8174"
    issued:
      date-parts:
        - [2017, 5]
    URL: "https://www.rfc-editor.org/rfc/rfc8174"
    accessed:
      date-parts:
        - [2026, 5, 26]
  - id: posix2017
    type: standard
    author:
      - literal: "IEEE and The Open Group"
    title: "The Open Group Base Specifications Issue 7, 2018 edition (POSIX.1-2017), IEEE Std 1003.1-2017"
    publisher: "IEEE / The Open Group"
    issued:
      date-parts:
        - [2018]
    URL: "https://pubs.opengroup.org/onlinepubs/9699919799/"
    accessed:
      date-parts:
        - [2026, 5, 26]
  - id: yoneda1954
    type: article-journal
    author:
      - family: Yoneda
        given: Nobuo
    title: "On the Homology Theory of Modules"
    container-title: "Journal of the Faculty of Science, the University of Tokyo. Section I"
    volume: 7
    page: "193-227"
    issued:
      date-parts:
        - [1954]
---

# Development Journal — Specification

A **development journal** is the per-thing directory at `<thing>/docs/dev/journal/` that aggregates dated journal-entry files recording the development history of one parent thing. The directory carries no inherent metadata; its contents are the entries themselves, governed individually by the journal-entry specification. Sorted lexicographically by filename, those entries form the chronological record of work on the parent thing.

This specification fixes the substrate-level requirements a development journal MUST satisfy as a directory in the SPOTCOMP TRC. The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are used per RFC 2119 @bradner1997 as updated by RFC 8174 @leiba2017.

A development journal is distinguished from other directories in the catalog by three properties: (i) its path matches `<thing>/docs/dev/journal/` for some parent-thing directory; (ii) its contents are exclusively journal-entry files (no subdirectories, no non-entry files); (iii) its entry filenames sort lexicographically into chronological order by virtue of the journal-entry filename discipline.

## 0. Scope

This specification governs the on-disk structure of every directory at `<thing>/docs/dev/journal/` in the SPOTCOMP TRC: its allowed contents, the relationship of those contents to the parent thing, and the additive-only entry-collection discipline.

This specification does NOT govern: (a) the byte contents of individual journal-entry files — those are governed by the journal-entry specification; (b) the canonical thing-prose at `<thing>/docs/<thing>.md`; (c) the normative specification at `<thing>/docs/dev/specification.md`; (d) the sibling `<thing>/docs/dev/conformance/` directory if present; (e) journal-like directories elsewhere in the catalog (e.g., character journals under `research-notes/`).

## 1. What a development journal is

A development journal is the directory holding one thing's dated record of development work. It answers the question: *what is the chronological history of thought about this thing?*

A development journal is one component of a thing's documentation triple:

| Path                                                  | Role                                                | Cardinality           |
|-------------------------------------------------------|-----------------------------------------------------|------------------------|
| `<thing>/docs/<thing>.md`                             | Canonical thing-prose (current settled understanding) | zero or one file       |
| `<thing>/docs/dev/specification.md`                   | Normative specification of the thing                | zero or one file       |
| `<thing>/docs/dev/journal/`                           | Development journal (this directory)                | zero or one directory  |
| `<thing>/docs/dev/journal/<YYYY-MM-DD>[-slug].md`     | Journal entries (zero or more)                      | zero or more files     |

A development journal MAY exist for any thing in the catalog. A thing with no recorded development history MAY omit the journal directory entirely; the absence of `<thing>/docs/dev/journal/` MUST NOT be treated as a conformance violation.

A development journal is **append-only as a collection**. Adding new journal entries to the directory is the primary collection-update operation. Removing or renaming committed entries is constrained by the journal-entry specification §9.

A development journal is **per-thing**. Each parent thing has at most one development-journal directory, located at the canonical path `<thing>/docs/dev/journal/`. A thing's journal MUST NOT live elsewhere; the path is part of the journal's identity by Yoneda's path-as-identity discipline @yoneda1954.

## 2. Directory location

### 2.1 Canonical path

A development journal MUST live at `<thing>/docs/dev/journal/` where `<thing>` is the path of the parent thing's directory under the catalog root. The literal segments `docs`, `dev`, and `journal` MUST be lowercase kebab-case, exactly as written here. Variants (`Docs`, `Development`, `Journals`, `dev-journal`, `journals`) MUST NOT be used.

### 2.2 One journal per thing

Each thing-directory MUST contain at most one `docs/dev/journal/` subdirectory. Splitting a thing's journal across multiple directories MUST NOT be done.

### 2.3 No nested development journals

A development journal MUST NOT contain another development journal as a descendant. The `journal/` directory MUST NOT contain a `dev/journal/` descendant or any other path matching the canonical pattern. Per-sub-thing journals live under each sub-thing's own `docs/dev/journal/`, not nested inside the parent's journal.

### 2.4 Identity by path

By Yoneda's path-as-identity discipline @yoneda1954, two `journal/` directories at distinct catalog paths are distinct development journals — they record the history of distinct parent things. Renaming or relocating a parent-thing directory relocates its development journal as a consequence.

## 3. Directory contents

### 3.1 Only journal-entry files

A development journal directory MUST contain only files conforming to the journal-entry specification. Every regular file in the directory MUST be a journal entry at filename `<YYYY-MM-DD>.md` or `<YYYY-MM-DD>-<slug>.md` per journal-entry §3.

### 3.2 No subdirectories

A development journal directory MUST NOT contain subdirectories. Auxiliary assets (images, data fixtures) referenced by journal entries MUST live elsewhere in the catalog and be referenced by URI; they MUST NOT be co-located in the journal directory.

### 3.3 No index, README, or table-of-contents files

A development journal MUST NOT contain `README.md`, `index.md`, `_index.md`, `TOC.md`, or any analogous index file. Aggregate views of the journal (chronological index, recent-entries listing) are renderer output produced from the entry files, not authored content of the journal directory.

### 3.4 No hidden files

A development journal MUST NOT contain hidden files (filenames beginning with `.`) other than version-control metadata. The directory's contents are public history; hiding files violates the journal's role.

### 3.5 Empty journal

A development journal directory MAY exist with zero entries. An empty journal directory carries the same semantic content as an absent journal directory (no recorded development history); presence-with-zero-entries vs. absence is implementation-defined and MUST NOT be relied on as a normative distinction by readers.

## 4. Entry ordering

### 4.1 Chronological order by lexicographic filename sort

A development journal's entries MUST sort lexicographically by filename into chronological order. This sort property is forced by the journal-entry specification's filename discipline (ISO 8601 extended calendar form @iso86012019, sorting lexicographically into chronological order); this specification adds no per-entry sort-order constraint beyond that.

### 4.2 Same-day entry ordering

When more than one entry exists for a single date, the primary entry (`<YYYY-MM-DD>.md`) MUST sort before all same-day entries (`<YYYY-MM-DD>-<slug>.md`) in lexicographic filename order. The slug-suffixed entries MUST sort among themselves by slug in ASCII order. This is a consequence of the filename grammar and requires no additional discipline by authors.

### 4.3 Date gaps are not entries

A development journal MUST NOT contain placeholder entries for dates on which no work occurred. Gaps in the date sequence are permitted; they record that no work was done on those dates.

## 5. The journal as a non-normative substrate

### 5.1 Non-normative content

A development journal's contents are non-normative: claims made in journal entries do not bind implementations or downstream readers. The journal records *what was thought*, not *what must be true*. Per journal-entry §1, normative claims about the parent thing live in `<thing>/docs/dev/specification.md`, not in journal entries.

### 5.2 Migration to canonical prose or specification

When a journal entry's content becomes settled understanding, that content SHOULD migrate to either `<thing>/docs/<thing>.md` (declarative canonical prose) or `<thing>/docs/dev/specification.md` (normative requirements), depending on the content's nature. The journal entry MUST remain in the journal as the historical record of when and how that understanding settled; the migration is a copy, not a move.

### 5.3 No truth-value over journal contents

A reader MUST NOT cite a claim from a journal entry as authoritative for the parent thing's current state. Citation of a journal entry as evidence of *what was thought on a particular date* is appropriate; citation as evidence of *what is currently true about the thing* is not. Currently-true claims live in the canonical prose or the specification, both of which carry `release-date` or revision metadata that a reader can use to assess currency.

## 6. Frontmatter and metadata

### 6.1 No directory-level metadata

A development journal directory carries no directory-level frontmatter, manifest, or metadata file. The directory's metadata is its name and path (the canonical pattern §2.1); its contents are the entry files.

### 6.2 No journal-level configuration

A development journal MUST NOT contain a configuration file determining how its entries are rendered, ordered, or aggregated. Rendering choices for a thing's journal are made by the rendering pipeline, not by per-journal configuration.

## 7. Lifecycle

### 7.1 Creation

A development journal directory is created the first time an author writes a journal entry for the parent thing. The author MUST create the directory at the canonical path §2.1 and place the first entry inside per the journal-entry specification.

### 7.2 Growth

A development journal grows by accumulation of entries. Each new entry is added per the journal-entry specification's filename grammar and authoring lifecycle (journal-entry §3, §9).

### 7.3 Deletion

A development journal MUST NOT be deleted as a side effect of editing a thing. When a parent thing is deleted from the catalog, its journal directory is deleted with it as part of the parent-thing removal; deletion of the journal directory without deletion of the parent thing MUST NOT occur except by explicit catalog-operator decision documented elsewhere.

### 7.4 Migration of the parent thing

When a parent thing is renamed or moved within the catalog, its journal directory MUST move with it. The journal's path identity follows the parent; an orphaned journal at a path whose parent has been deleted MUST NOT remain in the catalog.

## 8. Error semantics

A development-journal validator MUST emit errors using the SPOTCOMP error schema. Development-journal error classes:

| Class             | Trigger                                                                                       |
|-------------------|-----------------------------------------------------------------------------------------------|
| input/validation  | A file in the directory is not a conforming journal entry (per journal-entry §3 filename).    |
| state/consistency | Subdirectory present (§3.2); index/README file present (§3.3); hidden file present (§3.4);   |
|                   | nested development journal present (§2.3); the directory exists at a non-canonical path (§2.1). |
| I/O/transport     | The directory cannot be read.                                                                 |

Ambiguities MUST be errors.

## 9. Conformance

### 9.1 Conformance matrix

| ID  | Statement                                                                                       | Actor      | Level    | Test                                          |
|-----|-------------------------------------------------------------------------------------------------|------------|----------|-----------------------------------------------|
| D1  | The directory lives at `<thing>/docs/dev/journal/` per §2.1.                                    | producer   | MUST     | `conformance/d1-canonical-path.test.mjs`      |
| D2  | The directory contains only files matching the journal-entry filename grammar per §3.1.          | producer   | MUST     | `conformance/d2-only-entries.test.mjs`        |
| D3  | The directory contains no subdirectories per §3.2.                                              | producer   | MUST     | `conformance/d3-no-subdirs.test.mjs`          |
| D4  | The directory contains no index, README, or TOC file per §3.3.                                  | producer   | MUST     | `conformance/d4-no-index.test.mjs`            |
| D5  | The directory contains no hidden files (other than VCS metadata) per §3.4.                      | producer   | MUST     | `conformance/d5-no-hidden.test.mjs`           |
| D6  | The directory contains no nested development journal per §2.3.                                  | producer   | MUST     | `conformance/d6-no-nested.test.mjs`           |
| D7  | A parent-thing directory contains at most one journal/ subdirectory per §2.2.                   | producer   | MUST     | `conformance/d7-one-per-thing.test.mjs`       |
| D8  | Every contained file passes journal-entry conformance per the journal-entry specification.      | producer   | MUST     | `conformance/d8-entry-conformance.test.mjs`   |
| D9  | The directory has no directory-level metadata or configuration file per §6.                     | producer   | MUST     | `conformance/d9-no-metadata.test.mjs`         |

### 9.2 Conformance profile

A validator implementation MUST publish a `conformance-profile` document declaring `spec-id: development-journal`, the `version` it targets, and which D-IDs it implements.

## 10. Rendering

### 10.1 Aggregate views

A renderer producing HTML output for a thing's documentation MAY produce aggregate views of the development journal: a chronological index, a recent-entries listing, an archive page, an RSS or Atom feed. These views are renderer output, not authored content of the journal directory.

### 10.2 Per-entry rendering

Per-entry rendering of journal entries MUST follow the markdown-document specification's rendering pipeline (pandoc citeproc with CSL stylesheet).

### 10.3 Cross-linking

A renderer SHOULD cross-link a thing's `<thing>/docs/<thing>.md` and `<thing>/docs/dev/specification.md` (when present) with the corresponding development journal so a reader on any of the three pages can navigate to the other two.

## 11. Upgrade path

When a new MAJOR version of this specification is published, existing development journals MUST continue to be loadable by validators implementing the previous MAJOR for at least one full MAJOR cycle.

Migration tools MUST be idempotent on already-conformant journals.

## 12. Security and privacy

### 12.1 Attacker models

The journal-entry specification's attacker models apply at the entry level. At the directory level, two attackers are in scope:

- **Foreign-file injection.** An author or tool that places non-entry files in the journal directory. Mitigation: D2, D4, D5 reject foreign files at validation.
- **Subdirectory injection.** A tool that creates subdirectories in the journal directory (e.g., for caches or build artifacts). Mitigation: D3 rejects subdirectories at validation.

### 12.2 Trust boundary

The trust boundary is the validator. Every directory matching the canonical pattern §2.1 MUST be validated against the §9.1 matrix before being treated as a development journal by downstream tooling.

## 13. Implementations

### 13.1 SPOTCOMP development journals

Every directory at `<thing>/docs/dev/journal/` in the SPOTCOMP TRC is governed by this specification.

### 13.2 Distinction from character journals

The `research-notes/.../characters/<name>/prose/journals/` directories under `research-notes/` are NOT development journals in the sense of this specification; they are part of the character-persona research substrate and follow different conventions. This specification does not apply to those directories.

## 14. Glossary

- **Development journal** — the directory at `<thing>/docs/dev/journal/` aggregating dated journal entries about a parent thing (§1).
- **Parent thing** — the catalog resource whose development the journal records, identified by the directory containing the journal's `docs/dev/journal/` ancestor.
- **Journal entry** — a file inside a development journal, governed by the journal-entry specification.
- **Append-only as a collection** — the discipline that the primary directory-level update is adding new entries; removal or rename of entries is constrained (§1, §7).
- **Chronological order** — the lexicographic-by-filename order that, by virtue of the journal-entry filename discipline, equals chronological order (§4.1).
- **Aggregate view** — a renderer-produced summary of the journal's entries (chronological index, recent-entries listing, RSS feed); not authored content (§3.3, §10.1).

## 15. Open questions

- Whether a per-journal CHANGELOG or release-notes file should be permitted (currently forbidden by §3.3). Resolution blocked by: whether the canonical thing-prose at `<thing>/docs/<thing>.md` is the appropriate place for such notes, or whether journal-level summaries are useful enough to merit their own file convention.
- Whether the development-journal renderer's aggregate views should be specified normatively. Resolution blocked by: the absence of a settled rendering-pipeline specification covering catalog-wide output.

## 16. Rationale (non-normative)

The split of a thing's documentation into canonical prose, normative specification, and development journal follows the three reader-questions of journal-entry §1. The development journal is the place where the working history lives, distinct from the current state (canonical prose) and the conformance contract (specification).

The flat-directory discipline (§3.2, §3.3) is forced by the desire that the directory be `ls`-friendly. A reader running `ls -1 <thing>/docs/dev/journal/` MUST get the chronological list of entries directly, with no index files mixed in and no subdirectories to descend. ISO 8601 extended calendar form in the journal-entry filename discipline (journal-entry §3.4) ensures lexicographic order equals chronological order, completing the property.

The per-thing-one-journal discipline (§2.2) follows Yoneda's path-as-identity reading @yoneda1954: each thing has one canonical journal-path; alternative or shadow journals at other paths would denote distinct categorical objects, fragmenting the history.

The "no directory-level metadata" rule (§6) reflects the principle that the directory's contents are its content. A separate metadata file would be a second source of truth that drifts from the entries themselves; the discipline forbids the drift by forbidding the metadata file.

The migration discipline of §5.2 — copy to canonical prose or specification, do not move from the journal — preserves the journal's role as historical record. Moving content out of the journal would destroy the date-stamped record of when the content was first thought; copying preserves that record while making the content available as current understanding.

## 17. Relationship to other specs

- **Requires**: [`markdown-document`](../../../markdown-document/docs/dev/specification.md) — entries inside the journal are markdown-documents.
- **Requires**: [`specification`](../../../specification/docs/dev/specification.md) — this specification IS-A specification per the spec-of-specs.
- **Requires by transitive content**: [`journal-entry`](../../../journal-entry/docs/dev/specification.md) — every file in a development journal is a journal entry governed by the journal-entry specification.

## 18. Conformance summary

A development journal is conformant iff all of the following hold:

- §2.1 → D1: Directory lives at `<thing>/docs/dev/journal/`.
- §3.1 → D2: Contains only files matching the journal-entry filename grammar.
- §3.2 → D3: Contains no subdirectories.
- §3.3 → D4: Contains no index, README, or TOC file.
- §3.4 → D5: Contains no hidden files (other than VCS metadata).
- §2.3 → D6: Contains no nested development journal.
- §2.2 → D7: Parent-thing directory contains at most one journal/ subdirectory.
- §3.1 → D8: Every contained file passes journal-entry conformance.
- §6 → D9: No directory-level metadata file.
