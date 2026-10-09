---
title: "Letters"
---

# Letters

Some owners are reached best by mail: owners whose number you cannot find,
owners who do not answer strangers, and owners of rural and lake land, which
land investors have always bought by letter. Letters are drafted from the lead
list, several parcels at a time (`land-document-draft template=... parcels=...`).

## Two kinds of letter

**The neutral letter** (`neutral-letter`) asks whether the owner would consider
selling, without naming a price. It uses the same words as your voicemail. More
owners answer it, commonly 2% to 15% depending on how the list was chosen, but
more of them expect a price near full value.

**The blind offer** (`blind-offer-letter`) names a price: the lead's opening
offer, a fifth to a half of the county's value for rural land. Fewer owners
answer, commonly 1% to 2%, but an owner who answers has already seen the number
and is much closer to signing.

Use the neutral letter for lots and houses, where the price depends on a buyer
or a walk-through. Use the blind offer for rural and seasonal land, where the
buyer pays by the acre and the county's value is a fair guide.

## Sending a mailing

1. Find the parcels: for example `land-parcels-find market=lake-county
   kinds=rural-acreage ownerLives=out-of-state limit=200`.
2. Draft the letters: `land-document-draft template=blind-offer-letter
   market=lake-county parcels=... values.callerName="..." values.callerPhone="..."
   values.callerEmail="..."`.
3. Print, sign and mail them. Each letter has the owner's mailing address from
   the county's records.
4. Log each one: `land-contact-log party=owner parcel=... outcome="letter
   sent"`. The letter tells nothing about interest, but it tells the next
   caller the owner has seen our name, and it counts in your activity.

## When they answer

Owners who answer a letter call or write you. Treat the call as a seller call
that has already opened: confirm they own it, thank them for answering, and go
to the questions. If they accept the offer in the letter as written, set the
offer call anyway: the acquisitions lead confirms the facts and sends the
agreement.

## What a mailing costs and yields

A letter costs about a dollar printed and mailed. At a 1% answer rate, 500
blind offers bring about five owners who have seen the price; if, say, one in three
signs, that is one or two contracts. For rural land, where a single fee can be
several thousand dollars, the arithmetic works, and the Group measures it with
your logged `letter sent` contacts against the contracts that follow.
