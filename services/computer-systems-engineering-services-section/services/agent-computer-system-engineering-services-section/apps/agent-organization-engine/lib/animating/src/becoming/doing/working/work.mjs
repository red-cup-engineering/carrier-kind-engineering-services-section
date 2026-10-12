/**
 * work — the theory of work, executable.
 *
 * The theory (agency-services-section, what-is-the-theory-of-work.md) is the multisorted
 * theory T_Work: states (a symmetric monoidal category), costs (a commutative quantale) and
 * capability, with natural history τ, work-acts, cost κ, capability update u and
 * capability-aware cost κ̃. Its finitely presented models are cost-weighted Petri
 * presentations (the note's Theorem 2), and that is the presentation run here:
 *
 *   - a STATE is a marking of places (how many of each thing there is); states compose by
 *     adding markings (⊗_S) and the empty marking is I_S;
 *   - a WORK-ACT is a transition that consumes and produces, with a cost above the unit
 *     (Invariant 2: work depletes something), whose outcome differs from what natural history
 *     would have done (Invariant 1: work makes a counterfactual difference);
 *   - NATURAL HISTORY is the spontaneous transitions, free of cost, fired to their settling;
 *   - CAPABILITY counts the practice of skills; a SKILL is a capability component that
 *     cheapens the acts that use it, down to their mastery cost; failed attempts teach too;
 *   - the Q-enrichment: `cheapest` is the least cost of work taking one state to another;
 *   - the MODAL LAYER: an attempt aims at a target, tries an act and realises one; a failed
 *     attempt is classified on the three axes of the failure fibre (trivial, reachable,
 *     suboptimal) into lapse, slip, mistake, and violation; an ENDEAVOR keeps trying
 *     across failures, accumulating capability, until its aim is reached or its budget spent.
 *
 * Who may perform which act (positions, offices, permission) is not part of the theory of
 * work (its Theorem 10): it is an organisational form, a position-permission cost added to κ̃,
 * and belongs to organizing.
 */
import { costQuantale } from "@red-cup-engineering/metrologic/models/order/quantale";

function fail(message) {
  throw new TypeError(`work: ${message}`);
}

function countsOf(places, record = {}, label) {
  for (const key of Object.keys(record)) if (!places.includes(key)) fail(`${label} names ${key}, which is not a place`);
  return Object.freeze(Object.fromEntries(places.map((place) => {
    const value = record[place] ?? 0;
    if (!Number.isSafeInteger(value) || value < 0) fail(`${label}.${place} must be a natural number`);
    return [place, value];
  })));
}

const sameMarking = (places, a, b) => places.every((p) => a[p] === b[p]);
const covers = (places, state, target) => places.every((p) => state[p] >= target[p]);
const markingKey = (places, m) => places.map((p) => m[p]).join(",");

/**
 * A model of the theory of work: places, work-acts, natural-history transitions, skills,
 * and the cost quantale (one resource by default). Each act is
 * `{ id, consumes, produces, cost, skills?, mastery? }`; `mastery` is the cost the act
 * settles to once practiced (its plateau), the base cost when absent.
 */
export function workModel({ places, acts, naturalHistory = [], skills = [], quantale = costQuantale, learningRate = 0.8 }) {
  if (!Array.isArray(places) || places.length === 0) fail("a model needs places");
  const placeList = Object.freeze([...places]);
  const Q = quantale;
  const skillIds = new Set(skills.map((s) => (typeof s === "string" ? s : s.id)));
  const admittedActs = new Map();
  for (const act of acts) {
    if (typeof act.id !== "string" || act.id.length === 0) fail("every act needs an id");
    if (admittedActs.has(act.id)) fail(`act ${act.id} is declared twice`);
    const cost = act.cost;
    if (!Q.lt(Q.unit, cost)) fail(`act ${act.id} costs nothing; a transition that costs nothing is natural history, not work`);
    const mastery = act.mastery ?? cost;
    if (!Q.le(mastery, cost)) fail(`act ${act.id}: mastery cost cannot exceed its base cost`);
    if (!Q.lt(Q.unit, mastery)) fail(`act ${act.id}: mastered work still costs something`);
    for (const skill of act.skills ?? []) if (!skillIds.has(skill)) fail(`act ${act.id} uses undeclared skill ${skill}`);
    admittedActs.set(act.id, Object.freeze({
      id: act.id,
      consumes: countsOf(placeList, act.consumes, `${act.id}.consumes`),
      produces: countsOf(placeList, act.produces, `${act.id}.produces`),
      cost,
      mastery,
      skills: Object.freeze([...(act.skills ?? [])]),
    }));
  }
  const spontaneous = naturalHistory.map((t) => Object.freeze({
    id: t.id,
    consumes: countsOf(placeList, t.consumes, `${t.id}.consumes`),
    produces: countsOf(placeList, t.produces, `${t.id}.produces`),
  }));
  if (!(learningRate > 0 && learningRate <= 1)) fail("learningRate must lie in (0, 1]");
  return Object.freeze({
    kind: "animating.work.model",
    places: placeList,
    acts: admittedActs,
    naturalHistory: Object.freeze(spontaneous),
    skills: Object.freeze([...skillIds]),
    quantale: Q,
    learningRate,
  });
}

/** A state of the model: a marking, every place counted. */
export const workState = (model, marking = {}) => countsOf(model.places, marking, "state");

/** ⊗_S: two independent bundles of state taken together. */
export const composeStates = (model, a, b) => Object.freeze(Object.fromEntries(model.places.map((p) => [p, a[p] + b[p]])));

const enabledOn = (places, t, s) => places.every((p) => s[p] >= t.consumes[p]);
const fireOn = (places, t, s) => Object.freeze(Object.fromEntries(places.map((p) => [p, s[p] - t.consumes[p] + t.produces[p]])));

/** τ: what the world does on its own from `state`, the spontaneous transitions fired until
 *  none is enabled. Free of cost. A natural history that has not settled within `limit`
 *  steps is reported unsettled rather than cut silently. */
export function naturalHistory(model, state, { limit = 1000 } = {}) {
  let current = state;
  for (let step = 0; step < limit; step += 1) {
    const next = model.naturalHistory.find((t) => enabledOn(model.places, t, current));
    if (next === undefined) return Object.freeze({ state: current, steps: step, settled: true });
    current = fireOn(model.places, next, current);
  }
  return Object.freeze({ state: current, steps: limit, settled: false });
}

/** A capability: how much each skill has been practiced. */
export const capability = (model, practice = {}) => Object.freeze(Object.fromEntries(model.skills.map((s) => [s, practice[s] ?? 0])));

/** u: the capability after performing (or attempting) an act. Practice of an act's skills
 *  grows by one; the order in which a worker logs acts is immaterial. */
export function updateCapability(model, current, actId) {
  const act = model.acts.get(actId);
  if (act === undefined) return current;
  return Object.freeze({ ...current, ...Object.fromEntries(act.skills.map((s) => [s, (current[s] ?? 0) + 1])) });
}

function interpolate(Q, base, mastery, factor) {
  const lerp = (b, m) => m + (b - m) * factor;
  if (typeof base === "number") return lerp(base, mastery);
  return Object.freeze(Object.fromEntries(Object.keys(base).map((k) => [k, lerp(base[k], mastery[k])])));
}

/** κ̃: an act's cost to a worker with `current` capability. Practice of the act's least
 *  practiced skill brings the cost geometrically down to its mastery cost; more capability
 *  never makes the same act cost more. */
export function awareCost(model, current, actId) {
  const act = model.acts.get(actId);
  if (act === undefined) fail(`no act ${actId}`);
  if (act.skills.length === 0) return act.cost;
  const practice = Math.min(...act.skills.map((s) => current[s] ?? 0));
  return interpolate(model.quantale, act.cost, act.mastery, model.learningRate ** practice);
}

/** Λ: the learning an act's next performance brings, its cost before and after. At mastery
 *  the two agree and practice of this act alone lowers it no further. */
export function learning(model, current, actId) {
  const before = awareCost(model, current, actId);
  const after = awareCost(model, updateCapability(model, current, actId), actId);
  const Q = model.quantale;
  return Object.freeze({ act: actId, before, after, mastered: Q.eq(before, after) || Q.le(before, model.acts.get(actId).mastery) });
}

/** Perform one work-act from `state`. Refused when the act is not enabled, or when its outcome
 *  is what natural history would have produced anyway (that is happening, not work). */
export function perform(model, state, actId, current = capability(model)) {
  const act = model.acts.get(actId);
  if (act === undefined) return Object.freeze({ kind: "animating.work.act-obstruction", act: actId, reason: "no such act" });
  if (!enabledOn(model.places, act, state)) return Object.freeze({ kind: "animating.work.act-obstruction", act: actId, reason: "not enabled", from: state });
  const to = fireOn(model.places, act, state);
  if (sameMarking(model.places, to, naturalHistory(model, state).state)) {
    return Object.freeze({ kind: "animating.work.act-obstruction", act: actId, reason: "no counterfactual difference", from: state });
  }
  return Object.freeze({
    kind: "animating.work.act:witness",
    act: actId,
    from: state,
    to,
    cost: awareCost(model, current, actId),
    capability: updateCapability(model, current, actId),
  });
}

/** Perform acts in sequence (a workflow); its cost is the ⊗ of the steps' costs. */
export function workflow(model, state, actIds, current = capability(model)) {
  const steps = [];
  let s = state;
  let c = current;
  for (const id of actIds) {
    const step = perform(model, s, id, c);
    if (step.kind !== "animating.work.act:witness") return Object.freeze({ kind: "animating.work.workflow-obstruction", at: steps.length, step, steps: Object.freeze(steps) });
    steps.push(step);
    s = step.to;
    c = step.capability;
  }
  return Object.freeze({ kind: "animating.work.workflow:witness", from: state, to: s, steps: Object.freeze(steps), cost: model.quantale.tensorAll(steps.map((step) => step.cost)), capability: c });
}

/** ⊗_w: acts performed at once on disjoint parts of the state. Their cost is at most the ⊗ of
 *  their costs (here exactly it: this presentation declares no shared setup). */
export function parallel(model, state, actIds, current = capability(model)) {
  const acts = actIds.map((id) => model.acts.get(id) ?? fail(`no act ${id}`));
  const need = Object.fromEntries(model.places.map((p) => [p, acts.reduce((n, a) => n + a.consumes[p], 0)]));
  if (!covers(model.places, state, need)) return Object.freeze({ kind: "animating.work.parallel-obstruction", reason: "the acts do not fit disjointly in the state", acts: actIds });
  const to = Object.freeze(Object.fromEntries(model.places.map((p) => [p, state[p] - need[p] + acts.reduce((n, a) => n + a.produces[p], 0)])));
  let c = current;
  for (const id of actIds) c = updateCapability(model, c, id);
  return Object.freeze({ kind: "animating.work.parallel:witness", from: state, to, acts: Object.freeze([...actIds]), cost: model.quantale.tensorAll(actIds.map((id) => awareCost(model, current, id))), capability: c });
}

/** A total order on costs for search: numbers themselves, records by their sum. The answer's
 *  cost is still the quantale meet of every cheapest candidate found. */
const rankOf = (cost) => (typeof cost === "number" ? cost : Object.values(cost).reduce((a, b) => a + b, 0));

/**
 * The cheapest work from `from` to a state covering `to` (the Q-enriched hom: ⋀ of the costs
 * of the ways there), with one cheapest path. Natural history is free and applied between
 * acts. Unreachable within `budget` (or `maxStates` explored) is the quantale's top.
 */
export function cheapest(model, from, to, { current = capability(model), budget, maxStates = 5000 } = {}) {
  const Q = model.quantale;
  const target = workState(model, to);
  const start = naturalHistory(model, from).state;
  const frontier = [{ state: start, cost: Q.unit, path: [], capability: current }];
  const settled = new Map();
  let explored = 0;
  while (frontier.length > 0 && explored < maxStates) {
    frontier.sort((a, b) => rankOf(a.cost) - rankOf(b.cost));
    const node = frontier.shift();
    const key = markingKey(model.places, node.state);
    if (settled.has(key)) continue;
    settled.set(key, node);
    explored += 1;
    if (covers(model.places, node.state, target)) {
      return Object.freeze({ kind: "animating.work.cheapest:witness", from, to: target, reached: node.state, cost: node.cost, path: Object.freeze(node.path), explored });
    }
    for (const act of model.acts.values()) {
      if (!enabledOn(model.places, act, node.state)) continue;
      const cost = Q.tensor(node.cost, awareCost(model, node.capability, act.id));
      if (budget !== undefined && !Q.le(cost, budget)) continue;
      const next = naturalHistory(model, fireOn(model.places, act, node.state)).state;
      if (settled.has(markingKey(model.places, next))) continue;
      frontier.push({ state: next, cost, path: [...node.path, act.id], capability: updateCapability(model, node.capability, act.id) });
    }
  }
  return Object.freeze({ kind: "animating.work.cheapest-obstruction", from, to: target, cost: Q.top, reason: explored >= maxStates ? "search bound reached" : "unreachable within budget", explored });
}

/** A bottleneck: a state from which no act fits the budget. */
export function bottleneck(model, state, budget, current = capability(model)) {
  const affordable = [...model.acts.values()].filter((act) => enabledOn(model.places, act, state) && model.quantale.le(awareCost(model, current, act.id), budget));
  return Object.freeze({ kind: "animating.work.bottleneck", state, budget, bottleneck: affordable.length === 0, affordable: Object.freeze(affordable.map((a) => a.id)) });
}

/**
 * The failure fibre: a failed attempt read on three axes. TRIVIAL: nothing was done beyond
 * natural history. REACHABLE: some work within budget would have reached the aim. SUBOPTIMAL:
 * what was done cost more than the cheapest way to where it led. Lapse = trivial; slip =
 * non-trivial, aim unreachable; mistake = non-trivial, aim reachable; violation = suboptimal,
 * orthogonal to slip and mistake.
 */
export function classifyFailure(model, attemptToken, { budget, current = capability(model) } = {}) {
  const Q = model.quantale;
  const realised = attemptToken.realised;
  const trivial = realised.act === null || Q.eq(realised.cost, Q.unit);
  const toAim = cheapest(model, attemptToken.from, attemptToken.aim, { current, budget });
  const reachable = toAim.kind === "animating.work.cheapest:witness";
  let suboptimal = false;
  if (!trivial) {
    const toRealised = cheapest(model, attemptToken.from, realised.to, { current });
    suboptimal = toRealised.kind === "animating.work.cheapest:witness" && Q.lt(toRealised.cost, realised.cost);
  }
  const mode = trivial ? "lapse" : reachable ? "mistake" : "slip";
  return Object.freeze({
    kind: "animating.work.failure",
    trivial,
    reachable,
    suboptimal,
    mode,
    violation: suboptimal,
    ...(reachable ? { cheapestToAim: toAim.cost, cheapestPath: toAim.path } : {}),
  });
}

/**
 * An attempt (an intention token): from `state`, aiming at a state covering `aim`, trying
 * `act`. What is realised is the tried act when it can be performed, else `realised` when the
 * world did something else, else only natural history. Capability updates on what was
 * realised, success or failure.
 */
export function attempt(model, state, { aim, act, realised, budget, current = capability(model) }) {
  const target = workState(model, aim);
  const tried = perform(model, state, act, current);
  let outcome;
  if (tried.kind === "animating.work.act:witness") outcome = { act, to: tried.to, cost: tried.cost };
  else if (realised !== undefined) {
    const other = perform(model, state, realised, current);
    outcome = other.kind === "animating.work.act:witness"
      ? { act: realised, to: other.to, cost: other.cost }
      : { act: null, to: naturalHistory(model, state).state, cost: model.quantale.unit };
  } else outcome = { act: null, to: naturalHistory(model, state).state, cost: model.quantale.unit };
  const after = outcome.act === null ? current : updateCapability(model, current, outcome.act);
  const success = covers(model.places, outcome.to, target);
  const token = { kind: "animating.work.attempt", from: state, aim: target, tried: act, realised: Object.freeze(outcome), success, capability: after };
  return Object.freeze(success ? token : { ...token, failure: classifyFailure(model, token, { budget, current }) });
}

/**
 * An endeavor: keep trying toward `aim` until it is reached, the attempts run out, or the
 * budget is spent. Each step tries the next act of the current cheapest plan (or the given
 * `plan`); failures do not end the endeavor, and every realised act, failed or not, adds to
 * capability.
 */
export function endeavor(model, state, { aim, plan, budget, maxAttempts = 50, current = capability(model), realise = () => undefined }) {
  const Q = model.quantale;
  const attempts = [];
  let s = state;
  let c = current;
  let spent = Q.unit;
  const target = workState(model, aim);
  for (let n = 0; n < maxAttempts; n += 1) {
    if (covers(model.places, s, target)) break;
    const route = plan !== undefined ? plan.slice(attempts.length) : cheapest(model, s, target, { current: c }).path ?? [];
    const act = route[0];
    if (act === undefined) break;
    const token = attempt(model, s, { aim: target, act, realised: realise(act, attempts.length), budget, current: c });
    const nextSpent = Q.tensor(spent, token.realised.cost);
    if (budget !== undefined && !Q.le(nextSpent, budget)) break;
    attempts.push(token);
    spent = nextSpent;
    s = token.realised.to;
    c = token.capability;
    if (token.realised.act === null && plan === undefined) break;
  }
  return Object.freeze({
    kind: "animating.work.endeavor",
    from: state,
    aim: target,
    reached: covers(model.places, s, target),
    to: s,
    attempts: Object.freeze(attempts),
    spent,
    capability: c,
  });
}

/** Check the theory's laws on a model over sample states: natural history is free and
 *  settles; every enabled act costs more than nothing and differs from natural history;
 *  capability only cheapens; sequential cost is the ⊗ of step costs. */
export function workLaws(model, sampleStates) {
  const Q = model.quantale;
  const obstructions = [];
  for (const s of sampleStates) {
    const tau = naturalHistory(model, s);
    if (!tau.settled) obstructions.push({ law: "natural history settles", state: s });
    for (const act of model.acts.values()) {
      if (!enabledOn(model.places, act, s)) continue;
      const done = perform(model, s, act.id);
      if (done.kind !== "animating.work.act:witness") obstructions.push({ law: "counterfactual divergence", state: s, act: act.id });
      const novice = awareCost(model, capability(model), act.id);
      const practiced = awareCost(model, capability(model, Object.fromEntries(model.skills.map((k) => [k, 5]))), act.id);
      if (!Q.le(practiced, novice)) obstructions.push({ law: "capability-cost monotonicity", act: act.id });
      if (!Q.lt(Q.unit, novice)) obstructions.push({ law: "work has positive cost", act: act.id });
    }
  }
  return obstructions.length === 0
    ? Object.freeze({ kind: "animating.work.laws:witness", states: sampleStates.length })
    : Object.freeze({ kind: "animating.work.laws-obstruction", obstructions: Object.freeze(obstructions) });
}

/** Receipt: a small editorial model (drafting, reviewing, publishing, with drafts that go
 *  stale on their own) exercised through the whole kernel. */
export function workReceipt() {
  const model = workModel({
    places: ["idea", "draft", "reviewed", "published", "stale"],
    skills: ["writing", "editing"],
    acts: [
      { id: "write", consumes: { idea: 1 }, produces: { draft: 1 }, cost: 4, mastery: 1, skills: ["writing"] },
      { id: "review", consumes: { draft: 1 }, produces: { reviewed: 1 }, cost: 2, skills: ["editing"] },
      { id: "publish", consumes: { reviewed: 1 }, produces: { published: 1 }, cost: 1 },
      { id: "rush", consumes: { draft: 1 }, produces: { published: 1 }, cost: 6 },
      { id: "refresh", consumes: { stale: 1 }, produces: { draft: 1 }, cost: 2, skills: ["writing"] },
    ],
    naturalHistory: [],
  });
  const start = workState(model, { idea: 1 });
  const route = cheapest(model, start, { published: 1 });
  const partial = attempt(model, workState(model, { draft: 1 }), { aim: { published: 1 }, act: "review", budget: 3 });
  const effort = endeavor(model, start, { aim: { published: 1 } });
  return Object.freeze({
    kind: "animating.work.receipt:witness",
    laws: workLaws(model, [start, workState(model, { draft: 1 }), workState(model, { reviewed: 1 })]),
    cheapest: { cost: route.cost, path: route.path },
    failedAttempt: partial.failure ?? { success: partial.success },
    endeavor: { reached: effort.reached, spent: effort.spent, capability: effort.capability },
    learning: learning(model, capability(model, { writing: 3 }), "write"),
  });
}
