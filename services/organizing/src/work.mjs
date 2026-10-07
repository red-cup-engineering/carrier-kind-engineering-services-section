import { cell, utterance } from "@red-cup-engineering/signcell/cell";
import { cellSet } from "@red-cup-engineering/signcell/predication";
import { Mark } from "@red-cup-engineering/signcell/utterance";
import { evidence } from "@red-cup-engineering/signcell/cell";
import { negate } from "@red-cup-engineering/signchain/bilattice";

export const WORK_PREDICATES = Object.freeze({
  agent: workPredicate("agent"),
  task: workPredicate("task"),
  work: workPredicate("work"),
  office: workPredicate("office"),
  duty: workPredicate("duty"),
  capability: workPredicate("capability"),
  assignment: workPredicate("assignment"),
  assignee: workPredicate("assignee"),
  report: workPredicate("report"),
  goal: workPredicate("goal"),
  initial: workPredicate("initial"),
  evidence: workPredicate("evidence"),
});

export function workSubject(term) {
  return term;
}

export function workTerm(value) {
  return value;
}

export const term = workTerm;

export function workPredicateTerm(value) {
  return value;
}

export const predicate = workPredicateTerm;

export function officeTerm(value) {
  return workTerm(["office", value]);
}

export function fiberCoordinate(value) {
  return Object.freeze({ term: value });
}

export function fiber(coordinates) {
  return Object.freeze({
    entries: Object.freeze(coordinates.map((coordinate) => Object.freeze({ coordinate }))),
  });
}

export function fiberOf(values, axis = "capability") {
  return fiber(values.map((value) => fiberCoordinate(workTerm([axis, value]))));
}

export function workAgent(input

) {
  const capabilities = input.capabilities === undefined ? undefined : Object.freeze([...input.capabilities]);
  const facts = [
    workFact(input.term, WORK_PREDICATES.agent, input.term),
    ...((capabilities ?? []).map((capability) => workFact(input.term, WORK_PREDICATES.capability, capability))),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "organizing.work.agent",
    term: input.term,
    ...(capabilities === undefined ? {} : { capabilities }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.agent),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workTask(input

) {
  const goals = cellsOf(input.goals);
  const initial = input.initial === undefined ? undefined : cellsOf(input.initial);
  const facts = [
    workFact(input.term, WORK_PREDICATES.task, input.term),
    ...goals.cells.map((goal) => workFact(input.term, WORK_PREDICATES.goal, goal)),
    ...((initial?.cells ?? []).map((initialCell) => workFact(input.term, WORK_PREDICATES.initial, initialCell))),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "organizing.work.task",
    term: input.term,
    goals,
    ...(initial === undefined ? {} : { initial }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.task),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workItem(input

) {
  const facts = [
    workFact(input.term, WORK_PREDICATES.work, input.task.term),
    ...(input.office === undefined ? [] : [workFact(input.term, WORK_PREDICATES.office, input.office)]),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "organizing.work.item",
    term: input.term,
    task: input.task,
    ...(input.office === undefined ? {} : { office: input.office }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.work),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function assignWork(input

) {
  const duties = Object.freeze([...(input.duties ?? [])]);
  const facts = [
    workFact(input.term, WORK_PREDICATES.work, input.work.term),
    workFact(input.term, WORK_PREDICATES.office, input.office),
    ...duties.map((duty) => workFact(input.term, WORK_PREDICATES.duty, duty)),
    ...(input.assignee === undefined ? [] : [workFact(input.term, WORK_PREDICATES.assignee, input.assignee.term)]),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "organizing.work.assignment",
    term: input.term,
    work: input.work,
    office: input.office,
    ...(input.assignee === undefined ? {} : { assignee: input.assignee }),
    duties,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.assignment),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workProject(input

) {
  const offices = Object.freeze([...(input.offices ?? [])]);
  const assignments = Object.freeze([...(input.assignments ?? [])]);
  const facts = [
    ...input.work.map((item) => workFact(input.term, WORK_PREDICATES.work, item.term)),
    ...offices.map((office) => workFact(input.term, WORK_PREDICATES.office, office)),
    ...assignments.map((assignment) => workFact(input.term, WORK_PREDICATES.assignment, assignment.term)),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "organizing.work.project",
    term: input.term,
    work: Object.freeze([...input.work]),
    offices,
    assignments,
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.work),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workReport(input

) {
  const facts = [
    workFact(input.term, WORK_PREDICATES.report, input.work.term),
    workFact(input.term, WORK_PREDICATES.office, input.office),
    workFact(input.term, WORK_PREDICATES.work, input.reading),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "organizing.work.report",
    term: input.term,
    work: input.work,
    office: input.office,
    reading: input.reading,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.report),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

/** Where a single-agent skillful-work outcome lands in the social-scale ledger: a Success is
 *  `complete`; a ⊤-contradiction error is `blocked` (actionable — it wants a plan item); a
 *  ⊥-absence error is `noted` (an outcome, not a defect — "looked, found nothing"). The routing
 *  reads the SkillResult's CHARGE, which is the same bilattice value organizing's
 *  `workReadingStatus` already uses (complete→potential, blocked→⊤ stable, proposed→⊥ absurd) —
 *  so no translation table is needed between the agent kernel and the work ledger. */

export function skillResultRouting(result) {
  if (result.ok) return "complete";
  return result.reading === "stable" ? "blocked" : "noted";
}

/** Route an animating `SkillResult` (one agent's invocation outcome) into an organizing
 *  `WorkReport` (the social-scale work ledger entry). The result's bilattice CHARGE carries
 *  through unchanged — success and error are the classical / non-classical regions of one FOUR,
 *  shared across the two scales. A failure threads its error class and message as report
 *  evidence so the improvement loop downstream can triage it (⊤ `blocked` → a plan item;
 *  ⊥ `noted` → recorded outcome). The actual judgment is animating's; organizing only ledgers it. */
export function reportSkillResult(input

) {
  const routing = skillResultRouting(input.result);
  const outcomeEvidence = [workTerm(["status", routing])];
  if (!input.result.ok && input.result.error !== undefined) {
    outcomeEvidence.push(workTerm(["error-class", input.result.error.errorClass]));
    outcomeEvidence.push(workTerm(["error", input.result.error.message]));
    if (input.result.error.recoveryHint !== undefined) {
      outcomeEvidence.push(workTerm(["recovery-hint", input.result.error.recoveryHint]));
    }
  }
  return workReport({
    term: input.term,
    work: input.work,
    office: input.office,
    reading: (input.result.reading),
    ...(input.at === undefined ? {} : { at: input.at }),
    evidence: [...outcomeEvidence, ...(input.evidence ?? [])],
  });
}

export function deriveWorkType(closure) {
  if (closure.rules.some((rule) => rule.branching)) return "process";
  if (closure.goalCells.some((entry) => !entry.determinedAtDispatch)) return "project";
  return "task";
}

export function termKey(value) {
  return JSON.stringify(value.mark.value);
}

export function uniqueTerms(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = termKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return Object.freeze(out);
}

export function termValue(value) {
  return value.mark.value;
}

export function officeName(value, fallback = "operations-manifold") {
  if (value === undefined) return fallback;
  const raw = termValue(value);
  return Array.isArray(raw) && raw[0] === "office" && typeof raw[1] === "string" ? raw[1] : termKey(value);
}

export function workEvidenceValue(item, key) {
  for (const evidence of item.evidence ?? []) {
    if (!isTerm(evidence)) continue;
    const raw = evidence.mark.value;
    if (!Array.isArray(raw) || raw[0] !== key) continue;
    return raw.length === 2 ? raw[1] : raw.slice(1);
  }
  return undefined;
}

export function workTitle(item) {
  const value = workEvidenceValue(item, "title");
  return typeof value === "string" && value.trim() !== "" ? value : termKey(item.term);
}

export function workStatusName(item) {
  const value = workEvidenceValue(item, "status");
  return typeof value === "string" && value.trim() !== "" ? value : "active";
}

export function workPriority(item) {
  const value = workEvidenceValue(item, "priority");
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function workPrompt(item) {
  const value = workEvidenceValue(item, "prompt") ?? workEvidenceValue(item, "summary") ?? workEvidenceValue(item, "intent");
  return typeof value === "string" ? value : "";
}

export function workReadingStatus(item) {
  const status = workStatusName(item);
  if (status === "complete") return witnessedStatus("potential");
  if (status === "blocked") return witnessedStatus("stable");
  if (status === "proposed") return witnessedStatus("absurd");
  return witnessedStatus("active");
}

function witnessedStatus(value) {
  return value === "potential"
    ? evidence({ for: [["organizing", "work", "status", value]] })
    : value === "active"
      ? negate(evidence({ for: [["organizing", "work", "status", value]] }))
      : (value);
}

function workCarrier(subject, predicate) {
  return utterance(subject.mark, predicate.mark);
}

function workFact(subject, predicate, object) {
  return Object.freeze({
    kind: "organizing.work.fact",
    utterance: workCarrier(subject, predicate),
    cell: cell(subject, predicate, object),
  });
}

function evidenceFact(subject, evidence) {
  if (isWorkFact(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence.cell)];
  if (isTerm(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence)];
  if (isCell(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence)];
  if (isCellSet(evidence)) return evidence.cells.map((entry) => workFact(subject, WORK_PREDICATES.evidence, entry));
  if (isUtterance(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence.token)];
  if (isWorkCarrier(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence.term)];
  if (isPredicate(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence.mark)];
  return [workFact(subject, WORK_PREDICATES.evidence, evidence)];
}

function cellsOf(input) {
  return isCellSetInput(input) ? input : cellSet([...input]);
}

function workPredicate(label) {
  return Object.freeze(["organizing", "work", label]);
}

function isWorkFact(value) {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "organizing.work.fact";
}

function isTerm(value) {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "utterance.token";
}

function isCell(value) {
  return typeof value === "object" && value !== null && "subject" in value && "predicate" in value && "object" in value;
}

function isCellSet(value) {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "predication.cellSet";
}

function isCellSetInput(value) {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "predication.cellSet";
}

function isUtterance(value) {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "utterance.carrier";
}

function isPredicate(value) {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "predication.predicate";
}

function isWorkCarrier(value) {
  if (typeof value !== "object" || value === null || !("kind" in value) || !("term" in value)) return false;
  switch (value.kind) {
    case "organizing.work.agent":
    case "organizing.work.task":
    case "organizing.work.item":
    case "organizing.work.assignment":
    case "organizing.work.project":
    case "organizing.work.report":
      return true;
    default:
      return false;
  }
}
