import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assayTargetIsolation } from "../scripts/cold-red-gate-preflight.mjs";
import { ACTOR, CONTRACT, inspectTarget, invokeTarget, settle } from "../src/service.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const CUSTOMER = "urn:actor:test-customer";

/**
 * Live target execution shells out to the fixed Bubblewrap isolation
 * executables and actually creates an unprivileged user namespace. Some
 * hosts (kernel/AppArmor policy) refuse that regardless of whether the
 * `bwrap` binary is installed. Probe the real assay once per test rather
 * than assuming, and skip naming the exact reported problem when it fails.
 * @returns {{available: boolean, reason?: string}}
 */
function bubblewrapIsolationAvailability() {
  const assay = assayTargetIsolation();
  return assay.ready ? { available: true } : { available: false, reason: assay.problem };
}

function ledger() {
  const categories = new Map();
  return {
    records(category) { return [...(categories.get(category) ?? [])]; },
    async record({ category, record }) {
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(record);
      return { recorded: true };
    },
  };
}

function targetFixture(bin = { "receive-pulse": "./receive-pulse.mjs" }, entry = "process.stdout.write('{}');\n", runtimeFiles = undefined) {
  const root = mkdtempSync(join(tmpdir(), "scheduled-bin-target-"));
  const packageRoot = join(root, "target");
  mkdirSync(packageRoot);
  writeFileSync(join(packageRoot, "receive-pulse.mjs"), entry);
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ name: "@example/receive-pulse", type: "module", bin, ...(runtimeFiles === undefined ? {} : { scheduledActivityDelivery: { runtimeFiles } }) }));
  return { root, packageRoot, target: { packageRoot, actor: "urn:actor:test-target", operation: "receive-pulse", contract: "urn:contract:test-pulse" } };
}

function solicitation(target, suffix = "plain-bin") {
  const request = {
    type: "ScheduledActivityDeliveryRequest",
    executionMode: "dry-run",
    schedule: { intervalSeconds: 60, firstDueAt: "2026-08-09T12:00:00.000Z", maxDeliveries: 1 },
    target,
    timeoutMilliseconds: 5000,
    retry: { maxAttempts: 1 },
    deliveryCapabilityId: "urn:capability:test-pulse",
    activityTemplate: { "@context": CONTEXT, type: "Create", target: target.actor, object: { type: "TestPulse" } },
  };
  const sourceActivity = { "@context": CONTEXT, id: `urn:activity:source:${suffix}`, type: "Create", actor: CUSTOMER, target: ACTOR, object: { type: "Note", attachment: [request] } };
  return { "@context": CONTEXT, id: `urn:activity:solicitation:${suffix}`, type: "Offer", actor: CUSTOMER, target: ACTOR, object: { type: "ServiceSolicitation", sourceActivity } };
}

function invocation(offer) {
  const capability = {
    type: "Capability", issuer: CUSTOMER, holder: ACTOR, invocationTarget: ACTOR, parentOffer: offer.id,
    allowedActions: ["invoke-service", ...offer.object.effects],
    attenuation: { requestDigest: offer.object.requestDigest, scheduleId: offer.object.scheduleId },
    singleUse: true, expiresAt: "2026-08-09T13:00:00.000Z",
  };
  return { "@context": CONTEXT, id: "urn:activity:invoke:plain-bin", type: "Accept", actor: CUSTOMER, target: ACTOR,
    object: { type: "ServiceContract", contract: CONTRACT, offer, capability } };
}

test("a standard package.json bin is the complete operation advertisement", async () => {
  const fixture = targetFixture();
  const journal = ledger();
  const result = await settle(solicitation(fixture.target), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: journal, root: fixture.root });

  assert.equal(result.type, "Offer");
  assert.deepEqual(Object.keys(result.object.targetBinding).sort(), ["packageDigest", "selectedBinDigest"]);
  assert.match(result.object.targetBinding.packageDigest, /^ni:\/\/\/sha-256;/u);
  assert.match(result.object.targetBinding.selectedBinDigest, /^ni:\/\/\/sha-256;/u);
});

test("a bin importing mutable runtime code is not schedulable", async () => {
  const fixture = targetFixture(undefined, "import { response } from './response.mjs';\nprocess.stdout.write(response);\n");
  writeFileSync(join(fixture.packageRoot, "response.mjs"), "export const response = '{}';\n");
  const result = await settle(solicitation(fixture.target, "imported-bin"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: ledger(), root: fixture.root });
  assert.equal(result.type, "Question");
  assert.match(result.object.missing.join(" "), /self-contained/u);
});

test("a declared relative runtime file is bound into the operation closure", async () => {
  const fixture = targetFixture(undefined, "import { response } from './response.mjs';\nprocess.stdout.write(response);\n", { "receive-pulse": ["./response.mjs"] });
  writeFileSync(join(fixture.packageRoot, "response.mjs"), "export const response = '{}';\n");
  const result = await settle(solicitation(fixture.target, "declared-import"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: ledger(), root: fixture.root });
  assert.equal(result.type, "Offer");
  assert.match(result.object.targetBinding.runtimeClosureDigest, /^ni:\/\/\/sha-256;/u);
});

test("a declared module may use import.meta without expanding its runtime closure", async () => {
  const fixture = targetFixture(undefined, "import { response } from './response.mjs';\nprocess.stdout.write(`${response}:${import.meta.url}`);\n", { "receive-pulse": ["./response.mjs"] });
  writeFileSync(join(fixture.packageRoot, "response.mjs"), "export const response = '{}';\n");
  const result = await settle(solicitation(fixture.target, "declared-import-meta"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: ledger(), root: fixture.root });
  assert.equal(result.type, "Offer");
  assert.match(result.object.targetBinding.runtimeClosureDigest, /^ni:\/\/\/sha-256;/u);
});

test("a declared closure still rejects bare and dynamic imports", async () => {
  const bare = targetFixture(undefined, "import value from 'mutable-package';\nprocess.stdout.write(value);\n", { "receive-pulse": ["./declared.mjs"] });
  const dynamic = targetFixture(undefined, "await import('./response.mjs');\n", { "receive-pulse": ["./response.mjs"] });
  writeFileSync(join(dynamic.packageRoot, "response.mjs"), "export const response = '{}';\n");
  writeFileSync(join(bare.packageRoot, "declared.mjs"), "export const declared = true;\n");
  const bareResult = await settle(solicitation(bare.target, "bare-import"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: ledger(), root: bare.root });
  const dynamicResult = await settle(solicitation(dynamic.target, "dynamic-import"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: ledger(), root: dynamic.root });
  assert.equal(bareResult.type, "Question");
  assert.match(bareResult.object.missing.join(" "), /bare import/u);
  assert.equal(dynamicResult.type, "Question");
  assert.match(dynamicResult.object.missing.join(" "), /undeclared or dynamic/u);
});

test("acceptance rejects drift in a declared relative runtime file", async () => {
  const fixture = targetFixture(undefined, "import { response } from './response.mjs';\nprocess.stdout.write(response);\n", { "receive-pulse": ["./response.mjs"] });
  writeFileSync(join(fixture.packageRoot, "response.mjs"), "export const response = '{}';\n");
  const journal = ledger();
  const offer = await settle(solicitation(fixture.target, "declared-import-drift"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: journal, root: fixture.root });
  writeFileSync(join(fixture.packageRoot, "response.mjs"), "export const response = '{\\\"changed\\\":true}';\n");
  const result = await settle(invocation(offer), "invoke-service", "2026-08-09T12:00:01.000Z", { ledger: journal, root: fixture.root });
  assert.equal(result.type, "Reject");
  assert.match(result.object.reason, /target binding/u);
});

test("live execution refuses drift in a declared relative runtime file", async () => {
  const fixture = targetFixture(undefined, "import { response } from './response.mjs';\nprocess.stdout.write(response);\n", { "receive-pulse": ["./response.mjs"] });
  writeFileSync(join(fixture.packageRoot, "response.mjs"), "export const response = '{}';\n");
  const inspected = inspectTarget(fixture.target);
  writeFileSync(join(fixture.packageRoot, "response.mjs"), "export const response = '{\\\"changed\\\":true}';\n");
  const result = await invokeTarget({ request: { executionMode: "live", target: fixture.target }, targetBinding: { packageDigest: inspected.packageDigest, selectedBinDigest: inspected.selectedBinDigest, runtimeClosureDigest: inspected.runtimeClosureDigest } }, { type: "Create" }, { root: fixture.root });
  assert.equal(result.problem, "target-runtime-closure-changed");
});

test("live execution refuses an imported bin before capture or process launch", async () => {
  const fixture = targetFixture(undefined, "require('./mutable.cjs');\n");
  const result = await invokeTarget({ request: { executionMode: "live", target: fixture.target }, targetBinding: {} }, { type: "Create" }, { root: fixture.root });
  assert.equal(result.problem, "target-runtime-inspection-failed");
  assert.match(result.stderr, /self-contained/u);
});

test("live execution admits the exact no-import bin class before isolation", async () => {
  const fixture = targetFixture();
  const inspected = inspectTarget(fixture.target);
  const result = await invokeTarget({ request: { executionMode: "live", timeoutMilliseconds: 1, target: fixture.target }, targetBinding: { packageDigest: inspected.packageDigest, selectedBinDigest: inspected.selectedBinDigest } }, { type: "Create" }, { root: fixture.root });
  assert.notEqual(result.problem, "target-runtime-inspection-failed");
});

test("live execution overlays committed files in a Bubblewrap read-only root with only fixed writable roots", async (t) => {
  const isolationAvailability = bubblewrapIsolationAvailability();
  if (!isolationAvailability.available) { t.skip(isolationAvailability.reason); return; }
  const fixture = targetFixture(undefined, "process.stdout.write('{}');\n");
  const outputRoot = join(fixture.root, "output");
  const replayRoot = join(fixture.root, "replay");
  mkdirSync(outputRoot); mkdirSync(replayRoot);
  const previous = {
    targetAllowlist: process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST,
    allowlist: process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST,
    output: process.env.KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT,
    replay: process.env.KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT,
  };
  try {
    process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST = "KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT,KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT";
    process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST = "KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT,KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT";
    process.env.KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT = outputRoot;
    process.env.KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT = replayRoot;
    const inspected = inspectTarget(fixture.target);
    const result = await invokeTarget({ request: { executionMode: "live", timeoutMilliseconds: 5_000, target: fixture.target }, targetBinding: { packageDigest: inspected.packageDigest, selectedBinDigest: inspected.selectedBinDigest } }, { type: "Create" }, { root: fixture.root });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.problem, null);
  } finally {
    for (const [name, value] of Object.entries({ SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST: previous.targetAllowlist, SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST: previous.allowlist, KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT: previous.output, KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT: previous.replay })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("Bubblewrap hides unadmitted home files while exposing admitted input and fixed writable roots", async (t) => {
  const isolationAvailability = bubblewrapIsolationAvailability();
  if (!isolationAvailability.available) { t.skip(isolationAvailability.reason); return; }
  const homeFixture = mkdtempSync(join(homedir(), ".scheduled-bwrap-boundary-"));
  const admittedPath = join(homeFixture, "admitted.txt"), hiddenPath = join(homeFixture, "hidden.txt"),
    outputRoot = join(homeFixture, "output"), replayRoot = join(homeFixture, "replay");
  writeFileSync(admittedPath, "admitted\n"); writeFileSync(hiddenPath, "secret\n");
  mkdirSync(outputRoot); mkdirSync(replayRoot);
  const entry = `const fs=process.getBuiltinModule("node:fs");fs.writeFileSync(process.env.TEST_OUTPUT_ROOT+"/report.json",JSON.stringify({admitted:fs.readFileSync(process.env.TEST_ADMITTED_PATH,"utf8"),hidden:fs.existsSync(${JSON.stringify(hiddenPath)})}));process.stdout.write("{}");\n`,
    fixture = targetFixture(undefined, entry), names = {
      SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST: "TEST_ADMITTED_PATH,TEST_OUTPUT_ROOT,TEST_REPLAY_ROOT",
      SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST: "TEST_OUTPUT_ROOT,TEST_REPLAY_ROOT",
      TEST_ADMITTED_PATH: admittedPath, TEST_OUTPUT_ROOT: outputRoot, TEST_REPLAY_ROOT: replayRoot,
    }, previous = Object.fromEntries(Object.keys(names).map((name) => [name, process.env[name]]));
  try {
    Object.assign(process.env, names);
    const inspected = inspectTarget(fixture.target), result = await invokeTarget({ request: { executionMode: "live", timeoutMilliseconds: 5_000, target: fixture.target }, targetBinding: { packageDigest: inspected.packageDigest, selectedBinDigest: inspected.selectedBinDigest } }, { type: "Create" }, { root: fixture.root });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(outputRoot, "report.json"), "utf8")), { admitted: "admitted\n", hidden: false });
  } finally {
    for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    rmSync(fixture.root, { recursive: true, force: true }); rmSync(homeFixture, { recursive: true, force: true });
  }
});

test("live isolation rejects extra writable names and broad writable roots before target execution", async (t) => {
  const isolationAvailability = bubblewrapIsolationAvailability();
  if (!isolationAvailability.available) { t.skip(isolationAvailability.reason); return; }
  const fixture = targetFixture(), root = join(fixture.root, "writable"); mkdirSync(root);
  const variables = ["SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST", "SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST", "TEST_OUTPUT_ROOT", "EXTRA_ROOT"],
    previous = Object.fromEntries(variables.map((name) => [name, process.env[name]]));
  try {
    const inspected = inspectTarget(fixture.target), registration = { request: { executionMode: "live", timeoutMilliseconds: 5_000, target: fixture.target }, targetBinding: { packageDigest: inspected.packageDigest, selectedBinDigest: inspected.selectedBinDigest } };
    process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST = "TEST_OUTPUT_ROOT";
    process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST = "TEST_OUTPUT_ROOT,EXTRA_ROOT";
    process.env.TEST_OUTPUT_ROOT = root; process.env.EXTRA_ROOT = root;
    const extra = await invokeTarget(registration, { type: "Create" }, { root: fixture.root });
    assert.equal(extra.problem, "target-runtime-isolation-unavailable");
    assert.match(extra.stderr, /not admitted/u);
    process.env.SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST = "TEST_OUTPUT_ROOT";
    process.env.TEST_OUTPUT_ROOT = "/";
    const broad = await invokeTarget(registration, { type: "Create" }, { root: fixture.root });
    assert.equal(broad.problem, "target-runtime-isolation-unavailable");
    assert.match(broad.stderr, /not broad host directories/u);
  } finally {
    for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("the standard string bin shorthand is addressed by the unscoped package name", async () => {
  const fixture = targetFixture("./receive-pulse.mjs");
  const result = await settle(solicitation(fixture.target, "string-bin"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: ledger(), root: fixture.root });
  assert.equal(result.type, "Offer");
});

test("an operation absent from package.json bin is not schedulable", async () => {
  const fixture = targetFixture();
  const result = await settle(solicitation({ ...fixture.target, operation: "unadvertised" }, "missing-bin"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: ledger(), root: fixture.root });
  assert.equal(result.type, "Question");
  assert.match(result.object.missing.join(" "), /no package bin entry/u);
});

test("acceptance rejects a selected bin whose bytes changed after the offer", async () => {
  const fixture = targetFixture();
  const journal = ledger();
  const offer = await settle(solicitation(fixture.target, "changed-bin"), "solicit-service", "2026-08-09T12:00:00.000Z", { ledger: journal, root: fixture.root });
  writeFileSync(join(fixture.packageRoot, "receive-pulse.mjs"), "process.stdout.write('{\"changed\":true}');\n");

  const result = await settle(invocation(offer), "invoke-service", "2026-08-09T12:00:01.000Z", { ledger: journal, root: fixture.root });
  assert.equal(result.type, "Reject");
  assert.equal(result.object.code, "invalid-contract");
  assert.match(result.object.reason, /target binding/u);
});
