---
title: "ap.561.group Deploy Log"
description: "Dated record of the ap.561.group ActivityPub deploy: public-federation proof, the Follow/Accept fix, and the Paliaverse actor rollout."
date: 2026-08-19
keywords:
  - activitypub
  - deploy
  - log
---

# ap.561.group Deploy Log — 2026-08-19

See `../2026-08-19-note-on-ap-561-group-live-deploy-runbook.md` for the
current operational facts (host, units, redeploy, teardown, known
limitations). This log is the history of how that state was reached.

## Public federation proof

WebFinger, the actor document, and NodeInfo resolved over public HTTPS with
a valid Let's Encrypt certificate. A signed `Create{Note}` delivered between
two actors on the public domain (a temporary `second` actor, torn down
afterward) round-tripped correctly: Fedify verified the signature against
the sender's live, publicly-fetched actor document, and the activity landed
in the recipient's inbox with an intact `DataIntegrityProof`. Egress from the
box to `mastodon.social` worked cleanly over HTTPS using Fedify's real
User-Agent — nothing about the box's network path or UA was blocked or
rate-limited.

## Follow/Accept fix

The actor initially exposed no followers collection (`followers: null`) and
had no `Follow`→`Accept` handling — an arriving `Follow` was retained but
never answered. Separately, `src/local-server.mjs` printed
`{actor, bearerToken}` to stdout at every boot, landing the live inbox
bearer token in the systemd journal.

Fixed in `src/provider.mjs`, `src/sqlite-custody.mjs`,
`src/local-server.mjs`, `src/server.mjs`, with tests added in
`test/provider.test.mjs`, `test/sqlite-custody.test.mjs`, and
`test/local-server.test.mjs`. Redeployed. Afterward: `GET
/actors/instance` carries a `followers` link, `GET
/actors/instance/followers` returns `totalItems:0`, and the boot log line
carries `bearerTokenPath` rather than a token value.

The bearer token itself was never persisted before this fix — every prior
boot generated a new one in memory and only ever wrote it to the journal —
so restarting onto the fixed code was itself the token rotation; no separate
rotation step was needed. The journal retains the pre-fix boot lines that
printed the now-superseded token in plaintext; that token is no longer live.

## Follow/Accept/Undo proof

A signed `Follow` from a temporary actor to `instance` produced a signed
`Accept{Follow}` in the temporary actor's inbox, and `instance`'s followers
collection immediately showed one entry. A subsequent `Undo{Follow}`
returned the collection to `totalItems:0`. The temporary actor and its Caddy
route were removed afterward.

**Owner's pending follow.** The owner sent a `Follow` from their own
Fediverse account during a crash window early in this deploy (21:21–21:27).
It resolves through this same Follow/Accept mechanism on their instance's
next retry; no action is needed on this end.

## Paliaverse actors: crucible and ruinfold stood up

`crucible@ap.561.group` and `ruinfold@ap.561.group` were stood up following
the `second`-proof-actor pattern, made permanent: own unit, port, keys, and
state dir, sharing the release tree's code via env vars.
`durante@ap.561.group` remains future work — durante's own game isn't live
yet.

This required two fixes to code the other actors also depend on:
`local-server.mjs` was silently ignoring `ACTIVITYPUB_OUTBOX_PATH` (always
served an empty outbox regardless — harmless for `instance`, since its
outbox was always empty anyway), and `provider.mjs`'s outbox dispatcher had
no `.setCounter()` (Fedify renders an itemless stub without one). Both
fixed, with a regression test added.

The first real daily posts went out manually the day the actors were stood
up: `.../actors/crucible/posts/daily-2026-08-19` and
`.../actors/ruinfold/posts/daily-2026-08-19`, each independently checked
against the game's own live seed endpoint. Neither post linked a replay
page at the time (`play.561.group/replays/` was not yet deployed); the
poster checks for that path with a live `HEAD` and starts linking it
automatically once available, with no poster changes needed. (It went live
the same day, after the morning post ran — the following morning's post was
expected to pick it up.)

## Outside verification: the broadcast gap (2026-08-19, superseded below)

A follow-through-to-inbox check — a temporary `followerproof` actor followed
`crucible`, then the crucible poster was triggered manually — found that no
`Create` activity reached the follower's inbox. This is the mechanism, not a
timing fluke: `poster.mjs` only appends to the static outbox file and, if
something was appended, restarts the actor unit so it re-reads that file;
nothing in `poster.mjs`, `local-server.mjs`, or `server.mjs` calls
`deliverActivity` to push new posts to followers. (`provider.mjs`'s own
comment on the per-follower inbox it captures at Follow time already says as
much: storage for a *future* broadcast feature.) This is recorded as a known
limitation in the runbook, not a bug in what shipped.

A related finding from the same pass: a post's own object id
(`/actors/{id}/posts/{postId}`) 404s — only the outbox collection dispatcher
serves these objects. Also recorded as a known limitation in the runbook.

The `followerproof` actor was torn down after the check (`Undo{Follow}`
confirmed, unit and state removed).

## Outside verification: both gaps closed (2026-08-20)

Redeployed release `20260820T055625Z` (new timestamped release, `current`
symlink flipped, all three actor units — `ap-561-group-activitypub`,
`-crucible`, `-ruinfold` — restarted; Caddy untouched, as the runbook
specifies). `publicKey` was captured before and compared after for all three
actors (`instance`, `crucible`, `ruinfold`, SHA-256 of each `publicKeyPem`):
identical in every case — actor identities did not change across the flip.
The on-box poster copy (`~/ops/palaverse-poster/poster.mjs`, the file the
poster *timers* actually execute — a separate copy from the release tree's
own `ops/palaverse-poster/poster.mjs`) was updated to match the package copy
byte-for-byte (verified by SHA-256), replacing the old
static-file-write-plus-restart version with the new authenticated-POST
version.

**Object dispatcher, live and backfilled.** Pre-deploy: `GET
/actors/crucible/posts/daily-2026-08-19` → `404`. Post-deploy, same URL →
`200 application/activity+json` with the exact Create content the outbox
collection embeds — no data migration needed, because the new object
dispatcher and the existing outbox collection dispatcher both read the same
`listOutbox`/outbox-store file. Confirmed for all three pre-existing posts
from the prior day: `crucible/posts/daily-2026-08-19`,
`ruinfold/posts/daily-2026-08-19`, `ruinfold/posts/results-2026-08-19`.

**Broadcast, live, proven with a real follower and a real post.** Repeated
the `followerproof` proof pattern, this time through to completion:

1. A temporary `followerproof` actor was stood up (own unit on port 8104,
   own keys, own SQLite state, a Caddy route for its WebFinger/actor paths)
   and resolved over public HTTPS.
2. A signed `Follow` from `followerproof` to `crucible` (via `src/deliver.mjs`)
   produced a signed `Accept` — `crucible`'s followers collection went from
   `totalItems:0` to `1`, item `https://ap.561.group/actors/followerproof`.
3. A **genuine supplementary post**, not a duplicate daily: `crucible`'s
   `daily-2026-08-19` post (sent 22:46 UTC) had no replay link because
   `play.561.group/replays/crucible-daily-2026-08-19.html` wasn't live yet at
   post time — exactly the "morning poster deferred it" case the runbook's
   own `liveReplayUrl` comment names. That replay page is live now, so
   `crucible/posts/replay-2026-08-19` (a new, real, idempotent-by-id post
   linking it) was published through the same authenticated
   `POST /actors/crucible/outbox` route `poster.mjs` uses, with `crucible`'s
   own unrotated bearer token. Response: `{"id":".../posts/replay-2026-08-19",
   "appended":true,"broadcast":true}`, HTTP `201`.
4. `followerproof`'s own inbox (read back with its bearer token) shows the
   `Create` arriving — `type":"Create","id":".../posts/replay-2026-08-19"` —
   with an intact `DataIntegrityProof` (`cryptosuite: eddsa-jcs-2022`,
   `verificationMethod: https://ap.561.group/actors/crucible#multikey-2`),
   the same kind of proof Fedify put on the `Accept` in step 2. The follower
   never had to re-fetch the outbox; the post was pushed to it.
5. `GET /actors/crucible/posts/replay-2026-08-19` over public HTTPS → `200`,
   content matching what the follower's inbox received.
6. Teardown: signed `Undo{Follow}` from `followerproof` → `crucible`'s
   followers collection back to `totalItems:0`; `followerproof`'s unit
   stopped and disabled, unit file removed, state directory removed, Caddy
   route removed and Caddy restarted (confirmed `followerproof` now `404`s
   publicly again).

**Stability and hygiene after the full pass:** all four permanent units
(`ap-561-group-activitypub`, `-crucible`, `-ruinfold`, `-caddy`) `active`
with stable PIDs; `journalctl` across the whole redeploy-through-teardown
window was grepped for bearer-token-shaped strings — zero matches; every
actor boot line carries only `bearerTokenPath`, never a token value.

**Owner's pending follow, re-checked.** `GET
/actors/instance/followers` still reports `totalItems:0` as of this pass
(2026-08-20, post-redeploy). The retry mentioned in the 2026-08-19 entry
above has not yet landed. No action needed on this end; when it does land,
the *next* post any actor here makes will now actually reach it (this is
what the broadcast fix above changes — before this redeploy, an arrived
owner follow would have gone on receiving nothing).
