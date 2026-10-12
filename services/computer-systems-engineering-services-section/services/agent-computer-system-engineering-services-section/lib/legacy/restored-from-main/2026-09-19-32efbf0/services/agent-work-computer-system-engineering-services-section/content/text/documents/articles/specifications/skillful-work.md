---
title: "Skillful Work"
description: "Work for which a documented, repeatable method exists; Process, Procedure, Derivation, and Inquiry are the operational four-corner classification used by the work system. Its proposed reading through meaning-closure and execution-closure awaits a constructed skill algebra."
date-created: 2026-05-21
type: specification
keywords:
  - skillful-work
  - nuclear-quartet
  - skill-result
---

# Skillful Work

## What this is

A unit of **work** is anything that gets done. **Skillful work** is work for which a documented, repeatable method exists — a skill file.
The four types of skillful work correspond to the four canonical sub-algebras of a [nuclear quartet](../../../../../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/content/text/glossary/terms/nuclear-quartet.md): the raw algebra A (Inquiry), Fix(σ) (Procedure), Fix(Δ) (Derivation), and H\* = Fix(σ)∩Fix(Δ) (Process).
This operational classification is read through two commuting nuclei σ (meaning-closure) and Δ (execution-closure). `Obsmetrologia/Language/Positing/Bigraded.lean` proves the general nuclear-square results, including `Fix(π) = Fix(j₁) ∩ Fix(j₂)` for a supplied Heyting algebra and nuclei. It does not construct an algebra of work units or prove that these four labels are exhaustive or disjoint work classes; that construction remains pending below.

## MUST

- Declare one operational closure kind for routing: Process, Procedure, Derivation, or Inquiry. This is a work-system convention pending construction of the corresponding skill algebra, not a theorem that excludes every other work classification.
- Have a skill file that declares its type in the file header
- Produce a SkillResult (§skill-result) — either a named success output or a structured SkillError; a unit of skillful work that produces neither has not completed
- Declare its `skill-closure-kind` in frontmatter matching the type header

## By type: output and feedback obligations

**Process and Procedure** — MUST emit a SkillError (§skill-result) when they cannot produce their codomain output.
The error propagates to the calling skill or, if unhandled, to the enclosing improvement cycle (§improving) which routes it to PLANS.

**Derivation and Inquiry** — in addition to producing their output, MUST accumulate a CoursOfWork (§improving) during execution: the skills invoked, files read, and any unexpected outputs or errors encountered.
When executed within an Improving context, the CoursOfWork is passed to `skills/post-work-update.md` as findings at the end of the work unit.
A Derivation or Inquiry that produces a judgment without examining its CoursOfWork has not closed its loop.

## CAN

- Call skills of any type as sub-skills
- Be organized in any directory structure
- Span multiple files if a single skill's output is too large

## CANNOT

- Claim that the declared closure kind is a formally proved exhaustive or disjoint classification of skills before the skill algebra exists
- Fail silently — every failure MUST be a named SkillError

## Pending

- Formal construction of σ (meaning-closure) and Δ (execution-closure) as nuclei on the algebra of work units — blocked by: skill-algebra construction (not yet a math unit; the analogy is established, the formal object is not)
