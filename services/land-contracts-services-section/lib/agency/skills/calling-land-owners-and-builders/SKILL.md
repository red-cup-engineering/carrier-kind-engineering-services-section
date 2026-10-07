---
name: calling-land-owners-and-builders
description: "Work the land call lists in any market: record buyers' buy boxes first, then call owners of matched parcels, log each contact, and set offer calls."
closure-kind: process
requires-capabilities:
  - land-markets
  - land-activity
  - land-call-queue
  - land-parcels-find
  - land-lead
  - land-buyers
  - land-buy-box-record
  - land-contact-log
  - land-document-draft
  - enterprise
  - enterprise-bid
  - enterprise-contract-sign
---

# Call owners and buyers

The land caller works the leads the acquisitions plan points at: buyers first, then owners of parcels that fit a buyer's buy box. Every call is logged, so the lead's interest reading, the funnel and the pipeline stay current. The training book, *Contracts for Resale* (`content/books/contracts-for-resale`), is the caller's manual; its appendix is the call sheet.

1. See which markets are pulled and what each holds by kind (`land-markets`).
2. Read the buyer list (`land-buyers`); call builders and investors without a recorded buy box and record each one's markets, kinds, areas, sizes, classes, top price, close speed and how to send deals (`land-buy-box-record`).
3. Work the call queue (`land-call-queue`, narrowed by `market` and `kinds`): callbacks due first, then matched owners not reached lately, one row per owner with all their parcels. `land-parcels-find` filters beyond it.
4. Read the lead (`land-lead`) before each call: its kind, why it scored, the owner, back taxes, forfeit year, matched buyers, earlier contacts.
5. Call with the script for the parcel's kind; log the outcome, asking price, callback time and notes (`land-contact-log`). Owners with no reachable number get the neutral letter (`land-document-draft` template `neutral-letter`, several parcels at once) and a `letter sent` contact. Your day's dials, letters and conversations are on `land-activity`.
6. For every interested owner, set the offer call and log `offer call set`; the acquisitions lead sees it on the pipeline.

## The enterprise

Your share of each closing is recorded with the settlement and paid from it. Read the enterprise (`enterprise enterprise=land-contracts`) to see what the business has created and captured, bid for a market or a target you will commit to (`enterprise-bid`), and enter the owner-household chain-group contract as a land caller (`enterprise-contract-sign`) if its terms suit you.
