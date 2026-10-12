#!/usr/bin/env node
// Executes ready duties on the rail at ops.561.group without a frontier
// model: read the frontier, classify each duty, ask the free-lane inference
// market for the closed work order, let the fabrication line's translator
// gate it, fabricate and publish the package, and discharge the duty with the
// receipt as evidence. Every step is an existing house operation; this app
// only composes them.
import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { classifyWorkDemand } from "@red-cup-engineering/classify-work-demand-service";
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { fabricateMarkdownJsnodeOperationPackage } from "@red-cup-engineering/fabricate-markdown-jsnode-operation-package-service";
import { isMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { extractExecutableBehaviors } from "@red-cup-engineering/javascript-computer";
import { workspaceDuplication } from "@red-cup-engineering/jsnode-engineering-cli";
import { createOpsRail, loadOpsClientEnvironment } from "@red-cup-engineering/ops-561-group-mcp-gateway-service/rail-client";
import { resolveSetOfMarkdownLinkTargets } from "@red-cup-engineering/resolve-markdown-link-target-service/resolve-set-of-markdown-link-targets";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { translateMarkdownJsnodeOperationPackageSpecification } from "@red-cup-engineering/jsnode-package-services-section/translate-markdown-jsnode-operation-package-specification";
import { JSNODE_PACKAGE_DIALECT_EXAMPLE } from "@red-cup-engineering/jsnode-package-services-section/jsnode-package-dialect";
import { writeTextFile } from "@red-cup-engineering/write-text-file-service";
import { executeSoftwareMission } from "@red-cup-engineering/software-mission-execution-service";
import {
  candidateCarrierPaths, dischargeOfCarrierRepair, formCarrierSectionReplacementDemand, isWritableCarrierPath,
  parseCarrierFalsehoodDutyText, sectionReplacementFailures, smallestEnclosingMarkdownSection, spliceMarkdownSection,
} from "../src/carrier-falsehood-duty.mjs";
import { handOfDuty, MISSING_CAPABILITY_SCOPE_PREFIX } from "../src/duty-hand.mjs";
import { dischargeReadyDuties, planOrDischargeDuty } from "../src/duty-discharge.mjs";
import {
  dischargeOfFabrication, duplicateCapabilityRefusal, formDutyWorkOrderDemand, isDuplicateRefusal,
  nameTakenRefusal, resolveSectionDirectory, sectionDirectoryNameOfDutyText, workOrderOfInferenceResult,
} from "../src/duty-work-order-demand.mjs";

const SECTION_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REGISTRY = "https://registry.561.group";
const DEFAULT_OPS_CLIENT_ENV_PATH = join(homedir(), ".config", "561-group", "ops-mcp-client.env");
export const OBJECT_KIND = "agent-work.duty-execution";
export const ELIGIBLE_SCOPE_PREFIX = MISSING_CAPABILITY_SCOPE_PREFIX;
const UNSUCCESSFUL_OUTCOMES = new Set(["obstructed", "refused", "duplicate-refused", "failed"]);
let inferenceRuntime;

/** Provider selection is an effect adapter: importing the shared work model
 * must not initialize an inference operation. */
async function loadInferenceRuntime() {
  inferenceRuntime ??= Promise.all([
    import("@red-cup-engineering/inference-dispatch-service/inference-dispatch"),
    import("@red-cup-engineering/inference-dispatch-service/consideration"),
  ]).then(([dispatch, consideration]) => Object.freeze({
    dispatch: dispatch.dispatchInference,
    recordOutcome: dispatch.recordInferenceOutcome,
    customer: dispatch.INFERENCE_WORK_CUSTOMER,
    considerationPolicy: consideration.resolutionCreditPolicy(),
  }));
  return inferenceRuntime;
}

/** Whether a completed runner summary reports a refusal, failed effect, or
 * unresolved obstruction. Intentional previews remain a successful advance. */
export function exitCodeOfReadyDutiesSummary(summary) {
  return summary.outcomes.some(({ outcome }) => UNSUCCESSFUL_OUTCOMES.has(outcome))
    || summary.inferenceOutcomes?.some(({ outcome }) => outcome === "receiver-outcome-pending") ? 1 : 0;
}
// Directory names a section walk never descends into or offers as a birth destination — the same
// exclusion set jsnode-engineering-cli's own workspace walk applies (its `EXCLUDED_DIRECTORY_NAMES`).
const EXCLUDED_DIRECTORY_NAMES = new Set([".git", ".tmp", ".venv", "dist", "legacy", "node_modules", "triage"]);

/**
 * Executes up to `limit` eligible ready duties and returns one outcome per duty considered.
 * Every collaborator is injectable so the composition is testable without a network.
 * @param {object} options
 * @param {{call: (tool: string, input?: object) => Promise<unknown>}} options.rail - the ops rail client.
 * @param {string} options.destinationParent - a directory whose `services/` receives born packages,
 *   used only for a duty whose text names no resolvable section directory.
 * @param {string} options.dialectExample - an admitted work order, verbatim.
 * @param {{id: string, revision: string}} options.producer
 * @param {object} [options.journal] - a semantic record journal; when absent no receipt row is written.
 * @param {number} [options.limit]
 * @param {number} [options.attempts] - provider attempts per duty, each fed the previous refusal.
 * @param {string} [options.registry]
 * @param {readonly string[]} [options.candidateSectionDirectories] - one directory listing, fed to the
 *   pure `resolveSectionDirectory` per duty; empty means every duty falls back to `destinationParent`.
 * @param {Function} [options.dispatch] - inference dispatch.
 * @param {Function} [options.recordOutcome] - records an assayed delivery with the provider-selection observer.
 * @param {Function} [options.translate] - the line's translator (the gate).
 * @param {Function} [options.fabricate] - the line's fabricator.
 * @param {Function} [options.classify] - work-demand classification.
 * @param {Function} [options.write] - text file writer.
 * @param {Function} [options.ensureDirectory] - creates a directory (recursively) if absent.
 * @param {Function} [options.checkNameTaken] - `({packageName, registry}) => Promise<string|null>`;
 *   returns the published version when the name is already taken, else null.
 * @param {Function} [options.checkDuplication] - `({operationText, artifactId}) => Promise<readonly string[]>`;
 *   returns the consumer-backed package names the candidate operation duplicates, else `[]`.
 * @param {string} [options.repositoryRoot] - confines the derivation hand's script search and the
 *   carrier-falsehood hand's writable-carrier check; default the checkout root above `SECTION_ROOT`.
 * @param {Function} [options.run] - runs one admitted JavascriptNodeCommandExecutionRequest@1.
 * @param {Function} [options.resolveLinks] - `(text, {carrierPath, root}) => Promise<entries>` (the carrier-falsehood hand).
 * @param {Function} [options.carrierExists] - `(path) => boolean` (the carrier-falsehood hand).
 * @param {Function} [options.readCarrierText] - `(path) => Promise<string>` (the carrier-falsehood hand).
 * @param {string|null} [options.deterministicRoot] - checkout root for the deterministic script hand.
 * @param {string} [options.deterministicScope] - one ready scope; confines the whole invocation.
 * @param {boolean} [options.applyDeterministic] - permits repair and rail discharge for the script hand.
 * @param {Function} [options.discharge] - shared deterministic discharge operation.
 * @param {Function} [options.planOrDischarge] - one-duty shared deterministic operation.
 * @param {() => Date} [options.now]
 * @param {string} [options.inquiryCustomerActor] - admitted market customer for inquiry execution.
 * @param {object} [options.inquiryConsiderationPolicy] - bounded acceptable consideration carried by every inquiry mission.
 * @returns {Promise<{considered: number, executed: number, discharged: number, outcomes: object[]}>}
 */
export async function executeReadyDuties({
  rail, destinationParent, dialectExample, producer, journal = null, publish = false, loadWorkContext = defaultLoadWorkContext, limit = 1, attempts = 2, registry = DEFAULT_REGISTRY,
  candidateSectionDirectories = [], repositoryRoot = repositoryRootOf(SECTION_ROOT),
  dispatch = null, recordOutcome = async () => Object.freeze({ outcome: "receiver-outcome-unavailable" }), executeInquiry = defaultExecuteInquiry, translate = translateMarkdownJsnodeOperationPackageSpecification,
  fabricate = fabricateMarkdownJsnodeOperationPackage, classify = classifyWorkDemand, write = writeTextFile,
  ensureDirectory = defaultEnsureDirectory, checkNameTaken = defaultCheckNameTaken, checkDuplication = defaultCheckDuplication,
  run = defaultRunCommand, resolveLinks = resolveSetOfMarkdownLinkTargets,
  carrierExists = existsSync, readCarrierText = defaultReadCarrierText,
  deterministicRoot = null, deterministicScope, applyDeterministic = false,
  discharge = dischargeReadyDuties, planOrDischarge = planOrDischargeDuty,
  inquiryCustomerActor = null, inquiryConsiderationPolicy = null,
  now = () => new Date(),
}) {
  const readout = await rail.call("agent-work-dispatch", { limit: 200 });
  const ready = dedupe((readout?.frontier ?? []).filter((item) => item.state === "ready"));
  const selectedReady = deterministicScope === undefined ? ready : ready.filter((duty) => duty.scope === deterministicScope);
  const outcomes = [];
  const inferenceOutcomes = [];
  const recordAssay = async (duty, result, outcome, assay) => {
    // A market refusal has no delivered product to accept or reject.
    if (!result?.workLot) return;
    const disposition = {
      workLot: result.workLot, provider: result.provider ?? null, taskClass: result.taskClass ?? null,
      selectedOffer: result.selectedOffer ?? null, receipt: result.receipt?.id ?? null, receiver: result.receiver ?? null, outcome,
      ...(result.configurationIdentity ? { configurationIdentity: result.configurationIdentity } : {}),
      ...(Number.isSafeInteger(result.durationMs) ? { durationMs: result.durationMs } : {}),
      ...(result.measuredResources?.resources ? { resources: result.measuredResources.resources } : {}),
    };
    const missing = ["workLot", "provider", "taskClass", "selectedOffer", "receipt", "receiver"]
      .filter((key) => typeof disposition[key] !== "string" || disposition[key].trim() === "");
    let evidence;
    try {
      if (missing.length) throw new Error(`delivery is missing ${missing.join(", ")}`);
      if (!journal) throw new Error("receiver assay has no durable journal");
      evidence = journal.record({
        category: "agent-work.inference-assay", recordedAt: now().toISOString(),
        record: { type: "DutyInferenceAssay", scope: duty.scope, producer, disposition, assay },
        charge: { support: outcome === "accepted", refutation: outcome === "refused" },
      }).id;
      if (typeof evidence !== "string" || !evidence) throw new Error("receiver assay journal returned no evidence identity");
      const observation = await recordOutcome({ ...disposition, evidence });
      if (observation?.outcome !== "receiver-outcome-recorded") throw new Error("observer did not confirm receiver outcome");
      inferenceOutcomes.push({ scope: duty.scope, disposition: { ...disposition, evidence }, observation });
    } catch (error) {
      // Keep the exact disposition available for retry; an observer outage must
      // not rerun an already completed fabrication or carrier write.
      inferenceOutcomes.push({
        scope: duty.scope, outcome: "receiver-outcome-pending", disposition: { ...disposition, ...(evidence ? { evidence } : {}) },
        assay, reason: String(error?.message ?? error),
      });
    }
  };
  if (deterministicScope !== undefined && selectedReady.length === 0) {
    outcomes.push(Object.freeze({
      scope: deterministicScope,
      outcome: "obstructed",
      obstruction: Object.freeze({ type: "agent-work.requested-scope-not-ready", scope: deterministicScope, requiredCapabilities: Object.freeze(["agent-work-dispatch"]) }),
      nextState: "awaiting-ready-duty",
    }));
  }
  let executed = 0;
  for (const duty of selectedReady) {
    if (executed >= limit) break;
    const demand = classify({ scope: duty.scope, text: duty.text });
    if (duty.deterministicExecution !== undefined || demand.lane === "script") {
      if (duty.deterministicExecution === undefined && deterministicRoot === null) {
        outcomes.push({ scope: duty.scope, lane: demand.lane, outcome: "skipped", reason: "script duties require deterministicRoot" });
        continue;
      }
      executed += 1;
      try {
        const result = await discharge({
          readout: { frontier: [duty] },
          root: deterministicRoot ?? repositoryRoot,
          binding: null,
          apply: applyDeterministic,
          limit: 1,
          scope: duty.scope,
          planOrDischargeFn: planOrDischarge,
          run,
          producer,
          admitDischargeFn: async (_binding, input) => rail.call("work-discharge-admit", input),
        });
        const dutyResult = result.duties[0];
        outcomes.push({
          scope: duty.scope,
          lane: demand.lane,
          outcome: dutyResult?.status === "applied" ? "discharged" : dutyResult?.status ?? "refused",
          deterministic: dutyResult,
        });
      } catch (error) {
        outcomes.push({ scope: duty.scope, lane: demand.lane, outcome: "failed", error: String(error?.message ?? error) });
      }
      continue;
    }
    const hand = handOfDuty(duty, demand);
    if (hand === null) {
      outcomes.push({
        scope: duty.scope, lane: demand.lane, outcome: "obstructed",
        obstruction: Object.freeze({ type: "agent-work.unroutable-duty", workType: demand.workType, lane: demand.lane, requiredCapabilities: Object.freeze([demand.workType]) }),
        nextState: "awaiting-qualified-work-hand",
      });
      continue;
    }
    executed += 1;
    if (hand === "inquiry") {
      const runtime = executeInquiry === defaultExecuteInquiry ? await loadInferenceRuntime() : null;
      outcomes.push(await executeInquiryDuty({ duty, demand, rail, destinationParent, repositoryRoot, readCarrierText, loadWorkContext, executeInquiry, inquiryCustomerActor: inquiryCustomerActor ?? runtime?.customer ?? "inference-work-customer", inquiryConsiderationPolicy: inquiryConsiderationPolicy ?? runtime?.considerationPolicy ?? Object.freeze({ zeroCashOnly: true }) }));
    } else if (hand === "missing-capability") {
      const runtime = dispatch === null ? await loadInferenceRuntime() : null;
      dispatch ??= runtime.dispatch;
      const seatedDestinationParent = await seatedDestinationParentFor({ duty, destinationParent, candidateSectionDirectories, ensureDirectory });
      outcomes.push(await executeOne({
        duty, demand, rail, destinationParent: seatedDestinationParent, dialectExample, producer, attempts, registry,
        dispatch, recordAssay, translate, fabricate, write, checkNameTaken, checkDuplication, now,
        publish, loadWorkContext, repositoryRoot, readCarrierText,
      }));
    } else if (hand === "derivation") {
      outcomes.push({ scope: duty.scope, lane: demand.lane, outcome: "observed", reason: "a prose-named diagnostic has no admitted exact operation and acceptance gate", at: now().toISOString() });
    } else {
      const runtime = dispatch === null ? await loadInferenceRuntime() : null;
      dispatch ??= runtime.dispatch;
      outcomes.push(await executeCarrierFalsehoodDuty({
        duty, demand, rail, producer, journal, attempts, repositoryRoot,
        dispatch, recordAssay, resolveLinks, write, carrierExists, readCarrierText, now,
      }));
    }
  }
  const summary = { considered: selectedReady.length, executed, discharged: outcomes.filter((outcome) => outcome.outcome === "discharged").length, obstructed: outcomes.filter((outcome) => outcome.outcome === "obstructed").length, outcomes };
  if (inferenceOutcomes.length) summary.inferenceOutcomes = inferenceOutcomes;
  if (journal) {
    journal.record({
      category: "agent-work.execute-ready-duties",
      recordedAt: now().toISOString(),
      record: { type: "ReadyDutiesExecution", producer, ...summary },
      charge: { support: summary.discharged > 0, refutation: summary.executed > summary.discharged },
    });
  }
  return summary;
}

/**
 * The destination parent for one duty: its named section directory when its text resolves to
 * exactly one candidate (its `services/` created if absent), otherwise the app-wide fallback.
 * @param {object} options
 * @param {{text?: string}} options.duty
 * @param {string} options.destinationParent - the app-wide fallback.
 * @param {readonly string[]} options.candidateSectionDirectories
 * @param {Function} options.ensureDirectory
 * @returns {Promise<string>}
 */
async function seatedDestinationParentFor({ duty, destinationParent, candidateSectionDirectories, ensureDirectory }) {
  const name = sectionDirectoryNameOfDutyText(duty.text);
  const resolved = name === null ? null : resolveSectionDirectory(name, candidateSectionDirectories);
  if (resolved === null) return destinationParent;
  await ensureDirectory(join(resolved, "services"));
  return resolved;
}

async function defaultLoadWorkContext({ duty, rail, destinationParent, repositoryRoot, readCarrierText }) {
  if (typeof duty.subject !== "string" || duty.subject.length === 0) throw new TypeError("duty.subject is required to retrieve its work records");
  const workItem = await rail.call("work-item", { id: duty.subject });
  if (!workItem || workItem.ok === false || workItem.isError === true) throw new Error("the rail did not return the work item's records");
  const root = resolve(repositoryRoot);
  const paths = new Set([
    join(root, "README.md"),
    join(root, ".claude/rules/org-layering.md"),
    join(root, ".claude/rules/import-stratification.md"),
  ]);
  const referenced = new Set();
  const collect = (value, depth = 0) => {
    if (depth > 12 || value === null || value === undefined) return;
    if (typeof value === "string") {
      const match = /^(?:(?:work-order|source|carrier):)?((?:lib\/|\.claude\/|\/)[^\n]*\.md)(?:#[^\n]*)?$/u.exec(value);
      if (match) {
        const path = resolve(root, match[1]);
        if (path.startsWith(root + sep)) referenced.add(path);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) collect(item, depth + 1);
    } else if (typeof value === "object") {
      for (const item of Object.values(value)) collect(item, depth + 1);
    }
  };
  collect(workItem);
  collect(duty);
  for (const path of referenced) paths.add(path);
  let section = resolve(destinationParent);
  while (section.startsWith(root + sep)) {
    paths.add(join(section, "README.md"));
    section = dirname(section);
  }
  const records = [];
  const unavailable = [];
  for (const path of paths) {
    try {
      const text = await readCarrierText(path);
      records.push({ locator: path, text });
    } catch (error) {
      if (referenced.has(path) || path.startsWith(join(root, ".claude") + sep)) throw error;
      unavailable.push({ locator: path, code: error.code ?? "READ_FAILED" });
    }
  }
  return { duty, workItem, records, unavailable, destinationParent, execution: "development" };
}

/** Form an immutable, read-only mission from one ready inquiry. The answer is
 * evidence for a later binding; it never discharges this duty. */
export function inquiryMissionOfDuty({ duty, workContext, repositoryRoot, considerationPolicy = resolutionCreditPolicy() }) {
  if (typeof duty.subject !== "string" || duty.subject.length === 0) throw new TypeError("inquiry duty requires its admitted subject");
  if (typeof duty.intent !== "string" || duty.intent.length === 0) throw new TypeError("inquiry duty requires its structured intent");
  const root = resolve(repositoryRoot);
  const readablePaths = Object.freeze((workContext.records ?? []).flatMap(({ locator }) => {
    if (typeof locator !== "string") return [];
    const path = resolve(locator);
    return path.startsWith(root + sep) ? [path.slice(root.length + 1)] : [];
  }));
  return Object.freeze({
    id: `urn:ame:agent-work-inquiry:${encodeURIComponent(duty.subject)}:${encodeURIComponent(duty.scope)}`,
    objective: duty.text ?? duty.scope,
    territory: root,
    sourceDescriptor: Object.freeze({ kind: "local-territory", path: root }),
    focusPaths: readablePaths,
    readablePaths,
    writablePaths: Object.freeze([]),
    workType: "inquiry",
    requiredCapabilities: Object.freeze(["inquiry"]),
    inferenceWorkType: "inquiry",
    inferenceRequiredCapabilities: Object.freeze(["inquiry"]),
    considerationPolicy,
    taskClass: "agent-work-inquiry",
    constraints: Object.freeze([
      `admitted-subject:${duty.subject}`,
      `structured-intent:${duty.intent}`,
      `work-scope:${duty.scope}`,
      "read-only interpretation; do not mutate the customer territory or discharge the work scope",
    ]),
  });
}

async function defaultExecuteInquiry(mission, execution) {
  return executeSoftwareMission(mission, execution);
}

async function executeInquiryDuty({ duty, demand, rail, destinationParent, repositoryRoot, readCarrierText, loadWorkContext, executeInquiry, inquiryCustomerActor, inquiryConsiderationPolicy }) {
  let workContext;
  try {
    workContext = await loadWorkContext({ duty, rail, destinationParent, repositoryRoot, readCarrierText });
  } catch (error) {
    return { scope: duty.scope, lane: demand.lane, outcome: "refused", code: "WORK_CONTEXT_UNAVAILABLE", message: String(error?.message ?? error) };
  }
  const mission = inquiryMissionOfDuty({ duty, workContext, repositoryRoot, considerationPolicy: inquiryConsiderationPolicy });
  try {
    const result = await executeInquiry(mission, { customerActor: inquiryCustomerActor });
    const receipt = result?.executionReceipt;
    if (result?.outcome?.answered === true && typeof result.outcome.inquiryResult === "string" && result.outcome.inquiryResult.length > 0) {
      return Object.freeze({
        scope: duty.scope, lane: demand.lane, outcome: "interpreted", subject: duty.subject, intent: duty.intent,
        receipt, answer: result.outcome.inquiryResult, answerArtifact: result.outcome?.trajectoryFingerprint ?? null,
        nextState: "awaiting-operation-binding",
      });
    }
    return Object.freeze({
      scope: duty.scope, lane: demand.lane, outcome: "obstructed", subject: duty.subject, intent: duty.intent, receipt,
      obstruction: Object.freeze({ type: "agent-work.inquiry-unresolved", requiredCapabilities: Object.freeze(["inquiry"]), mission: mission.id, result: result?.outcome ?? null }),
      nextState: "awaiting-qualified-inquiry-provider",
    });
  } catch (error) {
    return Object.freeze({
      scope: duty.scope, lane: demand.lane, outcome: "obstructed", subject: duty.subject, intent: duty.intent,
      obstruction: Object.freeze({ type: "agent-work.inquiry-provider-unavailable", requiredCapabilities: Object.freeze(["inquiry"]), mission: mission.id, message: String(error?.message ?? error) }),
      nextState: "awaiting-qualified-inquiry-provider",
    });
  }
}

async function executeOne({ duty, demand, rail, destinationParent, dialectExample, producer, attempts, registry, dispatch, recordAssay, translate, fabricate, write, checkNameTaken, checkDuplication, now, publish, loadWorkContext, repositoryRoot, readCarrierText }) {
  let workContext;
  try {
    workContext = await loadWorkContext({ duty, rail, destinationParent, repositoryRoot, readCarrierText });
  } catch (error) {
    return { scope: duty.scope, lane: demand.lane, outcome: "refused", code: "WORK_CONTEXT_UNAVAILABLE", message: String(error?.message ?? error) };
  }
  let refusal = null;
  const tried = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await dispatch(formDutyWorkOrderDemand({ duty, dialectExample, workContext, refusal }));
    const workOrder = workOrderOfInferenceResult(result);
    if (workOrder === null) {
      refusal = {
        code: "NO_WORK_ORDER",
        outcome: result?.outcome ?? null,
        disposition: result?.disposition ?? null,
        providers: (result?.directLaneRefusals ?? []).map((entry) => pick(entry, ["provider", "model", "reason", "cause"])),
      };
      tried.push({ attempt, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    const specificationPath = join(destinationParent, "content/text/documents/specifications", `${titleOf(workOrder)}.md`);
    const source = { type: "MarkdownDocumentSource", path: specificationPath, text: workOrder };
    const translation = translate({ type: "MarkdownJsnodeOperationPackageSpecificationTranslationRequest", version: 1, source });
    if (translation.type !== "MarkdownJsnodeOperationPackageSpecificationTranslation") {
      // The headings the provider actually wrote are the cheapest evidence of
      // how its document missed the dialect; they ride with the refusal both
      // into the next attempt and into the outcome record.
      const headings = workOrder.split("\n").filter((line) => /^#{1,6} /u.test(line)).slice(0, 24);
      refusal = { phase: "translation", ...pick(translation, ["code", "message", "sourceSpan"]), headings, lines: workOrder.split("\n").length };
      tried.push({ attempt, provider: result?.provider ?? null, model: result?.model ?? null, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    const artifactId = translation.artifactSpecificationCandidate.artifact.id;
    const candidate = translation.jsnodeOperationPackageSpecificationCandidate;
    const packageName = candidate?.packageName;
    if (typeof packageName !== "string" || !/^@[a-z0-9-]+\/[a-z0-9][a-z0-9-]*$/u.test(packageName)) {
      refusal = { code: "INVALID_PACKAGE_IDENTITY", message: "translation must carry the topic owner's scoped packageName" };
      tried.push({ attempt, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    const operationTexts = candidate.version === 2 ? candidate.operations.map((operation) => operation.bodyText) : [candidate.operation?.text ?? ""];
    const takenVersion = await checkNameTaken({ packageName, registry });
    if (takenVersion !== null) {
      refusal = nameTakenRefusal({ packageName, version: takenVersion });
      tried.push({ attempt, provider: result?.provider ?? null, model: result?.model ?? null, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    const duplicateMatches = [...new Set((await Promise.all(operationTexts.map((operationText) => checkDuplication({ operationText, artifactId })))).flat())];
    if (duplicateMatches.length > 0) {
      refusal = duplicateCapabilityRefusal(duplicateMatches);
      tried.push({ attempt, provider: result?.provider ?? null, model: result?.model ?? null, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    const destination = join(destinationParent, "services", packageName.split("/")[1]);
    const receipt = await fabricate({ type: "MarkdownJsnodeOperationPackageFabricationRequest", version: 1, source, destination, registry, publish });
    if (receipt.type !== "MarkdownJsnodeOperationPackageFabricationReceipt") {
      refusal = { phase: receipt.phase ?? "fabrication", ...pick(receipt, ["code", "message", "datum"]) };
      tried.push({ attempt, provider: result?.provider ?? null, model: result?.model ?? null, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    await write({ path: specificationPath, text: workOrder });
    await recordAssay(duty, result, "accepted", { phase: "fabrication", receipt, specificationPath });
    const born = receipt.jsnodeOperationPackageCreationReceipt ?? {};
    const flat = { packageName: born.packageName, packageVersion: born.packageVersion, destination, registryPublication: receipt.jsnodeOperationPackageRegistryPublication?.registry ? { registry: receipt.jsnodeOperationPackageRegistryPublication.registry } : null };
    if (!publish || !flat.registryPublication) {
      return { scope: duty.scope, lane: demand.lane, outcome: "fabricated", attempt, package: `${flat.packageName}@${flat.packageVersion}`, specificationPath, destination, published: false, activated: false };
    }
    const discharge = dischargeOfFabrication({ duty, receipt: flat, producer, workOrderPath: specificationPath });
    try {
      const admission = await rail.call("work-discharge-admit", discharge);
      return { scope: duty.scope, lane: demand.lane, outcome: "discharged", attempt, package: `${flat.packageName}@${flat.packageVersion}`, specificationPath, admission };
    } catch (error) {
      return { scope: duty.scope, lane: demand.lane, outcome: "fabricated-not-discharged", attempt, package: `${flat.packageName}@${flat.packageVersion}`, specificationPath, error: String(error?.message ?? error) };
    }
  }
  if (isDuplicateRefusal(refusal)) {
    return { scope: duty.scope, lane: demand.lane, outcome: "duplicate-refused", matches: refusal.matches, tried, at: now().toISOString() };
  }
  return { scope: duty.scope, lane: demand.lane, outcome: "refused", tried, at: now().toISOString() };
}

/**
 * Closes one carrier-falsehood duty by asking the free-lane market to rewrite the smallest
 * enclosing Markdown section of the named carrier, gated deterministically (non-empty, heading
 * unchanged, falsehood gone, every relative link in the spliced carrier still resolves) before any
 * write; a gate failure feeds back to the next attempt, and the duty refuses once attempts are spent.
 */
async function executeCarrierFalsehoodDuty({ duty, demand, rail, producer, journal, attempts, repositoryRoot, dispatch, recordAssay, resolveLinks, write, carrierExists, readCarrierText, now }) {
  const parsed = parseCarrierFalsehoodDutyText(duty.text);
  if (parsed === null) {
    return { scope: duty.scope, lane: demand.lane, outcome: "refused", reason: "duty text does not match the carrier-falsehood template", at: now().toISOString() };
  }
  const carrierPath = candidateCarrierPaths({ carrier: parsed.carrier, repositoryRoot })
    .find((path) => isWritableCarrierPath({ path, repositoryRoot }) && carrierExists(path)) ?? null;
  if (carrierPath === null) {
    return { scope: duty.scope, lane: demand.lane, outcome: "refused", reason: "carrier resolves to no writable Markdown file under lib", carrier: parsed.carrier, at: now().toISOString() };
  }
  const beforeText = await readCarrierText(carrierPath);
  const section = smallestEnclosingMarkdownSection(beforeText, parsed.observed);
  if (section === null) {
    return { scope: duty.scope, lane: demand.lane, outcome: "refused", reason: "observed falsehood not found in the carrier's current text", carrierPath, at: now().toISOString() };
  }
  let refusal = null;
  const tried = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await dispatch(formCarrierSectionReplacementDemand({ carrier: parsed.carrier, section, expected: parsed.expected, refusal }));
    const replacementText = workOrderOfInferenceResult(result);
    if (replacementText === null) {
      refusal = { code: "NO_REPLACEMENT", outcome: result?.outcome ?? null };
      tried.push({ attempt, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    const failures = sectionReplacementFailures({ section, replacementText, observed: parsed.observed });
    if (failures.length > 0) {
      refusal = { code: "GATE_FAILED", failures };
      tried.push({ attempt, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    const splicedText = spliceMarkdownSection(beforeText, section, replacementText);
    const linkEntries = await resolveLinks(splicedText, { carrierPath, root: repositoryRoot });
    const unresolved = linkEntries.filter((entry) => entry.resolution.status === "missing" || entry.resolution.status === "escaped");
    if (unresolved.length > 0) {
      refusal = { code: "LINKS_UNRESOLVED", unresolved: unresolved.map((entry) => ({ target: entry.target, status: entry.resolution.status })) };
      tried.push({ attempt, refusal });
      await recordAssay(duty, result, "refused", refusal);
      continue;
    }
    await write({ path: carrierPath, text: splicedText });
    await recordAssay(duty, result, "accepted", { phase: "carrier-write", carrierPath, replacementText, linksChecked: linkEntries.length });
    if (journal) {
      journal.record({
        category: "agent-work.carrier-falsehood-repair",
        recordedAt: now().toISOString(),
        record: { type: "CarrierSectionReplacement", scope: duty.scope, carrierPath, before: section.sectionText, after: replacementText },
        charge: { support: true, refutation: false },
      });
    }
    const discharge = dischargeOfCarrierRepair({ duty, producer, carrierPath, linksChecked: linkEntries.length });
    try {
      const admission = await rail.call("work-discharge-admit", discharge);
      return { scope: duty.scope, lane: demand.lane, outcome: "discharged", attempt, carrierPath, admission };
    } catch (error) {
      return { scope: duty.scope, lane: demand.lane, outcome: "written-not-discharged", attempt, carrierPath, error: String(error?.message ?? error) };
    }
  }
  return { scope: duty.scope, lane: demand.lane, outcome: "refused", tried, carrierPath, at: now().toISOString() };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => (seen.has(item.scope) ? false : (seen.add(item.scope), true)));
}

function titleOf(workOrder) {
  const first = workOrder.split("\n")[0] ?? "";
  return first.replace(/^#\s*/u, "").trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "work-order";
}

function pick(value, keys) {
  return Object.fromEntries(keys.filter((key) => value?.[key] !== undefined).map((key) => [key, value[key]]));
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] !== undefined ? process.argv[index + 1] : fallback;
}

/** Creates a directory (recursively) if it does not already exist. */
async function defaultEnsureDirectory(dir) {
  await mkdir(dir, { recursive: true });
}

const execFileAsync = promisify(execFile);

/**
 * Whether `packageName` already exists on the registry, by asking it directly rather than
 * hand-rolling a second name-taken check the registry itself already settles.
 * @param {{packageName: string, registry: string}} options
 * @returns {Promise<string|null>} the published version, or null when the name is free.
 */
async function defaultCheckNameTaken({ packageName, registry }) {
  try {
    const { stdout } = await execFileAsync("npm", ["view", packageName, "version", "--registry", registry]);
    const version = stdout.trim();
    return version === "" ? null : version;
  } catch {
    return null;
  }
}

/**
 * Whether the candidate operation's exported behavior duplicates a consumer-backed capability
 * already in the workspace, via jsnode-engineering-cli's own executable-duplication analysis (the same
 * analysis jsnode-server exposes as `jsnode_duplication`) rather than a second bespoke comparison.
 * @param {{operationText: string, artifactId: string}} options
 * @returns {Promise<readonly string[]>} the matching, consumer-backed package names, or `[]`.
 */
async function defaultCheckDuplication({ operationText, artifactId }) {
  const behaviors = extractExecutableBehaviors(operationText, `${artifactId}.mjs`);
  if (behaviors.length === 0) return [];
  const fingerprints = new Set(behaviors.map((behavior) => behavior.semanticFingerprint));
  const duplication = workspaceDuplication(repositoryRootOf(SECTION_ROOT));
  const matches = new Set();
  for (const candidate of duplication.candidates) {
    if (candidate.consumers.length === 0 || !fingerprints.has(candidate.semanticFingerprint)) continue;
    for (const packageName of candidate.packages) matches.add(packageName);
  }
  return [...matches];
}

/** Runs one JavascriptNodeCommandExecutionRequest@1 through the house command executor. */
async function defaultRunCommand(request) {
  return executeJavascriptNodeCommand(request);
}


/** Reads one carrier's Markdown text. */
async function defaultReadCarrierText(carrierPath) {
  return readFile(carrierPath, "utf8");
}


/** Walks up from `startDir` to the nearest ancestor holding `.git` — the checkout root. */
function repositoryRootOf(startDir) {
  let dir = startDir;
  while (!existsSync(join(dir, ".git"))) {
    const parent = dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
  return dir;
}

/**
 * One directory listing under `root`, pruned the same way jsnode-engineering-cli's own workspace walk
 * is: every directory is a seating candidate `resolveSectionDirectory` can then match by basename.
 * @param {string} root
 * @returns {readonly string[]}
 */
function listCandidateSectionDirectories(root) {
  const found = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue;
      const full = join(dir, entry.name);
      found.push(full);
      stack.push(full);
    }
  }
  return found;
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--help")) {
    process.stdout.write("execute-ready-duties --destination-parent <dir> [--root <checkout>] [--scope <ready-duty-scope>] [--apply] [--publish] [--limit N] [--attempts N] [--registry URL] [--dialect-example <path>] [--env-path <ops-mcp-client.env>] [--journal-root <dir>] [--seating-root <dir>]\nExecutes ready duties on ops.561.group. An admitted deterministic command binding runs only with --apply and discharges only after its exact request, named result gate, and rail admission settle; prose diagnostics remain observations.\n");
    process.exit(0);
  }
  const destinationParent = argument("--destination-parent", SECTION_ROOT);
  const deterministicRoot = argument("--root", null);
  const deterministicScope = argument("--scope", undefined);
  const applyDeterministic = process.argv.includes("--apply");
  const publish = process.argv.includes("--publish");
  if (publish && !applyDeterministic) {
    process.stderr.write("execute-ready-duties: --publish requires --apply, --root, and --scope\n");
    process.exit(2);
  }
  if (applyDeterministic && (deterministicRoot === null || deterministicScope === undefined)) {
    process.stderr.write("execute-ready-duties: --apply requires --root and --scope\n");
    process.exit(2);
  }
  const credential = loadOpsClientEnvironment({ envPath: argument("--env-path", DEFAULT_OPS_CLIENT_ENV_PATH) });
  if (credential === null) {
    process.stderr.write("execute-ready-duties: no machine credential for the ops rail\n");
    process.exit(2);
  }
  const rail = createOpsRail(credential);
  const manifest = JSON.parse(await readFile(join(SECTION_ROOT, "package.json"), "utf8"));
  const journalRoot = argument("--journal-root", join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"), "561-group", "agent-work"));
  const seatingRoot = argument("--seating-root", repositoryRootOf(SECTION_ROOT));
  try {
    const summary = await executeReadyDuties({
      rail,
      repositoryRoot: deterministicRoot ?? seatingRoot,
      destinationParent,
      candidateSectionDirectories: listCandidateSectionDirectories(seatingRoot),
      dialectExample: argument("--dialect-example", null) ? await readFile(argument("--dialect-example", null), "utf8") : JSNODE_PACKAGE_DIALECT_EXAMPLE,
      publish,
      producer: { id: manifest.name, revision: manifest.version },
      journal: journalRoot ? createSemanticRecordJournal({ root: journalRoot, objectKind: OBJECT_KIND }) : null,
      limit: Number(argument("--limit", "1")),
      attempts: Number(argument("--attempts", "2")),
      registry: argument("--registry", DEFAULT_REGISTRY),
      deterministicRoot,
      deterministicScope,
      applyDeterministic,
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exitCode = exitCodeOfReadyDutiesSummary(summary);
  } finally {
    await rail.close();
  }
}
