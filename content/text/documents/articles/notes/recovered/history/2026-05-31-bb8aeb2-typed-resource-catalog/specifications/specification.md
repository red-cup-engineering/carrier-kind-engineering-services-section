---
name: "Specification — Specification"
description: "The specification for specifications in SPOTCOMP: what a spec is, the format/convention categories, the required document structure and frontmatter, the RFC 2119/8174 normative-keyword discipline, the A.1–A.10 normative scaffold, versioning and lifecycle, the spec DAG, and conformance."
spec-id: specification
version: 0.1.0
release-date: 2026-05-25
stability: draft
status: draft
category: convention
requires:
  - markdown-document
references:
  - id: belnap1977
    type: chapter
    author:
      - family: Belnap
        given: "Nuel D."
    title: "A Useful Four-Valued Logic"
    container-title: "Modern Uses of Multiple-Valued Logic"
    editor:
      - family: Dunn
        given: "J. Michael"
      - family: Epstein
        given: George
    publisher: "D. Reidel"
    publisher-place: "Dordrecht"
    page: "5-37"
    issued:
      date-parts:
        - [1977]
  - id: bradner1996
    type: standard
    author:
      - family: Bradner
        given: Scott
    title: "The Internet Standards Process — Revision 3"
    publisher: "IETF"
    number: "RFC 2026"
    issued:
      date-parts:
        - [1996, 10]
    URL: "https://www.rfc-editor.org/rfc/rfc2026"
    accessed:
      date-parts:
        - [2026, 5, 25]
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
  - id: curry1934
    type: article-journal
    author:
      - family: Curry
        given: "Haskell B."
    title: "Functionality in Combinatory Logic"
    container-title: "Proceedings of the National Academy of Sciences"
    volume: 20
    page: "584-590"
    issued:
      date-parts:
        - [1934]
  - id: flanaganginoza2014
    type: standard
    author:
      - family: Flanagan
        given: Heather
      - family: Ginoza
        given: Sandy
    title: "RFC Style Guide"
    publisher: "IETF / RFC Editor"
    number: "RFC 7322"
    issued:
      date-parts:
        - [2014, 9]
    URL: "https://www.rfc-editor.org/rfc/rfc7322"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: hoffman2016
    type: standard
    author:
      - family: Hoffman
        given: Paul
    title: "The \"xml2rfc\" Version 3 Vocabulary"
    publisher: "IETF"
    number: "RFC 7991"
    issued:
      date-parts:
        - [2016, 12]
    URL: "https://www.rfc-editor.org/rfc/rfc7991"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: howard1980
    type: chapter
    author:
      - family: Howard
        given: "William A."
    title: "The Formulae-as-Types Notion of Construction"
    container-title: "To H. B. Curry: Essays on Combinatory Logic, Lambda Calculus and Formalism"
    editor:
      - family: Seldin
        given: "J. P."
      - family: Hindley
        given: "J. R."
    publisher: "Academic Press"
    page: "479-490"
    issued:
      date-parts:
        - [1980]
  - id: ieee8301998
    type: standard
    author:
      - literal: "IEEE Computer Society"
    title: "IEEE Recommended Practice for Software Requirements Specifications, IEEE Std 830-1998"
    publisher: "IEEE"
    issued:
      date-parts:
        - [1998, 10, 20]
    URL: "https://standards.ieee.org/ieee/830/1197/"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: isoiec2021
    type: standard
    author:
      - literal: "ISO/IEC"
    title: "ISO/IEC Directives, Part 2: Principles and Rules for the Structure and Drafting of ISO and IEC Documents, Ninth Edition"
    publisher: "International Organization for Standardization"
    issued:
      date-parts:
        - [2021, 5]
    URL: "https://www.iso.org/sites/directives/current/part2/index.xhtml"
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
  - id: lambek1986
    type: book
    author:
      - family: Lambek
        given: Joachim
      - family: Scott
        given: "Philip J."
    title: "Introduction to Higher-Order Categorical Logic"
    publisher: "Cambridge University Press"
    publisher-place: "Cambridge"
    issued:
      date-parts:
        - [1986]
  - id: leiba2017
    type: standard
    author:
      - family: Leiba
        given: Barry
    title: "Ambiguist of Uppercase vs Lowercase in RFC 2119 Key Words"
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
  - id: nist1802015
    type: standard
    author:
      - literal: "National Institute of Standards and Technology"
    title: "Secure Hash Standard (SHS), FIPS PUB 180-4"
    publisher: "U.S. Department of Commerce"
    issued:
      date-parts:
        - [2015, 8]
    URL: "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: preneel2009
    type: webpage
    author:
      - family: Preston-Werner
        given: Tom
    title: "Semantic Versioning 2.0.0"
    publisher: "semver.org"
    issued:
      date-parts:
        - [2013, 6, 18]
    URL: "https://semver.org/spec/v2.0.0.html"
    accessed:
      date-parts:
        - [2026, 5, 25]
  - id: tarski1955
    type: article-journal
    author:
      - family: Tarski
        given: Alfred
    title: "A Lattice-Theoretical Fixpoint Theorem and Its Applications"
    container-title: "Pacific Journal of Mathematics"
    volume: 5
    page: "285-309"
    issued:
      date-parts:
        - [1955]
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

# Specification — Specification

A **specification** in SPOTCOMP is a typed document that pins the conformance requirements of one named thing — a wire format, a substrate convention, an algorithmic procedure, a categorical object, or a tooling contract — by stating what is required, what is forbidden, and what is open. This document is the specification for specifications: it fixes the structure, frontmatter, normative-keyword discipline, versioning and lifecycle, scaffold, and conformance apparatus that every SPOTCOMP specification MUST satisfy.

This document is itself a specification and is self-conformant: its frontmatter declares its `spec-id`, `version`, `stability`, `status`, and `category`; its body follows the structure required by §5; its normative claims use the keywords specified in §6 per RFC 2119 [@bradner1997] as updated by RFC 8174 [@leiba2017]; its scaffold sections cover A.1–A.10 per §8.

The discipline draws directly on the IETF Internet Standards Process [@bradner1996] and the RFC Style Guide [@flanaganginoza2014] for the normative-document tradition; on ISO/IEC Directives Part 2 [@isoiec2021] and IEEE Std 830-1998 [@ieee8301998] for cross-tradition structural conventions; and on the Curry–Howard–Lambek correspondence [@curry1934; @howard1980; @lambek1986] for the type-as-proposition reading under which a specification IS a proposition and a conforming implementation IS its proof.

## 0. Scope

This specification applies to every typed resource in the SPOTCOMP Typed Resource Catalog whose role-class is `specification`. Concretely it applies to:

- every markdown-document at any path `<thing>/docs/dev/specification.md`;
- every markdown-document elsewhere in the catalog whose frontmatter declares `spec-id`;
- every machine-readable companion artifact (`<spec-id>.schema.json`, conformance test vectors, golden fixtures) co-located with such a markdown-document.

This specification does NOT apply to:

- prose at `<thing>/docs/<thing>.md` (descriptive notes, not normative);
- dev-journal entries at `<thing>/docs/dev/journal/<YYYY-MM-DD>.md` (historical narrative, not normative);
- typed object schemas (`<thing>.schema.json`) considered as JSON Schema type declarations rather than as published specifications;
- positing-log files (`<thing>.jsonl`) which are substrate, not specification.

## 1. What a specification is

A specification states what is required, what is forbidden, and what is open about one named thing. It answers the question: *what must an implementation do to be considered conforming?*

A specification is **normative**. Its claims are binding on every conforming implementation. A reader unable to determine, from the specification alone, whether a candidate implementation is conformant has been given an incomplete specification. The hardest work of a specification is completeness: accounting for every observable case the implementation may encounter, including the edge cases the author has not yet thought of.

A specification is distinguished from three sibling document kinds, each addressing a different reader question:

| Document kind  | Reader's question        | Voice      |
|----------------|--------------------------|------------|
| Description    | What is X?               | declarative |
| Tutorial       | How do I use X?          | imperative-teaching |
| Argument       | Why is X better than Y?  | rhetorical |
| **Specification** | **What must X do to be conforming?** | **normative** |

A specification MUST NOT invent claims that are not settled. Unsettled claims belong in §22 *Open questions*, not in the normative body. A specification MUST NOT explain *why* a requirement holds in its normative sections — rationale belongs in a non-normative annex (§24) — but a specification MAY (and SHOULD, for non-obvious requirements) cite the source result that establishes the requirement inline.

By the Curry–Howard–Lambek correspondence [@curry1934; @howard1980; @lambek1986]: a specification is a type; a conforming implementation is a term of that type; passing the conformance suite (§12) is type-checking the term against the type. The specification IS the proposition the implementation proves.

## 2. Categories

Every specification MUST declare a `category` in its frontmatter. Two categories are defined:

### 2.1 Format specification

A **format specification** governs a wire format, a serialization, an on-disk encoding, or any artifact whose bytes cross implementation boundaries. Format specifications carry the full A.1–A.10 normative scaffold (§8). Format specifications MUST include §9 *Canonicalization*, §13 *Determinism*, and §17 *Formal artifacts*.

Examples: the EAVT row format; a federation envelope format; a content-address derivation; a JSON Schema vocabulary; a cipher suite.

### 2.2 Convention specification

A **convention specification** governs a practice, a directory layout, a naming discipline, a development workflow, or a documentation pattern. Convention specifications carry the A.1–A.10 scaffold with §9, §13, and §17 MAY be omitted if not applicable (per the scaffold-script convention).

Examples: the markdown-document specification; the slug-and-gerund naming discipline; the spec-DAG `requires`/`supersedes` discipline; this specification itself.

### 2.3 Choosing a category

A specification governing bytes that cross implementation boundaries is a format specification. A specification governing only authoring or organizational practice is a convention specification. When in doubt, treat the artifact as a format and write the full scaffold; over-specification is recoverable, under-specification is not.

## 3. Filename and path

A specification's filename MUST be `specification.md`. A specification lives at `<thing>/docs/dev/specification.md` under its thing-directory in the TRC. The thing-slug — the kebab-case segment that is the name of the parent directory — names the entity kind the specification pins. The filename and the path do the identification work; the frontmatter MUST NOT repeat the thing-slug as a separate identity-field. This follows by Yoneda's path-as-identity discipline [@yoneda1954; @maclane1971]: the spec's identity is the spec's path; a frontmatter `name`-or-id field repeating the path-slug would be a redundant labeling that risks divergence from identity.

A directory MAY contain at most one `specification.md` at `docs/dev/`. A directory MAY additionally contain a companion machine-readable schema at `docs/dev/<spec-id>.schema.json` and conformance fixtures at `docs/dev/conformance/`.

## 4. Frontmatter

The frontmatter MUST be a YAML block conforming to the markdown-document frontmatter discipline (the parent kind at `markdown-document/docs/dev/specification.md` in this catalog) PLUS the specification-only keys listed below. Every key listed under 4.1 MUST be present; every key under 4.2 MAY be present with the indicated meaning.

### 4.1 Required keys

| Key            | Type    | Notes                                                    |
|----------------|---------|----------------------------------------------------------|
| `name`         | string  | Human-readable title; MUST NOT be kebab-case; MUST follow the markdown-document `name` discipline. |
| `description`  | string  | Plain-text one- or two-sentence summary; 50–300 chars; third-person. |
| `spec-id`      | string  | Kebab-case slug matching `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`. Identifies the thing pinned. SHOULD equal the parent directory's basename. |
| `version`      | string  | Semantic version `MAJOR.MINOR.PATCH` per Semantic Versioning 2.0.0 [@preneel2009]. See §7. |
| `release-date` | string  | ISO 8601 date (`YYYY-MM-DD`) of the current version's publication. |
| `stability`    | enum    | One of `experimental`, `draft`, `candidate`, `stable`, `deprecated`. See §7.2. |
| `status`       | enum    | One of `draft`, `active`, `superseded`. See §7.3. |
| `category`     | enum    | One of `format`, `convention`. See §2. |
| `references`   | array   | CSL-JSON entries used by `[@citekey]` markers in the body. MUST be sorted by `id`. |

### 4.2 Optional keys

| Key                  | Type                | Notes                                                |
|----------------------|---------------------|------------------------------------------------------|
| `requires`           | string or [string]  | Spec-id(s) that MUST hold for this spec to be enforceable. See §17. |
| `supersedes`         | string or [string]  | Spec-id(s) this spec replaces.                       |
| `superseded-by`      | string              | Spec-id replacing this spec; REQUIRED when `status: superseded`. |
| `topic`              | string              | Domain area: `runtime`, `substrate`, `governance`, etc. |
| `applies-to-runtimes`| string or [string]  | When runtime-specific; omit for universal specs.    |
| `ordering`           | integer or string   | Precedence when multiple specs govern the same topic; lower fires first. |

### 4.3 Frontmatter JSON Schema

```yaml
type: object
required: [name, description]
additionalProperties: true
properties:
  name: { type: string, minLength: 1 }
  description: { type: string, minLength: 50, maxLength: 300 }
  spec-id: { type: string, pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" }
  version: { type: string, pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$" }
  release-date: { type: string, format: date }
  stability: { enum: [experimental, draft, candidate, stable, deprecated] }
  status: { enum: [draft, active, superseded] }
  category: { enum: [format, convention] }
  references: { type: array, items: { $ref: "csl-data.json#" } }
  requires: { oneOf: [{type: string}, {type: array, items: {type: string}}] }
  supersedes: { oneOf: [{type: string}, {type: array, items: {type: string}}] }
  superseded-by: { type: string }
  topic: { type: string }
  applies-to-runtimes: { oneOf: [{type: string}, {type: array, items: {type: string}}] }
  ordering: { type: [integer, string] }
allOf:
  - if: { properties: { status: { const: superseded } }, required: [status] }
    then: { required: [superseded-by] }
```

Implementations MUST validate the frontmatter against this schema using JSON Schema 2020-12 [@jsonschema202012] at every publish.

## 5. Document structure

Every specification MUST be structured as the section sequence below. Section headings use ATX form per the markdown-document discipline. Section numbers MAY be omitted on simple convention specifications BUT MUST be present on format specifications and on every specification with more than seven topic sections.

### 5.1 Required sections, in order

| #   | Heading                                       | Required for | Purpose |
|-----|-----------------------------------------------|--------------|---------|
| —   | Opening paragraph (no heading)                | all          | One paragraph: what this spec defines and why it exists. |
| 0   | Scope                                         | all          | What this spec applies to; what it does NOT apply to.   |
| 1   | What `<spec-id>` is                           | all          | Core concept in 2–4 paragraphs.                         |
| 2…  | Topic sections                                | all          | Normative content; one section per coherent aspect.     |
| §A.2 | Canonicalization                             | format       | `CANON(x) → bytes`; field ordering; encoding; testable. |
| §A.3 | Error semantics                              | all          | Stable error schema; error classes per algorithm step.  |
| §A.4 | Conformance                                  | all          | Conformance matrix + executable suite reference.        |
| §A.5 | Upgrade path                                 | all          | Capability negotiation, deprecation windows, migration. |
| §A.6 | Security and privacy                         | all          | Attacker models, trust boundaries, mitigations.         |
| §A.7 | Determinism                                  | format       | Bit-for-bit identical output across implementations.    |
| §A.8 | Registries                                   | when extension points exist | Registration policy, collision, permanence.          |
| §A.9 | Formal artifacts                             | format       | Machine-readable schemas; TCK hooks; pseudo-code.       |
| §A.10 | Document hygiene                            | all          | Normative-keyword discipline; example marking.          |
| —   | Implementations                               | when applicable | One subsection per named implementation.           |
| —   | Open questions                                | when applicable | Claims pending a named blocking dependency.        |
| —   | Glossary                                      | all          | Every normative term defined once.                      |
| —   | Rationale (non-normative)                     | SHOULD       | Why these rules; what practice this codifies.           |
| —   | Relationship to other specs                   | all          | `requires`/`supersedes`/`extends` summarised.           |
| —   | Conformance summary                           | all          | MUST/SHOULD/MAY rollup as a checklist.                  |

A specification body MUST NOT contain a `## References` section (or any case/heading-level variant). The bibliography is renderer output produced by pandoc citeproc from the `references` frontmatter and the inline `[@citekey]` markers, per the markdown-document specification's §7.7.

### 5.2 Normative claims appear in context

Normative claims MUST appear in the topic section to which they belong. A flat "list of MUSTs" at the end of the document MUST NOT replace inline normative claims. A reader looking for everything about one aspect of the thing MUST find it in one place. The conformance summary (§26) restates inline claims for checklist use; it MUST NOT introduce new claims.

### 5.3 Implementations subsection

When a specification governs an abstract concept that has multiple concrete implementations, the `## Implementations` section MUST contain one subsection per named implementation context. Each subsection states what the concept maps to in that context and any implementation-specific constraints. Conceptual constraints MUST stay in the topic sections; implementation-specific deviations MUST stay in the implementation subsections.

### 5.4 Open questions

The `## Open questions` section enumerates claims that would be MUST or MUST NOT once a specific dependency resolves. Every item MUST name the blocking dependency. An open-questions item is NOT a normative claim and MUST NOT be cited as one elsewhere in the document. A specification with an empty `## Open questions` section MAY omit the heading.

## 6. Normative language

### 6.1 RFC 2119 keywords

Normative requirements MUST be expressed using the keywords defined in RFC 2119 [@bradner1997] as updated by RFC 8174 [@leiba2017]:

| Keyword         | Meaning                                                                                |
|-----------------|----------------------------------------------------------------------------------------|
| MUST / MUST NOT | Absolute requirement or prohibition; deviation is non-conformant.                      |
| SHOULD / SHOULD NOT | Strong recommendation; deviation requires justification at conformance time.       |
| MAY             | Truly optional; permitted but not required.                                            |
| REQUIRED, SHALL | Synonyms of MUST; SHOULD NOT be used (consistency: pick MUST and stay with MUST).     |
| RECOMMENDED     | Synonym of SHOULD; SHOULD NOT be used.                                                 |
| OPTIONAL        | Synonym of MAY; SHOULD NOT be used.                                                    |

Specifications SHOULD include the RFC 8174 boilerplate near the opening: *"The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are used per RFC 2119 as updated by RFC 8174."*

### 6.2 Keywords appear only in normative sections

The keywords above MUST appear in ALL CAPS only when carrying normative force. The same words in lowercase carry no normative force (per RFC 8174 [@leiba2017]). A specification MUST NOT use these keywords in lowercase to express normative claims.

### 6.3 Every MUST/MUST NOT is grounded

Every MUST / MUST NOT claim MUST be traceable to one of: (i) a cited mathematical result, (ii) a cited external standard, (iii) a definition in this specification's glossary, or (iv) a derivation in this specification's body that itself meets (i)–(iii). For mathematical-object specifications, the citation SHOULD be stated inline at the site of the claim.

### 6.4 Ambiguities are errors

Per the IETF principle [@flanaganginoza2014] and the spec-spec scaffold A.3: an ambiguity in the specification is itself a defect. "Unspecified behavior" MUST NOT appear as a deliberate design choice. If a behavior is genuinely under-determined, the specification MUST either declare the behavior IMPLEMENTATION-DEFINED (and require implementations to document the choice) or place it in §22 *Open questions*.

## 7. Versioning, stability, and lifecycle

### 7.1 Versioning (A.1)

Every specification MUST declare a `version` matching Semantic Versioning 2.0.0 [@preneel2009] (`MAJOR.MINOR.PATCH`, with optional pre-release and build metadata):

- **MAJOR**: backwards-incompatible changes to normative claims.
- **MINOR**: backwards-compatible additions of normative claims.
- **PATCH**: editorial fixes and clarifications that do NOT change normative meaning.

Implementations MUST be able to declare which MAJOR version they conform to. Implementations MAY pin to a specific MINOR for forward-compatibility purposes. Wire formats and observable behavior bound to a MAJOR version MUST remain stable within that MAJOR series.

### 7.2 Stability

Every specification MUST declare a `stability` from this five-element scale, drawn from the Internet Standards Process maturity ladder [@bradner1996] and adapted for in-corpus use:

| `stability`     | Meaning                                                                  |
|-----------------|--------------------------------------------------------------------------|
| `experimental`  | Sketch; may change without notice; implementations are exploratory.      |
| `draft`         | Under active revision; breaking changes permitted; implementations are reference. |
| `candidate`     | Implementation-feedback phase; breaking changes require justification.   |
| `stable`        | Frozen; only PATCH and additive MINOR revisions permitted.               |
| `deprecated`    | Implementations SHOULD NOT use; succession is in `superseded-by` or §18. |

### 7.3 Status

Every specification MUST declare a `status` from `{draft, active, superseded}`. `status` is distinct from `stability`: `stability` is the spec's maturity as a contract; `status` is the spec's place in the DAG. A `draft` `status` MAY hold any `stability`; an `active` `status` MUST hold `candidate` or `stable`; a `superseded` `status` MUST declare `superseded-by`.

### 7.4 Release date

Every published version MUST carry an ISO 8601 [@bradner1997 — uses RFC convention] `release-date`. When a new version is cut, the previous version's `release-date` and contents MUST be preserved in the file's history (git-tracked); the file in the working tree carries only the most recent version.

## 8. The A.1–A.10 normative scaffold

This specification adopts and codifies the A.1–A.10 scaffold previously developed in the spec-spec README and scaffold-specification script. Every specification MUST address each scaffold item below according to its category (§2).

The scaffold items are normative obligations on the specification's authors; they appear in the specification's body as the sections labelled §A.2 through §A.10 in §5.1. The summary below states what each item requires and which categories MUST include it.

### A.1 Versioning — covered in §7

See §7. Applies to: all.

### A.2 Canonicalization — covered in §9

Define `CANON(x) → bytes`. Specify field ordering, omission rules, string normalization (Unicode NFC), whitespace policy, number formatting, deterministic map/dict ordering, binary encoding, and endianness. A reference function MUST be testable with golden vectors. Applies to: format specifications.

### A.3 Error semantics — covered in §10

Errors MUST use a stable schema with these fields: `code` (stable, machine-readable), `name`, `severity` ∈ {info, warn, error, fatal}, `where` (component/module), `when` (UTC timestamp), `correlation-id`, `fault` (producer/consumer), `retryable` (bool), `data` (opaque). Six error classes MUST be defined where applicable: input/validation, canonicalization, version/feature, state/consistency, I/O/transport, security/authz. Each algorithm step MUST specify which errors it can emit and under what preconditions. Applies to: all.

### A.4 Conformance — covered in §12

Provide a conformance matrix listing each normative MUST/SHOULD/MAY and the actor(s) it binds (producer, consumer, intermediary, validator). Publish an executable conformance suite with golden inputs/outputs, negative cases, fuzz corpus seeds, and determinism checks. Implementations MUST declare a `conformance-profile` referencing matrix rows and test IDs. Applies to: all.

### A.5 Upgrade path — covered in §15

Specify negotiated capabilities (feature flags, version ranges, fallback behavior); deprecation windows (announcement → dual-stack availability → removal); migration tools (translators, shims, backfills with idempotency guarantees). Applies to: all (SHOULD); MUST for format specifications.

### A.6 Security and privacy — covered in §16

Enumerate attacker models and trust boundaries. State confidentiality/integrity expectations for canonical bytes on the wire and at rest. Specify required mitigations (authn/authz, replay protection, input limits, timing channels). Define data retention and minimization requirements. Applies to: all.

### A.7 Interop and determinism — covered in §13

All observable outputs for the same canonical inputs MUST be bit-for-bit identical across conforming implementations. Randomness MUST be explicitly parameterized and seeded via inputs; unparameterized randomness MUST NOT appear in normative algorithms. Applies to: format specifications.

### A.8 Registries — covered in §14

If extension points exist, define registration policy, review process, collision handling, and permanence. Each registry entry MUST include identifier, status, spec reference, and security notes. Applies to: when extension points exist.

### A.9 Formal artifacts — covered in §17

Provide machine-readable schemas (JSON Schema [@jsonschema202012], ASN.1, IDL, or equivalent) and reference TCK hooks. Include pseudocode that is executable or trivially transpilable. Applies to: format specifications.

### A.10 Document hygiene — covered in §19

Every MUST/SHOULD/MAY statement is normative and SHOULD be test-mapped (linked to a conformance matrix row in §12). All examples MUST be labelled normative (golden) or informative (illustrative). The specification MUST include a glossary and an explicit non-normative rationale annex. Applies to: all.

## 9. Canonicalization (format only)

A format specification MUST define a canonical-form function `CANON(x) → bytes` such that two implementations producing the same logical artifact produce the same byte sequence. The canonicalization MUST specify: (a) field ordering and the rule for omitting absent fields; (b) string normalization (Unicode NFC is the default); (c) whitespace handling; (d) numeric encoding precision and rounding; (e) deterministic map/dictionary ordering (the canonical choice is lexicographic by key); (f) binary encoding and endianness for non-text fields. The reference function MUST be accompanied by golden vectors under `docs/dev/conformance/`. Convention specifications MAY omit this section.

For specifications whose canonical bytes are addressed by hash (e.g., the SPOTCOMP content-address derivation), the hash function MUST be a NIST-approved cryptographic hash [@nist1802015] (SHA-256 is the corpus default) and the input bytes to the hash MUST be derived from `CANON(x)`, never from a non-canonical serialization.

## 10. Error semantics

Every specification MUST define what constitutes a violation. Format specifications MUST define the full error schema specified in A.3 (§8). Convention specifications MUST AT MINIMUM enumerate the violation classes and the severity of each.

The six standard error classes are:

| Class               | Trigger                                                              |
|---------------------|----------------------------------------------------------------------|
| input/validation    | A boundary input fails the spec's schema.                            |
| canonicalization    | A producer's output deviates from `CANON(x)`.                        |
| version/feature     | An implementation encounters a version or feature it does not support. |
| state/consistency   | An invariant guaranteed by the spec is observed to be violated.      |
| I/O/transport       | A substrate operation (read/write/network) fails.                    |
| security/authz      | An authentication or authorization check fails.                      |

Each algorithm-step or procedure in the spec body MUST list which of these classes its step can emit. Ambiguous behavior MUST be an error per §6.4.

## 11. Authoring lifecycle

A specification is authored, reviewed, and published. This section pins the workflow stages. Format specifications follow §11.1–§11.5 in order. Convention specifications follow §11.1–§11.4; §11.5 (golden vectors) MAY be omitted when there are no canonical bytes.

### 11.1 Drafting

The author writes the spec at `<thing>/docs/dev/specification.md` with `status: draft` and `stability: experimental` or `draft`. The frontmatter MUST include every required key per §4.1 from the first commit. Sections MAY be sketched with TODO markers but TODOs MUST NOT remain at `status: active` publication.

### 11.2 Review

The spec is reviewed against the conformance-summary checklist (§5.1, §26). Reviewers verify: every MUST / MUST NOT is grounded (§6.3); every example is labelled normative or informative (§19.2); the glossary covers every normative term (§19.3); the references in the frontmatter resolve every in-body `[@citekey]` per the markdown-document specification.

### 11.3 Publication

When review is complete the author sets `status: active` and `stability: candidate` or `stable`. The publication commit MUST include the `release-date` set to the publication day in ISO 8601. The companion `<spec-id>.schema.json` (if any) MUST be present at the same commit.

### 11.4 Revision

PATCH and MINOR revisions update `version` and `release-date` in the same commit that changes the spec body. MAJOR revisions trigger the supersession path of §18.2: the prior file's `status` becomes `superseded` and `superseded-by` is set; the new file (typically at the same path, replacing the prior file's content) declares `supersedes` pointing at the prior spec-id-and-version.

### 11.5 Golden vectors (format specs)

Format specifications MUST publish golden vectors at `<thing>/docs/dev/conformance/` covering `CANON(x)`, content addressing where applicable, and every normative algorithm. The vectors are normative; conforming implementations MUST produce byte-identical output for each vector input.

## 12. Conformance

### 12.1 Conformance matrix

Every specification MUST publish a conformance matrix that enumerates every normative claim with a stable ID, restates the claim, names the actor(s) it binds, gives its requirement level, and links to a test that exercises it:

| ID  | Statement | Actor | Level | Test |
|-----|-----------|-------|-------|------|
| C1  | …         | producer | MUST | `conformance/c1-*.test.mjs` |

Actor vocabulary: `producer` (creates the artifact); `consumer` (parses/reads the artifact); `intermediary` (routes or transforms without semantic change); `validator` (admits or rejects the artifact); `implementor` (writes the implementation).

### 12.2 Executable conformance suite

Format specifications MUST publish an executable conformance suite under `docs/dev/conformance/` containing: (a) golden inputs and expected outputs for each MUST; (b) negative-case inputs that MUST be rejected; (c) fuzz corpus seeds; (d) determinism checks comparing implementations.

### 12.3 Conformance profile

Implementations MUST declare a `conformance-profile` document naming this specification by `spec-id` and `version`, listing every conformance-matrix ID it implements, and citing test results for each. An implementation that does not implement every MUST in the matrix is NOT conforming and MUST NOT claim conformance.

## 13. Determinism (format only)

All observable outputs of conforming implementations, given the same canonical inputs, MUST be bit-for-bit identical. Randomness, timestamps, and non-deterministic ordering MUST be explicitly parameterized and seeded via inputs declared in the spec; non-parameterized non-determinism MUST NOT appear in normative algorithms. Convention specifications MAY omit this section.

## 14. Registries

If the specification defines extension points (named slots, vocabulary registries, identifier spaces), it MUST specify: (a) registration policy (first-come, expert-review, standards-action — terminology per [@bradner1996]); (b) the review process; (c) collision handling; (d) permanence (whether registrations are removable). Each registry entry MUST carry: identifier, status, spec reference, and security notes. Specifications without extension points MUST state "No registries defined" in this section.

## 15. Upgrade path

The specification MUST describe how implementations move between versions. At minimum:

- **Capability negotiation**: how a producer and consumer agree on which version they speak.
- **Deprecation windows**: for any feature being removed, the announcement-to-removal interval (typically one MAJOR cycle).
- **Migration tools**: translators, shims, and backfills with idempotency guarantees, where applicable.

## 16. Security and privacy considerations

Per RFC 7322 [@flanaganginoza2014] every IETF-style specification MUST include a Security Considerations section. SPOTCOMP specifications adopt this requirement. The section MUST enumerate:

- the attacker model(s) the specification considers in scope;
- the trust boundaries the specification's artifacts cross;
- confidentiality and integrity expectations for canonical bytes on the wire and at rest;
- mitigations required of conforming implementations (authn/authz, replay protection, input limits, timing channels);
- data retention and minimization requirements.

When the specification has NO security implications, the section MUST still appear and MUST state explicitly: "This specification has no direct security or privacy implications." A missing security section is a defect, even when the answer is "none."

## 17. Formal artifacts (format only)

Format specifications MUST be accompanied by machine-readable formal artifacts:

- a JSON Schema 2020-12 [@jsonschema202012] schema (or ASN.1, IDL, or equivalent for non-JSON formats) sufficient to validate every conformant artifact;
- a reference implementation under `docs/dev/conformance/reference/` (or a citation to one);
- TCK (Technology Compatibility Kit) hooks: invocation conventions a third-party implementation can run against the reference fixtures;
- pseudocode for every nontrivial algorithm, either directly executable or trivially transpilable to a target language.

The formal artifacts and the prose MUST be consistent. Where they conflict, the prose wins for normative meaning and the artifact is updated to match — but a recurring divergence is itself a defect.

## 18. The spec DAG

Specifications form a directed acyclic graph (DAG) of `requires` edges and a history chain of `supersedes`/`superseded-by` edges.

### 18.1 `requires`

A specification's `requires` frontmatter key names other specifications (by `spec-id`) that MUST hold for this specification to be enforceable. A `requires` reference is a hard dependency: an implementation conforming to this specification MUST also be conforming to every required specification. A `requires` reference MUST name an existing `spec-id` in the catalog; a dangling reference is a broken DAG edge and a defect.

The DAG MUST be acyclic. Implementations of the spec-validation tooling MUST detect cycles and refuse to publish a specification that introduces one.

### 18.2 `supersedes` / `superseded-by`

When a specification is replaced by a successor, the old specification's frontmatter MUST set `status: superseded` and `superseded-by: <new-spec-id>`. The successor's frontmatter MUST set `supersedes: <old-spec-id>`. The superseded file MUST NOT be deleted: the history is load-bearing for audit, version negotiation, and migration. Per the append-only discipline of the TRC, removal of the historical artifact would violate substrate monotonicity.

### 18.3 No deletion of normative artifacts

A specification, once published with `status: active`, MUST NOT be deleted from the catalog. The successor mechanism in §18.2 is the only conforming path to retiring a specification.

## 19. Document hygiene (A.10)

### 19.1 Test-mapping

Every MUST/SHOULD/MAY statement SHOULD link to its conformance-matrix row by ID (e.g., `[C7]` at the end of the statement). Format specifications MUST test-map every normative statement; convention specifications SHOULD test-map every statement whose violation is mechanically detectable.

### 19.2 Example marking

Every example MUST be labelled either **normative** (golden — implementations MUST produce or accept this) or **informative** (illustrative — clarifies intent but is not binding). Unlabelled examples are defects.

### 19.3 Glossary

Every term used normatively in the specification MUST be defined once in the glossary section (§21). Synonyms MUST be defined OR forbidden — if "user," "customer," and "account holder" denote different things, define all three; if they denote the same thing, pick one and use it consistently throughout. This is the discipline that prevents the most common spec defect: silent vocabulary drift.

### 19.4 Rationale annex

Every specification SHOULD include a `## Rationale (non-normative)` section explaining the design decisions. Rationale MUST NOT contain normative claims; it explains *why* the normative claims in §1–§§A.10 are what they are.

## 20. Body grounding and source citation

A SPOTCOMP specification is a markdown-document and therefore follows the markdown-document citation discipline: in-body `[@citekey]` markers MUST resolve to entries in the `references` frontmatter; every MUST/MUST NOT claim grounding in an external work MUST cite that work at the site of the claim.

In particular, for specifications governing a mathematical object, every normative claim MUST be traceable to a math entity, proof, or theorem. The trace SHOULD appear inline as a citation rather than as a downstream "see also."

## 21. Glossary

- **Specification** — a typed document that pins the conformance requirements of one named thing by stating what is required, what is forbidden, and what is open. (§1)
- **Format specification** — a specification governing bytes that cross implementation boundaries. (§2.1)
- **Convention specification** — a specification governing practice, organization, or documentation. (§2.2)
- **Normative** — having binding force on conforming implementations. (§1, §6)
- **Conformance matrix** — the table that enumerates every normative claim by stable ID, with actor, level, and test. (§12.1)
- **Conformance profile** — an implementation's declaration of which conformance-matrix IDs it implements. (§12.3)
- **Spec-id** — the kebab-case slug naming the thing pinned by a specification; equals the basename of the spec's parent directory. (§3, §4.1)
- **Stability** — the spec's maturity as a contract: `experimental`, `draft`, `candidate`, `stable`, `deprecated`. (§7.2)
- **Status** — the spec's place in the DAG: `draft`, `active`, `superseded`. (§7.3)
- **`requires`** — frontmatter key naming spec-ids that MUST hold for this spec to be enforceable. (§18.1)
- **`supersedes` / `superseded-by`** — frontmatter keys recording the history chain when one spec replaces another. (§18.2)
- **Conformance suite** — the executable test corpus accompanying a format specification. (§12.2)
- **CANON(x)** — the canonicalization function defined by a format specification. (§9)
- **Implementation-defined** — a behavior the specification declares but allows the implementation to choose, requiring the implementation to document the choice. (§6.4)

## 22. Open questions

- Whether the `version` field permits pre-release identifiers (`1.0.0-rc.1`) per SemVer 2.0.0 [@preneel2009] when `status` is `active`. Resolution blocked by: a policy choice about whether candidate-stability specs can be promoted to active before reaching `1.0.0`.
- Whether `requires` is computed transitively at validation time or only at one-hop direct reference. Resolution blocked by: the spec-validation tooling design.
- Whether deprecated specifications retain `status: active` until removal, or transition through an intermediate `status: deprecated`. Resolution blocked by: alignment with the `stability: deprecated` value, which currently does not have a matching `status` value.

## 23. Implementations

### 23.1 SPOTCOMP

In SPOTCOMP, every specification is a markdown-document at `<thing>/docs/dev/specification.md` under the TRC catalog root. The companion machine-readable schema (when present) sits at `<thing>/docs/dev/<spec-id>.schema.json`. The conformance suite (when present) sits at `<thing>/docs/dev/conformance/`. The `references` frontmatter, the `[@citekey]` body convention, and the OGraph `description` are inherited from the markdown-document specification.

### 23.2 IETF RFC

A SPOTCOMP specification MAY be cross-published as an IETF Internet-Draft using the xml2rfc v3 vocabulary [@hoffman2016]. When cross-published: the SPOTCOMP `spec-id` maps to the RFC's short-name; SPOTCOMP `version` maps to the Internet-Draft revision number until promotion; the Security Considerations section (§16) maps to the RFC's mandatory same-named section; the conformance matrix maps to the IANA Considerations + Applicability Statement structure of RFC 2026 [@bradner1996].

### 23.3 ISO/IEC

A SPOTCOMP specification MAY be cross-published in the ISO/IEC structure per ISO/IEC Directives Part 2 [@isoiec2021]. When cross-published: the SPOTCOMP scope and conformance sections map to ISO's Clauses 1 (Scope) and 8 (Conformance); SPOTCOMP `references` maps to ISO's normative references clause; the RFC 2119 keyword discipline aligns with ISO's "shall/should/may" verb forms (SPOTCOMP MUST = ISO shall; SPOTCOMP SHOULD = ISO should; SPOTCOMP MAY = ISO may).

### 23.4 IEEE 830 Software Requirements Specifications

For software-component specifications, the SPOTCOMP body structure aligns with IEEE Std 830-1998 [@ieee8301998]: SPOTCOMP §0 ↔ IEEE 1 (Introduction/Scope); SPOTCOMP §1 ↔ IEEE 2 (Overall Description); SPOTCOMP topic sections ↔ IEEE 3 (Specific Requirements); SPOTCOMP §16 ↔ IEEE 5 (Other Nonfunctional Requirements: security/privacy).

## 24. Rationale (non-normative)

This specification codifies practices that prior sessions in the corpus repeatedly re-derived. The A.1–A.10 normative scaffold originated in the spec-spec README (`research-notes/.../wsl-backup/superrepo/library/spec-spec/README.md`) and was operationalized as a Python scaffolding script (`research-notes/.../specification-specification/domains/scripts/scaffold-specification.py`); the format-vs-convention distinction is preserved from that script, where convention specs omit A.2, A.7, and A.9. The body section discipline (`## What this is` / topic sections / `## Implementations` / `## Open questions`) was previously stated in `research-notes/engineering/library/tech/library/specification/specification.md` and the same author's earlier `concepts/specification.md`. The DAG vocabulary (`requires` / `supersedes` / `superseded-by` / `status`) is preserved from `research-notes/.../work/governance/rules/specifications/specification.md`. The "states what is true, what is forbidden, what is open" framing is preserved from multiple terms-glossary notes.

The cross-tradition references — RFC 2026, RFC 7322, ISO/IEC Directives Part 2, IEEE Std 830 — are not imported by mechanical copy. They are cited where each tradition has settled a question this corpus also needs settled: RFC 7322 [@flanaganginoza2014] for the Security Considerations requirement; RFC 2026 [@bradner1996] for the maturity ladder vocabulary; RFC 2119 [@bradner1997] and RFC 8174 [@leiba2017] for the keyword discipline; ISO/IEC Directives [@isoiec2021] for the shall/should/may alignment; IEEE 830 [@ieee8301998] for the requirements-document section layout.

The Curry–Howard–Lambek correspondence [@curry1934; @howard1980; @lambek1986] is the load-bearing reading: a specification is not a description-of-a-thing but a type-the-thing-must-inhabit. This is why §6.3 requires that every MUST trace to a settled source — the type-checker would otherwise admit terms it cannot ground.

The Yoneda lemma [@yoneda1954; @maclane1971] motivates §3: a specification's identity IS its path; a frontmatter `id` field repeating the path-slug invites divergence between the categorical identity and the frontmatter label, and Yoneda's full faithfulness forbids exactly that mismatch.

The Belnap bilattice [@belnap1977] and Knaster-Tarski [@tarski1955] motivate §7.3's `status` lifecycle and §18's append-only history: a specification's history is a settling under the knowledge order; supersession adds evidence (the new spec) without removing prior evidence (the old spec).

## 25. Relationship to other specs

- **Requires**: `markdown-document` (every specification IS a markdown-document and inherits its frontmatter, body, and citation discipline).
- **Requires**: `typed-resource-catalog` (every specification lives at a path under the TRC catalog root; its identity is that path).
- **Extends**: the prior `specification` concept notes in `research-notes/` (this specification supersedes the in-tree prose notes for SPOTCOMP authoring purposes; the research-notes remain as training data).
- **Pinned by**: this specification itself (self-referential — this is the specification-specification).

## 26. Conformance summary

A SPOTCOMP specification is conformant iff all of the following hold:

- §0: Scope is declared (what this applies to AND what it does NOT apply to).
- §3: Filename is `specification.md`; path is `<thing>/docs/dev/specification.md`; the thing-slug is in the path, not repeated in frontmatter.
- §4.1: Required frontmatter keys present (`name`, `description`); all other keys (`spec-id`, `version`, `release-date`, `stability`, `status`, `category`, `references`) are optional; validates against the JSON Schema in §4.3.
- §5.1: Required sections are present in order; A.x scaffold sections are present per category.
- §6.1–6.4: RFC 2119 keywords used in ALL CAPS only for normative claims; ambiguities are errors; every MUST/MUST NOT is grounded.
- §7: Versioning is SemVer 2.0.0; stability and status declared from the generated values; release-date is ISO 8601.
- §8: A.1–A.10 scaffold items addressed per category.
- §9 (format): `CANON(x)` defined with golden vectors.
- §10: Violations generated; error classes defined where applicable; full A.3 error schema for format specs.
- §12: Conformance matrix published; executable suite (format); implementations declare conformance-profile.
- §13 (format): Bit-for-bit determinism stated; non-determinism parameterized.
- §14: Registries declared OR section states "No registries defined."
- §15: Upgrade path described.
- §16: Security and privacy considerations present, even when "none."
- §17 (format): Machine-readable schema, reference implementation, TCK hooks, pseudocode.
- §18: `requires` references resolve; supersession history preserved; no deletion of normative artifacts.
- §19: Examples labelled normative or informative; glossary defines normative terms; rationale present (SHOULD).
- §20: `[@citekey]` markers resolve to `references` entries; MUST claims cite their grounding.

