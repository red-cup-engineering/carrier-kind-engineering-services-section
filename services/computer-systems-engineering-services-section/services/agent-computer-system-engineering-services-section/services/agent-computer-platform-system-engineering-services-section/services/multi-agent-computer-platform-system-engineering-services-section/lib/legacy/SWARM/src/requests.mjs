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
// proxy until cohomologyH1 lands. Requests' Class-B predicate is the request-grant verdict (contract
// §4, requests.mjs B: allowed/admitted) — allowed/admitted ride as fields INSIDE the policyResult/
// audit bare-object cells, so a top-level held-⊤ is surfaced uniformly here (calm), never collapsed.
function isContradicted(charge) {
  return Boolean(charge?.value?.[0]) && Boolean(charge?.value?.[1]);
}

// docFromSection — the canonical fold over settledSection (swarm-sheaf.mjs:34-39), replacing the old
// `for (const row of rows) doc[row.a] = row.v` last-writer collapse (the silent bug the refounding
// closes). section.assignments preserve APPEND order, so for a Class-F predicate the LAST assignment
// is the row-order-last object: assigning in iteration order reproduces the old append-order-last-
// writer BY CONSTRUCTION where it was right. A Class-R cell (tracePaths, requestKinds, requests, …)
// rides bare/whole, written once. A held-⊤ cell is kept HELD (calm), surfaced as a held value.
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

function normalizeRequest(request = {}, index = 0) {
  return {
    index,
    kind: request.kind ?? "leader-action",
    workId: request.workId ?? "",
    workTitle: request.workTitle ?? "",
    requestedAction: request.requestedAction ?? "",
    requestedTool: request.requestedTool ?? "",
    office: request.office ?? "",
    reason: request.reason ?? "",
  };
}

export function buildLeaderActionRequestReport(root, board, actor, decision, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const requests = (board?.leaderActionRequests ?? []).map(normalizeRequest);
  const requestKinds = [...new Set(requests.map((request) => request.kind).filter(Boolean))].sort();
  const requestedActions = [...new Set(requests.map((request) => request.requestedAction).filter(Boolean))].sort();
  const workIds = [...new Set(requests.map((request) => request.workId).filter(Boolean))].sort();
  const id = stableId(["leader-action-request", actor?.name, decision?.id, requests, now], "report");
  const tracePaths = [decision?.log].filter(Boolean);
  const reportDoc = {
    kind: "swarm.report.leader_action_request",
    id,
    reportKind: "leader-action-request",
    created: now,
    actor: actor?.name ?? "",
    office: actor ? officeNameFor(actor) : "",
    boardKind: board?.kind ?? "",
    boardGeneratedAt: board?.generatedAt ?? "",
    requestCount: requests.length,
    requestKinds,
    requestedActions,
    workIds,
    childIds: workIds,
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
      stages: ["operations-board-fold", "leader-request-normalization", "policy-evaluation", "audit-logging"],
      admitted: !!decision?.admitted,
      tracePaths,
    },
    tracePaths,
    evidence: "OpenClaw-style operations: derived leader action residues become governed request reports so the leader can admit bounded action without manual restatement",
  };
  return {
    kind: "swarm.report.leader_action_request",
    status: decision?.admitted ? "admitted" : "rejected",
    action: "leader-action.request",
    term: `reports/leader-action-requests/${id}`,
    t: id,
    doc: reportDoc,
    rowCount: Object.keys(reportDoc).length,
    tracePaths,
  };
}

export function writeLeaderActionRequestReport(root, report, options = {}) {
  const written = writeTrace(root, report.term, report.doc, { ...options, t: report.t ?? report.doc.id });
  return {
    ...report,
    ...written,
    tracePaths: [...new Set([...(report.tracePaths ?? []), written.path].filter(Boolean))],
  };
}

export function listLeaderActionRequestReports(root) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, "reports", "leader-action-requests");
  return walkJsonl(base).map((path) => {
    // Raw rows recover the term and preserve the {path,term,doc,rows} public record shape ONLY;
    // the doc is folded from the canonical settled section, never from doc[row.a]=row.v.
    const rows = rowsAt(path);
    const term = rows[0]?.e;
    const doc = term ? docFromSection(settledSection(memoryRoot, term)) : docFromRows(rows);
    return { path, term, doc, rows };
  }).filter((record) => record.term).sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")));
}
