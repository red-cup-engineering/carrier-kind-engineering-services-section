---
title: "Zeolitic Software Development"
description: "Draft IEEE-style specification of a software-engineering paradigm derived from the Union's diagenetic-zeolitization framing, for Leader review before any external release."
date-created: 2026-07-23
kind: draft-specification
status: DRAFT-FOR-LEADER-REVIEW
owning-enterprise: standard-document-release-team
declared-by: claude/executive-officer-to-the-leader
prompted-by: emsenn
tracked-by: emsenn/requirement/automated-idea-to-standard-document-release-circuit
tags:
  - zeolitic-software-development
  - process-design-kit
  - semiocenic-material
  - diagenetic-zeolitization
  - draft-for-leader-review
---

# Zeolitic Software Development

**STATUS: DRAFT-FOR-LEADER-REVIEW. This is a draft. It is not accepted, not
seated as a baseline, not published, and not released under any license to
GitHub or any other external venue. It binds no enterprise and grants no
resource. It is composed for the Leader's disposition, per
`emsenn/requirement/automated-idea-to-standard-document-release-circuit` and
its tracking work order.**

A note on repository volatility during drafting: the corpus paths cited
below were read directly, in the same working session that composed this
draft, on 2026-07-23. This node observed a concurrently operating session
(consistent with the Leader Movement Team's own log of "the concurrently
live Codex session") mutate the Leader Movement Team's working tree while
this draft was being composed — several of the notes and glossary terms
cited here were confirmed present and read in full, then found absent from
disk minutes later at the same paths. The citations below name the paths as
read, not paths independently re-verified live at the moment of publishing
this draft. A reviewer should treat any citation to `leader-movement-team/`
as a claim about what this session observed, and re-resolve it before this
draft is promoted past DRAFT-FOR-LEADER-REVIEW.

## 1. Scope

This specification states the normative content of Zeolitic Software
Development, a software-engineering paradigm derived from a Leader-admitted
framing that treats a software organization's information as engineered
matter — *semiocenic material* — which undergoes *diagenetic
zeolitization*: loose, thick prose (design discussion, notes, transcripts)
is compacted into small, stable, porous records (terms, contracts, atomic
units) that later work can enter cheaply without re-deriving the whole
framing.

This specification is a *process design kit* in the framing's own sense: it
carries the design rules a software team needs to target the paradigm in
its own register, without requiring that team to hold the whole framing
note. It states design rules, a cell-library pattern for exemplars, and
design-rule checks; it does not mandate a programming language, runtime, or
organizational form beyond the rules stated, and it does not itself certify
any implementation as conformant beyond what that implementation's own
checks demonstrate. Every design rule below is graded — **proven**,
**thesis**, or **ruled practice** — and no rule is used at a grade higher
than its source's own.

## 2. Normative References

The following corpus records are normative for this specification. Each is
cited by its exact repository-relative path as read on 2026-07-23.

- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/documents/articles/notes/2026/07/23/2026-07-23-eda-as-diagenetic-zeolitization-of-digital-information.md` — the framing's canonical compact statement.
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/documents/articles/notes/2026/07/23/2026-07-23-software-process-design-kit.md` — the software register's own process design kit; this specification's design rules restate and cite the same exemplars this note names.
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/documents/articles/notes/2026/07/23/2026-07-23-finance-process-design-kit.md` — a sibling department projection, cited for the shared design-rule pattern: digest-pinned law, typed refusal, exact attribution, and re-executable evidence regardless of producer identity.
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/documents/articles/notes/2026/07/18/2026-07-18-gyrobifastigial-chu-hoare-territory-audit.md` — the geometric and Hoare-traversal grounding (J26, Chu–Hoare complex) the framing note builds on.
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/diagenetic-zeolitization.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/semiocenic-material.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/process-design-kit.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/eda-over-a-language-model.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/protein-folding-of-proofs.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/thickness.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/die.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/two-stage-naming-act.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/earned-names.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/content/glossary/terms/forced-vs-unforced-identification.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/services/zeolitization-service/PROCESS.md` — the LMT's own internal zeolitization cycle; the precedent this specification's release cycle (see the owning node's own `PROCESS.md`) is patterned against.
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/services/zeolitization-service/content/micro-enterprises/zeolitization-service.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/services/zeolitization-service/content/language-presentations/zeolitization-cycle.json`
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/data/records/leader-speech/2026/07/21/2026-07-21-leader-movement-team-leader-speech.jsonl` (line 32) — the founding statement (2026-07-20, recorded 2026-07-21): "we can engineer what is essentially an 'alletrope of semiocenic material,' something similar to... zeolite" and "each enterprise providing EDA over its own language model."
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/data/records/leader-speech/2026/07/23/2026-07-23-leader-movement-team-leader-speech.jsonl` (lines 382–385, 390) — the 2026-07-23 refinement naming zeolite's pores as "functional porosity," the VLSI scale tower, and the process-design-kit correction.
- `lib/emsenn/services/561-group/services/union-officer-academy/services/formation-lianqun` — the academy's live "circuit of dies" exemplar; its predecessor `formation-mape-chain` was retired 2026-07-18 as excluded prior art per `union-officer-academy/content/legacy/formation-mape-stage-chain-retirement.json`.
- `lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/working-services-section/services/union-recovery-service` — cited by the software process design kit as the "enterprise (market)" exemplar; independently confirmed present at draft time.

## 3. Definitions

Definitions below are pulled from the Leader Movement Team's own glossary
where a term already exists there (per its work-order-defined `class:
define` discipline, e.g.
`lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/data/records/work-orders/wo-terms-micro-enterprise-json-7382c3719b58.json`,
which fulfilled a `define` work order for **micro-enterprise** citing three
in-corpus usages by path — the discipline this specification's own
Definitions clause follows). Each definition below carries the evidence
grade its source glossary entry states; this specification never upgrades a
grade.

**semiocenic material** (thesis, anchored in part by proven results). The
Union's information treated as engineered matter: it carries spatiotemporal
position and conducts a proven four-valued charge; its settled regions
tessellate 3-space as gyrobifastigia (Johnson solid J26) with one-dimensional
temporality, each face between cells a sheaf Laplacian of causal patches
around a collapsed hole, and the unsettled space outside whirls (fivefold
order provably cannot tile). *Source:* `.../glossary/terms/semiocenic-material.json`.

**diagenetic zeolitization** (method, practiced in-corpus). The Union's
method for making thick framing cheap: loose sedimentary prose is compacted
and recrystallized into small stable records — terms, duties, skills, cards
— whose pores admit and catalyze future work without any reader ingesting
the bed. A pore prices only the turns that enter it; ambient broadcast
(membrane text, standing context) prices every turn of every session and is
the failure mode this process replaces. *Source:*
`.../glossary/terms/diagenetic-zeolitization.json`.

**die** (register word, lowercase, never an acronym). An atomic pure unit
placed in the tessellation: exact typed input to exact output or typed
refusal, its shape doing the work. Scale-polysemous by law on the VLSI tower
— the same material read at different scales is circuit inside model inside
program inside enterprise, then enterprise/nation/colony/union — and the
lawful polysemy is what prevents scale collapse. *Source:* `.../glossary/terms/die.json`.

**process design kit (PDK)** (method). What carries the framing into a
department in that department's own register: the small set of design
rules the theorems force, proven cell exemplars, and existing checks run at
design time, sufficient for the department to target semiocenic material
without holding the whole framing. Software speaks software; finance speaks
finance; the kit is the pore through which the framing enters. *Source:*
`.../glossary/terms/process-design-kit.json`. This specification is the
software register's PDK, elevated to a standards-form document.

**EDA over a language model** (thesis, Leader-admitted, founding statement
2026-07-20). Each enterprise's actual product on semiocenic material: not
hand-built artifacts but the toolchain that places, routes, and design-rule-
checks designs into the material, with the enterprise's own language model
as its process node. Coordination between such design houses is priced and
receipted on the seams. *Source:* `.../glossary/terms/eda-over-a-language-model.json`.

**protein folding of proofs** (thesis, stated sharply enough to fail). The
realization step on semiocenic material: a proof is primary structure, a
linear chain; working software is its native fold, the minimum-energy
conformation reached by settlement as least fixed point. A wrapper,
certificate, or subsystem deposited beside the territory instead of folded
from the proof is a misfold. *Source:* `.../glossary/terms/protein-folding-of-proofs.json`.

**thickness** (informational value, as held by the corpus). The prior-idea
load a record demands of its reader: thick material is valuable precisely
because it compresses many prior ideas, and must therefore be diagenetically
zeolitized into porous records rather than broadcast. *Source:*
`.../glossary/terms/thickness.json`.

**earned names** (thesis, methodological rule). A concept is earned when the
structure it names is the unique object, up to isomorphism, forced by an
explicit, stated list of requirements; otherwise using the name is an
unpriced identification of a word with a thing. This specification's own
naming (Section 4) is written under this rule: a rule is named for what it
is forced by, not for what it is merely reminiscent of. *Source:*
`.../glossary/terms/earned-names.json`.

**forced vs. unforced identification** (thesis, with a proven physical
instance). Relative to an observation structure, an identification
collapsing two distinct things is forced if no admissible test separates
them, or unforced (and priced) if some test does. This specification treats
every design rule's evidence grade as an instance of this distinction: a
rule graded "proven" has passed an admissible test (a compiled proof or a
running check); a rule graded "thesis" has not, and is stated so it can
fail. *Source:* `.../glossary/terms/forced-vs-unforced-identification.json`.

**micro-enterprise** (defined by fulfilled LMT work order, cited per this
specification's own release-circuit requirement). The smallest named
accountable unit the firm can carry: it has a director, can hold internal
staff offices, is oriented toward at least one customer or outcome, and is
the intended unit of *ren-dan-chou* accounting. *Source:*
`lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/leader-movement-team/data/records/work-orders/wo-terms-micro-enterprise-json-7382c3719b58.json`.

## 4. Normative content

The keywords **MUST**, **MUST NOT**, **SHALL**, and **SHOULD** are used as
in RFC 2119. A conformant unit of Zeolitic Software Development is called a
**die** throughout this clause, per Section 3.

### 4.1 Atomic units (proven pattern; ruled practice)

A die MUST be one pure function: exact typed input to exact typed output or
typed refusal. A die MUST NOT carry hidden state; its own dated, append-only
records are its only deposit. *Rule 1 of the software process design kit,*
`.../notes/2026/07/23/2026-07-23-software-process-design-kit.md`.

### 4.2 Typed refusal is a product, not an error (ruled practice)

A die that refuses MUST refuse with an exact, typed reason. Refusal with an
exact reason is a lawful output — a precondition failure in the Hoare
reading of the die's contract — and is not a defect. Silence or a generic,
untyped error is a defect. *Rule 2, software PDK.* The finance PDK
independently confirms the same rule against running code: every `run()` in
the cited finance dies "returns a named, typed refusal string... never a
bare throw." *Finance PDK, rule 4,* `.../2026-07-23-finance-process-design-kit.md`.

### 4.3 Law imports are digest-pinned (ruled practice, confirmed against two
independent codebases)

A die that consumes another die's law MUST read that law by content digest
and MUST refuse on drift. *Rule 3, software PDK,* citing
`economic-frontier-composition-service` sha-pinning
`economic-cycle-observation-service/src/service.mjs` on every invocation.
The finance PDK independently confirms the identical rule at rule 2,
including a second order of pinning: a die that consumes an *upstream die's
source file itself* pins that file's digest and refuses with a named,
typed drift code if the upstream law has moved since the pin was recorded.

### 4.4 Wiring is code or it is nothing (ruled practice)

A connection between two dies exists only when an import, a client call, or
a contract file demonstrates it. Declared wiring (a manifest field naming a
circuit) MUST mirror evidence that already exists and MUST NOT invent a
connection prose alone asserts. *Rule 4, software PDK.*

### 4.5 Fabrication is subtractive (ruled practice)

Dead invocation layers, unused shims, stale pins, duplicate trees, and
jargon burying a die's capability sentence MUST be removed, with tests kept
green. Interface material MUST NOT be added by default; a new face MUST be
demanded by a consumer that exists before it is built. *Rule 5, software
PDK.*

### 4.6 One register (ruled practice; grounded in the earned-names
discipline of Section 3)

Classification of a unit's place in the tessellation (die / enterprise /
node / circuit) MUST live in structured records. Prose descriptions of a
die's capability MUST state that capability in the plain terms of the
software register; "die" itself is written as a lowercase register word,
never an acronym, per Section 3's own definition. *Rule 6, software PDK.*
This rule is the direct software-register instance of the framing's general
rule that "within a domain the register is the domain's own (software
speaks software)," per
`.../2026-07-23-eda-as-diagenetic-zeolitization-of-digital-information.md`.

### 4.7 Exact attributable replay evidence (ruled practice)

A stored status, health, or value MUST bind the exact inputs, profile, result,
attribution, and material required to re-run its check. *Rule 7, software PDK.*
Producer identity neither proves nor disproves the result. The finance PDK's
rule 5 confirms the identical discipline for evidence: absence of evidence
MUST be its own carried state, never folded into zero or false, so that a
report never says "no problem found" indistinguishably from "did not look."

### 4.8 Cell library and design-rule checks (method)

A department adopting this specification SHOULD maintain a cell library:
exemplars in its own register that pattern-match the rules above, cited by
running path rather than described in the abstract. This specification's
own cell library, inherited from the software PDK and re-executed from
declared evidence at draft time where noted, is: `formation-lianqun` (circuit
of dies: the academy's live formation circuit, successor to the
`formation-mape-chain` retired 2026-07-18 as excluded prior art) and
`union-recovery-service` (enterprise-scale die: card, contracts, own
ledger, typed refusal). See Section 2 for exact paths. A department MUST
run its design-rule checks rather than re-derive them by inspection; the
software PDK names `npm run verify` / `npm test` (or `node --check` on
changed files where no such script exists) as the baseline check, plus the
office-level conformance sweep the executive office itself runs.

### 4.9 Diagenetic zeolitization of the department's own knowledge (thesis,
practiced in-corpus)

A software team adopting this specification SHOULD treat its own design
discussions, incident notes, and architecture debates as semiocenic
material subject to the same process: thick prose SHOULD be compacted into
term records, contracts, and PDK-style rule lists rather than left as
standing context every future session must re-read. The precedent this
rule is drawn from is the Leader Movement Team's own internal
zeolitization cycle — measure where a prose bed's utterances sit, propose
term records and PDK projections at a cheap inference tier, and seat only
what a separate judging locus accepts — never the measurer seating its own
proposal. *Source:* `.../services/zeolitization-service/PROCESS.md`. This
rule is thesis-grade: it is a direct organizational analogy to Sections
4.1–4.8's code-facing rules, offered because the same framing produced both,
not because an isomorphism between "code die" and "term record" has been
proved.

### 4.10 Scale is polysemous by law (thesis, Leader-admitted)

A die, when read at a different scale, is legitimately a program, a model,
or a circuit, and the same object read at different scales inside an
enterprise, then across enterprise/nation/colony/union, is the paradigm's
VLSI tower. A conformant implementation MUST NOT treat this polysemy as
inconsistency to be collapsed; the die glossary term (Section 3) states
this scale-polysemy as the thing "the lawful polysemy is what prevents
scale collapse." *Source:* `.../glossary/terms/die.json`; founding
statement at `.../leader-speech/2026/07/21/2026-07-21-leader-movement-team-leader-speech.jsonl` line 32.

## 5. Conformance

An implementation conforms to Zeolitic Software Development at one of two
levels:

**Die-level conformance.** A single unit conforms if it satisfies Sections
4.1, 4.2, 4.3 (where it consumes another die's law), 4.4, and 4.7, and its
own design-rule checks (Section 4.8) pass when run, not when asserted.

**Department-level conformance.** A team conforms if every die it ships is
die-level conformant, its fabrication practice satisfies Section 4.5, its
classification and prose satisfy Section 4.6, and it maintains a cell
library and runnable checks per Section 4.8. Sections 4.9 and 4.10 are
SHOULD-level and their absence does not by itself break conformance; their
presence is what distinguishes a team practicing the paradigm from a team
that has merely satisfied its code-facing rules by coincidence.

No implementation is certified conformant by this specification itself.
Conformance is a claim the implementing team makes and demonstrates by
its own re-runnable checks, per Section 4.7's own rule applied reflexively:
this specification MUST NOT be used to assert a die's conformance in place
of running that die's checks.

**This draft is not released.** Promotion past DRAFT-FOR-LEADER-REVIEW —
including any external publication, GitHub release, or license grant —
requires a recorded Leader (or Leader-delegate) disposition, per
`emsenn/requirement/automated-idea-to-standard-document-release-circuit`
and the owning node's own `PROCESS.md`, step 5.
