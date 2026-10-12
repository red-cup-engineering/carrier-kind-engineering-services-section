import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { stableId } from "./cognition.mjs";
import { writeTrace } from "./events.mjs";
import { memoryRootOf } from "./memory.mjs";
import { officeNameFor } from "./offices.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";

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
// proxy until cohomologyH1 lands. Safety is the GATE class (contract §4, safety.mjs B: allowed/
// admitted and any safety-envelope boundary cell). A safety cell settling to ⊤ — two workers
// depositing disagreeing safety evidence (safety-cohomology.mjs:14) — is the dispatch-refusing
// obstruction (dispatch.mjs:61-64 reads section().contradicted). It is kept HELD here, surfaced as
// value ⊤, NEVER silently last-writer-collapsed to a denial. STAYS EAVT; never datom.
function isContradicted(charge) {
  return Boolean(charge?.value?.[0]) && Boolean(charge?.value?.[1]);
}

// docFromSection — the canonical fold over settledSection (swarm-sheaf.mjs:34-39), replacing the old
// `for (const row of rows) doc[row.a] = row.v` last-writer collapse (the silent bug the refounding
// closes). section.assignments preserve APPEND order, so for a Class-F predicate the LAST assignment
// is the row-order-last object: assigning in iteration order reproduces the old append-order-last-
// writer BY CONSTRUCTION where it was right. A Class-R cell (tracePaths, requestedTools, workIds,
// requests, …) rides bare/whole, written once. A held-⊤ cell is kept HELD (calm+gate): surfaced as a
// structured held value carrying its charges and witnesses, so dispatch can refuse while it stands.
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

function normalizeSafetyRequest(request = {}, index = 0) {
  return {
    index,
    kind: request.kind ?? "safety-envelope",
    workId: request.workId ?? "",
    workTitle: request.workTitle ?? "",
    requestedAction: request.requestedAction ?? "work.safety-envelope.report",
    requestedTool: request.requestedTool ?? "",
    office: request.office ?? "",
    reason: request.reason ?? "",
  };
}

export function buildSafetyEnvelopeReport(root, board, actor, decision, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const requests = (board?.leaderActionRequests ?? [])
    .filter((request) => request.kind === "safety-envelope")
    .map(normalizeSafetyRequest);
  const requestedTools = [...new Set(requests.map((request) => request.requestedTool).filter(Boolean))].sort();
  const requestedActions = [...new Set(requests.map((request) => request.requestedAction).filter(Boolean))].sort();
  const workIds = [...new Set(requests.map((request) => request.workId).filter(Boolean))].sort();
  const id = stableId(["safety-envelope", actor?.name, decision?.id, requests, now], "report");
  const tracePaths = [decision?.log].filter(Boolean);
  const reportDoc = {
    kind: "swarm.report.safety_envelope",
    id,
    reportKind: "safety-envelope",
    created: now,
    actor: actor?.name ?? "",
    office: actor ? officeNameFor(actor) : "",
    boardKind: board?.kind ?? "",
    boardGeneratedAt: board?.generatedAt ?? "",
    requestCount: requests.length,
    workIds,
    childIds: workIds,
    requestedTools,
    requestedActions,
    requests,
    governanceDecisionId: decision?.id ?? "",
    governanceDecisionTerm: decision?.term ?? "",
    governanceDecisionPath: decision?.log ?? "",
    policyResult: {
      allowed: !!decision?.admitted,
      policy: "office-capability",
      reason: decision?.reason ?? "",
      admittedBy: decision?.actor ?? "",
    },
    audit: {
      traceId: id,
      stages: [
        "operations-board-fold",
        "safety-envelope-residue-normalization",
        "policy-evaluation",
        "audit-logging",
      ],
      admitted: !!decision?.admitted,
      tracePaths,
    },
    tracePaths,
    evidence: "OpenClaw-style safety envelope: privileged work without admissible boundaries becomes a leader-mediated report before any worker-facing write or tool delegation can proceed",
  };
  return {
    kind: "swarm.report.safety_envelope",
    status: decision?.admitted ? "admitted" : "rejected",
    action: "work.safety-envelope.report",
    term: `reports/safety-envelope/${id}`,
    t: id,
    doc: reportDoc,
    rowCount: Object.keys(reportDoc).length,
    tracePaths,
  };
}

export function writeSafetyEnvelopeReport(root, report, options = {}) {
  const written = writeTrace(root, report.term, report.doc, options);
  return {
    ...report,
    ...written,
    tracePaths: [...new Set([...(report.tracePaths ?? []), written.path].filter(Boolean))],
  };
}

export function listSafetyEnvelopeReports(root) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, "reports", "safety-envelope");
  return walkJsonl(base).map((path) => {
    // Raw rows recover the term and preserve the {path,term,doc,rows} public record shape ONLY;
    // the doc is folded from the canonical settled section, never from doc[row.a]=row.v.
    const rows = rowsAt(path);
    const term = rows[0]?.e;
    const doc = term ? docFromSection(settledSection(memoryRoot, term)) : docFromRows(rows);
    return { path, term, doc, rows };
  }).filter((record) => record.term).sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")));
}
