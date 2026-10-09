# Heir Search Services Section

The 561 Group's heir search business. Heirs' property — land held by multiple descendants as
undivided tenants in common after generations of intestate succession — cannot be sold, mortgaged,
developed or cleanly probated until someone reconstructs the chain of title and the heir tree back
to the original decedent. We produce that reconstruction (the heir search report) and sell it to
the people who need it to move a title, close an estate, or bring a partition action.

Why now: named vendors (HeirSearch, Heir Pros, Morse Genealogical, Discovering Connections,
DavisDNA) already sell this at roughly $60 per year of research plus $175 per heir located, or
20-30% contingency — a priced market, not a hypothesis. USDA's Section 2501 program funded 31
grantees $22.6 million in FY2024 for land-title-issue resolution; the Heirs' Property Relending
Program carries over $100 million; 25 states, DC and the U.S. Virgin Islands have enacted the
Uniform Partition of Heirs Property Act, which creates ongoing court-facing demand for exactly
this deliverable. The same research capability serves BIA trust-land probate directly (a named
agency backlog). See the source note: `../../../../../science-services-section/services/social-science-services-section/services/law-science-services-section/content/text/documents/articles/notes/2026/08/27/2026-08-27-note-on-mission-aligned-service-markets-in-land-tenure-and-probate-records.md`.

Exhaustive multi-county record reconstruction across decades of intestate succession is work no
human does economically at volume: a fleet of agents can search county deed indexes, probate
dockets, obituary indexes, vital-records indexes and genealogy sources across dozens of counties
at a scale and cost no billed-hourly human researcher matches, while the judgment-bearing step
(the title opinion) still needs a licensed attorney's sign-off. This is a **paralegal-tier input**
to a legal product, priced and delivered accordingly.

## What is here

- `src/leads.mjs`: the buyer lead list's data — the Uniform Partition of Heirs Property Act's
  enacting states (hand-compiled, cited), the named incumbents' published pricing, and the pure
  functions that shape a federal award or a nonprofit filing into a lead row, and a Duluth land
  seller row (an estate, heirs or trust owner) into an heir search case lead.
- `src/pricing.mjs`: order pricing set against the named incumbents' rates (a $150 retainer + $60
  per research year + $175 per heir located, or a 20-30% contingency), and the heir tree's
  evidentiary reading on FOUR's extremal family (documented/disputed/excluded/presumed).
- `src/report.mjs`: assembling the heir search report deliverable from an order and its research
  findings into `content/text/documents/templates/heir-search-report-template.md`.
- `src/operations.mjs`: the MetroPlat operation family (`heirSearchOperations`) — pulling the
  buyer lead list, taking in and pricing an order, logging buyer contact, producing the report,
  drafting the engagement letter or caller agreement, and reading Duluth's estate-owned lots as
  heir search cases.
- `scripts/pull-lead-lists.mjs`: live-pulls federal funder leads from USAspending.gov's
  award-search API and nonprofit leads from ProPublica's Nonprofit Explorer, and writes
  `data/records/lead-lists/<date>/{funders.csv,nonprofits.csv,uphpa-states.csv,vendor-comps.csv}`.
- `scripts/cross-reference-duluth-estates.mjs`: reads the Duluth land business's already-pulled
  `sellers.csv` and writes `duluth-estate-leads.csv` — the estate/heirs/trust-owned lots on that
  list, which are land leads on one business and probable heir search cases on this one.
- `content/text/documents/articles/guides/caller-kit.md`: scripts and objections for calling
  attorneys, title companies and nonprofits.
- `content/text/documents/articles/guides/how-a-report-is-produced.md`: the research pipeline
  behind one report, county by county.
- `content/text/documents/templates/`: the report, the pricing sheet, the engagement letter/order
  form, and the caller's joint-venture agreement.

## Running it

```sh
pnpm --filter @red-cup-engineering/heir-search-services-section lead-lists
pnpm --filter @red-cup-engineering/heir-search-services-section duluth-estate-leads
# or: node scripts/pull-lead-lists.mjs [--out <dir>]
#     node scripts/cross-reference-duluth-estates.mjs [--sellers <path>] [--out <dir>]
```

## The numbers on 2026-09-26

- 60 federal grant/cooperative-agreement awards naming heirs'-property or land-tenure work
  (USAspending.gov), led by the Federation of Southern Cooperatives/Land Assistance Fund
  ($14.86M), the Center for Heirs' Property Preservation ($10M and $8.5M, two awards), and
  Central State University's woodland-owner heirs'-property extension work.
- 44 nonprofits matching heirs'-property, land-tenure or community-land-trust searches on
  ProPublica's Nonprofit Explorer, each with its EIN, city, state and mailing address.
- 25 UPHPA-enacting jurisdictions (states, DC, the U.S. Virgin Islands).
- 417 estate, heirs or trust-owned lots on the Duluth land business's own 2,549-lead seller list —
  each one a land lead and an heir search case at once.

## What has no open national directory API (worked by hand, state by state)

Probate/estate attorneys, title companies, and county probate/public administrators have no
single fetchable national list: work a state bar's "find a lawyer" search (probate/estate
practice area) and a county's probate-clerk or public-administrator list by hand, starting with
the UPHPA-enacting states in `uphpa-states.csv`, since partition-action law is what turns this
into ongoing court-facing demand there.

## Sources

- [2026-08-27 note on mission-aligned service markets in land tenure and probate records](../../../../../science-services-section/services/social-science-services-section/services/law-science-services-section/content/text/documents/articles/notes/2026/08/27/2026-08-27-note-on-mission-aligned-service-markets-in-land-tenure-and-probate-records.md)
- [USAspending.gov award search](https://api.usaspending.gov/api/v2/search/spending_by_award/)
- [ProPublica Nonprofit Explorer API](https://projects.propublica.org/nonprofits/api/)
- [Uniform Law Commission, Partition of Heirs Property Act](https://www.uniformlaws.org/committees/community-home?CommunityKey=50724584-e808-4255-bc5d-8ea4e588371d)
- [Wikipedia, Heir property (enactment table)](https://en.wikipedia.org/wiki/Heir_property)
- [ABA Real Property, Trust and Estate Law Section, "Uniform Laws Update: 2025 Legislative Update"](https://www.americanbar.org/groups/real_property_trust_estate/resources/probate-property/2026-january-february/uniform-laws-update-2025-legislative-update/)
