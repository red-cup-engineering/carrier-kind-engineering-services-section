# @red-cup-engineering/carrier-kind-engineering-services-section

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Admits a content carrier's frontmatter by the schema its kind names.
It is the engineering side of wave 1.2 of [the corpus knowledge graph program](../../../../../../../../../science-services-section/services/information-science-services-section/services/knowledge-services-section/services/knowledge-organization-services-section/content/text/documents/articles/notes/2026/09/30/2026-09-30-the-corpus-knowledge-graph-program.md).

## One authority, projected

The knowledge organization science section keeps the original schemas in `data/records/schema/carriers/<kind>.schema.json`. Each schema declares `$id` as `carriers/<kind>`. [Science schema owner](../../../../../../../../../../../science-services-section/services/information-science-services-section/services/knowledge-science-services-section/services/knowledge-organization-services-section/README.md)
This package holds byte-identical projections of them in `schemas/carriers/` and only compiles them; a test fails when a projection drifts from its source.

Research articles and papers inherit the common research metadata schema. Manuscript profiles and the structure of the body are assessed by the paper authoring service.

- `npm run project-science-schemas` copies each science schema here. A schema whose `$id` is not `carriers/<kind>` is refused.
- `npm run generate-ontology` regenerates the science section's `data/ontology/carriers/{ontology,shapes}.ttl` with `json-schema-to-owl-shacl-service`. The term schema is passed as a reference, so the note schema's borrowed keys resolve without minting a term class.

Schema class IRIs are `https://561.group/ns/schema/<$id>`, the namespace the house's other generated ontologies use.
Where `/ns/` finally lives is the program's open question 2, decided in wave 3.1.

## Kinds

The kind comes from the artifact-role directory (the program's decision 5); `./carrier-path` reads it.
`carrierKindOf(path)` takes the first directory past the house content containers (`content`, `text`, `documents`, `articles`, `glossary`, `media`) and makes it singular, so `articles/notes/2026/09/30/x.md` is a `note`.
`sectionOf`, `roleOf` and `kindOf` are the same functions the corpus census uses.

| Kind | Schema | Required |
|---|---|---|
| `note` | `carriers/note` | `title`, `description`, `date-created` |

Glossary terms and bibliography carriers keep their own owners: [term-engineering](../computer-glossary-systems-engineering-services-section/services/term-engineering-services-section/README.md) and [bibliography-engineering](../bibliography-engineering-services-section/README.md).

## Admission

`admitCarrierFrontmatter(kind, frontmatter)` returns `{admitted, findings}`.
The kind's schema is compiled with the term schema as a reference, because aliases, keywords, references and provenance are the term schema's.
Every predicate of the relation vocabulary is admitted as a key; a `carrier`-range predicate takes one identity or a non-empty list of them.

Each finding's `rule` is the failed schema keyword and the top-level key it failed on: `required:description`, `pattern:keywords`, `type:references`.
A value that no alternative of a `oneOf` admits gives one `oneOf:<key>` finding, not one per alternative.

## Repair plans

`./note-repair`'s `planNoteFrontmatterRepair({path, frontmatter, body})` proposes only additions supported by the note itself: a missing title from its authored name, first real Markdown level-one heading or file name, and a missing description from its summary or first suitable complete short prose paragraph.

A dated path, generic `date`, or the earliest custody observation does not establish when the note was first written. The planner does not fill or overwrite `date-created`. It also does not replace authored keys with normalized spellings or collapse reference records into citation labels. The original schema's findings remain available for source-owner review; there is no write or removal performed by the planner.

The description fallback skips headings, lists, fenced code, incomplete lead-ins and paragraphs too long to preserve intact. A source with authored `status: relocated-research-source` receives no note-repair proposal: it is a relocation declaration to verify at the source-link consumer, not a note whose content or title should be re-authored.

For a reviewed metadata-only batch, `./note-frontmatter-preview` exports
`previewNoteFrontmatterAdditions({ bytes, expectedRevision, additions })`.
`expectedRevision` is the exact original UTF-8 `sha256:<hex>`, not a Git
commit, a pathname or a date. Supply only evidence-reviewed missing
`title`, `description` or `date-created`; the preview neither infers nor
verifies a creation date. It refuses existing fields, stale bytes, relocation
pointers and unsupported frontmatter formats. It uses the Markdown package's
YAML editor and requires exact recovery of the original bytes if its additions
are reversed, then uses the original note schema. The output carries candidate
text and both digests for review; it writes nothing and grants no access.
Never send its candidate text to an unadmitted consumer.

Run the focused preservation suite with `npm run test:note-repair`.


For triage, `./note-masthead-date` reads an explicitly labeled `Date:` field
among a note's introductory memo fields, with original line numbers and
the source SHA-256. It supports ISO calendar days and full English day/month
spellings. It does not use folder names, unlabeled dates, month-only dates,
access dates, code examples, or dates found later in a body. A conflicting
or unresolved date stays unresolved; a document's own stated date is
evidence for an owner to review, not an automatic `date-created` repair.


The same preview export provides `previewNoteFrontmatterLineSplit` for one
reviewed formatting error in otherwise retained YAML. Supply the original
bytes and revision, the exact line, and the following top-level block key.
It accepts only malformed input whose line joins a quoted scalar to that
block key, inserts one original line ending, and refuses unless the original
body survives exactly and the existing note schema admits the result.
It is not a general YAML recovery or auto-format operation.

Note-origin provenance in the projected schema comes from [Knowledge Science #28](https://github.com/lenticule-science/knowledge-science-services-section/pull/28). The generated projection does not change the Term or bibliography contract. Do not release this projection before the source owner lands the exact canonical schema.
