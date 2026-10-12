/**
 * Work, jural relations, office incumbency, and governance readings.
 *
 * This package owns the work-scope grammar and the evidence-valued relations
 * read over it. Capability policy consumes these readings; it does not own them.
 */
import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  meetKnowledgeValue,
  type ChargeValue,
  type ChargeValueName,
} from "../lib/values/index.mts";
import {
  cell,
  cellCoincides,
  converseCell,
  predicateOfClaim,
  specializePredicateCell,
  type Cell,
  type PredicationPredicate,
} from "../lib/logic/predicating/predication.mts";
import { claim, mark, token } from "../lib/records/utterance/utterance.mts";
import { cohomologyOfCells } from "../lib/fixpoint/cohomology.mts";
import { hodgeDecomposition, relationGraphOfCells } from "../lib/math/graphs/laplacian.mts";
import type { FromSchema } from "../lib/schema/contract.mts";
import { governanceSchema, juralRelationSchema } from "./schema.mts";

/** The work-item spine — endeavor generates campaign generates project generates
 *  plan generates task generates the work-item leaf. */
export const WORK_LEVELS = Object.freeze([
  "endeavor",
  "campaign",
  "project",
  "plan",
  "task",
  "work-item",
] as const);
export type WorkLevel = typeof WORK_LEVELS[number];

/** A unit of work at a level of the spine, optionally nested under a parent id (its
 *  enclosing work item — a task's project, a project's campaign, …). */
export interface WorkItem {
  readonly level: WorkLevel;
  readonly id: string;
  readonly parent?: string;
}

function isWorkLevel(value: string): value is WorkLevel {
  return (WORK_LEVELS as readonly string[]).includes(value);
}

/** Recognize the one `level:id` work-scope grammar. */
export function workItemOfCell(cell: string): WorkItem | null {
  const separator = cell.indexOf(":");
  if (separator <= 0) return null;
  const level = cell.slice(0, separator);
  const id = cell.slice(separator + 1);
  if (id.length === 0 || !isWorkLevel(level)) return null;
  return Object.freeze({ level, id } satisfies WorkItem);
}

/** Construct the one work-address grammar: `level:id`. Enclosure remains claim
 *  evidence rather than an encoded parent segment. */
export function scopeOf(level: WorkLevel, id: string): string {
  if (id.length === 0) throw new TypeError("scopeOf: id must be nonempty");
  return `${level}:${id}`;
}

/** The spine index of a level (endeavor = 0 … work-item = 5), for altitude comparisons. */
export function workLevelIndex(level: WorkLevel): number {
  return WORK_LEVELS.indexOf(level);
}

/** Whether `child` sits strictly below `parent` on the spine (a task is below a project). */
export function workLevelBelow(child: WorkLevel, parent: WorkLevel): boolean {
  return workLevelIndex(child) > workLevelIndex(parent);
}

export const JURAL_KINDS = Object.freeze([
  "claim",
  "duty",
  "privilege",
  "no-right",
  "power",
  "liability",
  "immunity",
  "disability",
] as const);
export type JuralKind = typeof JURAL_KINDS[number];

const CORRELATIVE: Readonly<Record<JuralKind, JuralKind>> = Object.freeze({
  claim: "duty",
  duty: "claim",
  privilege: "no-right",
  "no-right": "privilege",
  power: "liability",
  liability: "power",
  immunity: "disability",
  disability: "immunity",
});

/** The correlative of a Hohfeldian kind (power ↔ liability, duty ↔ claim, …). Involutive. */
export function correlativeKind(kind: JuralKind): JuralKind {
  return CORRELATIVE[kind];
}

/** A directed correlative jural relation between an active holder and a passive party,
 *  FOUR-valued in its existence: `held` asserted, `denied` denied, `contested`
 *  contradicted, `unknown` no information. */
export type JuralRelation = Omit<FromSchema<typeof juralRelationSchema>, "kind" | "active" | "passive" | "scope" | "standing"> & {
  readonly kind: JuralKind;
  readonly active: string;
  readonly passive: string;
  readonly scope: string;
  readonly standing: ChargeValueName;
};

function juralRelationPredicate(kind: JuralKind, scope: string): PredicationPredicate {
  return predicateOfClaim(claim(mark({ kind, scope })));
}

function juralRelationPredicateSpecialization(predicate: PredicationPredicate): { readonly kind: JuralKind; readonly scope: string } {
  return predicate.mark.value as { readonly kind: JuralKind; readonly scope: string };
}

/** A jural relation read as its own predication cell — active holder subject, passive
 *  party object, `(kind, scope)` as the predicate. */
export function juralCell(relation: JuralRelation): Cell {
  return cell(
    token(mark(relation.active)),
    juralRelationPredicate(relation.kind, relation.scope),
    token(mark(relation.passive)),
  );
}

/** The correlative view of a jural relation: swap active/passive, rename the kind to its
 *  correlative, preserve standing. Involutive. Provably `converseCell` (the subject/object
 *  swap) composed with a predicate specialization (the kind flip) — see `officeReceipt()`,
 *  which checks `juralCell(correlate(r))` against that composition on a worked example. */
export function correlate(relation: JuralRelation): JuralRelation {
  return Object.freeze({
    kind: correlativeKind(relation.kind),
    active: relation.passive,
    passive: relation.active,
    scope: relation.scope,
    standing: relation.standing,
  });
}

/** A claim-session-shaped row: the (cell, charge) a `ClaimSessionObservation`'s own
 *  `claim` carries (`src/running/session.mts`). Named structurally rather than imported
 *  — any cell/charge-bearing row (a live observation, a witnessed EAVT attribute, a
 *  literal test fixture) satisfies it. */
export interface JuralClaimRow {
  readonly cell: string;
  readonly charge: ChargeValueName;
}

function isJuralKind(value: string): value is JuralKind {
  return (JURAL_KINDS as readonly string[]).includes(value);
}

/** Recognize one claim cell as jural material: the grammar is
 *  `jural:<kind>:<active>:<passive>:<scope>`, scope itself in `scopeOf` form
 *  (`level:id`). A cell outside this grammar — a different claim vocabulary sharing the
 *  same session — is not jural material and is skipped structurally. */
export function juralRelationOfClaimCell(cellText: string, standing: ChargeValueName): JuralRelation | undefined {
  const parts = cellText.split(":");
  const [prefix, kindText, active, passive, ...scopeParts] = parts;
  if (prefix !== "jural" || kindText === undefined || active === undefined || passive === undefined) return undefined;
  if (!isJuralKind(kindText) || active.length === 0 || passive.length === 0) return undefined;
  const [scopeLevel, ...scopeRest] = scopeParts;
  if (scopeLevel === undefined || scopeRest.length === 0 || !(WORK_LEVELS as readonly string[]).includes(scopeLevel)) return undefined;
  if (scopeRest.some((part) => part.length === 0)) return undefined;
  return Object.freeze({ kind: kindText, active, passive, scope: scopeParts.join(":"), standing });
}

/** The pure projection claim-session observation rows → jural relations: each row whose
 *  cell parses under the jural grammar becomes one `JuralRelation` carrying the row's
 *  charge as its standing; every other row is simply not jural material and drops out. */
export function juralRelationsOfClaimRows(rows: readonly JuralClaimRow[]): readonly JuralRelation[] {
  const relations: JuralRelation[] = [];
  for (const row of rows) {
    const relation = juralRelationOfClaimCell(row.cell, row.charge);
    if (relation !== undefined) relations.push(relation);
  }
  return Object.freeze(relations);
}

/** One entry of a deontic profile: the kind an office holds over a work item. */
export interface DeonticEntry {
  readonly kind: Extract<JuralKind, "power" | "duty" | "privilege" | "immunity">;
  readonly over: WorkItem;
  readonly party?: string;
}

/** A bearer-independent role with a deontic profile — a family of jural relations with
 *  the office itself in the active position, so they devolve onto whichever agent reaches
 *  dignitas. */
export interface Office {
  readonly kind: "predicating.office";
  readonly name: string;
  readonly profile: readonly JuralRelation[];
}

/** Constitute an office from its name and deontic profile, each entry asserted (`held`)
 *  as the office's structural, persistent normative content. */
export function office(name: string, profile: readonly DeonticEntry[]): Office {
  const relations = profile.map((entry) => Object.freeze({
    kind: entry.kind,
    active: name,
    passive: entry.party ?? `${name}:body-politic`,
    scope: scopeOf(entry.over.level, entry.over.id),
    standing: "held" as ChargeValueName,
  } satisfies JuralRelation));
  return Object.freeze({ kind: "predicating.office" as const, name, profile: Object.freeze(relations) });
}

/** The munus/honor/dignitas incumbency trinity — the joint state of the two required
 *  FOUR-valued predicates (recognition = honor, induction = munus). */
export type IncumbencyState = "vacant" | "munus" | "recognition" | "dignitas" | "failed" | "repair";

/** The incumbency state from recognition × induction: a `contested` on either is a repair
 *  condition (contradicted); an explicit `denied` on either fails the settlement;
 *  (held, held) is full dignitas. */
export function incumbencyState(recognition: ChargeValueName, induction: ChargeValueName): IncumbencyState {
  if (recognition === "contested" || induction === "contested") return "repair";
  if (recognition === "denied" || induction === "denied") return "failed";
  const recognized = recognition === "held";
  const inducted = induction === "held";
  if (recognized && inducted) return "dignitas";
  if (inducted) return "munus";
  if (recognized) return "recognition";
  return "vacant";
}

/** The result of investing a candidate into an office: the incumbency state and — only at
 *  dignitas — the office's profile devolved onto the incumbent (active-holder rewritten
 *  from the office to the agent). */
export interface Investiture {
  readonly office: string;
  readonly incumbent: string;
  readonly state: IncumbencyState;
  readonly devolved: readonly JuralRelation[];
}

/** Settle a candidate's incumbency of an office by the double settlement, devolving the
 *  office's deontic profile onto the incumbent at dignitas. */
export function invest(officeContract: Office, incumbent: string, recognition: ChargeValueName, induction: ChargeValueName): Investiture {
  const state = incumbencyState(recognition, induction);
  const devolved = state === "dignitas"
    ? officeContract.profile.map((relation) => Object.freeze({ ...relation, active: incumbent } satisfies JuralRelation))
    : [];
  return Object.freeze({ office: officeContract.name, incumbent, state, devolved: Object.freeze(devolved) });
}

/** Dissolve an incumbent's hold on an office — the office itself persists (dignitas non
 *  moritur), only the incumbency returns to vacant. */
export function relieve(officeContract: Office, incumbent: string): Investiture {
  return Object.freeze({ office: officeContract.name, incumbent, state: "vacant" as const, devolved: Object.freeze([]) });
}

/** Bind a work item to an agent as a duty (the agent now owes it). A caller
 *  writes this as one claim-session cell, `jural:duty:<agent>:<assigner>:<level>:<id>`. */
export function assign(to: string, item: WorkItem, by = "assigner"): JuralRelation {
  return Object.freeze({ kind: "duty", active: to, passive: by, scope: scopeOf(item.level, item.id), standing: "held" as ChargeValueName });
}

/** Bind a POWER over a work item to an agent (the capacity to alter positions
 *  regarding it). */
export function grantPower(to: string, item: WorkItem, over = "body-politic"): JuralRelation {
  return Object.freeze({ kind: "power", active: to, passive: over, scope: scopeOf(item.level, item.id), standing: "held" as ChargeValueName });
}

/** Bind an IMMUNITY to an agent regarding a work item (a position another agent
 *  cannot alter on it). */
export function immunize(holder: string, item: WorkItem, against = "body-politic"): JuralRelation {
  return Object.freeze({ kind: "immunity", active: holder, passive: against, scope: scopeOf(item.level, item.id), standing: "held" as ChargeValueName });
}

/** ACCOUNTABILITY — a total, delegation-invariant assignment of every outcome within a
 *  scope to a single answerable bearer. */
export interface Accountability {
  readonly kind: "predicating.accountability";
  readonly bearer: string;
  readonly scope: string;
}

/** Constitute the accountability of a bearer over a scope (a work item or a bare
 *  scope string). */
export function accountability(bearer: string, scope: WorkItem | string): Accountability {
  return Object.freeze({
    kind: "predicating.accountability" as const,
    bearer,
    scope: typeof scope === "string" ? scope : scopeOf(scope.level, scope.id),
  });
}

/** The party accountable for any outcome in scope: always the bearer, never a delegate. */
export function answerableParty(account: Accountability): string {
  return account.bearer;
}

/** Distribute authority (a power) to a sub-agent — delegation never relieves the bearer,
 *  so an `Accountability` is unchanged by this op. */
export function delegate(power: JuralRelation, to: string): JuralRelation {
  return Object.freeze({ ...power, active: to } satisfies JuralRelation);
}

/** One claim-session cell recognizing or inducting a candidate into an office —
 *  the SAME two FOUR-valued predicates `invest`'s double settlement composes
 *  (recognition = honor, induction = munus), now sourced from admitted claim
 *  material rather than caller-supplied charges. Grammar:
 *  `office:<name>:recognition:<incumbent>` / `office:<name>:induction:<incumbent>`. */
export interface OfficeIncumbencyClaim {
  readonly office: string;
  readonly incumbent: string;
  readonly predicate: "recognition" | "induction";
  readonly standing: ChargeValueName;
}

function officeIncumbencyClaimOfCell(cellText: string, standing: ChargeValueName): OfficeIncumbencyClaim | undefined {
  const parts = cellText.split(":");
  if (parts.length !== 4) return undefined;
  const [prefix, officeName, predicateText, incumbent] = parts;
  if (prefix !== "office" || officeName === undefined || incumbent === undefined) return undefined;
  if (predicateText !== "recognition" && predicateText !== "induction") return undefined;
  if (officeName.length === 0 || incumbent.length === 0) return undefined;
  return Object.freeze({ office: officeName, incumbent, predicate: predicateText, standing });
}

/** The offices `agent` holds at dignitas, read off admitted incumbency claims: each
 *  office's recognition and induction cells fold by the knowledge-order join, then settle
 *  through the SAME `incumbencyState` the caller-driven `invest` uses — an office only
 *  counts here once both predicates are asserted (`held`), never on a caller's say-so. */
export function officesHeldAtDignitas(rows: readonly JuralClaimRow[], agent: string): readonly string[] {
  const recognition = new Map<string, ChargeValue>();
  const induction = new Map<string, ChargeValue>();
  for (const row of rows) {
    const claimEntry = officeIncumbencyClaimOfCell(row.cell, row.charge);
    if (claimEntry === undefined || claimEntry.incumbent !== agent) continue;
    const target = claimEntry.predicate === "recognition" ? recognition : induction;
    const prior = target.get(claimEntry.office);
    target.set(claimEntry.office, prior === undefined ? chargeValue(claimEntry.standing) : joinKnowledgeValue(prior, chargeValue(claimEntry.standing)));
  }
  const offices = new Set([...recognition.keys(), ...induction.keys()]);
  const held: string[] = [];
  for (const officeName of offices) {
    const recognized = recognition.get(officeName);
    const inducted = induction.get(officeName);
    const state = incumbencyState(
      recognized === undefined ? "unknown" : chargeValueName(recognized),
      inducted === undefined ? "unknown" : chargeValueName(inducted),
    );
    if (state === "dignitas") held.push(officeName);
  }
  return Object.freeze(held);
}

/** One of an agent's standing duties: the `duty` relation itself, and whether it reached
 *  the agent directly (`assign`'s own shape) or DEVOLVED from an office the agent holds at
 *  dignitas (`invest`'s devolution — the office's own duty entries, active-holder rewritten
 *  to the incumbent). */
export interface StandingDuty {
  readonly relation: JuralRelation;
  readonly via: "agent" | "office";
  readonly office?: string;
}

/** The standing duties of `agent`, from a feed's admitted claim-session rows: every
 *  `duty` relation whose active party is `agent` directly, plus every `duty` relation
 *  whose active party is an office `agent` holds at dignitas, devolved onto `agent` by
 *  rewriting the active holder. */
export function dutiesOfAgent(rows: readonly JuralClaimRow[], agent: string): readonly StandingDuty[] {
  const relations = juralRelationsOfClaimRows(rows);
  const offices = new Set(officesHeldAtDignitas(rows, agent));
  const duties: StandingDuty[] = [];
  for (const relation of relations) {
    if (relation.kind !== "duty") continue;
    if (relation.active === agent) {
      duties.push(Object.freeze({ relation, via: "agent" as const }));
    } else if (offices.has(relation.active)) {
      duties.push(Object.freeze({
        relation: Object.freeze({ ...relation, active: agent } satisfies JuralRelation),
        via: "office" as const,
        office: relation.active,
      }));
    }
  }
  return Object.freeze(duties);
}

export type GovernanceDiscipline = "kyriarchist" | "swarm" | "consensus" | "ungoverned";

const governancePredicate = predicateOfClaim(claim(mark("predicating.office.governance-nerve")));
const powerEdgePredicate = predicateOfClaim(claim(mark("predicating.office.power-edge")));

function cellKey(relation: JuralRelation): string {
  return `${relation.kind}\n${relation.active}\n${relation.passive}\n${relation.scope}`;
}

/** Whether the power-relation graph carries a cycle — authority RETURNS, the rotational
 *  reading. Read off the Laplacian Hodge decomposition (`core/closure/analysis/laplacian.mts`):
 *  the power edges become one `Cell` per (holder, party) pair, and the graph's harmonic
 *  dimension (`β₁ = E − V + C`) names the independent cycles — zero iff the power graph is
 *  a forest. A rank, not a boolean; `rotational` is `harmonic > 0`. */
function rotationalRank(edges: ReadonlyMap<string, readonly string[]>): number {
  const cells: Cell[] = [];
  for (const [holder, parties] of edges) {
    for (const party of parties) {
      cells.push(cell(token(mark(`observer:${holder}`)), powerEdgePredicate, token(mark(`observer:${party}`))));
    }
  }
  if (cells.length === 0) return 0;
  return hodgeDecomposition(relationGraphOfCells(cells)).harmonic.members.length;
}

/** The governance reading over a set of jural relations: the power-relation graph's
 *  concentration/accountability/rotation shape, a coordination obstruction (H¹ of each
 *  observer's pooled active-side standing), and the discipline that graph realizes.
 *  Frame-neutral: the classification falls out of the graph shape, not a privileged frame.
 *  The kyriarchist/swarm/consensus discipline is one INTERPRETATION of the underlying
 *  attribution/binding/becoming substrate — see the corpus's non-Hohfeldian-governance-
 *  traditions research: consensus-closure, rotational/ayllu authority, and kinship-gated
 *  eligibility are equally lawful readings of the same three primitives. */
export type Governance = FromSchema<typeof governanceSchema> & {
  readonly relations: readonly JuralRelation[];
  readonly correlatives: readonly JuralRelation[];
  readonly discipline: GovernanceDiscipline;
  readonly attribution: ChargeValueName;
  readonly binding: ChargeValueName;
  readonly becoming: ChargeValueName;
  readonly operativity: ChargeValueName;
};

function observerNerve(observerOrder: readonly string[], relations: readonly JuralRelation[]): readonly Cell[] {
  return Object.freeze(observerOrder.map((name) => {
    const standing = relations
      .filter((relation) => relation.active === name)
      .reduce<ChargeValue>((accumulated, relation) => joinKnowledgeValue(accumulated, chargeValue(relation.standing)), chargeValue("unknown"));
    return cell(
      token(mark(`observer:${name}`)),
      governancePredicate,
      token(mark(`stance:${chargeValueName(standing)}`)),
    );
  }));
}

/** Classify a set of jural relations into their governance discipline. Relations sharing
 *  a (kind, active, passive, scope) cell are pooled by the knowledge-order join before
 *  classification. */
export function governance(relations: readonly JuralRelation[]): Governance {
  const pooled = new Map<string, JuralRelation>();
  const observers = new Set<string>();
  for (const relation of relations) {
    observers.add(relation.active);
    observers.add(relation.passive);
    const key = cellKey(relation);
    const prior = pooled.get(key);
    pooled.set(key, prior === undefined
      ? relation
      : Object.freeze({ ...relation, standing: chargeValueName(joinKnowledgeValue(chargeValue(prior.standing), chargeValue(relation.standing))) }));
  }

  const settled = [...pooled.values()].sort((left, right) => cellKey(left).localeCompare(cellKey(right)));
  const correlatives = Object.freeze(settled.map(correlate));
  const contested = settled.filter((relation) => relation.standing === "contested").length;

  const heldPowers = settled.filter((relation) => relation.kind === "power" && relation.standing !== "denied" && relation.standing !== "unknown");
  const powerEdges = new Map<string, string[]>();
  const dominionOf = new Map<string, Set<string>>();
  for (const power of heldPowers) {
    powerEdges.set(power.active, [...(powerEdges.get(power.active) ?? []), power.passive]);
    const reach = dominionOf.get(power.active) ?? new Set<string>();
    reach.add(power.passive);
    dominionOf.set(power.active, reach);
  }
  const dutyHolders = new Set<string>(settled.filter((relation) => relation.kind === "duty" && relation.standing !== "denied").map((relation) => relation.active));
  const accountabilityGap = heldPowers.filter((power) => !dutyHolders.has(power.active)).length;

  let dominator = "";
  let dominion = 0;
  for (const [holder, reach] of dominionOf) {
    if (reach.size > dominion) {
      dominion = reach.size;
      dominator = holder;
    }
  }
  const observerCount = observers.size;
  const concentration = observerCount > 1 ? dominion / (observerCount - 1) : 0;
  const rotational = rotationalRank(powerEdges) > 0;
  const dominatorAccountable = dominator !== "" && dutyHolders.has(dominator);

  let discipline: GovernanceDiscipline;
  if (settled.length === 0) discipline = "ungoverned";
  else if (heldPowers.length === 0) discipline = "consensus";
  else if (observerCount >= 2 && dominion > (observerCount - 1) / 2 && !dominatorAccountable) discipline = "kyriarchist";
  else discipline = "swarm";

  const observerOrder = [...observers];
  const obstruction = observerOrder.length === 0
    ? 0
    : cohomologyOfCells(observerNerve(observerOrder, settled)).firstCohomology.rank.members.length;

  const attribution: ChargeValueName = observerCount >= 2 ? "held" : "unknown";
  const binding: ChargeValueName = chargeValueName(settled.reduce<ChargeValue>(
    (accumulated, relation) => joinKnowledgeValue(accumulated, chargeValue(relation.standing)),
    chargeValue("unknown"),
  ));
  const becoming: ChargeValueName = settled.length > 0 && contested === 0 && obstruction === 0 ? "held" : "unknown";
  const operativity: ChargeValueName = chargeValueName(meetKnowledgeValue(
    meetKnowledgeValue(chargeValue(attribution), chargeValue(binding)),
    chargeValue(becoming),
  ));

  return Object.freeze({
    kind: "predicating.office.governance" as const,
    observers: observerCount,
    relations: Object.freeze(settled),
    correlatives,
    powers: heldPowers.length,
    dominion,
    concentration,
    accountabilityGap,
    rotational,
    obstruction,
    contested,
    attribution,
    binding,
    becoming,
    operativity,
    discipline,
  });
}

export interface OfficeReceipt {
  readonly kind: "predicating.office.receipt:witness";
  readonly investiture: Investiture;
  readonly assignment: JuralRelation;
  readonly correlative: JuralRelation;
  readonly accountability: Accountability;
  readonly delegated: JuralRelation;
  readonly rotationalGovernance: Governance;
  readonly kyriarchistGovernance: Governance;
  readonly consensusGovernance: Governance;
}

/** Exercise the office/governance apparatus end to end on one worked example: a
 *  `campaign` work item governed by a `driver` office, assigned to an incumbent,
 *  then read three ways — as a rotational (swarm) power graph, a concentrated
 *  (kyriarchist) one, and a powerless (consensus) one — proving the discipline
 *  classification actually discriminates the three shapes it names, on live data. */
export function officeReceipt(): OfficeReceipt {
  const campaign: WorkItem = { level: "campaign", id: "2026-h2-agentic-realization" };
  const driver = office("driver", [{ kind: "power", over: campaign }, { kind: "duty", over: campaign }]);
  const investitureResult = invest(driver, "agent-a", "held", "held");
  const assignment = assign("agent-a", campaign, "driver");
  const correlative = correlate(assignment);

  const correlateCell = juralCell(correlative);
  const derivedCorrelateCell = specializePredicateCell(
    (predicate) => {
      const { kind, scope } = juralRelationPredicateSpecialization(predicate);
      return juralRelationPredicate(correlativeKind(kind), scope);
    },
    converseCell(juralCell(assignment)),
  );
  if (!cellCoincides(correlateCell, derivedCorrelateCell)) {
    throw new TypeError("officeReceipt: correlate must equal predication's converseCell composed with a kind-specialization");
  }

  const account = accountability("agent-a", campaign);
  const delegated = delegate(grantPower("agent-a", campaign), "agent-b");

  const rotationalGovernance = governance([
    Object.freeze({ kind: "power", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "held" as ChargeValueName }),
    Object.freeze({ kind: "power", active: "agent-b", passive: "agent-a", scope: scopeOf(campaign.level, campaign.id), standing: "held" as ChargeValueName }),
    Object.freeze({ kind: "duty", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "held" as ChargeValueName }),
    Object.freeze({ kind: "duty", active: "agent-b", passive: "agent-a", scope: scopeOf(campaign.level, campaign.id), standing: "held" as ChargeValueName }),
  ]);
  if (rotationalGovernance.discipline !== "swarm") {
    throw new TypeError(`officeReceipt: expected swarm discipline on a rotational power graph, got ${rotationalGovernance.discipline}`);
  }
  if (!rotationalGovernance.rotational) {
    throw new TypeError("officeReceipt: the mutual power edges form a real 2-cycle — the Laplacian's harmonic dimension must read nonzero");
  }
  if (rotationalGovernance.operativity !== "held") {
    throw new TypeError(`officeReceipt: uncontested mutual duties over one scope must settle operative, got ${rotationalGovernance.operativity}`);
  }

  const kyriarchistGovernance = governance([
    Object.freeze({ kind: "power", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "held" as ChargeValueName }),
    Object.freeze({ kind: "power", active: "agent-a", passive: "agent-c", scope: scopeOf(campaign.level, campaign.id), standing: "held" as ChargeValueName }),
  ]);
  if (kyriarchistGovernance.discipline !== "kyriarchist") {
    throw new TypeError(`officeReceipt: expected kyriarchist discipline on an unaccountable dominator, got ${kyriarchistGovernance.discipline}`);
  }
  if (kyriarchistGovernance.rotational) {
    throw new TypeError("officeReceipt: a one-directional dominance fan (a over b, a over c) has no cycle — the Laplacian reading must agree");
  }

  const consensusGovernance = governance([
    Object.freeze({ kind: "claim", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "held" as ChargeValueName }),
  ]);
  if (consensusGovernance.discipline !== "consensus") {
    throw new TypeError(`officeReceipt: expected consensus discipline with no held powers, got ${consensusGovernance.discipline}`);
  }

  return Object.freeze({
    kind: "predicating.office.receipt:witness" as const,
    investiture: investitureResult,
    assignment,
    correlative,
    accountability: account,
    delegated,
    rotationalGovernance,
    kyriarchistGovernance,
    consensusGovernance,
  });
}
