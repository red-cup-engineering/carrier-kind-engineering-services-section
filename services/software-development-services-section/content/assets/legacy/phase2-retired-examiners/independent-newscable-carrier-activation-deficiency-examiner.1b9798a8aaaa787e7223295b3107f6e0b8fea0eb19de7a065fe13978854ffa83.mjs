#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { ROOT, contentRecord, digest, timestamp, writeJsonOutput } from "../lib/canonical.mjs";

export const NEWSCABLE_ENTERPRISE = "urn:ame:newscable-source-broker";
export const NEWSCABLE_ACTOR = "https://newscable-source-broker.invalid/activitypub/actor";
export const KOIOS_OWNER = "urn:ame:koios-news-service-section";
export const KOIOS_OWNER_ACTOR = "https://koios-news-service-section.invalid/activitypub/actor";

function workspaceRoot() {
  let cursor = ROOT;
  while (dirname(cursor) !== cursor) {
    if (existsSync(join(cursor, "AGENTS.md")) && existsSync(join(cursor, "lib/emsenn"))) return cursor;
    cursor = dirname(cursor);
  }
  throw new Error("workspace settlement law is not discoverable");
}

function filesBelow(root, suffix = ".jsonl") {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesBelow(path, suffix) : entry.name.endsWith(suffix) ? [path] : [];
  });
}

function recordsBelow(root) {
  return filesBelow(root).sort().flatMap((path) => readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => ({ path, value: JSON.parse(line) })));
}

function importWitness(root) {
  const entry = join(root, "src/contract-source-bundles.mjs");
  const run = spawnSync(process.execPath, ["--input-type=module", "--eval", `import(${JSON.stringify(pathToFileURL(entry).href)})`], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 15_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const stderr = String(run.stderr ?? "");
  return {
    exitCode: run.status,
    signal: run.signal,
    passed: run.status === 0,
    errorCode: stderr.includes("ERR_MODULE_NOT_FOUND") ? "ERR_MODULE_NOT_FOUND" : run.status === 0 ? null : "unclassified-import-failure",
    missingPackage: stderr.includes("@emsenn/producing-content") ? "@emsenn/producing-content" : null,
    stderrDigest: digest(stderr),
  };
}

function liveSolicitationFailures(root) {
  const records = recordsBelow(root);
  return records.flatMap(({ path, value }) => {
    const provider = (value.providers ?? []).find((item) => item.actor === NEWSCABLE_ENTERPRISE);
    const rejection = (value.rejections ?? []).find((item) => item.actor === NEWSCABLE_ENTERPRISE);
    if (!provider || !String(rejection?.reason ?? "").includes("ERR_MODULE_NOT_FOUND")
      || !String(rejection.reason).includes("@emsenn/producing-content")) return [];
    return [{
      round: value.id,
      recordedAt: value.recordedAt ?? null,
      advertisement: provider.advertisement,
      solicitation: provider.solicitation,
      errorCode: "ERR_MODULE_NOT_FOUND",
      missingPackage: "@emsenn/producing-content",
      reasonDigest: digest(rejection.reason),
      sourcePath: path,
    }];
  });
}

function check(id, passed, evidence = []) { return { id, passed: passed === true, evidence }; }

export function examineNewscableCarrierActivationDeficiency(recordedAt = new Date().toISOString()) {
  const workspace = workspaceRoot();
  const brokerRoot = join(workspace, "lib/emsenn/services/561-group/services/rsc-quiescent/services/koios-news/services/newscable-source-broker");
  const ownerRoot = resolve(brokerRoot, "../..");
  const brokerPackagePath = join(brokerRoot, "package.json");
  const brokerSourcePath = join(brokerRoot, "src/contract-source-bundles.mjs");
  const ownerResearchPath = join(ownerRoot, "src/contract-admissible-research-packet.mjs");
  const brokerPackage = JSON.parse(readFileSync(brokerPackagePath, "utf8"));
  const brokerSource = readFileSync(brokerSourcePath, "utf8");
  const ownerResearch = readFileSync(ownerResearchPath, "utf8");
  const declaredDependency = brokerPackage.dependencies?.["@emsenn/producing-content"];
  const dependencySourceRoot = typeof declaredDependency === "string" && declaredDependency.startsWith("link:")
    ? resolve(brokerRoot, declaredDependency.slice("link:".length)) : null;
  const liveDependencyRoot = join(brokerRoot, "node_modules/@emsenn/producing-content");
  const admissions = recordsBelow(join(brokerRoot, "data/carrier-admissions"))
    .map(({ value, path }) => ({ ...value, sourcePath: path }))
    .filter((item) => item.type === "PortableNodeCarrierInstallationReceipt" && item.actor === NEWSCABLE_ACTOR)
    .sort((left, right) => String(left.recordedAt).localeCompare(String(right.recordedAt)));
  const admission = admissions.at(-1);
  const stagedRoot = typeof admission?.targetRoot === "string" ? resolve(admission.targetRoot) : null;
  const lmtRoot = join(workspace, "lib/emsenn/services/board-of-directors/services/executive-office/services/leader-movement-team/data/state/solicitations");
  const failures = liveSolicitationFailures(lmtRoot);
  const liveImport = importWitness(brokerRoot);
  const stagedImport = stagedRoot && existsSync(stagedRoot) ? importWitness(stagedRoot) : null;
  const operations = brokerPackage?.["x-agentic-metro-enterprise"]?.["operation-catalog"] ?? {};
  const checks = [
    check("newscable-is-a-purpose-bearing-provider-required-by-koios-news", brokerPackage?.["x-agentic-metro-enterprise"]?.["node-id"] === "newscable-source-broker"
      && /current evidence must be an exact SourceBundleDelivery from the separately contracted Newscable provider/iu.test(ownerResearch)
      && ownerResearch.includes(NEWSCABLE_ACTOR), [digest(brokerPackage), digest(ownerResearch), brokerPackagePath, ownerResearchPath]),
    check("declared-producing-content-source-exists-but-live-resolution-is-absent", typeof declaredDependency === "string"
      && declaredDependency.startsWith("link:") && dependencySourceRoot !== null && existsSync(join(dependencySourceRoot, "package.json"))
      && existsSync(liveDependencyRoot) === false && brokerSource.includes('from "@emsenn/producing-content/cable"'),
    [declaredDependency, dependencySourceRoot, liveDependencyRoot, digest(brokerSource)]),
    check("live-broker-import-fails-at-the-declared-dependency-boundary", liveImport.passed === false
      && liveImport.exitCode !== 0 && liveImport.errorCode === "ERR_MODULE_NOT_FOUND"
      && liveImport.missingPackage === "@emsenn/producing-content", [liveImport]),
    check("two-independent-live-leader-movement-solicitations-observe-the-same-startup-failure", failures.length >= 2
      && new Set(failures.map((item) => item.solicitation)).size >= 2
      && failures.every((item) => item.errorCode === "ERR_MODULE_NOT_FOUND"), failures),
    check("accepted-portable-carrier-is-staged-executable-and-explicitly-not-deployed", admission?.provider === "urn:ame:portable-node-carrier-service"
      && admission.deployment === false && admission.publicIngress === false && admission.networkAccess === false
      && admission.credentialAccess === false && admission.externalSpend === false
      && stagedRoot !== null && stagedRoot.startsWith("/tmp/") && stagedImport?.passed === true,
    [admission, stagedImport]),
    check("broker-advertises-procurement-but-no-live-activation-or-dependency-install-operation", operations["procure-portable-carrier"]?.contract === "portable-node-carrier-realization"
      && operations["activate-portable-carrier"] === undefined && operations["install-dependency"] === undefined
      && operations["select-runtime-carrier"] === undefined, [operations]),
  ];
  const qualified = checks.every((item) => item.passed);
  const activationClosed = existsSync(liveDependencyRoot) && liveImport.passed === true && failures.length >= 2;
  return contentRecord({
    type: "IndependentNewscableCarrierActivationDeficiencyExamination",
    examiner: "urn:mechanism:sdss-independent-newscable-carrier-activation-deficiency-examiner",
    affectedEnterprise: NEWSCABLE_ENTERPRISE,
    affectedProviderActor: NEWSCABLE_ACTOR,
    ownerEnterprise: KOIOS_OWNER,
    ownerBoundaryActor: KOIOS_OWNER_ACTOR,
    purpose: "supply immutable current-source claim-state bundles to Koios News research-packet formation",
    declaredDependency,
    dependencySourceRoot,
    liveDependencyRoot,
    liveImportWitness: liveImport,
    stagedCarrier: admission ? {
      receiptType: admission.type,
      proposedProduct: admission.proposedProduct,
      snapshotDigest: admission.snapshotDigest,
      targetRoot: admission.targetRoot,
      artifactCount: admission.artifactCount,
      byteLength: admission.byteLength,
      deployment: admission.deployment,
      publicIngress: admission.publicIngress,
      importWitness: stagedImport,
      receiptDigest: digest(admission),
    } : null,
    liveSolicitationFailures: failures,
    currentResolution: { liveDependencyPresent: existsSync(liveDependencyRoot), liveImportPassed: liveImport.passed, historicalFailureCount: failures.length },
    checks,
    disposition: activationClosed
      ? "close-newscable-live-carrier-activation-deficiency-after-live-import-resolution"
      : qualified
      ? "qualify-newscable-live-carrier-activation-deficiency-for-owner-response"
      : "withhold-newscable-live-carrier-activation-deficiency",
    allowedOwnerResponses: ["activate-accepted-carrier", "install-declared-dependency", "tender-exact-repair", "refuse-with-reason", "question-demand"],
    nonclaims: ["successful post-resolution customer solicitation", "authority to deploy or activate the accepted carrier", "authority to modify Koios News or Newscable", "customer usefulness", "public ingress", "network or credential authority", "software-development award", "standing campaign completion"],
    customerMutation: false,
    foreignMutation: false,
    externalSpend: 0,
    recordedAt,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeJsonOutput(examineNewscableCarrierActivationDeficiency(timestamp()));
}
