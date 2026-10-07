/**
 * governance — the theory of governance, executable.
 *
 * The theory (lakota-services-section, lakotaean-governance/questions/
 * what-is-the-theory-of-governance.md) takes a process to be a governance act exactly when
 * it is ATTRIBUTED to a collective, BINDS a member to a constraint by a norm, and effects the
 * BECOMING of a state. Those three are the primitive judgments; each settles independently in
 * FOUR (held, denied, unknown, contested), and an act's operativity is their knowledge meet.
 * Everything else is derived:
 *
 *   - attribution carries up sub-collective inclusion (a :: C, C ⊆ C' ⊢ a :: C'), and
 *     becoming composes along acts;
 *   - OBLIGATORY φ for a collective: some norm binds every member to require φ; FORBIDDEN:
 *     some norm binds every member to forbid φ; PERMITTED: not forbidden;
 *   - a member SEES TO IT that φ when an act attributed to that member alone becomes a
 *     φ-state; a collective ENSURES φ the same way (coalition);
 *   - an act COUNTS AS an institution's act when it is attributed both to the member and to
 *     the institution's collective. An office is such an institution: its incumbent is the
 *     member whose acts count as the office's (recognition) and whom the office's norms bind
 *     (induction), which is incumbency as the thesis reads it;
 *   - LEVELS: the apparatus of level n (its collectives, members and norms) is the state that
 *     acts of level n+1 become. Founding a collective and amending the rules are ordinary
 *     acts one level up, so self-amendment needs no fixed point. Ostrom's operational,
 *     collective-choice and constitutional levels are levels 0, 1 and 2.
 *
 * Judgments are evidence rows told for or against; the model folds them by the knowledge
 * join, so repeated or conflicting testimony is kept, never overwritten.
 */
import {
  isReading,
  knowledgeJoinReading,
  knowledgeMeetReading,
  negateReading,
  readingAs,
  readingOfSides,
} from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { governanceAct } from "./jural.mjs";
import { incumbencyState } from "./office.mjs";

const UNKNOWN = "absurd";
const HELD = "potential";

function fail(message) {
  throw new TypeError(`governance: ${message}`);
}

const reading = (value = "held") => {
  if (!isReading(value)) fail(`${value} is not a reading of FOUR`);
  return readingAs("knowledge", value);
};
const joinAll = (values) => values.reduce(knowledgeJoinReading, UNKNOWN);
const isHeld = (value) => value === HELD;

/**
 * A governance: its collectives (each with members and the collectives it is part of), its
 * norms (each binding members of a collective to constraints), and the judgment rows told
 * about acts. `level` is the level of this apparatus; its acts are level `level` acts.
 *
 * - collectives: [{ id, members: [memberId], partOf?: [collectiveId] }]
 * - norms: [{ id, of: collectiveId, binds: [{ member?: memberId (default every member),
 *   constraint: { require } | { forbid } }] }]
 * - attributions: [{ act, collective, reading? }]
 * - bindings: [{ act, norm, member, constraint, reading? }]  (the binding an act produces)
 * - becomings: [{ act, from, to, reading? }]
 */
export function governance({ level = 0, collectives = [], norms = [], attributions = [], bindings = [], becomings = [] }) {
  const byId = new Map();
  for (const c of collectives) {
    if (typeof c.id !== "string" || c.id.length === 0) fail("every collective needs an id");
    if (byId.has(c.id)) fail(`collective ${c.id} is declared twice`);
    byId.set(c.id, Object.freeze({ id: c.id, members: Object.freeze([...(c.members ?? [])]), partOf: Object.freeze([...(c.partOf ?? [])]) }));
  }
  for (const c of byId.values()) for (const p of c.partOf) if (!byId.has(p)) fail(`${c.id} is part of undeclared ${p}`);
  const normById = new Map();
  for (const n of norms) {
    if (!byId.has(n.of)) fail(`norm ${n.id} belongs to undeclared collective ${n.of}`);
    normById.set(n.id, Object.freeze({ id: n.id, of: n.of, binds: Object.freeze((n.binds ?? []).map((b) => Object.freeze({ ...b }))) }));
  }
  return Object.freeze({
    kind: "socializing.governance",
    level,
    collectives: byId,
    norms: normById,
    attributions: Object.freeze(attributions.map((r) => Object.freeze({ act: r.act, collective: r.collective, reading: reading(r.reading) }))),
    bindings: Object.freeze(bindings.map((r) => Object.freeze({ act: r.act, norm: r.norm, member: r.member, constraint: r.constraint, reading: reading(r.reading) }))),
    becomings: Object.freeze(becomings.map((r) => Object.freeze({ act: r.act, from: r.from, to: r.to, reading: reading(r.reading) }))),
  });
}

/** The collectives `c` is part of, itself included (the reflexive-transitive inclusion). */
export function enclosing(model, collective) {
  const seen = new Set();
  const stack = [collective];
  while (stack.length > 0) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const parent of model.collectives.get(id)?.partOf ?? []) stack.push(parent);
  }
  return seen;
}

/** Members of a collective, including members of the collectives that are part of it. */
export function membersOf(model, collective) {
  const members = new Set(model.collectives.get(collective)?.members ?? []);
  for (const c of model.collectives.values()) {
    if (c.id !== collective && enclosing(model, c.id).has(collective)) for (const m of c.members) members.add(m);
  }
  return members;
}

/** a :: C — the attribution of an act to a collective: every told attribution to a collective
 *  that is part of C counts toward it, folded by the knowledge join. */
export function attribution(model, act, collective) {
  return joinAll(model.attributions.filter((r) => r.act === act && enclosing(model, r.collective).has(collective)).map((r) => r.reading));
}

/** The binding an act produces, over every member and constraint it was told to bind. */
export function binding(model, act) {
  return joinAll(model.bindings.filter((r) => r.act === act).map((r) => r.reading));
}

/** s ⤳_a s' — the becoming an act effects (from → to), folded over testimony. */
export function becoming(model, act, from, to) {
  return joinAll(model.becomings.filter((r) => r.act === act && (from === undefined || r.from === from) && (to === undefined || r.to === to)).map((r) => r.reading));
}

/** Becoming composes: acts in sequence become the chained state, their readings met. */
export function becomingAlong(model, from, acts) {
  let state = from;
  let settled = HELD;
  for (const act of acts) {
    const rows = model.becomings.filter((r) => r.act === act && r.from === state);
    if (rows.length === 0) return Object.freeze({ from, to: undefined, reading: UNKNOWN, stoppedAt: act });
    const to = rows[0].to;
    settled = knowledgeMeetReading(settled, joinAll(rows.filter((r) => r.to === to).map((r) => r.reading)));
    state = to;
  }
  return Object.freeze({ from, to: state, reading: settled });
}

/** An act's governance reading: the three primitive judgments and their knowledge meet. The
 *  act is a governance act of `collective` when the operativity is held. */
export function governanceActOf(model, act, collective) {
  return governanceAct({
    act,
    collective,
    level: model.level,
    attribution: attribution(model, act, collective),
    binding: binding(model, act),
    becoming: becoming(model, act),
  });
}

const sameConstraint = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function boundBy(model, norm, member, constraint) {
  if (!membersOf(model, norm.of).has(member)) return false;
  return norm.binds.some((b) => (b.member === undefined || b.member === member) && sameConstraint(b.constraint, constraint));
}

/** Oφ for a collective: some norm of a collective the members stand under binds every member
 *  to require φ. Answered in FOUR: held when such a norm exists; denied when a norm forbids φ
 *  to every member instead; contested when both; unknown when neither. */
export function obligatory(model, collective, phi) {
  const members = [...membersOf(model, collective)];
  const scope = (n) => enclosing(model, collective).has(n.of) || enclosing(model, n.of).has(collective);
  const every = (constraint) => members.length > 0 && [...model.norms.values()].some((n) => scope(n) && members.every((m) => boundBy(model, n, m, constraint)));
  return readingOfSides("knowledge", every({ require: phi }), every({ forbid: phi }));
}

/** Fφ: forbidden is obligatory-not. */
export const forbidden = (model, collective, phi) => negateReading(obligatory(model, collective, phi));

/** Pφ: permitted unless forbidden. */
export const permitted = (model, collective, phi) => {
  const f = forbidden(model, collective, phi);
  return f === HELD ? "active" : f === "active" || f === UNKNOWN ? HELD : f;
};

/** [C] φ — a collective ensures φ: some act attributed to it becomes a state satisfying φ. */
export function ensures(model, collective, phi) {
  const found = model.becomings.filter((b) => phi(b.to) && isHeld(knowledgeMeetReading(attribution(model, b.act, collective), b.reading)));
  return Object.freeze({ reading: found.length > 0 ? HELD : UNKNOWN, acts: Object.freeze([...new Set(found.map((b) => b.act))]) });
}

/** [a stit] φ — a member sees to it that φ: coalition with the member alone. The member's
 *  singleton collective is `member:<id>` unless declared otherwise. */
export const seesToIt = (model, member, phi, singleton = `member:${member}`) => ensures(model, singleton, phi);

/** D — an act counts as an institution's act when it is attributed to the member (alone) and
 *  to the institution's collective. */
export function countsAs(model, act, member, institution, singleton = `member:${member}`) {
  return knowledgeMeetReading(attribution(model, act, singleton), attribution(model, act, institution));
}

/**
 * Incumbency read from the thesis: recognition is that the member's acts count as the
 * office's (attribution of the member's acts to the office); induction is that the office's
 * norms bind the member. Returns both settlements and the incumbency state socializing's
 * office reading names (vacant, recognition, munus, dignitas, failed, repair).
 */
export function incumbency(model, office, member, { acts, singleton = `member:${member}` } = {}) {
  const candidates = acts ?? [...new Set(model.attributions.filter((r) => r.collective === singleton).map((r) => r.act))];
  const recognition = joinAll(candidates.map((act) => countsAs(model, act, member, office, singleton)));
  const induction = joinAll([...model.norms.values()].filter((n) => n.of === office).flatMap((n) => n.binds
    .filter((b) => b.member === undefined || b.member === member)
    .map(() => (membersOf(model, office).has(member) ? HELD : UNKNOWN))));
  return Object.freeze({ office, member, recognition, induction, state: incumbencyState(recognition, induction) });
}

/** The duties the norms put on a member: every `require` constraint binding them. */
export function dutiesOf(model, member) {
  const duties = [];
  for (const n of model.norms.values()) {
    for (const b of n.binds) {
      if ((b.member === undefined || b.member === member) && membersOf(model, n.of).has(member) && b.constraint.require !== undefined) {
        duties.push(Object.freeze({ norm: n.id, collective: n.of, require: b.constraint.require }));
      }
    }
  }
  return Object.freeze(duties);
}

/**
 * An act one level up: its becoming is a change of this level's apparatus. `change` may found
 * collectives, admit or remove members, and add or repeal norms. The act is recorded as a
 * governance act of the next level (attributed to `by`, binding the apparatus, becoming the
 * amended apparatus); the result is the amended governance at this level and the act's
 * reading at the level above.
 */
export function amend(model, { act, by, change }) {
  const collectives = new Map([...model.collectives.values()].map((c) => [c.id, { id: c.id, members: [...c.members], partOf: [...c.partOf] }]));
  for (const c of change.found ?? []) {
    if (collectives.has(c.id)) fail(`${c.id} already exists; founding is for new collectives`);
    collectives.set(c.id, { id: c.id, members: [...(c.members ?? [])], partOf: [...(c.partOf ?? [])] });
  }
  for (const { collective, member } of change.admit ?? []) collectives.get(collective)?.members.push(member);
  for (const { collective, member } of change.remove ?? []) {
    const c = collectives.get(collective);
    if (c) c.members = c.members.filter((m) => m !== member);
  }
  const repealed = new Set(change.repeal ?? []);
  const norms = [...model.norms.values()].filter((n) => !repealed.has(n.id)).concat(change.enact ?? []);
  const next = governance({
    level: model.level,
    collectives: [...collectives.values()],
    norms,
    attributions: model.attributions,
    bindings: model.bindings,
    becomings: model.becomings,
  });
  const upper = governance({
    level: model.level + 1,
    collectives: [{ id: by, members: [] }],
    attributions: [{ act, collective: by }],
    bindings: [{ act, norm: `${act}:apparatus`, member: by, constraint: { require: `apparatus:${model.level}` } }],
    becomings: [{ act, from: `apparatus:${model.level}:before`, to: `apparatus:${model.level}:after` }],
  });
  return Object.freeze({ governance: next, act: governanceActOf(upper, act, by) });
}

/** Ostrom's named levels as a truncation of the tower. */
export const NAMED_LEVELS = Object.freeze(["operational", "collective-choice", "constitutional"]);

/** Receipt: a group with an office, its norms and one incumbent, read through the kernel. */
export function governanceReceipt() {
  const model = governance({
    collectives: [
      { id: "group", members: ["ana", "ben"] },
      { id: "bookkeeper", members: ["ana"], partOf: ["group"] },
      { id: "member:ana", members: ["ana"] },
    ],
    norms: [
      { id: "keep-books", of: "bookkeeper", binds: [{ constraint: { require: "monthly-close" } }] },
      { id: "no-self-dealing", of: "group", binds: [{ constraint: { forbid: "self-dealing" } }] },
    ],
    attributions: [
      { act: "close-september", collective: "member:ana" },
      { act: "close-september", collective: "bookkeeper" },
    ],
    bindings: [{ act: "close-september", norm: "keep-books", member: "ana", constraint: { require: "monthly-close" } }],
    becomings: [{ act: "close-september", from: "books:open", to: "books:closed" }],
  });
  const founded = amend(model, { act: "found-audit", by: "board", change: { found: [{ id: "audit", members: ["ben"], partOf: ["group"] }] } });
  return Object.freeze({
    kind: "socializing.governance.receipt:witness",
    act: governanceActOf(model, "close-september", "group"),
    obligatory: obligatory(model, "bookkeeper", "monthly-close"),
    forbidden: forbidden(model, "group", "self-dealing"),
    permitted: permitted(model, "group", "self-dealing"),
    incumbency: incumbency(model, "bookkeeper", "ana"),
    duties: dutiesOf(model, "ana"),
    ensures: ensures(model, "group", (s) => s === "books:closed"),
    founding: { level: founded.act.level, operativity: founded.act.operativity, collectives: [...founded.governance.collectives.keys()] },
  });
}
