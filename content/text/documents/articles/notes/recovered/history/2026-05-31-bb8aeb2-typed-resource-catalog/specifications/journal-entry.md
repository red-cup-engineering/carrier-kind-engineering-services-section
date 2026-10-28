---
name: "Journal Entry — Specification"
description: "Specification for SPOTCOMP journal entries: a date-stamped markdown-document at <thing>/docs/dev/journal/<YYYY-MM-DD>[-<slug>].md carrying historical narrative about the parent thing's development at the named date."
spec-id: journal-entry
version: 0.1.0
release-date: 2026-05-26
stability: draft
status: draft
category: convention
requires:
  - markdown-document
  - specification
  - development-journal
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
  - id: jsonschema202012
    type: standard
    author:
      - family: Wright
        given: Austin
      - family: Andrews
        given: Henry
      - family: Hutton
        given: Ben
    title: "JSON Schema: A Media Type for Describing JSON Documents, Draft 2020-12"
    publisher: "JSON Schema Organization"
    issued:
      date-parts:
        - [2022, 6]
    URL: "https://json-schema.org/draft/2020-12/json-schema-core.html"
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
  - id: macfarlane2024
    type: standard
    author:
      - family: MacFarlane
        given: John
    title: "CommonMark Specification, Version 0.31.2"
    publisher: "CommonMark"
    issued:
      date-parts:
        - [2024]
    URL: "https://spec.commonmark.org/0.31.2/"
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

# Journal Entry — Specification

A **journal entry** is a date-stamped markdown-document recording one session of development work about one parent thing. Its filename encodes the entry's date in ISO 8601 calendar form @iso86012019, optionally followed by a kebab-case slug; its body is historical narrative — what was thought, decided, tried, or learned about the parent thing on that date. Journal entries collect under the parent thing's development journal at `<thing>/docs/dev/journal/`, governed by the development-journal specification.

This specification fixes the substrate-level requirements a journal entry MUST satisfy as a markdown-document. The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are used per RFC 2119 @bradner1997 as updated by RFC 8174 @leiba2017.

A journal entry is distinguished from other markdown-documents in the catalog by three properties: (i) its filename matches the dated pattern in §3; (ii) its body is historical narrative about the parent thing on the named date, non-normative; (iii) its content reflects the state of understanding at the entry's date, not a present-tense canonical claim.

## 0. Scope

This specification governs the on-disk byte representation, filename, and authoring discipline of every file at `<thing>/docs/dev/journal/<YYYY-MM-DD>.md` and `<thing>/docs/dev/journal/<YYYY-MM-DD>-<slug>.md` in the SPOTCOMP TRC.

This specification does NOT govern: (a) the directory `<thing>/docs/dev/journal/` itself — that is governed by the development-journal specification; (b) the canonical thing-prose at `<thing>/docs/<thing>.md`; (c) the normative specification at `<thing>/docs/dev/specification.md`; (d) markdown documents elsewhere in the catalog. The general markdown-document specification continues to apply to every journal entry; this specification adds journal-entry-specific constraints on top of that substrate.

## 1. What a journal entry is

A journal entry is a dated, non-normative record of work-in-progress thought about its parent thing. It answers the question: *what was thought, decided, tried, or learned about this thing on this date?*

A journal entry is the per-thing log of development history, complementary to the canonical thing-prose at `<thing>/docs/<thing>.md` (the current settled understanding) and to the normative specification at `<thing>/docs/dev/specification.md` (the conformance contract). The three documents serve distinct readers:

| Document                                                  | Reader's question                                  | Voice               | Normativity |
|-----------------------------------------------------------|----------------------------------------------------|---------------------|-------------|
| `<thing>/docs/<thing>.md`                                 | What is X, currently?                              | declarative present | descriptive |
| `<thing>/docs/dev/specification.md`                       | What must X do to be conforming?                   | normative           | normative   |
| `<thing>/docs/dev/journal/<YYYY-MM-DD>[-slug].md`         | What was thought about X on this date?             | narrative past      | non-normative |

A journal entry is **non-normative**. Its claims are not binding on conforming implementations. A claim made in a journal entry that becomes settled understanding MUST migrate to the canonical thing-prose or the normative specification; the journal entry MUST NOT be relied on as the source of truth for any later derivation.

A journal entry is **dated**. The date encoded in the filename (§3) is the date on which the entry was authored. A journal entry MUST NOT predate or postdate its filename: an entry written on date *D* MUST carry filename `<D>[-slug].md` and MUST NOT carry a different date.

A journal entry is **append-only in spirit, not in bytes**. The file MAY be edited after its initial commit to correct typos, clarify wording, or repair broken citations; the file MUST NOT be edited to retract or rewrite the substantive thinking recorded on the entry's date. A change of mind appears as a new entry on a later date, not as a rewrite of an old entry.

A journal entry IS-A markdown-document. Every requirement of the markdown-document specification (UTF-8, LF, NFC, YAML frontmatter, CommonMark+GFM body, `name` field, Open Graph–conformant `description`, bare `@citekey` discipline, CSL JSON `references`) applies to journal entries except where this specification relaxes a requirement (§4).

## 2. File layout

A journal entry is a single `.md` file in the journal directory. Each entry MUST occupy exactly one file. Multi-file entries (an entry split across two `.md` files) MUST NOT appear; long entries stay in one file.

A journal entry MUST be a sibling of every other journal entry in its parent directory — no subdirectories appear inside the journal directory. Auxiliary assets (images, data fixtures) that one entry references MUST live elsewhere in the catalog and be referenced by URI; they MUST NOT be co-located in the journal directory.

## 3. Filename

### 3.1 Primary entry of a day

A journal entry MUST be named `<YYYY-MM-DD>.md` where `<YYYY-MM-DD>` is an ISO 8601 calendar date @iso86012019 in extended representation: four-digit year, two-digit month, two-digit day, separated by ASCII hyphen-minus (U+002D). The date components MUST be zero-padded: `2026-05-07`, not `2026-5-7`.

The named date MUST be a calendar date that has occurred in the project's time zone; future-dated journal entries MUST NOT be authored.

A directory MAY contain at most one filename of the exact form `<YYYY-MM-DD>.md` per date. This is the primary entry of that date.

### 3.2 Additional same-day entries

When more than one journal entry is authored for one date, the second and subsequent entries MUST be named `<YYYY-MM-DD>-<slug>.md` where `<slug>` is a kebab-case identifier matching the POSIX portable filename character set @posix2017 restricted to lowercase letters, digits, and hyphen-minus, and satisfying the pattern `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`. The slug summarizes the entry's topic in 2–6 hyphen-separated words.

Examples: `2026-05-25.md` (primary), `2026-05-25-shadows-and-apex-tower.md` (additional, same date).

A directory MAY contain any number of additional same-day entries for one date provided their slugs are distinct.

### 3.3 No undated entries

Filenames not matching §3.1 or §3.2 MUST NOT appear in a journal directory. Undated files (e.g., `notes.md`, `scratch.md`), README files (`README.md`), and index files (`index.md`, `_index.md`) MUST NOT be placed under `<thing>/docs/dev/journal/`. Index content belongs in the development-journal directory itself, governed by that specification, not as files inside it.

### 3.4 ISO 8601 only

The dated component MUST use the ISO 8601 extended calendar form @iso86012019. Other date formats — week-date (`2026-W21-1`), ordinal-date (`2026-145`), basic (`20260525`), US-style (`05-25-2026`), or European-style (`25-05-2026`) — MUST NOT appear.

### 3.5 Filename and identity

By Yoneda's path-as-identity discipline @yoneda1954, a journal entry's identity is its full path under the catalog root. Two journal entries at distinct paths are distinct entries even if their bodies are byte-identical; renaming a journal entry's filename changes its identity.

## 4. Frontmatter

### 4.1 Inherited from markdown-document

The frontmatter MUST conform to the markdown-document specification: a YAML 1.2 block with `name` (human-readable, not kebab-case), `description` (Open Graph–conformant, 50–300 chars, plain text), optional `og-*` companion fields, and a `references` array iff the body carries `@citekey` markers.

### 4.2 The `name` field for journal entries

The `name` field SHOULD describe the entry's session, not the parent thing's name. Examples: `"Shadows and the apex tower — 2026-05-25 (second entry)"`, `"Predicating notes — 2026-05-23"`, `"Cone-and-apex synthesis — 2026-05-25"`.

A `name` consisting solely of the parent thing's slug or canonical title (e.g., `name: "articulating"` for an entry under articulating) is permitted but SHOULD be avoided in favor of a session-descriptive title. The parent thing is already identified by the entry's path.

### 4.3 The `description` field for journal entries

The `description` SHOULD summarize what the entry records — the substantive moves of the session, the questions opened, the claims pulled out — not metadata about the entry's authorship or context.

### 4.4 Optional journal-entry frontmatter fields

A journal entry MAY include additional frontmatter keys beyond those required by the markdown-document specification. The following keys are reserved and have the indicated meanings when present:

| Key             | Type                | Notes                                                            |
|-----------------|---------------------|------------------------------------------------------------------|
| `entry-date`    | string (ISO 8601)   | Redundant with the filename's date; if present MUST match it.   |
| `session-of`    | string              | Identifier of the work session this entry records, if any.      |
| `superseded-by` | string              | Path to a later journal entry or note that revises this one.    |

The `superseded-by` field is informational only — it MUST NOT remove the superseded entry's content from the journal directory. Supersession of journal entries is recorded, not enforced.

### 4.5 Frontmatter JSON Schema

```yaml
type: object
additionalProperties: true
required: [name, description]
properties:
  name: { type: string, minLength: 1 }
  description: { type: string, minLength: 1, maxLength: 300 }
  entry-date: { type: string, format: date }
  session-of: { type: string }
  superseded-by: { type: string }
  og-title: { type: string }
  og-type: { type: string }
  og-url: { type: string, format: uri }
  og-image: { type: string, format: uri }
  og-locale: { type: string, pattern: "^[a-z]{2}_[A-Z]{2}$" }
  references:
    type: array
    items: { $ref: "csl-data.json#" }
    uniqueItems: true
```

Implementations MUST validate the frontmatter against this schema using JSON Schema 2020-12 @jsonschema202012 at publish time.

## 5. Body

### 5.1 CommonMark with GFM

The body MUST be CommonMark @macfarlane2024 with GitHub Flavored Markdown extensions as governed by the markdown-document specification.

### 5.2 H1 heading

The body SHOULD begin with an H1 heading carrying the entry's title and date. The H1 MAY duplicate or paraphrase the frontmatter `name`. The date in the H1 SHOULD match the date in the filename.

### 5.3 Past-tense narrative voice

A journal entry's body SHOULD be written in past-tense narrative voice when reporting what was thought, tried, or decided during the session. Present-tense exposition is permitted for stable mathematical content the entry chooses to inline.

Where the entry contains mathematical derivation written as if for a textbook reader, the present-tense and active-voice discipline of the writing standard (per CLAUDE.md `writing standard`) applies to that derivation. A journal entry containing only such derivation, with no narrative reportage, SHOULD be considered for promotion to canonical thing-prose at `<thing>/docs/<thing>.md` rather than left in the journal.

### 5.4 Citations

In-body citations MUST use the bare `@citekey` form per the markdown-document specification §7.1. Bracketed pandoc forms MUST NOT be used.

The `references` frontmatter array MUST be present iff the body carries at least one `@citekey` marker.

### 5.5 No normative claims

A journal entry MUST NOT use the RFC 2119 keywords @bradner1997 in ALL CAPS to express normative requirements. The journal entry is non-normative (§1); normative claims about the parent thing belong in `<thing>/docs/dev/specification.md`, not in the journal.

The same words in lowercase carry no normative force per RFC 8174 @leiba2017 and are permitted in ordinary prose: *"the right approach should reuse the existing closure rule"* is permitted prose, *"implementations SHOULD reuse the existing closure rule"* is not.

### 5.6 No `## References` section

A journal entry body MUST NOT contain a `## References` section (or any heading-level or case variant). The bibliography is renderer output produced by pandoc citeproc from the frontmatter `references` block, per the markdown-document specification §7.7.

### 5.7 No `## Conformance` section

A journal entry MUST NOT contain a `## Conformance` section, a conformance matrix, or any other structure imitating a specification's normative apparatus. A journal entry is a historical record, not a conformance contract.

### 5.8 Cross-references to other entries and notes

A journal entry MAY reference other journal entries, notes, schemas, scripts, or specifications using ordinary markdown link syntax with relative paths under the catalog root. References to entries in other thing-journals MUST use the catalog-rooted path from the referring entry to the referenced file. Cross-references to research notes MAY use catalog-root-relative paths.

## 6. Migration of pre-existing entries

Journal entries authored before this specification's `release-date` MAY lack `references` frontmatter and `@citekey` markers per the markdown-document specification's migration window (markdown-document §21.1). Pre-existing entries SHOULD be brought into conformance with this specification over time, but a pre-existing entry MUST NOT be retroactively rewritten in a way that changes the substantive thinking it recorded on its original date (§1).

A pre-existing entry whose body contains a `## References` section MUST be migrated: the `## References` section MUST be removed, the cited works MUST be encoded as CSL JSON entries in the frontmatter `references` array, and the body's bracketed `[@citekey]` markers (if any) MUST be replaced with bare `@citekey` markers.

A pre-existing entry whose body uses ALL-CAPS normative keywords for non-normative emphasis (a common pre-spec authoring habit) MUST be migrated: the ALL-CAPS forms MUST be replaced with lowercase prose unless the entry is being promoted to a specification.

## 7. Error semantics

A journal-entry validator MUST emit errors using the SPOTCOMP error schema. Journal-entry error classes:

| Class             | Trigger                                                                                  |
|-------------------|------------------------------------------------------------------------------------------|
| input/validation  | Frontmatter fails the §4.5 JSON Schema; body fails CommonMark+GFM parse.                |
| canonicalization  | File deviates from the markdown-document `CANON(file)`.                                  |
| state/consistency | Filename does not match §3.1 or §3.2; `entry-date` disagrees with filename's date.       |
| version/feature   | File uses a markdown extension this specification does not include.                      |
| I/O/transport     | The file cannot be read; a citation marker has no matching `references` entry.           |
| security/authz    | The file contains inline HTML outside the GFM allowlist.                                 |

Ambiguities MUST be errors; unspecified parsing fallback MUST NOT appear in normative behavior.

## 8. Conformance

### 8.1 Conformance matrix

| ID  | Statement                                                                                         | Actor    | Level    | Test                                          |
|-----|---------------------------------------------------------------------------------------------------|----------|----------|-----------------------------------------------|
| J1  | Filename matches `<YYYY-MM-DD>.md` or `<YYYY-MM-DD>-<slug>.md` per §3.1, §3.2.                    | producer | MUST     | `conformance/j1-filename.test.mjs`            |
| J2  | The dated component is an ISO 8601 extended calendar date per §3.4.                               | producer | MUST     | `conformance/j2-iso8601.test.mjs`             |
| J3  | The slug (when present) matches the kebab-case pattern in §3.2.                                   | producer | MUST     | `conformance/j3-slug.test.mjs`                |
| J4  | The file underlies markdown-document conformance (every M-ID of the markdown-document spec).      | producer | MUST     | `conformance/j4-markdown-document.test.mjs`   |
| J5  | The body contains no ALL-CAPS RFC 2119 normative keywords per §5.5.                               | producer | MUST     | `conformance/j5-no-normative.test.mjs`        |
| J6  | The body contains no `## References` section per §5.6.                                            | producer | MUST     | `conformance/j6-no-refs-section.test.mjs`     |
| J7  | The body contains no `## Conformance` section, matrix, or similar per §5.7.                       | producer | MUST     | `conformance/j7-no-conformance.test.mjs`      |
| J8  | When `entry-date` is present, it equals the filename's date per §4.4.                             | producer | MUST     | `conformance/j8-entry-date.test.mjs`          |
| J9  | The file lives directly under `<thing>/docs/dev/journal/`, with no intervening subdirectories.    | producer | MUST     | `conformance/j9-layout.test.mjs`              |
| J10 | The `name` SHOULD describe the entry's session, not the parent thing alone (§4.2).                | producer | SHOULD   | `conformance/j10-name-session.test.mjs`       |
| J11 | The body SHOULD be in past-tense narrative voice when reporting session work (§5.3).              | producer | SHOULD   | `conformance/j11-narrative-voice.test.mjs`    |

### 8.2 Conformance profile

A validator implementation MUST publish a `conformance-profile` document declaring `spec-id: journal-entry`, the `version` it targets, and which J-IDs it implements.

## 9. Authoring lifecycle

### 9.1 Drafting

A journal entry is drafted in one writing session corresponding to one date. The author writes the file at `<thing>/docs/dev/journal/<YYYY-MM-DD>.md` (or the same-day-slug form if a primary entry already exists for that date). The frontmatter `name` and `description` MUST be set at draft time.

### 9.2 Commit

The journal entry SHOULD be committed to version control on the date it records. Late-committing of an entry MUST NOT alter the filename's date to the commit date: the filename remains the entry's authored date.

### 9.3 Edits after commit

After commit, the entry MAY be edited for typos, citation repairs, frontmatter additions, and formatting fixes. The entry MUST NOT be edited to retract or rewrite substantive thinking; later thinking appears as a new entry on a later date.

A journal entry MAY be deleted only if it was committed in error (e.g., wrong parent thing, accidental commit). Once an entry has been referenced by another entry, a note, or a specification, it MUST NOT be deleted; supersession is recorded via `superseded-by` per §4.4.

## 10. Determinism

`CANON(file)` for a journal entry follows the markdown-document specification §9 byte-for-byte. The same input bytes produce the same canonical bytes across implementations. This specification adds no journal-entry-specific canonicalization.

## 11. Upgrade path

When a new MAJOR version of this specification is published, existing journal entries MUST continue to be loadable by validators implementing the previous MAJOR for at least one full MAJOR cycle. The frontmatter `additionalProperties: true` setting (§4.5) permits forward-compatible additions to the frontmatter schema.

Migration tools MUST be idempotent on already-conformant files.

## 12. Security and privacy

### 12.1 Attacker models

The markdown-document specification's attacker models (malicious-author, citation-poisoning) apply unchanged. This specification adds no journal-entry-specific attackers.

### 12.2 Privacy

A journal entry MAY record the author's contemporaneous thinking, including dead-ends, uncertainties, and corrections. Authors SHOULD avoid recording personal data unrelated to the work; when recorded, personal data is subject to the same considerations as other catalog content.

### 12.3 Retraction

Per §9.3, an entry MUST NOT be edited to retract substantive content. Privacy-driven retraction of an entry's personal data MAY require deletion of the entry; deletion of a referenced entry interacts with the cross-reference discipline of §5.8 and SHOULD be discussed with the catalog operator before action.

## 13. Implementations

### 13.1 SPOTCOMP development journals

Every `<thing>/docs/dev/journal/<YYYY-MM-DD>[-<slug>].md` file in the SPOTCOMP TRC is governed by this specification. Pre-existing journal entries are subject to §6.

### 13.2 Cross-publication

A journal entry renders to HTML by the markdown-document pipeline (pandoc citeproc with CSL stylesheet). Aggregate views of a thing's journal (chronological index, RSS feed, archive page) are produced by the development-journal renderer, not by per-entry tooling.

## 14. Glossary

- **Journal entry** — a date-stamped markdown-document at `<thing>/docs/dev/journal/<YYYY-MM-DD>[-<slug>].md` recording one session of development work about the parent thing (§1).
- **Primary entry** — the journal entry at filename `<YYYY-MM-DD>.md` for a given date (§3.1).
- **Same-day entry** — an additional entry for a date already having a primary entry, at filename `<YYYY-MM-DD>-<slug>.md` (§3.2).
- **Parent thing** — the catalog resource whose development the journal records, identified by the directory containing the journal entry's `docs/dev/journal/` ancestor.
- **Non-normative** — content carrying no conformance obligation on any implementation (§1).
- **Append-only in spirit** — the discipline that substantive content of an entry is not edited after commit, even when bytes are technically editable (§1, §9.3).
- **Supersession** — a later entry or note that revises an earlier entry's thinking, recorded via the optional `superseded-by` frontmatter field (§4.4).

## 15. Open questions

- Whether the `entry-date` frontmatter field of §4.4 should be promoted from optional to required. Resolution blocked by: whether pre-existing entries (which lack the field) are bulk-migrated or grandfathered.
- Whether multiple-author journal entries should encode authorship in frontmatter beyond what CSL provides. Resolution blocked by: whether the project moves to multi-author entries; current practice is single-author per entry.

## 16. Rationale (non-normative)

The split between `<thing>/docs/<thing>.md` (canonical prose), `<thing>/docs/dev/specification.md` (normative spec), and `<thing>/docs/dev/journal/<YYYY-MM-DD>[-slug].md` (journal entry) follows the three reader-questions distinguished in §1. Conflating any two of these documents conflates two reader-questions and produces a worse document for both readers.

The date-in-filename convention is forced by the journal's role as a historical log: a reader scanning the directory by `ls` sees entries in chronological order without parsing file contents. ISO 8601 extended calendar form is chosen because it sorts lexicographically into chronological order, unlike US-style or European-style date forms.

The same-day-slug discipline (§3.2) accommodates the empirical pattern that one date sometimes warrants more than one entry — a morning session and an evening session on different aspects, or a primary entry plus a follow-up note. Forcing all same-day thinking into one file would either bloat the file or force authors to wait until the next day to record follow-up thinking; both are worse than the slug convention.

The "no normative keywords" rule (§5.5) is forced by the journal's role as a historical narrative: normative claims belong in a specification, which is dated by its `release-date` rather than by a filename. Allowing ALL-CAPS MUSTs in journal entries creates a second source of normative claims that drifts from the specification; the validator's job is easier when this can never happen.

The "no References section" rule inherits from the markdown-document specification's §7.7. A journal entry that needs to cite works carries those citations in the frontmatter `references` array; pandoc citeproc renders the bibliography at publication time.

## 17. Relationship to other specs

- **Requires**: [`markdown-document`](../../../markdown-document/docs/dev/specification.md) — every journal entry IS-A markdown-document. The markdown-document specification's M1–M18 conformance items hold on every journal entry.
- **Requires**: [`specification`](../../../specification/docs/dev/specification.md) — this specification IS-A specification per the spec-of-specs.
- **Required by**: [`development-journal`](../../../development-journal/docs/dev/specification.md) — the development-journal specification governs the directory; each file in that directory is governed by this specification.

## 18. Conformance summary

A journal entry is conformant iff all of the following hold:

- §3 → J1, J2, J3: Filename matches the dated pattern; the dated component is ISO 8601; the slug (when present) matches kebab-case.
- §4, §5 → J4: Underlying markdown-document conformance holds.
- §4.4 → J8: `entry-date` (when present) matches the filename's date.
- §5.5 → J5: No ALL-CAPS RFC 2119 normative keywords.
- §5.6 → J6: No `## References` section.
- §5.7 → J7: No `## Conformance` section or matrix.
- §3, §9 → J9: File sits directly under `<thing>/docs/dev/journal/` with no intervening subdirectories.
- §4.2 → J10: `name` describes the entry's session (SHOULD).
- §5.3 → J11: Body uses past-tense narrative voice when reporting session work (SHOULD).
