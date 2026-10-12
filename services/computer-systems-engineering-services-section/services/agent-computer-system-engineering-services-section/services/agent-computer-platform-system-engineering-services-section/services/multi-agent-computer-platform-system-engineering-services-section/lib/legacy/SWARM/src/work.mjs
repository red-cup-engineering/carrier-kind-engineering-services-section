import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { address } from "@561-group/computer/typed-filepath-addressing-system/addressing";
import read from "@561-group/computer/typed-term-memory-system/reading";
import write from "@561-group/computer/typed-term-memory-system/writing";

// the term's EAVT log path: TFAS addressing pinned to the jsonl/EAVT type (formerly TTMS's logPath).
const logPath = (root, term) => address(root, term, "jsonl");

import { readRecord, stableId, tokenize } from "./cognition.mjs";
import { memoryRootOf } from "./memory.mjs";
import { settledSection } from "./swarm-sheaf.mjs";
import { workTuplet } from "./tuplets.mjs";

const PLURALS = {
  mission: "missions",
  campaign: "campaigns",
  project: "projects",
  workitem: "workitems",
  task: "tasks",
  plan: "plans",
};

function titleCase(text) {
  const trimmed = String(text).trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled";
  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`;
}

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

// A cell's charge is the bilattice charge {value:[pos,neg], evidence:[posIds,negIds]} (eavt/settling).
// A held-⊤ is the SAME object told both affirm and converse — pos AND neg — the obstruction the
// refounding exists to preserve (⊤-resolution contract §3 Class B). Distinct objects for one
// (subject,predicate) are NOT a held-⊤: they are co-affirmation (each [true,false]) and resolve by
// CLASS — for work.mjs every predicate resolves Class-F (row-order-last) or Class-R (the set), and
// the array-valued Class-R predicates ride as a single array-object per row, so row-order-last over
// the section recovers their current set exactly (see baseDoc: dependsOn et al. are written whole).
const isContradicted = (charge) => Boolean(charge?.value?.[0]) && Boolean(charge?.value?.[1]);

// docFromSection — the canonical fold of one term's settled section into a flat doc, replacing the
// readFileSync().split().map(JSON.parse) + doc[row.a]=row.v last-writer hand-parse. settledSection
// keeps DISTINCT objects of one (subject,predicate) as DISTINCT cells, so this never collapses a
// contested cell silently. For work.mjs the resolution is ROW-ORDER-LAST-WRITER per predicate (NOT
// newest-`t`: pre-P0 `t` is id-valued and mis-orders — ⊤-resolution contract §3 Class F, plan risk
// #1). Append order is recovered from the raw JSONL rows (read ONLY for order, never to re-fold a
// value). A held-⊤ cell (one object affirmed AND denied) is surfaced HELD, not picked.
export function docFromSection(section, rows) {
  // group the section's settled cells by predicate; carry charge for held-⊤ detection.
  const byPredicate = new Map();
  for (const { cell, charge } of section.assignments) {
    const predicate = cell?.predicate?.const ?? cell?.predicate;
    if (predicate === undefined || predicate === null) continue;
    const object = cell?.object?.const ?? cell?.object;
    const list = byPredicate.get(predicate) ?? [];
    list.push({ object, charge });
    byPredicate.set(predicate, list);
  }
  const doc = {};
  const held = {};
  for (const [predicate, cells] of byPredicate) {
    const contradicted = cells.filter((c) => isContradicted(c.charge));
    if (contradicted.length) {
      // Class-B escalation: a lifecycle/scalar cell settled to ⊤ stays HELD — surface BOTH charges,
      // never invent a winner (⊤-resolution contract §3 Class B; work.mjs has no structural B today,
      // a `status` affirmed-and-denied is the only path here). The functional value still resolves to
      // the row-order-last object so downstream shape stays total; the contradiction rides alongside.
      held[predicate] = {
        contradicted: true,
        charges: cells.map((c) => c.charge),
      };
    }
    // ROW-ORDER-LAST: the append-order-last row IS the current object. The section's append-only log
    // settles the same (predicate, object) into one cell, so the LAST appended row's object is the
    // last surviving cell. When a predicate has >1 surviving object (a succession like open->done),
    // the row whose `v` matches the last-appended row for this predicate is the answer.
    const lastRow = rows.findLast((row) => row.a === predicate);
    const lastObject = lastRow?.v;
    // prefer the cell whose object equals the last-appended row's value (faithful append-order-last);
    // fall back to the sole cell when only one survives.
    const winner = cells.find((c) => sameObject(c.object, lastObject)) ?? cells[cells.length - 1];
    doc[predicate] = winner.object;
  }
  if (Object.keys(held).length) Object.defineProperty(doc, "contradicted", { value: held, enumerable: false });
  return doc;
}

// Object equality for append-order matching: scalars compare by ===, arrays/objects by stable JSON.
function sameObject(a, b) {
  if (a === b) return true;
  if (a && b && typeof a === "object" && typeof b === "object") {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  }
  return false;
}

export function workTerm(kind, id) {
  const collection = PLURALS[kind];
  if (!collection) throw new Error(`Unsupported work kind "${kind}".`);
  return `work/${collection}/${id}`;
}

function rowsForDoc(term, doc, t) {
  return Object.entries(doc).map(([a, v]) => ({ e: term, a, v, t }));
}

export function buildWorkObjectReport(root, kind, fields = {}, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const title = titleCase(fields.title ?? fields.goal ?? kind);
  const id = fields.id ?? stableId([kind, title, fields.parent ?? null], kind);
  const term = workTerm(kind, id);
  const existing = readRecord(root, term);
  const rawCommensurateWith = fields.commensurateWith ?? existing.commensurateWith ?? [];
  const commensurateWith = Array.isArray(rawCommensurateWith)
    ? rawCommensurateWith
    : rawCommensurateWith
      ? [rawCommensurateWith]
      : [];
  const expectedCostShape = fields.expectedCostShape ?? existing.expectedCostShape ?? "";
  const convergenceCriteria = fields.convergenceCriteria ?? existing.convergenceCriteria ?? "";
  const costCeiling = fields.costCeiling ?? existing.costCeiling ?? {};
  const governanceBudget = fields.governanceBudget ?? existing.governanceBudget ?? {};
  const readPaths = fields.readPaths ?? fields.reads ?? existing.readPaths ?? existing.reads ?? [];
  const writePaths = fields.writePaths ?? fields.writes ?? existing.writePaths ?? existing.writes ?? [];
  const runbookActs = fields.runbookActs ?? existing.runbookActs ?? [];
  const policyRequirements = fields.policyRequirements ?? existing.policyRequirements ?? [];
  const runbookInputs = fields.runbookInputs ?? existing.runbookInputs ?? [];
  const runbookOutputs = fields.runbookOutputs ?? existing.runbookOutputs ?? [];
  const baseDoc = {
    kind: `swarm.work.${kind}`,
    id,
    workKind: kind,
    title,
    goal: fields.goal ?? title,
    status: fields.status ?? existing.status ?? "open",
    parent: fields.parent ?? existing.parent ?? "",
    partOf: fields.partOf ?? fields.parent ?? existing.partOf ?? "",
    dependsOn: fields.dependsOn ?? existing.dependsOn ?? [],
    handoffPredicate: fields.handoffPredicate ?? existing.handoffPredicate ?? "",
    precondition: fields.precondition ?? existing.precondition ?? "",
    postcondition: fields.postcondition ?? existing.postcondition ?? "",
    coordination: fields.coordination ?? existing.coordination ?? "",
    expectedCostShape,
    convergenceCriteria,
    costCeiling,
    governanceBudget,
    readPaths,
    writePaths,
    worktreeIsolation: fields.worktreeIsolation ?? existing.worktreeIsolation ?? "",
    worktreePath: fields.worktreePath ?? existing.worktreePath ?? "",
    developmentStyle: fields.developmentStyle ?? existing.developmentStyle ?? "",
    developmentPhase: fields.developmentPhase ?? existing.developmentPhase ?? "",
    commensurateWith,
    runbookName: fields.runbookName ?? existing.runbookName ?? "",
    runbookStepId: fields.runbookStepId ?? existing.runbookStepId ?? "",
    runbookStepIndex: fields.runbookStepIndex ?? existing.runbookStepIndex ?? "",
    runbookActs,
    policyRequirements,
    runbookInputs,
    runbookOutputs,
    planCompositionWitness: fields.planCompositionWitness ?? existing.planCompositionWitness ?? "",
    frobeniusWitness: fields.frobeniusWitness ?? existing.frobeniusWitness ?? "",
    mergeSplitWitness: fields.mergeSplitWitness ?? existing.mergeSplitWitness ?? "",
    compositionWitnessPath: fields.compositionWitnessPath ?? existing.compositionWitnessPath ?? "",
    frobeniusWitnessPath: fields.frobeniusWitnessPath ?? existing.frobeniusWitnessPath ?? "",
    evidence: fields.evidence ?? existing.evidence ?? "",
    requiredSkill: fields.requiredSkill ?? existing.requiredSkill ?? "",
    priority: fields.priority ?? existing.priority ?? "normal",
    createdBy: fields.createdBy ?? existing.createdBy ?? "",
    office: fields.office ?? existing.office ?? "",
    created: existing.created ?? now,
    updated: now,
    keywords: tokenize([
      title,
      fields.goal ?? "",
      fields.requiredSkill ?? "",
      fields.handoffPredicate ?? "",
      expectedCostShape,
      convergenceCriteria,
      JSON.stringify(costCeiling),
      JSON.stringify(governanceBudget),
      JSON.stringify(readPaths),
      JSON.stringify(writePaths),
      fields.developmentStyle ?? "",
      fields.developmentPhase ?? "",
      fields.runbookName ?? "",
      fields.runbookStepId ?? "",
      JSON.stringify(runbookActs),
      JSON.stringify(policyRequirements),
      JSON.stringify(runbookInputs),
      JSON.stringify(runbookOutputs),
      fields.planCompositionWitness ?? "",
      fields.frobeniusWitness ?? "",
      fields.mergeSplitWitness ?? "",
      fields.compositionWitnessPath ?? "",
      fields.frobeniusWitnessPath ?? "",
      ...commensurateWith,
    ].join(" ")),
  };
  const doc = {
    ...baseDoc,
    tuplet: fields.tuplet ?? workTuplet(baseDoc),
  };
  const t = options.t ?? now;
  const rows = rowsForDoc(term, doc, t);
  return {
    kind: "swarm.report.work_object",
    status: "proposed",
    action: fields.action ?? `work.${kind}.create`,
    evidence: "SWARM EAVT persistence direction: work writes are proposed as subject-predicate-object rows before durable admission",
    created: !existing.kind,
    term,
    log: logPath(memoryRootOf(root), term),
    t,
    rows,
    rowCount: rows.length,
    doc,
    existing,
    tracePaths: [],
  };
}

export function commitWorkObjectReport(root, report, options = {}) {
  if (!report?.term || !report?.doc) throw new TypeError("commitWorkObjectReport: report must include term and doc");
  const written = write(memoryRootOf(root), report.term, report.doc, { t: report.t ?? options.t ?? new Date().toISOString() });
  return {
    ...report,
    status: report.status ?? "admitted",
    count: written.count,
    read: read(memoryRootOf(root), report.term),
    doc: readRecord(root, report.term),
    path: logPath(memoryRootOf(root), report.term),
    log: logPath(memoryRootOf(root), report.term),
    tracePaths: [...new Set([...(report.tracePaths ?? []), logPath(memoryRootOf(root), report.term)].filter(Boolean))],
  };
}

export function createWorkObject(root, kind, fields = {}, options = {}) {
  const report = buildWorkObjectReport(root, kind, fields, options);
  const admitted = {
    ...report,
    status: "admitted",
  };
  return {
    ...commitWorkObjectReport(root, admitted, options),
    report: admitted,
  };
}

export function listWorkObjects(root, options = {}) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, "work");
  return walkJsonl(base).map((path) => {
    const rows = rowsAt(path);
    const term = rows[0]?.e;
    // The canonical fold: settle the term's append-only log into its section, then project to a flat
    // doc by the ⊤-resolution contract (row-order-last per predicate; held-⊤ preserved). rows are
    // kept ONLY to recover append order and to honor the public `record.rows` shape downstream.
    const doc = term ? docFromSection(settledSection(memoryRoot, term), rows) : {};
    return { path, term, doc, rows };
  }).filter((record) => {
    if (!record.term) return false;
    if (options.kind && record.doc.workKind !== options.kind) return false;
    if (options.status && record.doc.status !== options.status) return false;
    return true;
  }).sort((a, b) => String(b.doc.updated ?? "").localeCompare(String(a.doc.updated ?? "")));
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function sortRunbookSteps(a, b) {
  const aIndex = Number(a.doc.runbookStepIndex ?? 0);
  const bIndex = Number(b.doc.runbookStepIndex ?? 0);
  return aIndex - bIndex || String(a.doc.runbookStepId ?? "").localeCompare(String(b.doc.runbookStepId ?? ""));
}

export function replayRunbooks(root, options = {}) {
  const records = listWorkObjects(root);
  const runbookNames = uniqueValues(records.map((record) => record.doc.runbookName));
  const requestedName = options.runbookName ?? "";
  return runbookNames
    .filter((name) => !requestedName || name === requestedName)
    .map((runbookName) => {
      const members = records.filter((record) => record.doc.runbookName === runbookName);
      const projects = members.filter((record) => record.doc.workKind === "project").sort(sortRunbookSteps);
      const steps = members
        .filter((record) => record.doc.workKind !== "project")
        .sort(sortRunbookSteps);
      const projectIds = new Set(projects.map((record) => record.doc.id));
      const dependencyEdges = steps.flatMap((step) => asArray(step.doc.dependsOn).map((dependency) => ({
        from: dependency,
        to: step.doc.id,
        step: step.doc.runbookStepId,
      })));
      const stepIds = steps.map((step) => step.doc.runbookStepId).filter(Boolean);
      const stepIndexes = steps.map((step) => step.doc.runbookStepIndex);
      const stepRecordIds = new Set(steps.map((step) => step.doc.id));
      const policyRequirements = uniqueValues(steps.flatMap((step) => asArray(step.doc.policyRequirements)));
      const acts = uniqueValues(steps.flatMap((step) => asArray(step.doc.runbookActs)));
      const tracePaths = uniqueValues(members.map((record) => record.path));
      const residue = [];
      if (!projects.length) residue.push({ kind: "missing-runbook-project", reason: "no project row carries the runbook name" });
      if (!steps.length) residue.push({ kind: "missing-runbook-steps", reason: "no non-project work rows carry the runbook name" });
      for (const [index, step] of steps.entries()) {
        if (Number(step.doc.runbookStepIndex) !== index + 1) {
          residue.push({
            kind: "noncontiguous-runbook-step-index",
            step: step.doc.runbookStepId,
            expected: index + 1,
            actual: step.doc.runbookStepIndex,
          });
        }
        if (index === 0 && asArray(step.doc.dependsOn).length) {
          residue.push({ kind: "unexpected-first-step-dependency", step: step.doc.runbookStepId, dependsOn: step.doc.dependsOn });
        }
        if (index > 0) {
          const expected = steps[index - 1].doc.id;
          if (!asArray(step.doc.dependsOn).includes(expected)) {
            residue.push({
              kind: "missing-prior-step-dependency",
              step: step.doc.runbookStepId,
              expected,
              actual: step.doc.dependsOn,
            });
          }
        }
        if (!asArray(step.doc.policyRequirements).length) {
          residue.push({ kind: "missing-policy-requirements", step: step.doc.runbookStepId });
        }
        for (const dependency of asArray(step.doc.dependsOn)) {
          if (!stepRecordIds.has(dependency)) {
            residue.push({
              kind: "missing-runbook-dependency-row",
              step: step.doc.runbookStepId,
              dependency,
              reason: "step depends on a work row that is not present in the replayed runbook",
            });
          }
        }
      }
      for (const step of steps) {
        if (step.doc.parent && !projectIds.has(step.doc.parent)) {
          residue.push({ kind: "step-parent-outside-runbook-project", step: step.doc.runbookStepId, parent: step.doc.parent });
        }
      }
      return {
        kind: "swarm.replay.runbook",
        runbookName,
        projectCount: projects.length,
        stepCount: steps.length,
        projects,
        steps,
        stepIds,
        stepIndexes,
        dependencyEdges,
        policyRequirements,
        acts,
        tracePaths,
        residue,
        replayedFrom: "jsonl-eavt-work-rows",
      };
    })
    .sort((a, b) => String(a.runbookName).localeCompare(String(b.runbookName)));
}

export function latestWorkObject(root, kind, query = "") {
  const queryTokens = tokenize(query);
  const records = listWorkObjects(root, { kind });
  if (!queryTokens.length) return records[0] ?? null;
  return records.map((record) => {
    const haystack = new Set(tokenize(`${record.doc.title} ${record.doc.goal} ${record.doc.requiredSkill}`));
    let score = 0;
    for (const token of queryTokens) if (haystack.has(token)) score += 1;
    return { ...record, score };
  }).sort((a, b) => b.score - a.score || String(b.doc.updated ?? "").localeCompare(String(a.doc.updated ?? "")))[0] ?? null;
}
