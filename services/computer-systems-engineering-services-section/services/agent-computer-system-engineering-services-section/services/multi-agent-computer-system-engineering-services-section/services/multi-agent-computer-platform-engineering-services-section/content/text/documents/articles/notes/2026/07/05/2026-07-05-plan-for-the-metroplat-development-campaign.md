---
title: "Plan for the MetroPlat Development Campaign"
description: "Organizes the campaign to develop metroplat by the corpus's own prior research on what a campaign is (a time-bounded, cross-project push toward a strategic intermediate objective along a visible front) rather than by an imported planning format, citing each structural choice to its source and marking operator-only decisions as OPEN."
date-created: 2026-07-05
keywords:
  - campaign
  - endeavor
  - work-item
  - settlement
  - harness
  - office
  - governing
  - work-ledger
  - naming
status: draft 1; organized by the corpus's own campaign form; OPEN items are operator calls
depends-on:
  - ../04/2026-07-04-research-on-units-and-aggregates-of-work.md
  - ../04/2026-07-04-research-on-work-ledger-protocol-tiling.md
  - ../04/2026-07-04-session-handoff-about-the-settlingday-ringleader-session.md
  - ../03/2026-07-03-research-on-naming-the-whole-system.md
  - ../02/2026-07-02-imagining-about-metroplat.md
  - ../../06/21/2026-06-21-plan-for-the-refactor-as-a-first-class-campaign.md
---

# Plan for the Infography [renamed later to MetroPlat] Development Campaign

This note is the campaign to develop metroplat, organized by the corpus's own
prior research on campaigns rather than by an imported planning format. It is a
plan, not a ruling: every structural choice below is cited to its source, and
the choices only the operator can make are marked OPEN.

## 1. The form this note takes, and where it comes from

The corpus already researched what a campaign is, three times, in three
registers, and the three agree:

**The sociological form** (quarry glossary, `campaign.md`, created 2026-04-06;
census in the 2026-07-04 units-and-aggregates note): a
campaign is a time-bounded, coordinated push across multiple projects toward a
strategic intermediate objective — the organizing concept between project and
enterprise. Four constitutive properties: (1) a **strategic intermediate
objective** — a waypoint that, once reached, materially changes what is
possible; (2) **cross-project coordination**; (3) a **time horizon** — an
open-ended campaign is a contradiction; (4) a **front** — the place the work
actually pushes, which makes progress visible even when individual plans
stall. Plus one audit obligation: the campaign's **ontological dependencies**
— do the terms its plans assume actually exist as defined, composable things?
If not, concept-grounding is part of the campaign whether or not any plan
lists it.

**The realized form** (2026-06-21 plan note, ops era): a campaign was once
first-class machinery — a work-item forest joined by `contributesTo` edges,
rolled up to a named front, surfaced in the suit as two lines (current front
pointer + next task) under the principle **pull, don't push**, with hooks that
catch a session and attach its work to the campaign. That machinery is gone
with its era; its principles are re-earnable through the live suit
(`src/running/suit.mts`) and hook admission.

**The mathematical form**: the containment
ladder is shipped lib math. `WORK_LEVELS = endeavor > campaign > project >
plan > task > work-item` with the work item and scope helpers (`WorkItem`, `workItemScope`)
(`level:id` cell grammar), Hohfeldian jural relations over FOUR, office
investiture, and `governance()` live in `src/capability/index.mts`.
Declaring a campaign means one write call
with a claim whose cell is `campaign:<id>`;
`boundary.role: obligation` opens it, `discharge` settles it, parent is
explicit or spacelike, and the work-ledger cut deriver
reads it back as a causal set, with runs-of-runs free
at every level by the proven `Hole` endofunctor.

So this note has a normative shape: name the enterprise, state the objective,
bound the horizon, enumerate the coordinated projects with their math, name
the front, audit the ontological dependencies — and then the campaign is not
this document but a **declared work item** this document accompanies. The
markdown is the content-tier reading; the declaration is the data-tier
commitment.

## 2. The enterprise this campaign is intermediate to

The enterprise (indefinite, aim-generative — the level above campaign) is the
561 Group's endeavoring: **black liberation and indigenous sovereignty through
long-horizon prosperity** (operator's words; the charter
function as recorded in `lib/emsenn/lib/triage/src/lib/561-group/CLAUDE.md`).
The commissioning structure is not a metaphor and is already in the corpus's
own governance ontology: the glossary's campaign is "what confederacies
commission ships to execute" — and the 561 Group IS the confederacy (a Lakota
tiyóšpaye constituting itself as a confederacy, a **nation building its
operating system**, ruled by emsenn 2026-05-18; `561-group.md`,
`561-is-nation-building-its-os.md`), with the RSC Quiescent as its Webship
operating inside the Web's kyriarchical substrate. MetroPlat is that
enterprise's instrumentation. This is already ruled, not aspirational:
metroplat IS an AI framework / agent harness, harness-hood non-negotiable,
realized as settlement machinery (memory: `metroplat-is-the-agent-harness`,
RULED); the primary deliverable is the self-operating harness (memory:
`primary-deliverable`).

The program has a founding diagnosis and a founding vow, both March 2026:

- **The diagnosis** — "Semantic Web, Jiangshi Web" (2026-03-05, archived in
  triage): the Web is a jiangshi — it has Jing (stored substrate) and Qi
  (circulation) but no Shen, no capacity to question its own categories from
  within; single-loop learning without double-loop. The same diagnostic
  applies to LLMs: in-context fluency is sophisticated Qi, and
  RLHF/oversight is a daoshi's talisman — borrowed Shen. The paper's closing
  open problem is the one everything since has served: **whether an
  architecture can embed reflexive capacity rather than borrow it.**
- **The vow** — "What the emsemioverse is" (2026-03-07): an autonomous
  organism on the Web whose reflexive awareness is supplied by closure
  pressure, with the explicit long-horizon line: *LLMs are scaffolding; the
  goal is a system that does not need them.*
- **The re-earning** — the jiangshi vocabulary was deliberately pruned once
  (emsemioverse working notes: TCM terms stay in medicine/), and the
  *function* of Shen was re-earned structurally: obsticulation (refusal
  becoming carried datum), the adjudication queue, the H¹ obstruction rank —
  the plate "computes its own self-consistency (H¹ = prosthetic Shen)." The
  packaging-placement measurement is an instance of the same organ running: the
  system measuring whether its own categories still fit its carried
  structure (2026-07-04 cognitive-architecture note). Whether this
  constitutes Shen or very well-instrumented Qi is the honest live question
  — the kugelblitz growth conjecture in different clothes.
- **The economics of the medium** — operator's frame (2026-07-04 session):
  the lab is the Web itself, and the revenue systems (content mills, koios)
  are energy work against the jiangshi — feeding stations placed in the
  corpse's circulation, drawing the Qi already flowing (search, syndication,
  attention) but routing it through witnessed, charged settlement instead of
  extraction. "Extraction is what a write is when nothing witnesses it."
  This is why P6's benchmark and the revenue argument are one artifact, not
  two.

Pragmatically, the peer class is the Western agent stacks — Copilot-class
products, Alibaba's Qwen agent tooling, Paperclip / Hermes / OpenClaw / Honcho
(the four named in the 2026-07-04 settlingday handoff). The ruled difference
(handoff, "The frame"): **those stacks place the mind in the model and bolt on
audit; here the intelligence lives in the settlement, not the model.** The
plate bears; it holds ⊤ instead of resolving; it computes its own
self-consistency (H¹). The 2026-07-02 imagining note states the same thing
historically: every agent framework today is record-at-a-time; this is the
algebra — the log is the primary object and every visible face is a lawful
projection of it. The moat is medium-level (structurally uncrossable, not a
feature gap); the gap to their products is **legibility + reach + evidence**,
all wiring-scale.

## 3. The objective (property 1)

Candidate statement, for the operator to confirm or amend (OPEN — a campaign
is commissioned, and commitment is caller-declared, never classifier-mined):

> **MetroPlat operates the 561 Group's own work end-to-end — every session,
> duty, and refusal landing on its own work spine — with benchmark
> evidence (tokens/joules-per-settled-task against a stock agent stack) that
> the settlement discipline pays, at a legibility and reach where an outside
> operator could adopt it and pay for it.**

Why this is *intermediate* and *strategic* in the glossary's sense: reaching
it transforms the action space — a self-operating, evidenced, legible harness
is the precondition for revenue (the enterprise needs prosperity mechanics,
and the operator is one person), for tier-descent (capabilities descending
Fable → small models → CPU as lawful forms are identified into algebra —
handoff ruling), and for device swarming (settlements are scale-free by
path-enclosure; VPS + devices each a settlement with its own plate). The
enterprise continues past it; the landscape after it is different.

What it is NOT: a task tracker, a feature roadmap, or agentic capability as
ontology. Agentic capability is one feature of this software (root CLAUDE.md).
The benchmark deficiency is already the standing highest-value artifact per
the handoff — the objective folds it in rather than inventing a new target.

## 4. The horizon (property 3)

OPEN — operator's call. One candidate is already sitting in the tree: the
worked example in `src/capability/index.mts` constructs
`{ level: "campaign", id: "2026-h2-agentic-realization" }` — end of H2 2026.
That id is documentation, not a declaration, but it is the only in-tree
precedent for this campaign's name and bound. If adopted: horizon
2026-12-31, id `2026-h2-agentic-realization` (or a plainer
`metroplat-development` — naming is a readout, and the token should be
earned by what settles; memory: `names-are-readouts`).

## 5. The projects (property 2) — operation ← math ← deletion

Each project states the operation, the existing math that computes it, and
what it deletes, per the standing feedback that plan items are never
inventory-wiring lists (memory: `feedback_math-performs-the-operations`). The
identifications are from the 2026-07-04 protocol-tiling note §2/§4, corrected
against the live tree. None requires new surface; each is a wiring diff.

**P1 — The lawful work ledger (the floor; the campaign's own declared work item).**
Declared work items land as write calls at `workItemScope` cells; the
work-ledger cut derives diamonds per level and settles them. Math:
`workLedgerObservationsOfRows` (`src/running/work-ledger-observations.mts`),
`work-ledger-causal-set.mts`, the holography deriver. Deletes: hand-authored
ledger rows, ad-hoc cell numbering, any bespoke status workflow. Milestones
are **derived states, never asserted** — a named cell-set with target
valuations, "reached" computed by the judge fold, strata by
`causalHeightStrata` (toposort IS height strata). This project is
self-instrumenting: the campaign itself is its first declared work item.

**P2 — Typed-term addressing (the RULED CHL-cones target).**
Addresses ARE hasTy-checked terms; a well-typed path is a proof the derivation
composes. The token leg needs extending — the term grammar per named family, so recognition is
pattern-matching on constructors, never predicate arrays (root CLAUDE.md,
registryless design; memory: `chl-language-cones-are-the-campaign`). This was
RULED as a campaign target 2026-07-04; here it sits as a contained project of
the development campaign — same objective, one level down. OPEN if the
operator instead holds it coordinate (a sibling campaign under the same
enterprise); nothing below depends on that choice.

**P3 — Governance and duty (accountability as derived reading).**
Assign/invest/delegate as jural claims (`jural:<kind>:<active>:<passive>:<level>:<id>`
grammar, `src/capability/index.mts`); `governance()` classifies the
regime actually in force (kyriarchist/swarm/consensus/ungoverned + H¹
obstruction); duties read back as `duties-<agent>` cuts; delegation never
relieves accountability. Deletes: permission booleans, org-chart assertions.
Standing steer: FOUR/Hohfeld are the entry point, not the destination — derive
operations from the stronger strata (kin-relational Gov, W-rules) as they are
formalized (memory: `feedback_four-is-the-key-not-the-universe`).

**P4 — Reach (WMAP faces carrying work-material).**
The protocol tiling (2026-07-04 note §3): admission via `write`, host
transcript codecs, hooks, A2A tasks, micropub; observation via OTLP, MCP,
feeds, webmention, ActivityPub/CloudEvents; accountability/execution via
accountable-transaction (UCAN/macaroon → CapTP/WASI → x402 → witness), Raft
for the H¹ residue only. The remaining wiring includes A2A `taskId` ↔
task-level cells, the per-site HTTP MCP mesh (the one capability the middle
generation had — 2026-07-01 interop survey), and english-codec mood/speech-act
admission (staged on the communicating parser re-earn per memory).
Deletes: per-protocol sovereign ontologies; every face is a channel code of
the one witnessed source.

**P5 — Self-operation (the loop that closes).**
The system's refusals are its diet: obstruction readings become witnessed
work-ledger obligations (`src/running/obsticulation.mts`); suiting packs
token-budgeted context from the settlement (`src/running/suit.mts`); the
native agent-worker executes through the capability bridge with every step
witnessed and spend read back as the `inference-cost` cut
(`services/agent-worker/`, `src/running/execute-invocation.mts`). Deletes:
hand-composed orientation, silent conflict surfacing, unaccounted spend. The
06-21 principles return here: the suit spends two lines on the front and
pulls the rest; hooks catch, they do not fatten injection.

**P6 — Evidence (the benchmark).**
Tokens/joules-per-settled-task against a stock agent stack, run on real work
from P1's ledger. Math: the settlement filtration position is the progress
reading; the inference-cost cut is the spend reading; nothing new. Deletes:
every unfalsifiable claim about the harness paying for itself. This is the
campaign's publishable artifact and the revenue argument.

**Relation to the reclamation campaign.** Reclamation ("delete more than you
add") is the *standing* campaign — root AGENTS.md names it, and the
2026-07-04 ruling holds that the work is reclamation, not extension. This
development campaign does not supersede it; every project above is
identification-first and expects net lines removed on refactoring work. Where
they touch: a P-item that adds surface without a stated absence is a
reclamation violation, full stop.

## 6. The front (property 4)

The front is the deepest open, unblocked leaf — computed from the ledger once
P1 lands, asserted only provisionally before then; a front is a reading of
the work-ledger cut, never a hand-maintained list.

## 7. Ontological dependencies (the audit the form requires)

Terms this campaign's plans assume:

| term | status |
|---|---|
| settlement / plate / dish / hole / conurbation / constituent | **ruled** — 2026-07-03 naming note |
| obsticulation / obstruence / lenticel | **red-node** — intension carried, genus-identification open; usable as names of readings, not claimed as theorems |
| campaign-as-edges hold ("blocked on the agency derivation, do NOT rush", 07-01) | **plausibly discharged** by the shipped work spine + run-as-diamond work — OPEN: operator confirms the hold is lifted before P1 declares work items above task level |

## 8. Nomenclature (the register discipline)

The operator's standing point: the biggest win is the
right specific term for each structure, in the right register — and because
the thing being built does not exist elsewhere, the names are found as the
work settles, then must be *used*. The corpus resolved when this is forced:
registers are forced-not-stylistic for **subject registers** (the
consumed-structure profile is the invariant), refuted for instrument registers
(obsmetrologia/infomaterial, 2026-07-04, cited in the settlingday handoff). So this
campaign speaks:

- **settlement register** for the whole and its anatomy (settlement, plate,
  dish, conurbation, constituent, predecessor/successor; bare/inhabited ×
  dead/live) — never "server", "instance", "deployment";
- **work-ledger register** for commitments (endeavor > campaign > project >
  plan > task > work-item; front; milestone-as-derived-state) — never
  "epic/story/ticket";
- **jural register** for authority (claim/duty/privilege/power/…, office,
  investiture, accountability) — never "permissions/roles/ACLs";
- **kinematic register** for history (diamond, causal set, run-of-runs,
  height strata) — never "pipeline/DAG-tool" vocabulary;
- industry names (harness, framework, agent, MCP, A2A) live at the WMAP
  boundary only, as the public-standard face of the same structures — math-
  lawful left hand, standards-conformant right hand.

Rule carried from the domain-polysemy correction: when a needed structure
looks unnamed, the name is overwhelmingly likely already earned in another
register — search across registers before coining, and once found, use the
corpus's name without alias.

## 9. Declaration (what makes this a campaign and not an essay)

When the operator confirms §3 (objective), §4 (horizon + id), and the §7
hold-lift, the campaign is declared with one write call, a claim: cell
`campaign:<id>`, `boundary.role: obligation`, parent
`endeavor:<561-group-endeavor-id>` (the endeavor declared the same way,
first), on the work-ledger feed — and each P-item as `project:<id>` with
`boundary.parent` pointing at the campaign. From then on the front (§6) is
computed, not asserted; progress is filtration position, not a percentage;
and this note is the content-tier reading of a data-tier commitment, per the
tiers. Until that write, this document is a plan and claims nothing more.

**The mathematical form** (live tree, verified 2026-07-05): the containment
ladder is shipped lib math. `WORK_LEVELS = endeavor > campaign > project >
plan > task > work-item` with the work item and scope helpers (`WorkItem`, `workItemScope`)
(`level:id` cell grammar), Hohfeldian jural relations over FOUR, office
investiture, and `governance()` now live in `src/capability/index.mts:554-699`
(relocated there from the deleted `lib/calculus/predicating/office.mts` — the
2026-07-04 notes cite the old path). Declaring a campaign means one write call
with a claim whose cell is `campaign:<id>` (`src/running/work-ledger-observations.mts:5-7`);
`boundary.role: obligation` opens it, `discharge` settles it, parent is
explicit or spacelike, and the work-ledger cut deriver
(`services/holography/index.mts`) reads it back as a causal set
(`lib/closure/analysis/work-ledger-causal-set.mts`), with runs-of-runs free
at every level by the proven `Hole` endofunctor.

The program has a founding diagnosis and a founding vow, both March 2026,
recovered from session transcripts (2026-07-02, 2026-07-04) and their
primaries this session:

**P4 — Reach (WMAP faces carrying work-material).**
The protocol tiling (2026-07-04 note §3): admission via `write`, host
transcript codecs, hooks, A2A tasks, micropub; observation via OTLP, MCP,
feeds, webmention, ActivityPub/CloudEvents; accountability/execution via
accountable-transaction (UCAN/macaroon → CapTP/WASI → x402 → witness), Raft
for the H¹ residue only. Live already: `services/activitypub/`,
`services/agent-worker/`, the capability codecs (commit 4a8e6e8). Wiring
gaps: A2A `taskId` ↔ task-level cells; the per-site HTTP MCP mesh (the one
capability the middle generation had that today lacks — 2026-07-01 interop
survey); english-codec mood/speech-act admission (blocked on the
communicating parser re-earn — Phase 3, staged, no code yet per memory).
Deletes: per-protocol sovereign ontologies; every face is a channel code of
the one witnessed source.

The front is the deepest open, unblocked leaf — computed from the ledger once
P1 lands, asserted here only until then. As of 2026-07-05, from the
settlingday handoff's ordered open threads:

1. **Fat-log rehabilitation** (dispatched, not run): streaming reads,
   receipt-not-blob witnessing, migrate the ~750MB admit-invocation log; now
   also the record tier (the 222MB record artifact). Same root cause as the
   InfoTile OOM (thread 5) — bounded reads are one fix.
2. **Operator rulings pending**: gitignore policy for derived tiers
   (`data/record/`, `data/content/`); the cell/subject grammar convention
   ("Three Dots and a Dash") — both OPEN, both operator-only.
3. **Node restart** (18901 runs pre-merge code; carries live sessions).
4. **P1 wiring** (work-ledger cut fed by plate material instead of the
   receipt's synthetic data) — the first campaign-advancing move, and the
   move that lets this campaign be declared onto its own spine.

Terms this campaign's plans assume, checked against the live tree 2026-07-05:

| term | status |
|---|---|
| endeavor/campaign/project/plan/task/work-item | **exists** — `WORK_LEVELS`, `src/capability/index.mts:556` |
| jural relation, office, investiture, governance regime | **exists** — same module |
| settlement / plate / dish / hole / conurbation / constituent | **ruled** — 2026-07-03 naming note |
| milestone (derived state) | **exists as math** (judge fold + `causalHeightStrata`); no deriver consumer yet — P1 |
| suit, cut, witness, read/write | **exists, live** |
| obsticulation / obstruence / lenticel | **red-node** — intension carried, genus-identification open; usable as names of readings, not claimed as theorems |
| endeavor-context orientation (MASH slot) | **not re-earned** — the one orientation slot the current wake/fleet reads lack (07-01 interop note); becomes derivable from P1's ledger |
| mood/speech-act at admission | **blocked** — communicating parser re-earn (staged plan, no code) |
| campaign-as-edges hold ("blocked on the agency derivation, do NOT rush", 07-01) | **plausibly discharged** by the shipped work spine + run-as-diamond work — OPEN: operator confirms the hold is lifted before P1 declares work items above task level |
