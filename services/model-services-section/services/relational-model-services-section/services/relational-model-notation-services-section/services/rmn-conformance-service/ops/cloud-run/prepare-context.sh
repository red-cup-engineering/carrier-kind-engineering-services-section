#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$script_dir
# Anchor on .git rather than the lib/emsenn/... path shape: a stray partial
# copy under obsmetrological-services-section/services/lib/emsenn/... exists
# elsewhere in this tree and would false-positive-match the shape check.
while [[ ! -d "$repo_root/.git" ]]; do
  parent=$(dirname -- "$repo_root")
  if [[ "$parent" == "$repo_root" ]]; then
    echo "could not locate the colony root above $script_dir" >&2
    exit 66
  fi
  repo_root=$parent
done
context_dir=${1:-}

if [[ -z "$context_dir" || "$context_dir" != /tmp/* ]]; then
  echo "usage: $0 /tmp/exact-build-context" >&2
  exit 64
fi

mkdir -p "$context_dir"

copy_path() {
  local relative=$1
  local source="$repo_root/$relative"
  local target="$context_dir/$relative"
  if [[ ! -e "$source" ]]; then
    echo "missing build input: $source" >&2
    exit 66
  fi
  if [[ -d "$source" ]]; then
    mkdir -p "$target"
    tar --exclude='./node_modules' --exclude='./data' --exclude='./.git' -C "$source" -cf - . \
      | tar -C "$target" -xf -
  else
    mkdir -p "$(dirname -- "$target")"
    cp "$source" "$target"
  fi
}

base=lib/emsenn/services/561-group/services
rmn=$base/lenticule-science/services/obsmetrological-services-section/services/rmn-semantic-conformance
copy_path "$rmn/package.json"
copy_path "$rmn/package-lock.json"
copy_path "$rmn/src"
copy_path "$rmn/bin"
copy_path "$rmn/types"
copy_path "$rmn/content/agent-cards/rmn-semantic-conformance.json"
copy_path "$rmn/content/agent-card-signing/jwks.json"

a2a=$base/red-cup-engineering/services/web-services-section/services/a2a-services-section/services
copy_path "$a2a/a2a-agent-card-discovery-service/package.json"
copy_path "$a2a/a2a-agent-card-discovery-service/src"
copy_path "$a2a/a2a-agent-card-key-service/package.json"
copy_path "$a2a/a2a-agent-card-key-service/src"
copy_path "$a2a/a2a-contracted-agent-service/package.json"
copy_path "$a2a/a2a-contracted-agent-service/src"
copy_path "$a2a/a2a-rmn-part-service/package.json"
copy_path "$a2a/a2a-rmn-part-service/src"
copy_path "$a2a/a2a-rmn-task-client-service/package.json"
copy_path "$a2a/a2a-rmn-task-client-service/src"

cp "$script_dir/Dockerfile" "$context_dir/Dockerfile"
cp "$script_dir/cloudbuild.yaml" "$context_dir/cloudbuild.yaml"
printf '%s\n' "$context_dir"
