# Operations Specification

Status: first normative skeleton for the SPOTCOMP operational layer.

This sub-specification covers being, doing, working, governing, process, procedure, derivation, inquiry, ledgers, budgets, costs, and the bridge from operational stationarity to Laplacian and Laplacianization machinery.

## 1. Position In SPOTCOMP

SPOTCOMP is a computer operating modeled players.
The operating part is not a wrapper around the trace computer; it is the layer where modeled players, resources, work, governance, and settlement costs become auditable substrate content.

The operations layer depends on PAM for Predicate Algebra Modeling, TRC/TDP for the on-disk typed resource catalog and running theory derivation program, and modeled-player/CGS specifications for player-local action.
It owns operational records: processes, budgets, ledgers, work cycles, governance duties, and cost witnesses.

## 2. Being, Doing, Working, Governing

The handrolled SPOTCOMP specification gives the Hoare/strata reading:

- `learning/`: stratum 0, asserted but unfired evidence;
- `doing/`: command/morphism layer, active closure activity;
- `teaching/`: settled fixed-point output available to later cycles.

Inside `doing/`, the doing trichotomy is:

- `governing/`: stratum 2, delta-stable governance rules and settled characters;
- `planning/`: stratum 0, prospective firings asserted as intent;
- `working/`: stratum 1, active sigma firings and computation in progress.

For SPOTCOMP, being is not a bare object label.
A being claim must be legible as a settled or settling predication state with path identity, witness history, and role in the relevant operation.
Doing is the morphism position.
Working is active in-flight doing.
Governing is stable rule-bearing doing.

## 3. Work Types

The operations-loop source names process, procedure, derivation, and inquiry as work-type classifications.
This specification treats them as typed operational modes:

- process: repeatable operational flow with cadence and stationarity criteria;
- procedure: explicit ordered method with preconditions, steps, and postconditions;
- derivation: proof-producing work that transforms premises into obligations, lemmas, theorems, or conformance facts;
- inquiry: question-driven work that may change vocabulary, rule systems, or evidence boundaries before a procedure or derivation exists.

A conforming operations profile MUST declare the work type for operational events that spend settlement fuel or alter governance, budget, or modeled player state.

## 4. Operations Loop

The operations loop is:

`planning -> dispatch -> execution -> tracking -> review -> feedback`

The lab operations-loop note identifies these as mathematical operations:

- planning: compute dispatchable elements from fixed fibers;
- dispatch: assign trace, agent, and task as a history extension;
- execution: extend the history monoid;
- tracking: materialize history into fiber evidence;
- review: compute observation or global sections;
- feedback: update nuclei, changing what sigma and delta do.

This loop is recursive across scales: turn, session, project, swarm, deployment, and long-running organization.
It is not an external management feature.
It is the operating mode by which a SPOTCOMP system coordinates its own continuation.

## 5. Process And Procedure Records

A process record names one host process running the substrate, its deployment, capabilities, syscall policy, spawn witness, exit witness, and closure kind.
It is the operating-system boundary record for substrate execution.

A procedure record must name:

- work type;
- preconditions;
- ordered or partially ordered steps;
- permitted actors or modeled players;
- resource budgets;
- expected witnesses;
- postconditions;
- failure and downgrade behavior.

Procedures are not host scripts.
A host script can implement a procedure only when it is a typed operating projection of the declared procedure.

The current operations-record bundle profile makes this implementable by requiring process records, procedure records, work events, budgets, ledger postings, cost events, and operations-loop records in one cited bundle.
This bundle is a witness surface.
It does not prove final settlement, but it gives reviewers enough finite operating evidence to reject common shortcuts: untyped host scripts, external project-manager state, ledgers without witness projection, budgets without governed exhaustion, and reads that hide settlement cost.

## 6. Ledgers And Detailed Balance

The operations-loop source states that stationarity is witnessed by detailed balance.
The ledger source records double-entry structure: assets, liabilities, equity, income, and expenses across commodities such as tokens, tasks, artifacts, hours, messages, and money.

For SPOTCOMP, a ledger is a projection from witness events into balanced postings.
It MUST preserve:

- originating witness reference;
- debit account;
- credit account;
- amount;
- commodity;
- timestamp or trace position;
- bilattice or evidence weight when applicable.

Ledger balance is operational evidence.
It is not proof of mathematical settlement by itself, but it can witness stationarity or imbalance in an operations loop.

## 7. Budgets And Cost

Budget records constrain resources over scope.
A budget declaration MUST name resource kind, bound value, scope, exhaustion policy, current-consumption derivation, reset policy, and witness requirements.

Cost discipline is Lawvere-quantale settling on the runtime fiber:

- reads contribute the quantale unit;
- admissions contribute bounded small cost;
- settlements contribute positive variable cost;
- path cost composes by the chosen quantale operation;
- parallel or alternative branches combine by the chosen quantale join.

SPOTCOMP MUST NOT hide settlement cost inside reads.
A read that triggers settlement is two operations: settlement, then read.

## 8. Laplacian And Stationarity

The relational-computer notes define Laplacian as measuring deviation from stationarity, `I - ObservationKernel`.
The operations loop identifies stable operation with stationarity.
The predication-categories source proves that the Lawvere Laplacian preserves sheafhood on Grothendieck sites.

Operational consequence:

- operational state must expose enough sheaf/graph/site structure for stationarity claims;
- cost and telemetry must be compatible with continuous-valued settling;
- Laplacian claims must state the carrier, observation kernel, boundary operator or restriction maps, and fixed-point/global-section criterion;
- Laplacianization claims must cite the chosen Hilbert structure or quantale-enriched structure and the equivalence relation on choices.

## 9. Conformance Boundaries

An operations profile is not conformant when:

- work type is implicit;
- reads mutate state;
- procedures are host scripts without declared predication procedure;
- ledgers omit originating witnesses or commodities;
- budgets lack exhaustion policy;
- costs do not compose in a declared quantale;
- stationarity or Laplacian claims lack carrier and fixed-point evidence;
- governance is a policy sidecar rather than settled rule-bearing doing.

## 10. Declaration Probe

The current declaration probe is:

- [schema/operations-profile.schema.json](../../schema/operations-profile.schema.json);
- [examples/operations-profile.json](../../examples/operations-profile.json);
- [src/operations-profile.mjs](../../src/operations-profile.mjs).

The current records probe is:

- [schema/operations-records.schema.json](../../schema/operations-records.schema.json);
- [examples/operations-records.json](../../examples/operations-records.json);
- [src/operations-records.mjs](../../src/operations-records.mjs).

The probe checks declaration shape for:

- learning/doing/teaching and governing/planning/working strata;
- process, procedure, derivation, and inquiry work types;
- operations-loop stage readings;
- process and procedure record boundaries;
- ledger, budget, and Lawvere-quantale cost declarations;
- stationarity, detailed-balance, Laplacian, and Laplacianization claims;
- implementation downgrades that prevent host scripts or bookkeeping from being treated as operating-layer evidence.

The records probe checks finite declaration shape for process, procedure, work-event, budget, ledger-posting, cost-event, and operations-loop records.
It also checks cross-record references, stage-specific operations-loop witnesses, read-free cost discipline, settlement/read separation, host-script projection, and boundary declarations.

[../../OPERATIONAL-MATH-FUNCTIONS.md](../../OPERATIONAL-MATH-FUNCTIONS.md) states the corresponding operational mathematical functions: work events, budget checks, Lawvere-quantale cost composition, ledger projection, settlement/read separation, modeled-player actions, learning transitions, and the closure/admission functions those operations wrap.

It does not prove the operations theory, inspect live host processes, balance real ledgers, enforce resource consumption, compute Laplacians, or close the derivations listed below.

## 11. Immediate Derivation Work

The next operations specification pass needs:

- refine the current process, procedure, work event, budget, posting, and operations-loop bundle schemas into full normative record schemas;
- fuller schemas for cost-event records, exit-status events, and stationarity observations;
- derivation of being/doing/working/governing from stage categories and Hoare strata;
- proof that process/procedure/derivation/inquiry form the right work-type classification or a stated refinement;
- formal ledger projection from witness events to postings;
- budget exhaustion as governed transition, not hidden runtime failure;
- Lawvere-quantale cost profile for SPOTCOMP settlement;
- Laplacianization handoff into moduli/descent/Laplacian resources.
