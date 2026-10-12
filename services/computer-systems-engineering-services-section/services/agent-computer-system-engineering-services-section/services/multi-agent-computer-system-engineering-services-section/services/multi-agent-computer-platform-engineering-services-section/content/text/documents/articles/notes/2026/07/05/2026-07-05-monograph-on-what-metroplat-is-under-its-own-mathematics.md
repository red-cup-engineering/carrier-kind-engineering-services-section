---
title: "What MetroPlat Is, Under Its Own Mathematics: A Reader's Monograph"
description: "One synthesized account of the metroplat package — its matter, time, anatomy, thermodynamics, phases, language, work, play, and organism — written by an AI staff researcher from primary reads, using each concept's earned name at each mention, with maturity tags carried per claim."
date-created: 2026-07-05
keywords:
  - monograph
  - settlement
  - kinematic-region
  - infomatter
  - phase
  - witness-journal
  - chl
  - ludics
  - nomenclature
  - register
status: synthesis monograph; cannibalizes prior notes (cited by path); primary reads by the author 2026-07-05; maturity tags per claim, never silently upgraded
---

# What Infography [renamed later to MetroPlat] Is, Under Its Own Mathematics

## 0. Reading contract

This is one reader's study — Claude Fable — of what the `@emsenn/metroplat` package actually
is. It is written under the package's own mathematics, not translated into industry vocabulary.
Every term is defined at its first use. Every claim carries a tag: **[proven]** (a Lean theorem
exists, named), **[ruled]** (an operator ruling, cited), **[measured]** (an audit ran, numbers
exist), **[built]** (live code, read by this author), **[research]** (derived but unformalized —
including this author's own syntheses, marked as such), **[conviction]** (drift identified this
session, with file and line). Sources are repo paths. Where this author's knowledge came through
a locator's quotation rather than his own read of the primary, the tag says **[located]**.

The one-sentence answer, unpacked by everything below: **metroplat is an
instrument that realizes a Web-conformant kinematic region for informational
matter — a settlement — and its agentic features are boundary phenomena of that
region, not its ontology.**

## 1. The matter

The physics has exactly one admitted atom and one admitted act. The atom is the
**Mark** — an opaque surface datum, "built from nothing." The act is the
**Utterance** — the pairing of a token-mark (identity-carrying) with a
claim-mark (content-carrying); the two roles are proved exhaustive and
distinct (`Kind.two_kinds`, `Kind.token_ne_claim`, `Infomaterial/Primitive/Mark.lean`)
[proven]. Everything else in the system is derived from repeated articulation — the "no free data" law
(`infomaterial/CLAUDE.md`) [ruled].

**Infomatter** — this author's collective term for what the instrument holds,
used in the operator's own session language — is *witnessed claims*: assertions
charged in the FOUR. The **FOUR** is Belnap's bilattice
{⊥ told-nothing, t told-for, f told-against, ⊤ told-both} with two distinct
orders — knowledge (≤k, information) and truth (≤t, with negation as
involution) [proven, `lib/calculus/predicating/positing/bilattice-charge.mjs`
realizes it; the Lean conflations are theorems, `QuartetRecurrence`]. The
load-bearing non-classicality: **⊤ is held, never resolved away** — a
contradiction is the *most informative* state, not an error. All computing here
is paraconsistent and information-theoretic; booleans and exceptions are lawful
only at host boundaries [ruled, root AGENTS.md].

A claim becomes matter by being **witnessed**: appended as one EAVT row
(entity, action, value, time) to an append-only log. The witness is not a
record *about* the matter; it *is* the matter. Duplicate witnesses cost zero
surprisal and therefore append nothing — dedup is a law of information, not an
optimization.

## 2. Time

The settlement has no clock [ruled, pinned intension clause 3,
`2026-07-03-research-on-naming-the-whole-system.md`]. Time is induced per
admitted boundary event; history is a **causal order**, and the extent between
two admitted moments is a **diamond** — the corpus's proven causal shape
(`Infomaterial.Relational.Spacetime.Causal.Cone.Diamond`) [proven]. A bounded
request/response is a diamond. A work item's life from opened to settled is a
diamond. A session or run is a **region** — not an
event, not a point: "the 'session list' every harness renders is a chart on a
space whose points are regions"
(`2026-07-01-research-on-the-kinematic-space-of-runs.md`) [research, cited].
The space of a settlement's diamonds is itself a causal set — the **kinematic
space** K(C), with hole/horizon/shroud machinery inherited by instantiation
(`HoleDiamondCausalSet.lean`) [proven, located].

Vendor session lists (Claude's, Codex's) are *charts* — coordinate systems
over the one region-space — and building separate ontologies per vendor chart
mistakes coordinates for the manifold. See §10.

## 3. The region and its anatomy

The whole assembled artifact is a **settlement** [ruled 2026-07-03, refined
2026-07-04: **site** is the genus — a bare structure/topology/rule; a settlement
is a site *inhabited*, holding accreted content that satisfies its own rule.
The split is grounded independently in three Lean domains: Grothendieck
`Site`/`Sheaf`, `Hole`'s substrate-vs-shroud-content, `Glass.lean`'s
rule-plus-admissible-word]. Anatomy, all [ruled] in the naming consolidation:

- The **plate** is the settled tiers of a directory — what survives the process
  dying. Append-only; its body is its own layered history, read
  stratigraphically.
- The **dish** is the live interactable surface running over a plate — the
  listener that evaporates on kill. A live dish is the most specific recognizer
  of its own plate: current truth flows only through its faces; the on-disk cut
  is a stale artifact.
- The **hole** is the settled core: the no-readout interior,
  `HoleRegion(C,R) = C \ J⁻(R)` — events that cannot causally reach the chosen
  readout [proven, `Boundary/Hole.lean`].
- The **shroud** is the hole's edge: hole events causally adjacent to
  readout-exterior events [proven]. Presence-reading of live sessions
  ("deshrouding") is an *application* of this predicate whose implementation
  object outruns its realization [research/red-node,
  `2026-07-03-research-on-causality-process-ordering-and-kinematic-regions.md`]
  — live code already uses the word without the underlying math (see §10).
- **Occupation corners**: bare/inhabited × dead/live [ruled]. Raw plate reads
  (**excavation**) are lawful exactly at dead or bare corners; excavating an
  operating settlement bypasses its dish and is unlawful [ruled].
- Scale needs no new noun: one settlement and a mesh of settlements are the
  same genus (the `Hole` endofunctor) [proven]; a settlement grown of
  settlements is a **conurbation** of **constituents**, with
  predecessor/successor as plain causal order — colony/metropolis vocabulary
  is refused [ruled].

**Web-conformant** means: the region's boundary speaks public standards, and
only the boundary. Every outward face — HTTP, MCP, CLI, ActivityPub — is a
channel code of the one witnessed source (WMAP) [ruled, root AGENTS.md].
Industry words (server, API, harness) are lawful only out there, naming
exterior things.

## 4. The thermodynamics

The witness substrate — of which the **witness journal (WJ)** is the
RMN-carrying subtype — is the settlement's
thermodynamic law. Four tiers: **log** (source; append-only witness rows) →
**state** (sufficient statistic) → **record** (rate-distortion code) →
**content** (lossy cut). The chain is a Markov chain governed by the
data-processing inequality: information is monotone non-increasing along it.
Every read of "current state" is a derived, provably-lossy statistic of the
log; nothing is ever a stored fact mutated in place.

This author's synthesis [research, mine]: the tiers are **condensation
phases** of infomatter — the same matter at decreasing entropy, increasing
structure — and several operational crises are phase-transition failures, not
hygiene problems. An admit-invocation log and a record artifact left
undriven are matter accumulating in its least-condensed phase because the
condensation transitions are not being driven. The
phase diagram says where compute must be spent: driving log→state→record
transitions, not storing more gas.

## 5. The phases of infomatter

The material spine is a ladder of **phases** — organizational states of the
same matter, distinguished by measurable order parameters, not different
substances: **tile** (a finite local rule together with one admissible word of
it) → **bead** (tiles plus the lenticular ported-thread layer) → **crystal**
(periodic occupation; zero-cycle/forest coordination, `h1_vanishes_iff_forest`)
→ **quasicrystal** (aperiodic pure-point diffraction; nonzero aperiodic
witness class) → … → **hole** (the settled, no-readout phase). Structures
[proven, `Relational/Material/Glass.lean`, located verbatim]; phase-ladder
readings [research,
`2026-06-29-research-on-the-informational-matter-phase-ladder.md`].
"Keratinous" names a phase in this ladder — hair-like matter — and its global
representing object is an open frontier claim-site [red-node, ruled]. The
order parameters that assign phase are computable: regime signature
(strict < Scott < transfinite-bounded < aperiodic), H¹ obstruction rank,
diffraction/coordination readings — a mostly ordinal-valued coordinate system
(see §6).

## 6. Language, recognition, and the coordinates of naming

Recognition in this system is never a registry. **CHL** — the proven
Curry–Howard–Lambek correspondence
(`Infomaterial/Language/Predicating/CurryHowardLambek.lean`) [proven] — makes a
well-typed term its own proof. Reduction is Church–Rosser
confluent [proven], so meaning is evaluation-order-independent. Every
representation the system speaks — JSON, EAVT rows, English, Lean —
is a leg of a **cone** whose apex is the RMN term language; recognition
happens once, at the apex [ruled, package CLAUDE.md].

Names, in turn, are **readouts**, and their vocabularies — **registers** — are
claimed to be forced, not stylistic [conjectured, not measured]: a register
would be an *earned concept* of the corpus's own consumed-structure incidence.
Register vocabulary worn without its forcing structure is the pathology named
by the four-pathologies audit — connotation, absence-disguised-as-presence.

The **lexical coordinates** of an occurrence [research], as corrected in
`2026-07-05-research-on-lexical-coordinates-of-structure-occurrences.md`:
`generatedConcept` does not take a pre-unioned profile `cl(P(S) ∪ C(o))`.
The live Lean takes a term in a chosen `TermContext`; the occurrence must be
modeled as a term `t_o`, and its concept is `generatedConcept(C, t_o)`, whose
profile is internally `fun q => C.incidence q t_o`
(`Site/Intension.lean`, `generatedConcept_extent_closed` and
`generatedConcept_in_intent` [proven]). The proof-level profile and the
code-consumption profile are therefore different possible incidence relations,
not two arguments to one closure call. An earned register selected from the
measured occurrence then *anchors* — never constructs — the name. The
coordinate vector (concept position; register vote; regime, spine-depth,
substance-rung, K-level ordinals; H¹ rank; four-corner position;
metallization side, plus the unit shape being named) says where an occurrence
is *measured to be* regardless of what it is currently called. Aliasing (two
anchors, one register) breaks nomenclature-as-function; polysemy (one anchor
per register) is lawful and forced. This is why the operator's standing rule —
find the corpus's name and use it, never alias toward familiar vocabulary — is
a theorem-shape, not a style preference.

And the engineering thesis that follows, the operator's own [ruled in
practice, stated across sessions]: **the language of the code is an epistemic
filter at write-time.** Code whose operational surface speaks the earned
registers cannot be extended by gloss — an agent must think in the system or
fail early. Code whose surface speaks corn (store, server, row, cache) teaches
every arriving writer the wrong physics. The modeling environment is the
curriculum; nomenclature normalization is therefore *development process*, not
documentation.

## 7. Work

A **commitment** is a four-tuple (A, φ, τ, P) — agent, act-class, deadline,
principal (the Hohfeldian correlative right-holder) — binding iff
transfer-nucleus-fixed at creation: carried into all downstream histories,
never retracted
(`triage/content/_archive/.../from-philosophy/commitment.md`) [research,
archived; read in full]. This author's identification [research]:
**the witnessed append is the transfer nucleus's fixed layer,
realized** — schema admission is meaning-settlement, the append is
execution-binding; full commitment = admitted + witnessed. A **goal** is a
triple (g, τ, κ): a target element present but unsettled, a target history
giving the completion criterion, and a commitment binding an agent to drive g
to settlement by τ — with exactly three *derived* terminal verdicts (achieved:
doubly-nuclear-fixed at τ; frustrated: τ passed unsettled; abandoned: κ
released) (`goal.md`, same archive) [research; read in full].

Commitment is caller-declared, **never a text-classifier's guess** [ruled
in code]. The **duty** five-tuple and the **endeavor** five-tuple (A, G, K, E, F)
are pinned in the archived sociology [research, located].

## 8. Play

The playing faculty's mathematics is Girard's ludics. A productive
conversation is a converging dispute; a session that talks for hours without
daimon or diff is a diverging interaction. The operator's target — agents
playing and talking across a shared territory until things settle toward
good form — is this mathematics *as an operations doctrine*: the settlement's
work spine is the arena, moves are declared claims, and settling is literal,
the monotone judge fold reaching its fixed point [research, synthesis].

## 9. The organism

The settlement operates itself through readings of its own plate — the
cybernetic body the operator pictures. An **instrument** — the
ruled intension — is a prepared obstruction: a lawful obstruction field that
makes material articulate through structured resistance [ruled]. MetroPlat
is an instrument whose faculties include computation; agentic capability is
one feature, never the ontology [ruled, root CLAUDE.md].

## 10. The recurring error, named: readings reified as matter

The single error class found across the tree [conviction, class named]:
**reifying a reading as a substance.** A phase is how matter is organized; a
chart is how regions are coordinatized; a cut is how a plate is sliced at a
moment; a face is how the source is encoded to a channel; a register is how a
concept is read out. Every one of these is a *projection*, and the founding
law of the whole physics — state, record, content derived from the log;
recognition at the apex; faces owning transport and nothing else; names as
readouts — is one repeated prohibition of promoting projections to matter.

The repair discipline is uniform because the class is one: find the matter the
reading projects from; express the reading as a derivation of it (a cut, a
face, a register anchor); delete the reified stand-in; and name the result in
the earned register so the next writer inherits the physics, not the corn.

## 11. What this is

A **settlement**: a located, bounded artifact holding an append-only settled
interior, interacting only at a standards-speaking boundary, clockless, its
history a causal order, every visible face a derived projection, composing
with its kind into conurbations without hierarchy [ruled, pinned intension].
An **instrument**: a prepared obstruction field that makes informational
matter articulate [ruled]. A **kinematic region realized on the Web**: holes,
shrouds, diamonds, and phases with proven mechanics, whose "AI" is not the
LLM that visits it but the settling itself — the monotone, paraconsistent,
self-reading dynamics of witnessed matter [the operator's founding vow:
LLMs are scaffolding; the goal is a system that does not need them —
`2026-03-07`, via campaign plan §2]. The agents (this author included) are
boundary phenomena: readouts with hands.

What stands between the live tree and that sentence being plainly true is not
missing invention — it is the error class of §10 worked through the tree with
the discipline of §6, on the spine of §7, at the altitude this monograph was
written from. The mathematics is already here. The corn is already named. The
work is to make the code speak its own physics so that no future reader —
human or model — can write anything else.

The physics has exactly one admitted atom and one admitted act. The atom is the
**Mark** — an opaque surface datum, "built from nothing." The act is the
**Utterance** — the pairing of a token-mark (identity-carrying) with a
claim-mark (content-carrying). Both live in
`lib/articulation/utterance.mts` [built] and
`Obsmetrologia (“Infomaterial” at time of writing)/Primitive/Mark.lean` [proven]; the two roles are proved exhaustive
and distinct (`Kind.two_kinds`, `Kind.token_ne_claim`). Everything else in the
system is derived from repeated articulation — the "no free data" law
(`infomaterial/CLAUDE.md`) [ruled].

A claim becomes matter by being **witnessed**: appended as one EAVT row
(entity, action, value, time) to an append-only log. The witness is not a
record *about* the matter; it *is* the matter. Duplicate witnesses cost zero
surprisal and therefore append nothing — dedup is a law of information, not an
optimization. **Citation correction:** this rewrite could not confirm the
identifier `witnessLogInformation` or the path `lib/persistence/index.mts:259-271`
anywhere in the current tree; the confirmed real mechanism for this same
dedup law is surprisal-based, keyed on `eavtId` — a hash of the canonical row
that gives idempotent append (see the witness journal glossary term,
`lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/emsenn-services-section/content/text/glossary/terms/witness-journal.md`)
[built, tested].

The settlement has no clock [ruled, pinned intension clause 3,
`2026-07-03-research-on-naming-the-whole-system.md`]. Time is induced per
admitted boundary event; history is a **causal order**, and the extent between
two admitted moments is a **diamond** — the corpus's proven causal shape
(`Infomaterial.Relational.Spacetime.Causal.Cone.Diamond`) [proven]. A bounded
request/response is a diamond. A work item's life from opened to settled is a
diamond (`lib/closure/analysis/work-ledger-causal-set.mts`) [built; this
author derived a real one on a scratch site this session: an endeavor's child
campaign, opened 17:56, settled 17:57, rendered as a Lorentzian causal set with
an exact-rational ordering fraction]. A session or run is a **region** — not an
event, not a point: "the 'session list' every harness renders is a chart on a
space whose points are regions"
(`2026-07-01-research-on-the-kinematic-space-of-runs.md`) [research, cited].
The space of a settlement's diamonds is itself a causal set — the **kinematic
space** K(C), with hole/horizon/shroud machinery inherited by instantiation
(`HoleDiamondCausalSet.lean`) [proven, located].

Consequence this author missed for most of a session: vendor session lists
(Claude's, Codex's) are *charts* — coordinate systems over the one region-space
— and building separate ontologies per vendor chart mistakes coordinates for
the manifold. See §10.

**Web-conformant** means: the region's boundary speaks public standards, and
only the boundary. Every outward face — HTTP, MCP, CLI, ActivityPub — is a
channel code of the one witnessed source (WMAP) [ruled, root AGENTS.md];
verified live: `src/` and `lib/` contain zero filesystem or network access;
exactly four files under `services/` import `node:fs`; servers exist only in
`services/http` [measured this session, by search]. Industry words (server,
API, harness) are lawful only out there, naming exterior things.

The witness substrate — of which the **witness journal (WJ)** is the
RMN-carrying subtype — is the settlement's
thermodynamic law. Four tiers: **log** (source; append-only witness rows) →
**state** (sufficient statistic) → **record** (rate-distortion code) →
**content** (lossy cut). The chain is a Markov chain governed by the
data-processing inequality: information is monotone non-increasing along it —
a theorem-shaped law now realized by the witness/ledger engine at
`relating/src/ledger/` (confirmed real: `cells.mts, content.mts, feed.mts,
index.mts, memento.mts, provenance.mts, reading.mts, state.mts, store.mts,
stream.mts, time-anchor.mts`) and its `witness-journal-log-service`,
`witness-journal-state-service`, `witness-journal-record-service`,
`witness-journal-entry-service` split. **Citation correction:** this rewrite
could not confirm the identifiers `rwilInformationChain` or the path
`lib/persistence/index.mts:150-170` anywhere in the current tree; `lib/persistence/index.mts`
does not exist as a package path under that name in this checkout. The nearest
real analogue found is a differently-named, explicitly **not**
witness-journal-specific tier chain (`ArtifactTier`,
`artifactInformationChain`, `artifactProjectionStep`) in a *legacy* checkout at
`.../javascript-engineering-services-section/lib/legacy/metroplat/src/lib/records/persistence.mts`
— that file's own header states it is "Generic over EAVT, not RWIL-specific"
(quoted verbatim) and points to a narrower entry elsewhere for the
witness-journal-specific case, so it is flagged here rather
than substituted as if it were the same claim [built, tested;
the note `2026-06-25-research-on-witness-journal-the-relation-witness-information-log.md`
grounds ≤k as an information order]. Every read of "current state" is a
derived, provably-lossy statistic of the log; nothing is ever a stored fact
mutated in place.

This author's synthesis [research, mine]: the tiers are **condensation
phases** of infomatter — the same matter at decreasing entropy, increasing
structure — and several standing operational crises are phase-transition
failures, not hygiene problems. The ~750MB admit-invocation log and the 222MB
record artifact (the "fat-log rehabilitation" front item, campaign plan §6)
are matter accumulating in its least-condensed phase because the condensation
transitions are not being driven. The "gigabytes of crufty data a day" that
forced the operator to kill the event hooks was the same failure amplified by
an admission source (see §10's read-that-writes conviction). The phase diagram
says where compute must be spent: driving log→state→record transitions, not
storing more gas.

**The operator's correction, 2026-07-05, carried as a finding of this
monograph** [conviction]: the live package repeatedly treats *phases as matter
itself* — reifying organizational states into ontological kinds. A phase-named
structure or service (e.g. `holeKeratinousBoundaryStructure`,
`src/structures/sites/index.mts:336`) makes a *state* into a *thing*, which
forecloses exactly what the physics is for: the same matter transitioning
between phases under measurable dynamics. The general class of this error is
§10's subject.

Recognition in this system is never a registry. **CHL** — the proven
Curry–Howard–Lambek correspondence
(`Infomaterial/Language/Predicating/CurryHowardLambek.lean`) [proven] — makes a
well-typed term its own proof: `hasTy` answers "what is this" by constructing a
derivation against the term's own shape, one rule per constructor
(`src/evaluators/index.mts:349-397`) [built]. Reduction is Church–Rosser
confluent [proven], so meaning is evaluation-order-independent. Every
representation the system speaks — JSON, EAVT rows, English, Lean —
is a leg of a **cone** whose apex is the RMN term language; recognition
happens once, at the apex [ruled, package CLAUDE.md]. Addresses are proof
terms: a witness path projects to a typed product of marks, and
`checkTy([], term, PATH_TY)` — not a regex — is the proof the address
composes (`src/stores/path-term.mts`) [built].

Names, in turn, are **readouts**, and their vocabularies — **registers** — are
claimed to be forced, not stylistic [conjectured, not measured]: a register
would be an *earned concept* of the corpus's own consumed-structure incidence.
A same-day attempt to measure this (`2026-07-04-nomenclature-registers-as-forced-readouts.md`
§9) was deleted 2026-07-05 as unreliable — its numeric findings should not be
cited or relied on. The conjecture remains open pending a real, hand-verified
measurement. Register vocabulary worn without its forcing structure is the
pathology named by the four-pathologies audit — connotation,
absence-disguised-as-presence — independent of the deleted measurement.

A **commitment** is a four-tuple (A, φ, τ, P) — agent, act-class, deadline,
principal (the Hohfeldian correlative right-holder) — binding iff
transfer-nucleus-fixed at creation: carried into all downstream histories,
never retracted
(`triage/content/_archive/.../from-philosophy/commitment.md`) [research,
archived; read in full]. This author's identification [research, this
session]: **the witnessed append is the transfer nucleus's fixed layer,
realized** — schema admission is meaning-settlement, the append is
execution-binding; full commitment = admitted + witnessed. A **goal** is a
triple (g, τ, κ): a target element present but unsettled, a target history
giving the completion criterion, and a commitment binding an agent to drive g
to settlement by τ — with exactly three *derived* terminal verdicts (achieved:
doubly-nuclear-fixed at τ; frustrated: τ passed unsettled; abandoned: κ
released) (`goal.md`, same archive) [research; read in full]. Its aperiodic
dual is the **telos** — `regime: aperiodic` and `satisfiable: false` as schema
*constants*, `declaredBy` required, progress a ≤k-monotone counter: "a boolean
`satisfied` would be a category error"
(`agential-relationality/organizing/src/schemas.mts:1710`) [built, quarry].

Work is carried on the six-level **work spine** — endeavor > campaign >
project > plan > task > work-item (`src/capability/index.mts:554-`) [built] —
where declaring any level means one write call with a claim at a `level:id` cell,
`obligation` opens, `discharge` settles, and status is derived by the judge
fold over the causal set, never asserted [built; the row-shape seam that made
declarations invisible to their own cut was found and fixed by trace this
session, `services/holography/index.mts`]. Commitment is caller-declared,
**never a text-classifier's guess** (`work-ledger-causal-set.mts:15`) [ruled
in code]. Authority is **jural** — claim/duty/privilege/power with
correlativity, offices with investiture, delegation never relieving
accountability (`src/capability/index.mts:674-687`; quarry `office.mts`)
[built]. The **duty** five-tuple and the **endeavor** five-tuple (A, G, K, E, F)
are pinned in the archived sociology [research, located].

The playing faculty's mathematics is Girard's ludics, realized twice in this
corpus and absorbed once [`2026-07-05-research-on-ludics-as-the-playing-and-gaming-faculties.md`;
quarry `apps/{playing,gaming}`, feltos port] [built, quarry; read this
session]: a **design** is a charge valuation over loci — the four locus
polarities are the four FOUR corners; a design is a single-column Chu space,
and the live `chu.mts` dual is its generic engine [built]. Interaction
converges when a **daimon** is played — the "this is settled, I stop" move —
and **orthogonality** (convergence) closes behaviours under the bi-orthogonal
Galois operator [built, quarry]. An **arena** is a polarized prime event
structure with a symmetry groupoid [built, quarry]. The reading this session
proved on its own author: a productive conversation is a converging dispute; a
session that talks for hours without daimon or diff is a diverging
interaction. The operator's target — agents playing and talking across a
shared territory until things settle toward good form — is this mathematics
*as an operations doctrine*: the settlement's work spine is the arena, moves
are declared claims, and settling is literal, the monotone judge fold reaching
its fixed point [research, this session's synthesis].

The settlement operates itself through readings of its own plate — the
cybernetic body the operator pictures, partially live today [built, with
convictions]: the **suit** packs a query-restricted, token-budgeted sufficient
statistic over already-read material, ranked by charge height in the knowledge
order — ⊤ outranks agreement, omissions counted, never silently truncated
(`src/running/suit.mts`) [built; read in full]; **obsticulation** — the
red-node coinage for resistance-under-observation becoming carried structure —
is realized as refusals becoming witnessed obligations
(`src/running/obsticulation.mts`) [built, red-node name]; the **orientation
lens** composes fleet, presence, duties, scale, and the adjudication queue
into the one cut an entering agent wakes to (`services/state-cuts`,
`orientation` deriver) [built; its transports — the SessionStart wake read and
per-turn fleet read — were killed 2026-07-04 as collateral of write-spam and
restored read-only 2026-07-05]; the **agent-worker** picks up undischarged
obligations and executes with every step witnessed and spend read back as the
inference-cost cut (`services/agent-worker`) [built]. An **instrument** — the
ruled intension — is a prepared obstruction: a lawful obstruction field that
makes material articulate through structured resistance [ruled]. MetroPlat
is an instrument whose faculties include computation; agentic capability is
one feature, never the ontology [ruled, root CLAUDE.md].

The operator's example — "metroplat currently treats phases of infomatter as
matter itself" — is one instance of the single error class this author now
finds everywhere he was shown drift this session [conviction, class named]:
**reifying a reading as a substance.** A phase is how matter is organized; a
chart is how regions are coordinatized; a cut is how a plate is sliced at a
moment; a face is how the source is encoded to a channel; a register is how a
concept is read out. Every one of these is a *projection*, and the founding
law of the whole physics — state, record, content derived from the log;
recognition at the apex; faces owning transport and nothing else; names as
readouts — is one repeated prohibition of promoting projections to matter.
Instances found in the live tree, each with its address:

1. **Phase as matter** — phase-named structures/services making organizational
   states into kinds (§5; `holeKeratinousBoundaryStructure` and kin)
   [conviction, operator-identified; class-confirmed by this author].
2. **Text as commitment-matter** — the goals classifier: every user message a
   "goal," obligations by keyword regex, cells keyed by normalized text
   (`src/running/session.mts:1008-1019, 949-954`) — a *reading of prose*
   reified into the work ontology, violating the caller-declared law one
   import away [conviction, traced this session].
3. **The slice as the state** — derived cuts persisted as artifacts that then
   compete with the matter they sliced: the wake read's stale-artifact
   fallback, the 222MB record blob; the naming ruling already says the on-disk
   cut is a stale artifact and current truth flows through the dish
   [conviction/known-front-item, re-derived as class instance].
4. **The chart as the territory** — per-vendor session services
   (`services/claude-session`, `services/codex-session`) building separate
   ontologies over what the kinematics says is one region-space under two
   charts [conviction-class, this author; wiring targets, not deletions —
   rescope, don't delete].
5. **A reading that writes** — deriving a status cut *witnessing* its own
   classifier output back into the log
   (`services/state-cuts/index.mts:355`): a projection feeding itself back in
   as matter, the mechanical cause of the gigabytes-per-day that forced the
   2026-07-04 hook kill [conviction, traced].
6. **Register worn without structure** — vocabulary as connotation: live
   "deshrouded" presence-reading over an application structure the corpus marks
   unbuilt; ~60% of aperiodic-tagged files carrying the label without the
   mathematics [measured, four-pathologies audit; verdict on the presence
   deriver pending this author's read].
