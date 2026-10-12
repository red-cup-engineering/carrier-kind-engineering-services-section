#!/usr/bin/env bash
# Check the current consolidated MASH workspace layout.
#
# The old prefix taxonomy was removed during the crate consolidation.
# Until a new split-crate layout is deliberately reintroduced, the
# workspace has exactly two crates:
#
#   - mash-engine
#   - mash-library
#
# Exit non-zero on any unexpected crate or package-name mismatch. Run
# from the workspace root.

set -e
cd "$(dirname "$0")/.."

VIOLATIONS=0
report() { echo "VIOLATION: $*" >&2; VIOLATIONS=$((VIOLATIONS + 1)); }

allowed_crate() {
  case "$1" in
    mash-engine|mash-library) return 0 ;;
    *) return 1 ;;
  esac
}

for crate_dir in crates/*/; do
  crate_name=$(basename "$crate_dir")
  cargo_toml="$crate_dir/Cargo.toml"
  [ -f "$cargo_toml" ] || continue

  allowed_crate "$crate_name" || report "$crate_name: unexpected crate in consolidated workspace"

  package_name=$(awk -F '"' '/^name[[:space:]]*=/{ print $2; exit }' "$cargo_toml")
  [ "$package_name" = "$crate_name" ] || report "$crate_name: Cargo package name is '$package_name'"
done

for required in mash-engine mash-library; do
  [ -f "crates/$required/Cargo.toml" ] || report "$required: missing required crate"
done

if [ -f mash.toml ]; then
  report "mash.toml exists, but the manifest-driven 'mash up' path is not implemented"
fi

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "OK: consolidated MASH workspace layout is current."
  exit 0
else
  echo "FAILED: $VIOLATIONS violation(s) found." >&2
  exit 1
fi
