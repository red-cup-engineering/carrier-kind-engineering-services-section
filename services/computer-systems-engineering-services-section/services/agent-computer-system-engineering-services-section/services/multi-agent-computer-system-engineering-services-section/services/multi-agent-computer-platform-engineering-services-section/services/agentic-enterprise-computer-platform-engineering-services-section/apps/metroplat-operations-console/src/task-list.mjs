/**
 * Ops work from MetroPlat through the federation's client: `read(tool, input)` returns a tool's
 * value. Reading projects the work spine; writing admits a person's outline as one structured
 * work intent, each item citing the outline line it was written on.
 * @module
 */

import { createHash } from "node:crypto";
import { assertStructuredWorkIntent } from "@red-cup-engineering/feltos/work/structured-intent";
import { fromSection } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";

const WORK_LEVELS = Object.freeze(["endeavor", "campaign", "project", "plan", "task", "work-item"]);

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function string(value) {
  return typeof value === "string" ? value : undefined;
}


function scopeLevel(scope) {
  const separator = scope.indexOf(":");
  const level = separator > 0 ? scope.slice(0, separator) : "";
  return WORK_LEVELS.includes(level) ? level : undefined;
}

function taskOfNode(node, duties) {
  const scope = string(node.scope);
  if (scope === undefined) return undefined;
  const kind = scopeLevel(scope);
  if (kind === undefined) return undefined;
  const matchingDuties = duties.filter((duty) => duty.scope === scope).map((duty) => Object.freeze({
    ...duty,
    agent: duty.agent,
    ...(duty.office === undefined ? {} : { office: duty.office }),
    ...(duty.passive === undefined ? {} : { passive: duty.passive }),
    ...(duty.standing === undefined ? {} : { standing: duty.standing }),
    ...(duty.via === undefined ? {} : { via: duty.via }),
    ...(duty.state === undefined ? {} : { state: duty.state }),
    reasons: array(duty.reasons).filter((item) => typeof item === "string"),
  }));
  return Object.freeze({
    ...node,
    kind,
    scope,
    id: scope.slice(kind.length + 1),
    status: string(node.status) ?? "open",
    parents: array(node.parents).filter((item) => typeof item === "string"),
    dependencies: array(node.dependencies).filter((item) => typeof item === "string"),
    dependents: array(node.dependents).filter((item) => typeof item === "string"),
    conflicts: array(node.conflicts).filter((item) => typeof item === "string"),
    structural: object(node.structural) ?? Object.freeze({ state: "blocked", blockers: ["missing-structural-readout"] }),
    coordination: object(node.coordination) ?? Object.freeze({ state: "obstructed" }),
    duties: Object.freeze(matchingDuties),
  });
}

function milestoneRows(readout) {
  const settlement = object(readout);
  const milestones = object(settlement?.milestones) ?? {};
  const gap = object(settlement?.gap) ?? {};
  return Object.freeze(Object.entries(milestones).sort(([left], [right]) => left.localeCompare(right)).map(([slug, value]) => {
    const status = object(value) ?? {};
    return Object.freeze({ slug, ...status, gap: array(gap[slug]).filter((item) => typeof item === "string") });
  }));
}

/** Read the global dispatch, its canonical work feed, and milestone state. */
export async function readMetroplatTaskList(read) {
  const dispatchValue = await read("agent-work-dispatch", {});
  const dispatch = object(dispatchValue) ?? {};
  const feed = string(dispatch.feed);
  const [workValue, milestoneValue] = await Promise.all([
    feed === undefined ? Promise.resolve(null) : read("work-item", { id: feed }),
    read("milestone", {}),
  ]);
  const work = object(workValue) ?? {};
  const roadmap = object(work.roadmap) ?? {};
  const duties = array(dispatch.queue).map(object).filter(Boolean);
  const unallocated = array(dispatch.unallocated).map(object).filter(Boolean);
  const tasks = array(roadmap.nodes).map(object).filter(Boolean)
    .map((node) => taskOfNode(node, duties)).filter(Boolean)
    .sort((left, right) => WORK_LEVELS.indexOf(left.kind) - WORK_LEVELS.indexOf(right.kind) || left.scope.localeCompare(right.scope));
  return Object.freeze({
    source: "metroplat-mcp",
    date: string(work.date) ?? string(dispatch.date) ?? string(object(milestoneValue)?.date),
    feed,
    tasks: Object.freeze(tasks),
    unallocated: Object.freeze(unallocated),
    unallocatedCount: Number.isInteger(dispatch.unallocatedCount) ? dispatch.unallocatedCount : unallocated.length,
    unallocatedTruncated: Number.isInteger(dispatch.unallocatedTruncated) ? dispatch.unallocatedTruncated : 0,
    milestones: milestoneRows(milestoneValue),
    roadmapMilestones: Object.freeze(array(roadmap.milestones)),
    relationObstructions: Object.freeze(array(roadmap.relationObstructions).filter((item) => typeof item === "string")),
    coordination: string(dispatch.coordination),
    coordinationCost: Number.isFinite(dispatch.coordinationCost) ? dispatch.coordinationCost : undefined,
  });
}

// One outline line: "<level>:<name> <text>", optionally ending "[needs <sibling>, ...]".
const OUTLINE_LINE = /^\s*((?:endeavor|campaign|project|plan|task|work-item):[^\s:]\S*)\s+(.+?)(?:\s+\[needs\s+([^\]]+)\])?\s*$/u;

/**
 * A structured work intent from an outline: one item per non-blank line, each item's parent the
 * nearest line above it one level up (endeavor, campaign, project, plan, task, work-item). The
 * intent's id is the digest of its producer and outline, so the same outline admits once.
 */
/**
 * An outline as a structured work intent. `need` is the end its items serve, a state of the world
 * (fifth edition): the outline is the plan toward it, and the board carries the need as the request.
 */
export function workIntentOfOutline(outline, producer, externalParent, need) {
  const text = String(outline ?? "");
  const latest = [];
  if (externalParent !== undefined) {
    const level = WORK_LEVELS.indexOf(scopeLevel(externalParent.scope));
    if (level < 0 || level === WORK_LEVELS.length - 1 || !externalParent.subject || !externalParent.witness) {
      throw new TypeError("the cited parent must be a witnessed work item above work-item");
    }
    latest[level] = externalParent.scope;
  }
  const items = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    if (line.trim() === "") return;
    const match = OUTLINE_LINE.exec(line);
    if (match === null) throw new TypeError(`line ${index + 1}: expected "<level>:<name> <text>"`);
    const [, cell, purpose, needs] = match;
    const level = WORK_LEVELS.indexOf(scopeLevel(cell));
    const parent = level === 0 ? undefined : latest[level - 1];
    if (level > 0 && parent === undefined) throw new TypeError(`line ${index + 1}: ${cell} needs a ${WORK_LEVELS[level - 1]} above it`);
    latest.length = level;
    latest[level] = cell;
    items.push({
      cell,
      ...(parent === undefined ? {} : { parent }),
      ...(externalParent !== undefined && parent === externalParent.scope ? { parentWitness: { subject: externalParent.subject, witness: externalParent.witness } } : {}),
      ...(needs === undefined ? {} : { dependencies: [...new Set(needs.split(",").map((need) => need.trim()).filter(Boolean))] }),
      text: purpose,
      evidence: [],
      provenance: [{ source: "outline", start: index + 1, end: index + 1, unit: "line" }],
    });
  });
  if (items.length === 0) throw new TypeError("the outline names no work");
  const stated = typeof need === "string" && need.trim() !== "" ? need.trim() : undefined;
  const identity = [producer, text, ...(externalParent === undefined ? [] : [externalParent.scope, externalParent.subject, externalParent.witness]), ...(stated === undefined ? [] : [stated])].join("\n");
  const digest = createHash("sha256").update(identity).digest("hex");
  return assertStructuredWorkIntent({
    kind: "metroplat.work.structured-intent",
    id: `outline-${digest.slice(0, 32)}`,
    producer: { id: producer },
    ...(stated === undefined ? {} : { need: stated }),
    sources: [{ id: "outline", kind: "work-outline", commitment: `sha256:${createHash("sha256").update(text).digest("hex")}` }],
    items,
  });
}

/** The work spine as the outline that would admit it, so a person edits what is there. */
export function outlineOfTasks(tasks) {
  const lines = [];
  const children = (scope) => tasks.filter((task) => (scope === undefined ? task.parents.length === 0 : task.parents.includes(scope)));
  const walk = (task, depth, seen) => {
    if (seen.has(task.scope)) return;
    seen.add(task.scope);
    const needs = task.dependencies.length ? ` [needs ${task.dependencies.join(", ")}]` : "";
    lines.push(`${"  ".repeat(depth)}${task.scope} ${task.text ?? task.id}${needs}`);
    for (const child of children(task.scope)) walk(child, depth + 1, seen);
  };
  const seen = new Set();
  for (const root of children(undefined)) walk(root, 0, seen);
  return lines.join("\n");
}

/** The four ways a person opens work, as the form names them. */
const OPENING_LABELS = Object.freeze({ request: "a request: something I need", report: "a report: something is wrong", propose: "a proposal: an idea", ask: "a question" });
const OPENING_WORDS = Object.freeze({ request: "need", report: "observation", propose: "idea", ask: "question" });

/**
 * A person's words as the opening move they chose: a request's need, a report's observation, a
 * proposal's idea or a question. Its requirements and conditions are refined later by whoever
 * promises it; nothing here names who does it.
 */
export function openingOfText(move, text) {
  const field = OPENING_WORDS[move];
  if (field === undefined) throw new TypeError(`work is opened as one of ${Object.keys(OPENING_WORDS).join(", ")}`);
  if (typeof text !== "string" || !text.trim()) throw new TypeError("say what you need, what is wrong, the idea, or the question");
  return Object.freeze({ move, [field]: text.trim() });
}

/** Project canonical work as shared TUFTE components; all HTML belongs upstream. */
export function renderTaskListHtml(readout, { navigation = [], scope, outline, need, text, error } = {}) {
  const taskLink = (value) => ({ href: "/tasks/view?scope=" + encodeURIComponent(value), label: value });
  const selected = scope === undefined ? undefined : readout.tasks.find((task) => task.scope === scope);
  const title = scope ?? "Work";
  const reading = JSON.parse(JSON.stringify(scope === undefined ? readout : selected ?? { scope, found: false }));
  const tasks = selected ? [selected] : scope === undefined ? readout.tasks : [];
  return renderTuftePacket(fromSection({ affirmed: [{ predicate: "reading", object: reading, citation: "/tasks" }] }, { subject: scope ?? "/tasks", title }),
    { source: { resource: "/tasks", feed: readout.feed ?? null }, settlement: reading, projection: "ops.work.tufte" }, {
      title, subtitle: readout.date ?? "Current work",
      tiles: [
        { title: navigation.title ?? "Group", links: navigation, span: 12 },
        ...(selected ? [] : [{ title: `Work needing allocation (${readout.unallocatedCount ?? 0}${readout.unallocatedTruncated ? `; ${readout.unallocatedTruncated} beyond this reading` : ""})`, span: 12, table: {
          columns: ["Work", "Requested by", "Missing facts"],
          rows: array(readout.unallocated).map((item) => [{ text: item.text ?? item.scope, href: taskLink(item.scope).href }, item.producer ?? "unknown", array(item.reasons).join(", ")]),
        } }]),
        { title: "Work spine", span: 12, table: { columns: ["Work", "Status", "Readiness", "Purpose"], rows: tasks.map((task) => [{ text: task.scope, href: taskLink(task.scope).href }, task.status, task.structural?.state ?? "", task.text ?? task.duties?.map((duty) => duty.text).filter(Boolean).join("; ") ?? ""]) } },
        ...(selected ? [
          { title: "Parents", links: selected.parents.map(taskLink) },
          { title: "Dependencies", links: selected.dependencies.map(taskLink) },
          { title: "Dependents", links: selected.dependents.map(taskLink) },
          { title: "Details", data: reading, span: 12 },
          ...(selected.obligationWitness && selected.kind !== "work-item" ? [{ title: "Develop this work", span: 12, form: {
            action: "/tasks", method: "post", enhance: false,
            ...(error === undefined ? {} : { errors: { outline: error } }),
            fields: [
              { name: "parentScope", kind: "hidden", value: selected.scope },
              { name: "parentSubject", kind: "hidden", value: selected.obligationWitness.subject },
              { name: "parentWitness", kind: "hidden", value: selected.obligationWitness.witness },
              { name: "outline", label: "Child work", kind: "textarea", required: true,
                description: `One line per item below ${selected.scope}, beginning with ${WORK_LEVELS[WORK_LEVELS.indexOf(selected.kind) + 1]}:<name> <purpose>.`,
                value: outline ?? "" },
            ],
            submitters: [{ label: "Admit child work" }],
          } }] : []),
        ] : [{ title: "Causal roadmap", span: 12, table: { columns: ["Height", "Parent", "State", "Ready", "Blocked", "Done"], rows: array(readout.roadmapMilestones).map((m) => [m.height, m.parent ?? m.enclosure, m.state, m.ready, m.blocked, m.done].map((value) => String(value ?? ""))) } }]),
        { title: "Milestones", span: 12, table: { columns: ["Milestone", "Status", "Gap"], rows: array(readout.milestones).map((m) => [m.slug, m.status ?? (m.reached ? "reached" : "pending"), m.gap.join("; ")]) } },
        ...(readout.relationObstructions?.length ? [{ title: "Relation obstructions", data: readout.relationObstructions, span: 12 }] : []),
        ...(selected ? [] : [{ title: "Open work", span: 12, form: { action: "/tasks", method: "post", enhance: false,
          ...(error === undefined || text === undefined ? {} : { errors: { text: error } }),
          fields: [
            { name: "move", kind: "select", label: "This is", options: Object.entries(OPENING_LABELS).map(([value, label]) => ({ value, label, ...(value === "request" ? { selected: true } : {}) })) },
            { name: "text", label: "In your words", kind: "textarea", required: true, description: "Say what you need, what is wrong, the idea, or the question. Never who should do it: whoever promises the work staffs it.", value: text ?? "" },
          ],
          submitters: [{ label: "Open" }] } },
        { title: "Write structured work", span: 12, form: { action: "/tasks", method: "post", enhance: false,
          ...(error === undefined || text !== undefined ? {} : { errors: { outline: error } }),
          fields: [{ name: "need", label: "Need", kind: "text", required: true, description: "The state of the world this work brings about: a goal, not the activity (\"The Group books close monthly\", not \"Build the books\").", value: need ?? "" },
            { name: "outline", label: "Outline", kind: "textarea", required: true, description: "One line per item, \"<level>:<name> <purpose>\", each under the item one level up (endeavor, campaign, project, plan, task, work-item); end a line with [needs <sibling>] for an ordering.", value: outline ?? outlineOfTasks(readout.tasks) }],
          submitters: [{ label: "Admit" }] } }]),
        { title: "Source", links: [{ href: "/tasks", label: "JSON reading" }] },
      ],
    }).html;
}
