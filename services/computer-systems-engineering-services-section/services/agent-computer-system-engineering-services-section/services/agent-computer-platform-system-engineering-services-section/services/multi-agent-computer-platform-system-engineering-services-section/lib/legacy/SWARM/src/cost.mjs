import { analyzeCoordinationPatterns } from "./coordination.mjs";
import { claimPhaseSummary, costDescentClaimPhaseTuplet } from "./claim-phases.mjs";
import {
  governanceDecisionLedgerSummary,
  messageLedgerSummary,
  officeActionLedgerSummary,
  providerLedgerSummary,
  toolLedgerSummary,
  traceLedgerSummary,
} from "./ledger.mjs";
import { summarizeWorkStatuses } from "./status.mjs";
import { toolPolicyFor } from "./tool-policy.mjs";

function addVertex(vertices, id, kind, label = id) {
  if (!id) return null;
  if (!vertices.has(id)) {
    vertices.set(id, {
      id,
      kind,
      label,
      inDegree: 0,
      outDegree: 0,
    });
  }
  return vertices.get(id);
}

function addEdge(vertices, edges, from, to, relation, fields = {}) {
  if (!from || !to) return;
  addVertex(vertices, from, fields.fromKind ?? "unknown", from);
  addVertex(vertices, to, fields.toKind ?? "unknown", to);
  const edge = { from, to, relation, ...fields };
  edges.push(edge);
  vertices.get(from).outDegree += 1;
  vertices.get(to).inDegree += 1;
}

function dependenciesOf(work) {
  const value = work?.doc?.dependsOn ?? [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
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

function writeOverlaps(left, right) {
  for (const a of left) {
    for (const b of right) {
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) return true;
    }
  }
  return false;
}

function isolated(work) {
  const doc = work?.doc ?? work ?? {};
  return !!doc.worktreePath || doc.worktreeIsolation === "isolated";
}

function worktreeIsolationPressure(workEntries) {
  const rows = workEntries
    .map((entry) => ({ ...entry, writes: writeSet(entry.work) }))
    .filter((entry) => entry.writes.length);
  const inFlight = rows.filter((entry) => ["assigned", "active"].includes(entry.status.status));
  return rows
    .filter((entry) => !["done", "blocked", "failed", "abandoned"].includes(entry.status.status))
    .filter((entry) => !isolated(entry.work))
    .map((entry) => ({
      workId: entry.work.doc.id,
      title: entry.work.doc.title,
      status: entry.status.status,
      writePaths: entry.writes,
      conflicts: inFlight
        .filter((other) => other.work.doc.id !== entry.work.doc.id && writeOverlaps(entry.writes, other.writes))
        .map((other) => ({
          workId: other.work.doc.id,
          title: other.work.doc.title,
          status: other.status.status,
          writePaths: other.writes,
          tracePaths: other.status.tracePaths ?? [],
        })),
      tracePaths: entry.status.tracePaths ?? [],
    }))
    .filter((entry) => entry.conflicts.length);
}

function safetyBoundaryForPolicy(work, policy, writes, reads) {
  const doc = work?.doc ?? work ?? {};
  const precondition = textField(doc, "precondition", "dispatchPrecondition", "safetyPrecondition");
  const postcondition = textField(doc, "postcondition", "expectedResult");

  if (policy.tool === "files.write" || policy.tool === "package.install") {
    return writes.length ? null : "writePaths required for repository mutation";
  }
  if (policy.tool === "worktree.create") {
    return textField(doc, "worktreePath", "worktree") || writes.length
      ? null
      : "worktreePath or writePaths required for worktree creation";
  }
  if (policy.tool === "network.fetch") {
    return textField(doc, "networkUrl", "url", "endpoint", "responseDigest") || reads.length || precondition
      ? null
      : "networkUrl, readPaths, or precondition required for network egress";
  }
  if (policy.tool === "subprocess.run") {
    return textField(doc, "commandDigest", "command", "subprocess") || precondition || reads.length || writes.length
      ? null
      : "commandDigest, command, precondition, readPaths, or writePaths required for subprocess execution";
  }
  if (writes.length || (policy.scope === "read" && reads.length) || (policy.scope === "compute" && (precondition || postcondition))) {
    return null;
  }
  return "safety envelope boundary missing for privileged work";
}

function safetyEnvelopePressure(workEntries) {
  return workEntries
    .filter((entry) => !["done", "blocked", "failed", "abandoned"].includes(entry.status.status))
    .map((entry) => {
      const required = entry.work.doc.requiredSkill;
      const policy = required ? toolPolicyFor(required) : toolPolicyFor("");
      const writes = writeSet(entry.work);
      const reads = readSet(entry.work);
      const isTool = policy.known || String(required ?? "").startsWith("tool.");
      if (!writes.length && !(isTool && policy.requiresLeaderAuthorization)) return null;
      const reason = safetyBoundaryForPolicy(entry.work, policy, writes, reads);
      if (!reason) return null;
      return {
        workId: entry.work.doc.id,
        title: entry.work.doc.title,
        status: entry.status.status,
        requiredSkill: required ?? "",
        tool: policy.tool,
        reason,
        readPaths: reads,
        writePaths: writes,
        tracePaths: entry.status.tracePaths ?? [],
      };
    })
    .filter(Boolean);
}

function embodiedCostTuple(work) {
  const doc = work?.doc ?? work ?? {};
  const workTuple = doc.tuplet;
  if (!workTuple?.elements) return null;
  return workTuple.elements.find((element) => element.role === "embodied-cost")?.tuple ?? null;
}

function embodiedCostCoordinates(workEntries) {
  const coordinates = new Map();
  const rows = [];
  for (const entry of workEntries) {
    const tuple = embodiedCostTuple(entry.work);
    for (const element of tuple?.elements ?? []) {
      const coordinate = String(element.role ?? "").trim();
      if (!coordinate) continue;
      const object = element.claim?.object ?? "";
      const predicate = element.claim?.predicate ?? "";
      const token = element.token ?? "";
      const row = {
        coordinate,
        object,
        predicate,
        token,
        workId: entry.work.doc.id,
        title: entry.work.doc.title,
        status: entry.status.status,
      };
      rows.push(row);
      if (!coordinates.has(coordinate)) {
        coordinates.set(coordinate, {
          coordinate,
          count: 0,
          workIds: [],
          objects: [],
          predicates: [],
        });
      }
      const bucket = coordinates.get(coordinate);
      bucket.count += 1;
      bucket.workIds = [...new Set([...bucket.workIds, row.workId].filter(Boolean))];
      bucket.objects = [...new Set([...bucket.objects, object].filter((value) => value !== ""))];
      bucket.predicates = [...new Set([...bucket.predicates, predicate].filter(Boolean))];
    }
  }
  return {
    coordinateCount: coordinates.size,
    rowCount: rows.length,
    coordinates: [...coordinates.values()].sort((a, b) => b.count - a.count || a.coordinate.localeCompare(b.coordinate)),
    rows,
  };
}

function topBy(rows, countKey, limit = 5) {
  return rows
    .filter((row) => Number(row[countKey]) > 0)
    .slice(0, limit)
    .map((row) => ({ key: row.key, count: Number(row[countKey]) || 0 }));
}

function centralVertices(vertices, limit = 5) {
  return [...vertices.values()]
    .map((vertex) => ({ ...vertex, degree: vertex.inDegree + vertex.outDegree }))
    .filter((vertex) => vertex.degree > 0)
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function componentCount(vertices, edges) {
  return componentCountWith(vertices, edges);
}

function componentCountWith(vertices, edges, removedVertex = "", removedEdgeIndex = -1) {
  const neighbors = new Map([...vertices.keys()].map((id) => [id, new Set()]));
  if (removedVertex) neighbors.delete(removedVertex);
  for (const [index, edge] of edges.entries()) {
    if (index === removedEdgeIndex) continue;
    if (removedVertex && (edge.from === removedVertex || edge.to === removedVertex)) continue;
    neighbors.get(edge.from)?.add(edge.to);
    neighbors.get(edge.to)?.add(edge.from);
  }

  let count = 0;
  const seen = new Set();
  for (const id of neighbors.keys()) {
    if (seen.has(id)) continue;
    count += 1;
    const stack = [id];
    seen.add(id);
    while (stack.length) {
      const current = stack.pop();
      for (const next of neighbors.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return count;
}

function relationCounts(edges) {
  const counts = new Map();
  for (const edge of edges) counts.set(edge.relation, (counts.get(edge.relation) ?? 0) + 1);
  return [...counts.entries()]
    .map(([relation, count]) => ({ relation, count }))
    .sort((a, b) => b.count - a.count || a.relation.localeCompare(b.relation));
}

function removalSensitivity(vertices, edges, _baseComponentCount) {
  const structuralEdges = edges.filter((edge) => edge.structural !== false);
  const structuralVertexIds = new Set(structuralEdges.flatMap((edge) => [edge.from, edge.to]));
  const structuralVertices = new Map([...vertices.entries()].filter(([id]) => structuralVertexIds.has(id)));
  const baseComponentCount = componentCount(structuralVertices, structuralEdges);
  const cutVertices = [...structuralVertices.values()]
    .map((vertex) => {
      const without = componentCountWith(structuralVertices, structuralEdges, vertex.id);
      const componentIncrease = without - baseComponentCount;
      return { ...vertex, componentIncrease };
    })
    .filter((vertex) => vertex.componentIncrease > 0)
    .sort((a, b) => b.componentIncrease - a.componentIncrease || b.inDegree + b.outDegree - (a.inDegree + a.outDegree) || a.id.localeCompare(b.id))
    .slice(0, 5);

  const bridgeEdges = structuralEdges
    .map((edge, index) => {
      const without = componentCountWith(structuralVertices, structuralEdges, "", index);
      const componentIncrease = without - baseComponentCount;
      return { ...edge, componentIncrease };
    })
    .filter((edge) => edge.componentIncrease > 0)
    .sort((a, b) => b.componentIncrease - a.componentIncrease || a.relation.localeCompare(b.relation))
    .slice(0, 5);

  return { cutVertices, bridgeEdges };
}

function tokenCostStatus(providerSummary) {
  if (!providerSummary.providerCallCount) return "no-provider-token-cost";
  if (providerSummary.unknownUsageCount && providerSummary.totalTokens) return "mixed-known-and-unknown-token-cost";
  if (providerSummary.unknownUsageCount) return "unknown-token-cost";
  return "measured-token-cost";
}

function firstPaths(entries, limit = 5) {
  return entries.map((entry) => entry.path).filter(Boolean).slice(0, limit);
}

function unsettledFiber(predicate, reason, supportPaths = [], fields = {}) {
  return {
    predicate,
    value: "absurd",
    reason,
    supportPaths,
    ...fields,
  };
}

export function costGraphSummary(root) {
  const provider = providerLedgerSummary(root);
  const messages = messageLedgerSummary(root);
  const officeActions = officeActionLedgerSummary(root);
  const governance = governanceDecisionLedgerSummary(root);
  const tools = toolLedgerSummary(root);
  const trace = traceLedgerSummary(root);
  const work = summarizeWorkStatuses(root);
  const worktreePressure = worktreeIsolationPressure(work.entries);
  const safetyPressure = safetyEnvelopePressure(work.entries);
  const embodiedCost = embodiedCostCoordinates(work.entries);
  const coordination = analyzeCoordinationPatterns(root);
  const vertices = new Map();
  const edges = [];

  for (const entry of work.entries) {
    const workId = `work:${entry.work.doc.id}`;
    addVertex(vertices, workId, "work", entry.work.doc.title ?? entry.work.doc.id);
    if (entry.work.doc.office) {
      const officeId = `office:${entry.work.doc.office}`;
      addVertex(vertices, officeId, "office", entry.work.doc.office);
      addEdge(vertices, edges, workId, officeId, "owned-by", { fromKind: "work", toKind: "office" });
    }
    for (const dependency of dependenciesOf(entry.work)) {
      addEdge(vertices, edges, `work:${dependency}`, workId, "dependency", { fromKind: "work", toKind: "work" });
    }
  }

  for (const pressure of worktreePressure) {
    const workId = `work:${pressure.workId}`;
    const toolId = "tool:worktree.create";
    addVertex(vertices, toolId, "tool", "worktree.create");
    addEdge(vertices, edges, workId, toolId, "requires-worktree", {
      fromKind: "work",
      toKind: "tool",
      writePaths: pressure.writePaths,
    });
    for (const conflict of pressure.conflicts) {
      addEdge(vertices, edges, `work:${conflict.workId}`, workId, "write-conflict", {
        fromKind: "work",
        toKind: "work",
        writePaths: pressure.writePaths,
        conflictingWritePaths: conflict.writePaths,
      });
    }
  }

  for (const pressure of safetyPressure) {
    const workId = `work:${pressure.workId}`;
    const safetyId = `safety-envelope:${pressure.tool}`;
    addVertex(vertices, safetyId, "safety-envelope", pressure.tool);
    addEdge(vertices, edges, workId, safetyId, "missing-safety-envelope-boundary", {
      fromKind: "work",
      toKind: "safety-envelope",
      requiredSkill: pressure.requiredSkill,
      reason: pressure.reason,
      readPaths: pressure.readPaths,
      writePaths: pressure.writePaths,
    });
  }

  for (const row of embodiedCost.rows) {
    const workId = `work:${row.workId}`;
    const coordinateId = `cost-coordinate:${row.coordinate}`;
    addVertex(vertices, coordinateId, "cost-coordinate", row.coordinate);
    addEdge(vertices, edges, workId, coordinateId, "embodied-cost-coordinate", {
      fromKind: "work",
      toKind: "cost-coordinate",
      coordinate: row.coordinate,
      token: row.token,
      predicate: row.predicate,
      object: row.object,
      structural: false,
    });
  }

  for (const entry of provider.entries) {
    const officeId = `office:${entry.doc.office}`;
    const providerId = `provider:${entry.doc.provider}`;
    addVertex(vertices, officeId, "office", entry.doc.office);
    addVertex(vertices, providerId, "provider", entry.doc.provider);
    addEdge(vertices, edges, officeId, providerId, "provider-call", {
      fromKind: "office",
      toKind: "provider",
      ledgerPath: entry.path,
    });
  }

  for (const entry of officeActions.entries) {
    const officeId = `office:${entry.doc.office}`;
    const capabilityId = `capability:${entry.doc.capability}`;
    addVertex(vertices, officeId, "office", entry.doc.office);
    addVertex(vertices, capabilityId, "capability", entry.doc.capability);
    addEdge(vertices, edges, officeId, capabilityId, "capability-use", {
      fromKind: "office",
      toKind: "capability",
      ledgerPath: entry.path,
    });
    for (const workId of entry.doc.workIds ?? []) {
      addEdge(vertices, edges, capabilityId, `work:${workId}`, "work-citation", {
        fromKind: "capability",
        toKind: "work",
        ledgerPath: entry.path,
      });
    }
  }

  for (const entry of governance.entries) {
    addEdge(vertices, edges, `office:${entry.doc.office}`, `capability:${entry.doc.action}`, "authority-check", {
      fromKind: "office",
      toKind: "capability",
      ledgerPath: entry.path,
      admitted: entry.doc.admitted,
    });
  }

  for (const entry of tools.entries) {
    const officeId = `office:${entry.doc.office}`;
    const toolId = `tool:${entry.doc.tool}`;
    addVertex(vertices, officeId, "office", entry.doc.office);
    addVertex(vertices, toolId, "tool", entry.doc.tool);
    addEdge(vertices, edges, officeId, toolId, "tool-call", {
      fromKind: "office",
      toKind: "tool",
      ledgerPath: entry.path,
      outcome: entry.doc.outcome,
      toolScope: entry.doc.toolScope,
      gateSatisfied: entry.doc.gateSatisfied,
    });
  }

  for (const entry of trace.entries) {
    const traceId = `trace:${entry.doc.traceKind}:${entry.doc.eventId ?? entry.doc.readinessId ?? entry.doc.id}`;
    addVertex(vertices, traceId, "trace", entry.doc.traceKind);
    addEdge(vertices, edges, `office:${entry.doc.office}`, traceId, "trace-emits", {
      fromKind: "office",
      toKind: "trace",
      ledgerPath: entry.path,
    });
    for (const workId of entry.doc.workIds ?? []) {
      addEdge(vertices, edges, traceId, `work:${workId}`, "trace-cites-work", {
        fromKind: "trace",
        toKind: "work",
        ledgerPath: entry.path,
      });
    }
  }

  const dimensions = {
    providerCalls: provider.summary.providerCallCount,
    promptTokens: provider.summary.promptTokens,
    completionTokens: provider.summary.completionTokens,
    totalTokens: provider.summary.totalTokens,
    unknownTokenRows: provider.summary.unknownUsageCount,
    moneyAmount: provider.summary.moneyAmount,
    moneyCurrency: provider.summary.moneyCurrency,
    messages: messages.summary.messageLedgerCount,
    officeActions: officeActions.summary.officeActionCount,
    governanceDecisions: governance.summary.governanceDecisionLedgerCount,
    rejectedGovernanceDecisions: governance.summary.rejectedDecisionCount,
    toolCalls: tools.summary.toolCallCount,
    writeToolCalls: tools.summary.writeToolCallCount,
    failedToolCalls: tools.summary.failedToolCallCount,
    traceEvents: trace.summary.eventRecordCount,
    readinessWitnesses: trace.summary.readinessWitnessCount,
    reportWitnesses: trace.summary.reportRecordCount,
    workRecords: work.total,
    embodiedCostCoordinates: embodiedCost.coordinateCount,
    embodiedCostClaims: embodiedCost.rowCount,
    dependencyEdges: coordination.dependencyEdgeCount,
    planCompositions: coordination.composition.planCount,
    sequentialPlans: coordination.counts.planSequential,
    tensorPlans: coordination.counts.planTensor,
    frobeniusPlans: coordination.counts.planFrobenius,
    unwitnessedFrobeniusPlans: coordination.composition.rows.filter((row) => row.operation.startsWith("frobenius") && !row.witnessed).length,
    generalPosetPlans: coordination.counts.planGeneral,
    dependencyHeld: work.dependencyHeld.length,
    blockedWork: work.counts.blocked ?? 0,
    coordinationWarnings: coordination.counts.warning,
    worktreeIsolationConflicts: worktreePressure.length,
    worktreeConflictEdges: worktreePressure.reduce((total, entry) => total + entry.conflicts.length, 0),
    safetyEnvelopeGaps: safetyPressure.length,
  };

  const bottlenecks = [
    ...topBy(provider.summary.byOffice, "providerCallCount").map((row) => `provider calls at ${row.key}: ${row.count}`),
    ...topBy(officeActions.summary.byOffice, "officeActionCount").map((row) => `office actions at ${row.key}: ${row.count}`),
    ...topBy(governance.summary.byOffice, "governanceDecisionLedgerCount").map((row) => `governance decisions at ${row.key}: ${row.count}`),
    ...topBy(tools.summary.byTool, "toolCallCount").map((row) => `tool calls ${row.key}: ${row.count}`),
    dimensions.dependencyHeld ? `dependency-held work: ${dimensions.dependencyHeld}` : "",
    dimensions.blockedWork ? `blocked work: ${dimensions.blockedWork}` : "",
    dimensions.unknownTokenRows ? `unknown token rows: ${dimensions.unknownTokenRows}` : "",
    dimensions.coordinationWarnings ? `coordination warnings: ${dimensions.coordinationWarnings}` : "",
    dimensions.frobeniusPlans ? `Frobenius-shaped plans: ${dimensions.frobeniusPlans}` : "",
    dimensions.unwitnessedFrobeniusPlans ? `unwitnessed Frobenius plans: ${dimensions.unwitnessedFrobeniusPlans}` : "",
    dimensions.generalPosetPlans ? `general-poset plans: ${dimensions.generalPosetPlans}` : "",
    dimensions.worktreeIsolationConflicts ? `worktree isolation conflicts: ${dimensions.worktreeIsolationConflicts}` : "",
    dimensions.safetyEnvelopeGaps ? `safety-envelope gaps: ${dimensions.safetyEnvelopeGaps}` : "",
    dimensions.embodiedCostClaims ? `embodied cost claims: ${dimensions.embodiedCostClaims}` : "",
  ].filter(Boolean);
  const baseComponentCount = componentCount(vertices, edges);
  const sensitivity = removalSensitivity(vertices, edges, baseComponentCount);

  return {
    kind: "swarm.cost.graph",
    evidence: "SWARM prior-thought feature mining: cost is a quantale spanning tokens, time, risk, context, and human attention; ledger rows cite affected nodes and decisions",
    dimensions,
    worktreeIsolation: {
      conflictCount: dimensions.worktreeIsolationConflicts,
      conflictEdgeCount: dimensions.worktreeConflictEdges,
      conflicts: worktreePressure,
    },
    safetyEnvelope: {
      gapCount: dimensions.safetyEnvelopeGaps,
      gaps: safetyPressure,
    },
    embodiedCost: {
      coordinateCount: dimensions.embodiedCostCoordinates,
      claimCount: dimensions.embodiedCostClaims,
      coordinates: embodiedCost.coordinates,
    },
    bilattice: {
      tokenCostStatus: tokenCostStatus(provider.summary),
      unknownIsZero: false,
      contradictionPolicy: "keep contradictory estimates as anomaly-bearing predicates until later settlement",
    },
    graph: {
      vertexCount: vertices.size,
      edgeCount: edges.length,
      componentCount: baseComponentCount,
      vertices: [...vertices.values()],
      edges,
      centralVertices: centralVertices(vertices),
      relationCounts: relationCounts(edges),
      cutVertices: sensitivity.cutVertices,
      bridgeEdges: sensitivity.bridgeEdges,
    },
    bottlenecks,
  };
}

export function costDescentSummary(root) {
  const cost = costGraphSummary(root);
  const provider = providerLedgerSummary(root);
  const governance = governanceDecisionLedgerSummary(root);
  const tools = toolLedgerSummary(root);
  const trace = traceLedgerSummary(root);
  const work = summarizeWorkStatuses(root);
  const worktreePressure = cost.worktreeIsolation.conflicts ?? [];
  const safetyPressure = cost.safetyEnvelope.gaps ?? [];
  const coordination = analyzeCoordinationPatterns(root);
  const fibers = [];

  const unknownProviderRows = provider.entries.filter((entry) => !entry.doc.usageKnown);
  if (unknownProviderRows.length) {
    fibers.push(unsettledFiber(
      "unknown-token-cost",
      "provider ledger rows omit token usage; unknown cost remains a predicate fiber instead of zero",
      firstPaths(unknownProviderRows),
      {
        count: unknownProviderRows.length,
        tokenCostStatus: cost.bilattice.tokenCostStatus,
      },
    ));
  }

  if (cost.bilattice.tokenCostStatus === "mixed-known-and-unknown-token-cost") {
    fibers.push(unsettledFiber(
      "mixed-token-cost",
      "known token totals coexist with unknown usage rows, so total cost is only partially witnessed",
      firstPaths(provider.entries),
      {
        knownTotalTokens: provider.summary.totalTokens,
        unknownRows: provider.summary.unknownUsageCount,
      },
    ));
  }

  const rejectedGovernance = governance.entries.filter((entry) => !entry.doc.admitted);
  if (rejectedGovernance.length) {
    fibers.push(unsettledFiber(
      "rejected-governance",
      "rejected governance decisions preserve negative evidence against settlement",
      firstPaths(rejectedGovernance),
      { count: rejectedGovernance.length },
    ));
  }

  const failedTools = tools.entries.filter((entry) => entry.doc.outcome !== "ok");
  if (failedTools.length) {
    fibers.push(unsettledFiber(
      "failed-tool-call",
      "failed tool calls preserve execution residue until repaired or explicitly accepted",
      firstPaths(failedTools),
      { count: failedTools.length },
    ));
  }

  const blockedWork = work.entries.filter((entry) => entry.status.status === "blocked");
  if (blockedWork.length) {
    fibers.push(unsettledFiber(
      "blocked-work",
      "blocked work leaves execution cost and completion value unsettled",
      blockedWork.flatMap((entry) => entry.status.tracePaths ?? []).slice(0, 5),
      { count: blockedWork.length },
    ));
  }

  if (work.dependencyHeld.length) {
    fibers.push(unsettledFiber(
      "dependency-held-work",
      "dependency-held work cannot yet settle downstream cost claims",
      work.dependencyHeld.flatMap((entry) => entry.status.tracePaths ?? []).slice(0, 5),
      { count: work.dependencyHeld.length },
    ));
  }

  if (worktreePressure.length) {
    fibers.push(unsettledFiber(
      "worktree-isolation-required",
      "declared write-path conflicts require isolated worktree evidence before cost can settle",
      worktreePressure.flatMap((entry) => entry.tracePaths).slice(0, 5),
      {
        count: worktreePressure.length,
        conflictEdges: cost.worktreeIsolation.conflictEdgeCount,
        workIds: worktreePressure.map((entry) => entry.workId),
      },
    ));
  }

  if (safetyPressure.length) {
    fibers.push(unsettledFiber(
      "safety-envelope-boundary-required",
      "privileged work requires an explicit safety-envelope boundary before dispatch cost can settle",
      safetyPressure.flatMap((entry) => entry.tracePaths).slice(0, 5),
      {
        count: safetyPressure.length,
        workIds: safetyPressure.map((entry) => entry.workId),
        tools: [...new Set(safetyPressure.map((entry) => entry.tool))],
      },
    ));
  }

  const coordinationWarnings = coordination.findings.filter((finding) => finding.severity === "warning");
  if (coordinationWarnings.length) {
    fibers.push(unsettledFiber(
      "coordination-warning",
      "coordination warnings mark possible hidden or repair-loop cost not yet discharged",
      coordinationWarnings.flatMap((finding) => finding.tracePaths ?? []).slice(0, 5),
      { count: coordinationWarnings.length },
    ));
  }

  const unwitnessedFrobenius = coordination.composition.rows.filter((row) => row.operation.startsWith("frobenius") && !row.witnessed);
  if (unwitnessedFrobenius.length) {
    fibers.push(unsettledFiber(
      "frobenius-composition-witness-required",
      "fan-in/fan-out plan composition requires explicit merge/split witness before dispatch cost can settle",
      [],
      {
        count: unwitnessedFrobenius.length,
        planIds: unwitnessedFrobenius.map((row) => row.planId),
        operations: [...new Set(unwitnessedFrobenius.map((row) => row.operation))],
      },
    ));
  }

  const costWitnessEntries = governance.entries.filter((entry) => entry.doc.costWitnessKind);
  const admittedGovernance = governance.entries.filter((entry) => entry.doc.admitted);
  const settled = fibers.length === 0;

  const descent = {
    kind: "swarm.cost.descent",
    evidence: "voidmath descent applied to SWARM cost ledger: articulate graph, predicate unsettled fibers, posit witnesses, settle only when no residue remains",
    articulated: {
      value: cost.graph.vertexCount || cost.graph.edgeCount ? "potential" : "absurd",
      graphKind: cost.kind,
      vertices: cost.graph.vertexCount,
      edges: cost.graph.edgeCount,
      dimensions: cost.dimensions,
    },
    predicated: {
      value: fibers.length ? "absurd" : "potential",
      fiberCount: fibers.length,
      fibers,
      unknownIsZero: false,
    },
    posited: {
      value: admittedGovernance.length || costWitnessEntries.length || tools.entries.length || trace.entries.length ? "potential" : "absurd",
      admittedGovernanceDecisions: admittedGovernance.length,
      costWitnesses: costWitnessEntries.length,
      traceRows: trace.entries.length,
      toolRows: tools.entries.length,
      supportPaths: firstPaths([
        ...costWitnessEntries,
        ...admittedGovernance,
        ...tools.entries,
        ...trace.entries,
      ]),
    },
    settled: {
      value: settled ? "potential" : "absurd",
      settled,
      reason: settled
        ? "no cost predicate residue is currently visible in ledger summaries"
        : "unsettled cost predicate residue remains and can be revised by later ledger traces",
      revisionPolicy: "later provider, governance, trace, status, or coordination rows may add support or withdraw settlement",
    },
    provenance: {
      providerRows: provider.entries.length,
      governanceRows: governance.entries.length,
      toolRows: tools.entries.length,
      traceRows: trace.entries.length,
      workRows: work.entries.length,
      samplePaths: firstPaths([
        ...provider.entries,
        ...governance.entries,
        ...tools.entries,
        ...trace.entries,
      ]),
    },
  };
  const claimPhaseTuplet = costDescentClaimPhaseTuplet(descent);
  return {
    ...descent,
    claimPhaseTuplet,
    claimPhaseSummary: claimPhaseSummary(claimPhaseTuplet),
  };
}
