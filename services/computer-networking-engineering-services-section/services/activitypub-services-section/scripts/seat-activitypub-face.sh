#!/usr/bin/env bash
# Seat one ActivityPub face (/actors/<identifier>) on a network-custody host.
# Run from anywhere; every remote step goes over ssh to $SEAT_HOST, the host
# that serves $SEAT_ORIGIN. Idempotent: keys are generated only if absent,
# the unit is re-installed each run, the site route is added only if missing,
# and the site is restarted only when its routes changed.
#
# Every value a particular face needs is a parameter, supplied by the calling
# enterprise's own config; this script holds no identifier, port, host, or
# path of its own.
#
#   SEAT_HOST            ssh destination serving the origin (required)
#   SEAT_ORIGIN          https origin the face is served at (required)
#   FACE_IDENTIFIER      actor identifier, i.e. /actors/<this> (required)
#   FACE_PORT            loopback port the face's unit listens on (required)
#   FACE_UNIT            path to the face's systemd user unit file (required)
#   SITE_UNIT            the site's systemd user unit whose
#                        ACTIVITYPUB_PROVIDER_ROUTES gains <identifier>:<port> (required)
#   REMOTE_CONFIG_DIR    remote key/token directory (default:
#                        $HOME/.config/red-cup-engineering/<identifier> on the host)
#   LOCAL_CONFIG_DIR     local directory the inbox bearer token is synced back to
#                        (default: $HOME/.config/red-cup-engineering/<identifier>)
#   REMOTE_RELEASE_DIR   remote activitypub release the key generator runs from (required)
#   REMOTE_NODE          remote node binary (default: node on the host's PATH)
#   GUARD_ACTORS         comma-separated identifiers of already-seated faces this
#                        run must not disturb; each is re-checked at the end (optional)
set -euo pipefail

require() {
  local name="$1"
  [ -n "${!name:-}" ] || { echo "FAIL $name is required" >&2; exit 1; }
}
for name in SEAT_HOST SEAT_ORIGIN FACE_IDENTIFIER FACE_PORT FACE_UNIT SITE_UNIT REMOTE_RELEASE_DIR; do require "$name"; done

HOST="$SEAT_HOST"
ORIGIN="$SEAT_ORIGIN"
IDENTIFIER="$FACE_IDENTIFIER"
PORT="$FACE_PORT"
UNIT_SRC="$FACE_UNIT"
UNIT_NAME="$(basename "$UNIT_SRC")"
REMOTE_CONF="${REMOTE_CONFIG_DIR:-\$HOME/.config/red-cup-engineering/$IDENTIFIER}"
LOCAL_CONF="${LOCAL_CONFIG_DIR:-$HOME/.config/red-cup-engineering/$IDENTIFIER}"
NODE_BIN="${REMOTE_NODE:-node}"

[ -f "$UNIT_SRC" ] || { echo "FAIL unit source missing: $UNIT_SRC" >&2; exit 1; }

echo "== 1/5 identity: keys + inbox bearer token on $HOST =="
ssh -o BatchMode=yes "$HOST" bash -s <<REMOTE
set -euo pipefail
CONF="$REMOTE_CONF"
REL="$REMOTE_RELEASE_DIR"
NODE="$NODE_BIN"
mkdir -p "\$CONF" && chmod 700 "\$CONF"
if [ -f "\$CONF/activitypub-keys.json" ] && [ -f "\$CONF/inbox-bearer.token" ]; then
  echo "keys: already present"
else
  [ -f "\$CONF/activitypub-keys.json" ] || [ ! -f "\$CONF/inbox-bearer.token" ] || \\
    { echo "FAIL: bearer token exists without keys; resolve \$CONF by hand" >&2; exit 1; }
  (cd "\$REL" && "\$NODE" src/keys.mjs "\$CONF/activitypub-keys.json" --inbox-bearer-token-file "\$CONF/inbox-bearer.token")
  echo "keys: generated"
fi
REMOTE

echo "== 2/5 unit: install + start $UNIT_NAME =="
scp -q "$UNIT_SRC" "$HOST":".config/systemd/user/$UNIT_NAME"
ssh -o BatchMode=yes "$HOST" bash -s <<REMOTE
set -euo pipefail
systemctl --user daemon-reload
systemctl --user enable --now "$UNIT_NAME"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  state="\$(systemctl --user is-active "$UNIT_NAME" || true)"
  [ "\$state" = active ] && break
  sleep 1
done
[ "\$state" = active ] || { systemctl --user status --no-pager -n 20 "$UNIT_NAME" >&2; exit 1; }
echo "unit: active"
REMOTE

echo "== 3/5 route: $IDENTIFIER:$PORT in $SITE_UNIT's ACTIVITYPUB_PROVIDER_ROUTES =="
ssh -o BatchMode=yes "$HOST" bash -s <<REMOTE
set -euo pipefail
UNIT="\$HOME/.config/systemd/user/$SITE_UNIT"
if grep -q "$IDENTIFIER:$PORT" "\$UNIT"; then
  echo "route: already present"
else
  cp "\$UNIT" "\$UNIT.pre-$IDENTIFIER-route"
  sed -i "s/^Environment=ACTIVITYPUB_PROVIDER_ROUTES=.*/&,$IDENTIFIER:$PORT/" "\$UNIT"
  grep -q "$IDENTIFIER:$PORT" "\$UNIT" || { echo "FAIL: route edit did not land" >&2; exit 1; }
  systemctl --user daemon-reload
  systemctl --user restart "$SITE_UNIT"
  echo "route: added, site restarted (backup at \$UNIT.pre-$IDENTIFIER-route)"
fi
REMOTE

echo "== 4/5 credential sync: inbox bearer token back to this host =="
mkdir -p "$LOCAL_CONF" && chmod 700 "$LOCAL_CONF"
scp -q "$HOST":"$(printf '%s' "$REMOTE_CONF" | sed 's|^\\\$HOME/||')/inbox-bearer.token" "$LOCAL_CONF/inbox-bearer.token"
chmod 600 "$LOCAL_CONF/inbox-bearer.token"
echo "token: synced to $LOCAL_CONF/inbox-bearer.token"

echo "== 5/5 receipts: live network checks =="
fail=0
check() {
  local label="$1"; shift
  local expect="$1"; shift
  local code
  code="$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "$@")" || code=curl-error
  if [ "$code" = "$expect" ]; then echo "PASS $label ($code)"; else echo "FAIL $label (got $code, want $expect)"; fail=1; fi
}
check "actor $ORIGIN/actors/$IDENTIFIER" 200 -H "Accept: application/activity+json" "$ORIGIN/actors/$IDENTIFIER"
check "webfinger acct:$IDENTIFIER@${ORIGIN#https://}" 200 "$ORIGIN/.well-known/webfinger?resource=acct:$IDENTIFIER@${ORIGIN#https://}"
check "outbox" 200 -H "Accept: application/activity+json" "$ORIGIN/actors/$IDENTIFIER/outbox"
check "inbox (bearer)" 200 -H "Accept: application/activity+json" -H "Authorization: Bearer $(cat "$LOCAL_CONF/inbox-bearer.token")" "$ORIGIN/actors/$IDENTIFIER/inbox"
if [ -n "${GUARD_ACTORS:-}" ]; then
  IFS=, read -r -a guards <<<"$GUARD_ACTORS"
  for guard in "${guards[@]}"; do
    [ -n "$guard" ] || continue
    check "regression guard: /actors/$guard still serves" 200 -H "Accept: application/activity+json" "$ORIGIN/actors/$guard"
  done
fi
exit "$fail"
