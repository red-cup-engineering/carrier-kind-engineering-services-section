---
title: "Heir search caller kit"
description: "Everything a caller needs to sell heir search reports: who buys, what to say to attorneys, title companies and nonprofits, how to handle objections, what to log, and how a call becomes an order and a payout."
date-created: 2026-09-26
type: guide
authors:
  - claude-sonnet-5
keywords:
  - heir-search
  - heirs-property
  - cold-calling
  - probate
---

# Heir search caller kit

## What we do, in one breath

Land held by multiple descendants after generations of intestate succession cannot be sold,
mortgaged or cleanly probated until someone reconstructs the chain of title and the heir tree. We
build that reconstruction and sell it as a report to the people who need it: the estate's or
title's attorney signs off on it, we do the multi-county record work underneath.

## Your part, and how you are paid

You work three kinds of buyer, three lists (`funders.csv`, `nonprofits.csv`,
`duluth-estate-leads.csv`, plus whatever attorney/title-company/probate-office contacts you build
by hand — see "Who has no open list" below):

1. **Probate/estate attorneys and title companies.** Your goal is one open matter with a
   fractionated or unclear title, and an intake call booked.
2. **Heirs'-property nonprofits and USDA Section 2501 grantees** (`nonprofits.csv`,
   `funders.csv`). Your goal is to learn their caseload and referral process, and get permission
   to send them clients or take referrals from them.
3. **County probate/public administrators, land trusts, and tax-forfeit/partition buyers.** Your
   goal is to learn which parcels or estates in their jurisdiction are stuck on title, and get an
   introduction to the party who would order the report.

You are a joint-venture partner on every order you bring in (see
`../../templates/joint-venture-caller-agreement.md`). The Group prices and signs every engagement
letter; you find the buyer and set up the intake call.

## Reading the lead lists

| list | column | what it tells you |
|---|---|---|
| `funders.csv` | `recipient`, `amount`, `why` | who a federal program paid to do or buy this work, and how much |
| `nonprofits.csv` | `name`, `ein`, `address` | a heirs'-property or land-tenure nonprofit's mailing address (from its own IRS filing) |
| `duluth-estate-leads.csv` | `decedentOrOwnerOfRecord`, `mailing`, `county`, `parcel` | an estate/heirs/trust-owned lot from the Duluth land business — a probable open or unopened probate |
| any list | `phone`, `contact`, `called`, `outcome` | fill in as you work |

## Attorney/title-company script

**Opening**

> Hi, is this [name]? This is [your name] with the 561 Group. We reconstruct heir trees and chains
> of title for fractionated and heirs' property matters — county deed indexes, probate dockets,
> vital records, the whole cross-reference — and hand it to you as a paralegal-tier report your
> firm reviews and signs off on. Do you have a matter right now with an unclear or fractionated
> title?

**If yes**

> Great. A few questions so I can quote it:
> - How many counties, and roughly how many generations back does it go?
> - Is this for a partition action, an estate closing, or a title company's commitment?
> - Do you have a rough estate value, in case contingency pricing makes more sense than
>   per-year/per-heir?

> I'll pass this to [emsenn / the pricing lead] and they'll send an engagement letter with a firm
> price. What's the best email to send it to?

**If they use an incumbent already** (HeirSearch, Heir Pros, Morse Genealogical, Discovering
Connections, DavisDNA)

> Totally fair — we price against the same $60/year plus $175/heir, or 20-30% contingency, that
> the incumbents do. Happy to quote your next matter alongside them; no obligation.

## Nonprofit/funder script

> Hi, is this [name]? This is [your name] with the 561 Group. I saw [organization]'s work on
> heirs' property [preservation / land retention / title clearing] — we produce the heir-tree and
> chain-of-title research that a title-clearing case actually runs on, and I wanted to ask how
> your intake and referral process works, and whether a paid research partner would be useful on
> cases where in-house capacity is the bottleneck.

Log what they say about caseload, referral process, and whether they hold discretionary
procurement budget or only grant money earmarked for their own staff — that answer decides whether
they are a buyer or a referral partner.

## Duluth cross-reference script (estate-owned lots)

> Hi, is this [name]? This is [your name] with the 561 Group. Our records show you (or your
> family) hold land in Duluth listed under [decedent/trust name] — [parcel]. We do two things:
> help clear the title through an heir search so the property can be sold or transferred cleanly,
> and, separately, buy the lot outright if that's simpler. Which would be more useful to you?

This caller doubles as a Duluth land caller: log the outcome on both lists.

## Objections

| they say | you say |
|---|---|
| "We already do this in-house." | "Makes sense for the easy ones — we're for the multi-county, many-generations cases where in-house time runs out. Keep our number for those." |
| "How much does it cost?" | "It depends on how many counties and generations, and how many heirs turn up — roughly $60 per research-year plus $175 per heir found, or a percentage of the estate on contingency. I can have a firm quote sent same day." |
| "Is this a title opinion?" | "No — it's the research your attorney reviews and signs off on. We never issue a title opinion ourselves." |
| "Send me something in writing." | "Happy to — what's the best email for an engagement letter and pricing sheet?" |
| "Not interested." | "No problem, thanks for your time." Mark `outcome` = `not interested` or `remove`. |

## Daily routine

1. Work `funders.csv` and `nonprofits.csv` top-down by amount/revenue; they have money moving in
   this space now.
2. Work `duluth-estate-leads.csv` alongside the Duluth land caller kit — it's the same call either
   way.
3. Build attorney/title-company/county contacts by hand, starting with the UPHPA-enacting states
   in `uphpa-states.csv` (a state bar's "find a lawyer" search, probate/estate practice area, and
   the county's probate-clerk or public-administrator list).
4. Log every call in `called`/`outcome`, using: `no answer`, `voicemail`, `wrong number`, `not the
   right contact`, `callback <date>`, `interested`, `engagement sent`, `not interested`, `remove`.
5. Hand off every `interested` and `engagement sent` row the same day.

## What happens after your call

The intake lead prices the order (`heir-search-order-intake`), sends the engagement letter
(`heir-search-document-draft`), and the research runs against the sources in
`how-a-report-is-produced.md`. Your share is paid on delivery of the report, per the joint-venture
agreement.
