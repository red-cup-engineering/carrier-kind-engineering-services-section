#!/usr/bin/env node
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { projectFilepathDirectory } from "@red-cup-engineering/project-filepath-directory-service";
import { resolveFilepath } from "@red-cup-engineering/resolve-filepath-service";
import { projectFileUrlFilepath } from "@red-cup-engineering/project-file-url-filepath-service";
import { argument as option } from "@red-cup-engineering/javascript-node-services-section/argv";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { decideReleaseAdmission } from "../../../src/release-admission.mjs";

/** This section's own root -- the default semantic-record-journal custody root. */
export const NODE_ROOT = resolveFilepath([projectFilepathDirectory(projectFileUrlFilepath(import.meta.url)), ".."]);

/** Cold Red Gate's stop-the-wave memory floor, in megabytes (see the org's release receipts, 2026-09-03/04). */
export const MEMORY_FLOOR_MB = 250;

/**
 * Cold Red Gate's minimum root-filesystem headroom before staging a release.
 * A release keeps its current and previous trees while it receives a fresh
 * staging tree, so this is a reserve rather than an estimate of one package's
 * final bytes.  It is deliberately a stop-the-wave gate: release retention
 * needs independent evidence that an old tree is neither current, previous,
 * active, nor an interrupted staging tree.
 */
export const RELEASE_DISK_FLOOR_BYTES = 5 * 1024 * 1024 * 1024;

/**
 * Default `--probe` polling attempts, and the gap between them in seconds.
 * Widened 2026-09-04 after two real metroplat.service releases refused on a
 * too-short window: the service takes 15-20s from restart to answering, but
 * the prior 10x2s=20s budget was spent entirely before the listener bound.
 */
export const PROBE_MAX_ATTEMPTS = 30;
export const PROBE_INTERVAL_SECONDS = 3;

export const RECEIPT_OBJECT_KIND = "cold-red-gate.mape-k-analyze-stage-deployment";
export const RECEIPT_CATEGORY = "deployment";

function defaultRun(command, args) {
  const receipt = executeJavascriptNodeCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command,
    arguments: args,
    directory: process.cwd(),
    environment: null,
    input: null,
  });
  const { result } = receipt;
  if (result.status !== 0) {
    const error = new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stderr}`);
    error.status = result.status;
    error.stdout = result.stdout;
    error.stderr = result.stderr;
    throw error;
  }
  return result.stdout;
}

// The one seam every host effect routes through; tests inject a fake `run`.
function runHost(host, script, run) {
  return run("ssh", ["-o", "BatchMode=yes", host, script]);
}

function shortPackageName(packageName) {
  return packageName.split("/").pop();
}

function releasesRoot(shortName) {
  return `~/.local/share/561-group/releases/${shortName}`;
}

/**
 * @param {string} releaseDirectory - Target release directory, with optional leading tilde.
 * @param {string} currentLink - Current release symlink.
 * @returns {string} Remote Node invocation preserving incomplete staging before a fresh install.
 */
export function buildFreshReleaseDirectoryScript(releaseDirectory, currentLink) {
  const program = `
    const fs = require('node:fs');
    const path = require('node:path');
    const expand = value => path.resolve(value === '~' ? require('node:os').homedir() : value.startsWith('~/') ? path.join(require('node:os').homedir(), value.slice(2)) : value);
    const target = expand(${JSON.stringify(releaseDirectory)});
    const current = expand(${JSON.stringify(currentLink)});
    const real = value => { try { return fs.realpathSync(value); } catch (error) { if (error.code === 'ENOENT' || error.code === 'EACCES') return null; throw error; } };
    let archived = null;
    if (fs.existsSync(target)) {
      if (fs.lstatSync(target).isSymbolicLink()) throw new Error('release staging target must not be a symlink');
      const canonical = real(target);
      if (real(current) === canonical) throw new Error('refusing to relocate current release');
      for (const pid of fs.readdirSync('/proc').filter(value => /^\\d+$/.test(value))) {
        const cwd = real('/proc/' + pid + '/cwd');
        if (cwd && (cwd === canonical || cwd.startsWith(canonical + '/'))) throw new Error('refusing to relocate active release');
      }
      archived = target + '.incomplete-' + require('node:crypto').randomUUID();
      fs.renameSync(target, archived);
    }
    fs.mkdirSync(target, { recursive: true });
    console.log(JSON.stringify({ target, archived }));
  `;
  return `node -e "Function(Buffer.from('${Buffer.from(program).toString('base64')}','base64').toString('utf8'))()"`;
}

function unitFilePath(unit) {
  return `~/.config/systemd/user/${unit}`;
}

/** A remote systemd EnvironmentFile KEY, per the shell/systemd assignment grammar. */
export const ENV_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/u;

/** A `--release-name`: the releases-root and release-directory-prefix name (lower-kebab). */
export const RELEASE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

// Validates --release-name (explicit or defaulted from the package basename); returns a refusal datum, or null.
function validateReleaseName(releaseName) {
  if (!RELEASE_NAME_PATTERN.test(releaseName)) {
    return refusal("release-name-invalid", `--release-name "${releaseName}" must match ${RELEASE_NAME_PATTERN}`, releaseName);
  }
  return null;
}

// Collects every value following one repeated flag in an argument vector (e.g. multiple --env-set).
function collectRepeated(name, argumentVector = process.argv) {
  const values = [];
  for (let index = 0; index < argumentVector.length; index += 1) {
    if (argumentVector[index] === name && index + 1 < argumentVector.length) values.push(argumentVector[index + 1]);
  }
  return values;
}

// Validates --environment-file/--env-set/--env-unset/--wire-environment-file-directive together;
// returns a refusal datum, or null when valid.
// Never inspects or echoes a VALUE half of an --env-set pair -- only the KEY half is fit for evidence.
function validateEnvEdit(envFile, envSetRaw, envUnsetRaw, wireEnvironmentFileDirective) {
  if ((envSetRaw.length > 0 || envUnsetRaw.length > 0) && !envFile) {
    return refusal("env-edit-invalid", "--env-set/--env-unset require --environment-file", { envSetCount: envSetRaw.length, envUnsetCount: envUnsetRaw.length });
  }
  if (wireEnvironmentFileDirective && !envFile) {
    return refusal("env-edit-invalid", "--wire-environment-file-directive requires --environment-file", null);
  }
  if (envFile && !envFile.startsWith("/")) {
    return refusal("env-edit-invalid", `--environment-file "${envFile}" must be an absolute path -- a leading ~ is not expanded on the remote host`, envFile);
  }
  for (const raw of envSetRaw) {
    const eq = raw.indexOf("=");
    const key = eq === -1 ? raw : raw.slice(0, eq);
    if (eq === -1 || !ENV_KEY_PATTERN.test(key)) {
      return refusal("env-edit-invalid", `--env-set key "${key}" must match ${ENV_KEY_PATTERN} and be given as KEY=VALUE`, key);
    }
  }
  for (const key of envUnsetRaw) {
    if (!ENV_KEY_PATTERN.test(key)) {
      return refusal("env-edit-invalid", `--env-unset key "${key}" must match ${ENV_KEY_PATTERN}`, key);
    }
  }
  return null;
}

/**
 * Builds one remote `node -e` invocation that rewrites a systemd
 * EnvironmentFile in place: every existing `KEY=` line for a key in
 * `setPairs` is replaced, absent keys are appended, `unsetKeys` lines are
 * removed, and every other line is preserved byte-for-byte. Each KEY
 * appears exactly once afterward: when a KEY already occurred more than
 * once (a pre-existing malformed duplicate), only its first matching line
 * is replaced -- every later duplicate of that same KEY is dropped, never
 * left standing alongside the new value. The whole program (file path and
 * KEY/VALUE pairs included) travels as one base64-encoded blob so no
 * quoting of VALUE against the remote shell is ever needed.
 */
export function buildEnvEditScript(envFile, setPairs, unsetKeys) {
  const program = [
    "const fs=require('fs');",
    `const file=${JSON.stringify(envFile)};`,
    `const setMap=new Map(${JSON.stringify(setPairs)});`,
    `const unsetSet=new Set(${JSON.stringify(unsetKeys)});`,
    "const lines=fs.readFileSync(file,'utf8').split('\\n');",
    "const seen=new Set();",
    "const kept=[];",
    "for(const line of lines){",
    "const m=/^([A-Z][A-Z0-9_]*)=/.exec(line);",
    "if(m && unsetSet.has(m[1])) continue;",
    "if(m && setMap.has(m[1])){ if(seen.has(m[1])) continue; kept.push(m[1]+'='+setMap.get(m[1])); seen.add(m[1]); continue; }",
    "kept.push(line);",
    "}",
    "for(const [k,v] of setMap){ if(!seen.has(k)) kept.push(k+'='+v); }",
    "fs.writeFileSync(file, kept.join('\\n'));",
  ].join("\n");
  const encoded = Buffer.from(program, "utf8").toString("base64");
  return `node -e "Function(Buffer.from('${encoded}','base64').toString('utf8'))()"`;
}

/**
 * Builds one remote `sed -i` invocation rewriting a systemd unit file's
 * `WorkingDirectory=` line in place (every other line untouched). Used to
 * onboard a unit whose `ExecStart` still names a plain, non-release file
 * tree onto the release-directory-plus-`current`-symlink convention: the
 * value carries no secret (a release path this script itself computed),
 * so it needs neither the `--env-set` KEY/VALUE grammar nor the base64
 * seam `buildEnvEditScript` uses to keep a VALUE out of shell quoting.
 * `workingDirectory` is expanded through `eval echo` on the remote shell
 * before it lands in the file -- systemd itself never tilde-expands a
 * unit-file path (a literal leading `~` is refused at load as "not
 * absolute"), even though the same `~`-relative form is exactly what
 * `releasesRoot()` uses everywhere else in this script for plain shell
 * commands (cp/ln/mkdir), which do expand it.
 */
export function buildWorkingDirectoryEditScript(unitFile, workingDirectory) {
  return `sed -i "s|^WorkingDirectory=.*$|WorkingDirectory=$(eval echo ${workingDirectory})|" ${unitFile}`;
}

/**
 * Builds one remote shell invocation that ensures a systemd unit file's
 * `[Service]` section carries `EnvironmentFile=<environmentFile>`, inserted
 * immediately after the `[Service]` header line -- idempotent: a `grep -qxF`
 * exact-line check skips the insert when that exact line already exists, so
 * repeating this (a second unit onboarded onto the same shared environment
 * file) is harmless. Neither `unitFile` nor `environmentFile` carries a
 * secret (both are paths this script itself computed or was given), so this
 * needs no base64 seam.
 */
export function buildEnvironmentFileDirectiveEditScript(unitFile, environmentFile) {
  return `grep -qxF "EnvironmentFile=${environmentFile}" ${unitFile} || sed -i "/^\\[Service\\]/a EnvironmentFile=${environmentFile}" ${unitFile}`;
}

/**
 * Builds one remote shell invocation that writes `content` to `path`
 * verbatim, expanding a leading `~` first (systemd's own unit/timer
 * directories are addressed as `~/.config/systemd/user/...` everywhere else
 * in this script, but `fs.writeFileSync` never expands `~` itself). The
 * whole file content travels as one base64-encoded blob, the same seam
 * `buildEnvEditScript` uses, so a unit's `ExecStart=`/`Description=` text
 * never needs quoting against the remote shell.
 */
export function buildWriteRemoteFileScript(path, content) {
  const encoded = Buffer.from(content, "utf8").toString("base64");
  const temporarySuffix = `${randomUUID()}.next`;
  return `node -e "const fs=require('fs');const p=process.argv[1];const t=p+'.'+process.argv[2];let m;try{m=fs.statSync(p).mode&511}catch{};fs.writeFileSync(t,Buffer.from(process.argv[3],'base64'),m===undefined?undefined:{mode:m});if(m!==undefined)fs.chmodSync(t,m);fs.renameSync(t,p)" "$(eval echo ${path})" '${temporarySuffix}' '${encoded}'`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function admitUnitFile(unitFile, expectedCurrentDigest) {
  if (unitFile === undefined) return null;
  if (typeof unitFile !== "string" || !isAbsolute(unitFile)) {
    return { refusal: refusal("unit-file-invalid", "--unit-file must be an absolute local file", unitFile ?? null) };
  }
  if (!RUNTIME_DIGEST_PATTERN.test(expectedCurrentDigest ?? "")) {
    return { refusal: refusal("unit-file-current-digest", "--unit-file requires a 64-character SHA-256 --unit-file-current-digest", expectedCurrentDigest ?? null) };
  }
  try {
    if (!statSync(unitFile).isFile()) return { refusal: refusal("unit-file-invalid", "--unit-file must name a regular local file", unitFile) };
    const content = readFileSync(unitFile, "utf8");
    if (content.length === 0) return { refusal: refusal("unit-file-invalid", "--unit-file must not be empty", unitFile) };
    return { path: unitFile, content, digest: sha256(content), expectedCurrentDigest };
  } catch (error) {
    return { refusal: refusal("unit-file-invalid", "could not read --unit-file", error.message) };
  }
}

function buildRemoteFileDigestScript(path) {
  return `node -e "const fs=require('fs'),c=require('crypto');process.stdout.write(c.createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex'))" "$(eval echo ${path})"`;
}

/**
 * Renders a brand-new systemd --user `.service` unit's file text for a unit
 * this script itself authors (no prior unit file existed to edit), matching
 * the release-directory-plus-`current`-symlink convention every house lane
 * already uses. Carries no `[Install]` section -- a release-managed oneshot
 * this shape is meant for is triggered by its paired `.timer`
 * (`renderReleaseUnitTimerText`), never by `default.target`, matching the
 * house's existing timer-triggered-oneshot convention
 * (`rotate-substrate-logs.service`).
 * @param {{description: string, workingDirectory: string, execStart: string, unitType?: string}} options
 * @returns {string}
 */
export function renderReleaseUnitServiceText({ description, workingDirectory, execStart, unitType = "oneshot" }) {
  return [
    "[Unit]",
    `Description=${description}`,
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    `Type=${unitType}`,
    `WorkingDirectory=${workingDirectory}`,
    `ExecStart=${execStart}`,
    "StandardOutput=journal",
    "StandardError=journal",
    "",
  ].join("\n");
}

/**
 * Renders a brand-new systemd --user `.timer` unit's file text, pairing with
 * an authored `.service` of the given `unit` name. `Persistent=true` so a
 * missed `OnCalendar` instant (host asleep or rebooted through it) still
 * fires on next boot, matching every existing house timer.
 * @param {{description: string, onCalendar: string, unit: string}} options
 * @returns {string}
 */
export function renderReleaseUnitTimerText({ description, onCalendar, unit }) {
  return [
    "[Unit]",
    `Description=${description}`,
    "",
    "[Timer]",
    `OnCalendar=${onCalendar}`,
    "Persistent=true",
    `Unit=${unit}`,
    "",
    "[Install]",
    "WantedBy=timers.target",
    "",
  ].join("\n");
}

// Validates --author-unit/--unit-exec/--unit-type/--timer-on-calendar together; returns a refusal datum, or null.
function validateAuthorUnit(authorUnit, unitExecStart, timer, timerOnCalendar) {
  if (!authorUnit) {
    if (unitExecStart || timerOnCalendar) {
      return refusal("author-unit-invalid", "--unit-exec/--timer-on-calendar require --author-unit", { unitExecStart: Boolean(unitExecStart), timerOnCalendar: Boolean(timerOnCalendar) });
    }
    return null;
  }
  if (!unitExecStart) {
    return refusal("author-unit-invalid", "--author-unit requires --unit-exec", null);
  }
  if (timerOnCalendar && !timer) {
    return refusal("author-unit-invalid", "--timer-on-calendar requires --timer naming the companion timer unit", null);
  }
  if (timer && !timerOnCalendar) {
    return refusal("author-unit-invalid", "--author-unit with --timer requires --timer-on-calendar", null);
  }
  return null;
}

// Parses a `systemctl --user show -p LoadState <unit>` reply into its LoadState value ("not-found" when the unit does not exist, or the reply is empty).
function parseLoadState(text) {
  const parsed = parseKeyValueLines(text);
  return parsed.LoadState ?? "not-found";
}

// Parses `free -m` stdout into { available, raw }; throws when no Mem: line is found.
function parseFreeAvailableMb(text) {
  const lines = text.trim().split("\n");
  const header = lines[0]?.trim().split(/\s+/u) ?? [];
  const memLine = lines.find((line) => line.startsWith("Mem:"));
  if (!memLine) throw new Error("free -m output has no Mem: line");
  const values = memLine.trim().split(/\s+/u).slice(1);
  const index = header.indexOf("available");
  const available = Number(index === -1 ? values.at(-1) : values[index]);
  if (!Number.isFinite(available)) throw new Error("free -m output's available column is not numeric");
  return { available, raw: memLine.trim() };
}

// Parses `df -B1 --output=avail /` stdout into available root-filesystem bytes.
// `df` reports an integer allocation boundary; no decimal/unit conversion is
// allowed at this effect boundary.
function parseRootAvailableBytes(text) {
  const values = text.trim().split(/\s+/u).filter((value) => /^\d+$/u.test(value));
  const available = Number(values.at(-1));
  if (!Number.isSafeInteger(available) || available < 0) throw new Error("df root available-byte output is not a non-negative safe integer");
  return { available, raw: String(available) };
}

// Parses `systemctl --user show -p ...` output (one Key=Value per line).
function parseKeyValueLines(text) {
  const result = {};
  for (const line of text.trim().split("\n")) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    result[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return result;
}

// Extracts a unit's own balanced top-level JSON readout from journalctl text, or null.
function extractJsonReadout(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseVerifyOutput(text) {
  const lockfileMatch = /LOCKFILE (\d+) (\d+)/u.exec(text);
  const entryMatch = /ENTRY (ok|fail)(.*)/u.exec(text);
  return {
    atRegistry: lockfileMatch ? Number(lockfileMatch[1]) : 0,
    total: lockfileMatch ? Number(lockfileMatch[2]) : 0,
    entryOk: Boolean(entryMatch && entryMatch[1] === "ok"),
    entryDetail: entryMatch ? entryMatch[2].trim() : "no ENTRY line in verify output",
  };
}

const SYSTEMD_LIFECYCLE_PROPERTIES = ["ExecCondition", "ExecStartPre", "ExecStart", "ExecStartPost", "ExecReload", "ExecStop", "ExecStopPost"];

function isRelativeNodeEntry(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:[cm]?js)$/u.test(value)
    && !value.split("/").includes("..");
}

function parseSystemdLifecycleNodeEntrypoints(text) {
  const observation = JSON.parse(text);
  if (observation?.type !== "SystemdLifecycleNodeEntrypoints" || observation.version !== 1
    || !Array.isArray(observation.entries) || observation.entries.some((entry) => !isRelativeNodeEntry(entry))) {
    throw new TypeError("systemd lifecycle observation is malformed");
  }
  return [...new Set(observation.entries)].sort();
}

/**
 * Reads the typed D-Bus Exec* command tuples and emits only relative Node
 * entry paths. Unsupported Node command shapes refuse remotely rather than
 * being mistaken for a covered runtime entry.
 */
export function buildSystemdLifecycleNodeEntrypointsScript(unit) {
  const program = `
    const { execFileSync } = require('node:child_process');
    const read = arguments => JSON.parse(execFileSync('busctl', ['--user', '--json=short', ...arguments], { encoding: 'utf8' }));
    const fail = () => { throw new Error('systemd lifecycle command observation is unsupported'); };
    const unit = ${JSON.stringify(unit)};
    const object = read(['call', 'org.freedesktop.systemd1', '/org/freedesktop/systemd1', 'org.freedesktop.systemd1.Manager', 'GetUnit', 's', unit]);
    if (object?.type !== 'o' || !Array.isArray(object.data) || typeof object.data[0] !== 'string') fail();
    const properties = ${JSON.stringify(SYSTEMD_LIFECYCLE_PROPERTIES)};
    const lines = execFileSync('busctl', ['--user', '--json=short', 'get-property', 'org.freedesktop.systemd1', object.data[0], 'org.freedesktop.systemd1.Service', ...properties], { encoding: 'utf8' }).trim().split('\\n').filter(Boolean);
    if (lines.length !== properties.length) fail();
    const nodeEntries = [];
    for (const line of lines) {
      const result = JSON.parse(line);
      if (result?.type !== 'a(sasbttttuii)' || !Array.isArray(result.data)) fail();
      for (const command of result.data) {
        if (!Array.isArray(command) || typeof command[0] !== 'string' || !Array.isArray(command[1]) || command[1].some(value => typeof value !== 'string')) fail();
        const [path, argv] = command;
        const basename = path.split('/').pop();
        let nodeIndex = null;
        if (basename === 'node') nodeIndex = 0;
        else if (basename === 'env') {
          const found = argv.slice(1).findIndex(value => value === 'node' || value.endsWith('/node'));
          if (found !== -1) {
            if (found !== 0) fail();
            nodeIndex = 1;
          }
        }
        if (nodeIndex === null) continue;
        if (argv.length < nodeIndex + 2 || argv[nodeIndex] !== 'node' && !argv[nodeIndex].endsWith('/node')) fail();
        const entry = argv[nodeIndex + 1];
        if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\\.(?:[cm]?js)$/.test(entry) || entry.split('/').includes('..')) fail();
        nodeEntries.push(entry);
      }
    }
    process.stdout.write(JSON.stringify({ type: 'SystemdLifecycleNodeEntrypoints', version: 1, entries: [...new Set(nodeEntries)].sort() }) + '\\n');
  `;
  return `node -e "Function(Buffer.from('${Buffer.from(program).toString("base64")}','base64').toString('utf8'))()" # systemd-lifecycle-node-entrypoints`;
}

function refusal(step, reason, evidence) {
  return { step, reason, evidence };
}

const RUNTIME_DIGEST_PATTERN = /^[a-f0-9]{64}$/u;

function verifierCliPath() {
  return resolveFilepath([NODE_ROOT, "node_modules", "@red-cup-engineering", "node-runtime-release-materialization-service", "scripts", "verify-node-runtime-release.mjs"]);
}

/**
 * Admits one local portable release through the materializer's public CLI.
 * The deployer deliberately does not implement the artifact digest itself.
 */
function admitPrebuiltRuntime({ directory, packageName, version, entryPath, run }) {
  if (typeof directory !== "string" || !isAbsolute(directory)) throw new TypeError("prebuiltRuntimeDirectory must be an absolute local directory");
  let observation;
  let entrypoints;
  let runtimeRoot;
  try {
    observation = JSON.parse(run(process.execPath, [verifierCliPath(), directory]));
  } catch (error) {
    return { refusal: refusal("prebuilt-runtime-verify", "the local portable runtime did not pass verify-node-runtime-release", error.message) };
  }
  if (observation?.ok !== true || !RUNTIME_DIGEST_PATTERN.test(observation.observedDigest ?? "") || observation.expectedDigest !== observation.observedDigest) {
    return { refusal: refusal("prebuilt-runtime-verify", "the local portable runtime has no verified artifact digest", observation) };
  }
  try {
    const receipt = JSON.parse(readFileSync(join(directory, "release-receipt.json"), "utf8"));
    const traced = receipt.type === "TracedNodeRuntimeMaterialization";
    const materialized = receipt.type === "NodeRuntimeReleaseMaterializationReceipt" && receipt.version === 1;
    if (!traced && !materialized) throw new TypeError("the verified release has no supported runtime receipt");
    runtimeRoot = materialized ? "app" : "";
    const manifest = JSON.parse(readFileSync(join(directory, runtimeRoot, "package.json"), "utf8"));
    if (manifest.name !== packageName || manifest.version !== version) {
      return { refusal: refusal("prebuilt-runtime-package", "the portable runtime package identity does not match this release", { expected: { name: packageName, version }, observed: { name: manifest.name, version: manifest.version } }) };
    }
    entrypoints = traced ? receipt.entrypoints : receipt.runtimeEntrypoints;
    if (!Array.isArray(entrypoints) || entrypoints.some((entry) => !isRelativeNodeEntry(entry)) || !entrypoints.includes(entryPath) || !statSync(join(directory, runtimeRoot, entryPath)).isFile()) {
      return { refusal: refusal("prebuilt-runtime-entry", "the portable runtime does not admit this release entry", { entry: entryPath }) };
    }
    run(process.execPath, ["--check", join(directory, runtimeRoot, entryPath)]);
  } catch (error) {
    return { refusal: refusal("prebuilt-runtime-package", "the portable runtime is missing its package or entry carrier", error.message) };
  }
  return { directory, digest: observation.observedDigest, fileCount: observation.fileCount, byteCount: observation.byteCount, runtimeRoot, entrypoints: [...new Set(entrypoints)].sort() };
}

function rsyncDestination(host, releaseDirectory) {
  return `${host}:${releaseDirectory}/`;
}

export function buildAtomicSymlinkScript(link, target, token) {
  const temporary = `${link}.${token}.${randomUUID()}.next`;
  return `ln -s ${target} ${temporary} && mv -Tf ${temporary} ${link}`;
}

function stageVerifiedPrebuiltRuntime({ host, directory, releaseDirectory, run }) {
  const source = `${directory}/`;
  const destination = rsyncDestination(host, releaseDirectory);
  run("rsync", ["-a", "--checksum", source, destination]);
  return run("rsync", ["-a", "--checksum", "--dry-run", "--itemize-changes", "--delete", source, destination]).trim();
}

// A `dist/` entry is a built server script -- importing it would start the
// service inline, so it is syntax-checked only, never imported.
function buildEntryCheckScript(entryPath) {
  return entryPath.startsWith("dist/")
    ? `if [ -f "${entryPath}" ] && node --check "${entryPath}"; then echo "ENTRY ok"; else echo "ENTRY fail dist-entry-missing-or-syntax-error"; fi`
    : `node --input-type=module -e "import('./${entryPath}').then(()=>console.log('ENTRY ok')).catch((e)=>console.log('ENTRY fail ' + e.message))"`;
}

/**
 * Builds one remote shell script that (1) waits, up to its own
 * maxAttempts*intervalSeconds budget, for the unit to report
 * ActiveState=active/SubState=running -- so time to bind is spent here,
 * never inside the probe budget below -- then (2) polls `url` through the
 * host up to maxAttempts times, intervalSeconds apart. A 2xx (always) or
 * 4xx (default, proves a listener answers) or the exact --probe-expect
 * code counts as alive. Reports startupSeconds: elapsed time, measured
 * from the start of the curl loop, until the first non-000 response code.
 */
function buildProbeScript(unit, url, probeExpect, maxAttempts, intervalSeconds) {
  const successPatterns = probeExpect ? ["2??", probeExpect] : ["2??", "4??"];
  return [
    "active=0",
    `for i in $(seq 1 ${maxAttempts}); do`,
    `  state=$(systemctl --user show -p ActiveState,SubState ${unit} --no-pager 2>/dev/null)`,
    "  case \"$state\" in *ActiveState=active*SubState=running*) active=1 ;; esac",
    '  [ "$active" = "1" ] && break',
    `  [ "$i" -lt ${maxAttempts} ] && sleep ${intervalSeconds}`,
    "done",
    "start_ts=$(date +%s); startup=\"\"; code=000; attempts=\"\"",
    `for i in $(seq 1 ${maxAttempts}); do`,
    `  code=$(curl -s -o /dev/null -m 5 -w '%{http_code}' ${url} 2>/dev/null || echo 000)`,
    '  attempts="$attempts $i:$code"',
    '  [ "$code" != "000" ] && [ -z "$startup" ] && startup=$(( $(date +%s) - start_ts ))',
    `  case "$code" in ${successPatterns.join("|")}) echo "PROBE ok $code ${"${startup:-NA}"} active=$active$attempts"; exit 0 ;; esac`,
    `  [ "$i" -lt ${maxAttempts} ] && sleep ${intervalSeconds}`,
    "done",
    'echo "PROBE fail $code ${startup:-NA} active=$active$attempts"',
  ].join("\n");
}

function parseProbeOutput(text) {
  const match = /PROBE (ok|fail) (\d{3}) (\d+|NA) active=(0|1)(.*)/su.exec(text);
  if (!match) return { ok: false, lastCode: null, startupSeconds: null, waitedActive: false, transcript: text.trim() };
  return {
    ok: match[1] === "ok",
    lastCode: match[2],
    startupSeconds: match[3] === "NA" ? null : Number(match[3]),
    waitedActive: match[4] === "1",
    transcript: match[5].trim(),
  };
}

function runProbe(host, unit, url, probeExpect, maxAttempts, intervalSeconds, run) {
  return parseProbeOutput(runHost(host, buildProbeScript(unit, url, probeExpect, maxAttempts, intervalSeconds), run));
}

/**
 * Plans, and optionally performs, one production-host package release, per
 * the recipe distilled from Cold Red Gate's 2026-09-03/04 deployment
 * receipts (news-property 0.1.2 and 0.1.3): a memory gate, a versioned
 * release directory built by npm pack + tar + npm install against the
 * canonical registry, a lockfile/entry verification, an atomic
 * previous/current symlink flip, a unit restart, and a receipt.
 * @param {object} options
 * @param {string} options.host - ssh destination for the production host.
 * @param {string} options.packageName - full npm package name, e.g. "@red-cup-engineering/news-property".
 * @param {string} options.version - exact version to release.
 * @param {string} options.unit - the systemd --user unit this release restarts.
 * @param {string} [options.timer] - a systemd --user timer to confirm after start.
 * @param {string} [options.entry] - the release's entry module, relative to its directory (default "index.mjs"); an entry under "dist/" is syntax-checked, never imported, since importing it would start the service.
 * @param {boolean} [options.restart] - use `systemctl --user restart` instead of `start` (for a long-running service that is already active).
 * @param {string} [options.probe] - a URL to poll through the host after the unit comes up; a 2xx/4xx response (or --probe-expect's exact code) counts as alive. Before the first attempt, the script waits (same attempt/interval budget) for the unit to report ActiveState=active/SubState=running, so bind time is not spent inside the probe budget.
 * @param {string} [options.probeExpect] - an exact HTTP status code that also counts as a successful probe.
 * @param {number} [options.probeAttempts] - probe (and wait-for-active) polling attempts (default PROBE_MAX_ATTEMPTS).
 * @param {number} [options.probeIntervalSeconds] - gap between polling attempts, in seconds (default PROBE_INTERVAL_SECONDS).
 * @param {string} [options.envFile] - an absolute remote systemd EnvironmentFile path to edit as part of this release, with rollback (per the 2026-09-04 incident: a production config change is part of a release, never a hand-edit ahead of one); a leading `~` is refused, since the remote rewrite runs outside a shell and never expands it. The file is created (empty, `chmod 600`) first if it does not yet exist -- a brand-new shared environment file being onboarded for the first time is not treated as a missing-file error. Before the rewrite, `<envFile>.previous` is backed up (`cp -p`, then `chmod 600`); the rewritten file itself is `chmod 600`ed afterward, and again after a rollback restore, so a source file the deploy target left group/world-readable never keeps leaking the secret it just received. No env-related host command runs unless `options.apply` is true.
 * @param {string[]} [options.envSet] - repeatable "KEY=VALUE" edits applied to `options.envFile`; KEY must match ENV_KEY_PATTERN. Requires `options.envFile`.
 * @param {string[]} [options.envUnset] - repeatable KEY names to remove from `options.envFile`. Requires `options.envFile`.
 * @param {string} [options.releaseName] - names the releases root (`~/.local/share/561-group/releases/<releaseName>`) and release-directory prefix (`<releaseName>-<version>`); must match RELEASE_NAME_PATTERN. Defaults to the package basename, which is wrong whenever the live unit's release layout uses a shorter or differently-cased name than the npm package (e.g. `@red-cup-engineering/ops-561-group-mcp-gateway-service` releasing under `ops-561-group-mcp-gateway`).
 * @param {string} [options.npmrcSource] - an absolute remote `.npmrc` path to seed this release's `.npmrc` from, in place of `<releasesRoot>/<current>/.npmrc`. Required to onboard a brand-new release lane (no `<releasesRoot>/current` symlink yet) -- without it, a missing `current` symlink is refused (`current-release`) exactly as before. A sibling lane's `.npmrc` is a safe source: every house release lane points at the same canonical registry.
 * @param {string} [options.prebuiltRuntimeDirectory] - absolute local directory of a `verify-node-runtime-release`-approved portable runtime. Its root package identity, exact version, and admitted entry must match this release. The runtime is copied only into freshly prepared staging with rsync checksums, then a checksum dry run must be empty before the ordinary pointer/start/probe/rollback sequence continues.
 * @param {boolean} [options.repointUnitWorkingDirectory] - rewrites the unit's own `~/.config/systemd/user/<unit>` file so its `WorkingDirectory=` line names `<releasesRoot>/current`, backing up the original unit file first and running `systemctl --user daemon-reload` before start/restart; on a failed start or probe, the original unit file is restored and reloaded before the rollback restart. Set this once, the first time a unit whose `ExecStart` still names a plain non-release tree is onboarded onto the release convention -- later releases of the same lane already have a unit pointed at `current` and do not need it, though repeating it is harmless (the same line is rewritten to the same value).
 * @param {string} [options.unitFile] - absolute local path to exact reviewed unit bytes. Requires `unitFileCurrentDigest`; the remote current unit must match that digest before replacement, then systemd validates the replacement. The old bytes are restored before rollback starts the old generation.
 * @param {string} [options.unitFileCurrentDigest] - SHA-256 digest of the remote current unit expected by `unitFile`; refuses if an operator-specific setting would be overwritten unexpectedly.
 * @param {boolean} [options.wireEnvironmentFileDirective] - ensures the unit file carries `EnvironmentFile=<options.envFile>` (inserted after its `[Service]` header, idempotent), backing up the original unit file first (shared with `options.repointUnitWorkingDirectory`'s backup when both are requested together) and running `systemctl --user daemon-reload` before start/restart; on a failed start or probe, the original unit file is restored and reloaded before the rollback restart. Requires `options.envFile`. Set this once per unit, the first time that unit is onboarded onto a shared environment file -- repeating it is harmless (the same line is left in place).
 * @param {boolean} [options.authorUnit] - when `options.unit` (and, if given, `options.timer`) does not yet exist on the host (`systemctl --user show -p LoadState` reports "not-found"), author it from scratch: writes a new `~/.config/systemd/user/<unit>` (Type=`options.unitType`, WorkingDirectory=`<releasesRoot>/current`, ExecStart=`options.unitExecStart`) and, when `options.timer`/`options.timerOnCalendar` are also given and that timer does not yet exist, a paired `~/.config/systemd/user/<timer>` (OnCalendar=`options.timerOnCalendar`, Persistent=true), then `systemctl --user daemon-reload` and `systemctl --user enable --now <timer>`. When the named unit (or timer) already exists, this is a no-op for it -- behavior is exactly as without `options.authorUnit`. Requires `options.unitExecStart`. On a failed first run, there is no earlier working unit to restart into: the newly authored timer is disabled (`systemctl --user disable --now`) rather than restarted, and both authored files are left in place for diagnosis.
 * @param {string} [options.unitExecStart] - the literal `ExecStart=` command line for a unit `options.authorUnit` authors (an absolute interpreter path, e.g. the host's pinned nvm node binary -- systemd user units do not source a login shell's PATH). Requires `options.authorUnit`.
 * @param {string} [options.unitType] - the authored unit's `Type=` (default "oneshot"). Only meaningful with `options.authorUnit`.
 * @param {string} [options.unitDescription] - the authored unit's (and, paired, its timer's) `Description=` line. Defaults to a description naming the release and unit.
 * @param {string} [options.timerOnCalendar] - the authored timer's `OnCalendar=` systemd calendar spec. Requires `options.authorUnit` and `options.timer`.
 * @param {boolean} [options.apply] - when false (default), only read-only gates run and a plan is returned.
 * @param {string} [options.dataRoot] - overrides the semantic-record-journal custody root (tests only).
 * @param {string} [options.recordedAt] - overrides the receipt's recordedAt (tests only).
 * @param {object} options.controlCommand - an already admitted ControlCommandAdmission bound to this machine and reservation.
 * @param {(command: string, args: string[]) => string} [options.run] - overrides the ssh/execute-javascript-node-command transport (tests only).
 * @returns {{outcome: "planned"|"released"|"refused", plan?: object, receipt?: object, refusals?: object[], probe?: object, rollbackProbe?: object}}
 */
export function releasePackageOnHost({ host, packageName, version, unit, timer, entry, restart = false, probe: probeUrl, probeExpect, probeAttempts = PROBE_MAX_ATTEMPTS, probeIntervalSeconds = PROBE_INTERVAL_SECONDS, envFile, envSet = [], envUnset = [], releaseName, npmrcSource, prebuiltRuntimeDirectory, repointUnitWorkingDirectory = false, wireEnvironmentFileDirective = false, unitFile, unitFileCurrentDigest, authorUnit = false, unitExecStart, unitType = "oneshot", unitDescription, timerOnCalendar, apply = false, dataRoot, recordedAt, resourceControl, reservationReceipt, controlCommand, machine, run = defaultRun } = {}) {
  for (const [name, value] of [["--host", host], ["--package", packageName], ["--version", version], ["--unit", unit]]) {
    if (!value) return { outcome: "refused", refusals: [refusal("usage", `${name} is required`, null)] };
  }

  const entryPath = entry ?? "index.mjs";
  const admittedUnitFile = admitUnitFile(unitFile, unitFileCurrentDigest);
  if (admittedUnitFile?.refusal) return { outcome: "refused", refusals: [admittedUnitFile.refusal] };
  const prebuiltRuntime = prebuiltRuntimeDirectory
    ? admitPrebuiltRuntime({ directory: prebuiltRuntimeDirectory, packageName, version, entryPath, run })
    : null;
  if (prebuiltRuntime?.refusal) return { outcome: "refused", refusals: [prebuiltRuntime.refusal] };

  const effectiveReleaseName = releaseName ?? shortPackageName(packageName);
  const releaseNameRefusal = validateReleaseName(effectiveReleaseName);
  if (releaseNameRefusal) return { outcome: "refused", refusals: [releaseNameRefusal] };

  const envEditRefusal = validateEnvEdit(envFile, envSet, envUnset, wireEnvironmentFileDirective);
  if (envEditRefusal) return { outcome: "refused", refusals: [envEditRefusal] };
  const envSetPairs = envSet.map((raw) => { const eq = raw.indexOf("="); return [raw.slice(0, eq), raw.slice(eq + 1)]; });
  const envUnsetKeys = [...envUnset];

  const authorUnitRefusal = validateAuthorUnit(authorUnit, unitExecStart, timer, timerOnCalendar);
  if (authorUnitRefusal) return { outcome: "refused", refusals: [authorUnitRefusal] };
  if (admittedUnitFile && authorUnit) {
    return { outcome: "refused", refusals: [refusal("unit-file-author", "--unit-file replaces an existing reviewed unit and cannot be combined with --author-unit", null)] };
  }
  if (admittedUnitFile && (repointUnitWorkingDirectory || wireEnvironmentFileDirective)) {
    return { outcome: "refused", refusals: [refusal("unit-file-directive", "--unit-file supplies complete reviewed unit bytes and cannot be combined with directive rewrite flags", null)] };
  }

  const root = releasesRoot(effectiveReleaseName);
  const releaseDirName = prebuiltRuntime
    ? `${effectiveReleaseName}-${version}-${prebuiltRuntime.digest}`
    : `${effectiveReleaseName}-${version}`;
  let releaseDir = `${root}/${releaseDirName}`;
  let releaseRuntimeDirectory = prebuiltRuntime?.runtimeRoot ? `${releaseDir}/${prebuiltRuntime.runtimeRoot}` : releaseDir;
  const releaseCurrentPath = `${root}/current`;

  const diskGate = parseRootAvailableBytes(runHost(host, "df -B1 --output=avail /", run));
  const memoryGate = parseFreeAvailableMb(runHost(host, "free -m", run));
  const releaseAdmission = decideReleaseAdmission({
    machine,
    resourceControl,
    reservationReceipt,
    controlCommand,
    evaluatedAt: recordedAt ?? new Date().toISOString(),
    reserve: { type: "ReleaseCapacityReserve", version: 1, minimumRootAvailableBytes: RELEASE_DISK_FLOOR_BYTES, minimumMemoryAvailableMb: MEMORY_FLOOR_MB },
    capacity: { type: "ReleaseCapacityObservation", version: 1, machineIdentity: machine?.machineIdentity, observationEvidenceIdentity: machine?.observationEvidenceIdentity, observedAt: machine?.observedAt, rootAvailableBytes: diskGate.available, memoryAvailableMb: memoryGate.available },
    deploy: { type: "ReleaseDeployIntent", version: 1, mutation: true },
    receipt: { type: "ReleaseReceiptRequirement", version: 1, durable: true },
  });
  if (!releaseAdmission.admitted) {
    const rootCapacityRefused = releaseAdmission.reasons.some(({ code }) => code === "capacity-root-below-reserve");
    const memoryCapacityRefused = releaseAdmission.reasons.some(({ code }) => code === "capacity-memory-below-reserve");
    return {
      outcome: "refused",
      refusals: [refusal(
        rootCapacityRefused ? "disk-capacity-gate" : memoryCapacityRefused ? "memory-gate" : "release-admission",
        rootCapacityRefused ? `${diskGate.available} bytes available on / is below the ${RELEASE_DISK_FLOOR_BYTES}-byte release staging floor` : memoryCapacityRefused ? `${memoryGate.available}MB available is below the ${MEMORY_FLOOR_MB}MB stop-the-wave floor` : "release admission did not admit this deployment",
        releaseAdmission,
      )],
    };
  }

  const currentTarget = runHost(host, `readlink ${root}/current 2>/dev/null || true`, run).trim();
  if (!currentTarget && !npmrcSource && !prebuiltRuntime) {
    return { outcome: "refused", refusals: [refusal("current-release", `no 'current' release symlink found under ${root}`, currentTarget)] };
  }
  // A brand-new lane (no prior release) has no sibling directory to read a
  // fromVersion or .npmrc from; npmrcSource supplies the latter explicitly.
  const currentDirName = currentTarget ? currentTarget.split("/").pop() : null;
  const currentReleasePath = currentTarget ? (currentTarget.startsWith("/") ? currentTarget : `${root}/${currentTarget}`) : null;
  const fromVersion = currentDirName
    ? ((prebuiltRuntime || !currentDirName.startsWith(`${effectiveReleaseName}-`))
      ? runHost(host, `node -p 'require(process.argv[1]).version' ${currentReleasePath}/package.json`, run).trim()
      : currentDirName.slice(effectiveReleaseName.length + 1))
    : null;

  // Read-only gate, mirrors memoryGate/currentTarget below: runs even in plan
  // mode, so a plan can report exactly which unit(s) a real --apply run
  // would author. Placed before the already-current check below, since
  // onboarding a brand-new unit (or timer) onto an already-current release
  // is exactly the "second unit onboarding" case that check exempts.
  let unitAuthor = null;
  let authoredWorkingDirectory = null;
  if (authorUnit) {
    const serviceLoadState = parseLoadState(runHost(host, `systemctl --user show -p LoadState ${unit} --no-pager`, run));
    const authoringTimerRequested = Boolean(timer && timerOnCalendar);
    const timerLoadState = authoringTimerRequested ? parseLoadState(runHost(host, `systemctl --user show -p LoadState ${timer} --no-pager`, run)) : null;
    const serviceMissing = serviceLoadState === "not-found";
    if (serviceMissing) {
      // systemd never tilde-expands a unit file's WorkingDirectory= (refused
      // at load with "unit ... not loaded" -- verified 2026-09-05 against a
      // freshly authored forecast-weather-markets-run.service), the same
      // constraint buildWorkingDirectoryEditScript already documents for an
      // edited unit. That edit path resolves it via `eval echo` on the
      // remote shell at edit time; a brand-new unit's content is written
      // directly (buildWriteRemoteFileScript, no shell interpolation of its
      // own content), so the remote $HOME is resolved here instead, once,
      // and substituted before the unit text is ever rendered.
      const remoteHome = runHost(host, "echo $HOME", run).trim();
      authoredWorkingDirectory = releaseCurrentPath.replace(/^~/u, remoteHome);
    }
    unitAuthor = {
      service: { unit, loadState: serviceLoadState, missing: serviceMissing },
      timer: authoringTimerRequested ? { unit: timer, loadState: timerLoadState, missing: timerLoadState === "not-found", onCalendar: timerOnCalendar } : null,
    };
  }
  const authoringService = Boolean(unitAuthor?.service.missing);
  const authoringTimer = Boolean(unitAuthor?.timer?.missing);
  const unitPath = unitFilePath(unit);
  const timerPath = timer ? unitFilePath(timer) : null;
  let observedUnitDigest = null;
  if (admittedUnitFile) {
    observedUnitDigest = runHost(host, buildRemoteFileDigestScript(unitPath), run).trim();
    if (observedUnitDigest !== admittedUnitFile.expectedCurrentDigest) {
      return { outcome: "refused", refusals: [refusal("unit-file-current-digest", "the remote unit differs from the reviewed expected bytes", { expected: admittedUnitFile.expectedCurrentDigest, observed: observedUnitDigest })] };
    }
  }

  // Explicit configuration or unit changes can reuse the current installed release.
  const currentArtifactDirName = prebuiltRuntime?.runtimeRoot && currentReleasePath?.endsWith(`/${prebuiltRuntime.runtimeRoot}`)
    ? basename(dirname(currentReleasePath))
    : currentDirName;
  const alreadyCurrent = prebuiltRuntime ? currentArtifactDirName === releaseDirName : fromVersion === version;
  if (alreadyCurrent) {
    releaseDir = prebuiltRuntime?.runtimeRoot ? dirname(currentReleasePath) : currentReleasePath;
    releaseRuntimeDirectory = currentReleasePath;
  }
  const editingEnvironment = envSetPairs.length > 0 || envUnsetKeys.length > 0;
  const onboardingUnitEditOnly = repointUnitWorkingDirectory || wireEnvironmentFileDirective || admittedUnitFile !== null;
  // A directive edit backs up and rewrites an EXISTING unit file; a unit this same call is
  // about to author fresh has nothing yet to back up, and its EnvironmentFile= directive is
  // wired into the freshly-authored text instead (see the authoringService branch below).
  const editingExistingUnit = onboardingUnitEditOnly && !authoringService;
  const onboardingAuthoredUnit = authoringService || authoringTimer;
  const configurationOnly = alreadyCurrent && editingEnvironment && !onboardingUnitEditOnly && !onboardingAuthoredUnit;
  if (alreadyCurrent && !editingEnvironment && !onboardingUnitEditOnly && !onboardingAuthoredUnit) {
    return {
      outcome: "refused",
      refusals: [refusal("current-version", "already-current", { current: fromVersion, requested: version })],
    };
  }

  let lifecycleNodeEntrypoints = [];
  if (prebuiltRuntime && !alreadyCurrent && !admittedUnitFile) {
    try {
      lifecycleNodeEntrypoints = parseSystemdLifecycleNodeEntrypoints(runHost(host, buildSystemdLifecycleNodeEntrypointsScript(unit), run));
    } catch (error) {
      return { outcome: "refused", refusals: [refusal("unit-lifecycle-observation", "could not obtain typed systemd lifecycle Node entries", error.message)] };
    }
    const missingLifecycleEntrypoints = lifecycleNodeEntrypoints.filter((entry) => !prebuiltRuntime.entrypoints.includes(entry));
    if (missingLifecycleEntrypoints.length > 0) {
      return { outcome: "refused", refusals: [refusal("prebuilt-runtime-lifecycle-entry", "the portable runtime does not admit every direct systemd Node lifecycle entry", { missing: missingLifecycleEntrypoints })] };
    }
  }

  if (!prebuiltRuntime) {
    let registryVersion;
    try {
      registryVersion = runHost(host, `npm view ${packageName}@${version} --registry=https://registry.561.group/ version`, run).trim();
    } catch (error) {
      return { outcome: "refused", refusals: [refusal("registry-version", `npm view failed for ${packageName}@${version}`, error.message)] };
    }
    if (registryVersion !== version) {
      return { outcome: "refused", refusals: [refusal("registry-version", `${packageName}@${version} was not found on https://registry.561.group`, registryVersion || "(empty)")] };
    }
  }

  const startVerb = restart || (alreadyCurrent && editingEnvironment) ? "restart" : "start";
  const npmrcSourcePath = npmrcSource ?? `${currentReleasePath}/.npmrc`;
  const flipCommand = configurationOnly ? null : prebuiltRuntime
    ? currentDirName
      ? `${buildAtomicSymlinkScript(`${root}/previous`, currentReleasePath, prebuiltRuntime.digest)} && ${buildAtomicSymlinkScript(`${root}/current`, releaseRuntimeDirectory, prebuiltRuntime.digest)}`
      : buildAtomicSymlinkScript(`${root}/current`, releaseRuntimeDirectory, prebuiltRuntime.digest)
    : currentDirName
      ? `ln -sfn ${currentReleasePath} ${root}/previous && ln -sfn ${releaseDir} ${root}/current`
      : `ln -sfn ${releaseDir} ${root}/current`;

  const plan = {
    type: "ReleasePackageOnHostPlan",
    version: 1,
    host,
    package: packageName,
    releaseName: effectiveReleaseName,
    toVersion: version,
    fromVersion,
    unit,
    restart: startVerb === "restart",
    timer: timer ?? null,
    probe: probeUrl ?? null,
    probeExpect: probeExpect ?? null,
    probeAttempts: probeUrl ? probeAttempts : null,
    probeIntervalSeconds: probeUrl ? probeIntervalSeconds : null,
    entry: entryPath,
    releaseDirectory: releaseDir,
    prebuiltRuntime: prebuiltRuntime ? { artifactDigest: prebuiltRuntime.digest, fileCount: prebuiltRuntime.fileCount, byteCount: prebuiltRuntime.byteCount, runtimeRoot: prebuiltRuntime.runtimeRoot || null, lifecycleNodeEntrypoints } : null,
    runtimeDirectory: releaseRuntimeDirectory,
    releaseAdmission,
    diskGate: { before: diskGate.raw, floor: RELEASE_DISK_FLOOR_BYTES, result: `${diskGate.available} bytes available on / before staging, above the ${RELEASE_DISK_FLOOR_BYTES}-byte release staging floor` },
    memoryGate: { before: memoryGate.raw, floor: MEMORY_FLOOR_MB, result: `${memoryGate.available}MB available before start, comfortably above the ${MEMORY_FLOOR_MB}MB stop-the-wave floor` },
    envEdit: envFile ? { file: envFile, backup: `${envFile}.previous`, set: envSetPairs.map(([key]) => key), unset: envUnsetKeys } : null,
    unitEdit: editingExistingUnit
      ? { file: unitPath, backup: `${unitPath}.previous`,
          workingDirectory: repointUnitWorkingDirectory ? releaseCurrentPath : null,
          environmentFileDirective: wireEnvironmentFileDirective ? envFile : null,
          ...(admittedUnitFile ? { source: admittedUnitFile.path, expectedCurrentDigest: admittedUnitFile.expectedCurrentDigest, sourceDigest: admittedUnitFile.digest } : {}) }
      : null,
    unitAuthor: unitAuthor
      ? { service: { unit, file: unitPath, missing: authoringService, unitType, execStart: unitExecStart, workingDirectory: authoringService ? authoredWorkingDirectory : null, environmentFileDirective: authoringService && wireEnvironmentFileDirective ? envFile : null },
          timer: unitAuthor.timer ? { unit: timer, file: timerPath, missing: authoringTimer, onCalendar: timerOnCalendar } : null }
      : null,
    plannedSteps: [
      ...(alreadyCurrent
        ? [`skip install -- reuse current release ${releaseDir} for the requested configuration or unit change`]
        : prebuiltRuntime
          ? [
              `preserve any non-current, inactive ${releaseDir} under a unique incomplete suffix, then create empty staging`,
              `rsync the locally verified ${prebuiltRuntime.digest} portable runtime into staging with checksums`,
              "rsync --checksum --dry-run --itemize-changes --delete must report no remaining transfer difference before promotion",
              `node --check every observed lifecycle Node entry on the remote staged runtime: ${lifecycleNodeEntrypoints.join(", ") || "(none)"}`,
            ]
          : [
            `preserve any non-current, inactive ${releaseDir} under a unique incomplete suffix, then create empty staging`,
            `cp ${npmrcSourcePath} ${releaseDir}/.npmrc`,
            `npm pack ${packageName}@${version} --registry=https://registry.561.group/ + tar xzf --strip-components=1 + npm install --no-audit --no-fund`,
          ]),
      prebuiltRuntime
        ? `verify the prebuilt receipt admits ${entryPath} and every direct systemd Node lifecycle entry`
        : entryPath.startsWith("dist/")
          ? `verify house-scope lockfile resolved URLs and node --check ${entryPath} (dist entry, not imported)`
          : "verify house-scope lockfile resolved URLs and the unit's entry module imports",
      ...(envFile
        ? [
            `create ${envFile} (empty, chmod 600) if it does not yet exist`,
            `cp -p ${envFile} ${envFile}.previous`,
            `chmod 600 ${envFile}.previous`,
            `rewrite ${envFile} remotely via one node -e invocation: set [${envSetPairs.map(([key]) => key).join(", ")}], unset [${envUnsetKeys.join(", ")}] (every other line preserved byte-for-byte, each KEY exactly once)`,
            `chmod 600 ${envFile}`,
          ]
        : []),
      ...(editingExistingUnit
        ? [
            `cp -p ${unitPath} ${unitPath}.previous`,
            ...(admittedUnitFile ? [
              `confirm ${unitPath} SHA-256 matches the reviewed expected digest before replacing it`,
              `write reviewed ${admittedUnitFile.path} bytes to ${unitPath}`,
              `systemd-analyze --user verify ${unitPath}, daemon-reload, inspect every new direct Node lifecycle entry through systemd D-Bus, and verify each against staged runtime before promotion`,
            ] : []),
            ...(repointUnitWorkingDirectory ? [`rewrite ${unitPath}'s WorkingDirectory= line to ${releaseCurrentPath}`] : []),
            ...(wireEnvironmentFileDirective ? [`ensure ${unitPath}'s [Service] section carries EnvironmentFile=${envFile} (idempotent insert)`] : []),
            "systemctl --user daemon-reload",
          ]
        : []),
      ...(authoringService || authoringTimer
        ? [
            ...(authoringService ? [`write ${unitPath} (new Type=${unitType} unit, WorkingDirectory=${authoredWorkingDirectory}, ExecStart=${unitExecStart})`] : []),
            ...(authoringService && wireEnvironmentFileDirective ? [`ensure freshly-written ${unitPath}'s [Service] section carries EnvironmentFile=${envFile} (idempotent insert)`] : []),
            ...(authoringTimer ? [`write ${timerPath} (new .timer, OnCalendar=${timerOnCalendar}, Persistent=true, Unit=${unit})`] : []),
            "systemctl --user daemon-reload",
            ...(authoringTimer ? [`systemctl --user enable --now ${timer}`] : []),
          ]
        : []),
      ...(flipCommand === null ? [] : [flipCommand]),
      `systemctl --user ${startVerb} ${unit}`,
      `systemctl --user show -p Result,ActiveState,SubState,ExecMainCode,ExecMainStatus ${unit}`,
      ...(prebuiltRuntime ? [] : [`journalctl --user -u ${unit} -n 80 --no-pager`]),
      ...(timer ? [`systemctl --user list-timers ${timer}`] : []),
      ...(probeUrl
        ? [`wait for ${unit} ActiveState=active/SubState=running (up to ${probeAttempts} attempts ${probeIntervalSeconds}s apart), then poll ${probeUrl} through the host on the same budget, recording startupSeconds; on failure, roll back current, restart, and re-probe`]
        : []),
    ],
  };

  if (!apply) return { outcome: "planned", plan };

  let stagingPreparation = null;
  let prebuiltTransferVerification = null;
  if (!alreadyCurrent) {
    stagingPreparation = runHost(host, buildFreshReleaseDirectoryScript(releaseDir, releaseCurrentPath), run).trim();
    if (prebuiltRuntime) {
      prebuiltTransferVerification = stageVerifiedPrebuiltRuntime({ host, directory: prebuiltRuntime.directory, releaseDirectory: releaseDir, run });
      if (prebuiltTransferVerification) {
        return { outcome: "refused", refusals: [refusal("prebuilt-runtime-transfer", "rsync checksum verification found a staging difference", prebuiltTransferVerification)] };
      }
      const afterTransfer = admitPrebuiltRuntime({ directory: prebuiltRuntime.directory, packageName, version, entryPath, run });
      if (afterTransfer.refusal || afterTransfer.digest !== prebuiltRuntime.digest) {
        return { outcome: "refused", refusals: [afterTransfer.refusal ?? refusal("prebuilt-runtime-transfer", "the local portable runtime changed during transfer", { before: prebuiltRuntime.digest, after: afterTransfer.digest })] };
      }
      try {
        if (!admittedUnitFile) for (const lifecycleEntry of lifecycleNodeEntrypoints) runHost(host, `cd ${releaseRuntimeDirectory} && node --check ${lifecycleEntry}`, run);
      } catch (error) {
        return { outcome: "refused", refusals: [refusal("prebuilt-runtime-entry", "remote node --check failed for a systemd lifecycle entry", error.message)] };
      }
    } else {
      runHost(host, `cp ${npmrcSourcePath} ${releaseDir}/.npmrc`, run);
      runHost(host, `cd ${releaseDir} && npm pack ${packageName}@${version} --registry=https://registry.561.group/ && tar xzf *.tgz --strip-components=1 && rm -f *.tgz && npm install --no-audit --no-fund`, run);
    }
  }

  let lockfileVerification;
  if (prebuiltRuntime) {
    lockfileVerification = `not applicable -- prebuilt runtime ${prebuiltRuntime.digest} was admitted locally and rsync --checksum verification was empty`;
  } else {
    const verifyScript = [
      `cd ${releaseRuntimeDirectory} || exit 90`,
      "total=$(grep -c '\"resolved\"' package-lock.json 2>/dev/null || echo 0)",
      "atregistry=$(grep -c '\"resolved\": \"https://registry.561.group' package-lock.json 2>/dev/null || echo 0)",
      'echo "LOCKFILE $atregistry $total"',
      buildEntryCheckScript(entryPath),
    ].join(" ; ");
    const verify = parseVerifyOutput(runHost(host, verifyScript, run));
    lockfileVerification = `${verify.atRegistry}/${verify.total} package-lock.json "resolved" URLs point at https://registry.561.group (${verify.total - verify.atRegistry} pointing elsewhere)`;
    if (verify.total === 0 || verify.atRegistry !== verify.total) {
      return { outcome: "refused", refusals: [refusal("lockfile-verify", "not every lockfile resolved URL points at https://registry.561.group", lockfileVerification)] };
    }
    if (!verify.entryOk) {
      return { outcome: "refused", refusals: [refusal("entry-import-verify", `${entryPath} failed verification`, verify.entryDetail)] };
    }
  }

  if (envFile) {
    // A brand-new shared environment file being onboarded for the first
    // time has nothing to back up yet -- create it (empty, 600) rather
    // than letting the backup step fail on a missing source.
    runHost(host, `[ -f ${envFile} ] || { : > ${envFile}; chmod 600 ${envFile}; }`, run);
    runHost(host, `cp -p ${envFile} ${envFile}.previous`, run);
    runHost(host, `chmod 600 ${envFile}.previous`, run);
    runHost(host, buildEnvEditScript(envFile, envSetPairs, envUnsetKeys), run);
    runHost(host, `chmod 600 ${envFile}`, run);
  }
  if (editingExistingUnit) {
    if (admittedUnitFile) {
      const recheckedUnitDigest = runHost(host, buildRemoteFileDigestScript(unitPath), run).trim();
      if (recheckedUnitDigest !== admittedUnitFile.expectedCurrentDigest) {
        return { outcome: "refused", refusals: [refusal("unit-file-current-digest", "the remote unit changed after the initial review; it was not backed up or replaced", { expected: admittedUnitFile.expectedCurrentDigest, observed: recheckedUnitDigest })] };
      }
    }
    runHost(host, `cp -p ${unitPath} ${unitPath}.previous`, run);
    if (admittedUnitFile) {
      try {
        runHost(host, buildWriteRemoteFileScript(unitPath, admittedUnitFile.content), run);
        runHost(host, `systemd-analyze --user verify ${unitPath}`, run);
        runHost(host, "systemctl --user daemon-reload", run);
        lifecycleNodeEntrypoints = parseSystemdLifecycleNodeEntrypoints(runHost(host, buildSystemdLifecycleNodeEntrypointsScript(unit), run));
        const missingLifecycleEntrypoints = prebuiltRuntime
          ? lifecycleNodeEntrypoints.filter((lifecycleEntry) => !prebuiltRuntime.entrypoints.includes(lifecycleEntry))
          : [];
        if (missingLifecycleEntrypoints.length > 0) throw new Error("new unit names an entry absent from the staged runtime");
        for (const lifecycleEntry of lifecycleNodeEntrypoints) runHost(host, `cd ${releaseRuntimeDirectory} && node --check ${lifecycleEntry}`, run);
      } catch {
        runHost(host, `cp -p ${unitPath}.previous ${unitPath}`, run);
        runHost(host, "systemctl --user daemon-reload", run);
        return { outcome: "refused", refusals: [refusal("unit-file-lifecycle", "the reviewed unit did not validate against the staged runtime; its prior bytes were restored before promotion", null)] };
      }
    } else {
      if (repointUnitWorkingDirectory) runHost(host, buildWorkingDirectoryEditScript(unitPath, releaseCurrentPath), run);
      if (wireEnvironmentFileDirective) runHost(host, buildEnvironmentFileDirectiveEditScript(unitPath, envFile), run);
    }
    runHost(host, "systemctl --user daemon-reload", run);
  }
  let serviceAuthored = false;
  let timerAuthored = false;
  if (authoringService) {
    const serviceText = renderReleaseUnitServiceText({
      description: unitDescription ?? `${effectiveReleaseName} (${packageName}) -- ${unit}`,
      workingDirectory: authoredWorkingDirectory,
      execStart: unitExecStart,
      unitType,
    });
    runHost(host, buildWriteRemoteFileScript(unitPath, serviceText), run);
    serviceAuthored = true;
    // renderReleaseUnitServiceText never embeds EnvironmentFile= itself; wire it into the
    // freshly-written text the same way an existing unit's directive edit would, with nothing
    // to back up (there was no prior file).
    if (wireEnvironmentFileDirective) runHost(host, buildEnvironmentFileDirectiveEditScript(unitPath, envFile), run);
  }
  if (authoringTimer) {
    const timerText = renderReleaseUnitTimerText({
      description: unitDescription ? `${unitDescription} (timer)` : `Run ${unit} on schedule`,
      onCalendar: timerOnCalendar,
      unit,
    });
    runHost(host, buildWriteRemoteFileScript(timerPath, timerText), run);
    timerAuthored = true;
  }
  if (serviceAuthored || timerAuthored) runHost(host, "systemctl --user daemon-reload", run);
  if (timerAuthored) runHost(host, `systemctl --user enable --now ${timer}`, run);
  if (flipCommand !== null) runHost(host, flipCommand, run);
  // A Type=oneshot unit's `systemctl start` runs the ExecStart synchronously
  // and returns ITS OWN nonzero exit when the oneshot fails (verified
  // 2026-09-05 against aagaard-michael-capital-circulation.service: "Job for
  // ...service failed because the control process exited with error code").
  // defaultRun() throws on any nonzero-exit host command, which is correct
  // for every other step here -- but for this exact command that would abort
  // before the diagnostics, rollback, and receipt below ever run, leaving a
  // real host mutation (the symlink flip already above) with no receipt at
  // all. Capture it as evidence instead; `show.Result` below already reads
  // the same failure from systemd's own accounting and drives the existing
  // rollback/refusal path correctly once execution reaches it.
  let startCommandError = null;
  try {
    runHost(host, `systemctl --user ${startVerb} ${unit}`, run);
  } catch (error) {
    startCommandError = { message: error.message, status: error.status ?? null, stderr: error.stderr ?? null };
  }
  const show = parseKeyValueLines(runHost(host, `systemctl --user show -p Result,ActiveState,SubState,ExecMainCode,ExecMainStatus ${unit}`, run));
  const journalText = prebuiltRuntime ? null : runHost(host, `journalctl --user -u ${unit} -n 80 --no-pager`, run);
  const readout = journalText === null ? null : extractJsonReadout(journalText);
  const timersOutput = timer ? runHost(host, `systemctl --user list-timers ${timer}`, run).trim() : null;

  const startedOk = show.Result === "success";
  // A probe only runs once the unit itself reports success; probing a unit that never started proves nothing new.
  const probe = startedOk && probeUrl ? runProbe(host, unit, probeUrl, probeExpect, probeAttempts, probeIntervalSeconds, run) : null;
  const unitSucceeded = startedOk && (!probeUrl || probe.ok);

  let rollbackProbe = null;
  let envRestoredOnRollback = false;
  let unitRestoredOnRollback = false;
  let unitAuthorDisabledOnRollback = false;
  if (!unitSucceeded) {
    // The already-running process still holds the failed release in memory until restarted again.
    // A bootstrap release (no prior currentDirName) has no code symlink to flip back -- the unit
    // file restore below is what returns it to its pre-onboarding state.
    if (currentDirName && !configurationOnly) {
      const rollbackCommand = prebuiltRuntime
        ? buildAtomicSymlinkScript(`${root}/current`, currentReleasePath, `${prebuiltRuntime.digest}-rollback`)
        : `ln -sfn ${currentReleasePath} ${root}/current`;
      runHost(host, rollbackCommand, run);
    }
    if (editingExistingUnit) {
      // Restore before the restart below, so the rolled-back unit starts under its old WorkingDirectory/EnvironmentFile=.
      runHost(host, `cp -p ${unitPath}.previous ${unitPath}`, run);
      runHost(host, "systemctl --user daemon-reload", run);
      unitRestoredOnRollback = true;
    }
    if (envFile) {
      // Restore before the restart below, so the rolled-back unit starts under its old config.
      runHost(host, `cp -p ${envFile}.previous ${envFile}`, run);
      runHost(host, `chmod 600 ${envFile}`, run);
      envRestoredOnRollback = true;
    }
    // A unit this release just authored has no earlier working ExecStart to
    // restart into -- restarting would only re-run the same failing command.
    // Disable its timer instead, so a broken oneshot does not keep retrying
    // on its own schedule, and leave both authored files in place for
    // diagnosis (same convention as an ordinary first-ever release's
    // failure: reported, never silently removed).
    const freshlyAuthoredWithNoPriorState = (serviceAuthored || timerAuthored) && !editingExistingUnit;
    if (freshlyAuthoredWithNoPriorState) {
      if (timerAuthored) runHost(host, `systemctl --user disable --now ${timer}`, run);
      unitAuthorDisabledOnRollback = true;
    } else {
      runHost(host, `systemctl --user restart ${unit}`, run);
      if (probeUrl) rollbackProbe = runProbe(host, unit, probeUrl, probeExpect, probeAttempts, probeIntervalSeconds, run);
    }
  }

  const at = recordedAt ?? new Date().toISOString();
  const receiptValue = {
    type: "MapeKAnalyzeStageDeploymentReceipt",
    version: 1,
    kind: "cold-red-gate.mape-k-analyze-stage-deployment-receipt",
    host,
    subject: packageName,
    releaseName: effectiveReleaseName,
    recordedAt: at,
    releaseAdmission,
    diskGate: { before: diskGate.raw, floor: RELEASE_DISK_FLOOR_BYTES, result: `${diskGate.available} bytes available on / before staging, above the ${RELEASE_DISK_FLOOR_BYTES}-byte release staging floor` },
    memoryGate: { before: memoryGate.raw, floor: MEMORY_FLOOR_MB, result: `${memoryGate.available}MB available before start, comfortably above the ${MEMORY_FLOOR_MB}MB stop-the-wave floor` },
    lots: [{
      action: configurationOnly ? "configuration-update" : alreadyCurrent ? "unit-onboard" : (currentDirName ? "release-upgrade" : "release-onboard"),
      subject: packageName,
      fromVersion,
      toVersion: version,
      releaseDirectory: releaseDir,
      stagingPreparation,
      installMethod: alreadyCurrent
        ? `skipped -- reused current release ${releaseDir} for the requested configuration or unit change`
        : prebuiltRuntime
          ? `verified portable runtime ${prebuiltRuntime.digest} transferred with rsync --checksum and an empty --dry-run --itemize-changes --delete verification`
        : `npm pack ${packageName}@${version} --registry=https://registry.561.group/ + tar xzf --strip-components=1 + npm install --no-audit --no-fund, using a release-local .npmrc copied verbatim from ${npmrcSourcePath} (house scopes only, https://registry.561.group/)`,
      ...(prebuiltRuntime ? { prebuiltRuntime: { artifactDigest: prebuiltRuntime.digest, fileCount: prebuiltRuntime.fileCount, byteCount: prebuiltRuntime.byteCount, runtimeRoot: prebuiltRuntime.runtimeRoot || null, transferVerification: prebuiltTransferVerification } } : {}),
      lockfileVerification,
      previousSymlinkFlipped: configurationOnly ? null : currentReleasePath,
      currentSymlinkFlipped: configurationOnly ? null : unitSucceeded ? releaseRuntimeDirectory : currentReleasePath,
      rolledBack: !unitSucceeded,
      ...(envFile
        ? { envEdit: { file: envFile, backup: `${envFile}.previous`, set: envSetPairs.map(([key]) => key), unset: envUnsetKeys, restoredOnRollback: envRestoredOnRollback } }
        : {}),
      ...(editingExistingUnit
        ? { unitEdit: { file: unitPath, backup: `${unitPath}.previous`,
            workingDirectory: repointUnitWorkingDirectory ? releaseCurrentPath : null,
            environmentFileDirective: wireEnvironmentFileDirective ? envFile : null,
            ...(admittedUnitFile ? { source: admittedUnitFile.path, expectedCurrentDigest: admittedUnitFile.expectedCurrentDigest, sourceDigest: admittedUnitFile.digest } : {}),
            restoredOnRollback: unitRestoredOnRollback } }
        : {}),
      ...(unitAuthor
        ? { unitAuthor: {
            service: { unit, file: unitPath, authored: serviceAuthored, workingDirectory: serviceAuthored ? authoredWorkingDirectory : null, environmentFileDirective: serviceAuthored && wireEnvironmentFileDirective ? envFile : null },
            timer: unitAuthor.timer ? { unit: timer, file: timerPath, authored: timerAuthored, onCalendar: timerOnCalendar } : null,
            disabledOnRollback: unitAuthorDisabledOnRollback } }
        : {}),
      unit,
      unitResult: `Result=${show.Result}, ActiveState=${show.ActiveState}, SubState=${show.SubState}, ExecMainCode=${show.ExecMainCode}, ExecMainStatus=${show.ExecMainStatus}`,
      manualRunResult: { command: `systemctl --user ${startVerb} ${unit}`, exitResult: show.Result, startCommandError, readout, unit },
      ...(timer ? { timerVerification: { command: `systemctl --user list-timers ${timer}`, output: timersOutput } } : {}),
      ...(probeUrl
        ? { probeVerification: { url: probeUrl, probeExpect: probeExpect ?? null, probeAttempts, probeIntervalSeconds, probe, rollbackProbe } }
        : {}),
    }],
  };

  const journal = createSemanticRecordJournal({ root: resolveFilepath([dataRoot ?? NODE_ROOT]) });
  const receipt = journal.record({
    objectKind: RECEIPT_OBJECT_KIND,
    category: RECEIPT_CATEGORY,
    record: receiptValue,
    recordedAt: at,
    charge: { support: true, refutation: false },
  });

  if (!unitSucceeded) {
    const refusalStep = startedOk ? "probe-failed" : "unit-start-result";
    const refusalReason = startedOk
      ? `${probeUrl} did not answer after ${startVerb} (rolled back and re-probed)`
      : `${unit} did not report Result=success after ${startVerb}`;
    const evidence = probeUrl ? { probe, rollbackProbe } : { unitResult: receiptValue.lots[0].unitResult, startCommandError };
    return { outcome: "refused", refusals: [refusal(refusalStep, refusalReason, evidence)], receipt, ...(probeUrl ? { probe, rollbackProbe } : {}) };
  }
  return { outcome: "released", receipt, ...(probeUrl ? { probe } : {}) };
}

if (import.meta.main) {
  try {
    const host = option("--host");
    const packageName = option("--package");
    const version = option("--version");
    const unit = option("--unit");
    const timer = option("--timer");
    const entry = option("--entry");
    const probe = option("--probe");
    const probeExpect = option("--probe-expect");
    const probeAttemptsRaw = option("--probe-attempts");
    const probeIntervalSecondsRaw = option("--probe-interval-seconds");
    const envFile = option("--environment-file");
    const envSet = collectRepeated("--env-set");
    const envUnset = collectRepeated("--env-unset");
    const releaseName = option("--release-name");
    const npmrcSource = option("--npmrc-source");
    const prebuiltRuntimeDirectory = option("--prebuilt-runtime-directory");
    const unitFile = option("--unit-file");
    const unitFileCurrentDigest = option("--unit-file-current-digest");
    const repointUnitWorkingDirectory = process.argv.includes("--repoint-unit-working-directory");
    const wireEnvironmentFileDirective = process.argv.includes("--wire-environment-file-directive");
    const authorUnit = process.argv.includes("--author-unit");
    const unitExecStart = option("--unit-exec");
    const unitType = option("--unit-type");
    const unitDescription = option("--unit-description");
    const timerOnCalendar = option("--timer-on-calendar");
    const restart = process.argv.includes("--restart");
    const apply = process.argv.includes("--apply");
    if (!host || !packageName || !version || !unit) {
      process.stderr.write("usage: release-package-on-host.mjs --host <ssh-alias> --package <npm-name> --version <v> --unit <unit.service> [--timer <unit.timer>] [--entry <relative module>] [--restart] [--probe <url>] [--probe-expect <code>] [--probe-attempts <n>] [--probe-interval-seconds <n>] [--release-name <short>] [--prebuilt-runtime-directory <absolute local runtime>] [--unit-file <absolute local unit> --unit-file-current-digest <sha256>] [--environment-file <absolute remote path>] [--env-set KEY=VALUE] [--env-unset KEY] [--npmrc-source <absolute remote path>] [--repoint-unit-working-directory] [--wire-environment-file-directive] [--author-unit --unit-exec <command line> [--unit-type <type>] [--unit-description <text>] [--timer-on-calendar <systemd calendar spec>]] [--apply]\n");
      process.exit(2);
    }
    const probeAttempts = probeAttemptsRaw ? Number(probeAttemptsRaw) : undefined;
    const probeIntervalSeconds = probeIntervalSecondsRaw ? Number(probeIntervalSecondsRaw) : undefined;
    const result = releasePackageOnHost({
      host, packageName, version, unit, timer, entry, restart, probe, probeExpect,
      ...(probeAttempts !== undefined ? { probeAttempts } : {}),
      ...(probeIntervalSeconds !== undefined ? { probeIntervalSeconds } : {}),
      envFile, envSet, envUnset,
      ...(releaseName !== undefined ? { releaseName } : {}),
      ...(npmrcSource !== undefined ? { npmrcSource } : {}),
      ...(prebuiltRuntimeDirectory !== undefined ? { prebuiltRuntimeDirectory } : {}),
      ...(unitFile !== undefined ? { unitFile } : {}),
      ...(unitFileCurrentDigest !== undefined ? { unitFileCurrentDigest } : {}),
      repointUnitWorkingDirectory,
      wireEnvironmentFileDirective,
      authorUnit,
      ...(unitExecStart !== undefined ? { unitExecStart } : {}),
      ...(unitType !== undefined ? { unitType } : {}),
      ...(unitDescription !== undefined ? { unitDescription } : {}),
      ...(timerOnCalendar !== undefined ? { timerOnCalendar } : {}),
      apply,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.outcome === "refused" ? 2 : 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
