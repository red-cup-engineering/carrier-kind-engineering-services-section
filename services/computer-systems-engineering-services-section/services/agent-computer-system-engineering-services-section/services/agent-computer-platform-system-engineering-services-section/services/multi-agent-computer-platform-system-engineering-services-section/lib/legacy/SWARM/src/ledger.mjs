import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { stableId } from "./cognition.mjs";
import { writeTrace } from "./events.mjs";
import { memoryRootOf } from "./memory.mjs";
import { officeNameFor } from "./offices.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";
import { toolAdmissionFor } from "./tool-policy.mjs";
import { listWorkObjects } from "./work.mjs";

function walkJsonl(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonl(path));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(path);
  }
  return out;
}

function rowsAt(path) {
  try {
    return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// Recover a cell's stored value v. TTMS stores a scalar/array as {const: v} and rides a plain
// object/boolean bare (swarm-sheaf.mjs:28-32). Mirror that so doc[a] is the value the writer wrote.
function cellValue(object) {
  return object !== null && typeof object === "object" && !Array.isArray(object) && "const" in object
    ? object.const
    : object;
}

// A cell whose charge is pos AND neg is a held ⊤ (the ⊤-resolution contract, §2): the obstruction
// proxy until cohomologyH1 lands. Ledger has no Class-B predicate today (contract §4, ledger.mjs B:
// none), but a contested cell is NEVER silently last-writer-collapsed: it is surfaced as a held value.
function isContradicted(charge) {
  return Boolean(charge?.value?.[0]) && Boolean(charge?.value?.[1]);
}

// docFromSection — the canonical fold over settledSection (swarm-sheaf.mjs:34-39), replacing the old
// `for (const row of rows) doc[row.a] = row.v` last-writer collapse (the silent bug the refounding
// closes). section.assignments preserve APPEND order, so for a Class-F predicate (ledger.mjs is all
// Class F/R, no B today — contract §4) the LAST assignment is the row-order-last object: assigning
// in iteration order reproduces the old append-order-last-writer BY CONSTRUCTION where it was right.
// A held-⊤ cell is kept held (calm), not collapsed.
function docFromSection(section) {
  const doc = {};
  for (const { cell, charge } of section.assignments) {
    const a = cellValue(cell.predicate);
    if (a === undefined) continue;
    if (isContradicted(charge)) {
      doc[a] = {
        contradicted: true,
        charges: [charge],
        witnesses: witnessOf(section, cell),
      };
      continue;
    }
    // Class F (append-order-last) / Class R (whole-array cell, written once): take this cell's value.
    doc[a] = cellValue(cell.object);
  }
  return doc;
}

function numberOrUnknown(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : "";
}

function addKnown(total, value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? total + numeric : total;
}

function ensureBucket(map, key) {
  const name = key || "unknown";
  if (!map.has(name)) {
    map.set(name, {
      key: name,
      providerCallCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      unknownUsageCount: 0,
      moneyAmount: 0,
    });
  }
  return map.get(name);
}

function addEntry(bucket, doc) {
  bucket.providerCallCount += Number(doc.providerCallCount) || 0;
  bucket.promptTokens = addKnown(bucket.promptTokens, doc.promptTokens);
  bucket.completionTokens = addKnown(bucket.completionTokens, doc.completionTokens);
  bucket.totalTokens = addKnown(bucket.totalTokens, doc.totalTokens);
  bucket.moneyAmount = addKnown(bucket.moneyAmount, doc.moneyAmount);
  if (!doc.usageKnown) bucket.unknownUsageCount += 1;
}

function ensureOfficeActionBucket(map, key) {
  const name = key || "unknown";
  if (!map.has(name)) {
    map.set(name, {
      key: name,
      officeActionCount: 0,
      governanceDecisionCount: 0,
      workRecordCount: 0,
      eventRecordCount: 0,
      readinessWitnessCount: 0,
      statusRecordCount: 0,
    });
  }
  return map.get(name);
}

function addOfficeActionEntry(bucket, doc) {
  bucket.officeActionCount += Number(doc.officeActionCount) || 0;
  bucket.governanceDecisionCount += Number(doc.governanceDecisionCount) || 0;
  bucket.workRecordCount += Number(doc.workRecordCount) || 0;
  bucket.eventRecordCount += Number(doc.eventRecordCount) || 0;
  bucket.readinessWitnessCount += Number(doc.readinessWitnessCount) || 0;
  bucket.statusRecordCount += Number(doc.statusRecordCount) || 0;
}

function ensureTraceBucket(map, key) {
  const name = key || "unknown";
  if (!map.has(name)) {
    map.set(name, {
      key: name,
      traceLedgerCount: 0,
      eventRecordCount: 0,
      readinessWitnessCount: 0,
      reportRecordCount: 0,
      workRecordCount: 0,
    });
  }
  return map.get(name);
}

function addTraceEntry(bucket, doc) {
  bucket.traceLedgerCount += 1;
  bucket.eventRecordCount += Number(doc.eventRecordCount) || 0;
  bucket.readinessWitnessCount += Number(doc.readinessWitnessCount) || 0;
  bucket.reportRecordCount += Number(doc.reportRecordCount) || 0;
  bucket.workRecordCount += Number(doc.workRecordCount) || 0;
}

function ensureMessageBucket(map, key) {
  const name = key || "unknown";
  if (!map.has(name)) {
    map.set(name, {
      key: name,
      messageLedgerCount: 0,
      localMessageCount: 0,
      providerMessageCount: 0,
      settledMessageCount: 0,
    });
  }
  return map.get(name);
}

function addMessageEntry(bucket, doc) {
  bucket.messageLedgerCount += 1;
  if (doc.local) bucket.localMessageCount += 1;
  else bucket.providerMessageCount += 1;
  if (doc.descentStage === "settled") bucket.settledMessageCount += 1;
}

function ensureGovernanceBucket(map, key) {
  const name = key || "unknown";
  if (!map.has(name)) {
    map.set(name, {
      key: name,
      governanceDecisionLedgerCount: 0,
      admittedDecisionCount: 0,
      rejectedDecisionCount: 0,
    });
  }
  return map.get(name);
}

function addGovernanceEntry(bucket, doc) {
  bucket.governanceDecisionLedgerCount += 1;
  if (doc.admitted) bucket.admittedDecisionCount += 1;
  else bucket.rejectedDecisionCount += 1;
}

function ensureToolBucket(map, key) {
  const name = key || "unknown";
  if (!map.has(name)) {
    map.set(name, {
      key: name,
      toolCallCount: 0,
      readToolCallCount: 0,
      writeToolCallCount: 0,
      computeToolCallCount: 0,
      okToolCallCount: 0,
      failedToolCallCount: 0,
    });
  }
  return map.get(name);
}

function addToolEntry(bucket, doc) {
  bucket.toolCallCount += Number(doc.toolCallCount) || 0;
  if (doc.toolScope === "read") bucket.readToolCallCount += Number(doc.toolCallCount) || 0;
  if (doc.toolScope === "write") bucket.writeToolCallCount += Number(doc.toolCallCount) || 0;
  if (doc.toolScope === "compute") bucket.computeToolCallCount += Number(doc.toolCallCount) || 0;
  if (doc.outcome === "ok") bucket.okToolCallCount += Number(doc.toolCallCount) || 0;
  else bucket.failedToolCallCount += Number(doc.toolCallCount) || 0;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ensureLedgerFoldBucket(map, key, label = key) {
  const name = key || "none";
  if (!map.has(name)) {
    map.set(name, {
      key: name,
      label: label || name,
      entryCount: 0,
      providerCallCount: 0,
      messageCount: 0,
      officeActionCount: 0,
      governanceDecisionCount: 0,
      toolCallCount: 0,
      traceEventCount: 0,
      readinessWitnessCount: 0,
      workRecordCount: 0,
      eventRecordCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      unknownUsageCount: 0,
      moneyAmount: 0,
      resourceUseNonzero: false,
      ledgerKinds: {},
    });
  }
  return map.get(name);
}

function addLedgerFoldEntry(bucket, doc) {
  bucket.entryCount += 1;
  bucket.ledgerKinds[doc.ledgerKind] = (bucket.ledgerKinds[doc.ledgerKind] ?? 0) + 1;
  bucket.providerCallCount += Number(doc.providerCallCount) || 0;
  bucket.messageCount += Number(doc.messageCount) || (doc.ledgerKind === "message" ? 1 : 0);
  bucket.officeActionCount += Number(doc.officeActionCount) || 0;
  bucket.governanceDecisionCount += Number(doc.governanceDecisionCount) || (doc.ledgerKind === "governance-decision" ? 1 : 0);
  bucket.toolCallCount += Number(doc.toolCallCount) || (doc.ledgerKind === "tool-call" ? 1 : 0);
  bucket.traceEventCount += doc.ledgerKind === "trace-event" ? 1 : 0;
  bucket.readinessWitnessCount += Number(doc.readinessWitnessCount) || (doc.ledgerKind === "readiness-witness" ? 1 : 0);
  bucket.workRecordCount += Number(doc.workRecordCount) || 0;
  bucket.eventRecordCount += Number(doc.eventRecordCount) || 0;
  bucket.promptTokens = addKnown(bucket.promptTokens, doc.promptTokens);
  bucket.completionTokens = addKnown(bucket.completionTokens, doc.completionTokens);
  bucket.totalTokens = addKnown(bucket.totalTokens, doc.totalTokens);
  bucket.moneyAmount = addKnown(bucket.moneyAmount, doc.moneyAmount);
  if (doc.ledgerKind === "provider-call" && !doc.usageKnown) bucket.unknownUsageCount += 1;
  if (doc.resourceUseNonzero) bucket.resourceUseNonzero = true;
}

function sortedLedgerBuckets(map) {
  return [...map.values()]
    .map((bucket) => ({
      ...bucket,
      ledgerKinds: Object.fromEntries(Object.entries(bucket.ledgerKinds).sort(([a], [b]) => a.localeCompare(b))),
    }))
    .sort((a, b) => b.entryCount - a.entryCount || a.key.localeCompare(b.key));
}

function timeWindowKey(created = "", window = "day") {
  const value = String(created || "");
  if (window === "hour") return value.slice(0, 13) || "unknown";
  if (window === "month") return value.slice(0, 7) || "unknown";
  return value.slice(0, 10) || "unknown";
}

function workIdsForLedgerDoc(doc) {
  return unique([
    ...(doc.workIds ?? []),
    ...(doc.statusWorkIds ?? []),
  ]);
}

function missionLookup(workObjects) {
  const byId = new Map(workObjects.map((work) => [work.doc.id, work]));
  const missionFor = (workId) => {
    let current = byId.get(workId);
    const seen = new Set();
    while (current?.doc?.id && !seen.has(current.doc.id)) {
      seen.add(current.doc.id);
      if (current.doc.workKind === "mission") return current;
      const nextId = current.doc.partOf || current.doc.parent;
      current = byId.get(nextId);
    }
    return null;
  };
  return { byId, missionFor };
}

function tracePathsFromOfficeResult(office = {}, memoryLog = "") {
  return unique([
    memoryLog,
    ...(office.traces ?? []),
    ...(office.governance ?? []).map((decision) => decision.log),
    ...(office.reports ?? []).flatMap((report) => report.tracePaths ?? []),
    ...(office.work ?? []).map((work) => work.log ?? work.path),
    ...(office.events ?? []).map((event) => event.path ?? event.log),
    ...(office.readiness ?? []).map((trace) => trace.path ?? trace.log),
    ...(office.status ?? []).flatMap((status) => status.tracePaths ?? []),
  ]);
}

function toolResultSummary(result = {}) {
  return {
    count: result.count ?? (Array.isArray(result.records) ? result.records.length : ""),
    term: result.term ?? "",
    summary: result.summary ?? "",
    planId: result.plan?.id ?? "",
  };
}

export function normalizeProviderUsage(usage = {}) {
  const source = usage && typeof usage === "object" ? usage : {};
  const promptTokens = numberOrUnknown(source.prompt_tokens ?? source.promptTokens ?? source.input_tokens ?? source.inputTokens);
  const completionTokens = numberOrUnknown(source.completion_tokens ?? source.completionTokens ?? source.output_tokens ?? source.outputTokens);
  const rawTotal = numberOrUnknown(source.total_tokens ?? source.totalTokens);
  const computedTotal = Number.isFinite(promptTokens) && Number.isFinite(completionTokens) ? promptTokens + completionTokens : "";
  const totalTokens = rawTotal === "" ? computedTotal : rawTotal;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    raw: source,
    known: promptTokens !== "" || completionTokens !== "" || totalTokens !== "",
  };
}

export function writeProviderLedgerEntry(root, agent, utterance, fields = {}, options = {}) {
  const token = utterance?.[0] ?? {};
  const usage = normalizeProviderUsage(token.usage);
  const now = options.now ?? token.created ?? new Date().toISOString();
  const id = fields.id ?? stableId(["provider-call", token.id, token.provider, token.model, usage, now], "ledger");
  const office = officeNameFor(agent);
  const term = `ledger/provider-calls/${id}`;
  return writeTrace(root, term, {
    kind: "swarm.ledger.provider_call",
    id,
    ledgerKind: "provider-call",
    created: now,
    messageId: token.id ?? "",
    providerResponseId: token.providerResponseId ?? "",
    agent: agent.name,
    office,
    provider: token.provider ?? agent.provider,
    model: token.model ?? agent.model,
    apiKeyEnv: token.apiKeyEnv ?? "",
    accountDebit: `expenses/computation/${office}/tokens`,
    accountCredit: `providers/${token.provider ?? agent.provider}/calls`,
    providerCallCount: 1,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    usageKnown: usage.known,
    usageRaw: usage.raw,
    moneyAmount: 0,
    moneyCurrency: "USD",
    moneyBasis: "user-stated-free-provider-access",
    resourceUseNonzero: true,
    costStatus: usage.known ? "measured-token-use" : "unknown-token-use",
    tracePaths: fields.tracePaths ?? [],
    descentStage: fields.descentStage ?? "",
    descentWitness: fields.descentWitness ?? {},
    evidence: "token-economy note: API tokens consumed are operational expense; traceability archive: ledger entries cite affected nodes and decisions",
  }, { ...options, t: id });
}

export function writeMessageLedgerEntry(root, agent, utterance, memory = {}, fields = {}, options = {}) {
  const token = utterance?.[0] ?? {};
  const now = options.now ?? token.created ?? new Date().toISOString();
  const office = officeNameFor(agent);
  const id = stableId(["message", token.id, agent.name, token.provider ?? agent.provider, token.model ?? agent.model, now], "ledger");
  const term = `ledger/messages/${id}`;
  return writeTrace(root, term, {
    kind: "swarm.ledger.message",
    id,
    ledgerKind: "message",
    created: now,
    messageId: token.id ?? "",
    messageTerm: memory.term ?? "",
    messagePath: memory.log ?? memory.path ?? "",
    agent: agent.name,
    office,
    provider: token.provider ?? agent.provider,
    model: token.model ?? agent.model,
    local: !!token.local,
    actionCount: token.actions?.length ?? fields.actions?.length ?? 0,
    actions: token.actions ?? fields.actions ?? [],
    accountDebit: `expenses/context/${office}/messages`,
    accountCredit: `memory/agents/${agent.name}/messages`,
    messageCount: 1,
    tracePaths: unique([memory.log ?? memory.path, ...(fields.tracePaths ?? [])]),
    moneyAmount: 0,
    moneyCurrency: "USD",
    moneyBasis: token.local ? "local-office-message" : "provider-message-context",
    resourceUseNonzero: true,
    costStatus: "message-context-recorded",
    descentStage: fields.descentStage ?? "",
    descentWitness: fields.descentWitness ?? {},
    evidence: "SWARM message loop is trace-native: every user-facing turn leaves a memory row and should be visible as ledger/accounting state",
  }, { ...options, t: id });
}

export function writeOfficeActionLedgerEntries(root, agent, office = {}, fields = {}, options = {}) {
  const actions = office.actions ?? [];
  if (!actions.length) return [];

  const token = fields.utterance?.[0] ?? {};
  const now = options.now ?? token.created ?? new Date().toISOString();
  const officeName = officeNameFor(agent);
  const tracePaths = tracePathsFromOfficeResult(office, fields.messageLog ?? "");
  const workIds = unique((office.work ?? []).map((work) => work.doc?.id));
  const workTerms = unique((office.work ?? []).map((work) => work.term ?? work.doc?.term));
  const eventIds = unique((office.events ?? []).map((event) => event.doc?.id));
  const eventTerms = unique((office.events ?? []).map((event) => event.term));
  const readinessTerms = unique((office.readiness ?? []).map((trace) => trace.term));
  const statusWorkIds = unique((office.status ?? []).map((status) => status.workId));

  return actions.map((action, index) => {
    const id = stableId(["office-action", token.id, agent.name, action, index, now], "ledger");
    const term = `ledger/office-actions/${id}`;
    return writeTrace(root, term, {
      kind: "swarm.ledger.office_action",
      id,
      ledgerKind: "office-action",
      created: now,
      messageId: token.id ?? "",
      agent: agent.name,
      office: officeName,
      capability: action,
      actionIndex: index,
      accountDebit: `expenses/coordination/${officeName}/${action}`,
      accountCredit: `offices/${officeName}/actions`,
      officeActionCount: 1,
      governanceDecisionCount: office.governance?.length ?? 0,
      workRecordCount: office.work?.length ?? 0,
      eventRecordCount: office.events?.length ?? 0,
      readinessWitnessCount: office.readiness?.length ?? 0,
      statusRecordCount: office.status?.length ?? 0,
      workIds,
      workTerms,
      eventIds,
      eventTerms,
      readinessTerms,
      statusWorkIds,
      tracePaths,
      moneyAmount: 0,
      moneyCurrency: "USD",
      moneyBasis: "local-office-action",
      resourceUseNonzero: tracePaths.length > 0,
      costStatus: "trace-measured-office-action",
      descentStage: fields.descentStage ?? "",
      descentWitness: fields.descentWitness ?? {},
      evidence: "SWARM prior-thought note: every agent act writes a witness; cost is a quantale spanning tokens, time, risk, context, and human attention",
    }, { ...options, t: id });
  });
}

export function writeGovernanceDecisionLedgerEntries(root, agent, office = {}, fields = {}, options = {}) {
  const decisions = office.governance ?? [];
  if (!decisions.length) return [];

  const token = fields.utterance?.[0] ?? {};
  const now = options.now ?? token.created ?? new Date().toISOString();
  const officeName = officeNameFor(agent);
  const messageLog = fields.messageLog ?? "";

  return decisions.map((decision, index) => {
    const actor = decision.actor ?? agent.name;
    const actorOffice = decision.office ?? officeName;
    const id = stableId(["governance-decision", token.id, actor, decision.id, index, now], "ledger");
    const term = `ledger/governance-decisions/${id}`;
    return writeTrace(root, term, {
      kind: "swarm.ledger.governance_decision",
      id,
      ledgerKind: "governance-decision",
      created: now,
      messageId: token.id ?? "",
      decisionId: decision.id ?? "",
      decisionTerm: decision.term ?? "",
      decisionPath: decision.log ?? "",
      agent: agent.name,
      office: officeName,
      actor,
      actorOffice,
      action: decision.action ?? "",
      targetKind: decision.target?.kind ?? "",
      targetTitle: decision.target?.title ?? "",
      admitted: !!decision.admitted,
      policy: "office-capability",
      reason: decision.reason ?? "",
      costWitnessKind: decision.costWitnessKind ?? "",
      costWitnessSummary: decision.costWitnessSummary ?? "",
      costWitness: decision.costWitness ?? {},
      accountDebit: `expenses/governance/${actorOffice}/${decision.action ?? "decision"}`,
      accountCredit: "governance/decisions",
      governanceDecisionCount: 1,
      admittedDecisionCount: decision.admitted ? 1 : 0,
      rejectedDecisionCount: decision.admitted ? 0 : 1,
      tracePaths: unique([messageLog, decision.log]),
      moneyAmount: 0,
      moneyCurrency: "USD",
      moneyBasis: "local-governance-decision",
      resourceUseNonzero: true,
      costStatus: decision.admitted ? "admitted-governance-decision" : "rejected-governance-decision",
      descentStage: fields.descentStage ?? "",
      descentWitness: fields.descentWitness ?? {},
      evidence: "office-capability governance writes admission decisions; ledger rows make authority checks accountable and cost-visible",
    }, { ...options, t: id });
  });
}

export function writeTraceLedgerEntries(root, agent, office = {}, fields = {}, options = {}) {
  const token = fields.utterance?.[0] ?? {};
  const now = options.now ?? token.created ?? new Date().toISOString();
  const officeName = officeNameFor(agent);
  const messageLog = fields.messageLog ?? "";
  const rows = [];

  for (const event of office.events ?? []) {
    const eventDoc = event.doc ?? {};
    const eventPath = event.path ?? event.log ?? "";
    const tracePaths = unique([messageLog, eventPath, ...(eventDoc.tracePaths ?? [])]);
    const workIds = unique([eventDoc.workId]);
    const workTerms = unique([eventDoc.workTerm]);
    const id = stableId(["trace-event", token.id, agent.name, eventDoc.eventType, eventDoc.id, now], "ledger");
    const term = `ledger/trace-events/${id}`;
    rows.push(writeTrace(root, term, {
      kind: "swarm.ledger.trace_event",
      id,
      ledgerKind: "trace-event",
      traceKind: eventDoc.eventType ?? "",
      created: now,
      messageId: token.id ?? "",
      agent: agent.name,
      office: officeName,
      eventId: eventDoc.id ?? "",
      eventTerm: event.term ?? "",
      eventPath,
      workIds,
      workTerms,
      actor: eventDoc.actor ?? agent.name,
      actorOffice: eventDoc.actorOffice ?? officeName,
      eventRecordCount: 1,
      readinessWitnessCount: 0,
      workRecordCount: workIds.length,
      accountDebit: `expenses/coordination/${officeName}/events/${eventDoc.eventType ?? "event"}`,
      accountCredit: `traces/events/${eventDoc.eventType ?? "event"}`,
      tracePaths,
      moneyAmount: 0,
      moneyCurrency: "USD",
      moneyBasis: "local-trace-event",
      resourceUseNonzero: true,
      costStatus: "trace-measured-event",
      descentStage: fields.descentStage ?? "",
      descentWitness: fields.descentWitness ?? {},
      evidence: "SWARM prior-thought feature mining: assignment, execution, review, and audit records are durable work/governance witnesses; ledger rows make those witnesses cost-visible",
    }, { ...options, t: id }));
  }

  for (const readiness of office.readiness ?? []) {
    const readinessDoc = readiness.doc ?? {};
    const readinessPath = readiness.path ?? readiness.log ?? "";
    const tracePaths = unique([messageLog, readinessPath, ...(readinessDoc.checks ?? []).map((check) => check.path)]);
    const workIds = unique([readinessDoc.workId]);
    const workTerms = unique([readinessDoc.workTerm]);
    const id = stableId(["readiness-witness", token.id, agent.name, readinessDoc.id, readinessDoc.composite, now], "ledger");
    const term = `ledger/readiness-witnesses/${id}`;
    rows.push(writeTrace(root, term, {
      kind: "swarm.ledger.readiness_witness",
      id,
      ledgerKind: "readiness-witness",
      traceKind: "readiness",
      created: now,
      messageId: token.id ?? "",
      agent: agent.name,
      office: officeName,
      readinessId: readinessDoc.id ?? "",
      readinessTerm: readiness.term ?? "",
      readinessPath,
      workIds,
      workTerms,
      workTitle: readinessDoc.workTitle ?? "",
      composite: readinessDoc.composite ?? "",
      checks: readinessDoc.checks ?? [],
      assigneeOffice: readinessDoc.assigneeOffice ?? "",
      eventRecordCount: 0,
      readinessWitnessCount: 1,
      workRecordCount: workIds.length,
      accountDebit: `expenses/coordination/${officeName}/readiness`,
      accountCredit: "traces/readiness",
      tracePaths,
      moneyAmount: 0,
      moneyCurrency: "USD",
      moneyBasis: "local-readiness-witness",
      resourceUseNonzero: true,
      costStatus: readinessDoc.composite === "potential" ? "ready-work-witness" : "unready-work-witness",
      descentStage: fields.descentStage ?? "",
      descentWitness: fields.descentWitness ?? {},
      evidence: "bilattice dispatch readiness note: readiness is computed, not declared; each readiness witness carries cost and dispatch evidence",
    }, { ...options, t: id }));
  }

  for (const report of office.reports ?? []) {
    const reportDoc = report.doc ?? {};
    const reportPath = report.path ?? report.log ?? "";
    const reportKind = reportDoc.reportKind ?? report.reportKind ?? report.kind ?? reportDoc.kind ?? "report";
    const workIds = unique([
      reportDoc.workId,
      reportDoc.projectId,
      reportDoc.id && reportDoc.workKind ? reportDoc.id : "",
      ...(reportDoc.childIds ?? []),
    ]);
    const workTerms = unique([
      report.term,
      reportDoc.workTerm,
      reportDoc.projectTerm,
      ...(reportDoc.childTerms ?? []),
    ]);
    const tracePaths = unique([messageLog, reportPath, ...(report.tracePaths ?? []), ...(reportDoc.tracePaths ?? [])]);
    const id = stableId(["report-witness", token.id, agent.name, reportKind, reportDoc.id ?? report.t ?? reportPath, now], "ledger");
    const term = `ledger/report-witnesses/${id}`;
    rows.push(writeTrace(root, term, {
      kind: "swarm.ledger.report_witness",
      id,
      ledgerKind: "report-witness",
      traceKind: "report",
      created: now,
      messageId: token.id ?? "",
      agent: agent.name,
      office: officeName,
      reportId: reportDoc.id ?? report.t ?? "",
      reportKind,
      reportedKind: reportDoc.kind ?? "",
      reportStatus: report.status ?? reportDoc.status ?? "",
      reportAction: report.action ?? reportDoc.action ?? "",
      reportTerm: report.term ?? "",
      reportPath,
      rowCount: report.rowCount ?? report.rows?.length ?? 0,
      workIds,
      workTerms,
      eventRecordCount: 0,
      readinessWitnessCount: 0,
      reportRecordCount: 1,
      workRecordCount: workIds.length,
      accountDebit: `expenses/coordination/${officeName}/reports/${reportKind}`,
      accountCredit: `traces/reports/${reportKind}`,
      tracePaths,
      moneyAmount: 0,
      moneyCurrency: "USD",
      moneyBasis: "local-report-witness",
      resourceUseNonzero: true,
      costStatus: "trace-measured-report",
      descentStage: fields.descentStage ?? "",
      descentWitness: fields.descentWitness ?? {},
      evidence: "SWARM EAVT report direction: pure call-to-report artifacts are durable witnesses whose paths must be cost-visible and replayable",
    }, { ...options, t: id }));
  }

  return rows;
}

export function writeToolLedgerEntries(root, agent, cognition = {}, fields = {}, options = {}) {
  const results = cognition.toolResults ?? [];
  if (!results.length) return [];

  const token = fields.utterance?.[0] ?? {};
  const now = options.now ?? token.created ?? new Date().toISOString();
  const office = officeNameFor(agent);
  const messageLog = fields.messageLog ?? "";
  const planTerm = cognition.planRecord?.term ?? "";

  return results.map((result, index) => {
    const admission = toolAdmissionFor(result.tool, fields.toolAuthorization ?? options.toolAuthorization ?? {});
    const policy = admission.policy;
    const scope = policy.scope;
    const id = stableId(["tool-call", token.id, agent.name, result.tool, index, now], "ledger");
    const term = `ledger/tool-calls/${id}`;
    return writeTrace(root, term, {
      kind: "swarm.ledger.tool_call",
      id,
      ledgerKind: "tool-call",
      traceKind: "tool-call",
      created: now,
      messageId: token.id ?? "",
      agent: agent.name,
      office,
      tool: result.tool,
      capability: policy.capability,
      toolScope: scope,
      toolCostClass: policy.costClass,
      toolSandbox: policy.sandbox,
      traceRequirement: policy.traceRequirement,
      authorization: policy.authorization,
      requiresLeaderAuthorization: policy.requiresLeaderAuthorization,
      toolPolicyKnown: policy.known,
      admitted: admission.admitted,
      admissionReason: admission.reason,
      delegatedBy: admission.delegatedBy,
      delegationDecisionPath: admission.delegationDecisionPath,
      leaderAuthorized: admission.leaderAuthorized,
      outcome: result.outcome ?? "unknown",
      toolCallCount: 1,
      readToolCallCount: scope === "read" ? 1 : 0,
      writeToolCallCount: scope === "write" ? 1 : 0,
      computeToolCallCount: scope === "compute" ? 1 : 0,
      resultSummary: toolResultSummary(result),
      capabilityGate: policy.authorization,
      gateSatisfied: admission.admitted,
      accountDebit: `expenses/tools/${office}/${scope}`,
      accountCredit: `tools/${result.tool}/calls`,
      tracePaths: unique([messageLog, planTerm, result.term]),
      moneyAmount: 0,
      moneyCurrency: "USD",
      moneyBasis: "local-deterministic-tool",
      resourceUseNonzero: true,
      costStatus: result.outcome === "ok" ? `${scope}-tool-call` : "failed-tool-call",
      descentStage: fields.descentStage ?? "",
      descentWitness: fields.descentWitness ?? {},
      evidence: "capability-gate notes require privileged operations to pass explicit gates; RTL fuel accounting requires runtime tool use to leave evidence vectors",
    }, { ...options, t: id });
  });
}

export function listLedgerEntries(root, options = {}) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, "ledger");
  return walkJsonl(base).map((path) => {
    // Raw rows recover the term and preserve the {path,term,doc,rows} public record shape ONLY;
    // the doc is folded from the canonical settled section, never from doc[row.a]=row.v.
    const rows = rowsAt(path);
    const term = rows[0]?.e;
    const doc = term ? docFromSection(settledSection(memoryRoot, term)) : docFromRows(rows);
    return { path, term, doc, rows };
  }).filter((record) => {
    if (!record.term) return false;
    if (options.ledgerKind && record.doc.ledgerKind !== options.ledgerKind) return false;
    if (options.provider && record.doc.provider !== options.provider) return false;
    if (options.office && record.doc.office !== options.office) return false;
    if (options.capability && record.doc.capability !== options.capability) return false;
    if (options.tool && record.doc.tool !== options.tool) return false;
    if (options.messageId && record.doc.messageId !== options.messageId) return false;
    if (options.workId && !(record.doc.workIds ?? []).includes(options.workId)) return false;
    return true;
  }).sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")));
}

export function ledgerFoldSummary(root, options = {}) {
  const entries = listLedgerEntries(root, options);
  const workObjects = listWorkObjects(root);
  const { byId, missionFor } = missionLookup(workObjects);
  const byWorkItem = new Map();
  const byMission = new Map();
  const byOffice = new Map();
  const byProvider = new Map();
  const byCapability = new Map();
  const byTimeWindow = new Map();
  const summary = ensureLedgerFoldBucket(new Map(), "all", "all ledger rows");

  for (const entry of entries) {
    const doc = entry.doc ?? entry;
    addLedgerFoldEntry(summary, doc);

    for (const office of doc.office ? [doc.office] : ["none"]) {
      addLedgerFoldEntry(ensureLedgerFoldBucket(byOffice, office), doc);
    }

    for (const provider of doc.provider ? [doc.provider] : ["none"]) {
      addLedgerFoldEntry(ensureLedgerFoldBucket(byProvider, provider), doc);
    }

    const capabilities = unique([doc.capability, doc.action, doc.traceKind, doc.ledgerKind]);
    for (const capability of capabilities.length ? capabilities : ["none"]) {
      addLedgerFoldEntry(ensureLedgerFoldBucket(byCapability, capability), doc);
    }

    addLedgerFoldEntry(ensureLedgerFoldBucket(byTimeWindow, timeWindowKey(doc.created, options.timeWindow), timeWindowKey(doc.created, options.timeWindow)), doc);

    const workIds = workIdsForLedgerDoc(doc);
    const workGroup = workIds.length ? workIds : ["none"];
    for (const workId of workGroup) {
      const work = byId.get(workId);
      addLedgerFoldEntry(ensureLedgerFoldBucket(byWorkItem, workId, work?.doc?.title ?? workId), doc);
    }

    const missions = unique(workIds.map((workId) => missionFor(workId)?.doc?.id));
    const missionGroup = missions.length ? missions : ["none"];
    for (const missionId of missionGroup) {
      const mission = byId.get(missionId);
      addLedgerFoldEntry(ensureLedgerFoldBucket(byMission, missionId, mission?.doc?.title ?? missionId), doc);
    }
  }

  return {
    kind: "swarm.ledger.fold",
    evidence: "token-economy-from-predication: messaging, accounting, gamification, and governance are one predication graph read through different ledger lenses",
    summary,
    dimensions: {
      timeWindow: options.timeWindow ?? "day",
      workObjects: workObjects.length,
      workBuckets: byWorkItem.size,
      missionBuckets: byMission.size,
      officeBuckets: byOffice.size,
      providerBuckets: byProvider.size,
      capabilityBuckets: byCapability.size,
      timeBuckets: byTimeWindow.size,
    },
    byWorkItem: sortedLedgerBuckets(byWorkItem),
    byMission: sortedLedgerBuckets(byMission),
    byOffice: sortedLedgerBuckets(byOffice),
    byProvider: sortedLedgerBuckets(byProvider),
    byCapability: sortedLedgerBuckets(byCapability),
    byTimeWindow: sortedLedgerBuckets(byTimeWindow),
  };
}

export function foldProviderLedgerEntries(entries = []) {
  const byProvider = new Map();
  const byOffice = new Map();
  const byDebitAccount = new Map();
  const summary = {
    ledgerKind: "provider-call",
    entryCount: 0,
    providerCallCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    unknownUsageCount: 0,
    moneyAmount: 0,
    moneyCurrency: "USD",
    moneyBasis: "user-stated-free-provider-access",
    resourceUseNonzero: false,
    byProvider: [],
    byOffice: [],
    byDebitAccount: [],
  };

  for (const entry of entries) {
    const doc = entry.doc ?? entry;
    summary.entryCount += 1;
    addEntry(summary, doc);
    addEntry(ensureBucket(byProvider, doc.provider), doc);
    addEntry(ensureBucket(byOffice, doc.office), doc);
    addEntry(ensureBucket(byDebitAccount, doc.accountDebit), doc);
  }

  summary.resourceUseNonzero = summary.providerCallCount > 0 || summary.totalTokens > 0 || summary.unknownUsageCount > 0;
  summary.byProvider = [...byProvider.values()].sort((a, b) => b.providerCallCount - a.providerCallCount || a.key.localeCompare(b.key));
  summary.byOffice = [...byOffice.values()].sort((a, b) => b.providerCallCount - a.providerCallCount || a.key.localeCompare(b.key));
  summary.byDebitAccount = [...byDebitAccount.values()].sort((a, b) => b.providerCallCount - a.providerCallCount || a.key.localeCompare(b.key));
  return summary;
}

export function providerLedgerSummary(root, options = {}) {
  const entries = listLedgerEntries(root, { ...options, ledgerKind: "provider-call" });
  return {
    entries,
    summary: foldProviderLedgerEntries(entries),
  };
}

export function foldOfficeActionLedgerEntries(entries = []) {
  const byOffice = new Map();
  const byCapability = new Map();
  const byDebitAccount = new Map();
  const summary = {
    ledgerKind: "office-action",
    entryCount: 0,
    officeActionCount: 0,
    governanceDecisionCount: 0,
    workRecordCount: 0,
    eventRecordCount: 0,
    readinessWitnessCount: 0,
    statusRecordCount: 0,
    byOffice: [],
    byCapability: [],
    byDebitAccount: [],
  };

  for (const entry of entries) {
    const doc = entry.doc ?? entry;
    summary.entryCount += 1;
    addOfficeActionEntry(summary, doc);
    addOfficeActionEntry(ensureOfficeActionBucket(byOffice, doc.office), doc);
    addOfficeActionEntry(ensureOfficeActionBucket(byCapability, doc.capability), doc);
    addOfficeActionEntry(ensureOfficeActionBucket(byDebitAccount, doc.accountDebit), doc);
  }

  const sortBuckets = (buckets) => [...buckets.values()].sort((a, b) => b.officeActionCount - a.officeActionCount || a.key.localeCompare(b.key));
  summary.byOffice = sortBuckets(byOffice);
  summary.byCapability = sortBuckets(byCapability);
  summary.byDebitAccount = sortBuckets(byDebitAccount);
  return summary;
}

export function officeActionLedgerSummary(root, options = {}) {
  const entries = listLedgerEntries(root, { ...options, ledgerKind: "office-action" });
  return {
    entries,
    summary: foldOfficeActionLedgerEntries(entries),
  };
}

export function foldTraceLedgerEntries(entries = []) {
  const byTraceKind = new Map();
  const byOffice = new Map();
  const byDebitAccount = new Map();
  const summary = {
    ledgerKind: "trace",
    entryCount: 0,
    traceLedgerCount: 0,
    eventRecordCount: 0,
    readinessWitnessCount: 0,
    reportRecordCount: 0,
    workRecordCount: 0,
    byTraceKind: [],
    byOffice: [],
    byDebitAccount: [],
  };

  for (const entry of entries) {
    const doc = entry.doc ?? entry;
    summary.entryCount += 1;
    addTraceEntry(summary, doc);
    addTraceEntry(ensureTraceBucket(byTraceKind, doc.traceKind ?? doc.ledgerKind), doc);
    addTraceEntry(ensureTraceBucket(byOffice, doc.office), doc);
    addTraceEntry(ensureTraceBucket(byDebitAccount, doc.accountDebit), doc);
  }

  const sortBuckets = (buckets) => [...buckets.values()].sort((a, b) => b.traceLedgerCount - a.traceLedgerCount || a.key.localeCompare(b.key));
  summary.byTraceKind = sortBuckets(byTraceKind);
  summary.byOffice = sortBuckets(byOffice);
  summary.byDebitAccount = sortBuckets(byDebitAccount);
  return summary;
}

export function traceLedgerSummary(root, options = {}) {
  const entries = [
    ...listLedgerEntries(root, { ...options, ledgerKind: "trace-event" }),
    ...listLedgerEntries(root, { ...options, ledgerKind: "readiness-witness" }),
    ...listLedgerEntries(root, { ...options, ledgerKind: "report-witness" }),
  ].sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")));
  return {
    entries,
    summary: foldTraceLedgerEntries(entries),
  };
}

export function foldMessageLedgerEntries(entries = []) {
  const byAgent = new Map();
  const byOffice = new Map();
  const byProvider = new Map();
  const summary = {
    ledgerKind: "message",
    entryCount: 0,
    messageLedgerCount: 0,
    localMessageCount: 0,
    providerMessageCount: 0,
    settledMessageCount: 0,
    byAgent: [],
    byOffice: [],
    byProvider: [],
  };

  for (const entry of entries) {
    const doc = entry.doc ?? entry;
    summary.entryCount += 1;
    addMessageEntry(summary, doc);
    addMessageEntry(ensureMessageBucket(byAgent, doc.agent), doc);
    addMessageEntry(ensureMessageBucket(byOffice, doc.office), doc);
    addMessageEntry(ensureMessageBucket(byProvider, doc.provider), doc);
  }

  const sortBuckets = (buckets) => [...buckets.values()].sort((a, b) => b.messageLedgerCount - a.messageLedgerCount || a.key.localeCompare(b.key));
  summary.byAgent = sortBuckets(byAgent);
  summary.byOffice = sortBuckets(byOffice);
  summary.byProvider = sortBuckets(byProvider);
  return summary;
}

export function messageLedgerSummary(root, options = {}) {
  const entries = listLedgerEntries(root, { ...options, ledgerKind: "message" });
  return {
    entries,
    summary: foldMessageLedgerEntries(entries),
  };
}

export function foldGovernanceDecisionLedgerEntries(entries = []) {
  const byOffice = new Map();
  const byAction = new Map();
  const byPolicy = new Map();
  const summary = {
    ledgerKind: "governance-decision",
    entryCount: 0,
    governanceDecisionLedgerCount: 0,
    admittedDecisionCount: 0,
    rejectedDecisionCount: 0,
    byOffice: [],
    byAction: [],
    byPolicy: [],
  };

  for (const entry of entries) {
    const doc = entry.doc ?? entry;
    summary.entryCount += 1;
    addGovernanceEntry(summary, doc);
    addGovernanceEntry(ensureGovernanceBucket(byOffice, doc.office), doc);
    addGovernanceEntry(ensureGovernanceBucket(byAction, doc.action), doc);
    addGovernanceEntry(ensureGovernanceBucket(byPolicy, doc.policy), doc);
  }

  const sortBuckets = (buckets) => [...buckets.values()].sort((a, b) => b.governanceDecisionLedgerCount - a.governanceDecisionLedgerCount || a.key.localeCompare(b.key));
  summary.byOffice = sortBuckets(byOffice);
  summary.byAction = sortBuckets(byAction);
  summary.byPolicy = sortBuckets(byPolicy);
  return summary;
}

export function governanceDecisionLedgerSummary(root, options = {}) {
  const entries = listLedgerEntries(root, { ...options, ledgerKind: "governance-decision" });
  return {
    entries,
    summary: foldGovernanceDecisionLedgerEntries(entries),
  };
}

export function foldToolLedgerEntries(entries = []) {
  const byTool = new Map();
  const byOffice = new Map();
  const byScope = new Map();
  const byOutcome = new Map();
  const summary = {
    ledgerKind: "tool-call",
    entryCount: 0,
    toolCallCount: 0,
    readToolCallCount: 0,
    writeToolCallCount: 0,
    computeToolCallCount: 0,
    okToolCallCount: 0,
    failedToolCallCount: 0,
    byTool: [],
    byOffice: [],
    byScope: [],
    byOutcome: [],
  };

  for (const entry of entries) {
    const doc = entry.doc ?? entry;
    summary.entryCount += 1;
    addToolEntry(summary, doc);
    addToolEntry(ensureToolBucket(byTool, doc.tool), doc);
    addToolEntry(ensureToolBucket(byOffice, doc.office), doc);
    addToolEntry(ensureToolBucket(byScope, doc.toolScope), doc);
    addToolEntry(ensureToolBucket(byOutcome, doc.outcome), doc);
  }

  const sortBuckets = (buckets) => [...buckets.values()].sort((a, b) => b.toolCallCount - a.toolCallCount || a.key.localeCompare(b.key));
  summary.byTool = sortBuckets(byTool);
  summary.byOffice = sortBuckets(byOffice);
  summary.byScope = sortBuckets(byScope);
  summary.byOutcome = sortBuckets(byOutcome);
  return summary;
}

export function toolLedgerSummary(root, options = {}) {
  const entries = listLedgerEntries(root, { ...options, ledgerKind: "tool-call" });
  return {
    entries,
    summary: foldToolLedgerEntries(entries),
  };
}
