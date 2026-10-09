---
name: heir-search-lead-intake
description: "Find heir search's buyers (federal funders, nonprofits, Duluth estate-owned leads), log contact with them, and take in and price one order once a buyer agrees to it."
closure-kind: process
requires-capabilities:
  - heir-search-lead-list-pull
  - heir-search-lead-list-find
  - heir-search-duluth-estate-leads
  - heir-search-order-intake
  - heir-search-contact-log
  - enterprise
  - enterprise-bid
  - enterprise-contract-sign
---

# Heir search lead intake

The heir search caller finds the market's buyer side and turns one agreed buyer into a priced
order. It never produces the report itself.

1. Pull or read the federal-funder and nonprofit lead list (`heir-search-lead-list-pull`,
   `heir-search-lead-list-find`).
2. Read Duluth's estate-owned lots as heir search cases (`heir-search-duluth-estate-leads`).
3. Log every contact with a buyer, whichever list it came from (`heir-search-contact-log`).
4. Once a buyer agrees to order, take in and price the order (`heir-search-order-intake`), which
   hands off to the heir search researcher.

## The enterprise

Read the heir-search enterprise (`enterprise enterprise=heir-search`), bid for a target you will commit to (`enterprise-bid`), and enter the owner-household chain-group contract with land contracts (`enterprise-contract-sign`) as its caller if its terms suit you.
