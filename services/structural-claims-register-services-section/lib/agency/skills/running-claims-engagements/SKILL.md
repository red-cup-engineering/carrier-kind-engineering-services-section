---
name: running-claims-engagements
description: "Run discovery calls with interested parties, propose and deliver engagements, take deposits, and record fees and the caller's share."
closure-kind: process
requires-capabilities:
  - claims-project
  - claims-register
  - claims-forecasts
  - claims-engagement-record
  - claims-pipeline
  - enterprise
  - enterprise-setting-record
  - enterprise-contract-sign
  - enterprise-payout-record
  - ledger-settlement-proposal
---

# Run claims engagements

1. Before the discovery call, read the party's project and register (`claims-project`, `claims-register`) and the forecasts for it (`claims-forecasts`).
2. Propose the engagement that fits: the party's register with each claim classed and priced against the project's schedule, per-project docket readings, and capture forecasts. Take a deposit or first milestone before work starts.
3. Record each engagement at its stage with its fee, its originating caller and the caller's share (`claims-engagement-record`). `claims-pipeline` shows fees by stage and what each caller is owed and can expect.

## The enterprise

A paid engagement records its settlement with the caller's share. Hold the enterprise's settings deliberately (`enterprise-setting-record`), pay callers what closings accrued (`enterprise-payout-record`), and propose payments to the books (`ledger-settlement-proposal enterprise=structural-claims-register`).
