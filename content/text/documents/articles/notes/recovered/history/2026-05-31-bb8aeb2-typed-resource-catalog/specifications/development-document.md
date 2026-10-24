---
name: "Development document — Specification"
description: "Specification for the development-document kind in SPOTCOMP: an optional markdown-document at $thing/docs/dev/$thing-slug.md carrying a normative ## Key Terms section drawn from the thing's neighborhood in the TRC."
spec-id: development-document
version: 0.1.0
release-date: 2026-05-25
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
  - id: maclane1971
    type: book
    author:
      - family: "Mac Lane"
        given: Saunders
    title: "Categories for the Working Mathematician"
    publisher: "Springer-Verlag"
    publisher-place: "New York"
    issued:
      date-parts:
        - [1971]
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

# Development document — Specification

A **development document** in SPOTCOMP is an optional markdown-document at the path `<thing>/docs/dev/<thing-slug>.md` that carries the human-readable development-stage prose for one typed resource of the TRC. This specification pins what the file is, where it lives, when it MAY be present, and what one normative structural section it MUST carry.

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are used per RFC 2119 [@bradner1997] as updated by RFC 8174 [@leiba2017].

## 0. Scope

This specification applies to every markdown-document in the TRC whose path matches `<thing-directory>/docs/dev/<thing-slug>.md`, where `<thing-slug>` is the basename of `<thing-directory>`.

This specification does NOT apply to:

- `<thing>/docs/<thing-slug>.md` — the thing's settled prose, governed elsewhere;
- `<thing>/docs/dev/journal/<YYYY-MM-DD>.md` — dev-journal entries (historical narrative, one per date);
- `<thing>/docs/dev/specification.md` — the thing's specification, governed by the `specification` spec;
- positing-log files (`<thing-slug>.jsonl`) which are substrate, not documentation.

## 1. What a development document is

A development document is the in-flight, working-prose companion to a typed resource. It states what the thing IS in human-readable form, oriented to a reader who is building or extending the thing — distinct from the thing's settled prose (which addresses a reader using the thing in its current shape) and from the thing's specification (which states normative conformance requirements).

A development document is **descriptive** and **synthesizing**: it draws together the typed children, sibling things, and morphisms in the resource's TRC neighborhood and explains how they hang together. Its central work is to expose the resource's vocabulary in one place so that a reader has the terms necessary to read the resource's schemas, scripts, and downstream prose.

Given: by Yoneda applied to the POSIX path category 𝒫 [@yoneda1954; @maclane1971, Ch. III §2], a resource's identity is its hom-functor — its ancestor chain together with the schema-`$ref`s resolving to its `$id`. The hom-functor's neighborhood — the resource's `library/` children, the morphisms over the resource, and adjacent sibling things — supplies the vocabulary needed to read the resource. The development document is the prose form of this neighborhood, presenting it in one place for a developer.

## 2. Filename and path

A development document's filename MUST be `<thing-slug>.md`, where `<thing-slug>` is the basename of the parent thing-directory.

A development document MUST live at `<thing-directory>/docs/dev/<thing-slug>.md`.

A thing-directory MUST contain at most one development document. A thing-directory MAY contain zero development documents; the file is OPTIONAL.

## 3. Optional presence

A development document MAY exist for any typed resource in the TRC; no resource is required to have one. A resource SHOULD have a development document when at least one of the following holds:

- the resource's `library/` contains two or more typed children whose names alone do not convey their relationship;
- the resource carries one or more morphisms whose preconditions, postconditions, or invariants are not immediate from the morphism's schema;
- the resource's reader must combine vocabulary drawn from sibling things at `../<other-thing>/` to make sense of it.

A resource MAY omit the development document when its schema, scripts, and settled prose already supply every term a reader needs.

## 4. The Key Terms section

When present, a development document MUST contain a section with the heading `## Key Terms` (ATX form, exact capitalization "Key Terms"). The section MUST appear at the top level of the document, not nested inside another section.

The Key Terms section is **normative**: it states the vocabulary a reader must hold in order to read the rest of the document and the resource's schemas, scripts, and JSONL logs. Its entries MUST define each term in the prose required to read the resource, and MUST cite the source of each term (a schema, a script, a sibling thing, or an external reference).

A Key Terms section MUST NOT consist solely of links or cross-references to other files. Each entry MUST state the term inline — a reader without network access to the linked files MUST still be able to read the document.

The Key Terms section MAY use subsections `### <Term>` (one per term) or a definition-list / bullet-list form, at the author's discretion. Either form is conformant.

## 5. Source of terms

The terms appearing in the Key Terms section MUST be drawn from the resource's TRC neighborhood. The three neighborhood sources are:

### 5.1 `<thing>/library/`

Terms from the resource's own `library/` directory — its proved typed children. These are the resource's first-class sub-objects. A term whose categorical identity sits at `<thing>/library/<child>/` MUST be cited via that path; the entry MUST NOT silently rename the child or collapse it into a related concept.

### 5.2 `<thing>/<morphism>/library/`

Terms from the libraries of morphisms over the resource. A morphism's `library/` holds the typed inhabitants of its source, target, or auxiliary structure. Terms drawn from `<thing>/<morphism>/library/<inhabitant>/` MUST be cited via that path; the entry MUST identify the morphism the term is filed under.

### 5.3 `../<thing>/`

Terms from sibling things at the same depth as the resource. A sibling provides vocabulary the resource depends on without containing. Terms drawn from `../<sibling>/` MUST be cited via that relative path; the entry MUST state why the sibling's vocabulary is required to read the resource.

A development document SHOULD draw terms from whichever of §5.1, §5.2, §5.3 the resource's content requires. A document MAY draw from one source, two, or all three. A document MUST NOT introduce terms that have no source in any of these three locations — every term carried into the Key Terms section MUST originate in the resource's TRC neighborhood. A term needed for the document that has no such origin signals a missing typed resource in the catalog, not a term to be invented in prose.

## 6. Relationship to other sections

A development document MAY contain any number of additional sections after `## Key Terms`. The other sections SHOULD reference terms by their Key-Terms-defined names; a section that introduces unkeyed vocabulary is itself a defect (the vocabulary belongs in Key Terms).

A development document SHOULD NOT duplicate the contents of the resource's specification (`<thing>/docs/dev/specification.md`) or settled prose (`<thing>/docs/<thing-slug>.md`). The development document's role is synthesizing vocabulary; the specification's role is normative conformance; the settled prose's role is the thing's stable description. The three are distinct.

## 7. Frontmatter

A development document MUST satisfy the markdown-document frontmatter discipline (the parent kind's specification at `<spotcomp>/.../document/hacking/library/markdown-document/docs/dev/specification.md`). The minimum frontmatter is the markdown-document required set; no development-document-specific frontmatter keys are introduced by this specification.

## 8. Conformance

A development document is conformant iff all of the following hold:

- §2: Filename matches `<thing-slug>.md`; path matches `<thing>/docs/dev/<thing-slug>.md`; at most one such file per thing-directory.
- §4: When present, the document contains a `## Key Terms` section at the top level with the exact heading "Key Terms".
- §4: Each Key Terms entry defines its term inline and cites the source.
- §5: Every term in Key Terms originates in `<thing>/library/`, `<thing>/<morphism>/library/`, or `../<sibling>/`.
- §6: Sections after Key Terms reference vocabulary introduced in Key Terms; no unkeyed vocabulary is introduced.
- §7: The frontmatter satisfies the markdown-document required key set.

A markdown-document at `<thing>/docs/dev/<thing-slug>.md` that omits the Key Terms section is NOT a conforming development document and MUST either be revised to add the section or be moved to a non-development-document location.

## 9. Glossary

- **Development document** — the OPTIONAL markdown-document at `<thing>/docs/dev/<thing-slug>.md` for a typed resource. (§1)
- **Key Terms section** — the normative top-level section with heading "Key Terms" required when a development document is present. (§4)
- **TRC neighborhood** — the resource's `library/` children, the morphisms filed over the resource, and the sibling things at `../`. The vocabulary source for Key Terms. (§5)
- **Thing-slug** — the kebab-case basename of the thing-directory; the filename's stem. (§2)

