#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repository_root=$(git -C "$script_dir" rev-parse --show-toplevel)
context_dir=${1:-}
[[ "$context_dir" == /tmp/* ]] || { echo "usage: $0 /tmp/exact-build-context" >&2; exit 64; }
mkdir -p "$context_dir/lib/emsenn/services/561-group/services/red-cup-engineering"

package_relative=${script_dir#"$repository_root/"}
package_relative=${package_relative%/ops/cloud-run}
mapfile -t admitted_paths < <(node --input-type=module - "$repository_root" "$package_relative" <<'NODE'
import { execFileSync } from "node:child_process";
import path from "node:path";
const [repositoryRoot, initial] = process.argv.slice(2), queue = [initial], seen = new Set();
while (queue.length) {
  const relative = path.posix.normalize(queue.shift());
  if (seen.has(relative)) continue;
  seen.add(relative);
  const source = execFileSync("git", ["-C", repositoryRoot, "show", `HEAD:${relative}/package.json`], { encoding: "utf8" });
  const manifest = JSON.parse(source);
  for (const value of Object.values({ ...manifest.dependencies, ...manifest.optionalDependencies })) {
    if (typeof value === "string" && value.startsWith("file:")) queue.push(path.posix.normalize(path.posix.join(relative, value.slice(5))));
  }
}
for (const relative of [...seen].sort()) process.stdout.write(`${relative}\n`);
NODE
)

git -C "$repository_root" archive HEAD -- "${admitted_paths[@]}" \
  | tar -C "$context_dir/lib/emsenn/services/561-group/services/red-cup-engineering" -xf -
git -C "$repository_root" show "HEAD:${package_relative}/ops/cloud-run/Dockerfile" > "$context_dir/Dockerfile"
git -C "$repository_root" show "HEAD:${package_relative}/ops/cloud-run/cloudbuild.yaml" > "$context_dir/cloudbuild.yaml"
