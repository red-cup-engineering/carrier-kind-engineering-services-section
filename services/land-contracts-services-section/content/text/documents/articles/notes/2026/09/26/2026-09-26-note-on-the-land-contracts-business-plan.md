---
title: "The land contracts business plan"
description: "How the 561 Group's land contracts business runs and grows: buyers first, then matched seller leads in every market and kind of property, contracts assigned at a fee; the offices and the people in them, the sales procedure and its funnel, the economics from the trade's own yields, the licensing path, the order markets open in, and the second lines of work (county auctions, unclaimed surplus, estates)."
date-created: 2026-09-26
type: notes
authors:
  - emsenn
  - claude-opus-5-5
keywords:
  - contract-assignment
  - wholesaling
  - duluth
  - minnesota
  - metroplat
  - metroplex
---

# The land contracts business plan

## The business

Owners of property they do not use (an inherited lot three states away, forty
acres of forest, a tired rental) will often trade some price for a fast,
certain sale. Builders and investors pay to have property that fits what they
build found and put under contract for them. The Group sits between them:

1. It learns what buyers buy (buy boxes).
2. It finds the parcels that fit, in every market it works.
3. It gets those owners to sign an assignable purchase agreement, with the
   assignment disclosed in writing.
4. It assigns the agreement to the buyer for a fee, and everything closes at a
   title company.

The Group earns the fee without owning the property. When a buyer is waiting
and the Group has the cash, it buys and resells outright.

The market and law behind this plan are in the science notes on
[the Minnesota property-resale market](../../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-the-minnesota-property-resale-market.md)
and [Minnesota law for assigning property contracts](../../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/law-science-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-minnesota-law-for-assigning-property-contracts.md).

## Markets and kinds

The business reads county parcel records. St. Louis County's own layer covers
Duluth, Hermantown, Proctor, the Iron Range cities and the county's towns, with
unpaid taxes and forfeiture years. Minnesota's statewide layer covers Lake,
Itasca, Crow Wing, Cass and Aitkin counties, Minneapolis and Saint Paul. Every
parcel is read as one of six kinds (infill lot, underbuilt site, seasonal,
rural acreage, a house its owner does not live in, forfeited), and the kind
sets the buyer, the offer range and the call.

Measured 2026-09-26: Duluth's pull holds 6,404 infill lots and 847 underbuilt
sites; Lake County 5,426 rural parcels and 1,139 seasonal; Minneapolis 11,762
houses their owners do not live in; Proctor 190 such houses; Itasca 22,835
rural parcels.

## Buyers first

Every parcel a caller works should already have a buyer.

1. **Buy boxes.** Call builders, investors and lot holders (`land-buyers`)
   and record what each buys (`land-buy-box-record`): markets, kinds, areas,
   size, top price, speed, cash, how to send a deal. Twenty buy boxes is the
   first milestone for each market.
2. **Matched leads.** The call queue gives callers only parcels that fit a
   buy box, ranked by how likely the owner is to sell.
3. **Price from the buyer.** The offer ceiling is the matched buyer's price
   less the target fee, capped by the county-estimate ceiling for the kind.

## Offices and people

| office | held by | what it does |
|---|---|---|
| Land caller | commission callers, as many as the markets need | calls buyers and owners, logs every contact, records buy boxes, sends letters, sets offer calls |
| Acquisitions lead | emsenn | makes offers, signs purchase agreements with the licensee named, puts up earnest money, seats callers |
| Dispositions lead | emsenn, until a second person joins | sends contracts to matched buyers, signs assignments |
| Transaction coordinator | an agent | pulls each market as its county refreshes, drafts documents, keeps deadlines and the pipeline current |

Callers are paid a share of each net fee under the joint-venture caller
agreement (40% in the book's examples), as partners in the deals they
originate, not as agents negotiating for anyone. They work in the metroplex at
ops.561.group, where the land caller office grants their commands, typed as
`key=value` pairs. The book *Contracts for Resale* is their training.

## The sales procedure

Each stage names what it means, the office that moves a deal on, and the
reasons a deal can die there (`STAGES` in `src/pipeline.mjs`). Every dead deal
names its reason, so `land-pipeline` and `land-activity` read out a funnel:
how many deals reached each stage, the rate between stages, and the losses by
stage and reason. The weekly review with each caller reads that funnel and
changes one action.

| stage | office that moves it on |
|---|---|
| lead | land caller |
| contacted | land caller |
| interested | acquisitions lead |
| offered | acquisitions lead |
| contracted | dispositions lead |
| marketed | dispositions lead |
| assigned | transaction coordinator |
| closed | — |

## Records

Every step is a record in the house semantic record journal under MetroPlat's
data root, stamped with the account that made it: parcel snapshots (per market,
dated), buy boxes, contacts (a contact tells for or against the owner's
interest, read as unknown, held, denied or contested), deals (one record per
stage change), and drafted documents. Nothing lives in a spreadsheet.

## Economics

- **Fees:** $2,000 to $10,000 on a single Duluth lot; more on multi-lot
  parcels, sites, rural and lake land, and houses. The trade's surveyed
  average is about $13,000 (range $2,500 to over $40,000).
- **Costs per deal:** earnest money of $100 to $500, returned or credited;
  e-signature on a free tier; title and closing paid by the buyer; about a
  dollar per letter mailed.
- **Yields (the trade's figures, to be replaced by our own):** one contract per
  800 to 1,500 dials on a good list; 1% to 2% answers on blind offers, 2% to
  15% on neutral letters.
- **What that means:** one caller at 60 to 100 dials a day signs a contract
  every two to five weeks. One contract a week takes two callers, or one caller
  and a monthly mailing of a few thousand letters. Two to four assignments a
  month by the second quarter takes three to four callers across two or three
  markets, with mail on the rural and lake markets.

## Licensing

Minnesota presumes anyone who takes part as principal in five or more real
estate transactions in twelve months is in the business of selling real
estate, unless a licensed broker or salesperson represents them (Minn. Stat.
82.55, subd. 19(g)). The plan's pace passes five in the first quarter. The two
routes, either enough:

1. A Minnesota broker represents the Group on its purchases and assignments
   for a flat fee per transaction, which also puts the Group's contracts in
   front of that broker's buyers.
2. Someone in the Group holds a salesperson license under a broker: 90 hours of
   courses, a state exam, and roughly $600 to $900.

Every contract names the licensee (`representedBy`), and `land-pipeline`
counts the contracts in the window. Wisconsin contracts carry the Act 208
wholesaler notice.

## The order markets open in

1. **Duluth** (infill lots and sites; buyers already known: Dirt, Inc., One
   Roof Community Housing, the lot-holding LLCs).
2. **Hermantown, Proctor and the Iron Range cities**, from the same county
   layer, with the same builders and the rental investors who hold houses
   there.
3. **Lake, Itasca, Cass, Crow Wing and Aitkin counties** for rural and lake
   land, worked by blind-offer mail and the calls that answer it.
4. **Minneapolis and Saint Paul** for houses their owners do not live in, sold
   to rental and renovation investors, once a caller there has twenty buy boxes.
5. **Superior, Wisconsin**, once the Act 208 notice is read against the enrolled
   act.
6. Any county whose parcel values are open, by adding a market (and, for a
   county with numeric class codes, its code table).

## Second lines of work

- **County auctions.** Since 2024-07-01 every forfeited parcel in Minnesota is
  auctioned within six months. The acquisitions lead matches each auction list
  against the buy boxes and tells matched buyers; the Group may bid and resell
  where the numbers work. Duluth alone holds 3,785 forfeited parcels.
- **Unclaimed surplus.** Former owners (and their heirs) may claim what an
  auction brings above the taxes, within six months of the county's notice.
  Counties post those sales; finding the owners and heirs is the heir search
  business's work.
- **Estates.** Estate, heirs and trust owners are land leads and heir search
  cases at once: 576 of the 3,215 Duluth seller leads on 2026-09-27.
- **Land the Group keeps.** A share of each net fee buys rural land of 20
  acres or more, from county lists on terms, at auction, or from owners the
  call queue finds when the Group's own buy box is the match, held so the
  forest incentive and the land's work pay its taxes
  ([note on land the Group keeps](2026-09-26-note-on-land-the-group-keeps.md)).

## Where it runs

The section exports `landContractOperations(binding)`; MetroPlat's catalog
composes it, and the metroplex at ops.561.group grants its verbs to the land
offices' holders as powers. Refreshing each market's snapshot is the
transaction coordinator's duty in the world, not a timer.
