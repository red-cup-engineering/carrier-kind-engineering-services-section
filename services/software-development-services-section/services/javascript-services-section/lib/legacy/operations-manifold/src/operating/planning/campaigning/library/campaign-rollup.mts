/**
 * Campaign rollup — the work ledger read as the corpus work-carrier forest.
 *
 * The corpus fixes one containment ladder, broad to narrow:
 *
 *   enterprise > endeavor > campaign > project > plan > task
 *
 * with `objective` a decidable target serving a goal. milestone / sprint / phase
 * are NOT ladder tiers — they are work-breakdown-structure markers; a milestone's
 * task children roll up to the nearest plan/project, the marker itself being
 * transparent to progress. This module folds the flat `contributesTo` work items
 * into that ladder, derives each campaign's FRONT (the gap between current state
 * and objective where work happens) and execution order by projecting the
 * campaign's leaf tasks onto @emsenn/managing-operations' pure
 * `operate`/`flowSnapshot`, and reads each task's work-type off a conservative
 * closure via the local Operations Manifold work carrier.
 *
 * The FRONT is what makes progress visible even when individual plans stall: a
 * campaign with stalled plans still shows the plans that are advancing. Progress
 * counts only `gate:"record"` planning leaves; `gate:"stop"` session threads show
 * for visibility but never inflate planning counts.
 *
 * It is a PULL surface: the agent (or a hook) runs `read-campaign` on demand to
 * get the whole tree; suit injection takes only the one-line `pointers` from here
 * so grounding stays cheap. Pure over the work snapshot — admits no new state.
 * The managing pure functions cross only plain-data (`OperationReading`,
 * `FlowSnapshot`) boundaries, so no relating-experimental carrier crosses the
 * cross-line seam.
 */
import { STANDARD_WORKFLOW } from "@emsenn/managing-operations/flowing";
import { operate } from "@emsenn/managing-operations";
import {
  dependency,
  task,
  type Dependency,
  type Task,
} from "@emsenn/managing-operations/structuring";

import {
  operationsManifoldWork,
  type ActiveWorkRecord,
  type WorkItemKind,
  type WorkSnapshot,
} from "../../../../work-management.mts";
import { optionalText } from "../../../../records.mts";
import { deriveWorkType, type TaskClosure, type WorkType } from "../../../../work-carriers.mts";

export type CampaignRollupParams = Readonly<{
  /** Restrict the "current front" to work bound to this session, when given. */
  session?: string | undefined;
  /** A campaign id (or title slug) to focus the reading on a single campaign. */
  campaign?: string | undefined;
  q?: string | undefined;
}>;

/** A ladder tier — the corpus containment kinds, broad to narrow. Markers
 *  (milestone/sprint/phase) are deliberately absent: they are transparent. */
export type LadderKind =
  | "enterprise"
  | "endeavor"
  | "campaign"
  | "project"
  | "plan"
  | "task";

export type CampaignObjective = Readonly<{
  target: string;
  metric?: string;
  deadline?: string;
  /** Decidable status of the objective. `open` when no signal is parseable. */
  status: "achieved" | "missed" | "on-track" | "open";
}>;

export type CampaignProgress = Readonly<{
  /** Planning (gate:"record") leaf descendants that are done. */
  done: number;
  /** Planning (gate:"record") leaf descendants in total. */
  total: number;
  /** done / total, 0 when there are no planning leaves. */
  ratio: number;
}>;

/** A reference to a work item by id + title — the shape the front lists. */
export type WorkRef = Readonly<{ id: string; title: string }>;

/** The FRONT of a campaign: where work happens against the objective. Derived
 *  from the managing dependency order + flow over the campaign's leaf tasks. */
export type FrontReading = Readonly<{
  /** Open leaves whose dependencies are all satisfied — work that can move now. */
  advancing: readonly WorkRef[];
  /** Open leaves still waiting on unsatisfied dependencies. */
  stalled: readonly WorkRef[];
  /** Leaves blocked by an explicit blocker. */
  blocked: readonly WorkRef[];
  /** Settled leaves. */
  done: readonly WorkRef[];
  /** The single next actionable task (prefer the in-progress / earliest-ordered). */
  nextTask: Readonly<{ id: string; title: string; workType?: WorkType }> | null;
}>;

export type CampaignNode = Readonly<{
  id: string;
  title: string;
  /** The ladder tier this node occupies (markers are collapsed away before this). */
  kind: LadderKind;
  /** The raw work-management kind, retained for diagnostics. */
  workKind: WorkItemKind;
  workStatus: string;
  /** "record" = a planning carrier (counts toward progress); "stop" = a session
   *  thread attached for visibility (activity, not a planning unit). */
  gate: "stop" | "record";
  blocked: boolean;
  /** Work-type of a leaf task (procedure when unknown); absent on containers. */
  workType?: WorkType;
  /** Parsed objective (campaign-level), null when none stated. */
  objective?: CampaignObjective | null;
  /** Parsed time horizon note, null when none stated. */
  horizon?: string | null;
  /** The campaign's front, present on campaign nodes that have leaf tasks. */
  front?: FrontReading;
  progress: CampaignProgress;
  children: readonly CampaignNode[];
}>;

/** The next actionable front overall, biased to the bound session task. */
export type CampaignFront = Readonly<{
  campaign: WorkRef;
  plan: WorkRef | null;
  task: Readonly<{ id: string; title: string; workStatus: string; workType?: WorkType }> | null;
}>;

export type CampaignReading = Readonly<{
  kind: "operations-manifold.campaign.rollup";
  generatedAt: string;
  source: string;
  campaigns: readonly CampaignNode[];
  /** The next actionable front (prefer the bound session task). */
  current: CampaignFront | null;
  /** One compact line per campaign — the only thing suit injection spends. */
  pointers: readonly string[];
  counts: Readonly<{
    campaigns: number;
    projects: number;
    plans: number;
    tasks: number;
    openTasks: number;
  }>;
}>;

// The containment ladder, broad (0) to narrow. A parent must be strictly broader
// than its child. milestone/sprint/phase are markers, NOT tiers — they are
// transparent: collapsed away so their children roll up to the nearest real tier.
const LADDER: Readonly<Record<LadderKind, number>> = Object.freeze({
  enterprise: 0,
  endeavor: 1,
  campaign: 2,
  project: 3,
  plan: 4,
  task: 5,
});

const MARKER_KINDS: ReadonlySet<WorkItemKind> = new Set<WorkItemKind>(["milestone", "sprint", "phase"]);

// Map every work-management kind onto a ladder tier so a heterogeneous ledger
// still forms one tree. Markers map to `null` (transparent). Auxiliary kinds
// (goals, notes, decisions) ride at task tier — they are leaves, never containers.
function ladderKindOf(kind: WorkItemKind): LadderKind | null {
  switch (kind) {
    case "enterprise":
      return "enterprise";
    case "endeavor":
    case "expedition":
      return "endeavor";
    case "campaign":
      return "campaign";
    case "project":
      return "project";
    case "plan":
    case "objective":
      return "plan";
    case "milestone":
    case "sprint":
    case "phase":
      return null; // transparent marker
    default:
      return "task";
  }
}

/** Numeric ladder rank used to verify a parent is strictly broader. Markers take
 *  the rank of the narrowest tier so they never act as containers in ranking. */
function rankOf(kind: WorkItemKind): number {
  const ladder = ladderKindOf(kind);
  return ladder === null ? LADDER.task : LADDER[ladder];
}

export async function campaignRollup(
  repoRoot: string,
  params: CampaignRollupParams = {},
): Promise<CampaignReading> {
  const snapshot = await operationsManifoldWork(repoRoot);
  return foldCampaignRollup(snapshot, params);
}

/** The pure fold — separated so it is trivially testable over a snapshot. */
export function foldCampaignRollup(
  snapshot: WorkSnapshot,
  params: CampaignRollupParams = {},
): CampaignReading {
  const items = snapshot.items;
  const byId = new Map(items.map((item) => [item.id, item] as const));

  // Raw parent edges: parent(x) = the nearest contributesTo target that is a
  // known, strictly broader-ranked work item (markers included as intermediate
  // containers so a task→milestone→plan chain keeps its structure for now).
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  for (const item of items) {
    const parent = item.contributesTo
      .map((id) => byId.get(id))
      .find(
        (candidate): candidate is ActiveWorkRecord =>
          candidate !== undefined && rankOf(candidate.workKind) < rankOf(item.workKind),
      );
    if (parent !== undefined) {
      parentOf.set(item.id, parent.id);
      const siblings = childrenOf.get(parent.id) ?? [];
      siblings.push(item.id);
      childrenOf.set(parent.id, siblings);
    }
  }

  const focus = optionalText(params.campaign ?? params.q);
  const roots = items.filter(
    (item) => item.workKind === "campaign" && !isSettledItem(item) && (focus === null || matchesFocus(item, focus)),
  );

  // Build each campaign tree, collapsing transparent markers so a marker's
  // children attach to the marker's nearest real ladder ancestor.
  const campaigns = roots.map((root) => buildNode(root.id, byId, childrenOf, new Set([root.id])));

  const current = currentFront(campaigns, byId, optionalText(params.session));

  return Object.freeze({
    kind: "operations-manifold.campaign.rollup" as const,
    generatedAt: snapshot.generatedAt,
    source: snapshot.state,
    campaigns: Object.freeze(campaigns),
    current,
    pointers: Object.freeze(campaigns.map(pointerFor)),
    counts: Object.freeze({
      campaigns: campaigns.length,
      projects: countKind(campaigns, "project"),
      plans: countKind(campaigns, "plan"),
      tasks: countLeaves(campaigns).total,
      openTasks: countLeaves(campaigns).open,
    }),
  });
}

/**
 * Build a campaign node. Transparent markers (milestone/sprint/phase) are
 * collapsed: a marker contributes no node of its own; its planning children are
 * re-parented onto the nearest real ladder ancestor, so a milestone's tasks roll
 * up to their plan/project rather than to a WBS marker tier.
 */
function buildNode(
  id: string,
  byId: ReadonlyMap<string, ActiveWorkRecord>,
  childrenOf: ReadonlyMap<string, string[]>,
  seen: ReadonlySet<string>,
): CampaignNode {
  const item = byId.get(id)!;
  // Gather real (non-marker) descendant child ids, descending THROUGH markers.
  const realChildIds = realChildren(id, byId, childrenOf, seen);
  const children = realChildIds
    .map((childId) => buildNode(childId, byId, childrenOf, new Set([...seen, id])))
    .sort((a, b) => LADDER[a.kind] - LADDER[b.kind] || a.title.localeCompare(b.title));

  const kind = ladderKindOf(item.workKind) ?? "task"; // a markered root cannot occur (roots are campaigns)
  const isLeaf = children.length === 0;
  const node: {
    id: string;
    title: string;
    kind: LadderKind;
    workKind: WorkItemKind;
    workStatus: string;
    gate: "stop" | "record";
    blocked: boolean;
    workType?: WorkType;
    objective?: CampaignObjective | null;
    horizon?: string | null;
    front?: FrontReading;
    progress: CampaignProgress;
    children: readonly CampaignNode[];
  } = {
    id,
    title: item.title,
    kind,
    workKind: item.workKind,
    workStatus: item.workStatus,
    gate: item.gate,
    blocked: item.workStatus === "blocked" || item.blockedBy !== null,
    progress: progressOf(item, children),
    children,
  };
  if (isLeaf) node.workType = leafWorkType(item);
  if (kind === "campaign") {
    node.objective = parseObjective(item);
    node.horizon = parseHorizon(item);
    node.front = frontOf(node, byId);
  }
  return Object.freeze(node);
}

/** The real (non-marker) child ids of `id`: a marker child is skipped and its
 *  own children are spliced in, recursively, so markers vanish from the tree. */
function realChildren(
  id: string,
  byId: ReadonlyMap<string, ActiveWorkRecord>,
  childrenOf: ReadonlyMap<string, string[]>,
  seen: ReadonlySet<string>,
): readonly string[] {
  const out: string[] = [];
  for (const childId of childrenOf.get(id) ?? []) {
    if (seen.has(childId)) continue;
    const child = byId.get(childId);
    if (child === undefined) continue;
    if (isRetiredStatus(child.workStatus)) continue;
    if (MARKER_KINDS.has(child.workKind)) {
      out.push(...realChildren(childId, byId, childrenOf, new Set([...seen, childId])));
    } else {
      out.push(childId);
    }
  }
  return out;
}

/**
 * Leaf progress over PLANNING units only. A childless `record` leaf counts 1
 * (done iff settled); a childless `stop` leaf is a transient session thread and
 * counts 0/0 so it never inflates a campaign's planning progress, even while it
 * shows in the tree. A parent sums its children.
 */
function progressOf(item: ActiveWorkRecord, children: readonly CampaignNode[]): CampaignProgress {
  if (children.length === 0) {
    if (item.gate !== "record") return Object.freeze({ done: 0, total: 0, ratio: 0 });
    if (isRetiredStatus(item.workStatus)) return Object.freeze({ done: 0, total: 0, ratio: 0 });
    const done = isSettledWorkStatus(item.workStatus) || item.status === "complete";
    return Object.freeze({ done: done ? 1 : 0, total: 1, ratio: done ? 1 : 0 });
  }
  const done = children.reduce((sum, child) => sum + child.progress.done, 0);
  const total = children.reduce((sum, child) => sum + child.progress.total, 0);
  return Object.freeze({ done, total, ratio: total === 0 ? 0 : done / total });
}

/**
 * The FRONT of a campaign, derived by projecting its planning leaf tasks onto the
 * managing operation reading. Each leaf becomes a managing Task whose status maps
 * to a STANDARD_WORKFLOW label (todo/doing/done) so `flowSnapshot` buckets it
 * correctly; explicit `dependsOn` edges among the leaves become managing
 * Dependencies. `operate` gives the topological order and validity; we read the
 * front off the satisfied/unsatisfied-dependency partition.
 */
function frontOf(campaign: CampaignNode, byId: ReadonlyMap<string, ActiveWorkRecord>): FrontReading {
  const leaves = planningLeaves(campaign);
  if (leaves.length === 0) {
    return Object.freeze({ advancing: [], stalled: [], blocked: [], done: [], nextTask: null });
  }
  const leafIds = new Set(leaves.map((leaf) => leaf.id));
  const tasks: Task[] = leaves.map((leaf) => {
    const item = byId.get(leaf.id)!;
    return task({
      id: leaf.id,
      title: leaf.title,
      status: statusLabel(leaf.workStatus),
      closure: closureFor(item),
    });
  });
  // Dependencies among THESE leaves only (an edge to a non-leaf is structural,
  // not a precedence the front cares about).
  const deps: Dependency[] = [];
  for (const leaf of leaves) {
    const item = byId.get(leaf.id)!;
    for (const pred of item.dependsOn) {
      if (leafIds.has(pred)) deps.push(dependency({ predecessor: pred, successor: leaf.id }));
    }
  }
  const reading = operate({ tasks, dependencies: deps, workflow: STANDARD_WORKFLOW });

  // A leaf's dependencies are satisfied when every in-front predecessor is done.
  const doneIds = new Set(
    leaves.filter((leaf) => isSettledWorkStatus(leaf.workStatus)).map((leaf) => leaf.id),
  );
  const depsByLeaf = new Map<string, readonly string[]>();
  for (const leaf of leaves) {
    const item = byId.get(leaf.id)!;
    depsByLeaf.set(leaf.id, item.dependsOn.filter((pred) => leafIds.has(pred)));
  }

  const advancing: WorkRef[] = [];
  const stalled: WorkRef[] = [];
  const blocked: WorkRef[] = [];
  const done: WorkRef[] = [];
  for (const leaf of leaves) {
    const leafRef = ref(leaf);
    if (isSettledWorkStatus(leaf.workStatus)) {
      done.push(leafRef);
      continue;
    }
    if (leaf.blocked) {
      blocked.push(leafRef);
      continue;
    }
    const predecessors = depsByLeaf.get(leaf.id) ?? [];
    const satisfied = predecessors.every((pred) => doneIds.has(pred));
    if (satisfied) advancing.push(leafRef);
    else stalled.push(leafRef);
  }

  // The next task: prefer an in-progress advancing leaf, else the earliest in the
  // managing topological order that is advancing, else the first advancing leaf.
  const nextTask = pickNext(advancing, leaves, reading.order);

  return Object.freeze({
    advancing: Object.freeze(advancing),
    stalled: Object.freeze(stalled),
    blocked: Object.freeze(blocked),
    done: Object.freeze(done),
    nextTask,
  });
}

function pickNext(
  advancing: readonly WorkRef[],
  leaves: readonly CampaignNode[],
  order: readonly string[] | null,
): FrontReading["nextTask"] {
  if (advancing.length === 0) return null;
  const advancingIds = new Set(advancing.map((ref) => ref.id));
  const byId = new Map(leaves.map((leaf) => [leaf.id, leaf] as const));
  const inProgress = advancing.find((ref) => byId.get(ref.id)?.workStatus === "in-progress");
  const ordered = order?.find((id) => advancingIds.has(id));
  const chosenId = inProgress?.id ?? ordered ?? advancing[0]!.id;
  const leaf = byId.get(chosenId);
  if (leaf === undefined) return null;
  return Object.freeze({
    id: leaf.id,
    title: leaf.title,
    ...(leaf.workType === undefined ? {} : { workType: leaf.workType }),
  });
}

/** The planning (gate:"record") leaf tasks under a node, in tree order. */
function planningLeaves(node: CampaignNode): readonly CampaignNode[] {
  const out: CampaignNode[] = [];
  const walk = (n: CampaignNode): void => {
    if (n.children.length === 0) {
      if (n.gate === "record") out.push(n);
      return;
    }
    for (const child of n.children) walk(child);
  };
  walk(node);
  return out;
}

/** The next actionable front overall, biased to the bound session task. */
function currentFront(
  campaigns: readonly CampaignNode[],
  byId: ReadonlyMap<string, ActiveWorkRecord>,
  session: string | null,
): CampaignFront | null {
  const ranked = campaigns
    .map((campaign) => ({ campaign, leaf: nextLeaf(campaign, byId, session) }))
    .filter((entry): entry is { campaign: CampaignNode; leaf: CampaignNode } => entry.leaf !== null)
    .sort((a, b) => a.campaign.progress.ratio - b.campaign.progress.ratio);
  const chosen = ranked[0];
  if (chosen === undefined) return null;
  const plan = nearestContainer(chosen.leaf.id, chosen.campaign, "plan")
    ?? nearestContainer(chosen.leaf.id, chosen.campaign, "project");
  return Object.freeze({
    campaign: Object.freeze({ id: chosen.campaign.id, title: chosen.campaign.title }),
    plan: plan === null ? null : Object.freeze({ id: plan.id, title: plan.title }),
    task: Object.freeze({
      id: chosen.leaf.id,
      title: chosen.leaf.title,
      workStatus: chosen.leaf.workStatus,
      ...(chosen.leaf.workType === undefined ? {} : { workType: chosen.leaf.workType }),
    }),
  });
}

/** The campaign's next actionable leaf: the bound session task when present, then
 *  an in-progress open leaf, then the first open leaf. */
function nextLeaf(
  node: CampaignNode,
  byId: ReadonlyMap<string, ActiveWorkRecord>,
  session: string | null,
): CampaignNode | null {
  const leaves = planningLeaves(node);
  const open = leaves.filter(
    (leaf) =>
      !leaf.blocked
      && !isSettledWorkStatus(leaf.workStatus),
  );
  if (session !== null) {
    const mine = open.find((leaf) => byId.get(leaf.id)?.session === session);
    if (mine !== undefined) return mine;
  }
  const inProgress = open.find((leaf) => leaf.workStatus === "in-progress");
  return inProgress ?? open[0] ?? null;
}

/** The nearest ancestor of the given ladder kind containing `leafId`, found by
 *  walking the already-built campaign subtree. */
function nearestContainer(
  leafId: string,
  campaign: CampaignNode,
  kind: LadderKind,
): CampaignNode | null {
  let found: CampaignNode | null = null;
  const walk = (n: CampaignNode, ancestor: CampaignNode | null): void => {
    const nextAncestor = n.kind === kind ? n : ancestor;
    if (n.id === leafId) {
      found = ancestor;
      return;
    }
    for (const child of n.children) walk(child, nextAncestor);
  };
  walk(campaign, null);
  return found;
}

function countKind(nodes: readonly CampaignNode[], kind: LadderKind): number {
  let count = 0;
  const walk = (n: CampaignNode): void => {
    if (n.kind === kind) count += 1;
    for (const child of n.children) walk(child);
  };
  for (const node of nodes) walk(node);
  return count;
}

function countLeaves(nodes: readonly CampaignNode[]): Readonly<{ total: number; open: number }> {
  let total = 0;
  let open = 0;
  const walk = (n: CampaignNode): void => {
    if (n.children.length === 0) {
      if (n.gate !== "record") return; // session threads are not planning units
      if (isRetiredStatus(n.workStatus)) return;
      total += 1;
      if (!isSettledWorkStatus(n.workStatus)) open += 1;
      return;
    }
    for (const child of n.children) walk(child);
  };
  for (const node of nodes) walk(node);
  return Object.freeze({ total, open });
}

/** The one compact suit line per campaign: campaign · objective · front. */
function pointerFor(campaign: CampaignNode): string {
  const front = campaign.front;
  const objective = campaign.objective?.target;
  const objectivePart = objective === undefined || objective === null ? "" : ` · ${truncate(objective, 60)}`;
  const pct = Math.round(campaign.progress.ratio * 100);
  const frontPart =
    front === undefined
      ? ` · ${campaign.progress.done}/${campaign.progress.total} (${pct}%)`
      : ` · front: ${front.advancing.length} advancing / ${front.stalled.length} stalled / ${front.blocked.length} blocked (${campaign.progress.done}/${campaign.progress.total}, ${pct}%)`;
  return `${campaign.title}${objectivePart}${frontPart}`;
}

// ── tolerant parsing ──────────────────────────────────────────────────────────

/** Every line of an item's stated intent, success, and notes — the haystack a
 *  campaign's objective/horizon are parsed out of. */
function statedLines(item: ActiveWorkRecord): readonly string[] {
  const sources = [item.intent, item.success, ...item.notes];
  const lines: string[] = [];
  for (const source of sources) {
    for (const line of source.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (trimmed !== "") lines.push(trimmed);
    }
  }
  return lines;
}

/** Parse an `objective: ...` line (with optional `metric:`/`deadline:` and a
 *  `status:` token) out of a campaign's stated text. Null when none is stated. */
function parseObjective(item: ActiveWorkRecord): CampaignObjective | null {
  const lines = statedLines(item);
  const objectiveLine = lines.find((line) => /^objective\s*:/iu.test(line));
  if (objectiveLine === undefined) return null;
  const target = objectiveLine.replace(/^objective\s*:/iu, "").trim();
  if (target === "") return null;
  const metric = fieldValue(lines, "metric");
  const deadline = fieldValue(lines, "deadline");
  const status = objectiveStatus(lines, item);
  return Object.freeze({
    target,
    ...(metric === null ? {} : { metric }),
    ...(deadline === null ? {} : { deadline }),
    status,
  });
}

/** Parse a `horizon: ...` note out of a campaign's stated text. */
function parseHorizon(item: ActiveWorkRecord): string | null {
  const lines = statedLines(item);
  const horizonLine = lines.find((line) => /^horizon\s*:/iu.test(line));
  if (horizonLine === undefined) return item.deadline;
  const value = horizonLine.replace(/^horizon\s*:/iu, "").trim();
  return value === "" ? item.deadline : value;
}

function fieldValue(lines: readonly string[], field: string): string | null {
  const re = new RegExp(`^${field}\\s*:`, "iu");
  const line = lines.find((candidate) => re.test(candidate));
  if (line === undefined) return null;
  const value = line.replace(re, "").trim();
  return value === "" ? null : value;
}

/** The decidable objective status, parsed from a `status:` field when stated,
 *  else inferred: achieved when the campaign item itself is complete. */
function objectiveStatus(lines: readonly string[], item: ActiveWorkRecord): CampaignObjective["status"] {
  const stated = fieldValue(lines, "status");
  if (stated !== null) {
    const lower = stated.toLowerCase();
    if (lower.startsWith("achiev")) return "achieved";
    if (lower.startsWith("miss")) return "missed";
    if (lower.startsWith("on")) return "on-track";
  }
  if (item.status === "complete" || item.workStatus === "done") return "achieved";
  return "open";
}

// ── work-type derivation ────────────────────────────────────────────────────

/**
 * A conservative closure for a leaf task: meaning is settled when the item states
 * a concrete success criterion; execution is settled when it is not blocked and
 * has no open dependencies — otherwise a branch remains. The resulting work-type
 * defaults toward `procedure` (meaning settled, execution open), the corpus's
 * safe default for an ordinary tactical task.
 */
function closureFor(item: ActiveWorkRecord): TaskClosure & Readonly<{ kind: "computing.work-closure" }> {
  const meaningSettled = optionalText(item.success) !== null;
  const executionSettled = item.blockedBy === null && item.dependsOn.length === 0;
  return Object.freeze({
    kind: "computing.work-closure" as const,
    goalCells: Object.freeze([
      Object.freeze({ cell: `${item.id}:goal`, determinedAtDispatch: meaningSettled }),
    ]),
    rules: Object.freeze([
      Object.freeze({ name: `${item.id}:rule`, branching: !executionSettled }),
    ]),
  });
}

/** The work-type of a leaf, defaulting to `procedure` when derivation fails. */
function leafWorkType(item: ActiveWorkRecord): WorkType {
  try {
    return deriveWorkType(closureFor(item));
  } catch {
    return "procedure";
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Map a work-management status onto a STANDARD_WORKFLOW label so managing's
 *  flow/order machinery buckets it (todo / doing / done). */
function statusLabel(workStatus: string): string {
  if (isSettledWorkStatus(workStatus)) return "done";
  if (workStatus === "in-progress" || workStatus === "review" || workStatus === "reopened") return "doing";
  return "todo";
}

function isSettledWorkStatus(workStatus: string): boolean {
  return workStatus === "done" || isRetiredStatus(workStatus);
}

function isRetiredStatus(workStatus: string): boolean {
  return workStatus === "abandoned" || workStatus === "deferred";
}

function isSettledItem(item: ActiveWorkRecord): boolean {
  return item.status === "complete" || isSettledWorkStatus(item.workStatus);
}

function ref(node: CampaignNode): WorkRef {
  return Object.freeze({ id: node.id, title: node.title });
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function matchesFocus(item: ActiveWorkRecord, focus: string): boolean {
  const needle = focus.toLowerCase();
  return item.id.toLowerCase().includes(needle) || item.title.toLowerCase().includes(needle);
}
