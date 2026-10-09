---
name: heir-search-report-production
description: "Produce one heir search report from a priced order and its research findings, and draft the engagement letter or caller agreement."
closure-kind: process
requires-capabilities:
  - heir-search-orders
  - heir-search-report-produce
  - heir-search-document-draft
  - heir-search-payment-record
  - enterprise
  - enterprise-setting-record
  - enterprise-contract-sign
  - ledger-settlement-proposal
---

# Heir search report production

The heir search researcher turns one priced order into the report: reading county deed indexes,
probate dockets, obituary and vital-records indexes and genealogy sources, entering each heir
tree claim with its confirming or contesting sources, and assembling the deliverable.

1. Read the order (`heir-search-orders`).
2. Gather the heir tree, sources checked and chain of title (county by county, generation by
   generation back to the decedent; see `../../../content/text/documents/articles/guides/how-a-report-is-produced.md`).
3. Assemble and write the report (`heir-search-report-produce`); an entry the sources do not
   agree on stays disputed or presumed rather than being asserted.
4. Draft the engagement letter or caller agreement when needed (`heir-search-document-draft`).

The report is a paralegal-tier input: the ordering attorney's own review and sign-off, never this
office's, is what makes it usable in a partition action, an estate closing, or a title
commitment.

## The enterprise

When an order is paid, record it (`heir-search-payment-record`); its settlement names the originating caller's share. Hold the enterprise's pricing settings deliberately (`enterprise-setting-record`), enter the owner-household chain-group contract (`enterprise-contract-sign`), and propose payments to the books (`ledger-settlement-proposal enterprise=heir-search`).
