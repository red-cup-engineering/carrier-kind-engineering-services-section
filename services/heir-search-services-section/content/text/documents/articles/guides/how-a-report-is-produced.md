---
title: "How an heir search report is produced"
description: "The research pipeline behind one heir search report: what an agent checks per county, what a paid human retrieval step covers where records are paper-only, how the heir tree and chain of title are assembled, and how the report is priced and delivered."
date-created: 2026-09-26
type: guide
authors:
  - claude-sonnet-5
keywords:
  - heir-search
  - probate
  - chain-of-title
  - genealogy
---

# How an heir search report is produced

## The pipeline, county by county, generation by generation

Starting from the decedent (or the current owner of record) and working backward:

1. **County deed index.** Every recorded conveyance touching the parcel: warranty deeds, quitclaim
   deeds, mortgages released, easements. This is the spine of the chain of title.
2. **Probate docket.** Wills, letters of administration or testamentary, heirship determinations,
   guardian-ad-litem filings. Where a decedent died intestate, this is where the court (if a
   probate was ever opened) named heirs; where none was opened, this is the gap the heir tree has
   to fill from other sources.
3. **Obituary indexes.** Named survivors in a published obituary are a first pass at the heir list
   — never taken alone, always checked against vital records.
4. **Vital-records indexes.** Birth, marriage and death indexes confirm or contest a claimed
   relationship (parent/child, spouse, sibling) and a claimed date.
5. **Public genealogy sources.** Census records, published family trees, cemetery and church
   records fill gaps the county and vital records do not reach, especially across state lines when
   heirs moved.

Each finding is entered against a heir tree entry with `confirmedBy` (sources that support it) or
`contestedBy` (sources that conflict) — see `../../../../src/pricing.mjs`'s `heirReading`: an
entry with only one kind of source stays **presumed**; conflicting sources make it **disputed**
and the report says so rather than picking a side; a name shown to have predeceased the decedent
or disclaimed the inheritance is **excluded**; only a name confirmed by a second independent
source is **documented**. A report is "ready for attorney review" only when every heir is
documented (`heirTreeSummary`).

## Where the pipeline still costs a human

Many rural county archives hold deed, probate or vital records only on paper, unindexed and
undigitized. When that happens for a county in scope, the order's price and timeline are updated
before more work happens: a named per-county paper-retrieval cost (a courthouse records request or
a local researcher) is quoted to the client, not silently absorbed or silently skipped. This is
the honest cost the November 2026 note on this market names directly: the work does not collapse
to a pure database query even with full agent automation of the cross-referencing step.

## Producing the deliverable

`heir-search-report-produce` (see `../../../../src/operations.mjs`) takes an order and its
research findings (`{ heirs, sources, chainOfTitle }`) and assembles
`content/text/documents/templates/heir-search-report-template.md` into the final report:
decedent and property, sources checked, the heir tree table with each entry's reading, the chain
of title as a numbered sequence of recorded instruments, the limitations section (paralegal-tier
input; per-county paper cost where it applied), and the price breakdown. The assembled markdown is
written to `data/records/reports/<date>/<orderId>.md` and the operation's record is journaled.

## Pricing

See `../../../../src/pricing.mjs`: a $150 retainer (opens county deed-index and probate-docket
access) plus $60 per research-year plus $175 per heir located, matching the named incumbents
(HeirSearch, Heir Pros, Morse Genealogical); or 20-30% contingency against the estate value,
matching Discovering Connections and DavisDNA, when the client prefers that model. A rush order
(same-week turnaround) adds a $200 surcharge. Any per-county paper-retrieval cost discovered
mid-research is quoted and confirmed before it is billed.

## Next steps after delivery

The ordering attorney reviews the report and issues (or does not issue) the title opinion; a title
company applies it to its commitment; a partition-action filer attaches it as supporting research.
None of these are steps this business performs — the report is the paralegal-tier input to all
three.
