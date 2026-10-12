import { accessibleFrom, orderProcess } from "@561-group/computer-kernel-process";

import { listEvents } from "./events.mjs";
import { listWorkStatuses } from "./status.mjs";
import { planCompositionTuplet } from "./tuplets.mjs";

// the dependency DAG read as the process-runtime's ACCESSIBILITY relation: each work is a process
// ordered after its dependsOn predecessors (orderProcess); control is accessible a → b exactly when
// b waits on a (accessibleFrom). This is swarm's coordination graph, computed by the OS process model
// that was lifted from this module's dependency/readiness ordering. Pure; no disk beyond the entries.
function processAccessibility(entries) {
  const procs = entries.map((entry) => {
    const after = dependenciesOf(entry.work).map((dep) => `work:${dep}`);
    return orderProcess({ id: `work:${entry.work.doc.id}` }, after);
  });
  const edges = [];
  for (const from of procs) {
    for (const to of procs) {
      if (from.id !== to.id && accessibleFrom(from, to)) edges.push({ from: from.id, to: to.id });
    }
  }
  return edges;
}

function dependenciesOf(work) {
  const value = work?.doc?.dependsOn ?? [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function workLabel(work) {
  return work?.doc?.title ?? work?.doc?.id ?? "unknown work";
}

function buildGraph(entries) {
  const byId = new Map(entries.map((entry) => [entry.work.doc.id, entry]));
  const dependents = new Map();
  const edges = [];

  for (const entry of entries) {
    for (const dependencyId of dependenciesOf(entry.work)) {
      const dependency = byId.get(dependencyId);
      const edge = {
        from: dependencyId,
        to: entry.work.doc.id,
        fromTitle: dependency ? workLabel(dependency.work) : dependencyId,
        toTitle: workLabel(entry.work),
      };
      edges.push(edge);
      if (!dependents.has(dependencyId)) dependents.set(dependencyId, []);
      dependents.get(dependencyId).push(entry);
    }
  }

  return { byId, dependents, edges };
}

function findPipeline(entries, graph) {
  const starts = entries.filter((entry) => dependenciesOf(entry.work).length === 0);
  let best = [];

  for (const start of starts) {
    const chain = [start];
    let cursor = start;
    while (true) {
      const next = (graph.dependents.get(cursor.work.doc.id) ?? [])
        .filter((entry) => dependenciesOf(entry.work).length === 1)
        .sort((a, b) => String(a.work.doc.created ?? "").localeCompare(String(b.work.doc.created ?? "")))[0];
      if (!next || chain.some((entry) => entry.work.doc.id === next.work.doc.id)) break;
      chain.push(next);
      cursor = next;
    }
    if (chain.length > best.length) best = chain;
  }

  if (best.length >= 3) {
    return [{
      pattern: "pipeline",
      severity: "info",
      workIds: best.map((entry) => entry.work.doc.id),
      workTitles: best.map((entry) => workLabel(entry.work)),
      reason: "linear dependency chain with at least three work records",
    }];
  }
  return [];
}

function findFanOut(entries, graph) {
  const findings = [];
  for (const [workId, children] of graph.dependents.entries()) {
    if (children.length < 2) continue;
    const source = graph.byId.get(workId);
    findings.push({
      pattern: "fan-out",
      severity: children.length >= 4 ? "warning" : "info",
      workIds: [workId, ...children.map((entry) => entry.work.doc.id)],
      workTitles: [source ? workLabel(source.work) : workId, ...children.map((entry) => workLabel(entry.work))],
      reason: `${children.length} work records depend on the same predecessor`,
    });
  }

  if (!findings.length) {
    const byParent = new Map();
    for (const entry of entries) {
      const parent = entry.work.doc.partOf || entry.work.doc.parent;
      if (!parent) continue;
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(entry);
    }
    for (const [parentId, children] of byParent.entries()) {
      const independent = children.filter((entry) => dependenciesOf(entry.work).length === 0);
      if (independent.length < 3) continue;
      const parent = graph.byId.get(parentId);
      findings.push({
        pattern: "fan-out",
        severity: "info",
        workIds: [parentId, ...independent.map((entry) => entry.work.doc.id)],
        workTitles: [parent ? workLabel(parent.work) : parentId, ...independent.map((entry) => workLabel(entry.work))],
        reason: `${independent.length} sibling work records can start independently`,
      });
    }
  }
  return findings;
}

function findAuditFix(root, entries) {
  const findings = [];
  for (const entry of entries) {
    const reviews = listEvents(root, { workId: entry.work.doc.id, eventType: "review" });
    const rejected = reviews.filter((event) => event.doc.decision === "rejected");
    if (!rejected.length) continue;
    const executions = listEvents(root, { workId: entry.work.doc.id, eventType: "execution" });
    const laterRepair = executions.find((event) => String(event.doc.created ?? "") > String(rejected.at(-1).doc.created ?? ""));
    findings.push({
      pattern: "audit-fix",
      severity: laterRepair ? "info" : "warning",
      workIds: [entry.work.doc.id],
      workTitles: [workLabel(entry.work)],
      tracePaths: [...rejected.map((event) => event.path), ...(laterRepair ? [laterRepair.path] : [])],
      reason: laterRepair ? "rejected review has a later execution event" : "rejected review has no later repair execution",
    });
  }
  return findings;
}

function findHiddenDependencies(entries) {
  return entries.filter((entry) => {
    const doc = entry.work.doc;
    if (dependenciesOf(entry.work).length) return false;
    if (!doc.handoffPredicate && !doc.precondition) return false;
    if (["done", "blocked", "failed", "abandoned"].includes(entry.status.status)) return false;
    return true;
  }).map((entry) => ({
    pattern: "hidden-dependency",
    severity: "warning",
    workIds: [entry.work.doc.id],
    workTitles: [workLabel(entry.work)],
    reason: "work declares a handoff predicate or precondition but has no explicit dependsOn edge",
  }));
}

function compositionWitnessFor(...docs) {
  for (const doc of docs.filter(Boolean)) {
    for (const key of ["compositionWitnessPath", "frobeniusWitnessPath"]) {
      if (doc[key]) return String(doc[key]);
    }
  }
  return "";
}

function planCompositionRows(entries, graph) {
  const byParent = new Map();
  for (const entry of entries) {
    const parent = entry.work.doc.partOf || entry.work.doc.parent;
    if (!parent) continue;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(entry);
  }

  return [...byParent.entries()].map(([parentId, children]) => {
    const parent = graph.byId.get(parentId);
    const tuple = planCompositionTuplet(parent?.work ?? { id: parentId, kind: "swarm.work.project" }, children.map((entry) => entry.work));
    const operation = tuple.elements.find((element) => element.role === "operation")?.claim.object ?? "unknown";
    return {
      planId: parentId,
      planTitle: parent ? workLabel(parent.work) : parentId,
      operation,
      witness: compositionWitnessFor(parent?.work?.doc, ...children.map((entry) => entry.work.doc)),
      witnessed: !String(operation).startsWith("frobenius") || !!compositionWitnessFor(parent?.work?.doc, ...children.map((entry) => entry.work.doc)),
      childCount: children.length,
      childIds: children.map((entry) => entry.work.doc.id),
      childTitles: children.map((entry) => workLabel(entry.work)),
      tuplet: tuple,
    };
  }).sort((a, b) => a.planTitle.localeCompare(b.planTitle));
}

function planCompositionSummary(rows) {
  const counts = {
    sequential: rows.filter((row) => row.operation === "sequential-composition").length,
    tensor: rows.filter((row) => row.operation === "tensor-product").length,
    frobenius: rows.filter((row) => row.operation.startsWith("frobenius")).length,
    general: rows.filter((row) => row.operation === "general-poset-composition").length,
    single: rows.filter((row) => row.operation === "single-task-cobordism").length,
    empty: rows.filter((row) => row.operation === "empty-boundary").length,
  };
  return {
    planCount: rows.length,
    counts,
    rows,
  };
}

export function analyzeCoordinationPatterns(root, options = {}) {
  const entries = listWorkStatuses(root, options);
  const graph = buildGraph(entries);
  const findings = [
    ...findPipeline(entries, graph),
    ...findFanOut(entries, graph),
    ...findAuditFix(root, entries),
    ...findHiddenDependencies(entries),
  ];
  const composition = planCompositionSummary(planCompositionRows(entries, graph));

  const counts = {
    pipeline: findings.filter((finding) => finding.pattern === "pipeline").length,
    fanOut: findings.filter((finding) => finding.pattern === "fan-out").length,
    auditFix: findings.filter((finding) => finding.pattern === "audit-fix").length,
    hiddenDependency: findings.filter((finding) => finding.pattern === "hidden-dependency").length,
    warning: findings.filter((finding) => finding.severity === "warning").length,
    planSequential: composition.counts.sequential,
    planTensor: composition.counts.tensor,
    planFrobenius: composition.counts.frobenius,
    planGeneral: composition.counts.general,
  };

  const accessibility = processAccessibility(entries);

  return {
    workCount: entries.length,
    dependencyEdgeCount: graph.edges.length,
    counts,
    findings,
    composition,
    accessibility,                 // the OS process accessibility relation over the dependency DAG
  };
}
