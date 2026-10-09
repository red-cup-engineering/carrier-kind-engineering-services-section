# Land Contracts Services Section

The 561 Group's land contracts business. We find property whose owners would
rather have a quick, certain sale than keep it: vacant lots, underbuilt
commercial sites, rural and lake land, and houses their owners do not live in.
We put it under a purchase agreement that names the Group as buyer "or
assigns", then assign the agreement to a builder or investor whose buy box it
fits, for a fee paid at closing. When a buyer is waiting and the Group has the
cash, it buys and resells outright.

It started on 2026-09-26 as a Duluth infill-lot business and works any county
whose parcel records are open.

## Markets

A market is one area of one county's parcel records (`src/leads.mjs`,
`MARKETS`):

- **St. Louis County's own layer**, refreshed weekly, with unpaid taxes and the
  projected forfeiture year: Duluth, Hermantown, Proctor, the Iron Range cities,
  and the county's towns and unorganized land.
- **Minnesota's compiled statewide layer**, refreshed quarterly: Lake, Itasca,
  Crow Wing, Cass and Aitkin counties, Minneapolis and Saint Paul. Of its 59
  counties, 31 publish values there; the others (Carlton among them) cannot be
  priced from it. Counties that write numeric class codes need their code table
  (`CLASS_CODES`) before their houses and businesses can be told apart.

Every parcel is read as a kind: **infill lot**, **underbuilt site**,
**seasonal**, **rural acreage**, **dwelling** (one to four units, not the
owner's homestead), or **forfeited** (auctioned by the county).

## What is here

- `src/leads.mjs`: the two parcel layers, the markets, one parcel shape for
  both, property kinds, the seller score and its reasons, offer ranges by
  kind, buyer candidates, and `pullMarket`.
- `src/sales.mjs`: the forfeited land a county is selling now, read from the
  auction and over-the-counter lists its sales page links (exported as CSV
  from the county's report server): each tract's parcels, place, acres,
  price, whether it is sold, and what buying it on the county's terms takes.
- `src/pipeline.mjs`: the sales procedure (`STAGES`: what each stage means,
  which office moves it on, and the reasons a deal can die there), buy-box
  matching, offer ceilings, interest readings, the funnel, template filling.
- `src/operations.mjs`: the MetroPlat operation family
  (`landContractOperations`): `land-markets`, `land-parcels-pull`,
  `land-parcels-find`, `land-lead`, `land-buyers`, `land-buy-box-record`,
  `land-contact-log`, `land-call-queue`, `land-deal-record`, `land-pipeline`
  (with the funnel and the 12-month transaction count against Minnesota's
  five-transaction broker presumption), `land-activity`, `land-sale-lists-pull`,
  `land-sale-lists`, `land-holding-record`, `land-holdings`, `land-document-draft`.
- `scripts/pull-call-lists.mjs`: one market's call lists as CSV under
  `data/records/call-lists/<market>/<date>/` (sellers, buyers, forfeited).
- `lib/agency/`: the four offices (land caller, acquisitions lead,
  dispositions lead, transaction coordinator), their duties, works and skills,
  and the rules (contracts name their closing agent and earnest money, and the
  licensee representing the Group).
- `content/books/contracts-for-resale/`: the sales training book, built to
  EPUB and PDF with the house ebook toolchain.
- `content/text/documents/templates/`: the purchase agreement, seller
  disclosure letter, Wisconsin wholesaler notice, assignment, contract deal
  sheet, buyer introduction, neutral and blind-offer letters, and the
  joint-venture caller agreement.
- `content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-the-land-contracts-business-plan.md`:
  the business plan.

## Working it

People work the business in the operations world at bare-cedar-fog.561.group, where their land
office grants the `land-*` verbs as powers, typed as `key=value` pairs:

```
land-call-queue market=duluth kinds=infill-lot limit=20
land-contact-log party=owner parcel=010-0070-00180 outcome="offer call set" askingPrice=9000
land-sale-lists buyer="561 Group" way="over the counter" termsOnly=true
land-holding-record parcel=305-0020-04440 kind=acquisition price=19200 paid=1920 years=10 rate=0.07 fromFund=true
```

## Land the Group keeps

A share of each closing's net fee (the enterprise setting `land-fund-share`)
is reserved to the land fund. The fund buys land the Group keeps, from the
county's sale lists or from owners whose parcels fit the Group's own buy box,
and pays its installments and property tax. `land-holdings` reads each parcel
held, what is still owed and when, and the fund's balance, and
`ledger-settlement-proposal enterprise=land-contracts` posts all of it to the
books.

Outside it:

```sh
node scripts/pull-call-lists.mjs --market lake-county [--min-score 12] [--out <dir>]
ebook-production-cli --manifest content/books/contracts-for-resale/ebook.json
```

## Sources

- [Minnesota law for assigning property contracts](../../../../../science-services-section/services/social-science-services-section/services/law-science-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-minnesota-law-for-assigning-property-contracts.md)
- [The Minnesota property-resale market](../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-the-minnesota-property-resale-market.md)
- [Brokerage as a market mechanism](../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/content/text/documents/articles/notes/2026/08/28/2026-08-28-note-on-brokerage-as-a-market-mechanism.md)
- [St. Louis County tax parcels (open data)](https://open-data-slcgis.hub.arcgis.com/datasets/5f05e9148b4a4fe58b04d62e37decff2_7)
- [Parcels, Compiled from Opt-In Open Data Counties, Minnesota](https://gis.data.mn.gov/maps/69148d3959194a05a23964cc60f6517b)
- [City of Duluth, Housing Trust Fund](https://duluthmn.gov/planning-development/housing/housing-trust-fund/)
- [City of Duluth, proposed zoning changes](https://duluthmn.gov/web-subscriptions/View-press-release/?prid=8388)
- [DEDA special meeting, 2025-07-24 (Dirt, Inc. parcels)](https://duluthmn.gov/media/websubscriptions/40/20250724-40-18473.pdf)
