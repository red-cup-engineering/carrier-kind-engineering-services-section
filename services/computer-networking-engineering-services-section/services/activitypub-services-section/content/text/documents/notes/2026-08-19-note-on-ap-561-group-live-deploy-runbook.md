---
title: "ap.561.group Deploy Runbook"
description: "Operational runbook for the live ActivityPub instance at ap.561.group: host, unit, domain, state, redeploy, and teardown."
date: 2026-08-19
keywords:
  - activitypub
  - deploy
  - runbook
---


`@red-cup-engineering/activitypub-services-section` runs in production at
`https://ap.561.group`.

## Where it lives

| Item | Value |
|---|---|
| Host | GCE instance `bare-cedar-fog-cloud-mirror`, zone `us-central1-a`, project `five-six-one-group-dev` |
| Reach it | `ssh -i ~/.ssh/google_compute_engine emsenn@34.61.173.187` (no `~/.ssh/config` alias exists for this box — it is a *different* machine from the `red-cedar-gate`/`cold-red-gate`/`koios` aliases, which all point to `45.76.19.133`) |
| Domain | `ap.561.group` — Cloudflare A record → `34.61.173.187`, DNS-only (grey-cloud), zone `179300009777a1a35c04494c503b7ebd`, record id `5d299528dc1e296f005fb21a36d70f6a` |
| TLS | Caddy, automatic Let's Encrypt via TLS-ALPN-01 |
| App unit | `~/.config/systemd/user/ap-561-group-activitypub.service` (user unit, `emsenn`, linger enabled) |
| App port | `127.0.0.1:8100` |
| Caddy unit | `~/.config/systemd/user/ap-561-group-caddy.service` |
| Caddyfile | `~/.config/caddy/Caddyfile` |
| Release tree | `/home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-engineering-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/data/runtime/share/561-group/releases/activitypub-services-section/<timestamp>/`, `current` symlink points at the active one |
| Actor keys | `/home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-engineering-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/data/runtime/share/emsenn/activitypub/ap-561-group-keys.json` (0600) |
| State (KV + queue + inbox custody, one file) | `/home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-engineering-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/data/runtime/share/emsenn/activitypub/ap-561-group.sqlite` (+`-wal`/`-shm`) |
| Node | v24.16.0 via nvm at `/home/emsenn/.local/bin/node` |

Deployed by rsync of source + `node_modules` — never `git` in the chain, never
a remote `git pull`, never a worktree on the box. GCP resources this deploy
owns: static IP `ap-561-group-static` (`34.61.173.187`), firewall rule
`ap-561-group-web` (tcp:80,443), and instance tag `ap-561-group` (added
alongside the box's pre-existing `union-alpha-chain` tag; the box also runs
unrelated pre-existing services — Besu, a semiotic-exchange RPC server — that
this deploy does not touch).

## Actors

Each actor is its own process: own systemd unit, own port, own keys, own
SQLite state file, `WorkingDirectory` pointed at the shared release tree
(`ACTIVITYPUB_IDENTIFIER` and the other env vars are what differ — there is
no per-actor code deploy).

| Actor | Unit | Port | Caddy route |
|---|---|---|---|
| `instance` (neutral placeholder — not a Paliaverse actor) | `ap-561-group-activitypub.service` | 8100 | `ap.561.group` |
| `crucible@ap.561.group` | `ap-561-group-crucible.service` | 8102 | path `/actors/crucible*` + webfinger query match |
| `ruinfold@ap.561.group` | `ap-561-group-ruinfold.service` | 8103 | path `/actors/ruinfold*` + webfinger query match |

`durante@ap.561.group` is not yet stood up — durante's own game isn't live.

Three systemd user timers post daily content: `ap-561-group-crucible-poster.timer`
(08:00 UTC), `ap-561-group-ruinfold-poster.timer` (08:03 UTC), and
`ap-561-group-ruinfold-results.timer` (00:10 UTC, reads the closed day's
leaderboard from ruinfold's own public endpoint — skips and logs rather than
fabricating a post if that endpoint is unreachable or empty). Full detail on
the poster setup is in `lib/palaverse-poster/README.md`.

## Known limitations

Both broadcast-to-followers and per-object dereference — previously documented
here as gaps — are **fixed and live as of the 2026-08-20 redeploy**
(release `20260820T055625Z`). See the deploy log's ["Outside verification: both gaps
closed (2026-08-20)"](logs/2026-08-19-ap-561-group-deploy-log.md#outside-verification-both-gaps-closed-2026-08-20)
section for the live proof (temp-follower Follow→Accept→broadcast round trip,
`DataIntegrityProof` intact; object-id fetches for both new and pre-existing
posts returning `200`). Retained below for history.

- ~~**New posts are not pushed to followers' inboxes.**~~ Fixed:
  `provider.mjs`'s `publish()` now broadcasts every appended `Create` to each
  recorded follower's inbox via Fedify's own `context.sendActivity`
  (`sendActivityToFollowers`), called from the live
  `POST /actors/{identifier}/outbox` route `poster.mjs` and any manual
  publish now use — no restart, no static outbox file.
- ~~**A post's own object id does not dereference.**~~ Fixed:
  `provider.mjs` now registers `federation.setObjectDispatcher(Create,
  "/actors/{identifier}/posts/{postId}", ...)`, reading back through the same
  `listOutbox` the outbox collection dispatcher already used — one source of
  truth, so pre-existing posts (e.g. `daily-2026-08-19`) resolve too with no
  data migration needed.
- `crucible.561.group` (a different domain from `ap.561.group/actors/crucible`)
  carries an unrelated placeholder Cloudflare AAAA record pointing at some
  other Worker — worth resolving before that name is used for anything
  actor-related.

## Bearer token

The inbox bearer token persists at
`<dirname(ACTIVITYPUB_SQLITE_PATH)>/bearer-token` (0600) and is reused across
an ordinary restart. Set `ACTIVITYPUB_ROTATE_BEARER_TOKEN` for one boot to
force rotation, then unset it again.

## Redeploy

Build a fresh timestamped release locally, rsync it over (never a remote
`git pull`), flip the `current` symlink, then restart the app unit(s) —
Caddy is untouched by an app redeploy. Because the actor units share the
release tree, redeploying code that any of them execute means restarting
each affected unit, not just `instance`.

```sh
AP=/home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section/services/activitypub-services-section
REL="$(date -u +%Y%m%dT%H%M%SZ)"   # e.g. 20260820T055625Z -- do NOT prepend
                                    # another "20": %Y already yields the
                                    # 4-digit year (a prior version of this
                                    # snippet prepended "20" and produced
                                    # "2020260820T055543Z", caught and fixed
                                    # during the 2026-08-20 redeploy)

rsync -az --exclude '.git' --exclude 'test' \
  "$AP"/ \
  -e "ssh -i ~/.ssh/google_compute_engine" \
  "emsenn@34.61.173.187:/home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-engineering-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/data/runtime/share/561-group/releases/activitypub-services-section/$REL/"

ssh -i ~/.ssh/google_compute_engine emsenn@34.61.173.187 "
  ln -sfn /home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-engineering-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/data/runtime/share/561-group/releases/activitypub-services-section/$REL \
          /home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-engineering-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/data/runtime/share/561-group/releases/activitypub-services-section/current &&
  systemctl --user restart ap-561-group-activitypub.service ap-561-group-crucible.service ap-561-group-ruinfold.service
"
```

**Two copies of `poster.mjs` — keep them in sync.** The poster *timers*
(`ap-561-group-crucible-poster.service` etc.) run
`~/ops/palaverse-poster/poster.mjs` on the box directly, which is a separate
file from `$AP/lib/palaverse-poster/poster.mjs` inside the release tree the
rsync above lands (the timers' `WorkingDirectory` points at
`~/ops/palaverse-poster`, not the release tree). A code change to
`lib/palaverse-poster/poster.mjs` is **not** live until it is also copied to
the box's standalone copy:

```sh
rsync -az -e "ssh -i ~/.ssh/google_compute_engine" \
  "$AP/lib/palaverse-poster/poster.mjs" \
  "emsenn@34.61.173.187:/home/emsenn/ops/palaverse-poster/poster.mjs"
```

No restart needed for the poster copy — each timer firing runs it fresh as a
oneshot. Verify the two copies match with `sha256sum` on both sides after any
poster.mjs change (done as part of the 2026-08-20 redeploy: see the deploy
log).

**Verify actor identity survived the flip.** Compare each actor's
`publicKey.publicKeyPem` before and after (`GET /actors/{id}` over public
HTTPS) — it must be byte-identical, since the keys live outside the release
tree (`ACTIVITYPUB_KEYS_PATH`, untouched by rsync) and only the *code* that
serves them should change:

```sh
for a in instance crucible ruinfold; do
  curl -s "https://ap.561.group/actors/$a" -H 'Accept: application/activity+json' \
    | python3 -c "import json,sys;print(json.load(sys.stdin)['publicKey']['publicKeyPem'])" \
    | sha256sum
done
```

`node_modules` travels with the rsync (no network registry reachable from
the box for a plain `npm install`; the private Union registry needs
credentials this box doesn't have). State (keys, SQLite) lives outside the
release tree and survives every redeploy untouched.

## Teardown

Full teardown of everything this deploy added, in order (never touches the
VPS aliases, never touches anything pre-existing on the box):

```sh
B="ssh -i ~/.ssh/google_compute_engine emsenn@34.61.173.187"

# 1. Stop and disable the units
$B "systemctl --user disable --now ap-561-group-activitypub.service ap-561-group-caddy.service ap-561-group-crucible.service ap-561-group-ruinfold.service"

# 2. Remove unit files
$B "rm -f ~/.config/systemd/user/ap-561-group-*.service ~/.config/systemd/user/default.target.wants/ap-561-group-*.service && systemctl --user daemon-reload"

# 3. Remove Caddy + Caddyfile
$B "rm -f ~/.local/bin/caddy && rm -rf ~/.config/caddy"

# 4. Remove release tree
$B "rm -rf ~/.local/share/561-group/releases/activitypub-services-section"

# 5. Snapshot, THEN remove state (private keys + full inbox/custody — irreversible)
$B "tar czf ~/ap-561-group-state-backup-\$(date -u +%Y%m%dT%H%M%SZ).tar.gz -C ~/.local/share/emsenn activitypub"
$B "rm -rf ~/.local/share/emsenn/activitypub"

# 6. Cloudflare: delete the A record
set -a; . /home/emsenn/info/.env; set +a
curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/179300009777a1a35c04494c503b7ebd/dns_records/5d299528dc1e296f005fb21a36d70f6a" \
  -H "Authorization: Bearer $API_KEY_CLOUDFLARE_DNS_EDIT"

# 7. GCP: firewall rule + tag (leave union-alpha-chain untouched)
gcloud compute firewall-rules delete ap-561-group-web --project=five-six-one-group-dev
gcloud compute instances remove-tags bare-cedar-fog-cloud-mirror --zone=us-central1-a \
  --project=five-six-one-group-dev --tags=ap-561-group

# 8. GCP: release the static IP only if decommissioning the box entirely
gcloud compute addresses delete ap-561-group-static --project=five-six-one-group-dev --region=us-central1

# nvm/Node (v24.16.0) is left in place as harmless base tooling; remove with
# `rm -rf ~/.nvm` and the lines it appended to ~/.bashrc for a full wipe.
```

History of the deploy (federation proofs, the Follow/Accept fix, the
Paliaverse actor rollout) is in `logs/2026-08-19-ap-561-group-deploy-log.md`.
