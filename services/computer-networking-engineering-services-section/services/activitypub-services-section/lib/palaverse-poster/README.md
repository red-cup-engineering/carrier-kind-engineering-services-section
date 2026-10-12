# Palaverse poster (crucible + ruinfold game actors)

Filed copy of the box-side operational files for the two Palaverse game actors
(vision doc §5d) stood up on `ap.561.group` on 2026-08-19, per the deploy
runbook's "Next: the Paliaverse lane" section. That box, Pale Stone Bell (a GCE VM),
is retired, so this directory is now the only copy of `poster.mjs` and the
unit/Caddy files; the two actors are offline until they are hosted again.

## What's here

| File | Box location |
|---|---|
| `poster.mjs` | `~/ops/palaverse-poster/poster.mjs` |
| `systemd/ap-561-group-crucible.service` | `~/.config/systemd/user/` |
| `systemd/ap-561-group-ruinfold.service` | `~/.config/systemd/user/` |
| `systemd/ap-561-group-crucible-poster.{service,timer}` | `~/.config/systemd/user/` |
| `systemd/ap-561-group-ruinfold-poster.{service,timer}` | `~/.config/systemd/user/` |
| `systemd/ap-561-group-ruinfold-results.{service,timer}` | `~/.config/systemd/user/` |
| `Caddyfile.before-palaverse.txt` | what `~/.config/caddy/Caddyfile` was before this lane |
| `Caddyfile.deployed.txt` | what `~/.config/caddy/Caddyfile` is now |

## What this stood up

Two more actors on the same `ap.561.group` domain, same pattern the runbook's
temporary `second` proof actor used, but permanent: own port, own state dir,
own keys, `WorkingDirectory` pointed at the *same* shared release tree
(`~/.local/share/561-group/releases/activitypub-services-section/current`) as
`instance` — no separate code deploy per actor, just per-actor env vars.

| Actor | Unit | Port | Keys | State directory | Outbox file |
|---|---|---|---|---|---|
| `crucible@ap.561.group` | `ap-561-group-crucible.service` | 8102 | `~/.local/share/emsenn/activitypub-crucible/keys.json` | `~/.local/share/emsenn/activitypub-crucible` | `~/.local/share/emsenn/activitypub-561-games/crucible-outbox.json` |
| `ruinfold@ap.561.group` | `ap-561-group-ruinfold.service` | 8103 | `~/.local/share/emsenn/activitypub-ruinfold/keys.json` | `~/.local/share/emsenn/activitypub-ruinfold` | `~/.local/share/emsenn/activitypub-561-games/ruinfold-outbox.json` |

Caddy routes: path-matched `/actors/crucible*` / `/actors/ruinfold*` plus
query-matched `/.well-known/webfinger?resource=acct:{crucible,ruinfold}@ap.561.group`,
each proxied to its own port; the existing bare `reverse_proxy 127.0.0.1:8100`
stays last so `instance` still catches everything else. Added and reloaded
with `systemctl --user reload ap-561-group-caddy.service` — confirmed same
Caddy `MainPID` and `ActiveEnterTimestamp` before/after (zero downtime,
`instance` never touched by the Caddy change).

## A package fix this lane required

Standing this up surfaced two real gaps in
`@red-cup-engineering/activitypub-services-section` (fixed in `src/`, not
worked around here):

1. **`src/local-server.mjs` never read `ACTIVITYPUB_OUTBOX_PATH`.** It always
   passed its own hardcoded `async () => ({ items: [] })` as `listOutbox`,
   so `server.mjs`'s own outbox-file fallback (`loadActivityPubOutbox`) never
   ran for any `local-server.mjs`-hosted actor — including `instance`, whose
   outbox was invisibly always empty regardless of any env var. Fixed by
   loading the file via the same `loadActivityPubOutbox` helper, from the
   injectable `environment` object this module already threads everywhere
   else. New regression test: `test/local-server.test.mjs`, "local server
   honors ACTIVITYPUB_OUTBOX_PATH from the environment".
2. **`src/provider.mjs`'s outbox dispatcher had no `.setCounter()`.**
   Without one, Fedify renders the outbox as a bare itemless collection stub
   (no `totalItems`, no embedded `orderedItems`) no matter what `listOutbox`
   returns — the same reason the `followers` collection right above it in
   the same file already carries `.setCounter()`. Added, mirroring that
   exact pattern.

Both fixes: 54/54 tests passing (`node --test test/*.test.mjs`, up from
53 with the new regression test), `node --check` clean across every source
file. Redeployed with the runbook's own procedure (fresh timestamped
release, rsync, flip `current`, restart the app units — `crucible` and
`ruinfold` first, then `instance` afterward for consistency since the fix is
purely additive and `instance` has no `ACTIVITYPUB_OUTBOX_PATH` set, so its
externally-observable behavior is unchanged). Caddy was never touched by
this part of the work.

## poster.mjs

Two job kinds, pure seed computation, no game-server dependency for the
morning post (see the file's own header comment for full provenance):

```sh
node poster.mjs crucible morning   # today's crucible-daily:<date> seed
node poster.mjs ruinfold morning   # today's ruinfold sha256 seed + floor count
node poster.mjs ruinfold evening   # yesterday's (the day that just closed)
                                    # public leaderboard, top 3 -- reads the
                                    # real GET /leaderboard/:date; unreachable
                                    # or empty means an honest skip-and-log,
                                    # never a fabricated post
```

Mechanism (updated 2026-08-19, see "A package fix this lane required" below):
authenticates with the actor's own inbox/outbox bearer token
(`<state dir>/bearer-token`, 0600, the same file `local-server.mjs` already
persists) and `POST`s one AS2 `Create{Note}` to that actor's own
`/actors/{identifier}/outbox` (idempotent by activity `id` — a same-day
re-run is a no-op, not a duplicate post). The actor process appends it to its
live outbox store and, if it has followers, broadcasts the `Create` to every
one of their inboxes — no `systemctl restart` involved any more, and the post
is visible (including at its own dereferencable id) the moment the `POST`
resolves.

Both morning jobs also opportunistically link the previous day's rendered
replay page (`https://play.561.group/replays/<game>-daily-<date>.html`) —
but only after confirming with a live `HEAD` that the page actually exists;
omitted silently otherwise. As of the first live posts (2026-08-19), that
storefront path is not yet deployed on `play.561.group` (still local-only
under `sites/play.561.group/replays/`), so both first posts correctly
omitted it. Deploying that storefront path is separate, out-of-scope work
for the play.561.group site itself (no runbook exists for that site yet);
once it's live, the poster will start linking it automatically with no
further changes.

## Teardown (Palaverse actors only — never touches `instance`, Caddy's binary,
## or anything pre-existing)

```sh
B="ssh pale-stone-bell"

# 1. Disable the two actor units and the three timers
$B "systemctl --user disable --now \
  ap-561-group-crucible.service ap-561-group-ruinfold.service \
  ap-561-group-crucible-poster.timer ap-561-group-ruinfold-poster.timer \
  ap-561-group-ruinfold-results.timer"

# 2. Remove the unit files (leaves ap-561-group-activitypub.service and
#    ap-561-group-caddy.service, and every non-ap-561-group unit, untouched)
$B "rm -f ~/.config/systemd/user/ap-561-group-crucible.service \
  ~/.config/systemd/user/ap-561-group-ruinfold.service \
  ~/.config/systemd/user/ap-561-group-{crucible,ruinfold}-poster.{service,timer} \
  ~/.config/systemd/user/ap-561-group-ruinfold-results.{service,timer} \
  ~/.config/systemd/user/default.target.wants/ap-561-group-{crucible,ruinfold}.service \
  ~/.config/systemd/user/timers.target.wants/ap-561-group-{crucible,ruinfold}-poster.timer \
  ~/.config/systemd/user/timers.target.wants/ap-561-group-ruinfold-results.timer \
  && systemctl --user daemon-reload"

# 3. Revert the Caddyfile to its pre-Palaverse form and reload (graceful,
#    same-PID -- never restart the caddy unit for this)
$B "cp ~/.config/caddy/Caddyfile ~/.config/caddy/Caddyfile.bak-palaverse-teardown-\$(date -u +%Y%m%dT%H%M%SZ)"
# then restore Caddyfile.before-palaverse.txt's content and:
$B "systemctl --user reload ap-561-group-caddy.service"

# 4. Snapshot, THEN remove each actor's state (keys + custody -- irreversible)
$B "tar czf ~/ap-561-group-palaverse-state-backup-\$(date -u +%Y%m%dT%H%M%SZ).tar.gz \
  -C ~/.local/share/emsenn activitypub-crucible activitypub-ruinfold activitypub-561-games"
$B "rm -rf ~/.local/share/emsenn/activitypub-crucible ~/.local/share/emsenn/activitypub-ruinfold \
  ~/.local/share/emsenn/activitypub-561-games"

# 5. Remove the poster script itself
$B "rm -rf ~/ops/palaverse-poster"
```

The shared release tree (`~/.local/share/561-group/releases/activitypub-services-section/`)
and `instance`'s own unit/keys/state are never touched by any of the above —
they are the primary deploy this lane built on top of, governed by the main
runbook's own teardown section.
