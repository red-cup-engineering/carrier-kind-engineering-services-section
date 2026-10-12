/**
 * Generic governing-work substrate.  The Office/Duty vocabulary is an
 * executable corporate contract required by the Group.  Its relation to the
 * conditional jural theory is recorded as provenance only: no theorem or
 * theory-certified consequence is asserted here.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const THEORY_STATUS = "conditional-not-theorem-certified";
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};
const identity = (value) => `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
const ni = (value) => `ni:///sha-256;${createHash("sha256").update(canonical(value)).digest("base64url")}`;
const object = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
};
const text = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} is required`);
  return value;
};
const strings = (value, label, minimum = 0) => {
  if (!Array.isArray(value) || value.length < minimum) throw new TypeError(`${label} must contain ${minimum || "a"} value${minimum === 1 ? "" : "s"}`);
  return Object.freeze(value.map((entry, index) => text(entry, `${label}[${index}]`)));
};
const subset = (child, parent) => child.every((entry) => parent.includes(entry));
const refusal = (stage, reason, detail = {}) => Object.freeze({ kind: "GoverningWorkRefusal", version: 1, status: "refused", stage, reason, ...detail });
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/**
 * Loads a domain-owned file layout and validates it through this generic
 * contract. `recordsRoot` selects the domain; this package assigns no office
 * meaning and never grants allocation authority.
 */
export function loadGoverningWorkDefinitionReadModel({ recordsRoot }) {
  text(recordsRoot, "recordsRoot");
  const principalsPath = join(recordsRoot, "governing-principals.json");
  if (!existsFile(principalsPath)) return refusal("definition-read", "governing-principals-unavailable", { recordsRoot });
  const suiteRoot = join(recordsRoot, "c-suite");
  if (!existsDirectory(suiteRoot)) return refusal("definition-read", "c-suite-definitions-unavailable", { recordsRoot });
  const offices = [], duties = [], services = [];
  for (const entry of readdirSync(suiteRoot, { withFileTypes: true }).filter((candidate) => candidate.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const officeRoot = join(suiteRoot, entry.name);
    try {
      offices.push(readJson(join(officeRoot, "office.json")));
      duties.push(...readJson(join(officeRoot, "duties.json")));
      services.push(...readJson(join(officeRoot, "services.json")));
    } catch (error) {
      if (error?.code === "ENOENT") return refusal("definition-read", "office-definition-incomplete", { recordsRoot, office: entry.name });
      throw error;
    }
  }
  try {
    const definitions = validateGoverningWorkDefinitions({ principals: readJson(principalsPath), offices, duties, services });
    return Object.freeze({ kind: "GoverningWorkDefinitionReadModel", version: 1, status: "admitted", identity: identity(definitions), recordsRoot, definitions });
  } catch (error) {
    return refusal("definition-read", "definitions-invalid", { recordsRoot, detail: error instanceof Error ? error.message : String(error) });
  }
}
const existsFile = (path) => { try { return readFileSync(path), true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; } };
const existsDirectory = (path) => { try { return readdirSync(path), true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; } };

/** Validate the formal office/duty/service definitions without assigning a theorem status. */
export function validateGoverningWorkDefinitions(value) {
  const source = object(value, "definitions");
  const offices = source.offices ?? [];
  const duties = source.duties ?? [];
  const services = source.services ?? [];
  const principals = source.principals ?? [];
  if (!Array.isArray(offices) || !Array.isArray(duties) || !Array.isArray(services) || !Array.isArray(principals)) throw new TypeError("definitions principals, offices, duties, and services must be arrays");
  const principalIds = new Set();
  const officeIds = new Set();
  const dutyIds = new Set();
  const serviceIds = new Set();
  for (const principal of principals) {
    object(principal, "GoverningPrincipalDefinition"); text(principal.id, "GoverningPrincipalDefinition.id");
    if (principal.kind !== "leader-movement-team") throw new TypeError("GoverningPrincipalDefinition.kind must be leader-movement-team");
    text(principal.normativeSystem, "GoverningPrincipalDefinition.normativeSystem"); strings(principal.reservedDecisionClasses ?? [], "GoverningPrincipalDefinition.reservedDecisionClasses");
    if (!principalIds.add(principal.id)) throw new TypeError(`duplicate GoverningPrincipalDefinition ${principal.id}`);
  }
  for (const office of offices) {
    object(office, "OfficeDefinition");
    text(office.id, "OfficeDefinition.id"); text(office.normativeSystem, "OfficeDefinition.normativeSystem");
    text(office.appointingPrincipal, "OfficeDefinition.appointingPrincipal"); text(office.reportsTo, "OfficeDefinition.reportsTo");
    strings(office.actionDomain, "OfficeDefinition.actionDomain", 1); strings(office.deonticProfile, "OfficeDefinition.deonticProfile", 1); strings(office.installationEvidence, "OfficeDefinition.installationEvidence", 1);
    if (!principalIds.has(office.appointingPrincipal)) throw new TypeError(`OfficeDefinition ${office.id} has no governing appointing principal`);
    if (!officeIds.add(office.id)) throw new TypeError(`duplicate OfficeDefinition ${office.id}`);
  }
  for (const office of offices) if (!principalIds.has(office.reportsTo) && !officeIds.has(office.reportsTo)) throw new TypeError(`OfficeDefinition ${office.id} reports to an unknown principal or office`);
  for (const duty of duties) {
    object(duty, "DutyDefinition"); text(duty.id, "DutyDefinition.id"); text(duty.bearer, "DutyDefinition.bearer");
    text(duty.position, "DutyDefinition.position"); text(duty.normativeSystem, "DutyDefinition.normativeSystem");
    text(duty.requiredActOrState, "DutyDefinition.requiredActOrState"); text(duty.correlative, "DutyDefinition.correlative");
    text(duty.receiverCondition, "DutyDefinition.receiverCondition"); text(duty.service, "DutyDefinition.service"); text(duty.source, "DutyDefinition.source");
    strings(duty.requiredCapabilities, "DutyDefinition.requiredCapabilities"); strings(duty.allowedEffects, "DutyDefinition.allowedEffects");
    if (!officeIds.has(duty.bearer)) throw new TypeError(`DutyDefinition ${duty.id} bears on unknown office ${duty.bearer}`);
    if (!dutyIds.add(duty.id)) throw new TypeError(`duplicate DutyDefinition ${duty.id}`);
  }
  for (const service of services) {
    object(service, "ServiceDefinition"); text(service.id, "ServiceDefinition.id");
    strings(service.requiredCapabilities ?? [], "ServiceDefinition.requiredCapabilities");
    text(service.accountableOffice, "ServiceDefinition.accountableOffice"); strings(service.duties, "ServiceDefinition.duties", 1); text(service.offeredOutcome, "ServiceDefinition.offeredOutcome"); text(service.receiverCondition, "ServiceDefinition.receiverCondition");
    const stateVocabulary = strings(service.stateVocabulary ?? [], "ServiceDefinition.stateVocabulary");
    const requiredDistinctStates = strings(service.requiredDistinctStates ?? [], "ServiceDefinition.requiredDistinctStates");
    if (new Set(stateVocabulary).size !== stateVocabulary.length || !subset(requiredDistinctStates, stateVocabulary)) throw new TypeError(`ServiceDefinition ${service.id} has an invalid distinct state vocabulary`);
    if (!serviceIds.add(service.id)) throw new TypeError(`duplicate ServiceDefinition ${service.id}`);
  }
  return Object.freeze({
    kind: "GoverningWorkDefinitions", version: 1, theoryStatus: THEORY_STATUS,
    principals: Object.freeze(principals.map((entry) => Object.freeze({ ...entry }))),
    offices: Object.freeze(offices.map((entry) => Object.freeze({ ...entry }))),
    duties: Object.freeze(duties.map((entry) => Object.freeze({ ...entry }))),
    services: Object.freeze(services.map((entry) => Object.freeze({ ...entry }))),
  });
}

export function admitGoverningWork(input) {
  const value = object(input, "governing work admission");
  const definitions = validateGoverningWorkDefinitions(value.definitions);
  const intent = object(value.intent, "GoverningWorkIntent");
  text(intent.id, "GoverningWorkIntent.id"); text(intent.source, "GoverningWorkIntent.source"); text(intent.scope, "GoverningWorkIntent.scope");
  const allocation = object(value.allocation, "GoverningWorkAllocation");
  text(allocation.id, "GoverningWorkAllocation.id"); text(allocation.office, "GoverningWorkAllocation.office"); text(allocation.duty, "GoverningWorkAllocation.duty");
  text(allocation.character, "GoverningWorkAllocation.character"); text(allocation.scope, "GoverningWorkAllocation.scope"); text(allocation.receiver, "GoverningWorkAllocation.receiver");
  const duty = definitions.duties.find((entry) => entry.id === allocation.duty);
  if (!definitions.offices.some((entry) => entry.id === allocation.office)) return refusal("admission", "unknown-office", { office: allocation.office });
  if (duty === undefined || duty.bearer !== allocation.office) return refusal("admission", "office-duty-mismatch", { office: allocation.office, duty: allocation.duty });
  const service = definitions.services.find((entry) => entry.id === duty.service);
  if (service === undefined || service.accountableOffice !== allocation.office || !service.duties.includes(duty.id)) return refusal("admission", "duty-service-mismatch", { duty: duty.id, service: duty.service });
  if (allocation.scope !== intent.scope) return refusal("admission", "allocation-outside-intent", { scope: allocation.scope, intentScope: intent.scope });
  const capabilities = strings(allocation.capabilities ?? [], "GoverningWorkAllocation.capabilities");
  const requiredCapabilities = [...new Set([...duty.requiredCapabilities, ...service.requiredCapabilities])];
  if (!subset(requiredCapabilities, capabilities) || typeof allocation.incumbencyEvidence !== "string" || allocation.incumbencyEvidence.trim() === "") return refusal("admission", "character-capability-or-incumbency-unverified", { requiredCapabilities });
  const allowedEffects = strings(allocation.allowedEffects ?? [], "GoverningWorkAllocation.allowedEffects");
  if (!subset(allowedEffects, duty.allowedEffects)) return refusal("admission", "allocation-effect-outside-duty", { allowedEffects, duty: duty.id });
  const effectClasses = strings(allocation.effectClasses ?? [], "GoverningWorkAllocation.effectClasses");
  const reserved = new Set(definitions.principals.flatMap((principal) => principal.reservedDecisionClasses));
  const reservedRequested = effectClasses.filter((effect) => reserved.has(effect));
  if (reservedRequested.length > 0) {
    if (allocation.founderGrant === null || typeof allocation.founderGrant !== "object" || Array.isArray(allocation.founderGrant)) return refusal("admission", "reserved-effect-requires-founder-grant", { effectClasses: reservedRequested });
    const grant = allocation.founderGrant;
    if (!definitions.principals.some((principal) => principal.id === grant.principal) || !subset(reservedRequested, strings(grant.effectClasses ?? [], "GoverningWorkAllocation.founderGrant.effectClasses"))) return refusal("admission", "reserved-effect-requires-founder-grant", { effectClasses: reservedRequested });
  }
  const admitted = Object.freeze({ kind: "GoverningWorkAdmission", version: 1, definitions, intent: Object.freeze({ ...intent }), allocation: Object.freeze({ ...allocation, capabilities, allowedEffects, effectClasses }) });
  return Object.freeze({ kind: "GoverningWorkAdmissionReceipt", version: 1, status: "admitted", identity: identity(admitted), admitted });
}

export function admitGoverningWorkDelegation(parentReceipt, input) {
  if (parentReceipt?.kind !== "GoverningWorkAdmissionReceipt" || parentReceipt.status !== "admitted") return refusal("delegation", "parent-allocation-not-admitted");
  const parent = parentReceipt.admitted.allocation;
  const delegation = object(input, "GoverningWorkDelegation");
  text(delegation.id, "GoverningWorkDelegation.id"); text(delegation.delegate, "GoverningWorkDelegation.delegate"); text(delegation.scope, "GoverningWorkDelegation.scope");
  const parentEffects = strings(parent.allowedEffects ?? [], "parent.allowedEffects");
  const parentCapabilities = strings(parent.capabilities ?? [], "parent.capabilities");
  const effects = strings(delegation.allowedEffects ?? [], "GoverningWorkDelegation.allowedEffects");
  const capabilities = strings(delegation.requiredCapabilities ?? [], "GoverningWorkDelegation.requiredCapabilities");
  if (delegation.scope !== parent.scope || !subset(effects, parentEffects) || !subset(capabilities, parentCapabilities)) return refusal("delegation", "nemo-dat-attenuation-failed");
  const admitted = Object.freeze({ kind: "GoverningWorkDelegation", version: 1, ...delegation, parentAllocation: parent.id, delegator: parent.character, residualAccountability: parent.character, revocable: true, allowedEffects: effects, requiredCapabilities: capabilities });
  return Object.freeze({ kind: "GoverningWorkDelegationReceipt", version: 1, status: "admitted", identity: identity(admitted), admitted });
}

export function authorizeGoverningWorkExecution({ admission, delegation, execution, revoked = [] }) {
  if (admission?.status !== "admitted") return refusal("execution", "allocation-not-admitted");
  const request = object(execution, "GoverningWorkExecution");
  text(request.id, "GoverningWorkExecution.id"); text(request.actor, "GoverningWorkExecution.actor"); text(request.scope, "GoverningWorkExecution.scope");
  const allocation = admission.admitted.allocation;
  const grant = delegation?.admitted;
  if (grant !== undefined && (delegation.status !== "admitted" || revoked.includes(grant.id))) return refusal("execution", "delegation-revoked", { delegation: grant?.id });
  const actor = grant?.delegate ?? allocation.character;
  if (request.actor !== actor || request.scope !== allocation.scope) return refusal("execution", "actor-or-scope-not-authorized");
  const permittedEffects = grant?.allowedEffects ?? allocation.allowedEffects ?? [];
  const requestedEffects = strings(request.effects ?? [], "GoverningWorkExecution.effects");
  if (!subset(requestedEffects, permittedEffects)) return refusal("execution", "effect-not-authorized", { requestedEffects, permittedEffects });
  return Object.freeze({ kind: "GoverningWorkExecutionReceipt", version: 1, status: "authorized", identity: identity({ admission: admission.identity, delegation: delegation?.identity ?? null, execution: request }), execution: Object.freeze({ ...request }), expectedReceiver: allocation.receiver, accountableBearer: grant?.residualAccountability ?? allocation.character });
}

export function receiveGoverningWorkResult({ authorization, receiver, outcome, evidence = [] }) {
  if (authorization?.kind !== "GoverningWorkExecutionReceipt" || authorization.status !== "authorized") return refusal("receiving", "execution-not-authorized");
  if (receiver !== authorization.expectedReceiver) return refusal("receiving", "receiver-not-authenticated");
  object(outcome, "GoverningWorkOutcome");
  if (Object.keys(outcome).length === 0) throw new TypeError("GoverningWorkOutcome must not be empty");
  strings(evidence, "GoverningWorkReceivingEvidence", 1);
  return Object.freeze({ kind: "GoverningWorkReceivingReceipt", version: 1, status: "accepted", identity: identity({ authorization: authorization.identity, receiver, outcome, evidence }), authorization: authorization.identity, receiver, outcome, evidence: Object.freeze([...evidence]), accountableBearer: authorization.accountableBearer });
}

export function governingWorkReadout(receipts) {
  if (!Array.isArray(receipts)) throw new TypeError("receipts must be an array");
  return Object.freeze({ kind: "GoverningWorkReadout", version: 1, accepted: Object.freeze(receipts.filter((entry) => entry?.kind === "GoverningWorkReceivingReceipt" && entry.status === "accepted")), refused: Object.freeze(receipts.filter((entry) => entry?.kind === "GoverningWorkRefusal")), pending: Object.freeze(receipts.filter((entry) => entry?.kind === "GoverningWorkAdmissionReceipt" && entry.status === "admitted")) });
}

/** Codex's first consumer adapter: compiles provider candidates into admitted, portable work records. */
export function compileGoverningWorkProgram({ cycle, source, context = null, workItems }) {
  text(cycle, "cycle"); text(source, "source");
  if (!Array.isArray(workItems) || workItems.length === 0) throw new TypeError("workItems must be nonempty");
  const byRef = new Map();
  for (const [ordinal, raw] of workItems.entries()) {
    const item = object(raw, `workItems[${ordinal}]`); const ref = text(item.ref, `workItems[${ordinal}].ref`);
    if (byRef.has(ref)) throw new TypeError(`duplicate work item reference ${ref}`);
    const candidate = object(item.candidate, `workItems[${ordinal}].candidate`);
    byRef.set(ref, Object.freeze({ ...item, ref, ordinal, candidate: Object.freeze({ ...candidate }), objective: text(item.objective, `workItems[${ordinal}].objective`), desiredOutcome: text(item.desiredOutcome, `workItems[${ordinal}].desiredOutcome`), completionConditions: strings(item.completionConditions, `workItems[${ordinal}].completionConditions`, 1), dependencies: strings(item.dependencies ?? [], `workItems[${ordinal}].dependencies`) }));
  }
  for (const item of byRef.values()) for (const dependency of item.dependencies) { if (!byRef.has(dependency)) throw new TypeError(`work item ${item.ref} has missing dependency ${dependency}`); if (dependency === item.ref) throw new TypeError(`work item ${item.ref} cannot depend on itself`); }
  const visiting = new Set(); const ids = new Map();
  const itemId = (item) => { if (ids.has(item.ref)) return ids.get(item.ref); if (visiting.has(item.ref)) throw new TypeError(`work item dependency cycle includes ${item.ref}`); visiting.add(item.ref); const dependencies = item.dependencies.map((ref) => itemId(byRef.get(ref))); visiting.delete(item.ref); const id = ni({ kind: "GoverningWorkItem", cycle, ordinal: item.ordinal, objective: item.objective, desiredOutcome: item.desiredOutcome, completionConditions: item.completionConditions, dependencies, candidate: item.candidate }); ids.set(item.ref, id); return id; };
  const items = [...byRef.values()].map((item) => {
    const id = itemId(item); const dependencies = item.dependencies.map((ref) => ids.get(ref)); const sourceWork = Object.freeze({ taskId: id, dependsOn: Object.freeze(dependencies) });
    const ready = dependencies.length === 0;
    const demand = ready ? Object.freeze({ ...item.candidate, sourceWork }) : null;
    return Object.freeze({ id, kind: "GoverningWorkItem", cycle, ordinal: item.ordinal, ref: item.ref, objective: item.objective, desiredOutcome: item.desiredOutcome, completionConditions: item.completionConditions, dependencies: Object.freeze(dependencies), candidate: Object.freeze({ ...item.candidate }), state: "pending", typedPlacementDemand: demand, typedReadiness: ready ? Object.freeze({ disposition: "ready", sourceWork }) : Object.freeze({ disposition: "refused", refusal: refusal("readiness", "task-dependencies-not-achieved", { sourceWork }) }) });
  });
  const intent = context === null ? null : Object.freeze({ kind: "GoverningWorkIntent", version: 1, id: text(context.id, "context.id"), source, scope: `plan:${context.id}`, sources: Object.freeze([...(context.sources ?? []), { id: source, kind: "CodexLeaderPromptEvent" }]), ancestry: Object.freeze([...(context.ancestry ?? [])]), items });
  const program = Object.freeze({ kind: "GoverningWorkProgram", version: 1, theoryStatus: THEORY_STATUS, cycle, source, intent, items: Object.freeze(items) });
  return Object.freeze({ kind: "GoverningWorkAdmissionReceipt", version: 1, status: "admitted", identity: identity(program), program });
}
