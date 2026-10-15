# Kindle publishing system service

This service owns the market-to-KDP loop. Its browser windows, sign-ins and
saved sessions are the assisted browser's
(`@red-cup-engineering/assisted-browser-services-section`, under
computer-web-engineering): live submission never accepts an Amazon password,
a person signs in once in a visible window, and later checks and submissions
reuse the private session.

## Capture the KDP login

```sh
assisted-sign-in kdp
```

Complete Amazon sign-in, including any 2FA or CAPTCHA, in the visible window.
The command waits up to fifteen minutes for the KDP bookshelf/dashboard, then
writes `~/.config/561-group/browser-sessions/kdp.json` (mode `0600`, in a
`0700` directory). It prints only the path and the cookie count.

The KDP configuration is the credential store's `kdp.json`, rendered for this host at `$CREDENTIALS_DIRECTORY/kdp.json`
(with the Kindle validation public key beside it at `keys/kindle-validation/public.pem`). Its `storageState` property is optional and
defaults to that path. An explicit relative path is resolved relative to
`kdp.json`. The config file itself must be mode `0600` and must name the Kindle
validation public key. Browser state and private keys do not belong in the
repository.

Before any live KDP state-machine step, `isKdpSessionValid` opens the bookshelf
headlessly with the saved state. A missing, malformed, public, or expired state
stops submission with a `needs-human` journal record whose recovery command is
exactly `assisted-sign-in kdp`. Fixture dry-runs do not read a real session or make
network requests.

## Submit an edition

`scripts/submit-retail-edition.mjs --channel <id>` (`npm run submit -- ...`)
runs one accepted edition through a channel's gates
(`src/retail-channels.mjs`). The channels are `kdp`, `kdp-paperback`,
`google-play-books`, `apple-books` and `barnes-noble-press`. Kobo has none:
it refuses AI-generated books, and the house does not route around that
through a distributor.

- An ebook channel admits the signed validation of the exact EPUB and cover,
  the release acceptance, and the retailer's portability assay where the
  validation has one (Google Play Books, Apple Books).
- The KDP paperback admits the accepted print edition (`kdp-paperback-v1`):
  the proofed, preflighted interior and full-wrap cover PDFs.
- Every channel needs the founder's declarations receipt to cover the
  listing's AI answers, and the book's listing for that channel.
- KDP takes the book's launch plan (`--launch-plan`; the runtime's
  `launchPlan`). The plan's KDP choice sets the release: on publish, or a
  pre-order released on the plan's KDP on-sale date (`channelRelease` in
  `src/launch-plan.mjs`). A plan for another book is refused. A pre-order
  is made only for an edition with a release acceptance, and its EPUB is
  uploaded with it, so the house never makes an assetless pre-order.
  Without a plan, KDP's default holds: on sale once published.

It takes `--live` for the portal, `--rehearse` for a guided channel's panels
over a blank page, or `--fixtures <dir>` for KDP's saved pages. Dry runs keep
their state under `<data-root>/dry-run/`, apart from the live title's.

The Kindle eBook's live receiver is mapped (below). The others are guided
(`src/guided-retail-driver.mjs`): a visible browser at the portal, with a
panel that shows each step, the listing's values to copy, and Done or Stop.
Upload steps answer the portal's file chooser with the admitted file. Each
Done is evidenced by a screenshot. Irreversible steps, the paperback's free
ISBN and every publish, are the person's clicks. Sign in first with
`assisted-sign-in <retailer>`.

The live receiver (`src/kdp-live-driver.mjs`) opens a visible browser for a
person to supervise. It follows KDP's pages in order: details, then content,
then pricing. It stops for the person at these points:
- KDP's step-up sign-in;
- the categories dialog;
- a pre-order's release date. The pre-order radios are found by their labels.
  The date goes in through KDP's own date picker unless a date field
  labelled as the release date takes it;
- the final Publish, confirmed through an assist bar in the page.

The driver only acts on the title it created, starting from the new-title page
and then the draft id KDP assigns on the first save. It refuses any other title
id.

The AI-content dropdowns take their exact values from the declarations
receipt's `kdpForm.options`.

The selectors come from a read-only discovery of KDP's pages (see below).

## Other retailers

KDP is one channel of a retailer-neutral submission machine
(`src/retail-submission.mjs`). A channel definition supplies:
- its steps, and which steps the portal saves together;
- its admission gate on the exact artifact bytes;
- its declarations gate;
- its session check;
- its live and fixture drivers.

The machine keeps resumable state at `<dataRoot>/<channel>/<book>/state.json`.
It records human boundaries and repair requests. It issues one
`RetailerSubmissionReceipt` type for every retailer. The data root is this
section's `data/state/retail-submission-state` unless `--data-root` names
another. It holds the publisher's whole retail account, Ice Out and The Agent
Operator's Handbook (2026-09-29/30) included, because the weekly title
allowance is counted over every book under it. Each `state.json` is committed;
the screenshots under `evidence/` stay on the host (their digests are in the
state), and dry runs are never committed.

KDP lets an account create 2 new titles per format a week, and a saved draft
counts (`KDP_TITLE_ALLOWANCE` in `src/kdp-submit.mjs`). A live run on either KDP
channel counts the titles that channel's other books created since Sunday
00:00 UTC, from their `create-title` evidence. Once the week's are used it
stops `blocked` with `RETAILER_WEEKLY_TITLE_LIMIT` and a `retryAfter`, before
opening the browser. A title made by hand in the portal is not counted, so make
new titles through the machine.

A retail channel's id names its web account in the assisted browser's
registry: KDP (both of its channels), Apple Books for Authors, Google Play Books
Partner Center and Barnes & Noble Press. Kobo is not registered: it rejects
AI-generated books. Sign in once per retailer with
`assisted-sign-in <retailer>`.

Before a channel's live driver is written, the person at the node walks its
portal once with `portal-discover <retailer>`: sign in, go through a new book's
setup, click "Record this page" on each form, save nothing, then Finish.

## Review copies

`src/review-copy-grants.mjs` gives one reader a review copy under Causeway
Publishing's rulings (the 2026-10-02 note on the pre-release period of a
publication):

1. The invitation is checked. It says a review is welcome and never
   required, and asks a reviewer who posts to mention the free copy. It
   conditions nothing on a review, suggests no rating, offers nothing beyond
   the copy and never claims a human sender. An outreach message is checked
   as it will be sent and must carry the copy's link; otherwise the house
   invitation is used.
2. The grant id derives from the giver and the reference, so a repeat names
   the same grant.
3. The ebook section stamps the release-accepted EPUB for the reader
   (`advance-reader-v1`); the copy is validated with EPUBCheck.
4. The copy and its pointer are staged in `shop-561-group-goods`.
5. The grant is recorded at shop.561.group's `/api/review-copies`, expiring
   the day after the launch plan's advance-reading window closes.
6. A `MaterialConnection` record is written: grant, edition and stamped-copy
   digests, date, channel and the invitation. It names no reader.

The advance-reader team waits for the window to open; an outreach copy may
go early. Nothing goes out after the window closes.

```sh
node scripts/grant-review-copies.mjs --plan <launch.json> \
  --release-acceptance <kindle-release-acceptance.json> --epub <accepted.epub> \
  --title "Ice Out" --channel outreach --campaign <id> \
  --roster ~/.local/state/561-group/review-copies/<roster>.json
```

A roster is a private JSON array of `{name, email, reference, invitation?}`.
Readers, their addresses and any invitation that names them stay in the
private ledger (`$XDG_STATE_HOME/561-group/review-copies/<work>/<grant>/`,
0600). Records go to `<plan dir>/../review-copies/<work>/` in git. The key is
the shop's gift-agent key; the R2 token is `API_KEY_CLOUDFLARE_R2_EDIT`.

## Launch census

`src/launch-plan.mjs` derives a calendar from each launch plan
(`PublicationLaunchPlan` v2): announce, on-sale and final-file dates per
channel, pre-orders, the advance-reading window and the readouts, each with
the rule or retail-channel profile it came from. `src/launch-census.mjs` turns
those calendars into Causeway Publishing's requests on the work board:

- A milestone becomes a request 14 days before its date and stays one until
  3 days after it. The request says what will be true once the milestone is
  met, such as "Ice Out is up for pre-order on Kindle Direct Publishing
  (ebook) from 2026-11-03". It does not say how to get there.
- A plan the census cannot admit is not guessed at. It becomes a request
  that the plan be made admissible, naming the refusal, such as a
  forthcoming channel with no on-sale date. A conflict between an admitted
  plan and a channel's profile also becomes a request, such as a pre-order
  opening earlier than KDP allows. Both stay open until the plan is fixed.
- Each request's thread id comes from its content. While a date holds, the
  request stays on the same thread. If a date moves, a new request opens and
  the old one is withdrawn.

`derive-launch-census` writes the census to public-fiction's
`data/records/launch-records/census.json`. The `causeway-publishing` enterprise lists
that file under `derives`, so each turn of its loop opens the requests the
board lacks and settles the ones the census no longer asks for. The
node runs it every morning at 06:00 America/Chicago as its `launch-census`
job (`lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/bare-cedar-fog-services-section/data/records/machine-deployment-service-records/metroplat/deployments/bare-cedar-fog-host/deploy/jobs/launch-census.json`), from its release, with
`--retain`, which commits and pushes the census file and nothing else. The job
holds working-tree custody of that one file.

```sh
node scripts/derive-launch-census.mjs [--today YYYY-MM-DD] [--check] [--retain]
```

## Verification

```sh
node --test test/*.test.mjs
```

The fixtures use fake browser contexts and fake storage state. They do not use
Amazon, real account credentials, or live network access.

## Cover Lab

`src/cover-lab` owns cover research and selection for the Kindle loop in the
house dependency order: content-addressed records, pure convention/concept and
rubric logic, provider acquisition/generation adapters, then the run system.
It retains no sampled Amazon or publisher cover image. A
`CoverFeatureObservation` contains only derived palette, rendering class,
figure/pose, setting motif, title-area ratio, typography class, contrast, and an
optional non-reconstructive perceptual hash, with source, date, method, and
bias limits.

The rubric is frozen before generation. A selection requires at least three
different vision-model families, reports pairwise error correlations and
effective sample size, and runs finite-attention thumbnail choices at 100x160,
200x320, and grayscale. Generating-family judgments cannot be the sole judge.
Candidates are rejected for KDP-spec failure, generated-text artifacts,
hand/face defects, or a close perceptual-hash match to an observed cover.

Image models produce illustrations only; no model sets type. Cover Lab composites
title, subtitle, and byline over each candidate with Noto Sans (OFL-1.1) so the
judges and thumbnail tests see a cover. That preview is not the edition's cover.
A book adopts a chosen illustration by naming it in its `ebook.json` as
`coverArt`, with `cover: "illustrated"` and a `coverArtProvenance` that points at
the addressed `CoverGenerationReceipt`. The ebook section then sets the book's
own display and byline type over it from the design tokens, and binds the
illustration's bytes into the edition input digest. Byline adoption remains
`RESERVED_HUMAN_AUTHORITY_REQUIRED`, and so does the choice of cover. KDP
AI-image disclosure evidence travels with the decision receipt.

To write the reproducible plan and evidence records without network calls:

```sh
npm run cover-lab:plan -- /absolute/path/to/content/books/ice-out /absolute/path/to/data/records/cover-design-records/ice-out
```

The runtime's format step hands KDP the fabricated edition's own cover. A
1600 x 2560 JPEG goes through byte for byte; any other raster, such as a
typographic cover's PNG, is fitted to that size. Configured providers are never
called reachable: reachability requires a successful real invocation. Live
market acquisition must use the bounded, robots-respecting house source service.
