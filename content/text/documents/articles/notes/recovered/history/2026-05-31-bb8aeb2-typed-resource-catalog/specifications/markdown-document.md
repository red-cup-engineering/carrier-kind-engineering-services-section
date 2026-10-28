---
name: "Markdown Document — Specification"
description: "Specification for SPOTCOMP markdown documents: human-readable name (not kebab-case), Open Graph–conformant description, and a YAML references frontmatter resolved by in-body @citekey markers in pandoc citation syntax."
spec-id: markdown-document
version: 0.1.0
release-date: 2026-05-25
stability: draft
status: draft
category: format
requires:
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
        - [2026, 5, 25]
  - id: csl102
    type: standard
    author:
      - family: Bennett
        given: "Frank G."
      - family: Zelle
        given: "Rintze M."
      - family: "D'Arcus"
        given: Bruce
    title: "Citation Style Language 1.0.2 Specification"
    publisher: "CSL Project"
    issued:
      date-parts:
        - [2015]
    URL: "https://docs.citationstyles.org/en/stable/specification.html"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: csljson
    type: webpage
    author:
      - literal: "CSL Project"
    title: "CSL-JSON: Citeproc JSON schema"
    publisher: "GitHub"
    issued:
      date-parts:
        - [2020]
    URL: "https://github.com/citation-style-language/schema/blob/master/schemas/input/csl-data.json"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: facebook2010
    type: webpage
    author:
      - family: Zuckerberg
        given: Mark
    title: "Building the Social Web Together"
    publisher: "Facebook"
    issued:
      date-parts:
        - [2010, 4, 21]
    URL: "https://about.fb.com/news/2010/04/building-the-social-web-together/"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: gfm2019
    type: standard
    author:
      - literal: "GitHub, Inc."
    title: "GitHub Flavored Markdown Spec, Version 0.29-gfm"
    publisher: "GitHub"
    issued:
      date-parts:
        - [2019]
    URL: "https://github.github.com/gfm/"
    accessed:
      date-parts:
        - [2026, 5, 25]
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
        - [2026, 5, 25]
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
        - [2026, 5, 25]
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
        - [2026, 5, 25]
  - id: macfarlanepandoc
    type: webpage
    author:
      - family: MacFarlane
        given: John
    title: "Pandoc User's Guide — Citation syntax"
    publisher: "pandoc.org"
    issued:
      date-parts:
        - [2024]
    URL: "https://pandoc.org/MANUAL.html#extension-citations"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: ogp2014
    type: standard
    author:
      - literal: "Open Graph Working Group"
    title: "The Open Graph protocol"
    publisher: "ogp.me"
    issued:
      date-parts:
        - [2014]
    URL: "https://ogp.me/"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: rfc3629
    type: standard
    author:
      - family: Yergeau
        given: François
    title: "UTF-8, a Transformation Format of ISO 10646"
    publisher: "IETF"
    number: "RFC 3629"
    issued:
      date-parts:
        - [2003, 11]
    URL: "https://www.rfc-editor.org/rfc/rfc3629"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: rfc3986
    type: standard
    author:
      - family: Berners-Lee
        given: Tim
      - family: Fielding
        given: "Roy T."
      - family: Masinter
        given: Larry
    title: "Uniform Resource Identifier (URI): Generic Syntax"
    publisher: "IETF"
    number: "RFC 3986"
    issued:
      date-parts:
        - [2005, 1]
    URL: "https://www.rfc-editor.org/rfc/rfc3986"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: unicode15nfc
    type: standard
    author:
      - literal: "Unicode Consortium"
    title: "Unicode Standard Annex #15: Unicode Normalization Forms"
    publisher: "Unicode Consortium"
    issued:
      date-parts:
        - [2023, 8]
    URL: "https://www.unicode.org/reports/tr15/"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: yaml12
    type: standard
    author:
      - family: "Ben-Kiki"
        given: Oren
      - family: Evans
        given: Clark
      - family: "döt Net"
        given: Ingy
    title: "YAML Ain't Markup Language (YAML™) Version 1.2 (Third Edition)"
    publisher: "YAML Language Development Team"
    issued:
      date-parts:
        - [2021, 10, 1]
    URL: "https://yaml.org/spec/1.2.2/"
    accessed:
      date-parts:
        - [2026, 5, 25]
---

# Markdown Document — Specification

A **markdown-document** is a SPOTCOMP resource whose body is CommonMark @macfarlane2024 with GitHub Flavored Markdown extensions @gfm2019 and whose front matter is YAML 1.2 @yaml12 carrying three normative fields: a human-readable `name`, an Open Graph–conformant `description` @ogp2014, and a `references` array of Citation Style Language JSON-compatible entries @csl102, @csljson. The body cites references via pandoc-style `@citekey` markers @macfarlanepandoc.

This specification fixes the substrate-level requirements a markdown-document MUST satisfy. The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are used per RFC 2119 @bradner1997 as updated by RFC 8174 @leiba2017.

A markdown-document is distinguished from other typed resources in the catalog by three properties: (i) its `name` field is human-readable and MUST NOT be kebab-case (§4); (ii) its `description` field is a plain-text summary (§5); (iii) its bibliographic apparatus is split into a frontmatter `references` block and in-body `@citekey` markers (§6, §7).

## 0. Scope

This specification governs the on-disk byte representation of every `.md` file in the SPOTCOMP TRC: extension, encoding, line endings, frontmatter delimiters, frontmatter schema, body syntax, citation discipline, and rendering.

This specification does NOT govern: (a) the prose content quality of individual markdown-documents; (b) the rendering target (HTML, PDF, etc.) beyond §5.6 Open Graph metadata; (c) markdown files outside the SPOTCOMP TRC; (d) the conformance requirements of specifications (those are governed by the spec-of-specs at the sibling `specification/` directory).

## 1. What a markdown-document is

A markdown-document is a typed prose resource in the SPOTCOMP TRC: a UTF-8 `.md` file beginning with a YAML 1.2 frontmatter block, followed by a CommonMark + GFM body. The frontmatter carries display metadata (`name`, `description`, Open Graph fields) and a bibliographic apparatus (`references`); the body carries prose and inline citations (`@citekey`) that resolve to entries in `references`.

The discipline serves three purposes:

- **Display.** The frontmatter `name` and `description` give a renderer enough metadata to produce social-card previews, directory listings, search-engine snippets, and unattended summaries without parsing the body. Open Graph conformance @ogp2014 makes this metadata interoperable with external systems.
- **Citation integrity.** The `references` array carries structured CSL JSON @csl102, @csljson entries; in-body `@citekey` markers resolve against the array at validation time, not render time. This catches dangling citations early and lets renderers (pandoc citeproc @macfarlanepandoc) format bibliographies deterministically.
- **Self-containment.** The combination of in-frontmatter `references` and in-body `@citekey` markers makes each markdown-document a self-contained bibliographic unit: a reader receiving the file in isolation has every citation's full bibliographic record without needing an external bibliography file.

## 2. File layout

### 2.1 Extension and encoding

A markdown-document file MUST have extension `.md`. It MUST be UTF-8 encoded per RFC 3629 @rfc3629. It MUST use LF (0x0A) line terminators. It MUST be in Unicode Normalization Form C (NFC) per Unicode Annex #15 @unicode15nfc.

### 2.2 Frontmatter delimiters

The file MUST begin with a YAML 1.2 front-matter block @yaml12, opened on line 1 by a line containing exactly `---` (three hyphens, no trailing whitespace) and closed by a subsequent line containing exactly `---`. No content MAY precede the opening `---`. The closing `---` MUST be followed by exactly one LF, then the body.

### 2.3 Body

After the closing `---`, the file body MUST be CommonMark @macfarlane2024 with the GFM extensions @gfm2019 enabled (tables, strikethrough, task list items, autolinks, disallowed raw HTML). The body MAY be empty; if so, the file is well-formed but conveys no content beyond its frontmatter.

## 3. Frontmatter schema

The frontmatter MUST validate as a JSON Schema 2020-12 object @jsonschema202012 with the structure given below.

```yaml
type: object
additionalProperties: true   # OGraph extensions and per-document fields permitted
required:
  - name
  - description
properties:
  name: { type: string, minLength: 1 }
  description: { type: string, minLength: 1, maxLength: 300 }
  references:
    type: array
    items: { $ref: "csl-data.json#" }
    uniqueItems: true
```

Implementations MUST refuse to publish a markdown-document whose frontmatter fails this schema. Implementations MUST NOT silently coerce missing required fields.

## 4. The `name` field

### 4.1 Human-readable, not kebab-case

The `name` field MUST be a human-readable title. The `name` MUST NOT match the kebab-case slug pattern `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$` that governs path segments. Mixed case, ASCII spaces, ASCII punctuation, parenthetical glosses, em-dashes (U+2014), and en-dashes (U+2013) are permitted. Examples: `"Markdown Document — Specification"`, `"On the Homology Theory of Modules"`, `"TRC, Loaded: A Dev Journal Entry"`.

### 4.2 Display projection, not identity

The `name` is a display projection of the resource. It does not participate in path-as-identity: a markdown-document's categorical identity is its POSIX path under the catalog root, with each path segment a kebab-case slug per the TRC specification §3.2. Two markdown-documents at distinct paths MAY share a `name` without identity collision; the path discriminates them.

### 4.3 Stability

The `name` SHOULD be stable across revisions of the same resource. Changing `name` does not change the resource's identity (the path) but does invalidate any external cache that materializes the resource by its display title.

### 4.4 Length

The `name` SHOULD be at most 100 characters. Longer titles are permitted but render poorly in social-card previews.

## 5. The `description` field

### 5.1 Plain-text summary

The `description` field MUST be a plain-text one-to-two-sentence summary of the document, suitable for unattended display in a directory listing or a search result. It MAY additionally be authored as a valid `og:description` per the Open Graph protocol @ogp2014, @facebook2010; Open Graph conformance is OPTIONAL, not required.

### 5.2 Plain text

The `description` MUST be plain text. Markdown formatting (emphasis, code spans, links, lists) MUST NOT appear; LF and HTML tags MUST NOT appear. The text MUST be encoded as a single YAML string (folded or quoted).

### 5.3 Length

The `description` SHOULD be between 50 and 300 characters. The 300-character upper bound is the JSON Schema `maxLength` constraint in §3 and MUST be enforced by validators.

### 5.4 Self-contained

The `description` MUST be self-contained: it MUST NOT reference document sections (no "see §3 below"), MUST NOT use first-person, and MUST NOT depend on external context to be intelligible. A reader receiving only the `description` in isolation MUST be able to decide whether the document is relevant.

### 5.5 Voice

The `description` SHOULD be written in the third-person declarative active voice, present tense. Imperative voice is acceptable when the document specifies a procedure.

### 5.6 Companion Open Graph fields

The frontmatter MAY include additional Open Graph properties @ogp2014 as keys prefixed `og-`:

- `og-title` (string) — overrides the default `og:title` (which is `name`).
- `og-type` (string) — defaults to `article`; permissible values are the Open Graph type vocabulary entries.
- `og-url` (URI per RFC 3986 @rfc3986) — the canonical URL of the rendered document; defaults to the path resolved against the catalog host.
- `og-image` (URI per RFC 3986 @rfc3986) — the social-card image.
- `og-locale` (string matching `^[a-z]{2}_[A-Z]{2}$`) — defaults to `en_US`.

A renderer producing HTML output for the document MAY emit `<meta property="og:..." content="..."/>` tags for `og:title`, `og:type`, `og:url`, `og:description`, and `og:locale`, populated from the frontmatter or derived defaults per this section.

## 6. The `references` frontmatter block

### 6.1 Presence

The `references` field MUST be present in the frontmatter iff the body contains at least one `@citekey` marker (§7). If the body cites nothing, `references` MAY be omitted; if present and empty, it MUST be the empty array `[]`.

### 6.2 CSL JSON conformance

Each entry in `references` MUST be a Citation Style Language JSON object @csl102, @csljson. Each entry MUST validate against the CSL JSON Schema published at the CSL Project repository @csljson.

### 6.3 Required fields per entry

Every reference entry MUST have:

- `id` (string) — the citekey used by `@citekey` markers in the body (§7). MUST match the citekey pattern in §6.5.
- `type` (string) — one of the CSL types: `article-journal`, `article-magazine`, `article-newspaper`, `book`, `chapter`, `paper-conference`, `thesis`, `report`, `standard`, `webpage`, `dataset`, `software`, `personal_communication`, etc., per the CSL 1.0.2 vocabulary @csl102.
- `title` (string) — the work's title.
- `issued` (CSL date object) — the publication date, encoded as `{date-parts: [[YYYY]]}` for year-only or `{date-parts: [[YYYY, MM, DD]]}` for fuller precision.
- Either `author` or `editor` (array of CSL name objects) — at least one MUST be present. A name object is `{family: "...", given: "..."}` or `{literal: "..."}` for corporate or single-name authors.

### 6.4 Type-conditional required fields

In addition to §6.3, entries MUST carry the following fields per type:

- `article-journal`: `container-title`, `volume`, `page`.
- `book`: `publisher`, `publisher-place` SHOULD be present.
- `chapter`: `container-title`, `editor`, `publisher`, `page`.
- `paper-conference`: `container-title`, `event-place` SHOULD be present.
- `thesis`: `publisher` (the degree-granting institution), `genre` (e.g., `"Ph.D. thesis"`, `"M.A. thesis"`).
- `report`: `publisher`, `number`.
- `standard`: `publisher` (the standards-development organization), `number`.
- `webpage`: `URL`, `accessed` (CSL date object).
- `dataset`, `software`: `version` SHOULD be present.

### 6.5 Citekey discipline

A citekey MUST match the pattern `^[a-z][a-z0-9]*[0-9]{4}[a-z]?$`. Construction: lowercase the surname of the first author (stripping diacritics per Unicode NFKD), concatenate the four-digit publication year, append an optional lowercase letter `a`, `b`, `c`, ... when disambiguating multiple works by the same first-author/year. Examples: `yoneda1954`, `belnap1977`, `lambek1969a`, `lambek1969b`, `macfarlane2024`. Corporate-author works derive the citekey from the corporate name's first significant word (e.g., `ietf2017`, `ieee2018`).

### 6.6 Sort order

The `references` array MUST be sorted by `id` in ASCII order. Implementations MUST refuse to publish a markdown-document whose references are out of order.

### 6.7 Uniqueness

Citekeys MUST be unique within the file: no two entries in the same `references` array MAY share an `id`. Citekey collisions across files are not constrained; each markdown-document is its own bibliographic scope.

### 6.8 Naked URLs forbidden

A reference entry with a `URL` field MUST also carry an `accessed` date in CSL form. Reference entries of type `webpage` MUST carry both. This protects against link rot: an `accessed` date establishes what was at the URL when the citation was made.

### 6.9 Corporate authors

When the work has no individual author, the entry MUST encode the corporate author as `[{literal: "<corporate name>"}]`. The bare string form (`author: "IEEE"`) MUST NOT be used. Examples: `[{literal: "GitHub, Inc."}]`, `[{literal: "IEEE and The Open Group"}]`.

### 6.10 No prose in `references`

The `references` array MUST contain only structured CSL data. Annotations, summaries, and editorial commentary on a reference MUST NOT appear in the entry; they belong in the body.

## 7. In-body citations

### 7.1 Pandoc citeproc syntax — one form only

In-body citations MUST use the bare pandoc citeproc form `@citekey` @macfarlanepandoc and no other. There is exactly one citation form in SPOTCOMP markdown-documents:

- `@citekey` — a citation marker resolving to the `references[*]` entry whose `id` equals `citekey`. Pandoc renders this in the style dictated by the active CSL stylesheet (the SPOTCOMP default is `chicago-author-date`, which renders `@yoneda1954` as `Yoneda (1954)` when grammatically standalone or as `(Yoneda 1954)` when embedded; the choice between the two surface forms is the renderer's, not the author's).

The bracketed forms `[@citekey]`, `[@citekey, p. 12]`, `[@citekey1; @citekey2]`, `[-@citekey]`, and `[@citekey {.nocite}]` MUST NOT be used. The bracketed forms are valid pandoc syntax @macfarlanepandoc but introduce author choices (parenthesize-or-not, locator-syntax, multi-cite-grouping, suppress-author) that this specification removes by pinning a single form. One form means: one parser pattern for linters, one rendering surface for the CSL stylesheet, no author micro-decisions per citation.

When a citation needs to cover multiple sources, the author MUST write each source as its own bare marker: `as @yoneda1954 and @maclane1971 showed`, not `[@yoneda1954; @maclane1971]`. When a citation needs a page-or-section locator, the locator MUST appear in surrounding prose: `on page 193 of @yoneda1954`, not `[@yoneda1954, p. 193]`. The cost — slightly more verbose prose — is paid in exchange for the one-form guarantee.

### 7.2 Resolution

Every `@citekey` marker in the body MUST resolve to an entry in the frontmatter `references` array whose `id` field matches the citekey. A marker with no matching entry is a non-conformant document. Implementations MUST surface unresolved citations as errors at validation time, not at render time.

### 7.3 No bibliographic data in body markers

In-body citation markers MUST NOT carry URLs, ISBNs, DOIs, page counts, locators, or any other bibliographic data — those fields live in the `references` entry (§6). The body marker carries the citekey and nothing else. Locators (page numbers, chapter references, theorem numbers) MUST appear in surrounding prose per §7.1.

### 7.4 Locators in surrounding prose

The bare `@citekey` form admits no locator suffix. When a citation requires a page, chapter, theorem, or section reference, the locator MUST appear as ordinary prose adjacent to the citation marker. Examples: `on page 193 of @yoneda1954`, `@maclane1971 (Ch. III §2)`, `Theorem 4.1 of @lambek1969`. The locator vocabulary follows CSL conventions @csl102 even when expressed in prose: `p.`, `pp.`, `Ch.`, `§`, `Thm.`, etc.

### 7.5 Unused references

Every entry in `references` SHOULD be cited at least once in the body. Implementations SHOULD warn (not error) on unused references; some documents legitimately list further-reading entries without in-body markers. Authors MUST NOT use the `[@citekey {.nocite}]` form to force inclusion of uncited references (that form is bracketed and forbidden by §7.1); an uncited reference is admitted by leaving it in the `references` array without an in-body marker, and the validator warns per the SHOULD level above.

### 7.6 Immediate-placement rule

Every `@citekey` marker MUST appear inside the sentence that carries the claim the citation supports, placed either immediately after the supported phrase or immediately before the sentence's terminating punctuation. A citation marker MUST NOT be hoisted to the end of the paragraph, the end of the section, the end of the document, or any other location separated from the supported claim by a sentence boundary. When one sentence carries two distinct claims supported by two distinct sources, each source MUST be cited next to its own claim, not bundled at the sentence's end. When one sentence carries one claim supported by two sources, the author writes each source as its own bare marker adjacent to (or interleaved with) the claim — combined-bracket markers are forbidden by §7.1.

A reader scanning a single sentence MUST be able to identify every external source grounding that sentence's claims without reading the surrounding text. Bundled-at-the-end citation discipline (one block of citations covering a paragraph or multi-sentence span) MUST NOT be used.

### 7.7 No References section in body

A markdown-document body MUST NOT contain a section with heading `References` (at any heading level, in any case variant including `## References`, `### References`, `REFERENCES`, `Bibliography`, `Works Cited`, etc.). The bibliography is renderer output, not authored body content: pandoc citeproc @macfarlanepandoc consumes the frontmatter `references` block (§6) and the in-body `@citekey` markers (§7.1–§7.6), and emits the bibliography in its rendered form. Authoring a References section in the body duplicates the renderer's output, inserts content that can drift from the canonical frontmatter source, and produces double-rendered bibliographies.

A renderer MUST place the bibliography at the end of the rendered document by default, OR at the location indicated by a pandoc `$refs$` template variable when the rendering pipeline uses a custom template. A renderer MUST NOT require the body to contain a `## References` heading.

A markdown-document that needs a non-bibliographic "Further reading" or "See also" section MAY use those headings; those sections MUST NOT contain `@citekey` markers (which would resolve into the auto-generated bibliography). Cross-references to other documents in such sections use ordinary markdown link syntax, not citation markers.

## 8. Body conventions

### 8.1 Headings

The body SHOULD begin with an H1 heading carrying the document's `name`, OR omit the H1 and rely on the renderer to derive a title from the `name` frontmatter. The choice MUST be consistent within a single rendering pipeline.

Subsequent headings MUST use ATX form (`##`, `###`, ...) per CommonMark @macfarlane2024; setext headings MUST NOT be used. Heading levels MUST NOT skip (no `####` directly after `##`).

### 8.2 Code blocks

Code blocks MUST use fenced triple-backtick form per CommonMark @macfarlane2024, with a language hint immediately after the opening fence (e.g., ```` ```python ````). Indented code blocks MUST NOT be used.

### 8.3 Tables

Tables MUST use GFM pipe-table form @gfm2019.

### 8.4 Math

Inline math uses single-dollar form (`$...$`); display math uses double-dollar form (`$$...$$`). The renderer MUST be configured to recognize these per pandoc convention @macfarlanepandoc; this is a pandoc extension, not native CommonMark.

### 8.5 Internal cross-references

The body MAY use CommonMark link syntax to reference sections of the same document by their slug-encoded heading id: `[§5.3](#5-3)`. The body MUST NOT use angle-bracket auto-links to bare section numbers.

### 8.6 No inline HTML except where required by GFM

Inline HTML MUST NOT appear in the body except where required by GFM (`<sup>`, `<sub>` for typesetting). When HTML appears, it MUST be on the GFM disallowed-raw-HTML allowlist @gfm2019.

## 9. Canonicalization (A.2)

The canonical byte form `CANON(file) → bytes` of a markdown-document is defined as follows:

1. The file MUST be UTF-8 encoded @rfc3629 in Unicode Normalization Form C @unicode15nfc.
2. Line terminators MUST be LF (0x0A). CR, CRLF, and LS line terminators MUST NOT appear.
3. The frontmatter YAML MUST be emitted in block style (not flow style) with two-space indentation.
4. Frontmatter keys MUST appear in the order: `name`, `description`, `og-title`, `og-type`, `og-locale`, `og-url`, `og-image`, then any spec-of-specs frontmatter (`spec-id`, `version`, `release-date`, `stability`, `status`, `category`, `requires`, `supersedes`, `superseded-by`, `topic`, `applies-to-runtimes`, `ordering`), then `references`.
5. Within `references`, entries appear sorted by `id` ASCII order (§6.6). Within each entry, fields appear in the order: `id`, `type`, `author` (or `editor`), `title`, `container-title`, `volume`, `page`, `publisher`, `publisher-place`, `number`, `issued`, then any remaining CSL fields sorted alphabetically.
6. The body MUST NOT contain trailing whitespace on any line.
7. The file MUST end with a single LF; multiple trailing newlines MUST NOT appear.

Implementations MUST publish golden vectors of canonical files at `docs/dev/conformance/canon-*.md`.

## 10. Error semantics (A.3)

Errors emitted by a markdown-document validator MUST follow the SPOTCOMP error schema specified by the spec-of-specs and instantiated by the TRC specification (`code`, `name`, `severity`, `where`, `when`, `correlation-id`, `fault`, `retryable`, `data`).

Markdown-document error classes:

| Class             | Trigger                                                                |
|-------------------|------------------------------------------------------------------------|
| input/validation  | Frontmatter fails the §3 JSON Schema; body fails CommonMark+GFM parse. |
| canonicalization  | File deviates from `CANON(file)` per §9.                               |
| version/feature   | File uses a markdown extension this specification does not include.    |
| state/consistency | A `@citekey` marker does not resolve to a `references` entry (§7.2); references out of sort order (§6.6); duplicate citekeys (§6.7). |
| I/O/transport     | The `.md` file cannot be read or its companion `og-image` URL is unreachable at validation time. |
| security/authz    | The file contains inline HTML outside the GFM allowlist (§8.6).        |

Ambiguities MUST be errors; unspecified parsing fallback MUST NOT appear in normative behavior.

## 11. Persisting and rendering

### 11.1 Persisting

Persisting a markdown-document MUST validate the frontmatter against the §3 schema and the body against CommonMark+GFM before any byte is written. The file MUST be written in the canonical byte form specified by §9. The file MUST be written atomically (write-to-temp-then-rename) so that no partial file is observable on a read concurrent with the write.

### 11.2 Rendering

Rendering a markdown-document MUST produce HTML by way of a pandoc-compatible toolchain that recognizes the citation syntax (§7) and resolves `@citekey` markers against the `references` frontmatter. The rendered HTML MAY emit Open Graph meta tags per §5.6.

## 12. Schema validation

Implementations MUST validate the frontmatter against the JSON Schema 2020-12 schema in §3 @jsonschema202012. The reference validator is Ajv with `ajv-formats`.

Implementations MUST validate every entry in `references` against the CSL JSON schema @csljson. Type-conditional fields per §6.4 MUST be enforced by the validator (a CSL-JSON validator implementing the conditional constraints, OR a project-local JSON Schema overlay).

Implementations MUST cross-check the in-body `@citekey` markers against the `references` array. The reference cross-checker is `pandoc --citeproc --metadata link-citations=true --to=html` invoked with the file; pandoc's error output enumerates unresolved citekeys.

Implementations MUST validate every `references[*].id` against the citekey pattern in §6.5 and MUST validate the array sort order per §6.6.

Implementations producing HTML output MAY emit Open Graph meta tags per §5.6.

## 13. Conformance (A.4)

### 13.1 Conformance matrix

| ID  | Statement                                                                  | Actor       | Level    | Test                                       |
|-----|----------------------------------------------------------------------------|-------------|----------|--------------------------------------------|
| M1  | File extension is `.md`; UTF-8; LF; NFC.                                   | producer    | MUST     | `conformance/m1-encoding.test.mjs`         |
| M2  | Frontmatter is delimited by `---` lines per §2.2.                          | producer    | MUST     | `conformance/m2-delimiters.test.mjs`       |
| M3  | Frontmatter validates against the §3 JSON Schema.                          | producer    | MUST     | `conformance/m3-frontmatter.test.mjs`      |
| M4  | `name` is human-readable, not kebab-case.                                  | producer    | MUST     | `conformance/m4-name.test.mjs`             |
| M5  | `description` is plain text, 50–300 chars.          | producer    | MUST     | `conformance/m5-description.test.mjs`      |
| M6  | `references` present iff body cites; each entry CSL JSON–valid.            | producer    | MUST     | `conformance/m6-references.test.mjs`       |
| M7  | Citekeys match `^[a-z][a-z0-9]*[0-9]{4}[a-z]?$`.                           | producer    | MUST     | `conformance/m7-citekeys.test.mjs`         |
| M8  | `references` sorted by `id` ASCII order; citekeys unique in file.          | producer    | MUST     | `conformance/m8-sort-unique.test.mjs`      |
| M9  | Naked URLs forbidden (URL implies accessed).                               | producer    | MUST     | `conformance/m9-no-naked-urls.test.mjs`    |
| M10 | Every `@citekey` marker resolves to a `references` entry.                | producer    | MUST     | `conformance/m10-resolution.test.mjs`      |
| M11 | Body conventions per §8 observed.                                          | producer    | MUST     | `conformance/m11-body.test.mjs`            |
| M12 | `CANON(file)` per §9 produces deterministic bytes.                         | producer    | MUST     | `conformance/m12-canon.test.mjs`           |
| M13 | Rendered HTML emits Open Graph meta tags per §5.6.                         | producer    | MAY      | `conformance/m13-ogp.test.mjs`             |
| M14 | Inline HTML restricted to the GFM allowlist (§8.6).                        | producer    | MUST     | `conformance/m14-html.test.mjs`            |
| M15 | Unused `references` entries trigger a SHOULD-level warning.                | validator   | SHOULD   | `conformance/m15-unused.test.mjs`          |
| M16 | Every citation marker appears within the sentence carrying the supported claim, not hoisted to paragraph/section/document end. | producer    | MUST     | `conformance/m16-inline-placement.test.mjs` |
| M17 | Body contains no `## References` (or equivalent) section; the bibliography is renderer output. | producer    | MUST     | `conformance/m17-no-refs-section.test.mjs` |
| M18 | Every citation marker is bare `@citekey`; bracketed forms (`[@key]`, `[@k1; @k2]`, `[@k, p. 12]`, `[-@k]`, `[@k {.nocite}]`) are forbidden. | producer    | MUST     | `conformance/m18-bare-only.test.mjs` |

### 13.2 Conformance suite

Implementations MUST publish their conformance-profile document declaring `spec-id: markdown-document`, the `version` they target, and which M1–M15 IDs they implement. The executable conformance suite lives at `docs/dev/conformance/`.

## 14. Determinism (A.7)

All observable outputs of conforming validators and renderers MUST be bit-for-bit identical given the same canonical input file. Specifically:

- `CANON(file)` MUST produce the same bytes across implementations (§9).
- The list of unresolved citekeys reported by validation MUST be the same multiset across implementations (§7.2, §13.1 M10).
- The rendered HTML emitted by the reference pandoc citeproc invocation MUST be byte-identical when run with the same pandoc version and template (§11.2).

Implementations MUST NOT introduce non-determinism via wall-clock timestamps, randomness, or iteration ordering. Citekey ordering in rendered bibliographies MUST be by CSL style; the reference CSL style for SPOTCOMP is `chicago-author-date`.

## 15. Upgrade path (A.5)

When a new MAJOR version of this specification is published, existing markdown-documents MUST continue to be loadable by validators implementing the previous MAJOR for at least one full MAJOR cycle. The frontmatter `additionalProperties: true` setting (§3) permits forward-compatible additions to the frontmatter schema; new required fields trigger a MAJOR bump. New OGraph companion keys (e.g., `og-video`) MAY be added in a MINOR version.

Migration tools MUST be idempotent on already-conformant files: running the migration twice MUST produce the same output as running it once.

## 16. Security and privacy (A.6)

### 16.1 Attacker models

Two attacker models are in scope:

- **Malicious author.** An author who embeds raw HTML, JavaScript, or arbitrary URI schemes in the body in an attempt to exploit the renderer. Mitigation: §8.6 restricts inline HTML to the GFM allowlist; the renderer MUST sanitize raw HTML per GFM @gfm2019.
- **Citation poisoning.** An author who publishes a markdown-document referencing a citekey whose `references` entry's `URL` points to attacker-controlled content. Mitigation: `accessed` date in CSL entries (§6.8) provides a time-stamped record; a downstream auditor can detect content drift.

### 16.2 Trust boundaries

The trust boundary is the validator. Every `.md` file ingested by the validator MUST be parsed under the §3 schema and the §8 body conventions before any rendering or further processing. Rendered HTML output is unsanitized by this specification's terms; downstream consumers wishing to embed rendered output in an authenticated context MUST apply their own sanitization.

### 16.3 Privacy

This specification does NOT define privacy obligations on markdown-document contents. Implementations whose documents include personal data are subject to the same considerations as the TRC specification §16.4: retraction is the per-thing append-only discipline, which interacts with right-to-erasure requirements.

## 17. Registries (A.8)

This specification defines two extension points and one registry each.

### 17.1 OGraph companion key registry

Registry: the permitted `og-*` keys in the frontmatter (§5.6). Current entries: `og-title`, `og-type`, `og-url`, `og-image`, `og-locale`. Registration policy: First-Come First-Served (per @bradner1997 terminology) for the `og-*` prefix; new entries SHOULD correspond to a published Open Graph property @ogp2014. Collision handling: new entries MUST NOT shadow an Open Graph property of a different shape. Permanence: registered entries MUST NOT be removed.

### 17.2 Citation locator vocabulary registry

Registry: the locator vocabulary used in surrounding prose adjacent to bare `@citekey` markers (§7.4). Source of truth: the CSL 1.0.2 locator vocabulary @csl102. Registration policy: by reference to the CSL upstream — this specification does NOT add or remove locators. Collision handling: handled by CSL upstream. Note: SPOTCOMP does not use pandoc's bracketed locator syntax (`[@key, p. 12]`) per §7.1; the same locator vocabulary is expressed in adjacent prose instead.

## 18. Formal artifacts (A.9)

### 18.1 Machine-readable schemas

The frontmatter JSON Schema (§3) is published as `docs/dev/markdown-document-frontmatter.schema.json`. The schema MUST be a JSON Schema 2020-12 document @jsonschema202012.

### 18.2 Reference implementation

A reference validator script lives at `docs/dev/conformance/validate.mjs`. The script MUST be an ESM module invokable as `node validate.mjs <file.md>` that emits the conformance result (pass/fail with M-IDs) on stdout.

### 18.3 TCK hooks

- `tck-validate <file.md>` — validate frontmatter, references, citation cross-check, citekey pattern, sort order; exit 0 on pass.
- `tck-canon <file.md>` — emit `CANON(file)` on stdout.
- `tck-render <file.md>` — emit rendered HTML with Open Graph meta tags; exit non-zero if pandoc reports unresolved citekeys.

### 18.4 Pseudocode

Validation in pseudocode:

```
function validate(path):
  bytes = read_file(path)
  assert utf8(bytes) and nfc(bytes)                         # §2.1
  frontmatter_raw, body = split_frontmatter(bytes)          # §2.2
  frontmatter = yaml_parse(frontmatter_raw)                 # §2.2
  validate_schema(frontmatter, FRONTMATTER_SCHEMA)          # §3
  for ref in frontmatter.references or []:
    validate_schema(ref, CSL_DATA_SCHEMA)                   # §6.2
    assert ref.id matches CITEKEY_PATTERN                   # §6.5
  assert references sorted by id and uniquely keyed         # §6.6, §6.7
  ast = commonmark_parse(body, extensions=GFM)              # §2.3, §8
  for marker in ast.citations:                              # §7
    assert marker.citekey in frontmatter.references[].id    # §7.2
  return PASS or FAIL with M-IDs
```

## 19. Document hygiene (A.10)

Every MUST / MUST NOT / SHOULD / MAY claim in this specification is normative. Most MUSTs are mapped to a conformance ID in §13.1 (M1–M15).

The §10 worked example in this specification is informative (illustrative); the conformance fixtures at `docs/dev/conformance/` are normative.

This specification includes a glossary (§22), a non-normative rationale (§23), and a relationship-to-other-specs section (§24) per scaffold item A.10.

## 20. Worked example (informative)

The smallest conformant markdown-document is given below. It cites one work, declares one corresponding `references` entry, and supplies the two required frontmatter fields.

````markdown
---
name: "On Multi-Presentation Under Yoneda"
description: "A short note arguing that multi-presentation of one identity is licensed, not forbidden, by the Yoneda embedding applied to the POSIX path category."
references:
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

# On Multi-Presentation Under Yoneda

The Yoneda lemma @yoneda1954 identifies an object with its hom-functor up to canonical isomorphism. Two paths whose hom-functors are isomorphic therefore present one identity, not two distinct objects.
````

## 21. Implementations

### 21.1 SPOTCOMP markdown files

Every prose file in the SPOTCOMP TRC at `*.md` is governed by this specification — including this specification itself, the TRC specification at `typed-resource-catalog/docs/dev/specification.md`, the specification-of-specifications, and every `docs/dev/journal/<YYYY-MM-DD>.md` file. Pre-existing journal files MAY lack `references` frontmatter and `@citekey` markers; this is permitted under the migration window in §15 but SHOULD be brought into conformance over time.

### 21.2 Cross-publication to HTML

The reference rendering target is HTML via pandoc citeproc. The frontmatter `og-*` fields populate HTML `<head>` meta tags per §5.6.

## 22. Glossary

- **Markdown-document** — a UTF-8 `.md` file in the SPOTCOMP TRC, beginning with a YAML 1.2 frontmatter block and followed by a CommonMark+GFM body (§1).
- **Frontmatter** — the YAML 1.2 block at the top of the file, delimited by `---` lines (§2.2).
- **Body** — the markdown content after the frontmatter's closing `---` (§2.3).
- **`name`** — human-readable title in the frontmatter; MUST NOT be kebab-case (§4).
- **`description`** — Open Graph–conformant one-to-two-sentence summary; plain text; 50–300 chars (§5).
- **`references`** — CSL JSON–valid array of bibliographic entries in the frontmatter, sorted by `id` (§6).
- **Citekey** — the `id` field of a `references` entry; pattern `^[a-z][a-z0-9]*[0-9]{4}[a-z]?$` (§6.5).
- **`@citekey` marker** — a pandoc citation in the body that resolves against `references` (§7).
- **Open Graph–conformant** — meeting the requirements of the Open Graph protocol @ogp2014 for `og:description` and the companion `og:*` fields (§5).
- **CANON(file)** — the canonical byte form defined in §9.
- **Resolution** — the binding of a `@citekey` marker to a `references[*].id` (§7.2).

## 23. Open questions

- Whether the canonicalization key-order in §9.4 should defer to a future SPOTCOMP-wide frontmatter ordering specification, or remain locally defined here. Resolution blocked by: whether such a shared spec is published.
- Whether the SHOULD-level "unused references warning" of §13.1 M15 escalates to MUST when the document is a specification (per the spec-of-specs §6.4). Resolution blocked by: a spec-of-specs revision pinning this behavior.

## 24. Rationale (non-normative)

The split between human-readable `name` and kebab-case path is forced by the Yoneda discipline on the path category: the path IS the identity; the `name` is a display projection. Conflating the two (e.g., requiring `name` to equal the path's terminal segment) would force every display title to lose case and punctuation, which makes social-card previews and search snippets poor.

The Open Graph conformance requirement on `description` is forced by the practical use of these files: AI agents, web crawlers, and human readers all consume the `description` in isolation from the body. A `description` that requires the body to be intelligible is failing its job.

The pandoc-citeproc `@citekey` discipline is a standardized practice with mature tooling (pandoc, citeproc-js, CSL); reinventing it would cost integration with the broader scholarly ecosystem.

The references-in-frontmatter rather than separate `.bib` file is forced by self-containment: a markdown-document received in isolation MUST be fully bibliographic without consulting an external file. The cost is per-file bibliographic redundancy when multiple files cite the same work; this is the right trade-off for a federated catalog whose files travel independently.

The "no naked URLs" rule (§6.8) and "no class field" analog reflects the substrate's append-only discipline: stable bibliographic records are required because the file commits to its citations at write-time and federation makes those citations immutable.

## 25. Relationship to other specs

- **Requires**: [`specification`](../../specification/docs/dev/specification.md) — this specification IS a specification and follows the A.1–A.10 scaffold.
- **Required by**: [`typed-resource-catalog`](../../../../../docs/dev/specification.md) — every TRC documentation file is a markdown-document.
- **Required by**: [`specification`](../../specification/docs/dev/specification.md) — every spec is a markdown-document (the spec-of-specs requires this spec as one of its requires-edges).
- **Mutual dependency note**: this specification and the spec-of-specs are mutually dependent. Bootstrap: the spec-of-specs §3 (filename rule) and §4 (frontmatter inheritance from this spec) define the substrate; this spec's §1 (what a markdown-document IS) defines the carrier. Neither is logically prior to the other; both are pinned at the same MAJOR version simultaneously.

## 26. Conformance summary

A markdown-document is conformant iff all of the following hold (each linked to its conformance-matrix row in §13.1):

- §2.1, §2.2, §2.3 → M1, M2: `.md`, UTF-8, LF, NFC; `---` delimiters; CommonMark+GFM body.
- §3 → M3: Frontmatter validates against the JSON Schema in §3.
- §4 → M4: `name` is human-readable, not kebab-case.
- §5 → M5: `description` is plain text, 50–300 chars.
- §6 → M6, M7, M8, M9: `references` present iff cited; CSL JSON–valid; citekey pattern; sorted; no naked URLs.
- §7 → M10, M16, M17, M18: In-body citations resolve; citations are placed inside their supporting sentences; body contains no `## References` section; every citation is the bare `@citekey` form (no bracketed forms).
- §8 → M11, M14: Body conventions observed; inline HTML on the GFM allowlist.
- §9 → M12: `CANON(file)` is deterministic.
- §11 → §13.2: Atomic write; rendering via pandoc citeproc.
- §13 → §13.2: Conformance-profile published.
- §14: Determinism per §14.
- §15: Upgrade path per §15.
- §16: Security and privacy considerations addressed.
- §17: Registries declared.
- §18: Formal artifacts published.

