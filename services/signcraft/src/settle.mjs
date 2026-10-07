/**
 * SignCraft — settling: the cellular closure engine.
 *
 * Settling runs SignChain's immediate-consequence step from a posited
 * valuation to its least fixed point above the seed (Tarski 1955; Kleene
 * iteration). Each step adds only derivation witnesses, each rule has one
 * derivation, and evidence sets absorb repeats, so the orbit is finite: at most
 * one stage per rule past the seed. The settlement is that orbit — each stage's
 * valuation and designated cells — and its fixed point, the settled valuation.
 * The settlement reports its observed closure ordinal (the finite stage at which
 * the orbit stopped) and reads its regime off it (Obsmetrologia `regimeOfOrd`):
 * over finitely many rules settling is always strict, and its orbit is evidence
 * for the strict phase.
 *
 * A cell is designated when it has been told for (it reads potential or
 * stable): a held contradiction stays affirmed rather than collapsing to false.
 */
import { address, cell, cellSet, coincides, merge, mergeCellSets, sameCell, sidesOf, triple } from "@red-cup-engineering/signcell/cell";
import { fireRuleIn } from "@red-cup-engineering/signchain/rules";
import { site, transportRules } from "@red-cup-engineering/signgraph/site";
import { rankIdentity, rankVanishing } from "@red-cup-engineering/signgraph/cohomology";
import { evidenceAt, lastValuation, posit } from "@red-cup-engineering/signgraph/valuation";
import { presentedCategoryDiagram } from "@red-cup-engineering/signgraph/diagram";
import { readingFamilies, readingOfSides, sidesOfReading, census } from "@red-cup-engineering/computer-data-services-section/four";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { closureRegimeName } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { ofNat, regimeOfOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";
import * as settling from "@red-cup-engineering/metrologic/obstruction/settling";
import { phaseEvidence, strictFinitePhase } from "@red-cup-engineering/signchain/contracts/phase";

/** The cells of a valuation that have been told for. */
export const designatedCells = (valuation) => Object.freeze(valuation.filter((value) => sidesOf(value)[0]).map(triple));

/** The closure orbit of a seed valuation under a rule list, ending at its fixed point. */
export function closureOrbit(rules, seed) {
  const initial = cellSet(seed);
  const orbit = [initial];
  const valuation = new Map(initial.map((at) => [address(at), at]));
  const dependents = new Map();
  rules.forEach((r, index) => {
    for (const premise of r.antecedent) {
      const key = address(premise.cell);
      const users = dependents.get(key) ?? new Set();
      users.add(index);
      dependents.set(key, users);
    }
  });
  const fired = new Set();
  let pending = new Set(rules.map((_, index) => index));
  for (let stage = 0; stage <= rules.length; stage += 1) {
    const tellings = [];
    for (const index of pending) {
      if (fired.has(index)) continue;
      const produced = fireRuleIn(rules[index], valuation);
      if (produced.length > 0) {
        fired.add(index);
        tellings.push(...produced);
      }
    }
    const changed = new Set();
    for (const telling of tellings) {
      const key = address(telling);
      const prior = valuation.get(key);
      const joined = prior === undefined ? telling : merge(prior, telling);
      if (prior === undefined || joined.for.length !== prior.for.length || joined.against.length !== prior.against.length) {
        valuation.set(key, joined);
        changed.add(key);
      }
    }
    if (changed.size === 0) return Object.freeze(orbit);
    orbit.push(Object.freeze([...valuation.keys()].sort().map((key) => valuation.get(key))));
    pending = new Set([...changed].flatMap((key) => [...(dependents.get(key) ?? [])]));
  }
  throw new RangeError("signcraft settle: the closure did not reach its fixed point within one stage per rule");
}

/** Settle a presheaf (or a site and valuation) under rules: its orbit, stage by stage, the settled
 *  valuation, the closure ordinal it settled at, and the regime read off that ordinal. */
export function settle(presheaf, rules = []) {
  const orbit = closureOrbit(rules, lastValuation(presheaf));
  const stages = Object.freeze(orbit.map((valuation, stage) => Object.freeze({ stage, valuation, designated: designatedCells(valuation) })));
  const settledAt = orbit.length - 1;
  return Object.freeze({
    kind: "signcraft.settlement",
    site: presheaf.site,
    rules: Object.freeze([...rules]),
    stages,
    settled: orbit[settledAt],
    settledAt,
    regime: closureRegimeName(regimeOfOrdinal(ofNat(settledAt), true, true)),
  });
}

/**
 * Whether a settlement is admitted by its base's own law (Obsmetrologia Settlement.lean: a settlement is
 * content over a base admitted by the base's law; Closure/RuleSystem.lean: T_S v = v ⊔ fire S v, clS its
 * least fixed point above the seed, SClosed S v ⟺ T_S v = v). Replaying the closure orbit of the
 * settlement's rules from its seed (stage 0) must reproduce every stage's valuation by content address,
 * and the settled valuation must be that orbit's last stage — so the content is S-closed and least above
 * the seed. Returns a frozen `{ admitted, reason }`; the reason names the first failing stage.
 */
export function settlementAdmits(settlement) {
  const refuse = (reason) => Object.freeze({ admitted: false, reason });
  const stages = settlement?.stages;
  if (!Array.isArray(stages) || stages.length === 0 || !Array.isArray(settlement.rules)) return refuse("the settlement has no rules or no stages");
  let orbit;
  try {
    orbit = closureOrbit(settlement.rules, stages[0].valuation);
  } catch (error) {
    return refuse(`stage 0: the seed does not replay (${error.message})`);
  }
  const id = (valuation) => semanticId(valuation);
  for (let index = 0; index < Math.max(orbit.length, stages.length); index += 1) {
    const stage = stages[index], replayed = orbit[index];
    if (stage === undefined) return refuse(`stage ${index}: dropped — the closure orbit continues past stage ${index - 1}`);
    if (replayed === undefined) return refuse(`stage ${index}: not in the closure orbit — the valuation at stage ${index - 1} is already S-closed`);
    if (stage.stage !== index) return refuse(`stage ${index}: numbered ${stage.stage}`);
    if (id(stage.valuation) !== id(replayed)) return refuse(`stage ${index}: valuation differs from the replayed closure orbit`);
    if (id(stage.designated) !== id(designatedCells(replayed))) return refuse(`stage ${index}: designated cells differ from the valuation's told cells`);
  }
  if (settlement.settledAt !== stages.length - 1) return refuse(`settledAt ${settlement.settledAt} is not the last stage ${stages.length - 1}`);
  if (id(settlement.settled) !== id(orbit[orbit.length - 1])) return refuse(`settled valuation is not the closure's least fixed point above the seed (stage ${orbit.length - 1})`);
  return Object.freeze({ admitted: true, reason: undefined });
}

/** A settlement as phase evidence: its stages by content address and the finite stage it settled at.
 *  A finite orbit evidences the strict phase. A settlement its own rules do not admit is refused. */
export const settlementEvidence = (settlement, phase = strictFinitePhase) => {
  const admission = settlementAdmits(settlement);
  if (!admission.admitted) throw new TypeError(`signcraft settlementEvidence: settlement not admitted — ${admission.reason}`);
  return phaseEvidence({
    id: semanticId(settlement.stages.map((stage) => stage.designated)),
    phase: phase.id,
    stages: settlement.stages.map((stage) => semanticId(stage.designated)),
    settledAt: settlement.settledAt,
  });
};

/** Posit a valuation over a site and settle it. */
export const settleValuation = (site, valuation, rules = []) => settle(posit(site, valuation), rules);

/** Settle told cells over the site they generate, under `rules` and that site's specialization transport. */
export function settleCells(told, rules = []) {
  const at = site(told);
  return settleValuation(at, told, [...rules, ...transportRules(at)]);
}

/** Settle a site's own cells, each told for by itself, under that site's specialization transport. */
export const settleSite = (at, rules = []) => settleValuation(at, at.cells.map((c) => cell(c.subject, c.predicate, c.object, { for: [triple(c)] })), [...rules, ...transportRules(at)]);

// — reading a section (a settled cell set) —

/** The cells of a section about a subject. */
export const about = (section, subject) => Object.freeze(section.filter((at) => coincides(at.subject, subject)));

/** The cells of a section under a predicate. */
export const under = (section, predicate) => Object.freeze(section.filter((at) => coincides(at.predicate, predicate)));

/** A section's evidence at one triple (the reflexive cell when `object` is omitted); none where it told nothing. */
export const evidenceIn = (section, subject, predicate, object = subject) => evidenceAt(section, { subject, predicate, object });

/** A section's cells split by their knowledge reading. */
export function partition(section) {
  const buckets = Object.fromEntries(readingFamilies.knowledge.map((name) => [name, []]));
  for (const at of section) buckets[readingOfSides("knowledge", ...sidesOf(at))].push(at);
  return Object.freeze(Object.fromEntries(Object.entries(buckets).map(([name, cells]) => [name, Object.freeze(cells)])));
}

/** Relate two settlements: their settled cells joined over the site they generate together, settled
 *  again under both rule lists and that site's transport. */
export function relate(left, right) {
  const told = mergeCellSets(left.settled, right.settled);
  const at = site(told, [...left.site.specializations, ...right.site.specializations]);
  // Names label derivations; distinct premises, thresholds or conclusions may
  // share a name. Only coincident rule content is the same license to fire.
  const rules = [...new Map([...left.rules, ...right.rules, ...transportRules(at)].map((r) => [semanticId(r), r])).values()];
  return settle(posit(at, told), rules);
}

/** The cells a settlement designates at its fixed point. */
export const settledDesignated = (settlement) => settlement.stages[settlement.stages.length - 1].designated;

// — reading a settlement —

/** Split a valuation into its consistent cells and its paraconsistent ones (told both ways). */
export function compare(valuation) {
  const both = (value) => sidesOf(value)[0] && sidesOf(value)[1];
  return Object.freeze({ consistent: Object.freeze(valuation.filter((value) => !both(value))), paraconsistent: Object.freeze(valuation.filter(both)) });
}

const sidesAt = (valuation, at) => { const found = valuation.find((value) => sameCell(value, at)); return found ? sidesOf(found) : [false, false]; };

/**
 * The four cones over a settled site, per cell. Each order has a least reading (the settled telling) and
 * a greatest (every side left unwitnessed presumed told):
 *   knowledge — settle (least) and brim (greatest: an unwitnessed side presumed told);
 *   truth     — adjudicate (least, the settled telling read in the truth order) and presume (greatest:
 *               an unwitnessed for-side presumed told, an unwitnessed against-side presumed untold).
 */
export function cones(settlement) {
  return Object.freeze(settlement.site.cells.map((at) => {
    const [forTold, againstTold] = sidesAt(settlement.settled, at);
    return Object.freeze({
      cell: at,
      settle: readingOfSides("knowledge", forTold, againstTold),
      brim: readingOfSides("knowledge", true, true),
      adjudicate: readingOfSides("truth", forTold, againstTold),
      presume: readingOfSides("truth", true, againstTold),
    });
  }));
}

/** The void: the site's cells whose least and greatest knowledge readings differ — pinned from neither side. */
export const vanish = (settlement) => Object.freeze(cones(settlement).filter((cone) => cone.settle !== cone.brim).map((cone) => cone.cell));

// — the settlement filtration and its reads —
//
// The analysis is mathematics over any carrier and lives once, in metrologic's obstruction/settling
// (carriers compared by content identity). Here the carriers are predication cells, normalized to
// triples; each read delegates and adds signcraft's kind tags.

/**
 * A settlement filtration: stages, each an ordinal (opaque to these reads), a shape (initial, successor,
 * or limit) and its designated cells, and a cofinality. Stage 0 is initial and designated cells never
 * shrink stage to stage. A settlement presents itself as one (finite: an initial stage, then successors);
 * a transfinite settling is presented by giving its limit stages and cofinality explicitly.
 */
export function filtration(stages, cofinality = "countable") {
  const cells = stages.map((stage) => ({ ordinal: stage.ordinal, shape: stage.shape, designated: cellSet((stage.designated ?? []).map((at) => cell(at.subject, at.predicate, at.object))).map(triple) }));
  let presented;
  try {
    presented = settling.filtration(cells, cofinality);
  } catch (error) {
    throw new TypeError(String(error.message).replace(/^filtration:/, "signcraft filtration:"));
  }
  return Object.freeze({ kind: "signcraft.filtration", stages: presented.stages, cofinality: presented.cofinality });
}

/** A settlement's filtration: its finite orbit, stage 0 initial and the rest successors. */
export const filtrationOf = (settlement) => filtration(settlement.stages.map((stage) => ({ ordinal: stage.stage, shape: stage.stage === 0 ? "initial" : "successor", designated: stage.designated })));

const asFiltration = (value) => value.kind === "signcraft.filtration" ? value : filtrationOf(value);

/** Each stage's newly designated cells (all of stage 0's), with the stage they came from. */
export const increments = (value) => Object.freeze(settling.increments(asFiltration(value)).map(({ stage, source, added }) => Object.freeze({ stage, source, added })));

/** The stages that designated something new. */
export const firings = (value) => Object.freeze(increments(value).filter((increment) => increment.added.length > 0));

/** The limit stages. */
export const limitStages = (value) => settling.limitStages(asFiltration(value));

/** The non-Scott firings: cells designated at a limit stage — what no finite stage below it reached. */
export const nonScottFirings = (value) => Object.freeze(firings(value).filter((increment) => increment.source.shape === "limit"));

/** The first cohomology of a settling: one generator per cell a non-Scott firing adds (the obstruction to
 *  Scott-continuity of the closure). */
export function firstCohomology(value) {
  const { degree, generators, rank } = settling.firstCohomology(asFiltration(value));
  return Object.freeze({ kind: "signcraft.firstCohomology", degree, generators, rank, vanishing: rankVanishing(rank) });
}

/** The graded gap: the cells lost to every finite stage, one per non-Scott addition; its rank equals the
 *  first cohomology's. */
export function gradedGap(value) {
  const { lost, rank } = settling.gradedGap(asFiltration(value));
  return Object.freeze({ kind: "signcraft.gradedGap", lost, rank });
}

/** The rank identity between the graded gap and the first cohomology. */
export const gapCohomologyIdentity = (value) => rankIdentity(firstCohomology(value).rank, gradedGap(value).rank);

/** The closure invariant: the non-Scott additions, stage by stage. */
export const closureInvariant = (value) => Object.freeze({ kind: "signcraft.closureInvariant", ...settling.closureInvariant(asFiltration(value)) });

/** Whether two settlings have the same closure invariant (stage for stage, the same cells). */
export const closureEquivalent = (left, right) => settling.closureEquivalent(asFiltration(left), asFiltration(right));

/**
 * A settling's classification: its closure data and the regime read off its closure ordinal
 * (Obsmetrologia `regimeOfOrd`; metrologic's `classify`). Depth is the ordinal of the last firing.
 */
export const classify = (value) => Object.freeze({ kind: "signcraft.classification", ...settling.classify(asFiltration(value)) });

// — the firing pattern of valued firings —

/** Pair a settling's non-Scott firings with the readings they told, in order. */
export function valuedFirings(value, readings) {
  const fired = nonScottFirings(value);
  if (readings.length !== fired.length) throw new RangeError(`signcraft valuedFirings: ${fired.length} firings, ${readings.length} readings`);
  return Object.freeze(fired.map((increment, index) => Object.freeze({ stage: increment.stage, reading: readings[index] })));
}

/**
 * The firing pattern of valued firings (each a stage and the reading it told): how many told for and how
 * many against (the truth and falsity sides of its first cohomology, one generator per firing), how many
 * sit at each reading, the orbit under negation — self-dual when negation fixes every firing (told both
 * ways or neither), one-sided (truth-only, falsity-only) or exchange-mixed when it fixes none, mixed
 * otherwise — and whether the firings are independent (no two at one stage).
 */
export function firingPattern(firings) {
  const sides = firings.map((firing) => sidesOfReading(firing.reading));
  const oneSided = sides.filter(([forTold, againstTold]) => forTold !== againstTold);
  const truthOnly = oneSided.filter(([forTold]) => forTold).length, falsityOnly = oneSided.length - truthOnly;
  const orbit = oneSided.length === 0 ? "self-dual"
    : oneSided.length < sides.length ? "mixed"
    : falsityOnly === 0 ? "truth-only" : truthOnly === 0 ? "falsity-only" : "exchange-mixed";
  const stages = firings.map((firing) => JSON.stringify(firing.stage));
  return Object.freeze({
    kind: "signcraft.firingPattern",
    firings: Object.freeze([...firings]),
    rank: firings.length,
    truthSide: sides.filter(([forTold]) => forTold).length,
    falsitySide: sides.filter(([, againstTold]) => againstTold).length,
    multiplicities: census(firings.map((firing) => firing.reading)),
    orbit,
    independent: new Set(stages).size === stages.length,
  });
}

// — the temporal geometry of a settling —

const sharesTerm = (left, right) => [left.subject, left.object].some((term) => [right.subject, right.object].some((other) => coincides(term, other)));
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/** A firing event: a cell stamped by the stage at which it first fires. Any temporally stamped cell
 *  sequence builds one (a settling's firings, or a membrane with each utterance stamped by position). */
export const firingEvent = (at, stage) => Object.freeze({ kind: "signcraft.firingEvent", cell: triple(at), stage });

/** A settling's firing events: each designated cell with the stage of its first firing. */
export function firingEvents(value) {
  const events = [], seen = new Set();
  increments(value).forEach((increment, stage) => {
    for (const at of increment.added) if (!seen.has(address(at))) { seen.add(address(at)); events.push(firingEvent(at, stage)); }
  });
  return Object.freeze(events);
}

/** The causal order of firing events: the transitive closure of stage-increasing term adjacency
 *  (acyclic, since stages strictly increase along every edge). */
export function causalOrder(events) {
  const reach = events.map((earlier) => events.map((later) => earlier.stage < later.stage && sharesTerm(earlier.cell, later.cell)));
  for (let mid = 0; mid < events.length; mid += 1) for (let from = 0; from < events.length; from += 1) {
    if (!reach[from][mid]) continue;
    for (let to = 0; to < events.length; to += 1) if (reach[mid][to]) reach[from][to] = true;
  }
  return Object.freeze({ kind: "signcraft.causalOrder", events, precedes: Object.freeze(reach.map((row) => Object.freeze(row.flatMap((reachable, index) => (reachable ? [index] : []))))) });
}

/** The causal order of a settling's own firings. */
export const causalOrderOf = (value) => causalOrder(firingEvents(value));

const eventIndex = (order, at) => order.events.findIndex((event) => sameCell(event.cell, at));

/** Two cells' separation under a causal order: timelike (one precedes the other), spacelike, or an
 *  obstruction naming a cell that never fired. */
export function causalSeparation(order, left, right) {
  const l = eventIndex(order, left), r = eventIndex(order, right);
  if (l < 0) return Object.freeze({ kind: "signcraft.separation-obstruction", missing: triple(left) });
  if (r < 0) return Object.freeze({ kind: "signcraft.separation-obstruction", missing: triple(right) });
  if (order.precedes[l].includes(r)) return Object.freeze({ kind: "signcraft.separation.timelike", earlier: order.events[l], later: order.events[r] });
  if (order.precedes[r].includes(l)) return Object.freeze({ kind: "signcraft.separation.timelike", earlier: order.events[r], later: order.events[l] });
  return Object.freeze({ kind: "signcraft.separation.spacelike", left: order.events[l], right: order.events[r] });
}

/** The cone at a cell: every event causally before it and after it. */
export function causalCone(order, apex) {
  const a = eventIndex(order, apex);
  if (a < 0) return Object.freeze({ kind: "signcraft.cone-obstruction", missing: triple(apex) });
  return Object.freeze({
    kind: "signcraft.cone",
    apex: order.events[a],
    past: Object.freeze(order.events.filter((_, index) => order.precedes[index].includes(a))),
    future: Object.freeze(order.precedes[a].map((index) => order.events[index])),
  });
}

/** The ordering fraction: comparable pairs over all pairs, as an exact reduced fraction. */
export function orderingFraction(order) {
  const count = order.events.length;
  if (count < 2) return Object.freeze({ kind: "signcraft.orderingFraction-obstruction", eventCount: count });
  let comparable = 0;
  for (let left = 0; left < count; left += 1) for (let right = left + 1; right < count; right += 1) {
    if (order.precedes[left].includes(right) || order.precedes[right].includes(left)) comparable += 1;
  }
  const total = (count * (count - 1)) / 2, divisor = gcd(comparable, total) || 1;
  return Object.freeze({ kind: "signcraft.orderingFraction", comparablePairs: comparable, totalPairs: total, fraction: Object.freeze({ numerator: comparable / divisor, denominator: total / divisor }) });
}

// — the settling as a diagram —

/** A settling as a state machine: its stages are the states, each firing a transition from the stage
 *  before into the stage it designated cells at. */
export function settlementDiagram(value) {
  const { stages } = asFiltration(value);
  const stageId = (index) => `stage:${index}`;
  return presentedCategoryDiagram({
    title: "settlement state machine",
    description: "States are settlement stages; transitions are firings.",
    diagramKind: "state-machine",
    objects: stages.map((stage, index) => ({ id: stageId(index), kind: "state", label: `stage ${index}`, detail: stage.shape })),
    morphisms: increments(value).flatMap((increment, index) => index === 0 || increment.added.length === 0 ? [] : [{
      id: `firing:${index}`,
      from: stageId(index - 1),
      to: stageId(index),
      kind: "firing",
      label: `${increment.added.length} cell${increment.added.length === 1 ? "" : "s"}`,
    }]),
  });
}

// — the settling as a document —

/** A settlement as a document: its settled cells as addresses in address order, each adjacent pair
 *  ordered, a reference wherever one cell's object is another cell's subject, and each cell's reading
 *  as its valuation site. A carrier (HTML, say) may carry the document; it is not the document. */
export function documentOf(settlement) {
  const cells = settlement.settled;
  if (cells.length === 0) return Object.freeze({ kind: "signcraft.document-obstruction", reason: "empty-settlement" });
  const addresses = Object.freeze(cells.map((at) => Object.freeze({ kind: "signcraft.document.address", key: address(at), cell: triple(at) })).sort((left, right) => left.key.localeCompare(right.key)));
  const references = Object.freeze(addresses.flatMap((from) => {
    if (coincides(from.cell.subject, from.cell.object)) return [];
    const to = addresses.find((candidate) => coincides(candidate.cell.subject, from.cell.object));
    return to === undefined ? [] : [Object.freeze({ kind: "signcraft.document.reference", from: from.key, to: to.key, predicate: from.cell.predicate })];
  }));
  return Object.freeze({
    kind: "signcraft.document",
    settlement,
    addresses,
    order: Object.freeze(addresses.slice(0, -1).map((before, index) => Object.freeze({ kind: "signcraft.document.order", before: before.key, after: addresses[index + 1].key }))),
    references,
    valuationSites: Object.freeze(cells.map((at) => Object.freeze({ kind: "signcraft.document.valuationSite", address: address(at), reading: readingOfSides("knowledge", ...sidesOf(at)), cell: at }))),
  });
}

