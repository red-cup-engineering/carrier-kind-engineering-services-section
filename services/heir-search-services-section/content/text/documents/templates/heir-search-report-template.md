---
title: "Heir search report"
description: "The deliverable an heir search order produces: decedent and property, research scope and sources checked, the heir tree with each heir's evidentiary reading, the chain-of-title summary, limitations, and price. A paralegal-tier input to the ordering attorney's title opinion, not a title opinion itself."
date-created: 2026-09-26
type: template
authors:
  - claude-sonnet-5
---

# Heir Search Report

**Order:** {{orderId}} · **Prepared for:** {{preparedFor}} · **Prepared:** {{preparedDate}}

## Decedent and property

| | |
|---|---|
| Decedent / owner of record | {{decedent}} |
| Date of death (if known) | {{dateOfDeath}} |
| County / state | {{county}}, {{state}} |
| Parcel / legal description | {{parcel}} |
| Scope ordered | {{scope}} |

## Research scope and sources checked

This report is built by checking, county by county and generation by generation back to the
decedent: the county deed index (recorded conveyances), the probate docket (wills, letters of
administration, heirship determinations), obituary indexes, vital-records indexes (birth,
marriage, death), and public genealogy sources (census records, published family trees, cemetery
and church records) — cross-referenced against each other, never taken singly.

{{sources_list}}

## Heir tree

Each heir below is read on FOUR's extremal family: **documented** (a second independent source
confirms the claim), **disputed** (sources conflict — resolve before this report is used),
**excluded** (predeceased, disclaimed, or otherwise not an heir), or **presumed** (claimed by one
source, not yet checked against a second).

{{heirs_table}}

**Tree status:** {{heirTreeStatus}}

## Chain of title summary

{{chain_of_title}}

## Limitations

- This report is a **paralegal-tier input**, not a title opinion: a licensed attorney in the
  property's jurisdiction must review and sign off on any chain of title or heirship finding
  before it is relied on in a partition action, an estate closing, or a title company's
  commitment.
- Where the underlying county's records are paper-only and unindexed, in-person or ordered
  document retrieval is a real marginal cost per county; this report names which counties still
  need that retrieval, so it is priced and scheduled rather than silently skipped.
- A **presumed** or **disputed** heir means the tree is not yet complete enough for a court or
  title company to rely on; see "Tree status" above.

## Price

{{pricing_breakdown}}

---

*Prepared by the 561 Group's heir search service. Questions about this report: reply to the order
thread it was produced under.*
