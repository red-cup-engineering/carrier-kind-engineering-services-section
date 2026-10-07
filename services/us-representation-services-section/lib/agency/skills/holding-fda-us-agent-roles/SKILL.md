---
name: holding-fda-us-agent-roles
description: "Hold a client's FDA US agent role from signing through renewal: get named in the FDA's system, answer the FDA in US hours, forward every communication the same day, and record stages and payments."
closure-kind: process
requires-capabilities:
  - representation-engagement-record
  - representation-engagements
  - representation-payment-record
  - representation-document-draft
---

# Holding FDA US agent roles

1. At signing, record the engagement as signed with its commercial scope
   (`representation-engagement-record stage=signed commercialScope=...`); signing screens the
   client and its owners, and a client on OFAC's SDN list is not signed.
2. Send the client the Group's US agent details to enter in its FDA registration (FURLS for
   devices, the Food Facility Registration Module for food). When the FDA confirms, record
   the engagement as active.
3. Answer FDA calls and mail in US business hours. Forward each FDA communication to the
   client the same day, in English with a Chinese summary.
4. Record each payment (`representation-payment-record`). Remind the client of its renewal
   between October 1 and December 31, and record the engagement as renewed when paid.
