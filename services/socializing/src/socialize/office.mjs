/**
 * office — socializing's OPERATIONAL governance layer: the office (a bearer-independent
 * role with a deontic profile), incumbency as a DOUBLE SETTLEMENT, and the operational
 * Hohfeldian positions (assignment, waiver, revocation, ratification, relief) that move
 * jural relations over time — the apparatus for organizing real agentic labor.
 *
 * This is the operational extension of the eightfold (content/_archive .../governance/
 * .../hohfeldian.md): "what happens to legal positions as they are exercised, transferred,
 * defended, lost, and recovered over time." Where ./govern.mts READS a society's jural
 * relations (the discipline + the governance-act thesis), this module CONSTRUCTS and
 * TRANSFORMS them — the verbs an agent ecosystem actually runs.
 *
 * OFFICE (content/_archive .../office/_archive/office-as-double-settlement.md). An office O
 * is a bearer-independent role carrying a DEONTIC PROFILE D_O: A_O → {power, duty, privilege,
 * immunity} — a family of jural relations with the OFFICE (not any incumbent) in the active
 * position, scoped over an action-domain A_O of work-items. Incumbency is the joint affirming
 * settlement of TWO required predicates on a candidate ι:
 *   - RECOGNITION (the honor axis, backward, history-sensitive): ι is acknowledged as the
 *     legitimate occupant.
 *   - INDUCTION (the munus axis, forward): ι has taken on the office's forward obligation.
 * Their joint state is the Roman munus/honor/dignitas trinity — vacant (⊥,⊥), munus-only
 * (⊥,t), recognition-only (t,⊥), DIGNITAS (t,t = full incumbency), failed (f), repair (⊤).
 * At dignitas the office's profile DEVOLVES onto the incumbent: the active-holder is rewritten
 * from the office to ι (the capability-propagation rule — the powers transfer). The office
 * persists across incumbents (dignitas non moritur): the profile is structural, not destroyed
 * by a vacancy.
 *
 * WORK. The scope-action of a jural relation is a WORK-ITEM at some level of the work-carrier
 * spine (endeavor > campaign > project > plan > task > work-item — the managing-operations
 * work-vocabulary, referenced not re-authored). ASSIGNMENT binds a work-item to an agent as a
 * DUTY jural relation (the agent now OWES it — the "owned-by" cell the work-item migration
 * lands; content/.../migrating-work-item-instances-to-lawful-positions.md). So organizing
 * agentic labor is: induct an agent into an office (double settlement → dignitas → devolved
 * powers), then assign it work-items (duties); the agent's IMMUNITIES bound what may be imposed
 * on it; ./govern.mts then reads the society's operativity, accountability, and discipline.
 *
 * Built on ./govern.mts's JuralRelation; consumes relating's FOUR reading values; re-authors none.
 */

import {
  correlate,
  correlativeKind,
  JURAL_KINDS,
  readJuralRelations,
} from "./jural.mjs";
import { cell, sameCell } from "@red-cup-engineering/signcell/cell";
import { converseCell } from "@red-cup-engineering/signcell/predication";
import { specializePredicateCell } from "@red-cup-engineering/signcell/predication";
import { knowledgeJoinReading, readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** The work-carrier spine — the levels a jural relation's scope-action (a WORK-ITEM) sits at.
 *  endeavor generates campaign generates project generates plan generates task generates the
 *  work-item leaf (the managing-operations work-vocabulary order; here it types the SCOPE of a
 *  duty/assignment, so an agent's obligation is addressed at the right altitude of the work). */
export const WORK_LEVELS = Object.freeze([
  "endeavor",
  "campaign",
  "project",
  "plan",
  "task",
  "work-item",
]);

/** A unit of work an office governs and an agent is assigned — the scope-action of a jural
 *  relation, identified at a level of the work-carrier spine and (optionally) under its parent. */

  

  

/** The scope-action string a jural relation carries for a work-item: `level:id` (parent dropped —
 *  the enclosing carrier is the work hierarchy's concern, not the binding's). */
export function workScope(item) {
  return `${item.level}:${item.id}`;
}

/**
 * An OFFICE — a bearer-independent role with a deontic profile. The profile is a family of
 * jural relations with the office itself in the active position (so they devolve onto whichever
 * agent reaches dignitas), each scoped over a work-item the office governs.
 */

  

/** One entry of a deontic profile: the kind the office holds over a work-item. */

/**
 * Constitute an office from its name and deontic profile. Each profile entry becomes a jural
 * relation with the office as the active holder, asserted (potential) — the office's structural,
 * persistent normative content.
 */
export function office(name, profile) {
  const relations = profile.map((entry) => Object.freeze({
    kind: entry.kind,
    active: name,
    passive: entry.party ?? `${name}:body-politic`,
    scope: workScope(entry.over),
    standing: "potential",
  }));
  return Object.freeze({
    kind: "socializing.office",
    name,
    profile: Object.freeze(relations),
  });
}

/** The munus/honor/dignitas incumbency trinity — the joint state of the two required predicates. */

/** The incumbency state from the two FOUR-valued required predicates (office-as-double-settlement.md):
 *  recognition (honor) × induction (munus). A ⊤ on either is a repair condition; an explicit f
 *  on either fails the settlement; (t,t) is full dignitas. */
export function incumbencyState(recognition, induction) {
  if (recognition === "stable" || induction === "stable") return "repair";
  if (recognition === "active" || induction === "active") return "failed";
  const recognized = recognition === "potential";
  const inducted = induction === "potential";
  if (recognized && inducted) return "dignitas";
  if (inducted) return "munus";
  if (recognized) return "recognition";
  return "vacant";
}

/** The result of investing a candidate into an office: the incumbency state and — only at
 *  dignitas — the office's profile DEVOLVED onto the incumbent (active-holder rewritten from the
 *  office to the agent; the capability-propagation rule). Below dignitas nothing devolves. */

  

/**
 * invest — settle a candidate's incumbency of an office by the double settlement, devolving the
 * office's deontic profile onto the incumbent at dignitas (powers transfer; dignitas non moritur
 * leaves the office's own profile untouched). The two required predicates are passed as their
 * settled FOUR values (recognition = honor, induction = munus).
 */
export function invest(
  office,
  incumbent,
  recognition,
  induction,
) {
  const state = incumbencyState(recognition, induction);
  const devolved = state === "dignitas"
    ? office.profile.map((relation) => Object.freeze({ ...relation, active: incumbent }))
    : [];
  return Object.freeze({
    office: office.name,
    incumbent,
    state,
    devolved: Object.freeze(devolved),
  });
}

/** relieve — dissolve an incumbent's hold on an office (the inverse of investiture): the
 *  incumbency returns to vacant and nothing is devolved. The office itself persists. */
export function relieve(office, incumbent) {
  return Object.freeze({
    office: office.name,
    incumbent,
    state: "vacant",
    devolved: Object.freeze([]),
  });
}

/**
 * assign — bind a work-item to an agent as a DUTY (the agent now OWES it: the "owned-by"
 * relation). The correlative is the office's/assigner's CLAIM that the work be done. This is
 * the operational position that turns a work-item into agentic labor an agent is answerable for.
 */
export function assign(to, item, by = "assigner") {
  return Object.freeze({
    kind: "duty",
    active: to,
    passive: by,
    scope: workScope(item),
    standing: "potential",
  });
}

/** grant — bind a POWER over a work-item to an agent (the capacity to alter positions regarding
 *  it); the correlative is the governed party's liability. */
export function grant(to, item, over = "body-politic") {
  return Object.freeze({
    kind: "power",
    active: to,
    passive: over,
    scope: workScope(item),
    standing: "potential",
  });
}

/** immunize — bind an IMMUNITY to an agent regarding a work-item (a position another agent
 *  CANNOT alter on it); the correlative is the other party's disability. */
export function immunize(holder, item, against = "body-politic") {
  return Object.freeze({
    kind: "immunity",
    active: holder,
    passive: against,
    scope: workScope(item),
    standing: "potential",
  });
}

/** The correlative (passive-side) view of a borne relation — the party the relation binds and
 *  how (a duty's claim-holder, a power's liable party, an immunity's disabled party). */
export function borneBy(relation) {
  return correlate(relation);
}

/** waive — the holder VOLUNTARILY relinquishes a position: its standing moves to `active` (denied,
 *  f). A waiver is by the position's own holder. */
export function waive(relation) {
  return Object.freeze({ ...relation, standing: "active" });
}

/** revoke — a granted authority is UNILATERALLY retracted by the grantor: the standing moves to
 *  `active` (denied, f). Distinct from waiver in provenance (grantor, not holder); same standing move. */
export function revoke(relation) {
  return Object.freeze({ ...relation, standing: "active" });
}

/** ratify — retroactively VALIDATE a position that was unauthorized (⊥) or contested (⊤): its
 *  standing moves to `potential` (asserted, t). The retroactive-validation operational position. */
export function ratify(relation) {
  return Object.freeze({ ...relation, standing: "potential" });
}

// ── Rotational authority (content/_archive .../rotational-authority.md — the Andean ayllu) ──

/** A ROTATION of an office's authority through an eligible roster: authority CYCLES rather than
 *  accumulating in any one agent (the ayllu/minka pattern; Aboriginal age-grade; clan-mother
 *  chief-rotation). The roster is the eligible population; `current` indexes the incumbent. */

/** rotate — advance a rotation to the NEXT eligible incumbent (the Markov discipline: next in the
 *  roster, cycling). The current incumbent is relieved and the next installed in one step; NO agent
 *  accumulates the office's authority across periods — authority-experience distributes across the
 *  roster. Returns the advanced rotation and the relieved/installed incumbents. */
export function rotate(rotation) {
  const size = rotation.roster.length;
  if (size === 0) throw new RangeError("rotate: empty roster");
  const next = (rotation.current + 1) % size;
  return Object.freeze({
    rotation: Object.freeze({ ...rotation, current: next }),
    relieved: rotation.roster[((rotation.current % size) + size) % size],
    installed: rotation.roster[next],
  });
}

// ── Accountability + delegation (content/_archive .../accountability.md) ──

/** ACCOUNTABILITY — a triple (bearer, scope, A): a TOTAL, delegation-INVARIANT assignment of every
 *  outcome within a scope to a single answerable bearer. Backward-looking and non-dischargeable: the
 *  bearer answers for scope-outcomes regardless of who caused them or who authority was delegated to. */

/** Constitute the accountability of a bearer over a scope (a work-item or a bare scope string). */
export function accountability(bearer, scope) {
  return Object.freeze({
    kind: "socializing.accountability",
    bearer,
    scope: typeof scope === "string" ? scope : workScope(scope),
  });
}

/** answerableParty — the party accountable for any outcome in scope: ALWAYS the bearer (totality),
 *  NEVER a delegate (non-transferability by delegation). Invariant under `delegate`. */
export function answerableParty(account) {
  return account.bearer;
}

/** delegate — distribute AUTHORITY (a power) to a sub-agent: a new power relation with active = the
 *  delegate. Delegation distributes authority; it does NOT move accountability — an `Accountability`
 *  is unchanged by this op (the U.S. Navy Regs 0802 invariant: delegation never relieves the bearer). */
export function delegate(power, to) {
  return Object.freeze({ ...power, active: to });
}

// ── Reciprocity (ayni) + restoration (Ubuntu) ──

/** reciprocate — ayni reciprocal exchange: labor PROVIDED creates a correlative reciprocal-DEBT — the
 *  receiver now owes reciprocal labor to the provider. A duty relation active = receiver (the debtor),
 *  passive = provider (the creditor). Accumulates as the populace's reciprocal-debt graph. */
export function reciprocate(provider, receiver, labor) {
  return Object.freeze({
    kind: "duty",
    active: receiver,
    passive: provider,
    scope: typeof labor === "string" ? labor : workScope(labor),
    standing: "potential",
  });
}

/** A RESTORATIVE response to harm (Ubuntu): reintegration + reparation, NOT punishment. The
 *  substrate's response to a violation is a reparation duty and a reopened relation, not a punitive
 *  cell — punishment-cells, if any, are downstream and conditional. */

  

/** restore — the restorative-accountability response: a reparation duty (offender owes the harmed
 *  party) aimed at reintegration, not a punitive position. */
export function restore(offender, harmed, harm) {
  return Object.freeze({
    kind: "socializing.restoration",
    reparation: Object.freeze({
      kind: "duty",
      active: offender,
      passive: harmed,
      scope: `repair:${typeof harm === "string" ? harm : workScope(harm)}`,
      standing: "potential",
    }),
    reintegrative: true,
  });
}

// ── Separation of duty (RBAC static SoD) ──

/** An assignment of an agent to a role, for separation-of-duty checking. */

/** A separation-of-duty conflict: an agent co-assigned a forbidden role pair. */

/** separationOfDuty — static separation of duty (RBAC): certain role pairs MUST NOT be co-assigned to
 *  one agent (conflict of interest). Returns the violating (agent, forbidden-pair) conflicts — empty
 *  iff the assignment respects every constraint. The forbidden combinations are a structural axiom on
 *  the role-assignment relation. */
export function separationOfDuty(
  assignments,
  forbidden,
) {
  const byAgent = new Map();
  for (const { agent, role } of assignments) {
    const roles = byAgent.get(agent) ?? new Set();
    roles.add(role);
    byAgent.set(agent, roles);
  }
  const conflicts = [];
  for (const [agent, roles] of byAgent) {
    for (const [a, b] of forbidden) {
      if (roles.has(a) && roles.has(b)) conflicts.push(Object.freeze({ agent, roles: Object.freeze([a, b]) }));
    }
  }
  return Object.freeze(conflicts);
}

// ── Status-function declaration + refusal (Searle; Black-radical abolition) ──

/** A STATUS-FUNCTION DECLARATION — the constitutive "X counts as Y in context C" performed by a party
 *  A (content/_archive .../status-function-declaration.md, Searle): the generative mechanism of
 *  institutional fact. Constitutive (creates, not reports), standing-required, context-relative. */

  

  

  

  

  

/** declare — perform a status-function declaration. With standing it CONSTITUTES the institutional
 *  fact (the target holds, as a privilege in the context, the status `counts-as:<Y>`); without
 *  standing it misfires (constituted = null). */
export function declare(target, status, context, by, hasStanding) {
  return Object.freeze({
    kind: "socializing.declaration",
    target,
    status,
    context,
    by,
    felicitous: hasStanding,
    constituted: hasStanding
      ? Object.freeze({
          kind: "privilege",
          active: target,
          passive: context,
          scope: `counts-as:${status}`,
          standing: "potential",
        })
      : null,
  });
}

/** refuse — the Black-radical REFUSAL / abolition capability: a community blocks an inherited
 *  declaration from BINDING its members — a structural claim of NON-APPLICABILITY ("this institution's
 *  rules do not fire on our cells"). The refused status's standing is denied (active, f) for the
 *  refuser: the declaration does not bind them. Not a negation of governance — an alternative one. */
export function refuse(declaration, by) {
  return Object.freeze({
    kind: "privilege",
    active: by,
    passive: declaration.context,
    scope: `refuses:${declaration.status}`,
    standing: "active",
  });
}

// ── Claim grammars: work scopes, jural relations and office incumbency as claim cells ──

function isWorkLevel(value) {
  return (WORK_LEVELS).includes(value);
}

/** Recognize the one `level:id` work-scope grammar. */
export function workItemOfCell(cell) {
  const separator = cell.indexOf(":");
  if (separator <= 0) return null;
  const level = cell.slice(0, separator);
  const id = cell.slice(separator + 1);
  if (id.length === 0 || !isWorkLevel(level)) return null;
  return Object.freeze({ level, id });
}

/** Construct the one work-address grammar: `level:id`. Enclosure remains claim
 *  evidence rather than an encoded parent segment. */
export function scopeOf(level, id) {
  if (id.length === 0) throw new TypeError("scopeOf: id must be nonempty");
  return `${level}:${id}`;
}

/** The spine index of a level (endeavor = 0 … work-item = 5), for altitude comparisons. */
export function workLevelIndex(level) {
  return WORK_LEVELS.indexOf(level);
}

/** Whether `child` sits strictly below `parent` on the spine (a task is below a project). */
export function workLevelBelow(child, parent) {
  return workLevelIndex(child) > workLevelIndex(parent);
}

function juralRelationPredicate(kind, scope) {
  return { kind, scope };
}

function juralRelationPredicateSpecialization(predicate) {
  return predicate.mark.value;
}

/** A jural relation read as its own predication cell — active holder subject, passive
 *  party object, `(kind, scope)` as the predicate. */
export function juralCell(relation) {
  return cell(
    relation.active,
    juralRelationPredicate(relation.kind, relation.scope),
    relation.passive,
  );
}

function isJuralKind(value) {
  return (JURAL_KINDS).includes(value);
}

function identitySegment(value, caller) {
  if (value.length === 0) throw new TypeError(`${caller}: identity must be nonempty`);
  return encodeURIComponent(value);
}

function identityOfSegment(value) {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.length > 0 && identitySegment(decoded, "identityOfSegment") === value ? decoded : undefined;
  } catch {
    return undefined;
  }
}

/** Construct the one escaping-safe jural claim grammar. Identity positions are
 * percent-encoded URI components; simple identifiers therefore retain their old
 * readable spelling while URI-like identities round-trip without ambiguity. */
export function juralRelationClaimCell(relation) {
  if (workItemOfCell(relation.scope) == null) throw new TypeError(`juralRelationClaimCell: invalid work scope ${relation.scope}`);
  return `jural:${relation.kind}:${identitySegment(relation.active, "juralRelationClaimCell")}:${identitySegment(relation.passive, "juralRelationClaimCell")}:${relation.scope}`;
}

/** Recognize one claim cell as jural material: the grammar is
 *  `jural:<kind>:<encoded-active>:<encoded-passive>:<scope>`, scope itself in `scopeOf` form
 *  (`level:id`). A cell outside this grammar — a different claim vocabulary sharing the
 *  same session — is not jural material and is skipped structurally.
 *
 *  Claim-session standings arrive in the extremal reading (held, denied, contested,
 *  unknown) and are stored as phase names. */
export function juralRelationOfClaimCell(cellText, standing) {
  const parts = cellText.split(":");
  const [prefix, kindText, activeSegment, passiveSegment, ...scopeParts] = parts;
  if (prefix !== "jural" || kindText === undefined || activeSegment === undefined || passiveSegment === undefined) return undefined;
  const active = identityOfSegment(activeSegment);
  const passive = identityOfSegment(passiveSegment);
  if (!isJuralKind(kindText) || active === undefined || passive === undefined) return undefined;
  const [scopeLevel, ...scopeRest] = scopeParts;
  if (scopeLevel === undefined || scopeRest.length === 0 || !(WORK_LEVELS).includes(scopeLevel)) return undefined;
  if (scopeRest.some((part) => part.length === 0)) return undefined;
  return Object.freeze({ kind: kindText, active, passive, scope: scopeParts.join(":"), standing: (readingAs("knowledge", standing)) });
}

/** The pure projection claim-session observation rows → jural relations: each row whose
 *  cell parses under the jural grammar becomes one `JuralRelation` carrying the row's
 *  reading as its standing; every other row is simply not jural material and drops out. */
export function juralRelationsOfClaimRows(rows) {
  const relations = [];
  for (const row of rows) {
    const relation = juralRelationOfClaimCell(row.cell, row.reading);
    if (relation !== undefined) relations.push(relation);
  }
  return Object.freeze(relations);
}

/** One claim-session cell recognizing or inducting a candidate into an office —
 *  the SAME two FOUR-valued predicates `invest`'s double settlement composes
 *  (recognition = honor, induction = munus), now sourced from admitted claim
 *  material rather than caller-supplied readings. Grammar:
 *  `office:<encoded-name>:recognition:<encoded-incumbent>` /
 *  `office:<encoded-name>:induction:<encoded-incumbent>`. */

export function officeIncumbencyClaimCell(
  officeName,
  predicate,
  incumbent,
) {
  return `office:${identitySegment(officeName, "officeIncumbencyClaimCell")}:${predicate}:${identitySegment(incumbent, "officeIncumbencyClaimCell")}`;
}

/** `standing` arrives in the extremal reading, as in `juralRelationOfClaimCell`. */
export function officeIncumbencyClaimOfCell(cellText, standing) {
  const parts = cellText.split(":");
  if (parts.length !== 4) return undefined;
  const [prefix, officeSegment, predicateText, incumbentSegment] = parts;
  if (prefix !== "office" || officeSegment === undefined || incumbentSegment === undefined) return undefined;
  if (predicateText !== "recognition" && predicateText !== "induction") return undefined;
  const officeName = identityOfSegment(officeSegment);
  const incumbent = identityOfSegment(incumbentSegment);
  if (officeName === undefined || incumbent === undefined) return undefined;
  return Object.freeze({ office: officeName, incumbent, predicate: predicateText, standing: (readingAs("knowledge", standing)) });
}

/** The offices `agent` holds at dignitas, read off admitted incumbency claims: each
 *  office's recognition and induction cells fold by the knowledge-order join, then settle
 *  through the SAME `incumbencyState` the caller-driven `invest` uses — an office only
 *  counts here once both predicates are asserted (`potential`), never on a caller's say-so. */
export function officesHeldAtDignitas(rows, agent) {
  const recognition = new Map();
  const induction = new Map();
  for (const row of rows) {
    const claimEntry = officeIncumbencyClaimOfCell(row.cell, row.reading);
    if (claimEntry === undefined || claimEntry.incumbent !== agent) continue;
    const target = claimEntry.predicate === "recognition" ? recognition : induction;
    const prior = target.get(claimEntry.office);
    target.set(claimEntry.office, prior === undefined ? (claimEntry.standing) : knowledgeJoinReading(prior, (claimEntry.standing)));
  }
  const offices = new Set([...recognition.keys(), ...induction.keys()]);
  const held = [];
  for (const officeName of offices) {
    const recognized = recognition.get(officeName);
    const inducted = induction.get(officeName);
    const state = incumbencyState(
      recognized === undefined ? "absurd" : (recognized),
      inducted === undefined ? "absurd" : (inducted),
    );
    if (state === "dignitas") held.push(officeName);
  }
  return Object.freeze(held);
}

/** One of an agent's standing duties: the `duty` relation itself, and whether it reached
 *  the agent directly (`assign`'s own shape) or DEVOLVED from an office the agent holds at
 *  dignitas (`invest`'s devolution — the office's own duty entries, active-holder rewritten
 *  to the incumbent). */

/** The standing duties of `agent`, from a feed's admitted claim-session rows: every
 *  `duty` relation whose active party is `agent` directly, plus every `duty` relation
 *  whose active party is an office `agent` holds at dignitas, devolved onto `agent` by
 *  rewriting the active holder. */
export function dutiesOfAgent(rows, agent) {
  const relations = juralRelationsOfClaimRows(rows);
  const offices = new Set(officesHeldAtDignitas(rows, agent));
  const duties = [];
  for (const relation of relations) {
    if (relation.kind !== "duty") continue;
    if (relation.active === agent) {
      duties.push(Object.freeze({ relation, via: "agent" }));
    } else if (offices.has(relation.active)) {
      duties.push(Object.freeze({
        relation: Object.freeze({ ...relation, active: agent }),
        via: "office",
        office: relation.active,
      }));
    }
  }
  return Object.freeze(duties);
}

/** Exercise the office/governance apparatus end to end on one worked example: a
 *  `campaign` work item governed by a `driver` office, assigned to an incumbent,
 *  then read three ways — as a rotational (swarm) power graph, a concentrated
 *  (kyriarchist) one, and a powerless (consensus) one — proving the discipline
 *  classification actually discriminates the three shapes it names, on live data. */
export function officeReceipt() {
  const campaign = { level: "campaign", id: "2026-h2-agentic-realization" };
  const driver = office("driver", [{ kind: "power", over: campaign }, { kind: "duty", over: campaign }]);
  const investitureResult = invest(driver, "agent-a", "potential", "potential");
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
  if (!sameCell(correlateCell, derivedCorrelateCell)) {
    throw new TypeError("officeReceipt: correlate must equal predication's converseCell composed with a kind-specialization");
  }

  const account = accountability("agent-a", campaign);
  const delegated = delegate(grant("agent-a", campaign), "agent-b");

  const rotationalGovernance = readJuralRelations([
    Object.freeze({ kind: "power", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "potential" }),
    Object.freeze({ kind: "power", active: "agent-b", passive: "agent-a", scope: scopeOf(campaign.level, campaign.id), standing: "potential" }),
    Object.freeze({ kind: "duty", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "potential" }),
    Object.freeze({ kind: "duty", active: "agent-b", passive: "agent-a", scope: scopeOf(campaign.level, campaign.id), standing: "potential" }),
  ]);

  const kyriarchistGovernance = readJuralRelations([
    Object.freeze({ kind: "power", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "potential" }),
    Object.freeze({ kind: "power", active: "agent-a", passive: "agent-c", scope: scopeOf(campaign.level, campaign.id), standing: "potential" }),
  ]);

  const consensusGovernance = readJuralRelations([
    Object.freeze({ kind: "claim", active: "agent-a", passive: "agent-b", scope: scopeOf(campaign.level, campaign.id), standing: "potential" }),
  ]);

  return Object.freeze({
    kind: "socializing.office.receipt:witness",
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
