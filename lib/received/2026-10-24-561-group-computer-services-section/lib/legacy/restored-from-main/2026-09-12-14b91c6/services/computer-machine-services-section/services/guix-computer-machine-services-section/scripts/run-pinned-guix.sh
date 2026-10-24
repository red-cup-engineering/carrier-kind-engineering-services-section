#!/bin/sh
# Enter the one machine-services-owned pinned Guix universe for an explicit
# Guix command. Fleet declarations and service package definitions consume
# this pin; this runner does not choose a host, realize a service, or apply a
# system configuration.
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
section_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)

exec guix time-machine -C "$section_dir/src/five-six-one/guix/channels.scm" -- "$@"
