import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assayTargetIsolation, preflight } from "../scripts/cold-red-gate-preflight.mjs";
import { resolveColdRedGateNodeExecutable, resolveTargetIsolationExecutables } from "../src/service.mjs";

const serviceRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Cold Red Gate's own pinned Guix Node closure is a real host capability of
 * that colony machine (and, when its Guix store item is retained, of any
 * host sharing the same channel pin). A generic CI runner has no such
 * closure. Tests that exercise it skip, naming the absent path, instead of
 * failing on an environment fact this repository cannot fabricate.
 * @returns {{available: boolean, reason?: string}}
 */
function coldRedGateNodeAvailability() {
  try { resolveColdRedGateNodeExecutable(); return { available: true }; }
  catch (error) { return { available: false, reason: error instanceof Error ? error.message : String(error) }; }
}
const KOIOS_SCHEDULE = Object.freeze({
  scheduleId: "urn:schedule:koios", customer: "urn:customer:koios",
  executionMode: "live",
  deliveryCapabilityId: "urn:capability:koios-news:cold-red-gate:routine-publication:v1",
  target: { packageRoot: "/home/emsenn/services/koios-news-runtime", actor: "https://bare-cedar-fog.561.group/actors/koios-news", operation: "koios-news-routine-operation", contract: "koios-news/routine-operation/v1" },
  firstDueAt: "2099-01-01T00:00:00.000Z", intervalSeconds: 900, maxDeliveries: null,
  targetBinding: { packageDigest: "ni:///sha-256;package", selectedBinDigest: "ni:///sha-256;bin", runtimeClosureDigest: "ni:///sha-256;closure" },
});
const inspectTargetRuntime = () => ({ packageDigest: "ni:///sha-256;package", selectedBinDigest: "ni:///sha-256;bin", runtimeClosureDigest: "ni:///sha-256;closure" });
const feasibleIsolationAssay = () => ({ ready: true });
const checkedPreflight = (options) => preflight({ inspectTargetRuntime, preflightTargetConfiguration: () => ({ ready: true }), assayIsolation: feasibleIsolationAssay, ...options });

function environmentFixture(values = {}, selector = "job") {
  // Windows-mounted temporary directories do not preserve POSIX mode bits.
  // The deployment preflight correctly requires 0600, so use Linux tmpfs.
  const fixtureRoot = join(homedir(), ".local", "share", "emsenn", "koios-news");
  mkdirSync(fixtureRoot, { recursive: true });
  const root = mkdtempSync(join(fixtureRoot, "scheduled-delivery-preflight-"));
  const manifest = join(root, "routine-job.json");
  const authorityKeys = join(root, "editorial-publication-keys.json");
  const assessmentKeys = join(root, "editorial-assessment-keys.json");
  const baselineRoot = join(root, "baseline");
  const candidateRoot = join(root, "candidates");
  const replayRoot = join(root, "replays");
  const queueRoot = join(root, "queue");
  const environment = join(root, "scheduled-activity-delivery.env");
  writeFileSync(manifest, "{}\n", { mode: 0o600 });
  writeFileSync(authorityKeys, "{}\n", { mode: 0o600 });
  writeFileSync(assessmentKeys, "{}\n", { mode: 0o600 });
  mkdirSync(baselineRoot);
  mkdirSync(candidateRoot);
  mkdirSync(replayRoot);
  mkdirSync(queueRoot);
  writeFileSync(environment, [
    selector === "job" ? `KOIOS_NEWS_ROUTINE_PUBLICATION_JOB=${manifest}` : `KOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE=${queueRoot}`,
    `KOIOS_NEWS_ROUTINE_PUBLICATION_AUTHORITY_KEYS=${authorityKeys}`,
    `KOIOS_NEWS_ROUTINE_PUBLICATION_ASSESSMENT_KEYS=${assessmentKeys}`,
    `KOIOS_NEWS_ROUTINE_PUBLICATION_BASELINE_ROOT=${baselineRoot}`,
    `KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT=${candidateRoot}`,
    `KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT=${replayRoot}`,
    ...Object.entries(values).map(([name, value]) => `${name}=${value}`),
  ].join("\n"), { mode: 0o600 });
  chmodSync(manifest, 0o600);
  chmodSync(authorityKeys, 0o600);
  chmodSync(assessmentKeys, 0o600);
  chmodSync(environment, 0o600);
  return { root, environment };
}

test("Cold Red Gate preflight proves its isolated Koios routine boundary and accepted schedule without delivery", (t) => {
  const nodeAvailability = coldRedGateNodeAvailability();
  if (!nodeAvailability.available) { t.skip(nodeAvailability.reason); return; }
  const fixture = environmentFixture();
  try {
    const result = checkedPreflight({ serviceRoot, environmentFile: fixture.environment, requireKoiosSchedule: true, inspectSchedules: () => [KOIOS_SCHEDULE] });
    assert.equal(result.ready, true, result.problems.join("\n"));
    assert.deepEqual(result.acceptedKoiosSchedules, [KOIOS_SCHEDULE]);
    assert.equal(JSON.stringify(result).includes("routine-job.json"), false, "preflight reports no target configuration path");
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("Cold Red Gate preflight passes the fixed baseline root to the selected Koios preflight", (t) => {
  const nodeAvailability = coldRedGateNodeAvailability();
  if (!nodeAvailability.available) { t.skip(nodeAvailability.reason); return; }
  const fixture = environmentFixture();
  try {
    let admitted;
    const result = preflight({ serviceRoot, environmentFile: fixture.environment, inspectSchedules: () => [], inspectTargetRuntime, assayIsolation: feasibleIsolationAssay, preflightTargetConfiguration: (environment) => {
      admitted = environment;
      return { ready: true };
    } });
    assert.equal(result.ready, true, result.problems.join("\n"));
    assert.equal(admitted.KOIOS_NEWS_ROUTINE_PUBLICATION_BASELINE_ROOT, join(fixture.root, "baseline"));
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("Cold Red Gate preflight admits a real queue directory as the one routine selector", (t) => {
  const nodeAvailability = coldRedGateNodeAvailability();
  if (!nodeAvailability.available) { t.skip(nodeAvailability.reason); return; }
  const fixture = environmentFixture({}, "queue");
  try {
    let admitted;
    const result = preflight({ serviceRoot, environmentFile: fixture.environment, inspectSchedules: () => [], inspectTargetRuntime, assayIsolation: feasibleIsolationAssay, preflightTargetConfiguration: (environment) => {
      admitted = environment;
      return { ready: true };
    } });
    assert.equal(result.ready, true, result.problems.join("\n"));
    assert.equal(typeof admitted.KOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE, "string");
    assert.equal(admitted.KOIOS_NEWS_ROUTINE_PUBLICATION_JOB, undefined);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("Cold Red Gate preflight rejects ambiguous routine selectors before target preflight", () => {
  const fixture = environmentFixture();
  try {
    const queueRoot = join(fixture.root, "queue");
    writeFileSync(fixture.environment, `${readFileSync(fixture.environment, "utf8")}\nKOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE=${queueRoot}\n`, { mode: 0o600 });
    let called = false;
    const result = preflight({ serviceRoot, environmentFile: fixture.environment, inspectSchedules: () => [], inspectTargetRuntime, assayIsolation: feasibleIsolationAssay, preflightTargetConfiguration: () => { called = true; return { ready: true }; } });
    assert.equal(result.ready, false);
    assert.equal(called, false);
    assert.ok(result.problems.some((problem) => /exactly one/u.test(problem)));
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("structural-only preflight installs no delivery authority and is never activation-ready", (t) => {
  const nodeAvailability = coldRedGateNodeAvailability();
  if (!nodeAvailability.available) { t.skip(nodeAvailability.reason); return; }
  const absentEnvironment = join(mkdtempSync("/var/tmp/scheduled-delivery-structural-"), "absent.env");
  try {
    const result = preflight({ serviceRoot, environmentFile: absentEnvironment, structuralOnly: true, inspectSchedules: () => { throw new Error("structural preflight must not inspect schedules"); }, assayIsolation: feasibleIsolationAssay });
    assert.equal(result.ready, true, result.problems.join("\n"));
    assert.equal(result.activationReady, false);
    assert.deepEqual(result.acceptedKoiosSchedules, []);
    assert.ok(result.activationProblems.includes("structural-only preflight does not establish delivery environment or accepted Koios schedule authority"));
  } finally { rmSync(dirname(absentEnvironment), { recursive: true, force: true }); }
});

test("structural-only preflight checks host isolation but does not inspect Koios authority", () => {
  const absentEnvironment = join(mkdtempSync("/var/tmp/scheduled-delivery-structural-isolation-"), "absent.env");
  try {
    let assayCalls = 0;
    const result = preflight({
      serviceRoot, environmentFile: absentEnvironment, structuralOnly: true,
      inspectSchedules: () => { throw new Error("structural preflight must not inspect schedules"); },
      preflightTargetConfiguration: () => { throw new Error("structural preflight must not inspect Koios"); },
      assayIsolation: () => { assayCalls += 1; return { ready: false, problem: "user namespace disabled" }; },
    });
    assert.equal(assayCalls, 1);
    assert.equal(result.ready, false);
    assert.equal(result.activationReady, false);
    assert.ok(result.problems.includes("user namespace disabled"));
  } finally { rmSync(dirname(absentEnvironment), { recursive: true, force: true }); }
});

test("isolation assay rejects a missing fixed executable before attempting a namespace", () => {
  let spawned = false;
  const result = assayTargetIsolation({
    timeout: "/definitely-absent/timeout", nice: "/definitely-absent/nice", bwrap: "/definitely-absent/bwrap",
  }, () => { spawned = true; });
  assert.equal(result.ready, false);
  assert.equal(spawned, false);
  assert.match(result.problem, /fixed isolation executable/u);
});

test("isolation assay uses the carrier's fixed Bubblewrap read-only-root shape", () => {
  let command, arguments_, options;
  const result = assayTargetIsolation(undefined, (receivedCommand, receivedArguments, receivedOptions) => {
    command = receivedCommand; arguments_ = receivedArguments; options = receivedOptions;
    return { status: 0, stderr: "" };
  });
  const fixed = resolveTargetIsolationExecutables();
  assert.equal(result.ready, true);
  assert.equal(command, fixed.timeout);
  assert.deepEqual(arguments_.slice(0, 9), ["--signal=TERM", "5s", fixed.nice, "-n", "10", fixed.bwrap, "--die-with-parent", "--new-session", "--unshare-user"]);
  assert.ok(arguments_.includes("--ro-bind"));
  assert.ok(arguments_.includes("--proc"));
  assert.ok(arguments_.includes("--dev"));
  assert.ok(arguments_.includes("--tmpfs"));
  assert.ok(arguments_.join(" ").includes("NoNewPrivs"));
  assert.equal(options.env.NODE_PATH, undefined);
});

test("full preflight fails safely when user/mount isolation feasibility is unavailable", () => {
  const fixture = environmentFixture();
  try {
    const result = checkedPreflight({
      serviceRoot, environmentFile: fixture.environment, inspectSchedules: () => [KOIOS_SCHEDULE],
      assayIsolation: () => ({ ready: false, problem: "Bubblewrap read-only-root isolation assay failed: operation not permitted" }),
    });
    assert.equal(result.ready, false);
    assert.equal(result.activationReady, false);
    assert.equal(result.isolation.ready, false);
    assert.ok(result.problems.some((problem) => /isolation assay failed/u.test(problem)));
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("Cold Red Gate preflight refuses enablement without an accepted active Koios schedule", () => {
  const fixture = environmentFixture();
  try {
    const result = checkedPreflight({ serviceRoot, environmentFile: fixture.environment, requireKoiosSchedule: true, inspectSchedules: () => [] });
    assert.equal(result.ready, false);
    assert.ok(result.problems.includes("no accepted active Koios schedule permits enabling the timer"));
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("Cold Red Gate preflight does not mistake an inexact Koios schedule for activation authority", () => {
  const fixture = environmentFixture();
  try {
    for (const schedule of [
      { ...KOIOS_SCHEDULE, executionMode: "dry-run" },
      { ...KOIOS_SCHEDULE, deliveryCapabilityId: "urn:capability:wrong" },
      { ...KOIOS_SCHEDULE, target: { ...KOIOS_SCHEDULE.target, operation: "receive-pulse" } },
      { ...KOIOS_SCHEDULE, target: { ...KOIOS_SCHEDULE.target, contract: "activitypub-services-section/signed-delivery/v1" } },
      { ...KOIOS_SCHEDULE, targetBinding: { ...KOIOS_SCHEDULE.targetBinding, runtimeClosureDigest: "ni:///sha-256;stale" } },
    ]) {
      const result = checkedPreflight({ serviceRoot, environmentFile: fixture.environment, requireKoiosSchedule: true, inspectSchedules: () => [schedule] });
      assert.equal(result.ready, false);
      assert.deepEqual(result.acceptedKoiosSchedules, []);
      assert.ok(result.problems.includes("no accepted active Koios schedule permits enabling the timer"));
    }
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("Cold Red Gate preflight refuses a configured but inadmissible queued Koios job", () => {
  const fixture = environmentFixture();
  try {
    const result = preflight({ serviceRoot, environmentFile: fixture.environment, inspectSchedules: () => [], inspectTargetRuntime, assayIsolation: feasibleIsolationAssay, preflightTargetConfiguration: () => ({ ready: false, problem: "Koios selected routine job is not presently admissible" }) });
    assert.equal(result.ready, false);
    assert.ok(result.problems.includes("Koios selected routine job is not presently admissible"));
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("the normal and staged installers never enable or start a schedule", async () => {
  const installer = await import("node:fs").then(({ readFileSync }) => readFileSync(new URL("../content/deployments/cold-red-gate/install-and-verify.sh", import.meta.url), "utf8"));
  assert.match(installer, /cold-red-gate-preflight\.mjs/u);
  assert.match(installer, /--staged/u);
  assert.match(installer, /--structural-only/u);
  assert.doesNotMatch(installer, /systemctl\s+--user\s+(?:enable|start)/u);
  assert.match(installer, /is-enabled\s+--quiet/u);
  assert.match(installer, /is-active\s+--quiet/u);
});

test("the staged installer installs and daemon-reloads without enabling or starting", (t) => {
  // The installer shells out to the pinned Cold Red Gate Guix Node itself
  // (content/deployments/cold-red-gate/install-and-verify.sh); it cannot run
  // where that colony's Guix store item is absent.
  const nodeAvailability = coldRedGateNodeAvailability();
  if (!nodeAvailability.available) { t.skip(nodeAvailability.reason); return; }
  const root = mkdtempSync("/var/tmp/scheduled-delivery-staged-");
  const commandRoot = join(root, "bin");
  const commandLog = join(root, "systemctl.log");
  mkdirSync(commandRoot);
  writeFileSync(join(commandRoot, "systemctl"), `#!/bin/sh\nprintf '%s\\n' "$*" >> '${commandLog}'\ncase "$2" in is-enabled|is-active) exit 1 ;; *) exit 0 ;; esac\n`, { mode: 0o755 });
  writeFileSync(join(commandRoot, "systemd-analyze"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  try {
    const result = spawnSync("sh", [join(serviceRoot, "content/deployments/cold-red-gate/install-and-verify.sh"), "--staged"], {
      cwd: serviceRoot,
      encoding: "utf8",
      env: { ...process.env, HOME: root, XDG_CONFIG_HOME: join(root, "config"), PATH: `${commandRoot}:${process.env.PATH}`, SCHEDULED_ACTIVITY_DELIVERY_SERVICE_ROOT: serviceRoot },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(root, "config/systemd/user/scheduled-activity-delivery-run-due.service")));
    assert.ok(existsSync(join(root, "config/systemd/user/scheduled-activity-delivery-run-due.timer")));
    const commands = readFileSync(commandLog, "utf8");
    assert.match(commands, /daemon-reload/u);
    assert.doesNotMatch(commands, /(?:^|\s)(?:enable|start)(?:\s|$)/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the staged installer refuses an active timer even when it is disabled", () => {
  const root = mkdtempSync("/var/tmp/scheduled-delivery-active-");
  const commandRoot = join(root, "bin");
  const commandLog = join(root, "systemctl.log");
  mkdirSync(commandRoot);
  writeFileSync(join(commandRoot, "systemctl"), `#!/bin/sh\nprintf '%s\\n' "$*" >> '${commandLog}'\ncase "$2" in is-enabled) exit 1 ;; is-active) exit 0 ;; *) exit 0 ;; esac\n`, { mode: 0o755 });
  try {
    const result = spawnSync("sh", [join(serviceRoot, "content/deployments/cold-red-gate/install-and-verify.sh"), "--staged"], {
      cwd: serviceRoot,
      encoding: "utf8",
      env: { ...process.env, HOME: root, XDG_CONFIG_HOME: join(root, "config"), PATH: `${commandRoot}:${process.env.PATH}`, SCHEDULED_ACTIVITY_DELIVERY_SERVICE_ROOT: serviceRoot },
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /refusing to replace an active scheduled-activity-delivery-run-due\.timer/u);
    assert.equal(existsSync(join(root, "config/systemd/user/scheduled-activity-delivery-run-due.timer")), false);
    assert.doesNotMatch(readFileSync(commandLog, "utf8"), /daemon-reload/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
