import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { materializeNodeRuntimeProviderCatalog, materializeTracedNodeRuntime } from "@red-cup-engineering/node-runtime-release-materialization-service";
import { admitControlCommand, resolvePrincipalSession } from "@red-cup-engineering/principal-office-seating-service";
import { buildAtomicSymlinkScript, buildFreshReleaseDirectoryScript, buildEnvEditScript, buildEnvironmentFileDirectiveEditScript, buildSystemdLifecycleNodeEntrypointsScript, buildWorkingDirectoryEditScript, buildWriteRemoteFileScript, renderReleaseUnitServiceText, renderReleaseUnitTimerText, releasePackageOnHost, RECEIPT_OBJECT_KIND, RECEIPT_CATEGORY } from "../scripts/release-package-on-host.mjs";

/** Reads back the exact receipt record persisted to `root` by a release, by id. */
function readPersistedReceipt(root, id) {
  const journal = createSemanticRecordJournal({ root, objectKind: RECEIPT_OBJECT_KIND });
  const [found] = journal.query({ category: RECEIPT_CATEGORY }).filter((row) => row.id === id);
  return found?.record;
}

const HOST = "cold-red-gate";
const PACKAGE = "@red-cup-engineering/news-property";
const VERSION = "0.1.3";
const UNIT = "newsroom-day.service";
const TIMER = "newsroom-day.timer";
const CURRENT_TARGET = "/home/emsenn/.local/share/561-group/releases/news-property/news-property-0.1.2";
const AUTHORITY_EVIDENCE = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

test("release staging retries preserve interrupted files and current release while creating an empty target", () => {
  const root = mkdtempSync(join(tmpdir(), "release-staging-retry-"));
  try {
    const current = join(root, "current");
    const old = join(root, "release-old");
    const target = join(root, "release-new");
    mkdirSync(old);
    writeFileSync(join(old, "healthy"), "running");
    symlinkSync(old, current);
    mkdirSync(join(target, "node_modules"), { recursive: true });
    writeFileSync(join(target, "node_modules", "partial"), "interrupted");
    const prepare = () => JSON.parse(execSync(buildFreshReleaseDirectoryScript(target, current), { encoding: "utf8" }));
    const first = prepare();
    assert.equal(readFileSync(join(first.archived, "node_modules", "partial"), "utf8"), "interrupted");
    assert.deepEqual(readdirSync(target), []);
    writeFileSync(join(target, "package-lock.json"), "second interruption");
    const second = prepare();
    assert.notEqual(second.archived, first.archived);
    assert.equal(readFileSync(join(second.archived, "package-lock.json"), "utf8"), "second interruption");
    assert.deepEqual(readdirSync(target), []);
    assert.equal(readlinkSync(current), old);
    assert.equal(readFileSync(join(old, "healthy"), "utf8"), "running");
    assert.throws(() => execSync(buildFreshReleaseDirectoryScript(old, current), { stdio: "pipe" }), /Command failed/);
    assert.throws(() => execSync(buildFreshReleaseDirectoryScript(target, current), { cwd: target, stdio: "pipe" }), /Command failed/);
    assert.equal(readlinkSync(current), old);
    assert.equal(readFileSync(join(old, "healthy"), "utf8"), "running");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function freeMOutput(availableMb) {
  return [
    "              total        used        free      shared  buff/cache   available",
    `Mem:           1640        1185         186           0         439         ${availableMb}`,
    "Swap:             0           0           0",
  ].join("\n");
}

function rootAvailableBytesOutput(availableBytes) {
  return `Avail\n${availableBytes}\n`;
}

function showOutput(result) {
  return [
    `Result=${result}`,
    `ActiveState=${result === "success" ? "inactive" : "failed"}`,
    `SubState=${result === "success" ? "dead" : "failed"}`,
    "ExecMainCode=1",
    "ExecMainStatus=0",
  ].join("\n");
}

function journalOutput() {
  const readout = { stage: "analyze", storiesProjected: 7 };
  return `-- Journal begins --\nSep 04 02:06:19 cold-red-gate node[1]: ${JSON.stringify(readout)}\n-- Journal ends --`;
}

/**
 * Builds a fake `run` that answers every command this script issues and
 * records the exact sequence of ssh invocations for order assertions.
 */
function fakeRun({ registryVersion = VERSION, unitResult = "success", calls = [], probeOutputs = [], currentTarget = CURRENT_TARGET, loadStates = {}, lifecycleEntries = ["scripts/serve.mjs"], unitDigest = null, rootAvailableBytes = 8 * 1024 * 1024 * 1024 } = {}) {
  let probeCallIndex = 0;
  return function run(command, args) {
    calls.push({ command, args: [...args] });
    const script = args.at(-1) ?? "";
    if (script === "df -B1 --output=avail /") return rootAvailableBytesOutput(rootAvailableBytes);
    if (script === "free -m") return freeMOutput(455);
    if (script.startsWith("readlink")) return `${currentTarget}\n`;
    if (script.includes("createHash('sha256')")) return `${unitDigest ?? ""}\n`;
    if (script.includes("systemd-lifecycle-node-entrypoints")) return JSON.stringify({ type: "SystemdLifecycleNodeEntrypoints", version: 1, entries: lifecycleEntries });
    if (script.startsWith("npm view")) return `${registryVersion}\n`;
    if (script.includes("LOCKFILE")) return "LOCKFILE 264 264\nENTRY ok\n";
    if (script.startsWith("systemctl --user show -p LoadState")) {
      const [, unitName] = /systemctl --user show -p LoadState (\S+)/u.exec(script) ?? [];
      return `LoadState=${loadStates[unitName] ?? "loaded"}\n`;
    }
    if (script === "echo $HOME") return "/home/emsenn\n";
    if (script.includes("curl")) {
      const output = probeOutputs[probeCallIndex] ?? "PROBE ok 200 3 active=1 1:200";
      probeCallIndex += 1;
      return output;
    }
    if (script.startsWith("systemctl --user show")) return showOutput(unitResult);
    if (script.startsWith("journalctl")) return journalOutput();
    if (script.startsWith("systemctl --user list-timers")) return "NEXT ... (1 timers listed)\n";
    return "";
  };
}

test("releasePackageOnHost refuses before any staging or registry operation when root disk headroom is below the release floor", () => {
  const calls = [];
  const run = fakeRun({ calls, rootAvailableBytes: 5 * 1024 * 1024 * 1024 - 1 });
  const result = releasePackageOnHost({ ...baseOptions(), run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "disk-capacity-gate");
  assert.deepEqual(calls.map(({ args }) => args.at(-1)), ["df -B1 --output=avail /", "free -m"]);
});

test("releasePackageOnHost refuses an absent ControlCommandAdmission before any registry or staging operation", () => {
  const calls = [];
  const result = releasePackageOnHost({ ...baseOptions({ controlCommand: undefined }), run: fakeRun({ calls }) });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "release-admission");
  assert.ok(result.refusals[0].evidence.reasons.some(({ code }) => code === "control-command-not-admitted"));
  assert.deepEqual(calls.map(({ args }) => args.at(-1)), ["df -B1 --output=avail /", "free -m"]);
});

function baseOptions(overrides = {}) {
  const machine = { type: "ReleaseMachineBinding", version: 1, machineIdentity: "machine:cold-red-gate", observationEvidenceIdentity: AUTHORITY_EVIDENCE, observedAt: "2026-01-01T00:00:00Z", validUntil: "2100-01-01T00:00:00Z", allowedEffects: ["release"], runtimeEndpoint: { type: "RuntimeEndpoint", version: 1, transport: "ssh", address: HOST } };
  const binding = { providerIdentity: "provider:fixture", accountIdentity: "account:fixture", windowIdentity: "window:fixture", evidenceIdentity: "evidence:fixture", observedAt: "2026-01-01T00:00:00Z", validFrom: "2026-01-01T00:00:00Z", validUntil: "2100-01-01T00:00:00Z", resetsAt: "2100-01-01T00:00:00Z", availableResources: [{ resource: "release", unit: "operation", amount: { numerator: "1", denominator: "1" } }], financialControl: { type: "WorkResourceFinancialControl", costState: "observed", costEvidenceIdentity: "evidence:cost", costObservedAt: "2026-01-01T00:00:00Z", costValidUntil: "2100-01-01T00:00:00Z", consideration: [{ kind: "currency", asset: "urn:currency:usd", unit: "cent", amount: { numerator: "0", denominator: "1" } }], billing: { status: "not-required" }, meterEvidenceIdentity: "evidence:meter", meterObservedAt: "2026-01-01T00:00:00Z", meterValidUntil: "2100-01-01T00:00:00Z" } };
  const reservationReceipt = { type: "WorkResourceReservationResult", disposition: "attempted", providerIdentity: binding.providerIdentity, accountIdentity: binding.accountIdentity, windowIdentity: binding.windowIdentity, reservationIdentity: "reservation:fixture" };
  return { host: HOST, packageName: PACKAGE, version: VERSION, unit: UNIT, timer: TIMER, machine, resourceControl: { type: "WorkResourceControlEvaluation", disposition: "admitted", binding }, reservationReceipt, controlCommand: admittedControlCommand(machine, binding, reservationReceipt), ...overrides };
}

function admittedControlCommand(machine, binding, reservationReceipt) {
  const authentication = { principal: { issuer: "https://accounts.example", subject: "founder" }, evidence: AUTHORITY_EVIDENCE, audience: "https://ops.561.group", authenticatedAt: "2026-01-01T00:00:00Z", expiresAt: "2100-01-01T00:00:00Z" };
  const session = resolvePrincipalSession({ authentication, actor: "actor:test", seating: "chief-technology-officer", audience: authentication.audience, now: "2026-01-01T00:00:00Z", delegations: [{ id: "delegation", evidence: AUTHORITY_EVIDENCE, principal: authentication.principal, actor: "actor:test", audience: authentication.audience, recognition: true, induction: true, notBefore: "2026-01-01T00:00:00Z" }], seatings: [{ id: "chief-technology-officer", evidence: AUTHORITY_EVIDENCE, actor: "actor:test", character: "test", office: "chief-technology-officer", incumbency: "test-incumbency", recognition: true, induction: true, notBefore: "2026-01-01T00:00:00Z" }] });
  assert.equal(session.ok, true);
  if (!session.ok) throw new Error("test session unresolved");
  return admitControlCommand({ session: session.session, now: "2026-01-01T00:00:00Z", dutyAuthorizations: [{ id: "release-duty", evidence: AUTHORITY_EVIDENCE, actor: "actor:test", office: "chief-technology-officer", duty: "direct-technology-delivery", capabilities: ["release-admission"], allowedEffects: ["release"], recognition: true, induction: true, notBefore: "2026-01-01T00:00:00Z", expiresAt: "2100-01-01T00:00:00Z" }], command: { type: "ControlCommand", version: 1, identity: "command:release", actor: "actor:test", office: "chief-technology-officer", duty: "direct-technology-delivery", requiredCapabilities: ["release-admission"], effect: "release", message: { type: "ControlMessage", version: 1, identity: "message:release", evidence: AUTHORITY_EVIDENCE, channelIdentity: "channel:release" }, channel: { type: "RuntimeChannel", version: 1, identity: "channel:release", evidence: AUTHORITY_EVIDENCE, audience: authentication.audience }, machine: { type: "MachineBinding", version: 1, machineIdentity: machine.machineIdentity, observationEvidenceIdentity: machine.observationEvidenceIdentity, observedAt: machine.observedAt, validUntil: machine.validUntil, allowedEffects: machine.allowedEffects }, runtimeEndpoint: machine.runtimeEndpoint, resourceReservation: { providerIdentity: binding.providerIdentity, accountIdentity: binding.accountIdentity, windowIdentity: binding.windowIdentity, reservationIdentity: reservationReceipt.reservationIdentity } } });
}

async function prebuiltRuntimeFixture(entries = ["scripts/serve.mjs"]) {
  const root = mkdtempSync(join(tmpdir(), "prebuilt-runtime-release-"));
  const source = join(root, "source");
  const runtime = join(root, "runtime");
  mkdirSync(join(source, "scripts"), { recursive: true });
  writeFileSync(join(source, "package.json"), JSON.stringify({ name: PACKAGE, version: VERSION, type: "module" }));
  for (const entry of entries) {
    writeFileSync(join(source, entry), entry === "scripts/serve.mjs"
      ? "import { createServer } from 'node:http';\nexport const server = createServer();\n"
      : "export const preflight = true;\n");
  }
  await materializeTracedNodeRuntime({ base: source, output: runtime, entrypoints: entries });
  return { root, runtime };
}

function tarHeader(path, bytes, mode = 0o644) {
  const header = Buffer.alloc(512);
  header.write(path, 0, 100, "utf8");
  const octal = (value, offset, length) => header.write(`${value.toString(8).padStart(length - 1, "0")}\0`, offset, length, "ascii");
  octal(mode, 100, 8); octal(0, 108, 8); octal(0, 116, 8); octal(bytes.length, 124, 12); octal(0, 136, 12);
  header.fill(0x20, 148, 156);
  header[156] = 0x30;
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return header;
}

function npmTarball(root, filename, files) {
  const carriers = [];
  for (const [path, contents] of Object.entries(files).sort(([left], [right]) => left.localeCompare(right))) {
    const bytes = Buffer.from(contents);
    carriers.push(tarHeader(path, bytes), bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512));
  }
  carriers.push(Buffer.alloc(1024));
  const bytes = gzipSync(Buffer.concat(carriers), { level: 9, mtime: 0 });
  const path = join(root, filename);
  writeFileSync(path, bytes);
  return { path, integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}` };
}

async function materializedRuntimeFixture(entries = ["dist/serve.mjs"]) {
  const root = mkdtempSync(join(tmpdir(), "materialized-runtime-release-"));
  const tarball = npmTarball(root, "app.tgz", {
    "package/package.json": JSON.stringify({ name: PACKAGE, version: VERSION, type: "module" }),
    ...Object.fromEntries(entries.map((entry) => [`package/${entry}`, "export const started = true;\n"])),
  });
  const node = { location: "", name: PACKAGE, version: VERSION, authorityKind: "test-tarball", integrity: tarball.integrity, tarballPath: tarball.path, edges: {} };
  const catalog = await materializeNodeRuntimeProviderCatalog({
    type: "NodeRuntimeProviderCatalog",
    version: 1,
    entries: [{ id: "gateway", name: PACKAGE, version: VERSION }],
    admissions: { gateway: { nodes: { "": node } } },
  }, join(root, "output"), { dependencyExportPolicy: "runtime-imports", runtimeEntrypoints: entries });
  return { root, runtime: resolve(catalog.catalogDirectory, catalog.entries[0].releaseRelativePath) };
}

function prebuiltRun({ calls, ...options } = {}) {
  const remote = fakeRun({ calls, ...options });
  return (command, args) => {
    if (command === process.execPath) return execFileSync(command, args, { encoding: "utf8" });
    if (command === "rsync") {
      calls.push({ command, args: [...args] });
      return "";
    }
    return remote(command, args);
  };
}

function unitFileFixture(root, content = "[Service]\nType=notify\nExecStart=/usr/bin/env node %h/.local/share/561-group/releases/ops-gateway/current/scripts/serve.mjs\n") {
  const file = join(root, "reviewed.service");
  writeFileSync(file, content);
  return { file, previousDigest: createHash("sha256").update("[Service]\nType=simple\n").digest("hex") };
}

test("releasePackageOnHost: plan mode happy path returns a plan with no host mutation", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), run });
  assert.equal(result.outcome, "planned");
  assert.equal(result.plan.toVersion, VERSION);
  assert.equal(result.plan.fromVersion, "0.1.2");
  assert.equal(result.plan.plannedSteps.length, 9);
  assert.ok(!calls.some((call) => call.args.some((arg) => typeof arg === "string" && arg.includes("mkdir"))), "plan mode issues no mkdir");
});

test("releasePackageOnHost: verified prebuilt runtime stages by digest and checks exact rsync bytes before promotion", async () => {
  const { root, runtime } = await prebuiltRuntimeFixture();
  try {
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtime,
      apply: true,
      dataRoot: join(root, "receipts"),
      recordedAt: "2026-09-07T12:00:00.000Z",
      run: prebuiltRun({ calls }),
    });
    assert.equal(result.outcome, "released", JSON.stringify(result.refusals));
    const lot = readPersistedReceipt(join(root, "receipts"), result.receipt.id).lots[0];
    assert.match(lot.prebuiltRuntime.artifactDigest, /^[a-f0-9]{64}$/u);
    assert.match(lot.releaseDirectory, new RegExp(`${VERSION}-${lot.prebuiltRuntime.artifactDigest}$`, "u"));
    assert.match(lot.installMethod, /rsync --checksum/u);

    const npmScripts = calls.filter(({ command, args }) => command === "ssh" && args.at(-1).includes("npm pack"));
    assert.equal(npmScripts.length, 0, "a verified portable runtime never reconstructs node_modules with npm");
    const registryScripts = calls.filter(({ command, args }) => command === "ssh" && args.at(-1).startsWith("npm view"));
    assert.equal(registryScripts.length, 0, "the lock/registry gate belongs only to npm-built releases");
    const rsyncCalls = calls.filter(({ command }) => command === "rsync");
    assert.equal(rsyncCalls.length, 2);
    assert.ok(!rsyncCalls[0].args.includes("--delete"), "copy never deletes outside fresh staging");
    assert.deepEqual(rsyncCalls[1].args.slice(0, 5), ["-a", "--checksum", "--dry-run", "--itemize-changes", "--delete"]);
    assert.ok(rsyncCalls[0].args.at(-1).endsWith(`ops-gateway-${VERSION}-${lot.prebuiltRuntime.artifactDigest}/`));
    assert.ok(calls.some(({ command, args }) => command === "ssh" && args.at(-1) === `cd ~/.local/share/561-group/releases/ops-gateway/ops-gateway-${VERSION}-${lot.prebuiltRuntime.artifactDigest} && node --check scripts/serve.mjs`));
    assert.ok(!calls.some(({ command, args }) => command === "ssh" && args.at(-1).startsWith("journalctl")), "prebuilt gateway releases never capture a credential-bearing journal");
    const stagingIndex = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1).startsWith("node -e"));
    const transferIndex = calls.findIndex(({ command }) => command === "rsync");
    const flipIndex = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current"));
    assert.ok(stagingIndex < transferIndex && transferIndex < flipIndex, "staging and exact transport verification settle before pointer promotion");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: canonical materialized runtime stages its whole artifact and points current at app", async () => {
  const runtimeFixture = await materializedRuntimeFixture();
  try {
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "dist/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      apply: true,
      dataRoot: join(runtimeFixture.root, "receipts"),
      recordedAt: "2026-09-07T12:00:00.000Z",
      run: prebuiltRun({ calls, lifecycleEntries: ["dist/serve.mjs"] }),
    });
    assert.equal(result.outcome, "released", JSON.stringify(result.refusals));
    const lot = readPersistedReceipt(join(runtimeFixture.root, "receipts"), result.receipt.id).lots[0];
    assert.equal(lot.prebuiltRuntime.runtimeRoot, "app");
    assert.ok(lot.releaseDirectory.endsWith(`ops-gateway-${VERSION}-${lot.prebuiltRuntime.artifactDigest}`));
    assert.ok(lot.currentSymlinkFlipped.endsWith("/app"));
    const rsync = calls.find(({ command }) => command === "rsync");
    assert.equal(rsync.args.at(-1), `cold-red-gate:${lot.releaseDirectory}/`, "the entire verified artifact, including receipt, is transferred");
    assert.ok(calls.some(({ command, args }) => command === "ssh" && args.at(-1) === `cd ${lot.releaseDirectory}/app && node --check dist/serve.mjs`));
    assert.ok(calls.some(({ command, args }) => command === "ssh" && args.at(-1).includes(`${lot.releaseDirectory}/app`) && args.at(-1).endsWith("/current")), "current points into the artifact's app root");
  } finally {
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: canonical materialized runtime rolls current back to the exact prior app root", async () => {
  const runtimeFixture = await materializedRuntimeFixture();
  try {
    const calls = [];
    const priorRuntime = "/home/emsenn/.local/share/561-group/releases/ops-gateway/ops-gateway-0.1.2-old/app";
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "dist/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      apply: true,
      run: prebuiltRun({ calls, lifecycleEntries: ["dist/serve.mjs"], currentTarget: priorRuntime, unitResult: "exit-code" }),
    });
    assert.equal(result.outcome, "refused");
    const currentUpdates = calls
      .filter(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current"))
      .map(({ args }) => args.at(-1));
    assert.equal(currentUpdates.length, 2, "the candidate and its rollback each use an atomic current replacement");
    assert.match(currentUpdates[1], new RegExp(`ln -s ${priorRuntime.replace(/[/.]/gu, "\\$&")} `));
  } finally {
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: reviewed unit transition is explicit in a no-effect plan", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-reviewed-unit-"));
  const runtimeFixture = await prebuiltRuntimeFixture();
  try {
    const { file, previousDigest } = unitFileFixture(root);
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      unitFile: file,
      unitFileCurrentDigest: previousDigest,
      run: prebuiltRun({ calls: [], unitDigest: previousDigest }),
    });
    assert.equal(result.outcome, "planned", JSON.stringify(result.refusals));
    assert.equal(result.plan.unitEdit.source, file);
    assert.equal(result.plan.unitEdit.expectedCurrentDigest, previousDigest);
    assert.ok(result.plan.plannedSteps.some((step) => step.includes("systemd-analyze --user verify")));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: new unit lifecycle entries are admitted before pointer promotion", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-reviewed-unit-"));
  const runtimeFixture = await prebuiltRuntimeFixture(["scripts/preflight.mjs", "scripts/serve.mjs"]);
  try {
    const { file, previousDigest } = unitFileFixture(root);
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      unitFile: file,
      unitFileCurrentDigest: previousDigest,
      apply: true,
      dataRoot: join(root, "receipts"),
      recordedAt: "2026-09-07T12:00:00.000Z",
      run: prebuiltRun({ calls, unitDigest: previousDigest, lifecycleEntries: ["scripts/preflight.mjs", "scripts/serve.mjs"] }),
    });
    assert.equal(result.outcome, "released", JSON.stringify(result.refusals));
    const unitWrite = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1).includes("writeFileSync"));
    const unitCheck = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1).startsWith("systemd-analyze --user verify"));
    const currentFlip = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current"));
    assert.ok(unitWrite >= 0 && unitCheck > unitWrite && currentFlip > unitCheck);
    assert.ok(calls.some(({ command, args }) => command === "ssh" && args.at(-1).endsWith("node --check scripts/preflight.mjs")));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: missing new unit entry restores the old unit before any promotion", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-reviewed-unit-"));
  const runtimeFixture = await prebuiltRuntimeFixture(["scripts/serve.mjs"]);
  try {
    const { file, previousDigest } = unitFileFixture(root);
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      unitFile: file,
      unitFileCurrentDigest: previousDigest,
      apply: true,
      dataRoot: join(root, "receipts"),
      run: prebuiltRun({ calls, unitDigest: previousDigest, lifecycleEntries: ["scripts/preflight.mjs", "scripts/serve.mjs"] }),
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-file-lifecycle");
    const unitWrite = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1).includes("fs.renameSync"));
    const unitRestore = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1) === `cp -p ~/.config/systemd/user/${UNIT}.previous ~/.config/systemd/user/${UNIT}`);
    assert.ok(unitRestore > unitWrite, "the prior reviewed unit is restored after candidate lifecycle refusal");
    assert.ok(!calls.some(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current")));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: a changed remote unit refuses before runtime staging", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-reviewed-unit-"));
  const runtimeFixture = await prebuiltRuntimeFixture();
  try {
    const { file, previousDigest } = unitFileFixture(root);
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      unitFile: file,
      unitFileCurrentDigest: previousDigest,
      apply: true,
      run: prebuiltRun({ calls, unitDigest: "a".repeat(64) }),
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-file-current-digest");
    assert.equal(calls.filter(({ command }) => command === "rsync").length, 0, "no runtime staging follows an unexpected remote unit");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: reviewed complete unit bytes refuse partial directive rewrites", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-reviewed-unit-"));
  const runtimeFixture = await prebuiltRuntimeFixture();
  try {
    const { file, previousDigest } = unitFileFixture(root);
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      unitFile: file,
      unitFileCurrentDigest: previousDigest,
      repointUnitWorkingDirectory: true,
      run: prebuiltRun({ calls, unitDigest: previousDigest }),
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-file-directive");
    assert.equal(calls.filter(({ command }) => command === "ssh" || command === "rsync").length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: a remote unit changed during staging restores no bytes and does not promote", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-reviewed-unit-"));
  const runtimeFixture = await prebuiltRuntimeFixture();
  try {
    const { file, previousDigest } = unitFileFixture(root);
    const calls = [];
    const base = prebuiltRun({ calls, unitDigest: previousDigest });
    let digestReads = 0;
    const run = (command, args) => {
      if (command === "ssh" && (args.at(-1) ?? "").includes("createHash('sha256')")) {
        digestReads += 1;
        calls.push({ command, args: [...args] });
        return `${digestReads === 1 ? previousDigest : "b".repeat(64)}\n`;
      }
      return base(command, args);
    };
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      unitFile: file,
      unitFileCurrentDigest: previousDigest,
      apply: true,
      run,
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-file-current-digest");
    assert.equal(digestReads, 2, "the remote bytes are rechecked immediately before replacement");
    assert.ok(!calls.some(({ command, args }) => command === "ssh" && args.at(-1).includes("fs.renameSync")), "no candidate unit overwrites a concurrently changed unit");
    assert.ok(!calls.some(({ command, args }) => command === "ssh" && args.at(-1) === `cp -p ~/.config/systemd/user/${UNIT}.previous ~/.config/systemd/user/${UNIT}`), "a concurrent change is never overwritten with a stale backup");
    assert.ok(!calls.some(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current")));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: a failed candidate start restores the old unit before rollback restart", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-reviewed-unit-"));
  const runtimeFixture = await prebuiltRuntimeFixture();
  try {
    const { file, previousDigest } = unitFileFixture(root);
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs", releaseName: "ops-gateway" }),
      prebuiltRuntimeDirectory: runtimeFixture.runtime,
      unitFile: file,
      unitFileCurrentDigest: previousDigest,
      apply: true,
      dataRoot: join(root, "receipts"),
      recordedAt: "2026-09-07T12:00:00.000Z",
      run: prebuiltRun({ calls, unitDigest: previousDigest, unitResult: "exit-code" }),
    });
    assert.equal(result.outcome, "refused");
    const unitRestore = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1) === `cp -p ~/.config/systemd/user/${UNIT}.previous ~/.config/systemd/user/${UNIT}`);
    const restart = calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1) === `systemctl --user restart ${UNIT}`);
    assert.ok(unitRestore >= 0 && restart > unitRestore, "the old unit is restored and reloaded before its rollback restart");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(runtimeFixture.root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: altered prebuilt runtime refuses before any host staging", async () => {
  const { root, runtime } = await prebuiltRuntimeFixture();
  try {
    writeFileSync(join(runtime, "scripts", "serve.mjs"), "export const changed = true;\n");
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs" }),
      prebuiltRuntimeDirectory: runtime,
      run: prebuiltRun({ calls }),
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "prebuilt-runtime-verify");
    assert.equal(calls.filter(({ command }) => command === "ssh" || command === "rsync").length, 0, "no remote effect follows local receipt failure");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: an old runtime missing a D-Bus-observed preflight entry refuses before staging", async () => {
  const { root, runtime } = await prebuiltRuntimeFixture(["scripts/serve.mjs"]);
  try {
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs" }),
      prebuiltRuntimeDirectory: runtime,
      run: prebuiltRun({ calls, lifecycleEntries: ["scripts/preflight.mjs", "scripts/serve.mjs"] }),
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "prebuilt-runtime-lifecycle-entry");
    assert.deepEqual(result.refusals[0].evidence, { missing: ["scripts/preflight.mjs"] });
    assert.ok(!calls.some(({ command, args }) => command === "ssh" && args.at(-1).startsWith("node -e") && !args.at(-1).includes("systemd-lifecycle-node-entrypoints")), "the incomplete runtime is refused before staging preparation");
    assert.equal(calls.filter(({ command }) => command === "rsync").length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: a runtime admitting every D-Bus lifecycle entry syntax-checks each before promotion", async () => {
  const entries = ["scripts/preflight.mjs", "scripts/serve.mjs"];
  const { root, runtime } = await prebuiltRuntimeFixture(entries);
  try {
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs" }),
      prebuiltRuntimeDirectory: runtime,
      apply: true,
      dataRoot: join(root, "receipts"),
      recordedAt: "2026-09-07T12:00:00.000Z",
      run: prebuiltRun({ calls, lifecycleEntries: entries }),
    });
    assert.equal(result.outcome, "released", JSON.stringify(result.refusals));
    const remoteChecks = calls
      .filter(({ command, args }) => command === "ssh" && args.at(-1).startsWith("cd ") && args.at(-1).includes("node --check"))
      .map(({ args }) => args.at(-1));
    assert.equal(remoteChecks.length, 2);
    assert.ok(remoteChecks.some((script) => script.endsWith("node --check scripts/preflight.mjs")));
    assert.ok(remoteChecks.some((script) => script.endsWith("node --check scripts/serve.mjs")));
    assert.ok(remoteChecks.every((script) => calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1) === script) < calls.findIndex(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current"))), "all lifecycle entries settle before current changes");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: prebuilt rsync difference refuses before current is promoted", async () => {
  const { root, runtime } = await prebuiltRuntimeFixture();
  try {
    const calls = [];
    const base = prebuiltRun({ calls });
    let rsyncCalls = 0;
    const run = (command, args) => {
      if (command === "rsync" && ++rsyncCalls === 2) {
        calls.push({ command, args: [...args] });
        return ">f+++++++++ unexpected-carrier\n";
      }
      return base(command, args);
    };
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs" }),
      prebuiltRuntimeDirectory: runtime,
      apply: true,
      run,
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "prebuilt-runtime-transfer");
    assert.ok(!calls.some(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current")), "a mismatched staging tree never flips current");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: failed prebuilt runtime atomically restores current before restart", async () => {
  const { root, runtime } = await prebuiltRuntimeFixture();
  try {
    const calls = [];
    const result = releasePackageOnHost({
      ...baseOptions({ entry: "scripts/serve.mjs" }),
      prebuiltRuntimeDirectory: runtime,
      apply: true,
      dataRoot: join(root, "receipts"),
      recordedAt: "2026-09-07T12:00:00.000Z",
      run: prebuiltRun({ calls, unitResult: "exit-code" }),
    });
    assert.equal(result.outcome, "refused");
    const atomicCurrentUpdates = calls
      .filter(({ command, args }) => command === "ssh" && args.at(-1).includes("mv -Tf") && args.at(-1).endsWith("/current"))
      .map(({ args }) => args.at(-1));
    assert.equal(atomicCurrentUpdates.length, 2, "promotion and rollback each rename a completed temporary link into current");
    assert.match(atomicCurrentUpdates[0], /\.next ~\/\.local\/share/u);
    assert.match(atomicCurrentUpdates[1], /-rollback\.[0-9a-f-]+\.next ~\/\.local\/share\/561-group\/releases\/news-property\/current/u);
    assert.ok(calls.some(({ command, args }) => command === "ssh" && args.at(-1) === `systemctl --user restart ${UNIT}`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildAtomicSymlinkScript: each promotion uses a fresh temporary link and never deletes a prior interrupted carrier", () => {
  const first = buildAtomicSymlinkScript("/releases/current", "/releases/candidate", "a".repeat(64));
  const second = buildAtomicSymlinkScript("/releases/current", "/releases/candidate", "a".repeat(64));
  assert.notEqual(first, second);
  assert.match(first, /ln -s \/releases\/candidate \/releases\/current\.a{64}\.[0-9a-f-]+\.next && mv -Tf/u);
  assert.ok(!first.includes("rm "), "an interrupted temporary link remains for diagnosis and cannot be deleted by a retry");
});

test("buildSystemdLifecycleNodeEntrypointsScript: typed D-Bus tuples yield only direct relative Node entries", () => {
  const root = mkdtempSync(join(tmpdir(), "systemd-lifecycle-busctl-"));
  try {
    const stub = join(root, "busctl");
    writeFileSync(stub, `#!/bin/sh
case "$*" in
  *GetUnit*) printf '%s\\n' '{"type":"o","data":["/org/freedesktop/systemd1/unit/example"]}' ;;
  *get-property*)
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[["/usr/bin/install",["/usr/bin/install","-d","/state"],false,0,0,0,0,0,0,0],["/usr/bin/env",["/usr/bin/env","node","scripts/preflight.mjs","--probe"],false,0,0,0,0,0,0,0]]}'
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[["/usr/bin/env",["/usr/bin/env","node","scripts/serve.mjs"],false,0,0,0,0,0,0,0]]}'
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[]}'
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[]}'
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[]}'
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[]}'
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[]}' ;;
esac
`);
    chmodSync(stub, 0o755);
    const output = execFileSync("bash", ["-c", buildSystemdLifecycleNodeEntrypointsScript("example.service")], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
    });
    assert.deepEqual(JSON.parse(output), { type: "SystemdLifecycleNodeEntrypoints", version: 1, entries: ["scripts/preflight.mjs", "scripts/serve.mjs"] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildSystemdLifecycleNodeEntrypointsScript: unsupported Node flags refuse instead of being reported as covered", () => {
  const root = mkdtempSync(join(tmpdir(), "systemd-lifecycle-busctl-"));
  try {
    const stub = join(root, "busctl");
    writeFileSync(stub, `#!/bin/sh
case "$*" in
  *GetUnit*) printf '%s\\n' '{"type":"o","data":["/org/freedesktop/systemd1/unit/example"]}' ;;
  *get-property*)
    printf '%s\\n' '{"type":"a(sasbttttuii)","data":[["/usr/bin/env",["/usr/bin/env","node","--inspect","scripts/serve.mjs"],false,0,0,0,0,0,0,0]]}'
    for n in 1 2 3 4 5 6; do printf '%s\\n' '{"type":"a(sasbttttuii)","data":[]}'; done ;;
esac
`);
    chmodSync(stub, 0o755);
    assert.throws(() => execFileSync("bash", ["-c", buildSystemdLifecycleNodeEntrypointsScript("example.service")], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
      stdio: "pipe",
    }), /systemd lifecycle command observation is unsupported/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: refuses below the memory floor", () => {
  const run = (command, args) => {
    const script = args.at(-1) ?? "";
    if (script === "df -B1 --output=avail /") return rootAvailableBytesOutput(8 * 1024 * 1024 * 1024);
    if (script === "free -m") return freeMOutput(120);
    return "";
  };
  const result = releasePackageOnHost({ ...baseOptions(), run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "memory-gate");
});

test("releasePackageOnHost: refuses when the version is not on the registry", () => {
  const run = fakeRun({ registryVersion: "" });
  const result = releasePackageOnHost({ ...baseOptions(), run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "registry-version");
});

test("releasePackageOnHost: refuses when the current release already is the requested version", () => {
  const run = fakeRun({});
  const result = releasePackageOnHost({ ...baseOptions({ version: "0.1.2" }), run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "current-version");
  assert.equal(result.refusals[0].reason, "already-current");
  assert.deepEqual(result.refusals[0].evidence, { current: "0.1.2", requested: "0.1.2" });
});

test("releasePackageOnHost: --apply performs the recipe in order and records a receipt", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls });
    const result = releasePackageOnHost({ ...baseOptions(), apply: true, dataRoot: root, recordedAt: "2026-09-04T12:00:00.000Z", run });
    assert.equal(result.outcome, "released");
    assert.ok(result.receipt.id.startsWith("ni:///sha-256;"));

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const indexOfFirst = (needle) => scripts.findIndex((script) => script.includes(needle));
    const order = [
      scripts.indexOf(buildFreshReleaseDirectoryScript("~/.local/share/561-group/releases/news-property/news-property-0.1.3", "~/.local/share/561-group/releases/news-property/current")),
      indexOfFirst("cp "),
      indexOfFirst("npm pack"),
      indexOfFirst("LOCKFILE"),
      indexOfFirst("ln -sfn"),
      indexOfFirst("systemctl --user start"),
      indexOfFirst("systemctl --user show"),
      indexOfFirst("journalctl"),
      indexOfFirst("systemctl --user list-timers"),
    ];
    assert.ok(order.every((index) => index !== -1), `every expected step ran: ${JSON.stringify(order)}`);
    for (let i = 1; i < order.length; i += 1) assert.ok(order[i] > order[i - 1], `step ${i} ran out of order: ${JSON.stringify(order)}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: npmrc is copied from the resolved current directory, never the target directory", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls });
    const result = releasePackageOnHost({ ...baseOptions(), apply: true, dataRoot: root, recordedAt: "2026-09-04T12:00:00.000Z", run });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const cpScript = scripts.find((script) => script.startsWith("cp "));
    assert.ok(cpScript, "a cp call ran");
    assert.match(cpScript, /^cp \S*news-property-0\.1\.2\/\.npmrc \S*news-property-0\.1\.3\/\.npmrc$/, `npmrc copied from the prior (current) release into the new one: ${cpScript}`);
    assert.notEqual(cpScript.split(" ")[1], cpScript.split(" ")[2], "source and destination of the npmrc copy must differ");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: rolls back the symlink when the unit reports Result != success", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, unitResult: "exit-code" });
    const result = releasePackageOnHost({ ...baseOptions(), apply: true, dataRoot: root, recordedAt: "2026-09-04T12:00:00.000Z", run });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-start-result");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const flipBackIndex = scripts.findIndex((script) => script.includes("ln -sfn") && script.includes("news-property-0.1.2") && script.endsWith("/current") && !script.includes("/previous"));
    assert.ok(flipBackIndex !== -1, "the current symlink is rolled back to the prior release");
    assert.equal(scripts[flipBackIndex + 1], "systemctl --user restart newsroom-day.service", "the unit is restarted again after the rollback flip, so the running process picks up the rolled-back code");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: a Type=oneshot unit whose ExecStart fails makes 'systemctl --user start' itself throw -- the receipt and rollback still complete", () => {
  // Verified 2026-09-05 against aagaard-michael-capital-circulation.service
  // (Type=oneshot): a real host command throws via defaultRun() on any
  // nonzero exit, and `systemctl --user start` on a failed oneshot unit
  // BLOCKS and returns that unit's own nonzero exit -- unlike a long-running
  // service, where `start` always returns 0 immediately regardless of later
  // health. Before this fix that thrown error escaped releasePackageOnHost()
  // before the diagnostics, rollback, and receipt below ever ran, and the
  // 2026-09-05 aagaard@0.4.2 release receipt had to be hand-written as the
  // escape hatch because of exactly this gap.
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const inner = fakeRun({ calls, unitResult: "exit-code" });
    const run = (command, args) => {
      const script = args.at(-1) ?? "";
      if (script === `systemctl --user start ${UNIT}`) {
        const error = new Error(`Command failed: ${command} ${args.join(" ")}\nJob for ${UNIT} failed because the control process exited with error code.`);
        error.status = 1;
        error.stderr = `Job for ${UNIT} failed because the control process exited with error code (exit-code, status=1/FAILURE)`;
        calls.push({ command, args: [...args] });
        throw error;
      }
      return inner(command, args);
    };
    const result = releasePackageOnHost({ ...baseOptions(), apply: true, dataRoot: root, recordedAt: "2026-09-04T12:00:00.000Z", run });

    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-start-result");
    assert.ok(result.refusals[0].evidence.startCommandError, "the thrown start-command error is carried as evidence");
    assert.equal(result.refusals[0].evidence.startCommandError.status, 1);
    assert.match(result.refusals[0].evidence.startCommandError.stderr, /control process exited with error code/u);

    assert.ok(result.receipt, "a receipt was still written despite the thrown start command");
    assert.ok(result.receipt.id.startsWith("ni:///sha-256;"));
    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].manualRunResult.startCommandError.status, 1);
    assert.equal(persisted.lots[0].rolledBack, true);

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const startIndex = scripts.findIndex((script) => script === `systemctl --user start ${UNIT}`);
    assert.ok(startIndex !== -1, "the start command was attempted");
    assert.ok(scripts.slice(startIndex + 1).some((script) => script.startsWith("systemctl --user show")), "diagnostics still ran after the thrown start command");
    assert.ok(scripts.some((script) => script === `systemctl --user restart ${UNIT}`), "the rollback restart still ran");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --restart uses 'systemctl --user restart' in the correct sequence position", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls });
    const result = releasePackageOnHost({ ...baseOptions(), restart: true, apply: true, dataRoot: root, recordedAt: "2026-09-04T12:00:00.000Z", run });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const order = [
      scripts.indexOf(buildFreshReleaseDirectoryScript("~/.local/share/561-group/releases/news-property/news-property-0.1.3", "~/.local/share/561-group/releases/news-property/current")),
      scripts.findIndex((s) => s.startsWith("cp ")),
      scripts.findIndex((s) => s.includes("npm pack")),
      scripts.findIndex((s) => s.includes("LOCKFILE")),
      scripts.findIndex((s) => s.includes("ln -sfn") && s.includes("news-property-0.1.3")),
      scripts.findIndex((s) => s === "systemctl --user restart newsroom-day.service"),
      scripts.findIndex((s) => s.startsWith("systemctl --user show")),
      scripts.findIndex((s) => s.startsWith("journalctl")),
      scripts.findIndex((s) => s.startsWith("systemctl --user list-timers")),
    ];
    assert.ok(order.every((index) => index !== -1), `every restart-sequence step ran: ${JSON.stringify(order)}`);
    for (let i = 1; i < order.length; i += 1) assert.ok(order[i] > order[i - 1], `step ${i} ran out of order: ${JSON.stringify(order)}`);
    assert.ok(!scripts.some((s) => s === "systemctl --user start newsroom-day.service"), "--restart never issues a plain start");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --probe success releases with a probe transcript and no rollback", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, probeOutputs: ["PROBE ok 200 3 active=1 1:200"] });
    const result = releasePackageOnHost({
      ...baseOptions({ timer: undefined }),
      restart: true,
      probe: "http://127.0.0.1:18811/",
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");
    assert.ok(result.receipt.id.startsWith("ni:///sha-256;"));
    assert.equal(result.probe.ok, true);
    assert.equal(result.probe.startupSeconds, 3, "startupSeconds is recorded in the result");
    assert.equal(result.probe.waitedActive, true);

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.equal(scripts.filter((s) => s.includes("curl")).length, 1, "exactly one probe attempt on success");
    assert.ok(scripts.some((s) => s.includes("systemctl --user show -p ActiveState,SubState")), "waits for ActiveState=active/SubState=running before the first curl attempt");
    assert.ok(!scripts.some((s) => s.includes("ln -sfn") && s.includes("news-property-0.1.2") && s.endsWith("/current") && !s.includes("/previous")), "no rollback flip on probe success");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --probe failure rolls back, restarts, re-probes, and refuses with both transcripts", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({
      calls,
      probeOutputs: ["PROBE fail 000 NA active=1 1:000 2:000", "PROBE ok 200 3 active=1 1:200"],
    });
    const result = releasePackageOnHost({
      ...baseOptions({ timer: undefined }),
      restart: true,
      probe: "http://127.0.0.1:18811/",
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "probe-failed");
    assert.equal(result.refusals[0].evidence.probe.ok, false);
    assert.equal(result.refusals[0].evidence.rollbackProbe.ok, true);
    assert.equal(result.refusals[0].evidence.probe.startupSeconds, null, "no non-000 response ever arrived, so startupSeconds is null");
    assert.equal(result.refusals[0].evidence.rollbackProbe.startupSeconds, 3, "the post-rollback probe records its own startupSeconds");
    assert.match(result.refusals[0].evidence.probe.transcript, /1:000/);
    assert.match(result.refusals[0].evidence.rollbackProbe.transcript, /1:200/);

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const firstCurl = scripts.findIndex((s) => s.includes("curl"));
    const flipBack = scripts.findIndex((s) => s.includes("ln -sfn") && s.includes("news-property-0.1.2") && s.endsWith("/current") && !s.includes("/previous"));
    const restartAgain = scripts.indexOf("systemctl --user restart newsroom-day.service", flipBack + 1);
    const secondCurl = scripts.indexOf(scripts[firstCurl], restartAgain + 1);
    assert.ok(firstCurl !== -1 && flipBack > firstCurl, "probe runs before the rollback flip");
    assert.ok(flipBack !== -1 && restartAgain > flipBack, "the unit restarts again after the rollback flip");
    assert.ok(secondCurl > restartAgain, "a second probe runs after the post-rollback restart");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const ENV_FILE = "/home/deploy/.config/newsroom-day.env";

test("same-version environment edits reuse the active release and retain restart, probe, and rollback", () => {
  const root = mkdtempSync(join(tmpdir(), "release-current-env-"));
  try {
    for (const fail of [false, true]) {
      const calls = [];
      const envSet = fail ? [] : ["METROPLAT_HTTP_CAPABILITIES=ledger-report,ledger-readings"];
      const envUnset = fail ? ["OLD_SETTING"] : [];
      const run = fakeRun({ calls, currentTarget: CURRENT_TARGET.replace("0.1.2", VERSION), probeOutputs: fail ? ["PROBE fail 503 1 active=1 1:503", "PROBE ok 200 1 active=1 1:200"] : [] });
      const result = releasePackageOnHost({ ...baseOptions(), envFile: ENV_FILE, envSet, envUnset, probe: "http://127.0.0.1:18811/health", apply: true, dataRoot: root, run });
      assert.equal(result.outcome, fail ? "refused" : "released");
      const scripts = calls.map(call => call.args.at(-1));
      assert.ok(!scripts.some(script => script.includes("npm pack") || script.includes("npm install") || script.startsWith("ln -sfn")));
      assert.ok(!scripts.includes(buildFreshReleaseDirectoryScript("~/.local/share/561-group/releases/news-property/news-property-0.1.3", "~/.local/share/561-group/releases/news-property/current")));
      assert.ok(scripts.includes(`cp -p ${ENV_FILE} ${ENV_FILE}.previous`));
      assert.ok(scripts.includes(buildEnvEditScript(ENV_FILE, envSet.map(value => { const at = value.indexOf("="); return [value.slice(0, at), value.slice(at + 1)]; }), envUnset)));
      assert.ok(scripts.includes(`systemctl --user restart ${UNIT}`));
      assert.ok(scripts.some(script => script.includes("curl")));
      const persisted = readPersistedReceipt(root, result.receipt.id);
      assert.equal(persisted.lots[0].action, "configuration-update");
      assert.equal(persisted.lots[0].stagingPreparation, null);
      assert.equal(persisted.lots[0].previousSymlinkFlipped, null);
      assert.equal(persisted.lots[0].currentSymlinkFlipped, null);
      assert.equal(persisted.lots[0].envEdit.restoredOnRollback, fail);
      assert.match(persisted.lots[0].installMethod, /^skipped -- reused current release/);
      if (fail) assert.ok(scripts.includes(`cp -p ${ENV_FILE}.previous ${ENV_FILE}`));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --env-set/--env-unset back up and rewrite the env file before the symlink flip", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls });
    const result = releasePackageOnHost({
      ...baseOptions(),
      envFile: ENV_FILE,
      envSet: ["FOO=super-secret-value"],
      envUnset: ["OLD_KEY"],
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const backupIndex = scripts.findIndex((s) => s === `cp -p ${ENV_FILE} ${ENV_FILE}.previous`);
    const chmodBackupIndex = scripts.findIndex((s) => s === `chmod 600 ${ENV_FILE}.previous`);
    const rewriteIndex = scripts.indexOf(buildEnvEditScript(ENV_FILE, [["FOO", "super-secret-value"]], ["OLD_KEY"]));
    const chmodRewriteIndex = scripts.findIndex((s) => s === `chmod 600 ${ENV_FILE}`);
    const flipIndex = scripts.findIndex((s) => s.includes("ln -sfn") && s.includes("news-property-0.1.3"));
    assert.ok(backupIndex !== -1, "the env file is backed up");
    assert.ok(chmodBackupIndex !== -1, "the backup is chmod 600");
    assert.ok(rewriteIndex !== -1, "the env file is rewritten via one node -e invocation");
    assert.ok(chmodRewriteIndex !== -1, "the rewritten env file is chmod 600");
    assert.ok(flipIndex !== -1, "the symlink flip runs");
    assert.ok(backupIndex < chmodBackupIndex, "the backup is chmod 600 right after cp -p");
    assert.ok(chmodBackupIndex < rewriteIndex, "the backup chmod precedes the rewrite");
    assert.ok(rewriteIndex < chmodRewriteIndex, "the rewrite precedes chmod 600 on the env file itself");
    assert.ok(chmodRewriteIndex < flipIndex, "chmod 600 on the env file precedes the symlink flip");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].envEdit.file, ENV_FILE);
    assert.equal(persisted.lots[0].envEdit.backup, `${ENV_FILE}.previous`);
    assert.deepEqual(persisted.lots[0].envEdit.set, ["FOO"]);
    assert.deepEqual(persisted.lots[0].envEdit.unset, ["OLD_KEY"]);
    assert.equal(persisted.lots[0].envEdit.restoredOnRollback, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildEnvEditScript: a KEY duplicated in the source file is replaced once; every later duplicate of that KEY is dropped", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-package-on-host-envedit-test-"));
  const file = join(dir, "metroplat.env");
  try {
    writeFileSync(file, [
      "METROPLAT_HTTP_SUBJECT=old-first",
      "OTHER_KEY=keep-me",
      "METROPLAT_HTTP_SUBJECT=old-second",
      "# a comment, preserved",
    ].join("\n"));

    const script = buildEnvEditScript(file, [["METROPLAT_HTTP_SUBJECT", "new-subject"]], []);
    assert.match(script, /^node -e "/, "buildEnvEditScript produces one node -e invocation");
    execSync(script);

    const content = readFileSync(file, "utf8");
    const subjectLines = content.split("\n").filter((line) => line.startsWith("METROPLAT_HTTP_SUBJECT="));
    assert.equal(subjectLines.length, 1, "the duplicated KEY appears exactly once after the rewrite");
    assert.equal(subjectLines[0], "METROPLAT_HTTP_SUBJECT=new-subject", "the surviving line carries the new value");
    assert.ok(content.includes("OTHER_KEY=keep-me"), "an unrelated key is preserved");
    assert.ok(content.includes("# a comment, preserved"), "a non-KEY line is preserved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildEnvEditScript: a KEY duplicated in the source file is fully removed on --env-unset, not merely the first occurrence", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-package-on-host-envedit-test-"));
  const file = join(dir, "metroplat.env");
  try {
    writeFileSync(file, ["DROP_ME=one", "KEEP=yes", "DROP_ME=two"].join("\n"));
    execSync(buildEnvEditScript(file, [], ["DROP_ME"]));
    const content = readFileSync(file, "utf8");
    assert.ok(!content.includes("DROP_ME"), "every occurrence of an unset KEY is removed");
    assert.ok(content.includes("KEEP=yes"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: restores the env file from its backup before the rollback restart on a failed probe", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({
      calls,
      probeOutputs: ["PROBE fail 000 NA active=1 1:000", "PROBE ok 200 3 active=1 1:200"],
    });
    const result = releasePackageOnHost({
      ...baseOptions({ timer: undefined }),
      restart: true,
      probe: "http://127.0.0.1:18811/",
      envFile: ENV_FILE,
      envSet: ["FOO=super-secret-value"],
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "probe-failed");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const flipBack = scripts.findIndex((s) => s.includes("ln -sfn") && s.includes("news-property-0.1.2") && s.endsWith("/current") && !s.includes("/previous"));
    const restoreIndex = scripts.indexOf(`cp -p ${ENV_FILE}.previous ${ENV_FILE}`, flipBack + 1);
    const chmodRestoreIndex = scripts.indexOf(`chmod 600 ${ENV_FILE}`, restoreIndex + 1);
    const restartAgain = scripts.indexOf("systemctl --user restart newsroom-day.service", chmodRestoreIndex + 1);
    assert.ok(flipBack !== -1, "the release symlink is rolled back");
    assert.ok(restoreIndex !== -1 && restoreIndex > flipBack, "the env file is restored from its backup after the symlink rollback");
    assert.ok(chmodRestoreIndex !== -1 && chmodRestoreIndex > restoreIndex, "the restored env file is chmod 600 right after the restore");
    assert.ok(restartAgain !== -1 && restartAgain > chmodRestoreIndex, "the chmod on the restored env file precedes the rollback restart");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].envEdit.restoredOnRollback, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: the receipt never carries an --env-set VALUE, only KEY names and the backup path", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls });
    const SECRET = "correct-horse-battery-staple-9F2b";
    const result = releasePackageOnHost({
      ...baseOptions(),
      envFile: ENV_FILE,
      envSet: [`FOO=${SECRET}`],
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");
    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.ok(!JSON.stringify(persisted).includes(SECRET), "the persisted receipt record does not carry the --env-set VALUE");
    assert.ok(!JSON.stringify(result).includes(SECRET), "the function's own return value does not carry the --env-set VALUE");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: refuses env-edit-invalid on a bad --env-set KEY, with no host effect", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), envFile: ENV_FILE, envSet: ["lower_case=1"], run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "env-edit-invalid");
  assert.equal(calls.length, 0, "an invalid --env-set is refused before any host effect");
});

test("releasePackageOnHost: refuses env-edit-invalid when --env-set is given without --environment-file, with no host effect", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), envSet: ["FOO=bar"], run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "env-edit-invalid");
  assert.equal(calls.length, 0, "--env-set without --environment-file is refused before any host effect");
});

test("releasePackageOnHost: refuses env-edit-invalid when --environment-file is not an absolute path, with no host effect", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), envFile: "~/.config/561-group/x.env", envSet: ["FOO=bar"], run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "env-edit-invalid");
  assert.match(result.refusals[0].reason, /absolute path/);
  assert.match(result.refusals[0].reason, /~/, "the refusal names that a leading ~ is not expanded");
  assert.equal(calls.length, 0, "a non-absolute --environment-file is refused before any host effect");
});

test("releasePackageOnHost: plan mode (no --apply) issues zero env-related host commands even with --environment-file/--env-set", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), envFile: ENV_FILE, envSet: ["FOO=bar"], envUnset: ["OLD_KEY"], run });
  assert.equal(result.outcome, "planned");
  assert.ok(result.plan.envEdit, "the plan still surfaces the env edit for review");

  const scripts = calls.map((call) => call.args.at(-1) ?? "");
  const envCommands = scripts.filter((s) => s.includes(ENV_FILE) || s.startsWith("node -e "));
  assert.equal(envCommands.length, 0, `plan mode ran an env-related host command: ${JSON.stringify(envCommands)}`);
});

test("releasePackageOnHost: --release-name overrides the releases root and directory prefix, recorded in plan and receipt", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const releaseName = "ops-561-group-mcp-gateway";
    const gatewayCurrentTarget = `/home/emsenn/.local/share/561-group/releases/${releaseName}/${releaseName}-0.1.0`;
    const run = fakeRun({ calls, currentTarget: gatewayCurrentTarget });
    const packageName = "@red-cup-engineering/ops-561-group-mcp-gateway-service";

    const planned = releasePackageOnHost({ ...baseOptions({ packageName, releaseName, run: fakeRun({ currentTarget: gatewayCurrentTarget }) }) });
    assert.equal(planned.outcome, "planned");
    assert.equal(planned.plan.releaseName, releaseName);
    assert.equal(planned.plan.releaseDirectory, `~/.local/share/561-group/releases/${releaseName}/${releaseName}-${VERSION}`);
    assert.equal(planned.plan.fromVersion, "0.1.0");

    const result = releasePackageOnHost({ ...baseOptions({ packageName, releaseName, apply: true, dataRoot: root, recordedAt: "2026-09-04T12:00:00.000Z", run }) });
    assert.equal(result.outcome, "released");
    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.ok(scripts.includes(buildFreshReleaseDirectoryScript(`~/.local/share/561-group/releases/${releaseName}/${releaseName}-${VERSION}`, `~/.local/share/561-group/releases/${releaseName}/current`)), "the release directory uses --release-name, not the npm package basename");
    assert.ok(!scripts.some((s) => s.includes("ops-561-group-mcp-gateway-service-")), "the package basename is never used as the directory prefix once --release-name is given");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.releaseName, releaseName);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: defaults --release-name to the package basename when not given", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), run });
  assert.equal(result.outcome, "planned");
  assert.equal(result.plan.releaseName, "news-property");
});

test("releasePackageOnHost: refuses release-name-invalid on a bad --release-name, with no host effect", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), releaseName: "Not_Valid!", run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "release-name-invalid");
  assert.equal(calls.length, 0, "an invalid --release-name is refused before any host effect");
});

const BOOTSTRAP_RELEASE_NAME = "aagaard";
const NPMRC_SOURCE = "/home/emsenn/.local/share/561-group/releases/news-property/current/.npmrc";

test("releasePackageOnHost: refuses current-release when no current symlink exists and no --npmrc-source is given", () => {
  const calls = [];
  const run = fakeRun({ calls, currentTarget: "" });
  const result = releasePackageOnHost({ ...baseOptions(), releaseName: BOOTSTRAP_RELEASE_NAME, run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "current-release");
});

test("releasePackageOnHost: --npmrc-source onboards a brand-new lane with no prior current symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, currentTarget: "" });
    const result = releasePackageOnHost({
      ...baseOptions({ timer: undefined }),
      releaseName: BOOTSTRAP_RELEASE_NAME,
      npmrcSource: NPMRC_SOURCE,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const cpScript = scripts.find((script) => script.startsWith("cp "));
    assert.equal(cpScript, `cp ${NPMRC_SOURCE} ~/.local/share/561-group/releases/${BOOTSTRAP_RELEASE_NAME}/${BOOTSTRAP_RELEASE_NAME}-${VERSION}/.npmrc`, "the .npmrc is copied from --npmrc-source, not a nonexistent sibling release");
    assert.ok(!scripts.some((script) => script.includes("/previous")), "a brand-new lane writes no 'previous' symlink -- there is no prior release to preserve");
    assert.ok(scripts.some((script) => script === `ln -sfn ~/.local/share/561-group/releases/${BOOTSTRAP_RELEASE_NAME}/${BOOTSTRAP_RELEASE_NAME}-${VERSION} ~/.local/share/561-group/releases/${BOOTSTRAP_RELEASE_NAME}/current`), "current is linked straight to the new release directory");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].fromVersion, null);
    assert.equal(persisted.lots[0].action, "release-onboard");
    assert.equal(persisted.lots[0].previousSymlinkFlipped, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const REPOINT_UNIT = "aagaard-michael-capital-circulation.service";
const REPOINT_UNIT_PATH = `~/.config/systemd/user/${REPOINT_UNIT}`;

test("releasePackageOnHost: --repoint-unit-working-directory backs up and rewrites the unit file, then daemon-reloads, before the symlink flip", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, currentTarget: "" });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: REPOINT_UNIT, timer: undefined }),
      releaseName: BOOTSTRAP_RELEASE_NAME,
      npmrcSource: NPMRC_SOURCE,
      repointUnitWorkingDirectory: true,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const backupIndex = scripts.findIndex((s) => s === `cp -p ${REPOINT_UNIT_PATH} ${REPOINT_UNIT_PATH}.previous`);
    const rewriteIndex = scripts.findIndex((s) => s.startsWith("sed -i ") && s.includes(REPOINT_UNIT_PATH));
    const reloadIndex = scripts.indexOf("systemctl --user daemon-reload");
    const flipIndex = scripts.findIndex((s) => s.includes("ln -sfn") && s.includes(`${BOOTSTRAP_RELEASE_NAME}-${VERSION}`));
    const startIndex = scripts.indexOf(`systemctl --user start ${REPOINT_UNIT}`);
    assert.ok(backupIndex !== -1, "the unit file is backed up");
    assert.ok(rewriteIndex !== -1, "the unit file's WorkingDirectory is rewritten");
    assert.match(scripts[rewriteIndex], /WorkingDirectory=\$\(eval echo ~\/\.local\/share\/561-group\/releases\/aagaard\/current\)/, "the ~-relative release path is expanded remotely via eval echo, never written literally -- systemd refuses a non-absolute WorkingDirectory");
    assert.ok(reloadIndex !== -1, "daemon-reload runs");
    assert.ok(backupIndex < rewriteIndex && rewriteIndex < reloadIndex && reloadIndex < flipIndex && flipIndex < startIndex, `unit edit precedes flip precedes start: ${JSON.stringify({ backupIndex, rewriteIndex, reloadIndex, flipIndex, startIndex })}`);

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitEdit.file, REPOINT_UNIT_PATH);
    assert.equal(persisted.lots[0].unitEdit.workingDirectory, `~/.local/share/561-group/releases/${BOOTSTRAP_RELEASE_NAME}/current`);
    assert.equal(persisted.lots[0].unitEdit.restoredOnRollback, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --repoint-unit-working-directory restores the unit file from backup and daemon-reloads before the rollback restart", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, currentTarget: "", unitResult: "exit-code" });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: REPOINT_UNIT, timer: undefined }),
      releaseName: BOOTSTRAP_RELEASE_NAME,
      npmrcSource: NPMRC_SOURCE,
      repointUnitWorkingDirectory: true,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-start-result");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const restoreIndex = scripts.indexOf(`cp -p ${REPOINT_UNIT_PATH}.previous ${REPOINT_UNIT_PATH}`);
    const reloadIndices = scripts.reduce((acc, s, i) => (s === "systemctl --user daemon-reload" ? [...acc, i] : acc), []);
    const restartAgainIndex = scripts.indexOf(`systemctl --user restart ${REPOINT_UNIT}`);
    assert.ok(restoreIndex !== -1, "the unit file is restored from its backup");
    assert.ok(reloadIndices.length >= 2, "daemon-reload runs again after the restore");
    assert.ok(restoreIndex < reloadIndices[reloadIndices.length - 1] && reloadIndices[reloadIndices.length - 1] < restartAgainIndex, "restore, then daemon-reload, then restart");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitEdit.restoredOnRollback, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildWorkingDirectoryEditScript: rewrites only the WorkingDirectory= line, preserving everything else", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-package-on-host-unitedit-test-"));
  const file = join(dir, "example.service");
  try {
    writeFileSync(file, [
      "[Service]",
      "Type=oneshot",
      "WorkingDirectory=/home/emsenn/aagaard-capital-circulation",
      "ExecStart=/usr/bin/node scripts/example.mjs",
    ].join("\n"));

    const script = buildWorkingDirectoryEditScript(file, "/home/emsenn/.local/share/561-group/releases/aagaard/current");
    assert.match(script, /^sed -i /, "buildWorkingDirectoryEditScript produces one sed -i invocation");
    execSync(script);

    const content = readFileSync(file, "utf8");
    assert.ok(content.includes("WorkingDirectory=/home/emsenn/.local/share/561-group/releases/aagaard/current"));
    assert.ok(content.includes("ExecStart=/usr/bin/node scripts/example.mjs"), "an unrelated line is preserved");
    assert.ok(content.includes("Type=oneshot"), "an unrelated line is preserved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const SECOND_REPOINT_UNIT = "aagaard-sigmund-capital-circulation.service";
const SECOND_REPOINT_UNIT_PATH = `~/.config/systemd/user/${SECOND_REPOINT_UNIT}`;

test("releasePackageOnHost: --repoint-unit-working-directory onboards a second unit onto an already-current release without reinstalling", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    // The lane's `current` already points at this exact version -- as it would
    // after a sibling unit (michael) released it first; sigmund onboards next.
    const alreadyCurrentTarget = `/home/emsenn/.local/share/561-group/releases/${BOOTSTRAP_RELEASE_NAME}/${BOOTSTRAP_RELEASE_NAME}-${VERSION}`;
    const run = fakeRun({ calls, currentTarget: alreadyCurrentTarget });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: SECOND_REPOINT_UNIT, timer: undefined }),
      releaseName: BOOTSTRAP_RELEASE_NAME,
      repointUnitWorkingDirectory: true,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.ok(!scripts.some((s) => s.includes("npm pack")), "no reinstall runs -- the release is already this lane's current");
    assert.ok(!scripts.some((s) => s.startsWith("mkdir -p")), "no release directory is (re)created");
    assert.ok(scripts.some((s) => s.startsWith("sed -i ") && s.includes(SECOND_REPOINT_UNIT_PATH)), "the second unit's own WorkingDirectory is still rewritten");
    assert.ok(scripts.some((s) => s.startsWith("systemctl --user start")), "the second unit is still started");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].action, "unit-onboard");
    assert.match(persisted.lots[0].installMethod, /^skipped/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: refuses already-current when no unit onboarding is requested (unchanged upgrade-refusal behavior)", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions({ version: "0.1.2" }), run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "current-version");
});

test("buildWorkingDirectoryEditScript: expands a ~-relative value to an absolute path -- systemd refuses a literal ~ as 'not absolute'", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-package-on-host-unitedit-tilde-test-"));
  const file = join(dir, "example.service");
  try {
    writeFileSync(file, ["[Service]", "WorkingDirectory=/some/old/tree", "ExecStart=/usr/bin/node scripts/example.mjs"].join("\n"));

    const script = buildWorkingDirectoryEditScript(file, "~/.local/share/561-group/releases/aagaard/current");
    assert.match(script, /\$\(eval echo ~\//, "the ~-relative value is expanded via eval echo, never written literally");
    execSync(script, { env: { ...process.env, HOME: dir } });

    const content = readFileSync(file, "utf8");
    assert.ok(content.includes(`WorkingDirectory=${dir}/.local/share/561-group/releases/aagaard/current`), `WorkingDirectory is an absolute path, ~ expanded against $HOME: ${content}`);
    assert.ok(!content.includes("WorkingDirectory=~"), "no literal ~ survives in the unit file -- systemd would refuse it as not-absolute");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildEnvironmentFileDirectiveEditScript: inserts EnvironmentFile= after [Service] once, idempotent on a second run", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-package-on-host-envdirective-test-"));
  const file = join(dir, "example.service");
  const envFile = "/home/emsenn/.config/561-group/aagaard-capital-circulation.env";
  try {
    writeFileSync(file, ["[Unit]", "Description=x", "", "[Service]", "Type=oneshot", "Environment=AAGAARD_COLD_RED_GATE_LOCAL_SIGNER=1", "ExecStart=/usr/bin/node scripts/example.mjs"].join("\n"));

    const script = buildEnvironmentFileDirectiveEditScript(file, envFile);
    assert.match(script, /^grep -qxF /, "the insert is guarded by an exact-line existence check");
    execSync(script);

    const content = readFileSync(file, "utf8");
    assert.ok(content.includes(`EnvironmentFile=${envFile}`));
    assert.ok(content.includes("Environment=AAGAARD_COLD_RED_GATE_LOCAL_SIGNER=1"), "the pre-existing inline Environment= line is preserved untouched");
    assert.ok(content.includes("ExecStart=/usr/bin/node scripts/example.mjs"), "an unrelated line is preserved");
    const insertedIndex = content.split("\n").indexOf(`EnvironmentFile=${envFile}`);
    const serviceIndex = content.split("\n").indexOf("[Service]");
    assert.equal(insertedIndex, serviceIndex + 1, "the directive is inserted immediately after the [Service] header");

    execSync(script);
    const occurrences = readFileSync(file, "utf8").split("\n").filter((line) => line === `EnvironmentFile=${envFile}`).length;
    assert.equal(occurrences, 1, "running the script again does not duplicate the line");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: refuses env-edit-invalid when --wire-environment-file-directive is given without --environment-file", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), wireEnvironmentFileDirective: true, run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "env-edit-invalid");
  assert.equal(calls.length, 0, "refused before any host effect");
});

const CAPITAL_CIRCULATION_ENV_FILE = "/home/emsenn/.config/561-group/aagaard-capital-circulation.env";

test("releasePackageOnHost: --wire-environment-file-directive creates a brand-new environment file, wires EnvironmentFile=, and daemon-reloads before the symlink flip", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, currentTarget: "" });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: REPOINT_UNIT, timer: undefined }),
      releaseName: BOOTSTRAP_RELEASE_NAME,
      npmrcSource: NPMRC_SOURCE,
      envFile: CAPITAL_CIRCULATION_ENV_FILE,
      envSet: ["AAGAARD_COLD_RED_GATE_KEY_ROOT=/home/emsenn/.config/blockchain/hive", "AAGAARD_COLD_RED_GATE_LOCAL_SIGNER=1"],
      wireEnvironmentFileDirective: true,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const bootstrapIndex = scripts.findIndex((s) => s.includes(`[ -f ${CAPITAL_CIRCULATION_ENV_FILE} ]`));
    const backupIndex = scripts.indexOf(`cp -p ${CAPITAL_CIRCULATION_ENV_FILE} ${CAPITAL_CIRCULATION_ENV_FILE}.previous`);
    const rewriteEnvIndex = scripts.indexOf(buildEnvEditScript(CAPITAL_CIRCULATION_ENV_FILE, [["AAGAARD_COLD_RED_GATE_KEY_ROOT", "/home/emsenn/.config/blockchain/hive"], ["AAGAARD_COLD_RED_GATE_LOCAL_SIGNER", "1"]], []));
    const directiveIndex = scripts.findIndex((s) => s.startsWith("grep -qxF ") && s.includes(REPOINT_UNIT_PATH));
    const reloadIndex = scripts.indexOf("systemctl --user daemon-reload");
    const flipIndex = scripts.findIndex((s) => s.includes("ln -sfn") && s.includes(`${BOOTSTRAP_RELEASE_NAME}-${VERSION}`));

    assert.ok(bootstrapIndex !== -1, "the missing environment file is created first");
    assert.ok(backupIndex !== -1, "the (now-existing) environment file is backed up");
    assert.ok(rewriteEnvIndex !== -1, "the environment file is rewritten with the KEY=VALUE pairs");
    assert.ok(directiveIndex !== -1, "the unit's EnvironmentFile= directive is wired");
    assert.match(scripts[directiveIndex], new RegExp(CAPITAL_CIRCULATION_ENV_FILE.replace(/[.]/gu, "\\.")));
    assert.ok(reloadIndex !== -1, "daemon-reload runs");
    assert.ok(bootstrapIndex < backupIndex && backupIndex < rewriteEnvIndex && rewriteEnvIndex < directiveIndex && directiveIndex < reloadIndex && reloadIndex < flipIndex,
      `bootstrap, backup, rewrite, directive, reload, flip in order: ${JSON.stringify({ bootstrapIndex, backupIndex, rewriteEnvIndex, directiveIndex, reloadIndex, flipIndex })}`);

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitEdit.environmentFileDirective, CAPITAL_CIRCULATION_ENV_FILE);
    assert.equal(persisted.lots[0].unitEdit.workingDirectory, null, "no --repoint-unit-working-directory was requested this time");
    assert.deepEqual(persisted.lots[0].envEdit.set, ["AAGAARD_COLD_RED_GATE_KEY_ROOT", "AAGAARD_COLD_RED_GATE_LOCAL_SIGNER"], "only KEY names are ever recorded, never a VALUE");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --wire-environment-file-directive onboards a second unit onto an already-current release without reinstalling", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const alreadyCurrentTarget = `/home/emsenn/.local/share/561-group/releases/${BOOTSTRAP_RELEASE_NAME}/${BOOTSTRAP_RELEASE_NAME}-${VERSION}`;
    const run = fakeRun({ calls, currentTarget: alreadyCurrentTarget });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: SECOND_REPOINT_UNIT, timer: undefined }),
      releaseName: BOOTSTRAP_RELEASE_NAME,
      envFile: CAPITAL_CIRCULATION_ENV_FILE,
      wireEnvironmentFileDirective: true,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.ok(!scripts.some((s) => s.includes("npm pack")), "no reinstall runs -- the release is already this lane's current");
    assert.ok(scripts.some((s) => s.startsWith("grep -qxF ") && s.includes(SECOND_REPOINT_UNIT_PATH)), "the second unit's own EnvironmentFile= directive is still wired");
    assert.ok(scripts.some((s) => s.startsWith("systemctl --user start")), "the second unit is still started");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].action, "unit-onboard");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --wire-environment-file-directive-only rollback restores the unit file from backup and daemon-reloads before the rollback restart", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, currentTarget: "", unitResult: "exit-code" });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: REPOINT_UNIT, timer: undefined }),
      releaseName: BOOTSTRAP_RELEASE_NAME,
      npmrcSource: NPMRC_SOURCE,
      envFile: CAPITAL_CIRCULATION_ENV_FILE,
      wireEnvironmentFileDirective: true,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-04T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-start-result");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const restoreIndex = scripts.indexOf(`cp -p ${REPOINT_UNIT_PATH}.previous ${REPOINT_UNIT_PATH}`);
    const reloadIndices = scripts.reduce((acc, s, i) => (s === "systemctl --user daemon-reload" ? [...acc, i] : acc), []);
    const restartAgainIndex = scripts.indexOf(`systemctl --user restart ${REPOINT_UNIT}`);
    assert.ok(restoreIndex !== -1, "the unit file is restored from its backup");
    assert.ok(reloadIndices.length >= 2, "daemon-reload runs again after the restore");
    assert.ok(restoreIndex < reloadIndices[reloadIndices.length - 1] && reloadIndices[reloadIndices.length - 1] < restartAgainIndex, "restore, then daemon-reload, then restart");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitEdit.restoredOnRollback, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const AUTHORED_UNIT = "forecast-weather-markets-run.service";
const AUTHORED_UNIT_PATH = `~/.config/systemd/user/${AUTHORED_UNIT}`;
const AUTHORED_TIMER = "forecast-weather-markets-run.timer";
const AUTHORED_TIMER_PATH = `~/.config/systemd/user/${AUTHORED_TIMER}`;
const AUTHORED_EXEC_START = "/home/emsenn/.nvm/versions/node/v24.16.0/bin/node apps/forecast-weather-markets-cli.mjs run";
const AUTHORED_ON_CALENDAR = "*-*-* 10:00:00 UTC";

function decodeWriteRemoteFileScript(script) {
  const match = /'([A-Za-z0-9+/=]+)'$/u.exec(script);
  assert.ok(match, "the atomic writer carries its base64 content as the final argument");
  return Buffer.from(match[1], "base64").toString("utf8");
}

test("renderReleaseUnitServiceText: renders a Type=oneshot unit with no [Install] section", () => {
  const text = renderReleaseUnitServiceText({
    description: "Run the forecast-weather-markets loop",
    workingDirectory: "/home/emsenn/.local/share/561-group/releases/forecasting/current",
    execStart: AUTHORED_EXEC_START,
  });
  assert.match(text, /^\[Unit\]/);
  assert.match(text, /Description=Run the forecast-weather-markets loop/);
  assert.match(text, /Type=oneshot/);
  assert.match(text, /WorkingDirectory=\/home\/emsenn\/\.local\/share\/561-group\/releases\/forecasting\/current/);
  assert.match(text, new RegExp(`ExecStart=${AUTHORED_EXEC_START.replace(/[/.]/gu, "\\$&")}`));
  assert.ok(!text.includes("[Install]"), "a timer-triggered oneshot carries no [Install] section (matches rotate-substrate-logs.service)");
});

test("renderReleaseUnitTimerText: renders a Persistent=true timer wired to its unit", () => {
  const text = renderReleaseUnitTimerText({ description: "Run forecast-weather-markets-run daily", onCalendar: AUTHORED_ON_CALENDAR, unit: AUTHORED_UNIT });
  assert.match(text, /OnCalendar=\*-\*-\* 10:00:00 UTC/);
  assert.match(text, /Persistent=true/);
  assert.match(text, new RegExp(`Unit=${AUTHORED_UNIT}`));
  assert.match(text, /WantedBy=timers\.target/);
});

test("buildWriteRemoteFileScript: writes exact content to a tilde-relative path, expanded via eval echo", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-package-on-host-writefile-test-"));
  const file = join(dir, "example.service");
  try {
    const content = renderReleaseUnitServiceText({ description: "Example", workingDirectory: dir, execStart: "/bin/true" });
    writeFileSync(file, "old");
    chmodSync(file, 0o640);
    const script = buildWriteRemoteFileScript(file, content);
    assert.match(script, /^node -e /, "buildWriteRemoteFileScript produces one node -e invocation");
    execSync(script);
    assert.equal(readFileSync(file, "utf8"), content);
    assert.equal(statSync(file).mode & 0o777, 0o640, "an atomic replacement retains existing operational file mode");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: refuses author-unit-invalid when --unit-exec is given without --author-unit", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), unitExecStart: AUTHORED_EXEC_START, run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "author-unit-invalid");
  assert.equal(calls.length, 0, "an invalid author-unit combination is refused before any host effect");
});

test("releasePackageOnHost: refuses author-unit-invalid when --author-unit is given without --unit-exec", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), authorUnit: true, run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "author-unit-invalid");
  assert.equal(calls.length, 0);
});

test("releasePackageOnHost: refuses author-unit-invalid when --timer-on-calendar is given without --timer", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions({ timer: undefined }), authorUnit: true, unitExecStart: AUTHORED_EXEC_START, timerOnCalendar: AUTHORED_ON_CALENDAR, run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "author-unit-invalid");
  assert.equal(calls.length, 0);
});

test("releasePackageOnHost: refuses author-unit-invalid when --author-unit with --timer is given without --timer-on-calendar", () => {
  const calls = [];
  const run = fakeRun({ calls });
  const result = releasePackageOnHost({ ...baseOptions(), authorUnit: true, unitExecStart: AUTHORED_EXEC_START, run });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "author-unit-invalid");
  assert.equal(calls.length, 0);
});

test("releasePackageOnHost: --author-unit is a no-op when the named unit and timer already exist -- behaves exactly as today", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, loadStates: { [UNIT]: "loaded", [TIMER]: "loaded" } });
    const planned = releasePackageOnHost({ ...baseOptions(), authorUnit: true, unitExecStart: AUTHORED_EXEC_START, timerOnCalendar: AUTHORED_ON_CALENDAR, run: fakeRun({ loadStates: { [UNIT]: "loaded", [TIMER]: "loaded" } }) });
    assert.equal(planned.outcome, "planned");
    assert.equal(planned.plan.unitAuthor.service.missing, false);
    assert.equal(planned.plan.unitAuthor.timer.missing, false);
    assert.ok(!planned.plan.plannedSteps.some((step) => step.startsWith("write ")), "no author-unit step is planned when both units already exist");

    const result = releasePackageOnHost({ ...baseOptions(), authorUnit: true, unitExecStart: AUTHORED_EXEC_START, timerOnCalendar: AUTHORED_ON_CALENDAR, apply: true, dataRoot: root, recordedAt: "2026-09-05T12:00:00.000Z", run });
    assert.equal(result.outcome, "released");
    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.equal(scripts.filter((s) => s.startsWith("node -e")).length, 1, "only staging preparation runs; no unit/timer file is written");
    assert.ok(!scripts.some((s) => s.includes("enable --now")), "nothing is enabled when both already exist");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitAuthor.service.authored, false);
    assert.equal(persisted.lots[0].unitAuthor.timer.authored, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --author-unit plans writing a new unit and timer when neither exists on the host", () => {
  const run = fakeRun({ loadStates: { [AUTHORED_UNIT]: "not-found", [AUTHORED_TIMER]: "not-found" } });
  const result = releasePackageOnHost({
    ...baseOptions({ unit: AUTHORED_UNIT, timer: AUTHORED_TIMER }),
    authorUnit: true,
    unitExecStart: AUTHORED_EXEC_START,
    timerOnCalendar: AUTHORED_ON_CALENDAR,
    run,
  });
  assert.equal(result.outcome, "planned");
  assert.equal(result.plan.unitAuthor.service.missing, true);
  assert.equal(result.plan.unitAuthor.timer.missing, true);
  assert.ok(result.plan.plannedSteps.some((step) => step.startsWith(`write ${AUTHORED_UNIT_PATH}`)));
  assert.ok(result.plan.plannedSteps.some((step) => step.startsWith(`write ${AUTHORED_TIMER_PATH}`)));
  assert.ok(result.plan.plannedSteps.includes(`systemctl --user enable --now ${AUTHORED_TIMER}`));
});

test("releasePackageOnHost: --author-unit writes the unit then the timer, daemon-reloads, enables --now the timer, all before the symlink flip and start", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, loadStates: { [AUTHORED_UNIT]: "not-found", [AUTHORED_TIMER]: "not-found" } });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: AUTHORED_UNIT, timer: AUTHORED_TIMER }),
      authorUnit: true,
      unitExecStart: AUTHORED_EXEC_START,
      timerOnCalendar: AUTHORED_ON_CALENDAR,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-05T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    const writeServiceIndex = scripts.findIndex((s) => s.startsWith("node -e") && s.includes(`$(eval echo ${AUTHORED_UNIT_PATH})`));
    const writeTimerIndex = scripts.findIndex((s) => s.startsWith("node -e") && s.includes(`$(eval echo ${AUTHORED_TIMER_PATH})`));
    const reloadIndex = scripts.indexOf("systemctl --user daemon-reload");
    const enableIndex = scripts.indexOf(`systemctl --user enable --now ${AUTHORED_TIMER}`);
    const flipIndex = scripts.findIndex((s) => s.includes("ln -sfn"));
    const startIndex = scripts.indexOf(`systemctl --user start ${AUTHORED_UNIT}`);
    assert.ok(writeServiceIndex !== -1, "the service file is written");
    assert.ok(writeTimerIndex !== -1, "the timer file is written");
    assert.ok(
      writeServiceIndex < writeTimerIndex && writeTimerIndex < reloadIndex && reloadIndex < enableIndex && enableIndex < flipIndex && flipIndex < startIndex,
      `write service, write timer, daemon-reload, enable --now, flip, start, in order: ${JSON.stringify({ writeServiceIndex, writeTimerIndex, reloadIndex, enableIndex, flipIndex, startIndex })}`,
    );

    const serviceContent = decodeWriteRemoteFileScript(scripts[writeServiceIndex]);
    assert.match(serviceContent, /Type=oneshot/);
    assert.match(serviceContent, new RegExp(`ExecStart=${AUTHORED_EXEC_START.replace(/[/.]/gu, "\\$&")}`));
    const timerContent = decodeWriteRemoteFileScript(scripts[writeTimerIndex]);
    assert.match(timerContent, /OnCalendar=\*-\*-\* 10:00:00 UTC/);

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitAuthor.service.authored, true);
    assert.equal(persisted.lots[0].unitAuthor.timer.authored, true);
    assert.equal(persisted.lots[0].unitAuthor.disabledOnRollback, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: --author-unit combined with --wire-environment-file-directive on a brand-new unit wires EnvironmentFile= into the freshly-written unit, with nothing to back up", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  const envFile = "/home/emsenn/.config/561-group/example-cycle.env";
  try {
    const calls = [];
    const run = fakeRun({ calls, loadStates: { [AUTHORED_UNIT]: "not-found", [AUTHORED_TIMER]: "not-found" } });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: AUTHORED_UNIT, timer: AUTHORED_TIMER }),
      authorUnit: true,
      unitExecStart: AUTHORED_EXEC_START,
      timerOnCalendar: AUTHORED_ON_CALENDAR,
      envFile,
      envSet: ["EXAMPLE_REQUEST_PATH=/home/emsenn/.config/561-group/example-request.json"],
      wireEnvironmentFileDirective: true,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-05T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "released");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.ok(
      !scripts.some((s) => s === `cp -p ${AUTHORED_UNIT_PATH} ${AUTHORED_UNIT_PATH}.previous`),
      "a brand-new unit has nothing to back up -- the edit-only cp -p path never runs",
    );
    const writeServiceIndex = scripts.findIndex((s) => s.startsWith("node -e") && s.includes(`$(eval echo ${AUTHORED_UNIT_PATH})`));
    const directiveIndex = scripts.indexOf(buildEnvironmentFileDirectiveEditScript(AUTHORED_UNIT_PATH, envFile));
    assert.ok(writeServiceIndex !== -1, "the service file is still written fresh");
    assert.ok(directiveIndex !== -1, "the EnvironmentFile= directive is wired in");
    assert.ok(writeServiceIndex < directiveIndex, "the directive is wired in only after the fresh unit text is written");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitAuthor.service.authored, true);
    assert.equal(persisted.lots[0].unitAuthor.service.environmentFileDirective, envFile);
    assert.equal(persisted.lots[0].unitEdit, undefined, "no separate unitEdit lot -- there was no existing file to edit");
    assert.equal(persisted.lots[0].unitAuthor.disabledOnRollback, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: a freshly authored unit's failed first run disables its timer instead of restarting into a nonexistent prior state", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    const run = fakeRun({ calls, unitResult: "exit-code", loadStates: { [AUTHORED_UNIT]: "not-found", [AUTHORED_TIMER]: "not-found" } });
    const result = releasePackageOnHost({
      ...baseOptions({ unit: AUTHORED_UNIT, timer: AUTHORED_TIMER }),
      authorUnit: true,
      unitExecStart: AUTHORED_EXEC_START,
      timerOnCalendar: AUTHORED_ON_CALENDAR,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-05T12:00:00.000Z",
      run,
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "unit-start-result");

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.ok(scripts.includes(`systemctl --user disable --now ${AUTHORED_TIMER}`), "the freshly authored timer is disabled");
    assert.ok(!scripts.includes(`systemctl --user restart ${AUTHORED_UNIT}`), "no restart is attempted -- there is no earlier working state to restart into");
    assert.ok(scripts.some((s) => s.startsWith("node -e")), "the authored files are still written before the failed start");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].unitAuthor.disabledOnRollback, true);
    assert.equal(persisted.lots[0].unitAuthor.service.authored, true);
    assert.equal(persisted.lots[0].unitAuthor.timer.authored, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const SCORE_UNIT = "forecast-weather-markets-score.service";
const SCORE_TIMER = "forecast-weather-markets-score.timer";
const SCORE_EXEC_START = "/home/emsenn/.nvm/versions/node/v24.16.0/bin/node apps/forecast-weather-markets-cli.mjs score";
const SCORE_ON_CALENDAR = "*-*-* 12:00:00 UTC";

test("releasePackageOnHost: --author-unit onboards a second brand-new unit onto an already-current release without reinstalling or refusing already-current", () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-test-"));
  try {
    const calls = [];
    // The lane's `current` already points at this exact version -- as it
    // would once the sibling "run" unit released it first; "score" is a
    // second, brand-new unit onboarding onto that same already-current
    // release, exactly the forecast-weather-markets two-timer shape.
    const alreadyCurrentTarget = `/home/emsenn/.local/share/561-group/releases/forecasting/forecasting-${VERSION}`;
    const run = fakeRun({ calls, currentTarget: alreadyCurrentTarget, loadStates: { [SCORE_UNIT]: "not-found", [SCORE_TIMER]: "not-found" } });
    const result = releasePackageOnHost({ ...baseOptions({
      packageName: "@red-cup-engineering/forecasting",
      unit: SCORE_UNIT, timer: SCORE_TIMER,
      releaseName: "forecasting",
      authorUnit: true,
      unitExecStart: SCORE_EXEC_START,
      timerOnCalendar: SCORE_ON_CALENDAR,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-05T12:00:00.000Z",
      run,
    }) });
    assert.equal(result.outcome, "released", JSON.stringify(result.refusals));

    const scripts = calls.map((call) => call.args.at(-1) ?? "");
    assert.ok(!scripts.some((s) => s.includes("npm pack")), "no reinstall runs -- the release is already this lane's current");
    assert.ok(!scripts.some((s) => s.startsWith("mkdir -p")), "no release directory is (re)created");
    assert.ok(scripts.some((s) => s.startsWith("node -e") && s.includes(`$(eval echo ~/.config/systemd/user/${SCORE_UNIT})`)), "the score unit is still authored");
    assert.ok(scripts.includes(`systemctl --user enable --now ${SCORE_TIMER}`));
    assert.ok(scripts.includes(`systemctl --user start ${SCORE_UNIT}`), "the second unit is still started");

    const persisted = readPersistedReceipt(root, result.receipt.id);
    assert.equal(persisted.lots[0].action, "unit-onboard");
    assert.equal(persisted.lots[0].unitAuthor.service.authored, true);
    assert.equal(persisted.lots[0].unitAuthor.timer.authored, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("content-addressed current/app keeps its exact npmrc, previous link, and rollback target", () => {
  const fixture = mkdtempSync(join(tmpdir(), "release-nested-current-"));
  try {
    const releases = join(fixture, "releases");
    const old = join(releases, "a".repeat(64), "app");
    mkdirSync(old, { recursive: true });
    writeFileSync(join(old, "package.json"), JSON.stringify({ version: "0.1.2" }));
    writeFileSync(join(old, ".npmrc"), "registry=https://registry.561.group/\n");
    for (const unitResult of ["success", "failed"]) {
      symlinkSync(old, join(releases, "current"));
      const calls = [];
      const mock = fakeRun({ calls, currentTarget: old, unitResult });
      const result = releasePackageOnHost({ ...baseOptions(), apply: true, dataRoot: join(fixture, unitResult), run(command, args) {
        const script = args.at(-1);
        const output = mock(command, args);
        if (script.startsWith("node -p ")) return execSync(script, { encoding: "utf8" });
        if (script.startsWith("ln -sfn ")) execSync(script.replaceAll("~/.local/share/561-group/releases/news-property", releases));
        return output;
      } });
      const scripts = calls.map(call => call.args.at(-1));
      assert.ok(scripts.some(script => script.startsWith(`cp ${old}/.npmrc `)));
      assert.equal(readlinkSync(join(releases, "previous")), old);
      assert.equal(readlinkSync(join(releases, "current")), unitResult === "success" ? join(releases, "news-property-0.1.3") : old);
      assert.equal(result.outcome, unitResult === "success" ? "released" : "refused");
      rmSync(join(releases, "current"));
    }
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
