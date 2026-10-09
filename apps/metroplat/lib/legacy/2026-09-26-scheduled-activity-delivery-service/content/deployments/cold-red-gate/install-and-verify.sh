#!/bin/sh
# Install only.  This script never starts or enables the timer.
set -eu

service_root=${SCHEDULED_ACTIVITY_DELIVERY_SERVICE_ROOT:-"$HOME/services/scheduled-activity-delivery-service"}
environment_file=${SCHEDULED_ACTIVITY_DELIVERY_ENVIRONMENT_FILE:-"$HOME/.config/emsenn/scheduled-activity-delivery.env"}
unit_directory=${XDG_CONFIG_HOME:-"$HOME/.config"}/systemd/user
deployment="$service_root/content/deployments/cold-red-gate"
timer=scheduled-activity-delivery-run-due.timer
node=/gnu/store/kba00zrnc1d1cg9bkx0krpvc2sp7wzrh-node-24.18.0/bin/node

case ${1:-} in
  "") preflight_mode=normal ;;
  --staged) preflight_mode=structural-only ;;
  *) echo "usage: $0 [--staged]" >&2; exit 2 ;;
esac

if systemctl --user is-enabled --quiet "$timer"; then
  echo "refusing to replace an enabled $timer; disable it and inspect its current state first" >&2
  exit 2
fi
if systemctl --user is-active --quiet "$timer"; then
  echo "refusing to replace an active $timer; stop it and inspect its current state first" >&2
  exit 2
fi
if [ ! -x "$node" ]; then
  echo "pinned Cold Red Gate Guix Node is absent or not executable: $node" >&2
  exit 2
fi
if [ "$preflight_mode" = structural-only ]; then
  "$node" "$service_root/scripts/cold-red-gate-preflight.mjs" --service-root "$service_root" --structural-only
else
  "$node" "$service_root/scripts/cold-red-gate-preflight.mjs" --service-root "$service_root" --environment-file "$environment_file"
fi
systemd-analyze verify "$deployment/scheduled-activity-delivery-run-due.service" "$deployment/$timer"
install -d -m 0755 "$unit_directory"
install -m 0644 "$deployment/scheduled-activity-delivery-run-due.service" "$unit_directory/scheduled-activity-delivery-run-due.service"
install -m 0644 "$deployment/$timer" "$unit_directory/$timer"
systemctl --user daemon-reload
if systemctl --user is-enabled --quiet "$timer"; then
  echo "refusing unsafe result: $timer became enabled during installation" >&2
  exit 2
fi
if systemctl --user is-active --quiet "$timer"; then
  echo "refusing unsafe result: $timer became active during installation" >&2
  exit 2
fi
systemctl --user status "$timer" --no-pager || true
echo "installed and verified disabled: $timer"
