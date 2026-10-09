---
title: "Buyers first"
---

# Buyers first

The most valuable call you make is to a buyer. One builder who tells you where
they build, what they pay and how fast they close tells you which of a thousand
owners are worth calling and what the Group can offer each of them. The
business plan's first milestone is twenty recorded buy boxes, before most
seller calling starts.

## What a buy box is

A **buy box** is a buyer's standing description of what they will buy. You
record it with `land-buy-box-record`. It has these parts:

| part | what to ask | how it is recorded |
|---|---|---|
| markets | "Which towns or counties?" | `markets=duluth,hermantown` |
| kinds | "Lots, larger sites, houses, land?" | `kinds=infill-lot` |
| areas | "Which neighborhoods, plats or ZIP codes?" | `areas="Lakeside,Lester Park,55804"` |
| size | "How many lots, how many acres, how wide?" | `minStandardLots=1 maxAcres=2` |
| price | "What do you pay for a buildable lot there?" | `maxPrice=12000` |
| utilities | "Do you need water and sewer at the street?" | `utilitiesRequired=true` |
| speed | "How fast can you close? Cash or financed?" | `closeDays=30 cash=true` |
| how to send | "Email, text or call?" | `sendVia=email email=...` |

Once recorded, the buy box goes to work by itself. Every parcel that fits it is
marked with the buyer's name in the lead list, and the offer ceiling on those
parcels drops to the buyer's price less the Group's fee.

## Who to call

`land-buyers` lists two groups.

1. **Recorded buyers**, with their buy boxes and how many parcels each one
   matches.
2. **Candidates**: owners who already hold several vacant residential lots in
   a market, or bought two or more in the last three years. These are the
   builders and traders the county records reveal.

Start with the names you already know are building: in Duluth, Dirt, Inc. and
One Roof Community Housing, then the companies at the top of the candidate
list. Add builders you find in the city's permits, in the news, and on job-site
signs. For houses, add the landlords and renovators who show up as candidates
in Minneapolis, Saint Paul and Duluth. For rural land, add the land investors
who mail offers in the northern counties; their letters name them.

A candidate is sometimes not a buyer at all: a company holding lots around its
own plant, or a family holding lots next to the family house. The call finds
out. Log `not interested` and move on.

## The builder call

> Hi, is this [name / company]? This is [your name] with the 561 Group. We find
> land in [market], mostly from owners who live out of town, and put it under
> contract for builders. I see you've been buying lots around [area]. Are you
> still looking?

If yes, ask the buy-box questions in the table above, in any order the
conversation allows. Then:

> Here's how it works on our side. When a lot that fits comes under contract,
> you hear about it first, at a price that already fits what you just told me.
> You take our contract, close at a title company, and pay our fee there. If
> it isn't a fit, you just say no. Can I send you a one-page summary of that?

Send the buyer introduction the same day (`land-document-draft
template=buyer-introduction`), and log the call.

## What to say about the city's free lots

Duluth's builders can get some tax-forfeited lots from the city at no cost,
and the city's Housing Trust Fund lends gap and short-term construction money
for infill, rehabilitation and conversion housing. Both are good for builders,
and both matter to you.

- The free lots are a competitor. Ask: "What do the city's lots not give you?"
  The answer (location, size, utilities, timing) belongs in the buy box.
- The trust fund is a help. A builder who can finance construction through it
  can buy more lots. Mention it to builders who do not know it.

## Investors who buy land and houses

Rural land and houses are bought by investors more than by builders. The call
is the same, with different questions:

- For land: "Which counties? What size parcels? Do you need road access or
  lake frontage? What do you pay per acre?"
- For houses: "Which neighborhoods? Rentals or renovations? What condition will
  you take? What's your price as a share of what it'll be worth fixed up?"

## Keeping buy boxes true

A buy box goes stale. Call each buyer every month or two and ask what changed.
Record a new buy box with any change; the newest one is the one used. If a
buyer stops buying, record `retired=true`.

Buyers who never take a deal we send tell us something too. Ask why, and put
the answer in the buy box's notes.
