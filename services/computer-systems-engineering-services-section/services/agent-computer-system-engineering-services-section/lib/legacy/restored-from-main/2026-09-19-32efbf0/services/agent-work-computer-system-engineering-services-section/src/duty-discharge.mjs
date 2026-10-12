/**
 * @packageDocumentation
 * The Plan-to-Execute edge of the checkout-health MAPE-K loop: routes ready
 * task-level duties off metroplat's own agent-work-dispatch readout by
 * scope kind to the one existing repair script that owns it
 * (exact-deps -> pin-exact-dependencies, data-custody -> migrate-data-
 * custody-directory), gates any applied repair with the same checker that
 * admitted the duty, and discharges through metroplat's own
 * `admitWorkDischarge`. `import-stratification-*`, `checkout-bound-unit-*`,
 * and `systemd-failed-*` scopes are recognized but have no deterministic hand
 * -- a datum, not an error. In particular, a failed-unit observation is not
 * authorization to invent a restart or reset command from task prose.
 * @metroplatSubject monitoring
 */
import { createHash } from "node:crypto";
import { admitJavascriptNodeCommandExecutionRequest } from "@red-cup-engineering/admit-javascript-node-command-execution-request-service";
import { canonicalJson } from "@red-cup-engineering/computer-data-engine/identity";
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { readFile, writeFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { checkDataCustodyDirectory } from "@red-cup-engineering/data-custody-directory-service/check-data-custody-directory";
import { migrateDataCustodyDirectory } from "@red-cup-engineering/data-custody-directory-service/migrate-data-custody-directory";
import { pinExactDependencies } from "@red-cup-engineering/npm-workspace-publication-service";
const SCOPE_HAND_PATTERN = /^task:(exact-deps|data-custody)-(.+)$/u;
export const SCOPE_RECOGNIZED_NO_HAND_PATTERN = /^task:(import-stratification|checkout-bound-unit|systemd-failed)-(.+)$/u;
export function classifyDutyScope(scope) {
    const match = SCOPE_HAND_PATTERN.exec(scope);
    if (match) return Object.freeze({ repairScript: match[1], subject: match[2] });
    const recognized = SCOPE_RECOGNIZED_NO_HAND_PATTERN.exec(scope);
    if (recognized) return Object.freeze({ repairScript: null, subject: recognized[2] });
    return Object.freeze({ repairScript: null, subject: undefined });
}
const PATH_TEXT_PATTERN = / \(path: (.+)\)$/u;
/** Recovers the `(path: <relpath>)` suffix a work-intent task's text carries, when present. */
export function subjectPathFromDutyText(text) {
    if (typeof text !== "string")
        return undefined;
    const match = PATH_TEXT_PATTERN.exec(text);
    return match ? match[1] : undefined;
}
/** Lists every directory under `root` whose basename is a plausible repair subject, skipping `node_modules`/`.git`. */
export function walkDirectories(root, { listDirFn = readdirSync } = {}) {
    const skip = new Set(["node_modules", ".git"]);
    const dirs = [];
    const stack = [root];
    while (stack.length > 0) {
        const dir = stack.pop();
        dirs.push(dir);
        let entries;
        try {
            entries = listDirFn(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory() || skip.has(entry.name))
                continue;
            stack.push(join(dir, entry.name));
        }
    }
    return Object.freeze(dirs);
}
/** Fallback candidate directories for a subject basename with no recorded path. */
export function candidateSubjectPaths({ repairScript, subject, root, dirsFn = walkDirectories, existsFn = existsSync, }) {
    const dirs = dirsFn(root).filter((dir) => basename(dir) === subject);
    if (repairScript === "exact-deps")
        return Object.freeze(dirs.filter((dir) => existsFn(join(dir, "package.json"))));
    if (repairScript === "data-custody")
        return Object.freeze(dirs.filter((dir) => existsFn(join(dir, "data"))));
    return Object.freeze([]);
}
/** Resolves a duty's subject to an absolute filesystem path: the recorded `(path: ...)` text suffix, otherwise a basename scan under `root`. */
export function resolveSubjectPath({ repairScript, subject, text, root, candidatesFn = candidateSubjectPaths, }) {
    const relFromText = subjectPathFromDutyText(text);
    if (relFromText !== undefined)
        return Object.freeze({ subjectPath: resolve(root, relFromText), source: "text" });
    const candidates = candidatesFn({ repairScript, subject, root });
    if (candidates.length === 1)
        return Object.freeze({ subjectPath: candidates[0], source: "scan" });
    if (candidates.length === 0)
        return Object.freeze({ refusal: Object.freeze({ reason: "no-candidate-found-for-subject", subject }) });
    return Object.freeze({ refusal: Object.freeze({ reason: "ambiguous-subject", subject, candidates }) });
}
/**
 * The ready, task-scoped items of a MetroPlat agent-work-dispatch readout,
 * collapsed to one entry per scope (the same scope can legitimately appear
 * once per agent-frontier: the incumbent actor's own frontier and the
 * assigning office's frontier).
 */
export function readyTaskDutiesOfDispatch(dispatchReadout) {
    const byScope = new Map();
    for (const item of dispatchReadout.frontier) {
        if (item.state !== "ready" || !item.scope.startsWith("task:"))
            continue;
        if (!byScope.has(item.scope))
            byScope.set(item.scope, item);
    }
    return Object.freeze([...byScope.values()]);
}
/** Runs the exact-deps repair (`pinExactDependencies` over the subject package's own `package.json`) in plan or apply mode. */
export async function runExactDepsHand({ subjectPath, apply, readFileImpl = readFile, writeFileImpl = writeFile, readRegistryPackageImpl, pinExactDependenciesFn = pinExactDependencies, }) {
    const manifestPath = join(subjectPath, "package.json");
    const manifest = JSON.parse(await readFileImpl(manifestPath, "utf8"));
    const result = await pinExactDependenciesFn({
        sites: [{ path: manifestPath, dir: subjectPath, manifest }],
        apply,
        readFileImpl,
        writeFileImpl,
        ...(readRegistryPackageImpl === undefined ? {} : { readRegistryPackageImpl }),
    });
    const site = result.packages[0];
    return Object.freeze({
        ok: result.ok,
        changedPaths: apply
        ? Object.freeze([
            ...(site.rewrites.length > 0 ? [manifestPath] : []),
            ...((site.lockRootRewrites?.length ?? 0) > 0 ? [join(subjectPath, "package-lock.json")] : []),
        ])
        : Object.freeze([]),
        detail: site,
        gateEvidence: `checker:dependencySpecificationViolations=${site.violationsAfter}`,
    });
}
/** Runs the data-custody repair (`migrateDataCustodyDirectory` over the subject section's `data/` directory) in plan or apply mode. */
export function runDataCustodyHand({ subjectPath, apply, checkFn = checkDataCustodyDirectory, migrateFn = migrateDataCustodyDirectory, }) {
    const { dataDirectory } = checkFn(subjectPath);
    const result = migrateFn(dataDirectory, { apply });
    // A non-purge row's `destination` is already `data/<classification>/<name>`
    // relative to `subjectPath`; a purge row's `entry` is bare, relative to `dataDirectory`.
    const changedPaths = apply && Array.isArray(result.applied)
        ? Object.freeze(result.applied.map((row) => (row.classification === "purge" ? join(dataDirectory, row.entry) : join(subjectPath, row.destination))))
        : Object.freeze([]);
    return Object.freeze({
        ok: result.ok,
        changedPaths,
        detail: result,
        gateEvidence: `checker:checkDataCustodyDirectory-offenders=${result.offendersAfter}`,
    });
}
/** The two wired repair scripts, keyed by {@link classifyDutyScope}'s `repairScript`. */
export const DEFAULT_REPAIR_SCRIPTS = Object.freeze({
    "exact-deps": runExactDepsHand,
    "data-custody": runDataCustodyHand,
});
/** Sha-256 hex digest of a repair result's detail, for durable discharge evidence. */
export function digestOfRepairOutput(value) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
/** One human-readable discharge text naming what changed. */
export function dischargeTextFor({ repairScript, repairResult }) {
    if (repairScript === "exact-deps") {
        const rewrites = repairResult.detail["rewrites"];
        const lockRootRewrites = repairResult.detail["lockRootRewrites"] ?? [];
        return `Pinned ${rewrites.length + lockRootRewrites.length} dependency specification(s) to exact versions in ${repairResult.changedPaths.join(", ") || "package.json"}.`;
    }
    const applied = repairResult.detail["applied"];
    const count = Array.isArray(applied) ? applied.length : 0;
    return `Migrated ${count} data/ entry(ies) into logs/records/state under ${String(repairResult.detail["dataDir"])}.`;
}
/** Builds the `metroplat.work.discharge` payload for one successfully gated, applied repair. */
export function buildDischargeInput({ duty, repairScript, repairResult, producer = Object.freeze({ id: "metroplat/monitoring/checkout-health", revision: "0" }), }) {
    return Object.freeze({
        kind: "metroplat.work.discharge",
        id: `discharge-${duty.scope}`,
        intent: duty.intent,
        producer,
        scope: duty.scope,
        text: dischargeTextFor({ repairScript, repairResult }),
        evidence: Object.freeze([
            repairResult.gateEvidence,
            ...repairResult.changedPaths.map((path) => `changed-path:${path}`),
            `repair-output-digest:sha256:${digestOfRepairOutput(repairResult.detail)}`,
        ]),
    });
}

/**
 * Evaluates one admitted command-result gate against its immutable receipt.
 * @param {{kind: string, status?: number, stdout?: string}} acceptance
 * @param {{result?: {status?: number|null, stdout?: string}}} receipt
 * @returns {{accepted: boolean, reason?: string}}
 */
export function evaluateDeterministicAcceptance(acceptance, receipt) {
  if (acceptance?.kind === "command-exit-status" && Number.isInteger(acceptance.status)) {
    return receipt?.result?.status === acceptance.status
      ? Object.freeze({ accepted: true })
      : Object.freeze({ accepted: false, reason: "command-exit-status-mismatch" });
  }
  if (acceptance?.kind === "exact-stdout" && typeof acceptance.stdout === "string") {
    return receipt?.result?.status === 0 && receipt?.result?.stdout === acceptance.stdout
      ? Object.freeze({ accepted: true })
      : Object.freeze({ accepted: false, reason: "exact-stdout-mismatch" });
  }
  return Object.freeze({ accepted: false, reason: "unsupported-acceptance-gate" });
}

/** Validates an admitted command binding before an effect can occur. */
export function validateDeterministicExecution(value) {
  if (typeof value?.operation !== "string" || value.operation.length === 0) throw new TypeError("deterministic execution requires an operation");
  admitJavascriptNodeCommandExecutionRequest(value.request);
  const gate = value.acceptance;
  const keys = gate && typeof gate === "object" ? Object.keys(gate).sort().join(",") : "";
  if (gate?.kind === "command-exit-status" && Number.isInteger(gate.status) && keys === "kind,status") return Object.freeze(value);
  if (gate?.kind === "exact-stdout" && typeof gate.stdout === "string" && keys === "kind,stdout") return Object.freeze(value);
  throw new TypeError("deterministic execution requires a supported exact acceptance gate");
}

async function admitDutyDischarge({ duty, binding, discharge, admitDischargeFn, options }) {
  try {
    const admission = await admitDischargeFn(binding, discharge, options);
    if (["admitted", "already-admitted"].includes(admission?.status) && admission.intent === duty.intent && admission.scope === duty.scope) {
      return Object.freeze({ admitted: true, admission });
    }
    return Object.freeze({ admitted: false, admission, refusal: Object.freeze({ reason: "discharge-admission-refused" }) });
  } catch (error) {
    return Object.freeze({ admitted: false, refusal: Object.freeze({ reason: "discharge-admission-failed", message: String(error?.message ?? error) }) });
  }
}

/**
 * Executes one already-admitted exact command binding and discharges only when its named result
 * gate accepts the immutable command receipt. A caller supplies the binding; this operation never
 * derives a command or a gate from a duty's prose.
 * @param {object} options
 * @param {{scope: string, intent: string}} options.duty
 * @param {{operation: string, request: object, acceptance: object}} options.deterministicExecution
 * @param {boolean} options.apply
 * @param {(request: object) => object|Promise<object>} options.run
 * @param {(binding: unknown, discharge: object, options: object) => object|Promise<object>} [options.admitDischargeFn]
 * @param {unknown} [options.binding]
 * @param {{id: string, revision: string}} [options.producer]
 * @returns {Promise<object>}
 */
export async function executeDeterministicDuty({ duty, deterministicExecution, apply, run, admitDischargeFn, binding = null, producer = Object.freeze({ id: "metroplat/monitoring/checkout-health", revision: "0" }) }) {
  if (typeof duty?.scope !== "string" || duty.scope.length === 0 || typeof duty.intent !== "string" || duty.intent.length === 0) {
    return Object.freeze({ scope: duty?.scope, intent: duty?.intent, status: "refused", refusal: Object.freeze({ reason: "invalid-duty-identity" }) });
  }
  let execution;
  try { execution = validateDeterministicExecution(deterministicExecution); } catch (error) { return Object.freeze({ scope: duty.scope, intent: duty.intent, status: "refused", refusal: Object.freeze({ reason: "invalid-deterministic-execution-binding", message: String(error?.message ?? error) }) }); }
  const { operation, request, acceptance } = execution;
  if (apply && typeof admitDischargeFn !== "function") return Object.freeze({ scope: duty.scope, intent: duty.intent, operation, status: "refused", refusal: Object.freeze({ reason: "missing-discharge-admission" }) });
  if (!apply) return Object.freeze({ scope: duty.scope, intent: duty.intent, operation, status: "planned", request });
  let receipt;
  try {
    receipt = await run(request);
  } catch (error) {
    return Object.freeze({ scope: duty.scope, intent: duty.intent, operation, status: "refused", refusal: Object.freeze({ reason: "command-runner-failed", message: String(error?.message ?? error) }) });
  }
  if (receipt?.type !== "JavascriptNodeCommandExecutionReceipt" || receipt?.version !== 1 || canonicalJson(receipt?.request) !== canonicalJson(request)) {
    return Object.freeze({ scope: duty.scope, intent: duty.intent, operation, status: "refused", refusal: Object.freeze({ reason: "malformed-command-receipt" }) });
  }
  const gate = evaluateDeterministicAcceptance(acceptance, receipt);
  if (!gate.accepted) {
    return Object.freeze({ scope: duty.scope, intent: duty.intent, operation, status: "refused", receipt, refusal: Object.freeze({ reason: "acceptance-gate-failed", gate: gate.reason }) });
  }
  const discharge = Object.freeze({
    kind: "metroplat.work.discharge",
    id: `discharge-${duty.scope}`,
    intent: duty.intent,
    producer,
    scope: duty.scope,
    text: `Executed admitted operation ${operation}; its named result gate accepted the immutable command receipt.`,
    evidence: Object.freeze([
      `operation:${operation}`,
      `acceptance:${acceptance.kind}:${digestOfRepairOutput(acceptance)}`,
      `command-receipt-digest:sha256:${digestOfRepairOutput(receipt)}`,
    ]),
  });
  const admitted = await admitDutyDischarge({ duty, binding, discharge, admitDischargeFn, options: { receipt } });
  if (!admitted.admitted) return Object.freeze({ scope: duty.scope, intent: duty.intent, operation, status: "executed-not-discharged", receipt, discharge, ...(admitted.admission === undefined ? {} : { admission: admitted.admission }), refusal: admitted.refusal });
  return Object.freeze({ scope: duty.scope, intent: duty.intent, operation, status: "applied", receipt, discharge, admission: admitted.admission });
}
/** Plans (and, when authorized, applies and discharges) one ready duty. */
export async function planOrDischargeDuty({ duty, root, apply, binding, repairScripts = DEFAULT_REPAIR_SCRIPTS, resolveFn = resolveSubjectPath, admitDischargeFn, now = () => new Date().toISOString(), }) {
    const { repairScript, subject } = classifyDutyScope(duty.scope);
    if (repairScript === null) {
        const recognized = SCOPE_RECOGNIZED_NO_HAND_PATTERN.exec(duty.scope);
        const kind = recognized ? recognized[1] : null;
        return Object.freeze({ scope: duty.scope, intent: duty.intent, kind, status: "no-repair-script", datum: Object.freeze({ scope: duty.scope, reason: "no-repair-script" }) });
    }
    const resolution = resolveFn({ repairScript, subject: subject, text: duty.text, root });
    if ("refusal" in resolution) {
        return Object.freeze({ scope: duty.scope, intent: duty.intent, kind: repairScript, status: "refused", refusal: resolution.refusal });
    }
    if (apply && typeof admitDischargeFn !== "function") {
        return Object.freeze({ scope: duty.scope, intent: duty.intent, kind: repairScript, status: "refused", refusal: Object.freeze({ reason: "missing-discharge-admission" }) });
    }
    const { subjectPath } = resolution;
    const repairResult = await repairScripts[repairScript]({ subjectPath, apply });
    const base = Object.freeze({ scope: duty.scope, intent: duty.intent, kind: repairScript, subjectPath, plan: repairResult.detail });
    if (!apply)
        return Object.freeze({ ...base, status: "planned" });
    if (!repairResult.ok)
        return Object.freeze({ ...base, status: "refused", refusal: Object.freeze({ reason: "gate-failed", detail: repairResult.detail }) });
    const dischargeInput = buildDischargeInput({ duty, repairScript, repairResult });
    const admitted = await admitDutyDischarge({ duty, binding, discharge: dischargeInput, admitDischargeFn, options: { at: now() } });
    if (!admitted.admitted) return Object.freeze({ ...base, status: "executed-not-discharged", changedPaths: repairResult.changedPaths, discharge: dischargeInput, ...(admitted.admission === undefined ? {} : { admission: admitted.admission }), refusal: admitted.refusal });
    return Object.freeze({ ...base, status: "applied", changedPaths: repairResult.changedPaths, discharge: dischargeInput, admission: admitted.admission });
}
/**
 * Reads every ready task-level duty off an already-computed agent-work-
 * dispatch readout, plans a repair for each, and applies (gates, then
 * discharges) up to `limit` of them when `apply` is true.
 */
export async function dischargeReadyDuties({ readout, root, binding, apply = false, limit = 1, scope, kind, planOrDischargeFn = planOrDischargeDuty, run = executeJavascriptNodeCommand, admitDischargeFn, producer, }) {
    const allDuties = readyTaskDutiesOfDispatch(readout);
    let duties = scope === undefined ? allDuties : allDuties.filter((duty) => duty.scope === scope);
    if (kind !== undefined)
        duties = duties.filter((duty) => classifyDutyScope(duty.scope).repairScript === kind);
    const results = [];
    let applyAttempts = 0;
    for (const duty of duties) {
        const canApply = apply && applyAttempts < limit;
        if (canApply)
            applyAttempts += 1;
        const result = duty.deterministicExecution === undefined
            ? await planOrDischargeFn({ duty, root, apply: canApply, binding, admitDischargeFn })
            : await executeDeterministicDuty({
                duty,
                deterministicExecution: duty.deterministicExecution,
                apply: canApply,
                run,
                admitDischargeFn,
                binding,
                ...(producer === undefined ? {} : { producer }),
            });
        results.push(result);
    }
    return Object.freeze({
        kind: "metroplat.monitoring.checkout-health.duty-discharge",
        duties: Object.freeze(results),
        ok: results.every((result) => result.status !== "refused" && result.status !== "executed-not-discharged"),
    });
}
//# sourceMappingURL=discharge.mjs.map
