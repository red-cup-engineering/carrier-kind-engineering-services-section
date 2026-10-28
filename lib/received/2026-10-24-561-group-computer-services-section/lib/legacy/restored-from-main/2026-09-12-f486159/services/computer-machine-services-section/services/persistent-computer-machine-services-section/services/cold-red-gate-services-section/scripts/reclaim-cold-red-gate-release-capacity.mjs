#!/usr/bin/env node
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { planReleaseRetention, RELEASE_DEPLOYMENT_HEADROOM_BYTES } from "../src/release-retention-plan.mjs";

const minimumRootAvailableBytes = 5 * 1024 * 1024 * 1024;
const args = process.argv.slice(2);
const host = args.includes("--host") ? args[args.indexOf("--host") + 1] : "red-cedar-gate";
const apply = args.includes("--apply");
if (!host || !/^[A-Za-z0-9._@:-]+$/u.test(host)) throw new TypeError("--host must be an SSH destination without shell syntax");

function run(command, arguments_) {
  const result = executeJavascriptNodeCommand({ type: "JavascriptNodeCommandExecutionRequest", version: 1, command, arguments: arguments_, directory: process.cwd(), environment: null, input: null }).result;
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout;
}

// No credential-bearing files are read. Missing protection evidence remains
// protected: pointers, running-process cwd, failed-unit cwd, and incomplete
// staging each prevent deletion.
const observe = String.raw`set -eu
base="$HOME/.local/share/561-group/releases"
printf 'root\t%s\n' "$(df -B1 --output=avail / | tail -1 | tr -d ' ')"
failed_wds="$(systemctl --user --failed --no-legend --plain 2>/dev/null | awk '{print $1}' | while read -r unit; do systemctl --user show "$unit" -p WorkingDirectory --value 2>/dev/null || true; done)"
for lane in "$base"/*; do [ -d "$lane" ] || continue; current="$(readlink -f "$lane/current" 2>/dev/null || true)"; previous="$(readlink -f "$lane/previous" 2>/dev/null || true)"; for generation in "$lane"/*; do
  [ -d "$generation" ] && [ ! -L "$generation" ] || continue; resolved="$(readlink -f "$generation")"
  current_flag=false; [ "$resolved" = "$current" ] && current_flag=true; previous_flag=false; [ "$resolved" = "$previous" ] && previous_flag=true; active_flag=false
  for proc in /proc/[0-9]*; do cwd="$(readlink -f "$proc/cwd" 2>/dev/null || true)"; case "$cwd" in "$resolved"|"$resolved"/*) active_flag=true; break;; esac; done
  interrupted_flag=false; case "$(basename "$generation")" in *.incomplete-*) interrupted_flag=true;; esac
  while IFS= read -r failed_wd; do failed_resolved="$(readlink -f "$failed_wd" 2>/dev/null || true)"; case "$failed_resolved" in "$resolved"|"$resolved"/*) interrupted_flag=true;; esac; done <<EOF
$failed_wds
EOF
  bytes="$(du -s -B1 "$generation" | awk '{print $1}')"; printf 'generation\t%s\t%s\t%s\t%s\t%s\t%s\n' "$generation" "$bytes" "$current_flag" "$previous_flag" "$active_flag" "$interrupted_flag"
done; done`;

const lines = run("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=8", host, observe]).trim().split("\n").filter(Boolean);
const [kind, available] = lines.shift()?.split("\t") ?? [];
if (kind !== "root" || !Number.isSafeInteger(Number(available))) throw new Error("Cold Red Gate capacity observation was malformed");
const generations = lines.map((line) => {
  const [entry, path, bytes, current, previous, active, interrupted] = line.split("\t");
  if (entry !== "generation" || !path || !Number.isSafeInteger(Number(bytes))) throw new Error(`generation observation malformed: ${line}`);
  return { path, bytes: Number(bytes), current: current === "true", previous: previous === "true", active: active === "true", interrupted: interrupted === "true" };
});
const plan = planReleaseRetention({ rootAvailableBytes: Number(available), minimumRootAvailableBytes, deploymentHeadroomBytes: RELEASE_DEPLOYMENT_HEADROOM_BYTES, generations });
const result = { ...plan, action: apply ? "delete" : "dry-run", deleted: [] };
if (apply && plan.admitted && plan.deficitBytes > 0) {
  let reclaimed = 0;
  for (const candidate of plan.candidates.filter(({ reclaimable }) => reclaimable)) {
    if (reclaimed >= plan.deficitBytes) break;
    if (!candidate.path.startsWith("/home/emsenn/.local/share/561-group/releases/")) throw new Error(`refusing path outside releases owner: ${candidate.path}`);
    const encodedPath = Buffer.from(candidate.path, "utf8").toString("base64");
    run("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=8", host, `path=$(printf %s ${encodedPath} | base64 -d); test -d \"$path\" && test ! -L \"$path\" && rm -rf -- \"$path\"`]);
    result.deleted.push(candidate);
    reclaimed += candidate.bytes;
  }
  result.rootAvailableBytesAfter = Number(run("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=8", host, "df -B1 --output=avail / | tail -1 | tr -d ' '"]).trim());
  result.bytesReclaimed = result.rootAvailableBytesAfter - plan.rootAvailableBytes;
}
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
