---
name: calling-chinese-makers
description: "Reach Chinese makers from the FDA establishments list and fair exhibitor lists, log each contact, screen a maker before an agreement, and send the agreement once it agrees."
closure-kind: process
requires-capabilities:
  - representation-establishments-pull
  - representation-establishments-find
  - representation-agent-market
  - representation-call-queue
  - representation-contact-log
  - representation-screen
  - representation-engagement-record
  - representation-document-draft
  - enterprise
  - enterprise-bid
  - enterprise-contract-sign
---

# Calling Chinese makers

1. Take the next makers from the queue (`representation-call-queue`), or find a set by
   province, device or current agent (`representation-establishments-find`). Read who their
   agents are and how many clients each holds (`representation-agent-market`).
2. Email first, in English and Chinese, from the caller kit; then call the official
   correspondent's number in China during their business hours (US evening). Log every
   attempt (`representation-contact-log`).
3. When a maker is interested, screen it and any owner it names (`representation-screen`),
   record the engagement as proposed with its offer and terms (`representation-engagement-record`),
   and send the agreement (`representation-document-draft`).
4. The US agent of record takes the engagement from signed.

## The enterprise

Read the enterprise (`enterprise enterprise=us-representation`), bid for a target you will
commit to (`enterprise-bid`), and enter the maker-representation chain-group contract as its
caller if its terms suit you (`enterprise-contract-sign`).
