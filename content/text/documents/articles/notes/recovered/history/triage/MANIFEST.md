# triage manifest — writing material

Staging area for a planned writing-linter package: Grammarly-style prose checking
driven by the voidmath kernel. This file records what writing material the search
turned up, what was copied into `sources/`, and what was left in place. It states
where files are and what they say; it does not yet design the package.

Search date: 2026-06-03. Tier order searched: `production/`, `development/stable/`,
`development/active/`, `development/experimental/`, `development/lab/archive/`.

## Gathered into `sources/`

### `sources/ptgae-canonical/` — the canonical PTGAE library (copied, 26 files)
Copied from
`development/lab/archive/library/humanities/library/writing/library/plain-technical-general-american-english/`.
This is the richest corpus. Its own `_index.md` (in the archive) calls PTGAE
"the formal, technical register the 561 Group's library uses for published content"
and "a real theory of how to write English well in technical contexts, not just a
style sheet." Structure mirrors a voidmath-style library:

- `prose/teaching/explanations/references/style-guide.md` — **the big one (~515 lines, 29 KB).**
  Full style guide: voice, conciseness, names/references, an 80+-entry word-choice
  substitution table, grammar/mechanics, evidence/citation, content-type conventions.
  Cites Federal Plain Language Guidelines, Joseph Williams, Rudolf Flesch.
- `prose/teaching/explanations/guides/` — `proper-nouns-style.md`, `contractions-consistency.md`.
- `terms/` — `readability.md` (Flesch Reading Ease, Flesch-Kincaid grade, Schriver,
  Sweller cognitive load), `cognitive-load.md`, `accessibility-in-writing.md`.
- `code/transformers/` — revision techniques: `paramedic-method.md`,
  `protocol-aided-audience-analysis.md`, `task-analysis.md`, `think-aloud-protocol.md`,
  `usability-testing.md`.
- `code/structures/plain-language.md` — the Plain Language movement.
- `concepts/` — `document-design.md`, `progressive-disclosure.md`.

### `sources/skills/` — the operational rule-skills (copied)
- `writing-ptgae.SKILL.md` — from
  `development/internal/.../writing/writing-a-resource-file/library/writing-plain-technical-general-american-english/SKILL.md`.
  The compact, machine-facing rule sheet actually in use. Concrete rules with
  counter-examples: avoid `polity`, `substrate`, `harness`, `lift`, `lawful`,
  `canonize`, `deontic`, `kyriarchical`, `H⁰-invariant`, `incumbency`,
  `body-natural`, `remit`; sentences under 25 words; active voice; same exact phrase
  for the same thing; no stacked qualifiers; no padding; one idea per sentence.
- `rewriting-ptgae.SKILL.md` — the rewrite-discipline sibling: "Preserve every fact,
  claim, instruction, and reference the source had. Drop padding, redundant
  qualifiers, and corporate-speak."

### `sources/active/` — live in-use voice guide (copied)
- `koios-news-voice.SKILL.md` — from `development/active/koios-news/working/writing/SKILL.md`.
  A concrete applied voice/style guide (lede structure, SEO term placement,
  subheaders, length, citation, close). Useful as a real-world test corpus for the
  linter and as a second register beside PTGAE.

## Left in place (pointers, not copied — duplicates / deep paths)

Other PTGAE copies exist across the archive; the canonical one above is the most
complete. The duplicates, for provenance:
- `development/lab/archive/archive-from-bare-cedar-fog/library/writing/domains/plain-technical-general-american-english`
- `development/lab/archive/emsenn/hacking/.../library/writing/domains/plain-technical-general-american-english`
- `development/lab/archive/research/library/domains/humanities/domains/writing/domains/plain-technical-general-american-english`
- `development/lab/archive/relationality-repo/.../theories/writing/theories/plain-technical-general-american-english`
- `development/internal/hacking/.../composting/library/.../writing/library/plain-technical-general-american-english`

Writing-for-AI-agents material (agent-instruction files, not prose style) lives under
`development/internal/`:
- `.../writing-a-resource-file/library/writing-directory-agent-instructions/` (AGENTS.md authoring skill)
- `.../researching/library/zeroth/Standard Agent Instructions.md`
- `.../governing/founding/library/rom-keldar/governance/rules/specifications/{agents-file.md,claude-md.md}` (RFC 2119 specs)

General writing-domain index (genre theory, style-guide-as-genre):
- `development/lab/archive/library/humanities/library/writing/_index.md`
- `development/lab/archive/library/humanities/library/writing/terms/style-guide.md`

## Notes
- `voidmath-notes.md` — what I read in the voidmath kernel (facts from its files).
- `proposed-mapping.md` — my own sketch of how the kernel could drive linting.
  Marked throughout as proposal, not established fact.
