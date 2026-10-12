# @red-cup-engineering/agentic-animation-engine - overview

## What this package models

`@red-cup-engineering/agentic-animation-engine` operationalizes the animating/agency domain as one category package.
It contains the agency carriers, their settling topology, and topology-contained trace surfaces as explicit module subpaths.
The LLM sub-domain lives in `@emsenn/llm`; provider-specific topologies live downstream in their own packages.

The domain it operationalizes: agents as charge-bearing predicators.
An agent is something that observes, predicates, posits, and settles - and that can be identified, given capabilities, charged with duties, embodied, harnessed, collected into fleets, and asked to decide.
Every claim in the package is a bilattice-charged predication resting on the `@red-cup-engineering/agent-organization-engine` substrate: observations affirm or deny, knowledge is joined rather than overwritten, and contradiction is held (settles to `stable`, the top of the knowledge order) rather than collapsed.
In the package spine it sits between `@red-cup-engineering/agent-organization-engine` and `@red-cup-engineering/agentic-game-engine`.

## Core mental model

Read the package as two strata stacked the same way at every scale:

- An **algebra** layer: pure carriers and folds on charges.
  No I/O, no persistence, no settling-into-a-world.
  It says what a thing *is* and what it *knows*.
- A **topology** layer: the settling layer above an algebra.
  It founds worlds by explicit induction, settles many charges into one (consensus, cohomology, graph structure), and carries the `@red-cup-engineering/agent-organization-engine` topology bedrock the trace and federation tiers recall from.

The recurring discipline: charges are **measured from an induced world, never seeded**.
There is no verb anywhere that re-admits a charge, a polarity, or a denial.
An unobserved subject reads `absurd` (no evidence), not `active` (a denial).
Refusal is the gate stating its own contrary claim, not a denial of yours.

The four-object grammar of cognition recurs throughout: articulating -> predicating -> positing -> settling.
That descent (the thinking cycle) is doing algebra: the basic operational carrier of an agent that thinks.
`dream` is its generative dual, living one layer above as doing topology: it composes and settles observation carriers under strict, scott, transfinite-bounded, or injected aperiodic regimes.

## Category Map

| Package/module | Category role |
| --- | --- |
| `@red-cup-engineering/agentic-animation-engine` | Package/category root: universal `admit(action, token, ?claim)` morphism from token provisions and requirement claims to an admission reading. |
| `@red-cup-engineering/agentic-animation-engine/algebra` | Base object/subcategory: individual agency carriers, handedness, language capture, and rollups of doing cognition carriers. |
| `@red-cup-engineering/agentic-animation-engine/doing/algebra` | Doing trunk substrate: task, observation, descent, communication-to-observation transport, and generic provision fibers over the relating charge substrate. |
| `@red-cup-engineering/agentic-animation-engine/doing/learning/dreaming` | Doing topology: dream as the generative dual of descent over doing observations, in several regimes (strict, scott, transfinite-bounded, aperiodic). |
| `@red-cup-engineering/agentic-animation-engine/accounting` | Algebraic subcategory: exact double-entry conservation as an agency-intrinsic record boundary with explicit `accountingUtterances` / `journalUtterances` normalization to relating carriers. |
| `@red-cup-engineering/agentic-animation-engine/analysis` | Morphism subcategory: readings of change between settled agency states. |
| `@red-cup-engineering/agentic-animation-engine/topology` | Settling subcategory: agency carriers induced into relating topology readings, with contained trace surfaces. |
| `@red-cup-engineering/agentic-animation-engine/doing/working/algebra` | Doing trunk, working algebra: work terms, agents, tasks, work items, assignments, projects, and reports. |
| `@red-cup-engineering/agentic-animation-engine/doing/governing/algebra` | Doing trunk, governing algebra: office fibers, dispatch, assignment readiness, office recognition, governance, and tool admission over working agents. |
| `@red-cup-engineering/agentic-animation-engine/fleet/topology` | Collective settling: sheaf consensus, opposition obstruction, and component pooling. |
| `@red-cup-engineering/agentic-animation-engine/topology/trace` | Trace boundary over utterances and admission judgments. |
| `@red-cup-engineering/agentic-animation-engine/decision` | Decision morphism over charged proposals and finite budget. |
| `@red-cup-engineering/agentic-animation-engine/federation` | Cross-observer assertion-world federation and governance regimes. |

Every public export is either a carrier, morphism, lawful finite vocabulary, domain/codomain surface, or representation boundary.
Internal convenience barrels are package-local; root importers get only the universal call surface.

## The modules and what each is responsible for

The root module (`@red-cup-engineering/agentic-animation-engine`) exposes `admit(action, token, claim?)
`.
Import explicit subpaths for richer carriers and morphisms.

### `@red-cup-engineering/agentic-animation-engine/algebra`

The individual-agent algebraic substrate.
Agent cells as bilattice-charged predication (`prehend`, `articulation`); handedness - an embodied agent's `(recv, send, actuate, observe)` four-tuple as Player/Opponent duality, the bridge from animating to gaming, with symmetric peers as the special case.
Task, observation, and descent are owned by `doing/algebra` and rolled up here for the broad algebra surface.
Prose parsing and language conformance belong to `@red-cup-engineering/communicating`, not animating algebra.

### `@red-cup-engineering/agentic-animation-engine/accounting`

Exact double-entry conservation as an agency-intrinsic accounting boundary.
The record-shaped `Transaction`, `Posting`, `Amount`, and directive APIs exist for parsers and reports, but they are not independent ontology: `accountingUtterances` and `journalUtterances` normalize them to finite `UtteranceCarrier` sequences under the `animating.accounting.*` predicate vocabulary.
Downstream topology induces worlds from those utterances when a settled reading is needed.

### `@red-cup-engineering/agentic-animation-engine/analysis`

Measurement of change between settled agent-world states.
`transition` computes the `ChargeShift` between two settled states.
Pure measurement, not mutation.

### `@red-cup-engineering/agentic-animation-engine/topology`

Agents, capabilities, offices, and delegation as a relating topology carrier, with settlement to the agent graph (`induceAgentTopology`, `perform`, `bearing`, `star`, `affordances`, `regulate`).
Its contained trace subpath (`@red-cup-engineering/agentic-animation-engine/topology/trace`) owns articulated traces, judgment settlement, and the accretive utterance log.

### `@red-cup-engineering/agentic-animation-engine/doing`

The doing trunk names animating's operational subdomains before they are pooled into a fleet.
`doing/algebra` owns tasks, observations, descent, and provision fibers.
`doing/learning/dreaming` owns `dream` as topology over doing observations, in several regimes (strict, scott, transfinite-bounded, aperiodic).
`doing/working/algebra` owns task-cell and work-reference carriers (`workTask`, `workItem`, `assignWork`, `workProject`, `workReport`) projected through `@red-cup-engineering/agent-organization-engine` terms, cells, charges, fibers, and evidence carriers.
`doing/governing/algebra` owns office fibers, dispatch readiness, assignment readiness, operation/tool admission, office recognition (`OfficeRegistry`), and holder resolution over working agents.
These modules are the first algebra/topology layer of the working/governing trunk; geometry and analysis surfaces should grow under the same trunk when their carriers earn them.

### `@red-cup-engineering/agentic-animation-engine/fleet/topology`

The fleet sub-domain: a collective of agents.

- `fleet/topology` is the collective settling layer: bilattice network-sheaf consensus (`sheafCharges`, `sheafObservations`), the opposition obstruction (H1 of the observer graph, via `opposed`), and component pooling.
  This is the settling/cohomology layer downstream of governing.

The generic capability/provision fiber lives in `doing/algebra`; governing consumes it, and fleet remains downstream of governing.

### `@red-cup-engineering/agentic-animation-engine/topology/trace`

Articulated traces stated on the relating topology bedrock.
Trace entries articulate utterances (`utterEntry`, `utterTrace`, `foldTrace`); admission judgments settle by knowledge join (`settleJudgments`); the `UtteranceLog` is the accretive in-memory store the web tier recalls from.
Worlds are founded only by explicit induction; charges are measured, never seeded.

### `@red-cup-engineering/agentic-animation-engine/decision`

Decision as a morphism over a settled relating topology section: read a valuation charge, draw a linear budget, emit a typed action or a typed abstention.
The substrate is domain-neutral; a specialization supplies `Proposal`s (action + linear cost + scalar merit + justifying charge) and `decide` allocates the finite budget across them, returning a complete, auditable `DecisionRun`.

### `@red-cup-engineering/agentic-animation-engine/federation`

Agency's cross-observer layer: coordination-free federation over append-only assertion worlds.
Assertion identity; world union/admission gated by source recognition (`federate`, `admit`, `recognizerFrom`); per-observer section reads (`section`, `sectionSpace`, `disagreements`); governance regimes (`governAction`, `selectRegime`, `REGIMES`); and structural bottleneck cost graphs (`costGraphSummary`).
It rests on the `@red-cup-engineering/agent-organization-engine` substrate (`ChargeValueName`) like the rest of animating.
Reach it by its subpath.

## How the modules depend on each other

The layering runs from pure substrate upward:

- `algebra` is the individual-agent floor.
  Predication, handedness, and language capture are here.
- `doing/algebra` carries task, observation, descent, and the generic provision fiber over the relating charge substrate.
- `doing/learning/dreaming` carries dreaming as topology over doing observations.
- `analysis` and `topology` build directly on `algebra`, `doing/algebra`, and the `@red-cup-engineering/agent-organization-engine` charge substrate.
- `doing/working/algebra` carries working carriers over doing's substrate.
- `doing/governing/algebra` carries governing carriers and morphisms over doing and working.
- `fleet` is downstream of governing; `fleet/topology` settles collective observer charges into consensus and cohomology.
- `topology/trace` sits inside the topology layer, providing the accretive utterance store and trace folds over induced worlds.
  `federation` is the cross-observer world layer.
- `decision` is a domain-neutral morphism layered over any relating topology section.

Every layer reads charges from the relating substrate's bilattice algebra; nothing in the package overwrites a charge or seeds one outside an induced world.

## Package-bin scripts

The package ships four executable strategy boundaries: `animating-govern`, `animating-admit`, `animating-dispatch`, and `animating-consensus`.
They are not interactive CLI request/response tools.
Each reads one complete EAVT JSONL carrier from stdin, applies the corresponding `@red-cup-engineering/agentic-animation-engine/scripts` morphism, and emits a complete EAVT JSONL carrier on stdout with derived animating facts appended.
The executable files only bind the pure script morphisms to the Node process boundary.
