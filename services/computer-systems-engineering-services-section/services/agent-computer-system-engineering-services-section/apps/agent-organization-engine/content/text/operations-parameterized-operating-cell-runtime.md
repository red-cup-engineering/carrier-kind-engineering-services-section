# Operations demand: parameterized operating-cell runtime

**Consumer:** Coesite Operations  
**Demand date:** 2026-10-11  
**Demand source:** `coesite-operations/operations-services-section@ops/pulse-operating-cell-composition-20261011`  
**Engineering owner:** Red Cup Engineering / agent-organization-engine

## Problem

Recurring 561 Group pulses repeatedly rediscover the same operational structure and then implement bespoke glue in the pulse itself. Operations now owns a source-level composition contract for converting recurring work into parameterized operating cells. Engineering must supply the reusable runtime that executes those Operations records.

This is an implementation demand for existing admitted work. It does not create a new Group product requirement or Board decision.

## Required runtime behavior

Consume a Coesite `OperatingCellParameterization` and deterministically bind:

1. existing office records;
2. duty and skill bundles;
3. a parent endeavor with exact `work_ref`, principal, consumer and objective;
4. zero or more campaigns whose work remains subordinate to that endeavor;
5. staffing demand, vacancy, qualification and capacity state;
6. required provider capabilities and their receipts;
7. work intake and dispatch;
8. independent receiver acceptance;
9. residue and decommission state.

## Required invariants

- Scheduled-task identity is not office authority.
- The same persistent character changing office focus is not an independent handoff.
- Missing provider capability blocks dispatch and preserves the work.
- Missing capacity remains a vacancy; model/session availability is not staffing.
- Campaigns preserve parent endeavor, principal and work reference.
- A source merge is not operating acceptance.
- Decommission retracts active bindings while preserving historical receipts.
- Runtime actions may use only authority actually present in the supplied office/receiver records.

## Operations acceptance fixtures

Use these current Coesite parameterizations as integration fixtures:

- `1Fg_7a0Z` — Public micro-enterprise formation
- `XrkNwQVp` — Personal Scent Foundry
- `pJ_EiO2u` — Sensory Materials Engineering
- `q4bvnQOO` — Olfactory Experience Systems
- `hri1yyTO` — Olfactory Metrology
- `wsmOASEf` — Land Relations and Title Intelligence

## Minimum acceptance tests

1. Same parameterization revision yields the same office/duty/skill/endeavor/campaign graph.
2. Unknown engineering capability yields a held work item, not a fabricated provider.
3. A staffing demand remains unfilled until qualification + capacity evidence exists.
4. Same-actor office changes never satisfy independent receiving.
5. Receiver acceptance is version-bound to the exact delivered effect.
6. Decommission removes active routing while leaving provenance and receipts queryable.

## Ownership boundary

Engineering owns the runtime, schemas, adapters and executable tests.
Coesite Operations owns parameterizations, staffing policy, cadence, service contracts, campaign/endeavor configuration and receiving rules.
561 Group / Causeway / Science / Engineering offices consume the resulting operational service according to their own authority.
