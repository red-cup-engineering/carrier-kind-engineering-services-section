const ARCHIVE_SOURCES = [
  "archive:relationality/logic-from-relation:Tuple(p,[x1...xp],n)",
  "archive:predicated-work/plan-as-tensor-of-task-cobordisms",
  "archive:predicated-work/handoff-cobordism",
  "archive:predicated-drone-swarm/safety-envelope-cell",
  "archive:predicated-drone-swarm/embodied-cost-coordinate",
  "archive:predicated-drone-swarm/embodied-handedness",
  "archive:predicated-drone-swarm/meaningful-human-control",
];

const PLAN_SOURCE = "archive:predicated-work/plan-as-tensor-of-task-cobordisms";
const FROBENIUS_SOURCE = "archive:predicated-work/plan-as-tensor-of-task-cobordisms#open-downstream-frobenius";

function asList(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== "" && item != null);
  if (value === "" || value == null) return [];
  return [value];
}

function nonempty(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function docOf(work) {
  return work?.doc ?? work?.work?.doc ?? work ?? {};
}

function dependenciesOf(work) {
  return asList(docOf(work).dependsOn);
}

export function claim(predicate, object, source = "") {
  return {
    predicate,
    object,
    ...(source ? { source } : {}),
  };
}

export function tupletElement(index, role, token, elementClaim, tuple = null) {
  return {
    index,
    role,
    token,
    claim: elementClaim,
    ...(tuple ? { tuple } : {}),
  };
}

export function tuplet(kind, elements, options = {}) {
  return {
    kind,
    arity: elements.length,
    ordered: true,
    elementShape: "Pair(token, claim)",
    source: options.source ?? ARCHIVE_SOURCES,
    elements,
  };
}

function cobordismTuple(doc) {
  const sourceCells = [
    ...asList(doc.dependsOn).map((id) => `work:${id}:done`),
    nonempty(doc.precondition, "dispatch-readiness"),
  ];
  const targetCells = [
    nonempty(doc.postcondition, "completion-as-quiescence"),
    `work:${doc.id}:status:${doc.status}`,
  ];
  const operation = asList(doc.dependsOn).length > 0
    ? "sequential-composition"
    : "tensor-or-disk-handoff";

  return tuplet("swarm.tuplet.handoff_cobordism", [
    tupletElement(0, "in-boundary", `${doc.id}:handoff:in`, claim("has-boundary-cells", sourceCells, ARCHIVE_SOURCES[2])),
    tupletElement(1, "out-boundary", `${doc.id}:handoff:out`, claim("has-boundary-cells", targetCells, ARCHIVE_SOURCES[2])),
    tupletElement(2, "composition", `${doc.id}:handoff:composition`, claim("composes-by", operation, ARCHIVE_SOURCES[1])),
    tupletElement(3, "predicate", `${doc.id}:handoff:predicate`, claim("has-handoff-predicate", nonempty(doc.handoffPredicate, "boundary-compatible"), ARCHIVE_SOURCES[2])),
  ], { source: [ARCHIVE_SOURCES[1], ARCHIVE_SOURCES[2]] });
}

function costTuple(doc) {
  const coordinates = [
    ["tokens", "provider-call and context use"],
    ["dollars", "monetary spend"],
    ["attention", "human and office review burden"],
    ["governance", "leader authorization and audit burden"],
    ["coordination", "dependency, handoff, and worktree overhead"],
  ];

  return tuplet("swarm.tuplet.embodied_cost", coordinates.map(([name, fallback], index) => {
    const object = name === "coordination"
      ? nonempty(doc.expectedCostShape, fallback)
      : fallback;
    return tupletElement(index, name, `${doc.id}:cost:${name}`, claim("minimize-cost-coordinate", object, ARCHIVE_SOURCES[4]));
  }), { source: [ARCHIVE_SOURCES[4]] });
}

function safetyTuple(doc) {
  const privilegedWrite = doc.requiredSkill === "tool.files.write" || asList(doc.writePaths).length > 0;
  const humanControl = privilegedWrite
    ? "leader-delegation-witness-required"
    : "message-surface-office-governance";

  return tuplet("swarm.tuplet.safety_envelope", [
    tupletElement(0, "physical-precondition", `${doc.id}:safety:precondition`, claim("requires-precondition", nonempty(doc.precondition, "declared dispatch readiness"), "archive:predicated-drone-swarm/physical-precondition")),
    tupletElement(1, "safety-envelope-cell", `${doc.id}:safety:envelope`, claim("bounds-admissible-region", privilegedWrite ? asList(doc.writePaths) : "message-only state transition", ARCHIVE_SOURCES[3])),
    tupletElement(2, "meaningful-human-control", `${doc.id}:safety:mhc`, claim("authorized-by", humanControl, ARCHIVE_SOURCES[6])),
    tupletElement(3, "control-layer-handoff", `${doc.id}:safety:control-layer`, claim("requires-boundary-compatibility", "proposal -> governance -> append", "archive:predicated-drone-swarm/control-layer-handoff")),
  ], { source: [ARCHIVE_SOURCES[3], ARCHIVE_SOURCES[6]] });
}

function handednessTuple(doc) {
  return tuplet("swarm.tuplet.handedness", [
    tupletElement(0, "recv", `${doc.id}:handedness:recv`, claim("has-coordinate", asList(doc.readPaths), ARCHIVE_SOURCES[5])),
    tupletElement(1, "send", `${doc.id}:handedness:send`, claim("has-coordinate", "message-to-leader report", ARCHIVE_SOURCES[5])),
    tupletElement(2, "actuate", `${doc.id}:handedness:actuate`, claim("has-coordinate", asList(doc.writePaths), ARCHIVE_SOURCES[5])),
    tupletElement(3, "observe", `${doc.id}:handedness:observe`, claim("has-coordinate", asList(doc.commensurateWith), ARCHIVE_SOURCES[5])),
  ], { source: [ARCHIVE_SOURCES[5]] });
}

export function workTuplet(doc) {
  const id = nonempty(doc.id, "unidentified-work");
  const normalized = { ...doc, id };
  return tuplet("swarm.tuplet.work", [
    tupletElement(0, "identity", `work:${id}`, claim("has-kind", nonempty(doc.kind, "swarm.work"), ARCHIVE_SOURCES[0])),
    tupletElement(1, "intent", `${id}:intent`, claim("has-goal", nonempty(doc.goal, doc.title ?? id), ARCHIVE_SOURCES[0])),
    tupletElement(2, "authority", `${id}:authority`, claim("authorized-by", nonempty(doc.createdBy || doc.office, "leader-mediated-message"), ARCHIVE_SOURCES[6])),
    tupletElement(3, "handoff-cobordism", `${id}:handoff`, claim("is-morphism", "handoff-cobordism", ARCHIVE_SOURCES[2]), cobordismTuple(normalized)),
    tupletElement(4, "embodied-cost", `${id}:cost`, claim("has-cost-object", "embodied-cost-coordinate-product", ARCHIVE_SOURCES[4]), costTuple(normalized)),
    tupletElement(5, "safety-envelope", `${id}:safety`, claim("is-gated-by", "safety-envelope-and-meaningful-human-control", ARCHIVE_SOURCES[3]), safetyTuple(normalized)),
    tupletElement(6, "handedness", `${id}:handedness`, claim("has-participant-asymmetry", "recv-send-actuate-observe", ARCHIVE_SOURCES[5]), handednessTuple(normalized)),
  ], { source: ARCHIVE_SOURCES });
}

export function planCompositionKind(children) {
  const docs = children.map(docOf).filter((doc) => doc.id);
  if (!docs.length) return "empty-boundary";
  if (docs.length === 1) return "single-task-cobordism";

  const ids = new Set(docs.map((doc) => doc.id));
  const indegrees = new Map(docs.map((doc) => [doc.id, 0]));
  const outdegrees = new Map(docs.map((doc) => [doc.id, 0]));
  let edgeCount = 0;
  for (const doc of docs) {
    for (const dependency of dependenciesOf(doc).filter((id) => ids.has(id))) {
      edgeCount += 1;
      indegrees.set(doc.id, (indegrees.get(doc.id) ?? 0) + 1);
      outdegrees.set(dependency, (outdegrees.get(dependency) ?? 0) + 1);
    }
  }

  if (edgeCount === 0) return "tensor-product";
  const hasFanIn = [...indegrees.values()].some((degree) => degree > 1);
  const hasFanOut = [...outdegrees.values()].some((degree) => degree > 1);
  if (hasFanIn && hasFanOut) return "frobenius-fan-in-out";
  if (hasFanIn) return "frobenius-fan-in";
  if (hasFanOut) return "frobenius-fan-out";

  const starts = [...indegrees.values()].filter((degree) => degree === 0).length;
  const maxOut = Math.max(...outdegrees.values());
  if (starts === 1 && maxOut <= 1 && edgeCount === docs.length - 1) return "sequential-composition";
  return "general-poset-composition";
}

function boundaryCells(children, side) {
  const docs = children.map(docOf).filter((doc) => doc.id);
  const ids = new Set(docs.map((doc) => doc.id));
  if (side === "in") {
    return docs
      .filter((doc) => !dependenciesOf(doc).some((dependency) => ids.has(dependency)))
      .map((doc) => `work:${doc.id}:in`);
  }
  const dependedOn = new Set(docs.flatMap((doc) => dependenciesOf(doc)).filter((id) => ids.has(id)));
  return docs
    .filter((doc) => !dependedOn.has(doc.id))
    .map((doc) => `work:${doc.id}:out`);
}

export function planCompositionTuplet(planWork, children = []) {
  const plan = docOf(planWork);
  const docs = children.map(docOf).filter((doc) => doc.id);
  const composition = planCompositionKind(docs);
  const source = composition.startsWith("frobenius") ? [PLAN_SOURCE, FROBENIUS_SOURCE] : [PLAN_SOURCE];

  return tuplet("swarm.tuplet.plan_composition", [
    tupletElement(0, "identity", `plan:${nonempty(plan.id, "standalone")}`, claim("has-kind", nonempty(plan.kind, "swarm.work.project"), PLAN_SOURCE)),
    tupletElement(1, "operation", `${nonempty(plan.id, "standalone")}:composition`, claim("composes-by", composition, PLAN_SOURCE)),
    tupletElement(2, "in-boundary", `${nonempty(plan.id, "standalone")}:boundary:in`, claim("has-boundary-cells", boundaryCells(docs, "in"), PLAN_SOURCE)),
    tupletElement(3, "out-boundary", `${nonempty(plan.id, "standalone")}:boundary:out`, claim("has-boundary-cells", boundaryCells(docs, "out"), PLAN_SOURCE)),
    tupletElement(4, "task-cobordisms", `${nonempty(plan.id, "standalone")}:tasks`, claim("has-task-cobordisms", docs.map((doc) => `work:${doc.id}:handoff`), PLAN_SOURCE)),
    tupletElement(5, "composition-law", `${nonempty(plan.id, "standalone")}:law`, claim("requires-law", composition.startsWith("frobenius") ? "interchange-plus-frobenius-axioms" : "interchange-law", composition.startsWith("frobenius") ? FROBENIUS_SOURCE : PLAN_SOURCE)),
  ], { source });
}
