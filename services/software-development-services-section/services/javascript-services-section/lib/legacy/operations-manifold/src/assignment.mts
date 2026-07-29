/**
 * Assignment spine — offices · duties · assignments coherent with work and
 * sessions.
 *
 * The corpus dispatch kernel (workitem-record → assigning-workitem →
 * assignment-record) and office model (office-as-double-settlement: an office
 * holds an incumbent, conferring authority) are the principled shape. The
 * manifold's read-work already carries `session`, `agent`, `assignedTo`, `focus`,
 * and `workKind`; this projects that evidence into the dispatch vocabulary so the
 * three clusters become one topology:
 *
 *   - an **assignment-record** binds a workitem to its **incumbent** (the session/
 *     agent holding the duty), valued by **charge** on the FOUR scale (potential/
 *     active/stable/absurd) from the work's status;
 *   - the workitem's **skill** is its `workKind` (the four kernel kinds and their
 *     compositions) — the capability a receiver must advertise;
 *   - the **office** is the authority domain the work sits in (its focus);
 *   - a **receiver** is a session, projected with the skills it advertises (the
 *     kinds it has handled), the offices it acts under (the foci), and its load.
 *
 * Built on work-carriers' relating-substrate primitives (officeTerm, fiberOf over
 * capability/authority axes), so offices and skills are carrier terms, not bare
 * strings. Pure projection from the work snapshot — no new log.
 */
import { officeTerm, term, termKey } from "./work-carriers.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "./work-management.mts";

export type AssignmentCharge = "absurd" | "potential" | "active" | "stable";

export type Assignment = Readonly<{
  kind: "operations-manifold.assignment";
  id: string;
  workItemId: string;
  title: string;
  incumbent: string;
  agent: string;
  skill: string;
  office: string;
  officeTerm: string;
  charge: AssignmentCharge;
  gate: ActiveWorkRecord["gate"];
  evidence: readonly string[];
}>;

export type Receiver = Readonly<{
  kind: "operations-manifold.receiver";
  incumbent: string;
  agent: string;
  skills: readonly string[];
  capabilityFiber: string;
  offices: readonly string[];
  open: number;
  settled: number;
}>;

export type AssignmentReading = Readonly<{
  kind: "operations-manifold.assignments";
  generatedAt: string;
  total: number;
  assignments: readonly Assignment[];
  receivers: readonly Receiver[];
}>;

export async function readAssignments(repoRoot: string): Promise<AssignmentReading> {
  const work = await operationsManifoldWork(repoRoot);
  const assignments = work.items
    .filter((item) => item.session !== null || item.assignedTo.length > 0)
    .map(assignmentOf);
  const receivers = projectReceivers(assignments);
  return Object.freeze({
    kind: "operations-manifold.assignments" as const,
    generatedAt: new Date().toISOString(),
    total: assignments.length,
    assignments: Object.freeze(assignments),
    receivers,
  });
}

function assignmentOf(item: ActiveWorkRecord): Assignment {
  const incumbent = item.session ?? item.assignedTo[0] ?? item.agent;
  const office = officeForFocus(item.focus);
  return Object.freeze({
    kind: "operations-manifold.assignment" as const,
    id: `assignment:${item.id}`,
    workItemId: item.id,
    title: item.title,
    incumbent,
    agent: item.agent,
    skill: item.workKind,
    office,
    officeTerm: termKey(officeTerm(office)),
    charge: chargeForStatus(item),
    gate: item.gate,
    evidence: Object.freeze([`${item.id}`, ...item.evidence.slice(0, 3)]),
  });
}

function projectReceivers(assignments: readonly Assignment[]): readonly Receiver[] {
  const byIncumbent = new Map<string, Assignment[]>();
  for (const assignment of assignments) {
    const list = byIncumbent.get(assignment.incumbent) ?? [];
    list.push(assignment);
    byIncumbent.set(assignment.incumbent, list);
  }
  const receivers = [...byIncumbent.entries()].map(([incumbent, list]) => {
    const skills = unique(list.map((assignment) => assignment.skill));
    const offices = unique(list.map((assignment) => assignment.office));
    return Object.freeze({
      kind: "operations-manifold.receiver" as const,
      incumbent,
      agent: list[0]?.agent ?? "unknown",
      skills,
      capabilityFiber: termKey(term(["capability-fiber", ...skills])),
      offices,
      open: list.filter((assignment) => assignment.charge !== "stable").length,
      settled: list.filter((assignment) => assignment.charge === "stable").length,
    });
  });
  return Object.freeze(receivers.sort((left, right) => right.open - left.open || left.incumbent.localeCompare(right.incumbent)));
}

function chargeForStatus(item: ActiveWorkRecord): AssignmentCharge {
  if (item.status === "complete") return "stable";
  if (item.status === "active") return "active";
  if (item.status === "blocked") return "absurd";
  return "potential";
}

function officeForFocus(focus: string | null): string {
  if (focus === null) return "operations-manifold";
  const parts = focus.split("/").filter((part) => part !== "" && part !== "." && part !== "sites" && part !== "lib" && part !== "services");
  return parts[parts.length - 1] ?? "operations-manifold";
}

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}
