---
title: "Working in the operations world"
---

# Working in the operations world

The 561 Group runs its work in one place: the **world**, at
**ops.561.group**. It works like an old text game. You sign in as your
character, you arrive in the room of your office, and the things your office
lets you do are your commands. Everything you do there is recorded under your
account.

## Getting in

1. The acquisitions lead gives you an account on ops.561.group and seats you in
   the **Land Caller** office. Seating takes two steps, a recognition and an
   induction, so an office is never held by someone nobody vouched for.
2. Sign in at ops.561.group and open the operations world.
3. You arrive and report to your office's room. Type `look` to see where you
   are.

## The commands everyone has

| command | what it does |
|---|---|
| `look` | describe the room you are in, who is here, and the way out |
| `report` | go to your office's room |
| `powers` | list what your offices let you do, with a line on each |
| `who` | who else is in the operations world |
| `say <words>` | speak to everyone in your room |
| `tell <name> <words>` | speak to one person |
| `help` | the command list |

## Your powers as a land caller

A power is typed as its name followed by what it needs, as `key=value` pairs.
Put quotes around any value with spaces. A value with commas and no quotes is a
list.

- **See the markets** and what each holds by kind:
  `land-markets`
- **Your next calls**, callbacks first:
  `land-call-queue market=duluth kinds=infill-lot limit=20`
- **Read one lead** before you dial:
  `land-lead parcel=010-0070-00180`
- **Search** with any filter:
  `land-parcels-find market=proctor kinds=dwelling delinquent=true`
- **The buyers**, recorded and candidates:
  `land-buyers market=duluth`
- **Record a buy box:**
  `land-buy-box-record buyer="DIRT INC" markets=duluth kinds=infill-lot
  areas="Lakeside,55804" minStandardLots=1 maxPrice=12000 closeDays=30
  cash=true sendVia=email`
- **Log a call, text or letter:**
  `land-contact-log party=owner parcel=010-0070-00180 outcome="offer call set"
  askingPrice=9000 callbackAt=2026-10-02T15:00 notes="inherited, never seen it"`
- **Draft letters** for several parcels at once:
  `land-document-draft template=neutral-letter parcels=010-0070-00180,010-0890-02470
  values.callerName="Your Name" values.callerPhone="218-555-0100"`
- **Your numbers** since a date:
  `land-activity since=2026-10-01`

Anything you can type as `key=value` you can also type as JSON, for example
`land-lead {"parcel": "010-0070-00180"}`.

## A morning, typed

```
report
land-call-queue market=duluth limit=25
land-lead parcel=010-0070-00180
land-contact-log party=owner parcel=010-0070-00180 outcome=voicemail
land-lead parcel=010-0890-02470
land-contact-log party=owner parcel=010-0890-02470 outcome=interested askingPrice=24000 notes="wants to sell before winter"
land-contact-log party=owner parcel=010-0890-02470 outcome="offer call set" callbackAt=2026-10-01T10:00
land-activity since=2026-09-30
```

## This book is in the room

This manual lies in the Land Contracts room. Type `read contracts-for-resale` for its
chapters and `read contracts-for-resale 5` to read chapter 5 there. Its printed edition,
as a PDF or an EPUB, is at `/library/contracts-for-resale.pdf` and `.epub` on
ops.561.group once you are signed in.

## The business as a whole

Land Contracts is one of the Group's micro-enterprises: a small business with its own users,
its own accounts and its own targets. `enterprise enterprise=land-contracts` reads it the way
the acquisitions lead does: the calls everyone has logged, how far deals get, what the business
has created for owners and captured in fees, and how that compares with the goal it has set
itself. `enterprise-bid` lets you commit to a target of your own (twenty buy boxes in a new
county by a date, say), and `enterprise-contract-sign` is how you enter a contract the business
offers its people, if its terms suit you.

## Why the operations world and not a spreadsheet

A spreadsheet forgets who wrote what and when, and two people editing it lose
each other's work. The operations world records every call as its own entry, stamped
with your account and the time, so your share of every deal is on the record,
nobody overwrites anybody, and the lead list always reflects every call anyone
has made.
