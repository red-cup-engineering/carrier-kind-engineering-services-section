---
name: acquiring-land-contracts
description: "Turn interested owners into signed assignable purchase agreements priced under a matched buyer's price, with the assignment disclosed and the Group's licensed representation named."
closure-kind: process
requires-capabilities:
  - land-markets
  - land-activity
  - land-call-queue
  - land-parcels-find
  - land-lead
  - land-buyers
  - land-sale-lists
  - land-holdings
  - land-holding-record
  - land-contact-log
  - land-deal-record
  - land-pipeline
  - land-document-draft
  - office-incumbency-admit
  - enterprises
  - enterprise
  - enterprise-setting-record
  - enterprise-contract-sign
  - enterprise-cost-record
  - enterprise-payout-record
  - ledger-settlement-proposal
---

# Put parcels under assignable contract

1. Read the pipeline (`land-pipeline`) and each interested lead (`land-lead`): asking price, matched buyers, offer ceiling for its kind.
2. Make the offer by phone; record it (`land-deal-record` stage `offered`). A lead that ends here is recorded `dead` with its stage's reason.
3. Send the seller disclosure letter (`land-document-draft` template `seller-disclosure-letter`) with the purchase agreement (`purchase-agreement`); for a Wisconsin parcel add the Act 208 notice (`wisconsin-wholesaler-notice`). Get both signed by e-signature and record `contracted` with price, earnest money, closing date, closing agent, and the licensee representing the Group (`representedBy`); `land-pipeline`'s `licensing` shows the contracts in the last twelve months against Minnesota's five-transaction presumption.
4. Deposit earnest money with the title company and order title.
5. Buy land the Group keeps from the land fund: read the fund and the parcels held (`land-holdings`), choose from the tracts matched to the Group's buy box (`land-sale-lists buyer="561 Group"`) or from owners whose parcels fit it, buy over the counter or at auction on the county's terms, and record the purchase (`land-holding-record kind=acquisition` with price, paid, fees, years and rate, `fromFund=true`, and `representedBy`).
6. Seat the people who work the business in their land offices (`office-incumbency-admit`, recognition and induction each), starting with each new caller in the land caller office.

## The enterprise

As the land-contracts enterprise's holder, read the enterprise as its loop each week (`enterprise enterprise=land-contracts`): contact activity, the funnel, and the win-win value-added statement against the leading goal. Enter or withdraw from its contracts (`enterprise-contract-sign`), hold its grey-band settings deliberately (`enterprise-setting-record` with a reason and a revisit date: offer shares by kind, target fee, caller share, quiet days, earnest money), record its costs (`enterprise-cost-record`), pay callers the shares closings accrued (`enterprise-payout-record`), and send closings to the books (`ledger-settlement-proposal enterprise=land-contracts`).
