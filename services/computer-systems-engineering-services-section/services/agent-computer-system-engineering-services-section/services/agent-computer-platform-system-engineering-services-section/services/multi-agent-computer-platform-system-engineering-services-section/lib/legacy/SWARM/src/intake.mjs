import { stableId } from "./cognition.mjs";
import { writeTrace } from "./events.mjs";
import { memoryRootOf } from "./memory.mjs";
import { officeNameFor } from "./offices.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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

function docFromRows(rows) {
  const doc = {};
  for (const row of rows) doc[row.a] = row.v;
  return doc;
}

// Recover a cell's stored value v. TTMS stores a scalar/array as {const: v} and rides a plain
// object/boolean bare (swarm-sheaf.mjs:28-32). Mirror that so doc[a] is the value the writer wrote.
function cellValue(object) {
  return object !== null && typeof object === "object" && !Array.isArray(object) && "const" in object
    ? object.const
    : object;
}

// A cell whose charge is pos AND neg is a held ⊤ (the ⊤-resolution contract, §2): the obstruction
// proxy until cohomologyH1 lands. Intake's Class-B predicate is the admission verdict (contract §4,
// intake.mjs B: allowed/admitted) — but allowed/admitted ride as fields INSIDE the policyResult/audit
// bare-object cells, so a top-level held-⊤ is surfaced uniformly here (calm), never collapsed.
function isContradicted(charge) {
  return Boolean(charge?.value?.[0]) && Boolean(charge?.value?.[1]);
}

// docFromSection — the canonical fold over settledSection (swarm-sheaf.mjs:34-39), replacing the old
// `for (const row of rows) doc[row.a] = row.v` last-writer collapse (the silent bug the refounding
// closes). section.assignments preserve APPEND order, so for a Class-F predicate the LAST assignment
// is the row-order-last object: assigning in iteration order reproduces the old append-order-last-
// writer BY CONSTRUCTION where it was right. A Class-R cell (tracePaths) rides bare/whole, written
// once. A held-⊤ cell is kept HELD (calm) — surfaced as a structured held value, not collapsed.
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
    doc[a] = cellValue(cell.object);
  }
  return doc;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function validationForWorkReport(report) {
  const errors = [];
  const warnings = [];
  const doc = objectValue(report.doc);
  if (!doc.workKind) errors.push("workKind required");
  if (!doc.id) errors.push("work id required");
  if (!doc.title) errors.push("title required");
  if (!report.term) errors.push("work term required");
  if (!Array.isArray(report.rows) || !report.rows.length) errors.push("proposed EAVT rows required");
  if (doc.requiredSkill && !doc.postcondition) warnings.push("requiredSkill work should declare a postcondition for accountability");
  return {
    valid: errors.length === 0,
    schema: "swarm.work-intake.v1",
    requiredFields: ["workKind", "id", "title", "term", "rows"],
    errors,
    warnings,
  };
}

export function buildWorkIntakeReport(root, workReport, actor, decision, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const doc = objectValue(workReport.doc);
  const validation = validationForWorkReport(workReport);
  const allowed = validation.valid && !!decision?.admitted;
  const id = stableId(["work-intake", workReport.term, decision?.id, actor?.name, now], "report");
  const tracePaths = [decision?.log].filter(Boolean);
  const reportDoc = {
    kind: "swarm.report.work_intake",
    id,
    reportKind: "work-intake",
    created: now,
    actor: actor?.name ?? "",
    office: actor ? officeNameFor(actor) : "",
    action: workReport.action ?? "",
    workKind: doc.workKind ?? "",
    workId: doc.id ?? "",
    workTerm: workReport.term ?? "",
    workTitle: doc.title ?? "",
    requestedGoal: doc.goal ?? "",
    proposedRowCount: workReport.rowCount ?? workReport.rows?.length ?? 0,
    proposedReportKind: workReport.kind ?? "",
    proposedReportStatus: workReport.status ?? "",
    validationResult: validation,
    policyResult: {
      allowed,
      policy: "office-capability",
      decisionId: decision?.id ?? "",
      decisionTerm: decision?.term ?? "",
      decisionPath: decision?.log ?? "",
      reason: decision?.reason ?? "",
      admittedBy: decision?.actor ?? "",
    },
    normalizationResult: {
      success: validation.valid,
      normalizedTerm: workReport.term ?? "",
      normalizedKind: doc.kind ?? "",
      normalizedId: doc.id ?? "",
      normalizedTitle: doc.title ?? "",
      normalizedKeywords: doc.keywords ?? [],
    },
    audit: {
      traceId: id,
      stages: ["schema-validation", "policy-evaluation", "normalization", "audit-logging"],
      admitted: allowed,
      createdBeforeWorkCommit: true,
      tracePaths,
    },
    tracePaths,
    evidence: "repository intake-stack research: organizational work enters through validation, policy evaluation, normalization, and audit logging before durable persistence",
  };
  return {
    kind: "swarm.report.work_intake",
    status: allowed ? "admitted" : "rejected",
    action: workReport.action ?? "",
    term: `reports/work-intake/${id}`,
    t: id,
    doc: reportDoc,
    rowCount: Object.keys(reportDoc).length,
    tracePaths,
  };
}

export function writeWorkIntakeReport(root, report, options = {}) {
  const written = writeTrace(root, report.term, report.doc, { ...options, t: report.t ?? report.doc.id });
  return {
    ...report,
    ...written,
    tracePaths: [...new Set([...(report.tracePaths ?? []), written.path].filter(Boolean))],
  };
}

export function listWorkIntakeReports(root) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, "reports", "work-intake");
  return walkJsonl(base).map((path) => {
    // Raw rows recover the term and preserve the {path,term,doc,rows} public record shape ONLY;
    // the doc is folded from the canonical settled section, never from doc[row.a]=row.v.
    const rows = rowsAt(path);
    const term = rows[0]?.e;
    const doc = term ? docFromSection(settledSection(memoryRoot, term)) : docFromRows(rows);
    return { path, term, doc, rows };
  }).filter((record) => record.term).sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")));
}
