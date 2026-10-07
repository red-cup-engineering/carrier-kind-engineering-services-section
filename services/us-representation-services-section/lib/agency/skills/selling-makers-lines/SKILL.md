---
name: selling-makers-lines
description: "Sell a represented Chinese maker's line to US buyers on commission, stand for the maker at shows and meetings, and record each sale's commission."
closure-kind: process
requires-capabilities:
  - representation-engagement-record
  - representation-engagements
  - representation-payment-record
  - representation-document-draft
---

# Selling makers' lines

1. Sign a sales representative agreement per line and territory
   (`representation-document-draft template=sales-representative-agreement`), then record the
   engagement as signed with its commission rate and commercial scope.
2. Build the line's buyer list (distributors, clinics, retailers, manufacturers that use the
   product) and sell: calls, samples, quotes in US dollars with landed cost, meetings.
3. When the first order ships, record the engagement as active. Record each commission the
   maker pays with the sale it was on (`representation-payment-record saleAmount=...`).
4. At US trade shows, staff the maker's booth or meet its buyers under a local presence order.
