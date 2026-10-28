#!/bin/sh
# Evaluate the Guix machine/service/app closure model through the repository's
# one pinned channel.  This does not build or deploy a closure.
set -eu

script_directory=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
section_directory=$(CDPATH='' cd -- "$script_directory/.." && pwd)
repository_root=$(cd -- "$script_directory" && git rev-parse --show-toplevel)
machine_section_directory=$(CDPATH='' cd -- "$section_directory/.." && pwd)
guix_runner="$machine_section_directory/guix-computer-machine-services-section/scripts/run-pinned-guix.sh"

exec "$guix_runner" repl \
  -L "$repository_root" \
  -L "$repository_root/src" \
  -L "$section_directory/src" \
  "$section_directory/test/guix-fleet.scm"
