---
title: "The seller call"
---

# The seller call

A seller call has one goal: find out whether the owner would sell, and if so,
what number would make it worth doing, then set a time for the acquisitions
lead to make an offer. You do not make offers. You do not quote a price. You
learn what the owner wants and hand it on.

## The shape of every call

1. **Say who you are and why you are calling.** Your name, the 561 Group, the
   property.
2. **Confirm they own it.** Many numbers are wrong or old.
3. **Ask if they would consider an offer.**
4. **If yes, learn the property and the owner's number.** Let them name the
   number first, and write it down exactly.
5. **Set the offer call** with a day and time, and log it.
6. **If no, thank them**, ask whether to take them off the list, and log it.

## The opening

> Hi, is this [first name]? This is [your name] with the 561 Group. I'm
> calling about your property in [place], the [lot / land / house] at
> [street, or plat and block]. Do you still own that?

If yes:

> We buy property there directly from owners, and I wanted to ask whether
> you'd consider an offer on it. We close at a local title company, with no
> agent and no commission.

## When they are open to it

Ask what you need for a real offer. Keep it a conversation, not a form.

- How did you come to own it? How long have you had it?
- Have you been out to see it? Anything I should know: access, wetland, a
  neighbor using it, a well or septic system?
- Is anyone else on the title with you?
- If we could close in the next 30 to 60 days, what number would make this
  worth doing for you?

When they name a number, repeat it back and write it down. If they will not
name one:

> That's fair. Would it help if our offer lead called you with a number, and
> you can tell them what you think of it?

Then set the call:

> Thanks. I'll pass this to [the acquisitions lead], and they'll call you with
> an offer. What's a good time, [day] or [day]?

Log `offer call set` with the asking price, the time, and your notes.

## By kind of property

**An infill lot or a site.** Builders want to know about access, slope,
utilities and whether a neighbor uses it. Ask. If the owner does not know,
say so in the notes; the builder will look.

**Rural acreage or seasonal land.** Owners of forest land often have not seen
it in years. Ask about road access, whether it is landlocked, whether anyone
hunts it, and whether there is any cabin, shed or trailer on it. Many of these
owners reach you by answering a letter (chapter 7), so they have already seen a
number; start from it:

> Thanks for calling back about our letter on your land in [county]. Were you
> thinking about the offer, or would you like to talk about the price?

**A house the owner does not live in.** Ask about tenants and leases, the
condition (roof, furnace, water heater, foundation), what they would want to
fix and what they would not, and whether they would allow a walk-through. A
house is priced only after someone sees it, so the offer call becomes a visit:

> Our offer lead would want to see it before making a number. Would the tenant
> allow a walk-through if we give them notice?

**An estate, heirs or a trust.** Ask who handles the property now:

> Are you the one handling the property for the family, or is there someone
> else I should talk with?

A personal representative or trustee signs for the estate or trust. If nobody
has been appointed, or the family has never probated the estate, the sale
cannot close until someone can sign. Say so plainly, log it, and note
`heir search` in your notes: the Group's heir search business does exactly
that work, and the acquisitions lead may refer the family to it (chapter 14).

## Unpaid taxes and forfeiture

If `backTaxes` is more than zero:

> I see the county shows some unpaid taxes on it. That's common, and they get
> paid at closing out of the sale, so nothing comes out of your pocket up front.

If `forfeitYear` is this year or next, say what the county's records say, and
say it accurately:

> The county's records also show the property could forfeit in [year] if the
> taxes aren't caught up. If that happens, the county auctions it, and you'd
> need to file a claim afterward to get anything above what's owed. Selling now
> means you choose the price and get paid at closing.

That is how Minnesota law works since July 2024: after forfeiture, the county
must auction the property, and the former owner may claim what the auction
brings above the taxes and costs, by filing a form within six months of the
county's notice. Do not tell an owner they will "lose everything". It is not
true, and we do not say things that are not true.

## Voicemail

> Hi [first name], this is [your name] with the 561 Group. I'm calling about
> your property in [place], near [street or plat]. We buy property there and I
> wanted to see if you'd consider an offer. You can reach me at [number].
> Thanks.

## Text

Only to a number that belongs to the owner, sent by you, one at a time:

> Hi [first name], this is [your name] with the 561 Group. I'm interested in
> buying your property in [place] ([street or plat]). Would you consider an
> offer?

## What to log after every dial

Log every dial, even the ones nobody answers (`land-contact-log`):

- `party=owner parcel=...`
- `outcome=` one of `no answer`, `voicemail`, `wrong number`, `not owner`,
  `callback`, `interested`, `offer call set`, `not interested`, `remove`
- `askingPrice=` when they named one
- `callbackAt=` when you promised to call back (an ISO date and time, like
  `2026-10-02T15:00`)
- `notes="..."` for anything the next person should know

Your share of a deal depends on the log: a deal is yours when you first
reached the owner who later signs and logged it before the offer call.
