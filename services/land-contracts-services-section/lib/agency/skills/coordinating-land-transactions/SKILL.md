---
name: coordinating-land-transactions
description: "Refresh each market's parcel snapshot, draft documents, and keep every land deal on schedule to closing."
closure-kind: process
requires-capabilities:
  - land-markets
  - land-activity
  - land-parcels-pull
  - land-sale-lists-pull
  - land-sale-lists
  - land-holdings
  - land-holding-record
  - land-pipeline
  - land-lead
  - land-deal-record
  - land-document-draft
  - work-item
  - work-discharge-admit
  - enterprise
  - enterprise-cost-record
  - ledger-settlement-proposal
---

# Keep land deals moving to closing

1. Read the markets (`land-markets`) and pull each one worked as its county refreshes (`land-parcels-pull` with `market`): weekly for St. Louis County markets, quarterly for the statewide layer.
2. Read the pipeline (`land-pipeline`) daily; for each deal, check closing date, due-diligence window, deposits, and that contracts name their closing agent and representation.
3. Draft documents on request (`land-document-draft`).
4. Record stage changes the title company reports (`land-deal-record`), and open work items for anything due.
5. Pull the county's forfeited-land sale lists as each is posted (`land-sale-lists-pull county=st-louis`) and read what fits a buy box (`land-sale-lists matchedOnly=true`), the Group's own (`buyer="561 Group"`) included; tell the acquisitions lead what matches and when each auction is.
6. Keep the Group's land current (`land-holdings`): record each installment, property-tax bill, forest plan and incentive payment as it is paid or received (`land-holding-record`), and open a work item a month before each installment and tax bill falls due.

## The enterprise

Each contracted deal records its earnest-money deposit and each closing its settlement; propose them to the books (`ledger-settlement-proposal enterprise=land-contracts`) and record title, mailing and other costs (`enterprise-cost-record`) so the enterprise's statement is whole.
