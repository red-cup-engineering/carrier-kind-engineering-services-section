#!/usr/bin/env node

import { accessSync, constants, existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { COLD_RED_GATE_NODE, inspectAcceptedSchedules, inspectTarget, resolveColdRedGateNodeExecutable, resolveTargetIsolationExecutables, TARGET_ISOLATION_EXECUTABLES, TARGET_WRITABLE_ROOT_ENVIRONMENT } from "../src/service.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, "..");
// This is target configuration, not provider identity or signing authority.
// The carrier passes only these names into the immutable customer process.
// A run chooses one immutable input: the legacy single-job manifest or the
// queue directory. The remaining values are shared, non-secret runtime inputs.
const KOIOS_SELECTOR_ENVIRONMENT = Object.freeze([
  "KOIOS_NEWS_ROUTINE_PUBLICATION_JOB",
  "KOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE",
]);
const KOIOS_SHARED_TARGET_ENVIRONMENT = Object.freeze([
  "KOIOS_NEWS_ROUTINE_PUBLICATION_AUTHORITY_KEYS",
  "KOIOS_NEWS_ROUTINE_PUBLICATION_ASSESSMENT_KEYS",
  "KOIOS_NEWS_ROUTINE_PUBLICATION_BASELINE_ROOT",
  "KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT",
  "KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT",
]);
const KOIOS_TARGET_ENVIRONMENT = Object.freeze([...KOIOS_SELECTOR_ENVIRONMENT, ...KOIOS_SHARED_TARGET_ENVIRONMENT]);
const KOIOS_ACTOR = "https://bare-cedar-fog.561.group/actors/koios-news";
const KOIOS_TARGET_ROOT = "/home/emsenn/services/koios-news-runtime";
const KOIOS_OPERATION = "koios-news-routine-operation";
const KOIOS_CONTRACT = "koios-news/routine-operation/v1";
const KOIOS_CAPABILITY = "urn:capability:koios-news:cold-red-gate:routine-publication:v1";
const KOIOS_TARGET = Object.freeze({ packageRoot: KOIOS_TARGET_ROOT, actor: KOIOS_ACTOR, operation: KOIOS_OPERATION, contract: KOIOS_CONTRACT });
const ISOLATION_ASSAY_TIMEOUT_SECONDS = 5;
// Bubblewrap receives a read-only host root, fresh proc/dev/tmp, and a
// read-only overlay just as the carrier does for every captured runtime file.
// This has no host-side effects and measures Bubblewrap's actual kernel
// capability and NoNewPrivs state before the timer can be enabled.

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}
function isFile(path) { try { return lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(); } catch { return false; } }
function isDirectory(path) { try { return lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink(); } catch { return false; } }
function expandHome(value, home) { return value.startsWith("%h/") ? join(home, value.slice(3)) : value; }
function unitValue(unit, name) { return unit.match(new RegExp(`^${name}=(.+)$`, "mu"))?.[1] ?? null; }
function inside(root, path) { const rel = relative(root, path); return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); }

export function inspectTargetIsolationExecutables(executables = TARGET_ISOLATION_EXECUTABLES) {
  try { return Object.freeze({ ready: true, executables: resolveTargetIsolationExecutables(executables) }); }
  catch (error) { return Object.freeze({ ready: false, problem: error instanceof Error ? error.message : String(error) }); }
}

export function assayTargetIsolation(executables = TARGET_ISOLATION_EXECUTABLES, spawnProcess = spawnSync) {
  const inspected = inspectTargetIsolationExecutables(executables);
  if (!inspected.ready) return Object.freeze({ ready: false, problem: inspected.problem });
  const fixed = inspected.executables;
  const result = spawnProcess(fixed.timeout, ["--signal=TERM", `${ISOLATION_ASSAY_TIMEOUT_SECONDS}s`, fixed.nice, "-n", "10", fixed.bwrap, "--die-with-parent", "--new-session", "--unshare-user", "--uid", "0", "--gid", "0", "--ro-bind", "/", "/", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--ro-bind", "/usr/bin/true", "/usr/bin/true", "--", "/bin/sh", "-c", "test -d /proc && test -c /dev/null && test -w /tmp && for field in CapInh CapPrm CapEff CapBnd CapAmb; do grep -q \"^${field}:[[:space:]]*0000000000000000$\" /proc/self/status || exit 1; done && grep -q '^NoNewPrivs:[[:space:]]*1$' /proc/self/status && exec /usr/bin/true"], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, NO_COLOR: "1" },
  });
  if (result.status === 0 && !result.error) return Object.freeze({ ready: true });
  const detail = result.error?.message ?? result.stderr?.trim().split("\n").at(-1);
  return Object.freeze({ ready: false, problem: `Bubblewrap read-only-root isolation assay failed${detail ? `: ${detail}` : ""}` });
}

export function parseEnvironmentFile(path) {
  const environment = Object.create(null);
  for (const [lineNumber, original] of readFileSync(path, "utf8").split(/\r?\n/u).entries()) {
    const line = original.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=([^\s#]+)$/u);
    if (!match) throw new Error(`environment file has an unsafe or unsupported assignment at line ${lineNumber + 1}`);
    if (Object.hasOwn(environment, match[1])) throw new Error(`environment file repeats ${match[1]}`);
    environment[match[1]] = match[2];
  }
  return Object.freeze(environment);
}

function configuredKoiosSelector(environment) {
  const configured = KOIOS_SELECTOR_ENVIRONMENT.filter((name) => typeof environment?.[name] === "string" && environment[name] !== "");
  if (configured.length !== 1) return Object.freeze({ problem: `delivery environment must supply exactly one of ${KOIOS_SELECTOR_ENVIRONMENT.join(" or ")}` });
  return Object.freeze({ name: configured[0], path: environment[configured[0]] });
}

export function preflightKoiosTargetConfiguration(environment, at = new Date().toISOString()) {
  const target = inspectTarget(KOIOS_TARGET);
  if (target.problem) return Object.freeze({ ready: false, problem: `Koios target runtime is not admissible: ${target.problem}` });
  const admitted = Object.fromEntries(KOIOS_TARGET_ENVIRONMENT.flatMap((name) => typeof environment?.[name] === "string" ? [[name, environment[name]]] : []));
  let nodeExecutable;
  try { nodeExecutable = resolveColdRedGateNodeExecutable(); }
  catch (error) { return Object.freeze({ ready: false, problem: error instanceof Error ? error.message : String(error) }); }
  const result = spawnSync(nodeExecutable, [target.entry, "preflight", "--now", at], { cwd: target.packageRoot, encoding: "utf8", env: { PATH: process.env.PATH, NODE_PATH: process.env.NODE_PATH, NO_COLOR: "1", ...admitted } });
  let report; try { report = JSON.parse(result.stdout); } catch { report = null; }
  if (result.status !== 0 || report?.type !== "KoiosRoutineOperationPreflight" || report.ready !== true || !Array.isArray(report.effects) || report.effects.length !== 0) {
    const detail = result.stderr?.trim().split("\n").at(-1);
    return Object.freeze({ ready: false, problem: `Koios selected routine job is not presently admissible${detail ? `: ${detail}` : ""}` });
  }
  return Object.freeze({ ready: true, report: Object.freeze({ type: report.type, jobId: report.jobId, slug: report.slug, authorityScope: report.authorityScope, sourceSha256: report.sourceSha256, effects: Object.freeze([]) }), targetBinding: Object.freeze({ packageDigest: target.packageDigest, selectedBinDigest: target.selectedBinDigest, runtimeClosureDigest: target.runtimeClosureDigest }) });
}

export function preflight({ serviceRoot = DEFAULT_ROOT, environmentFile, home = homedir(), requireKoiosSchedule = false, structuralOnly = false, inspectSchedules = inspectAcceptedSchedules, inspectTargetRuntime = inspectTarget, preflightTargetConfiguration = preflightKoiosTargetConfiguration, assayIsolation = assayTargetIsolation } = {}) {
  const root = resolve(serviceRoot);
  const deployment = join(root, "content", "deployments", "cold-red-gate");
  const unitPath = join(deployment, "scheduled-activity-delivery-run-due.service");
  const timerPath = join(deployment, "scheduled-activity-delivery-run-due.timer");
  const problems = [];
  const check = (condition, problem) => { if (!condition) problems.push(problem); };
  check(isFile(join(root, "package.json")), "service package.json is absent or unsafe");
  check(isFile(join(root, "src", "service.mjs")), "service entrypoint is absent or unsafe");
  check(isFile(unitPath) && isFile(timerPath), "Cold Red Gate unit or timer is absent or unsafe");
  let unit = "", timer = "";
  if (isFile(unitPath)) unit = readFileSync(unitPath, "utf8");
  if (isFile(timerPath)) timer = readFileSync(timerPath, "utf8");
  check(unitValue(unit, "WorkingDirectory") === "%h/services/scheduled-activity-delivery-service", "unit WorkingDirectory is not the admitted Cold Red Gate service root");
  check(unitValue(unit, "EnvironmentFile") === "%h/.config/emsenn/scheduled-activity-delivery.env", "unit does not require the isolated delivery environment file");
  check(new RegExp(`^Environment=SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST=${KOIOS_TARGET_ENVIRONMENT.join(",")}$`, "mu").test(unit), "unit does not admit only the current Koios routine configuration names");
  check(new RegExp(`^Environment=SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST=${TARGET_WRITABLE_ROOT_ENVIRONMENT.join(",")}$`, "mu").test(unit), "unit does not admit only the fixed Koios writable-root configuration names");
  check(unitValue(unit, "ExecStart") === `${COLD_RED_GATE_NODE} src/service.mjs --operation run-due`, "unit does not bind run-due to the pinned Cold Red Gate Guix Node");
  check(unitValue(timer, "Unit") === "scheduled-activity-delivery-run-due.service", "timer does not target the admitted service unit");
  check(/^OnUnitActiveSec=15min$/mu.test(timer), "timer cadence is not the admitted fifteen-minute pulse");
  const isolation = assayIsolation();
  check(isolation?.ready === true, isolation?.problem ?? "Bubblewrap read-only-root isolation is not presently feasible");
  let nodeExecutable;
  try { nodeExecutable = resolveColdRedGateNodeExecutable(); }
  catch (error) { problems.push(error instanceof Error ? error.message : String(error)); }
  const packagePath = join(root, "package.json");
  if (isFile(packagePath) && nodeExecutable) {
    try {
      const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
      check(pkg?.bin?.["run-due"] === "./src/service.mjs", "package does not advertise run-due at the inspected service entrypoint");
      // Some dependencies intentionally export ESM only.  A CommonJS
      // require.resolve check would reject that healthy production closure, so
      // ask the same Node ESM resolver the service entrypoint uses instead.
      const dependencies = Object.keys(pkg.dependencies ?? {});
      const resolution = spawnSync(nodeExecutable, ["--input-type=module", "--eval", `for (const dependency of ${JSON.stringify(dependencies)}) import.meta.resolve(dependency);`], { cwd: root, encoding: "utf8" });
      if (resolution.status !== 0) {
        problems.push(`required dependency closure is not resolvable by Node ESM${resolution.stderr?.trim() ? `: ${resolution.stderr.trim().split("\n").at(-1)}` : ""}`);
      }
    } catch { problems.push("service package.json is invalid JSON"); }
  }
  const configPath = environmentFile ? resolve(environmentFile) : join(home, ".config", "emsenn", "scheduled-activity-delivery.env");
  let environment = Object.create(null);
  if (!structuralOnly) {
    check(isFile(configPath), "delivery environment file is absent or unsafe");
  }
  if (!structuralOnly && isFile(configPath)) {
    try {
      const mode = statSync(configPath).mode & 0o777;
      check((mode & 0o077) === 0, "delivery environment file is readable by group or other");
      environment = parseEnvironmentFile(configPath);
      for (const name of KOIOS_SHARED_TARGET_ENVIRONMENT) check(typeof environment[name] === "string", `delivery environment lacks ${name}`);
      const selector = configuredKoiosSelector(environment);
      if (selector.problem) problems.push(selector.problem);
      else {
        const label = selector.name === "KOIOS_NEWS_ROUTINE_PUBLICATION_JOB" ? "job-manifest file" : "queue directory";
        check(isAbsolute(selector.path), `Koios routine ${label} path is not absolute`);
        const expected = selector.name === "KOIOS_NEWS_ROUTINE_PUBLICATION_JOB" ? isFile : isDirectory;
        check(expected(selector.path), `Koios routine ${label} is absent or unsafe`);
        if (expected(selector.path)) {
          try { accessSync(selector.path, constants.R_OK | (selector.name === "KOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE" ? constants.X_OK : 0)); }
          catch { problems.push(`Koios routine ${label} is not readable${selector.name === "KOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE" ? " and searchable" : ""} by the service account`); }
        }
      }
      for (const [name, label] of [["KOIOS_NEWS_ROUTINE_PUBLICATION_AUTHORITY_KEYS", "authority-key map"], ["KOIOS_NEWS_ROUTINE_PUBLICATION_ASSESSMENT_KEYS", "assessment-key map"]]) {
        const keyMapPath = environment[name];
        check(isAbsolute(keyMapPath ?? ""), `Koios routine ${label} path is not absolute`);
        check(isFile(keyMapPath), `Koios routine ${label} file is absent or unsafe`);
        if (isFile(keyMapPath)) {
          try { accessSync(keyMapPath, constants.R_OK); } catch { problems.push(`Koios routine ${label} file is not readable by the service account`); }
        }
      }
      for (const [name, label, permissions] of [["KOIOS_NEWS_ROUTINE_PUBLICATION_BASELINE_ROOT", "baseline", constants.R_OK | constants.X_OK], ["KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT", "candidate", constants.R_OK | constants.W_OK | constants.X_OK], ["KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT", "replay", constants.R_OK | constants.W_OK | constants.X_OK]]) {
        const rootPath = environment[name];
        check(isAbsolute(rootPath ?? ""), `Koios routine ${label}-root path is not absolute`);
        check(isDirectory(rootPath), `Koios routine ${label}-root directory is absent or unsafe`);
        if (isDirectory(rootPath)) {
          try { accessSync(rootPath, permissions); } catch { problems.push(`Koios routine ${label}-root directory is not ${label === "baseline" ? "readable and searchable" : "readable, writable, and searchable"} by the service account`); }
          try { check(inside(join(home, ".local", "share", "emsenn", "koios-news"), realpathSync(rootPath)), `Koios routine ${label}-root is not strictly beneath the admitted Koios storage root`); }
          catch { problems.push(`Koios routine ${label}-root cannot be resolved safely`); }
        }
      }
    } catch (error) { problems.push(error instanceof Error ? error.message : String(error)); }
  }
  if (!structuralOnly && KOIOS_SHARED_TARGET_ENVIRONMENT.every((name) => typeof environment[name] === "string") && !configuredKoiosSelector(environment).problem) {
    const targetConfiguration = preflightTargetConfiguration(environment);
    check(targetConfiguration?.ready === true, targetConfiguration?.problem ?? "Koios selected routine job is not presently admissible");
  }
  let schedules = [];
  if (!structuralOnly) {
    try { schedules = inspectSchedules({ root }); }
    catch (error) { problems.push(`accepted schedules cannot be inspected: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const koiosSchedules = schedules.filter((schedule) => {
    if (schedule.executionMode !== "live"
      || schedule.deliveryCapabilityId !== KOIOS_CAPABILITY
      || schedule.target.packageRoot !== KOIOS_TARGET_ROOT
      || schedule.target.actor !== KOIOS_ACTOR
      || schedule.target.operation !== KOIOS_OPERATION
      || schedule.target.contract !== KOIOS_CONTRACT) return false;
    const current = inspectTargetRuntime(schedule.target), binding = schedule.targetBinding;
    return !current.problem && binding?.packageDigest === current.packageDigest
      && binding.selectedBinDigest === current.selectedBinDigest
      && binding.runtimeClosureDigest === current.runtimeClosureDigest;
  });
  if (!structuralOnly && requireKoiosSchedule) check(koiosSchedules.length > 0, "no accepted active Koios schedule permits enabling the timer");
  const activationProblems = structuralOnly
    ? Object.freeze(["structural-only preflight does not establish delivery environment or accepted Koios schedule authority"])
    : Object.freeze([
      ...(KOIOS_SHARED_TARGET_ENVIRONMENT.every((name) => typeof environment[name] === "string") && !configuredKoiosSelector(environment).problem ? [] : ["delivery environment does not supply the complete Koios target authority"]),
      ...(koiosSchedules.length > 0 ? [] : ["no accepted active Koios schedule permits enabling the timer"]),
      ...problems,
    ]);
  return Object.freeze({ ready: problems.length === 0, activationReady: activationProblems.length === 0, structuralOnly, serviceRoot: root, environmentFile: configPath, isolation: Object.freeze({ ready: isolation?.ready === true }), acceptedSchedules: schedules, acceptedKoiosSchedules: koiosSchedules, problems, activationProblems });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = preflight({ serviceRoot: option("--service-root", DEFAULT_ROOT), environmentFile: option("--environment-file"), requireKoiosSchedule: process.argv.includes("--require-koios-schedule"), structuralOnly: process.argv.includes("--structural-only") });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ready) process.exitCode = 2;
}
