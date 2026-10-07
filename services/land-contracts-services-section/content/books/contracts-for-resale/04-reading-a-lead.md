---
title: "Reading a lead"
---

# Reading a lead

Before every call, read the lead (`land-lead parcel=...`). It takes thirty
seconds and tells you what to say.

## The fields

| field | what it tells you |
|---|---|
| `kind` | infill lot, underbuilt site, seasonal, rural acreage, house, forfeited |
| `owner`, `mailing` | who to ask for, and where they live |
| `ownerLives` | local, elsewhere in Minnesota, out of state, or unknown |
| `ownerKind` | a person, a company, or an estate, heirs or trust |
| `lot`, `place` | where the property is: street address, or plat, lot and block |
| `acres`, `standardLots` | size, and how many standard lots it holds in that market |
| `class` | how the county classes it |
| `landEstimate`, `buildingEstimate` | the county's values |
| `openOffer`, `maxOffer` | where the Group would start and where it stops (for you, never for the owner) |
| `backTaxes`, `forfeitYear` | unpaid taxes, and the year the county projects the property will forfeit |
| `lastSaleYear` | when it last sold; blank means no recorded sale |
| `buyers` | the buyers whose buy boxes it fits |
| `interest` | what the owner has told us so far (below) |
| `stage` | where the deal is (chapter 8) |
| `why` | the reasons it scored, in plain words |
| `contactHistory` | every earlier call, letter and note |

## The score, and what `why` says

Leads are sorted by a score. Each reason adds or subtracts points, and `why`
lists the reasons so you can open the conversation with them.

- The kind of property (lots score highest, then seasonal land, sites and
  houses, then rural acreage).
- Room to build: more standard lots on a lot, more acres on rural land, and a
  named lake.
- **The owner lives away**: out of state scores more than elsewhere in
  Minnesota.
- Unpaid taxes, and a forfeiture year that is close.
- The owner is an estate, heirs or a trust.
- The owner has held it fifteen years or more, or it has no recorded sale.
- It scores less when the owner is a company (companies sell, but slower and
  through more people) and when the county values the land under $1,000.

Every one of those is a **logistical** reason: distance, inheritance, time, a
property nobody uses. None of them means the owner is in trouble, and you should
never talk as if it does.

## Interest: four readings

Every call you log tells something about whether the owner will sell to us.
"Interested", "callback" and "offer call set" tell *for*. "Not interested" and
"remove" tell *against*. "No answer", "voicemail", "wrong number" and "letter
sent" tell nothing. The lead reads all of it at once as one of four answers:

| interest | means | what you do |
|---|---|---|
| `unknown` | never reached, or nothing told either way | call |
| `held` | they said yes to talking price | set the offer call if not set |
| `denied` | they said no | leave them be; they drop out of your queue |
| `contested` | they said yes once and no once | call to settle it; the queue holds them out until a person resolves it |

The four readings come from the Group's own logic for evidence: a question can
have evidence for, against, both, or neither, and the system never throws
either side away. For you it simply means the list remembers every answer and
never pretends a mixed answer is a clean one.

## The call queue

`land-call-queue` puts the right lead in front of you.

1. Callbacks you promised, now due, come first.
2. Then owners of parcels that fit a buyer, not reached in the last two
   weeks, highest score first.
3. One row per owner: if an owner holds several parcels, you see all of them on
   one call.
4. Owners who said no, owners with mixed answers, and parcels already under
   contract are left out.

Narrow it with `market=` and `kinds=`. Add `includeUnmatched=true` only when
the matched leads are used up.

`land-parcels-find` is the full search, with every filter: size, value, class,
where the owner lives, owner kind, unpaid taxes, forfeiture year, last sale,
place name, buyer, interest and stage.
