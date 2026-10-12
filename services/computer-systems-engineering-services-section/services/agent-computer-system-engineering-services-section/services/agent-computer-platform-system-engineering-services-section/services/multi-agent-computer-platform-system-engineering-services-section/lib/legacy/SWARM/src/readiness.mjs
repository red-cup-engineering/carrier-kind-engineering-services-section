import { stableId } from "./cognition.mjs";
import { costGraphSummary } from "./cost.mjs";
import { writeTrace } from "./events.mjs";
import { can, officeForSkill, officeNameFor } from "./offices.mjs";
import { deriveWorkStatus } from "./status.mjs";
import { toolAdmissionFor, toolPolicyFor } from "./tool-policy.mjs";
import { planCompositionKind } from "./tuplets.mjs";
import { listWorkObjects } from "./work.mjs";
import { foldJudgments as foldReadiness } from "@561-group/computer-kernel-process";

// FOUR's home is bilattice.mjs; re-exported here so existing importers are unchanged.


// Combine the independent checks by folding them through the admissibility meet (worst-wins):
// a contradiction beats a denial beats an unknown, identity is "potential". See bilattice.mjs.
function composite(checks) {
  return foldReadiness(checks.map((check) => check.value));
}

function check(name, value, reason = "ok", path = "") {
  return { name, value, reason, path };
}

function priorityRank(priority) {
  if (priority === "high") return 0;
  if (priority === "normal" || !priority) return 1;
  if (priority === "low") return 2;
  const numeric = Number(priority);
  return Number.isFinite(numeric) ? numeric : 1;
}

// officeForSkill is the transpose read of the office×capability Chu space (offices.mjs); re-exported
// here so existing importers are unchanged. `can` (a row read) and this (a column read) are now one
// carrier read both ways, instead of two independent loops over officeDefinitions.
export { officeForSkill };

function findParent(root, parentId) {
  if (!parentId) return null;
  return listWorkObjects(root).find((record) => record.doc.id === parentId) ?? null;
}

function dependencyCheck(root, work) {
  const deps = work.doc.dependsOn;
  const dependencies = Array.isArray(deps) ? deps : deps ? [deps] : [];
  if (!dependencies.length) return check("dependency", "potential");
  const records = listWorkObjects(root);
  for (const dep of dependencies) {
    const record = records.find((item) => item.doc.id === dep || item.term === dep);
    if (!record) return check("dependency", "absurd", `missing dependency ${dep}`);
    const status = deriveWorkStatus(root, record);
    if (status.status !== "done") return check("dependency", "active", `dependency ${dep} is ${status.status}`);
  }
  return check("dependency", "potential");
}

function capabilityCheck(work) {
  const required = work.doc.requiredSkill;
  if (!required) return check("capability", "potential", "no required skill");
  const office = officeForSkill(required);
  if (!office) return check("capability", "active", `no office provides ${required}`);
  return check("capability", "potential", `${office} provides ${required}`);
}

function toolAdmissionCheck(work, options = {}) {
  const required = work.doc.requiredSkill;
  if (!required) return check("tool-admission", "potential", "no required tool");
  const policy = toolPolicyFor(required);
  const isTool = policy.known || String(required).startsWith("tool.");
  if (!isTool) return check("tool-admission", "potential", "required skill is not a tool");

  const admission = toolAdmissionFor(required, options.toolAuthorization ?? options);
  if (admission.admitted) return check("tool-admission", "potential", admission.reason, admission.delegationDecisionPath);
  return check("tool-admission", "active", admission.reason, admission.delegationDecisionPath);
}

function arrayField(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return value ? [String(value)] : [];
}

function writeSet(work) {
  const doc = work?.doc ?? work ?? {};
  return [
    ...arrayField(doc.writePaths),
    ...arrayField(doc.writes),
  ];
}

function readSet(work) {
  const doc = work?.doc ?? work ?? {};
  return [
    ...arrayField(doc.readPaths),
    ...arrayField(doc.reads),
  ];
}

function textField(doc, ...keys) {
  for (const key of keys) {
    const text = String(doc?.[key] ?? "").trim();
    if (text) return text;
  }
  return "";
}

function leaderAuthorized(options = {}) {
  const authorization = options.toolAuthorization ?? options.authorization ?? {};
  const delegatedBy = options.delegatedBy ?? authorization.delegatedBy ?? "";
  const delegationDecisionPath = options.delegationDecisionPath ?? authorization.delegationDecisionPath ?? "";
  return options.leaderAuthorized === true || authorization.leaderAuthorized === true || (delegatedBy === "leader" && !!delegationDecisionPath);
}

function privilegedToolPolicy(work) {
  const doc = work?.doc ?? work ?? {};
  const required = doc.requiredSkill;
  const policy = required ? toolPolicyFor(required) : toolPolicyFor("");
  const isTool = policy.known || String(required ?? "").startsWith("tool.");
  const writes = writeSet(work);
  const privileged = writes.length > 0 || (isTool && policy.requiresLeaderAuthorization);
  return { policy, isTool, writes, reads: readSet(work), privileged };
}

function boundaryEvidenceForPolicy(work, policy, writes, reads) {
  const doc = work?.doc ?? work ?? {};
  const precondition = textField(doc, "precondition", "dispatchPrecondition", "safetyPrecondition");
  const postcondition = textField(doc, "postcondition", "expectedResult");

  if (policy.tool === "files.write" || policy.tool === "package.install") {
    if (writes.length) return { ok: true, reason: `declared write boundary: ${writes.join(", ")}`, path: writes[0] };
    return { ok: false, reason: "writePaths required for repository mutation" };
  }

  if (policy.tool === "worktree.create") {
    const worktreePath = textField(doc, "worktreePath", "worktree");
    if (worktreePath) return { ok: true, reason: `declared worktree boundary: ${worktreePath}`, path: worktreePath };
    if (writes.length) return { ok: true, reason: `declared worktree write boundary: ${writes.join(", ")}`, path: writes[0] };
    return { ok: false, reason: "worktreePath or writePaths required for worktree creation" };
  }

  if (policy.tool === "network.fetch") {
    const networkTarget = textField(doc, "networkUrl", "url", "endpoint", "responseDigest");
    if (networkTarget) return { ok: true, reason: "declared network boundary", path: networkTarget };
    if (reads.length) return { ok: true, reason: `declared read boundary: ${reads.join(", ")}`, path: reads[0] };
    if (precondition) return { ok: true, reason: "declared network precondition" };
    return { ok: false, reason: "networkUrl, readPaths, or precondition required for network egress" };
  }

  if (policy.tool === "subprocess.run") {
    const commandBoundary = textField(doc, "commandDigest", "command", "subprocess");
    if (commandBoundary) return { ok: true, reason: "declared process boundary", path: commandBoundary };
    if (precondition) return { ok: true, reason: "declared process precondition" };
    if (reads.length || writes.length) {
      return {
        ok: true,
        reason: `declared process filesystem boundary: ${[...reads, ...writes].join(", ")}`,
        path: reads[0] ?? writes[0],
      };
    }
    return { ok: false, reason: "commandDigest, command, precondition, readPaths, or writePaths required for subprocess execution" };
  }

  if (writes.length) return { ok: true, reason: `declared write boundary: ${writes.join(", ")}`, path: writes[0] };
  if (policy.scope === "read" && reads.length) return { ok: true, reason: `declared read boundary: ${reads.join(", ")}`, path: reads[0] };
  if (policy.scope === "compute" && (precondition || postcondition)) return { ok: true, reason: "declared compute boundary" };

  return { ok: false, reason: "safety envelope boundary missing for privileged work" };
}

function safetyEnvelopeCheck(work, options = {}) {
  const { policy, privileged, writes, reads } = privilegedToolPolicy(work);
  if (!privileged) return check("safety-envelope", "potential", "message-only or unprivileged work");

  const boundary = boundaryEvidenceForPolicy(work, policy, writes, reads);
  if (!boundary.ok) return check("safety-envelope", "absurd", `missing safety envelope boundary: ${boundary.reason}`);

  if (policy.requiresLeaderAuthorization && !leaderAuthorized(options)) {
    return check("safety-envelope", "absurd", "leader delegation required before safety envelope can settle", boundary.path ?? "");
  }

  const witnessPath = boundary.path ?? options.delegationDecisionPath ?? options.toolAuthorization?.delegationDecisionPath ?? "";
  return check("safety-envelope", "potential", boundary.reason, witnessPath);
}

function writeOverlaps(left, right) {
  for (const a of left) {
    for (const b of right) {
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) return true;
    }
  }
  return false;
}

function worktreeIsolationCheck(root, work) {
  const writes = writeSet(work);
  if (!writes.length) return check("worktree-isolation", "potential", "no declared write paths");
  const doc = work?.doc ?? work ?? {};
  if (doc.worktreePath || doc.worktreeIsolation === "isolated") {
    return check("worktree-isolation", "potential", "isolated worktree declared", doc.worktreePath ?? "");
  }

  const conflicts = listWorkObjects(root)
    .filter((other) => other.doc.id !== doc.id)
    .map((other) => ({ work: other, status: deriveWorkStatus(root, other), writes: writeSet(other) }))
    .filter((entry) => ["assigned", "active"].includes(entry.status.status) && writeOverlaps(writes, entry.writes));

  if (!conflicts.length) return check("worktree-isolation", "potential", "no in-flight write conflict");
  const titles = conflicts.map((entry) => entry.work.doc.title).slice(0, 3).join(", ");
  return check("worktree-isolation", "absurd", `write conflict requires isolated worktree: ${titles}`);
}

function authorityCheck(dispatcher) {
  if (!dispatcher) return check("authority", "absurd", "no dispatcher supplied");
  if (can(dispatcher, "work.dispatch")) return check("authority", "potential", `${officeNameFor(dispatcher)} may dispatch`);
  return check("authority", "active", `${officeNameFor(dispatcher)} may not dispatch`);
}

function statusCheck(root, work) {
  const status = deriveWorkStatus(root, work);
  if (["done", "failed", "abandoned"].includes(status.status)) {
    return check("status", "active", `terminal status ${status.status}`, status.tracePaths.at(-1) ?? "");
  }
  if (["assigned", "active"].includes(status.status)) {
    return check("status", "active", `already ${status.status}`, status.tracePaths.at(-1) ?? "");
  }
  if (status.status === "blocked") return check("status", "active", "blocked", status.tracePaths.at(-1) ?? "");
  return check("status", "potential", status.status, status.tracePaths.at(-1) ?? "");
}

function parentCheck(root, work) {
  const parentId = work.doc.partOf || work.doc.parent;
  if (!parentId) return check("parent", "potential", "no parent required");
  const parent = findParent(root, parentId);
  if (!parent) return check("parent", "absurd", `missing parent ${parentId}`);
  const status = deriveWorkStatus(root, parent);
  if (["failed", "abandoned"].includes(status.status)) return check("parent", "active", `parent ${status.status}`);
  return check("parent", "potential", `parent ${parent.doc.title}`);
}

function witnessPathField(doc) {
  for (const key of ["compositionWitnessPath", "frobeniusWitnessPath"]) {
    const value = doc?.[key];
    if (value) return String(value);
  }
  return "";
}

function planCompositionCheck(root, work) {
  const parentId = work.doc.partOf || work.doc.parent;
  if (!parentId) return check("plan-composition", "potential", "no parent plan");
  const records = listWorkObjects(root);
  const parent = records.find((record) => record.doc.id === parentId);
  if (!parent) return check("plan-composition", "absurd", `missing parent ${parentId}`);
  const children = records.filter((record) => (record.doc.partOf || record.doc.parent) === parentId);
  const operation = planCompositionKind(children);
  if (!String(operation).startsWith("frobenius")) {
    return check("plan-composition", "potential", operation);
  }

  const witness = witnessPathField(work.doc) || witnessPathField(parent.doc);

  if (witness) return check("plan-composition", "potential", `${operation} witnessed`, witness);
  return check("plan-composition", "absurd", `${operation} requires explicit merge/split witness`);
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function finiteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function budgetLimit(source, ...keys) {
  for (const key of keys) {
    const numeric = finiteNumber(source[key]);
    if (numeric !== null) return numeric;
  }
  return null;
}

function costBudgetCheck(root, work) {
  const ceiling = objectValue(work.doc.costCeiling);
  const governanceBudget = objectValue(work.doc.governanceBudget);
  if (!Object.keys(ceiling).length && !Object.keys(governanceBudget).length) {
    return check("cost-budget", "potential", "no cost ceiling or governance budget declared");
  }

  const cost = costGraphSummary(root);
  const failures = [];
  const unknowns = [];
  const dimensions = cost.dimensions;
  const checks = [
    ["provider calls", dimensions.providerCalls, budgetLimit(ceiling, "providerCalls", "maxProviderCalls")],
    ["total tokens", dimensions.totalTokens, budgetLimit(ceiling, "totalTokens", "maxTotalTokens")],
    ["messages", dimensions.messages, budgetLimit(ceiling, "messages", "maxMessages")],
    ["office actions", dimensions.officeActions, budgetLimit(ceiling, "officeActions", "maxOfficeActions")],
    ["readiness witnesses", dimensions.readinessWitnesses, budgetLimit(ceiling, "readinessWitnesses", "maxReadinessWitnesses")],
    ["dependency-held work", dimensions.dependencyHeld, budgetLimit(ceiling, "dependencyHeld", "maxDependencyHeld")],
    ["blocked work", dimensions.blockedWork, budgetLimit(ceiling, "blockedWork", "maxBlockedWork")],
    ["governance decisions", dimensions.governanceDecisions, budgetLimit(governanceBudget, "decisions", "governanceDecisions", "maxDecisions")],
    ["rejected governance decisions", dimensions.rejectedGovernanceDecisions, budgetLimit(governanceBudget, "rejectedDecisions", "maxRejectedDecisions")],
  ];

  for (const [label, actual, limit] of checks) {
    if (limit === null) continue;
    if (Number(actual) > limit) failures.push(`${label} ${actual} > ${limit}`);
  }

  if (budgetLimit(ceiling, "totalTokens", "maxTotalTokens") !== null && dimensions.unknownTokenRows) {
    unknowns.push(`token cost has ${dimensions.unknownTokenRows} unknown usage rows`);
  }

  if (failures.length) return check("cost-budget", "active", failures.join("; "));
  if (unknowns.length) return check("cost-budget", "absurd", unknowns.join("; "));
  return check("cost-budget", "potential", "declared cost ceilings and governance budgets are within current fold");
}

export function computeReadiness(root, work, dispatcher, options = {}) {
  const checks = [
    statusCheck(root, work),
    dependencyCheck(root, work),
    capabilityCheck(work),
    toolAdmissionCheck(work, options),
    safetyEnvelopeCheck(work, options),
    worktreeIsolationCheck(root, work),
    authorityCheck(dispatcher),
    parentCheck(root, work),
    planCompositionCheck(root, work),
    costBudgetCheck(root, work),
  ];
  const value = composite(checks);
  const assigneeOffice = value === "potential" ? officeForSkill(work.doc.requiredSkill) : "";
  const now = options.now ?? new Date().toISOString();
  return {
    kind: "swarm.readiness",
    id: stableId([work.term, dispatcher?.name, checks, now], "readiness"),
    workId: work.doc.id,
    workTerm: work.term,
    workTitle: work.doc.title,
    dispatcher: dispatcher?.name ?? "",
    dispatcherOffice: dispatcher ? officeNameFor(dispatcher) : "",
    delegatedBy: options.delegatedBy ?? "",
    delegationOffice: options.delegationOffice ?? "",
    delegationAction: options.delegationAction ?? "",
    delegationDecisionPath: options.delegationDecisionPath ?? "",
    assigneeOffice,
    composite: value,
    checks,
    created: now,
  };
}

export function writeReadiness(root, work, dispatcher, options = {}) {
  const witness = computeReadiness(root, work, dispatcher, options);
  const term = `traces/readiness/${witness.id}`;
  return writeTrace(root, term, witness, options);
}

export function readinessSort(a, b) {
  const priority = priorityRank(a.work.doc.priority) - priorityRank(b.work.doc.priority);
  if (priority !== 0) return priority;
  return String(a.work.doc.created ?? "").localeCompare(String(b.work.doc.created ?? ""));
}
