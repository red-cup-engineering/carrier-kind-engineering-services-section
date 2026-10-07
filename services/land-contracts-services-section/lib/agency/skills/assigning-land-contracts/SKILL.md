---
name: assigning-land-contracts
description: "Assign contracted parcels to matched buyers for a fee, marketing the contract rather than the land, and see them to closing."
closure-kind: process
requires-capabilities:
  - land-pipeline
  - land-lead
  - land-buyers
  - land-contact-log
  - land-deal-record
  - land-document-draft
  - enterprise
  - enterprise-contract-sign
---

# Assign contracts to buyers

1. For each contracted deal (`land-pipeline`), read its matched buyers (`land-lead`) and send them the deal sheet (`land-document-draft` template `contract-deal-sheet`): the Group's right to buy the parcel at its price, the assignment price, and the closing date. It markets the contract, never the land. Record `marketed`.
2. Log each buyer's answer (`land-contact-log` party `buyer`).
3. Draft the assignment (`land-document-draft` template `assignment-of-purchase-agreement`), get it signed and the deposit paid, and record `assigned` with buyer and assignment price.
4. When the title company closes, record `closed`; the fee and the caller's share are on the closing statement. A deal that fails is recorded `dead` with its stage's reason.

## The enterprise

The dispositions lead is a party to the owner-household chain-group contract; read the enterprise (`enterprise enterprise=land-contracts`) to see the value-added pool the group is building, and enter the contract (`enterprise-contract-sign`) or not.
