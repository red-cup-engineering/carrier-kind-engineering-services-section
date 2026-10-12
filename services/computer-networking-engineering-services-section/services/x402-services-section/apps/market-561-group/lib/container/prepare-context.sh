#!/usr/bin/env bash
# Prepare the exact deployment closure of market.561.group for a container build: the
# published package plus its registry-installed dependencies, never a link, never
# a host-built native module, never a registry credential in the image.
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
app_dir=$(CDPATH= cd -- "$script_dir/../.." && pwd)
context_dir=${1:-}
registry=${NPM_REGISTRY:-https://registry.561.group/}

if [[ -z "$context_dir" || "$context_dir" != /tmp/* ]]; then
  echo "usage: $0 /tmp/exact-build-context" >&2
  exit 64
fi
if [[ ! -f "$app_dir/package-lock.json" ]]; then
  echo "market package-lock.json is required; it is written only by the npm publication operator" >&2
  exit 66
fi
if [[ -e "$context_dir" ]] && [[ -n "$(find "$context_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "build context must be empty: $context_dir" >&2
  exit 73
fi

mkdir -p "$context_dir/app"
cp "$app_dir/package.json" "$app_dir/package-lock.json" "$context_dir/app/"
cp -R "$app_dir/src" "$context_dir/app/src"
cp -R "$app_dir/scripts" "$context_dir/app/scripts"
mkdir -p "$context_dir/app/data/records"
cp "$app_dir/data/records/catalog.json" "$context_dir/app/data/records/catalog.json"

npm ci --prefix "$context_dir/app" --omit=dev --ignore-scripts --registry "$registry"
npm ls --prefix "$context_dir/app" --omit=dev --all >/dev/null

if find "$context_dir/app/node_modules" -type l ! -path '*/node_modules/.bin/*' -print -quit | grep -q .; then
  echo "refusing linked dependency in deployment closure" >&2
  exit 65
fi
if find "$context_dir/app/node_modules" -type f -name '*.node' -print -quit | grep -q .; then
  echo "refusing host-built native module in prepared deployment closure" >&2
  exit 65
fi

cp "$script_dir/Dockerfile" "$context_dir/Dockerfile"
printf '%s\n' "$context_dir"
