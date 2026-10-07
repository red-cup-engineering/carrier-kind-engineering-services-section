# US Representation Services Section

The 561 Group's US representation business. Chinese companies selling into
the United States need people here: someone the FDA can reach, someone who
sells their products to American buyers, someone who stands in their booth
and answers their phone in US hours. We are those people, for a fee or a
commission.

Three offers, sold by the same callers to the same makers:

- **US agent.** Every foreign medical device establishment and food facility
  registered with the FDA must name a US agent. We hold the role for a yearly
  fee: a named person in Minnesota who answers the FDA and forwards every
  message the same day in English and Chinese.
- **Sales representation.** We sell a maker's line to US distributors,
  clinics, retailers and manufacturers for a commission on what sells, under a
  sales representative agreement that meets Minnesota's statute.
- **Local presence.** Booth staffing, buyer meetings and US-side errands, by
  the day.

Why, and the law it runs under:

- [Doing business with Chinese businesses](../../../../../561-group-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-doing-business-with-chinese-businesses.md)
  (the Group note this business comes from)
- [What Chinese firms going abroad buy from US residents](../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-what-chinese-firms-going-abroad-buy-from-us-residents.md)
- [US law for doing business with and for Chinese firms](../../../../../science-services-section/services/social-science-services-section/services/law-science-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-us-law-for-doing-business-with-and-for-chinese-firms.md)

## What is here

- `src/leads.mjs`: FDA device registration listings merged into
  establishments (name, city, province, devices and classes, official
  correspondent, the US agent named), the market of US agents, and the score
  and reasons for who to call first.
- `src/operations.mjs`: the MetroPlat operation family
  (`usRepresentationOperations`):
  `representation-establishments-pull`, `representation-agent-market`,
  `representation-establishments-find`, `representation-call-queue`,
  `representation-screen`, `representation-contact-log`,
  `representation-engagement-record` (signing screens the client and its
  owners), `representation-engagements`, `representation-payment-record`
  (settles the originating caller's share), `representation-activity`,
  `representation-document-draft`.
- `lib/agency/`: the enterprise (a market micro-enterprise with grey-band
  settings for the agent fee, commission, day rate and caller share), its
  leading goal and its maker-representation chain-group contract, three
  offices (US representation caller, US agent of record, sales
  representative), their duties, works and skills, and a rule that a signed
  engagement states its commercial scope.
- `content/text/documents/templates/`: the US agent service agreement, the
  sales representative agreement, the local presence order and the caller's
  joint-venture agreement.
- `content/text/documents/articles/guides/caller-kit.md`: when to call China,
  the first email in English and Chinese, the call, and what makers ask.

Leads come from two networking clients in computer networking engineering:
`openfda-services-section` (the FDA's public registration data) and
`consolidated-screening-list-services-section` (the US restricted-party list
and name screening).

## Roadmap to the first dollar

The US agent offer comes first because it is the smallest job. Being a
device maker's US agent means being a US address, phone and email the FDA
can reach, and passing what the FDA sends on to the maker the same day. Most
clients, most years, hear nothing from the FDA, which is how one agent can
hold 741 of them.

1. **A company to sign as.** The agreements need a legal entity (an LLC is
   enough) with a bank account that can receive international wires.
2. **The address and phone.** A US street address (not a PO box), a business
   phone answered in US business hours, and a mailbox someone reads every
   day. A home address qualifies: the device rule asks that the agent "reside
   or maintain a place of business in the United States" (21 CFR 807.40(b)).
   The agent's name, address, phone and email are published in the FDA's open
   data, so a home address becomes public; a staffed office or a coworking
   address with mail handling keeps it private.
3. **A page to point to.** One web page saying who we are and what the
   service is, in English and Chinese, since makers check before they pay.
4. **Reach makers in the renewal window.** Pull the establishments list,
   send the first email from the caller kit (October 1 to December 31), then
   call those who answer.
5. **Sign, screen, get named.** A maker that agrees is screened, signs the
   US agent service agreement, and enters our details in its FDA
   registration; we record it active.
6. **Get paid.** Invoice; the maker wires the fee, which its bank releases
   against the signed service contract in about five to ten business days.
7. **Do the job.** Answer the phone and mail, forward FDA messages the same
   day, remind clients of renewal next October.

Devices only, to start: a foreign *food* facility's US agent is invoiced by
the FDA for the facility's reinspection fees (FSMA section 107), so food
clients need the fee clause and a prepayment before the Group takes them.

**The fee** is a grey-band setting on the enterprise (`us-agent-annual-fee`,
default $450, between $150 and $1,500). The market runs from about $250 a year
at one-person agents to $800–1,500 at staffed firms; the offer (a named person,
same-day forwarding in Chinese) sits above the bottom. The first emails can
test it: half the batch at one price, half at another, and the setting moves
to the one that signs more fee per email.

Sales representation and local presence come after: they need a product
line worth selling and time to build a buyer list. Trade shows are one
place to meet makers and buyers, not a requirement to start.

## Working it

People work the business in the operations world at bare-cedar-fog.561.group, where their
office grants the `representation-*` verbs as powers:

```
representation-establishments-pull country=CN
representation-agent-market limit=20
representation-call-queue device=thermometer limit=20
representation-contact-log establishment=3005951403 outcome="letter sent" channel=email
representation-screen name="Ningbo Example Medical Co., Ltd."
representation-engagement-record client="Ningbo Example Medical Co., Ltd." establishment=3005951403 offer=us-agent stage=proposed
representation-document-draft template=us-agent-service-agreement engagement=ningbo-example-medical-co-ltd-us-agent
```
