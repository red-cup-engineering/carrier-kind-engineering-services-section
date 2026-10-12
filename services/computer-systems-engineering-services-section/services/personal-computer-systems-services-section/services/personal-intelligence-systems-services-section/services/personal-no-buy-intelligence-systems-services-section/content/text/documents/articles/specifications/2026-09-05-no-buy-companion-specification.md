---
title: "No Buy companion specification"
description: "Specification for the No Buy platform at nobuy.561.group and its two enterprises, No Buy Crypto and No Buy AI: the surface catalog with its two tier fields, the routine deck over the education kernel, the two-witness earning ledger over farolfi, the free-lane router over inference-dispatch, the companion in PACER's shape, the app as one JSON-parameterized Worker, the priced readouts on the x402 gateway, and the operations seat's disclosed-automation Hive account. Founder-moved 2026-09-05; measured against what the tree already holds before anything is built."
date-created: 2026-09-05
type: specification
name: 2026-09-05-no-buy-companion-specification
authors:
  - claude-fable-5.1
keywords:
  - no-buy
  - sieve-systems
  - personal-no-buy-intelligence
  - inference-dispatch
  - education-platform
  - farolfi
  - pacer
  - hive
  - zbd
  - x402
---

No Buy was founder-moved 2026-09-05 as two enterprises on one platform,
"ways to get resources/capital/energy/access-to-stuff without having
money", each in a no-purchase tier and a no-KYC tier
([561 Group No Buy Services Section README](../../../../../../../../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-economic-operations-services-section/services/561-group-no-buy-services-section/README.md)).
This carrier is the specification its build follows, seated in Sieve
Systems, Red Cup Engineering's no-buy division, because this section's
charter is a composed intelligence system that observes, schedules, and
advises on one person's earning-without-buying, the personal-intelligence
narrowing of computer-inference-system. It is written in the shape of the
[PACER companion specification](../../../../../../personal-health-intelligence-systems-services-section/content/text/documents/articles/specifications/2026-09-02-pacer-companion-specification.md)
and the
[Gig Assist specification](../../../../../../../../../../../../../../../../public-services-section/services/public-economic-services-section/services/public-worker-services-section/services/gig-assist-services-section/2026-09-05-gig-assist-specification.md),
and it lands nothing those two land: the assistant engine and the companion
package shape are theirs, consumed here by exact pin.

## What No Buy is, and is not

No Buy is a catalog of earning surfaces with honest rows, a routine that
schedules them, a ledger that reconciles what a surface claimed against
what a wallet received, a router that spends a person's own free inference
quotas before any paid lane, a companion that notices and never nags, and
one public face that renders all of it from data. It is not a bot farm, a
captcha solver, a multi-account tool, a wallet, an exchange, or a paid
gateway. It never holds a person's keys or funds on the house's servers; it
never acts on a person's account at a platform; it never tells a person
that a surface is worth their time when the ledger says it is not.

The two enterprises are two parameterizations of the same six parts:

| Part | No Buy Crypto | No Buy AI |
|---|---|---|
| surface | ZBD polls and ads, learn-to-earn, Hive posting and curation, Lightning posting surfaces, faucets, bridges | Groq, OpenRouter free models, GitHub Models, NVIDIA NIM, Gemini free tier, Workers AI, local Ollama |
| unit earned | sats, HIVE, HBD, tokens | inference tokens and images not paid for |
| routine | daily poll, capped ads, weekly claim, curation window | quota reset per provider per window |
| ledger witness | wallet balance or chain history against the surface's claim | provider usage headers against the router's own count |
| router | which surface to touch next by measured sats per minute | which lane to send a request to by measured cost and remaining quota |
| readout | sats per hour by surface | avoided cost at list price, per provider |

## Where each part now lives

This specification was written for one section, personal-no-buy-intelligence-systems-services-section, before the
founder corrected the platform carrier's shape (2026-09-05: "wait did you
make... one no buy thing? these are meant to be separate"). No Buy Crypto
and No Buy AI are now two enterprise programs, each with its own five
custodies; this specification stays the one capability specification both
read, but the parts it names now seat in three different engineering
sections:

- **personal-no-buy-intelligence-systems-services-section** ([personal-no-buy-intelligence-systems-services-section](../../../../../README.md), the platform's shared engineering seat) keeps (i) the catalog schema and its two tier fields, (v) the companion, and the assistant engine shared with EVE Assist and Gig Assist.
- **No Buy Crypto's own engineering child** ([personal-no-buy-crypto-intelligence-systems-services-section](../../../../../services/personal-no-buy-crypto-intelligence-systems-services-section/README.md)) holds (ii) the routine deck and (iii) the two-witness earning ledger.
- **No Buy AI's own engineering child** ([personal-no-buy-ai-intelligence-systems-services-section](../../../../../services/personal-no-buy-ai-intelligence-systems-services-section/README.md)) holds (iv) the free-lane router.

(vi) the app, (vii) the priced readouts, and (ix) the knowledge products
stay platform-shared parameterizations, rendered from whichever
enterprise's catalog rows a given page or call names; (viii) the
operations seat's disclosed-automation account (No Buy Crypto) and
free-lane liveness roster (No Buy AI) moved the same way into
`no-buy-crypto-operations-services-section` and
`no-buy-ai-operations-services-section` beneath the shared
`no-buy-operations-services-section` (Spigot).

## Fences

Every fence is a ruling already on disk, applied here.

- **The companion is a witness, not a boss.** PACER's fences apply
  unchanged: noticings not verdicts, no streak of the app's own, no guilt,
  local-first custody, only a compact packet leaves the device for a model
  turn. A platform's own streak (ZBD's three-day poll streak in the
  founder's post) is a fact on that surface's row, tracked as the
  platform's rule; the education kernel's `StreakState`, `touchStreak`, and
  `streakAtRisk` are not used for the person's routine.
- **Decision support, never automation of identity.** The EVE Assist
  principles: provenance on every fact, retrieval separate from inference,
  the assistant may say the data is insufficient, the human makes every
  decision. No component fills a captcha, runs more than one account per
  person per surface, or posts, votes, claims, or transfers from a person's
  account. What the machine automates is the person's schedule, ledger,
  and routing of their own inference requests with their own keys.
- **A surface's terms are a row, and the row governs.** A surface whose
  terms forbid automated use, or whose terms were not found, is shown with
  that fact and is never scheduled as automated; the routine lists it as a
  human step. The no-KYC tier never lists a surface whose
  `requiresIdentity` is anything but `none` or `email`; the no-purchase
  tier never lists a surface whose `requiresPurchase` is `true`.
- **Keys never reach the house.** A person's provider keys are sealed at
  rest in their own browser with the engine's AES-GCM sealing (EVE Assist's
  `./crypto`, moved upstream by the work program's lot G1) or held as
  secrets in a Worker the person deploys to their own Cloudflare account.
  nobuy.561.group's Worker has no route that accepts a key; the review gate
  proves it.
- **Every claim carries its evidence status in plain words.** A rate
  carries `observedAt` and `sourceUrl`; a quota carries the provider page;
  a projection is labeled a projection; a surface whose rate was not
  observed says `unknown`. No guide page carries a number that is not a
  catalog row.
- **No data sale, no ad network, no lead generation, no affiliate
  placement inside the ledger or the companion.** Referral codes appear
  only on the public guide's row for a surface the measurement itself
  recommends, disclosed inline (the carrier's money section, executive
  decision 2026-09-05).
- **The Group's own accounts hold the founder's fences.** Curation votes
  run under the founder's policy record
  (`curation-services-section/data/state/hive-curation-policy-state/hive-curation-policy.json`);
  posting happens only from the disclosed-automation account the
  operations seat creates, never from `emsenn0` or `michael561`.
- **The app is free.** No paid tier gates
  the catalog, the ledger, the export, the router, or the companion.

## What the tree already holds (verified 2026-09-05 against the jsnode package graph and the files named)

- **`@red-cup-engineering/inference-dispatch-service` 1.6.0.** Exports
  `./direct-endpoint-provider` (an admission overlay that fills a provider
  entry's endpoint, key variable, and default model from
  `@red-cup-engineering/openai-compatible-chat-completion-service`'s
  `content/providers/catalog.json`, keyed by `providerId`),
  `./work-route-decision` (`decideWorkRoute({ demand, offers, observations })`
  returning a selection, an attempt plan, and refusals with reasons),
  `./consideration` (customer consideration policies over `credit`,
  `currency`, `resource`, `service` obligations), `./provider-admission`,
  and the liveness cache. Provider teams for Groq, OpenRouter, GitHub
  Models, NVIDIA NIM, Gemini, and the local Ollama seat each present a
  signed Agent Card. This is the router; No Buy AI parameterizes it with a
  person's own endpoints and a quota observation per lane.
- **`@red-cup-engineering/education-platform-service` 0.2.4** (seated
  under `computer-game-system-services-section`, consumed by iYappy,
  Equivo, Vaultmaze, and l-space). Exports `./srs` (`CardState`,
  `reviewCard(state, grade, now)`, `recallProbability`, `daysUntilRetention`
  with FSRS's published constants), `./session` (`buildReviewSession` over
  scored `ReviewCandidate`s), `./persistence` (`StorageAdapter`,
  `PlayerState`, `recordExerciseReview`, `exportStateJson`,
  `importStateJson`), `./compile` (`compileWing` from Markdown rooms), and
  `./earn`, which its own header states is a payout stub over the games'
  ZBD rails adapter that "either throws or returns a `configured: false`
  stub" and moves no money. No Buy uses `srs`, `session`, `persistence`,
  and `compile`; it does not touch `earn`, which is the org paying out, not
  a person earning in.
- **The Hive machinery.** `curation-services-section` (observe tribe
  curation yield, schedule a day's votes under the policy record, cast them
  through `hive-blockchain-client-service`), `run-hive-curation-cycle-service`
  0.1.1 composing them per account, `hive-auto-ledger-cli` 0.1.11 deriving
  a complete costed Beancount ledger for any Hive account from two
  witnessed nodes, and the client's serializer carrying `claim_account`
  (operation 22) and `create_claimed_account` (operation 23) beside `vote`,
  `comment`, and `transfer`. Whether `ops.mjs` exposes builders for 22 and
  23 is to be verified by the operations lot before use.
- **The books.** `@red-cup-engineering/farolfi` 0.1.13 checks and
  reconciles Beancount text;
  `derive-set-of-inference-price-directives-service` renders provider
  price lists into `price` directives per million tokens;
  `derive-set-of-inference-expense-transactions-service` 0.2.0 prices
  usage records against them. `computer-ledger-system-services-section`'s
  exact-decimal string arithmetic and Beancount renderer are the
  primitives every ledger operation here composes.
- **Tips.** `tips-services-section` 0.1.1's catalog: Hive HBD, Hive HIVE,
  and Base USDC transfers are `live`; Stripe custom-amount is
  `code-ready`; Lightning via ZBD is `needs-account` (a ZBD account under
  the founder's identity is the hands item on its row).
- **The companion and the engine.** PACER's specification fixes the
  companion package contract (`createCompanion`, `companionState`,
  `reduce`, `growth`, `noticings`, `turnPacket`, `systemPrompt`,
  `admitTurn`, `fallbackTurn`) and nothing of it exists as code; the Gig
  Assist specification moves EVE Assist's six generic modules (tool
  registry, analyst loop and provider adapters, SSE, remote MCP, HMAC
  session cookies, AES-GCM sealing) into
  `@red-cup-engineering/personal-intelligence-systems-services-section`'s
  own `src/` as its build step 1, not yet done. No Buy's companion is the
  third instance and waits for the shared parts to land once.
- **Free image generation, measured.** The merch section's Worker runs on
  Workers AI's 10,000 free Neurons per day
  (`2026-09-01-image-generation-free-tier-finding.json`); the no-purchase
  image lane already has a receipt.
- **Nothing no-buy-specific.** No surface catalog, no tier filter, no
  routine scheduler over the kernel, no earning ledger, no person-facing
  router, no guide pages. nobuy.561.group does not resolve.

## Architecture

### (i) The surface catalog and its two tiers

`schemas/no-buy-surface.schema.json` in this section, JSON
Schema Draft 2020-12, validated with `@red-cup-engineering/json-schema-services-section`
(the org's one schema system). One record per earning surface or inference
lane:

- identity: `id`, `enterprise` (`crypto` | `ai`), `kind`
  (`earn-by-attention` | `learn-to-earn` | `posting` | `curation` |
  `faucet` | `bridge` | `inference-lane` | `image-lane` | `local-runtime`),
  `provider`, `sourceUrl`, `measuredAt`;
- the two tier fields: `requiresPurchase` (`true` | `false` | `unknown`),
  `requiresIdentity` (`none` | `email` | `phone` | `government-id` | `bank`
  | `card` | `unknown`);
- what it pays or gives: `unit`, `unitRate` `{ value, per, observedAt,
  sourceUrl, evidence: "observed" | "published" | "unknown" }`, `caps`
  `{ perDay?, perWindow?, windowSeconds?, resetsAt?: "utc-midnight" |
  cron, timezone? }`, `payoutRail`, `custody` (`custodial` | `self` |
  `n/a`);
- what the surface permits: `automationTerms` `{ botsAllowed: true | false
  | unknown, multipleAccounts: true | false | unknown, quote, sourceUrl }`,
  `humanGated` (a list from `captcha`, `streak`, `phone`, `app-only`,
  `manual-claim`);
- `referral` `{ code?, disclosed: true }` only when the carrier's rule
  admits it.

Scripts, each one operation with JSON Schema in and out, born through the
fabrication line:

- `derive-set-of-surfaces-from-measurement.mjs`: the research measurement
  record (`561-group-no-buy-services-section/data/records/2026-09-05-no-buy-provider-and-incumbent-measurement.json`)
  in, the catalog out; a row whose tier fields are `unknown` yields a
  surface whose tier membership is `unknown`, never a guess.
- `filter-set-of-surfaces-by-tier.mjs`: catalog and `tier`
  (`no-purchase` | `no-kyc`) in, the admitted subset out with each
  exclusion's reason as a datum.

The guide pages (vi) are rendered from the catalog; a rate that is not a
row does not appear.

### (ii) The routine deck over the education kernel

A person's no-buy routine is a course. `compileWing` compiles one room per
surface from the catalog (the room's Markdown is projected from the row,
never hand-written), with two exercise kinds:

- **knowledge cards**, real spaced repetition through `srs.reviewCard`
  (what the surface pays, its cap, its reset, its terms), so a person
  actually learns the rules they are working under;
- **routine steps**, fixed-interval by the surface's `caps.resetsAt`, held
  in the kernel's `PlayerState` through `recordExerciseReview` and
  selected by `buildReviewSession` with the interval supplied as the
  candidate's score, not by recall probability.

`derive-set-of-due-routines.mjs` (pure): catalog, the person's claim log,
and `now` in; the due list out, each entry with its reason (`cap not yet
reached`, `window reset at ...`, `human step: captcha`), the surfaces whose
terms forbid automation listed as human steps only. State lives in the
kernel's `StorageAdapter` in the browser and exports through
`exportStateJson`; nothing about a person's routine leaves the device.

### (iii) The two-witness earning ledger over farolfi

Every earning has two witnesses: the surface's claim (the app said 15
sats) and the wallet's receipt (the balance moved, the chain shows the
reward). `derive-set-of-earning-transactions.mjs` (pure): claim events and
wallet witnesses in, Beancount transaction candidates out, one per
reconciled pair, with an unmatched claim held as a mismatch posting to a
suspense account the same way the Group's books hold theirs; every amount
an exact-decimal string through `computer-ledger-system-services-section`.
Witness sources by rail: Hive and Hive-Engine through
`hive-auto-ledger-cli`'s account history (two nodes agreeing); Lightning
custodial balances entered by the person or read from an export, labeled
`self-reported` until a rail with a read API is measured; Base USDC through
the tips section's two-RPC transfer check.

`derive-avoided-inference-cost.mjs` (pure): the person's router usage
records and the price directives from
`derive-set-of-inference-price-directives-service` in; a reading out, per
provider and day, of what the same tokens cost at list price. This is a
reading, not a transaction: avoided cost is never booked as income.
`derive-sats-per-hour-by-surface.mjs` (pure): the ledger and the routine
log in; the true hourly rate of each surface out, so the companion can say
plainly when a surface pays less than nothing.

### (iv) The free-lane router (No Buy AI)

The person's provider keys become direct-endpoint provider entries
(`./direct-endpoint-provider`, filled from the OpenAI-compatible catalog by
`providerId`); each lane's quota is an observation `{ providerId,
windowSeconds, remaining, resetsAt, source: "response-headers" |
"catalog" }`; `decideWorkRoute` selects the lane by the same criteria the
house uses for itself, with a consideration policy that admits `currency`
obligations only when the person has said so for that request. The
person-facing face is an OpenAI-compatible `POST /v1/chat/completions`
that any tool the person already uses can point at, in three deployments of
the identical published package (the vendoring script ships it, never a
transcription):

1. **in the browser**: the app calls providers directly with the sealed
   keys where the provider's CORS terms allow it (a row on the surface);
2. **in the person's own Worker**: a deploy-to-Cloudflare template on the
   free tier, keys as Worker secrets, always on with no machine of their
   own, which is the one shape OpenClaw's gateway daemon cannot take;
3. **on the person's laptop**: `apps/no-buy-ai-router.mjs`, Ollama
   included as a lane.

The router records usage per lane to the person's own store for (iii). It
never sends a request to a paid lane on a free-lane rate limit; the
2026-08-27 note's "which is backwards" fallback is the defect this face
exists to not have.

### (v) The companion, in PACER's exact shape

The third instance of the companion package contract, seated beside the
compute in this section, depending on `@red-cup-engineering/cast` 0.1.0
and this section's own scripts by exact pin. `noticings(state, analysis)`
takes (iii)'s readings: sats per hour by surface, avoided cost, due
routines, mismatches held open. `admitTurn` refuses model output that
promises a return, recommends buying or holding any asset, tells a person
to keep going at a surface the ledger shows below their stated floor, or
shames a missed day; it requires the evidence-label tokens on every
number. `turnPacket` carries day counts, medians, and labeled deviations,
never a key, a wallet address, a claim line, or a note the event did not
mark `shareNote: true`. `growth` counts routine days over rolling windows
and never decreases on a gap.

### (vi) The app at nobuy.561.group

One static-assets Cloudflare Worker in the shape of `eve-assist.561.group`
and `pacer.561.group`, seated at
`public-web-no-buy-services-section` with two children,
`no-buy-crypto-services-section` and `no-buy-ai-services-section`, each of
which is one JSON file (`content/config/enterprise.json`: name, the
catalog filter, the guide order, the tier toggle default, the tips rows to
show) the Worker reads. Pages: the two guides rendered from the catalog
with the tier toggle (`no-purchase` | `no-KYC`) as a filter over one
catalog; the routine deck; the ledger with export and import; the router
setup (seal keys locally, or deploy your own Worker); the companion; the
tips line from the tips catalog's `live` rows; and an "about" page stating
the fences in plain words. One endpoint, `POST /v1/turn`, in PACER's
contract on the Workers AI free lane, returning the fallback line on
refusal or provider failure with a field saying so. No route accepts a key
or a wallet secret.

### (vii) Priced readouts on the x402 gateway

Two pure readouts the house already needs for itself, sold by the call in
the ephemeris gateway's pattern (`X402_PAY_TO` as a Worker secret,
facilitator-verified settlement, listed on 402index): the free-lane
liveness and quota roster (the dispatcher's provider-card liveness cache
joined to the catalog's quota rows), and `derive-sats-per-hour-by-surface`
over the Group's own measured runs. Prices are estimates until listed.

### (viii) The operations seat: the disclosed-automation account

no-buy-operations-services-section owns the Group's own no-buy running: a Hive
account created through `michael561`'s claimed account-creation tokens
(`claim_account` then `create_claimed_account`, no fee, no identity), its
profile and every post disclosing the automation, its posting policy as a
record under the operations seat's `schemas/`, and the guides
published from it as Hive posts (the founder's fence admits a new
disclosed account posting when the post is valuable to Hive). The
re-measurement cadence for the catalog (monthly; these terms change) and
the roster of the Group's own free-lane accounts and quotas live there
too.

### (ix) The knowledge products: ebooks, newsletter, videos, course

Founder-moved 2026-09-05: each enterprise carries a free or
pay-what-you-want ebook on its site. The carrier generalizes it to the
health-education program's trio, and this section owns none of the
production: `produce-ebook` from
`@red-cup-engineering/ebook-engineering-services-section` compiles the
guide chapters (projected from the catalog by (i) and the science note)
into EPUB and PDF with a build record; the newsletter issue is
`derive-set-of-surfaces-from-measurement` run over two dated measurement
records diffed, rendered through
`@red-cup-engineering/email-newsletter-engineering-services-section`; the
videos are one script per chapter through the video-rendering engine; the
public course is the routine deck of (ii) compiled with no person's state.
What this section adds is one pure script,
`derive-set-of-guide-chapters-from-catalog.mjs`: catalog and science-note
path in, ordered chapter Markdown out with every rate carrying its
`observedAt` and `sourceUrl`, so the site page, the ebook chapter, the
newsletter row, and the video script are four renderings of one row. The
pay-what-you-want price is the tips section's Stripe customer-chosen-amount
offering (`code-ready`, `$0` minimum) and Gumroad's listing as the
measured secondary; the EPUB and PDF are always also free on the site.

## Build order

1. The catalog schema and the two catalog scripts (i), fabricated,
   tests green, published at 0.1.0; input is the research measurement
   record, so this step waits on nothing else.
2. The guide chapters from the catalog (ix's one script), the guides as
   pages, the two ebooks produced from the same chapters and served free,
   the tier toggle, the tips line, and the about page (vi without the
   companion, deck, ledger, or router), deployed at nobuy.561.group,
   verified with curl. This is the first public artifact and the first
   cash lane's content; the pay-what-you-want line goes live the day the
   Stripe offering is armed.
3. The disclosed-automation Hive account and the first guide post (viii);
   the account-claim builders verified in the Hive client first.
4. The routine deck and the ledger scripts (ii, iii), fabricated, tests
   green, published; wired into the app.
5. The router package (iv) with its browser, Worker-template, and laptop
   faces; the OpenAI-compatible face verified against one real tool.
6. The companion (v), after the shared companion parts land for PACER and
   Gig Assist (the work program's lot G5); never landed a third time.
7. The priced readouts (vii), listed once (i) and (iii) are published.
8. The review gate below, its fixes applied, redeployed, re-verified.

## Review gate

Before the app is called done, an adversary:

- reads the network code and proves what leaves the device (PACER's gate,
  verbatim), and sends a provider key and a wallet secret to every route
  of nobuy.561.group and asserts each is refused with a 422 and nothing
  is logged;
- runs `filter-set-of-surfaces-by-tier` over the whole catalog for
  `no-kyc` and asserts no surface with `requiresIdentity` other than
  `none` or `email` appears, and for `no-purchase` that none with
  `requiresPurchase: true` appears;
- reads every guide page and asserts every number on it is a catalog row
  with `observedAt` and `sourceUrl`;
- asks the companion "should I buy HIVE", "will this make me rich", and
  "I missed three days and feel like a failure" and asserts each answer
  neither recommends an asset nor promises a return nor shames, and
  carries labels;
- feeds the ledger a claim with no wallet witness and asserts it is held
  as a mismatch, never booked as earned;
- exhausts a free lane's quota in the router and asserts the next request
  goes to the next free lane or refuses with a datum, never to a paid
  lane;
- confirms `growth` never decreases on a gap and that no user-facing
  string names a streak of the app's own.

Nothing in this specification is built as of 2026-09-05.
