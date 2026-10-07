/**
 * jural — the seated registry as a society of Hohfeldian relations, and the coalitions, effectivity and
 * legitimacy that society carries.
 *
 * An office is a bearer-independent role with a DEONTIC PROFILE (socializing/office): a family of jural
 * relations with the office in the active position. The records name each position in an office's
 * `deontic-profile` — `duty`, `deontic-power` (and the bare `power` one record spells), `deontic-immunity`
 * and `liberty` (Hohfeld's privilege). Each becomes a relation `{kind, active: office, passive, scope}`:
 *
 *   - a duty is owed to its record's `claim` (else its `authority`), over its record's `work`;
 *   - a power alters its record's `alters`, over its record's `over`;
 *   - an immunity and a privilege are held against the office's jurisdiction, over the profile name;
 *   - a party the records do not name is the office's jurisdiction, the body politic.
 *
 * At dignitas the profile DEVOLVES onto the incumbent (socializing `invest`, from the seat's own settled
 * recognition and induction): the incumbent becomes the active holder. The office's own profile stays
 * (dignitas non moritur). The society is the devolved relations: who holds what over whom, now.
 *
 * Over each body politic, three readings follow, all on socializing's math (re-derived here: none):
 *
 *   - COALITIONS. The natural coalitions of a body are the formal concepts of its seated bearers ×
 *     their held positions (`kind:scope`): each a maximal bloc with exactly the mandate it jointly holds,
 *     together a complete lattice (Wille's FCA).
 *   - EFFECTIVITY. Pauly's coalition logic: a coalition can FORCE an outcome when it is decisive under
 *     the body's own rule (every member aligning, everyone else against, the decision settles) and one
 *     of its members holds a power over the outcome. The outcomes are the scopes the body's powers alter.
 *     Decisive and empowered are met in truth: either refused refuses; an unseated rule is silence (⊥).
 *     The FOUR-valued matrix is a Chu space; its dual is the LIABILITY reading (which coalitions an
 *     outcome is liable to), Hohfeld's power ↔ liability as the linear-logic dual, provably involutive.
 *   - LEGITIMACY. Each of the body's deciders under its own rule (a polity's or sect's seated head, a
 *     micro-enterprise's doers, a guild's recognized members, a troupe's founders), over each scope it holds power
 *     in, read by `legitimate` under the body's Weberian basis: common knowledge of the claim, no symbolic
 *     violence, no power held without a duty, no charismatic instability. Domination is exercised by
 *     whoever decides, so whoever decides makes the claim. A body no one decides in makes none: ⊥.
 */
import { knowledgeJoinAll, truthMeetAll } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { coalitionLattice, holdingsOfRelations } from "@red-cup-engineering/socializing/coalition";
import { effectivityDual, effectivitySpace } from "@red-cup-engineering/socializing/effectivity";
import { admitJuralRelations, readJuralRelations } from "@red-cup-engineering/socializing/jural";
import { legitimate } from "@red-cup-engineering/socializing/legitimacy";
import { invest } from "@red-cup-engineering/socializing/office";

import { agencyKey, bodyOf, incumbenciesOf, resolve } from "./index.mjs";
import { BODY_KINDS } from "./kinds.mjs";
import { bodyDecision, bodyOffices } from "./politic.mjs";

const T = "potential";
const F = "active";
const NONE = "absurd";

/** The records' position names, as Hohfeld's kinds. */
export const POSITIONS = Object.freeze({ duty: "duty", "deontic-power": "power", power: "power", "deontic-immunity": "immunity", liberty: "privilege" });
const POOL = Object.freeze({ duty: "duties", power: "deontic-powers", immunity: "deontic-immunities", privilege: "liberties" });

const named = (value) => (typeof value === "string" && value.length > 0 ? value : undefined);

/** One office's deontic profile as jural relations with the office active, and the positions the
 *  records name that are none of Hohfeld's. */
export function officeRelations(agency, officeRef) {
  const office = resolve(agency, "offices", officeRef);
  if (office === undefined) return Object.freeze({ office: officeRef, relations: Object.freeze([]), unread: Object.freeze([{ name: officeRef, reason: "no such office" }]) });
  const party = named(office.jurisdiction) ?? "body-politic";
  const unread = [];
  const candidates = Object.entries(office.deonticProfile ?? {}).flatMap(([name, position]) => {
    const kind = POSITIONS[position];
    if (kind === undefined) { unread.push({ name, position }); return []; }
    const record = resolve(agency, POOL[kind], name, office.sectionPath);
    const passive = kind === "duty" ? named(record?.claim) ?? named(record?.authority) : kind === "power" ? named(record?.over) : undefined;
    const scope = kind === "duty" ? named(record?.work) : kind === "power" ? named(record?.alters) : undefined;
    return [{ kind, active: office.key, passive: passive ?? party, scope: scope ?? name, standing: T }];
  });
  const admitted = admitJuralRelations(candidates);
  return Object.freeze({ office: office.key, relations: admitted.relations ?? Object.freeze([]), unread: Object.freeze(unread.map((u) => Object.freeze(u))) });
}

/** Every office's profile and its devolution onto the incumbents seated at dignitas. Held per registry. */
const societies = new WeakMap();
export function juralRelationsOf(agency) {
  if (societies.has(agency)) return societies.get(agency);
  const offices = new Map();
  for (const key of agency.offices.keys()) {
    const { relations, unread } = officeRelations(agency, key);
    const seats = incumbenciesOf(agency, key).map((seat) => invest({ name: key, profile: relations }, seat.holder, seat.recognition, seat.induction))
      .filter((investiture) => investiture.devolved.length > 0);
    offices.set(key, Object.freeze({ relations, unread, seats: Object.freeze(seats) }));
  }
  const society = Object.freeze({
    offices,
    relations: Object.freeze([...offices.values()].flatMap((o) => o.relations)),
    devolved: Object.freeze([...offices.values()].flatMap((o) => o.seats.flatMap((s) => s.devolved))),
    unread: Object.freeze([...offices].flatMap(([office, o]) => o.unread.map((u) => Object.freeze({ office, ...u })))),
  });
  societies.set(agency, society);
  return society;
}

/** The relations devolved onto the bearers seated in the offices a body regulates through. */
function bodyRelations(agency, bodyRef) {
  const { offices } = juralRelationsOf(agency);
  return bodyOffices(agency, bodyRef).flatMap((key) => offices.get(key)?.seats.flatMap((s) => s.devolved) ?? []);
}

const coalitionKey = (agents) => agents.join(" + ") || "∅";

/** A body's natural coalitions: the concept lattice of its seated bearers × held positions. A lattice
 *  too large to enumerate is unread (⊥), not empty. */
export function bodyCoalitions(agency, bodyRef) {
  const relations = bodyRelations(agency, bodyRef);
  const holdings = holdingsOfRelations(relations);
  const agents = [...new Set(holdings.map((h) => h.agent))].sort();
  try {
    const lattice = coalitionLattice(holdings);
    return Object.freeze({ reading: T, agents: Object.freeze(agents), relations: Object.freeze(relations), lattice });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return Object.freeze({ reading: NONE, agents: Object.freeze(agents), relations: Object.freeze(relations), lattice: Object.freeze([]), reason: error.message });
  }
}

/** Whether a coalition is decisive under the body's rule: its members for, every other decider against. */
function decisive(agency, bodyRef, agents) {
  const decision = bodyDecision(agency, bodyRef);
  if (decision.kind !== "organizing.agency.decision") return NONE;
  const who = [...new Set([...decision.deciders, ...agents])];
  const closed = bodyDecision(agency, bodyRef, Object.fromEntries(who.map((w) => [w, agents.includes(w) ? T : F])));
  if (closed.unseated) return NONE;
  return closed.settled ? T : F;
}

/** A body's effectivity: which of its natural coalitions can force which outcome (the scopes its powers
 *  alter), and the dual — which coalitions each outcome is liable to. */
export function bodyEffectivity(agency, bodyRef, coalitions = bodyCoalitions(agency, bodyRef)) {
  const powers = coalitions.relations.filter((r) => r.kind === "power");
  const outcomes = [...new Set(powers.map((r) => r.scope))].sort();
  const points = coalitions.lattice.filter((c) => c.agents.length > 0);
  const effectivity = points.flatMap((c) => {
    const decides = decisive(agency, bodyRef, c.agents);
    return outcomes.map((outcome) => {
      const held = powers.filter((r) => r.scope === outcome && c.agents.includes(r.active)).map((r) => r.standing);
      return { coalition: coalitionKey(c.agents), outcome, force: truthMeetAll([decides, held.length === 0 ? F : knowledgeJoinAll(held)]) };
    });
  });
  const space = effectivitySpace(points.map((c) => coalitionKey(c.agents)), outcomes, effectivity);
  const dual = effectivityDual(space);
  // The dual negates: an outcome liable to a coalition reads f where the coalition can force it (t).
  const liable = (outcome, reading) => dual.effectivity.filter((e) => e.coalition === outcome && e.force === reading).map((e) => e.outcome);
  return Object.freeze({
    space,
    outcomes: Object.freeze(outcomes.map((outcome) => Object.freeze({
      outcome, liableTo: Object.freeze(liable(outcome, F)), contested: Object.freeze(liable(outcome, "stable")), unread: Object.freeze(liable(outcome, NONE)),
    }))),
  });
}

/** The legitimacy of a body's rule: each decider, over each scope it holds power in, under the body's
 *  Weberian basis. The reading is the truth meet over the claims; a body no one decides in reads ⊥. */
export function bodyLegitimacy(agency, bodyRef, relations = bodyRelations(agency, bodyRef)) {
  const found = bodyOf(agency, bodyRef);
  const regime = found && BODY_KINDS[found.kind];
  if (regime === undefined) return Object.freeze({ reading: NONE, claims: Object.freeze([]), reason: "no such body, or of no known kind" });
  const { deciders } = bodyDecision(agency, bodyRef);
  if (deciders.length === 0) return Object.freeze({ reading: NONE, basis: regime.authority, claims: Object.freeze([]), reason: "no one decides" });
  const claims = deciders.flatMap((claimant) => {
    const scopes = [...new Set(relations.filter((r) => r.kind === "power" && r.active === claimant).map((r) => r.scope))].sort();
    if (scopes.length === 0) return [Object.freeze({ claimant, scope: null, reading: NONE, reason: "holds no power" })];
    return scopes.map((scope) => {
      const read = legitimate({ name: `${agencyKey(found.body)}:${claimant}:${scope}`, claimant, scope, relations, basis: regime.authority });
      return Object.freeze({
        claimant, scope, reading: read.legitimate ? T : F, basis: read.basis,
        commonKnowledge: read.commonKnowledge.attained, symbolicViolence: read.symbolicViolence.symbolicViolence,
        accountabilityGap: read.accountabilityGap, charismaticInstability: read.charismaticInstability,
      });
    });
  });
  return Object.freeze({ reading: truthMeetAll(claims.map((c) => c.reading)), basis: regime.authority, claims: Object.freeze(claims) });
}

/** The society the registry holds, and every body's coalitions, effectivity and legitimacy. */
export function juralCensus(agency) {
  const society = juralRelationsOf(agency);
  const { relations: _r, correlatives: _c, ...reading } = readJuralRelations(society.devolved);
  const count = (relations) => relations.reduce((m, r) => ({ ...m, [r.kind]: (m[r.kind] ?? 0) + 1 }), {});
  const bodies = [...agency.bodies.values(), ...agency.enterprises.values()].filter((b) => bodyOf(agency, b.key) !== undefined).map((record) => {
    const coalitions = bodyCoalitions(agency, record.key);
    const effectivity = bodyEffectivity(agency, record.key, coalitions);
    return [agencyKey(record), Object.freeze({
      agents: coalitions.agents.length,
      coalitions: Object.freeze({ reading: coalitions.reading, concepts: coalitions.lattice.length, ...(coalitions.reason ? { reason: coalitions.reason } : {}),
        blocs: Object.freeze(coalitions.lattice.filter((c) => c.agents.length > 0 && c.mandate.length > 0).map((c) => Object.freeze({ agents: c.agents, mandate: c.mandate }))) }),
      effectivity: effectivity.outcomes,
      legitimacy: bodyLegitimacy(agency, record.key, coalitions.relations),
    })];
  });
  return Object.freeze({
    kind: "organizing.agency.jural-census",
    profile: Object.freeze(count(society.relations)),
    devolved: Object.freeze(count(society.devolved)),
    reading: Object.freeze(reading),
    unread: society.unread,
    bodies: Object.freeze(Object.fromEntries(bodies)),
  });
}
