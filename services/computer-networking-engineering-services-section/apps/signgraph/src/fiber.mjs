/**
 * SignGraph — predicate fibers and their quantifiers: the hyperdoctrine over a site.
 *
 * Over one predicate, a fiber reads a point of FOUR at each (subject, object)
 * pair of an entity list. The cell moves act on fibers three ways (Lawvere
 * 1969): pullback, and its left and right adjoints ∃ and ∀, which fold the
 * moved-over pairs by an order's join and meet. Converse swaps the pair; the
 * projections collapse it onto its subject or object; specialization restricts
 * to a support. Fibers combine cellwise by SignChain's linear fusion and
 * residuum, and the generators' laws (pullback commuting with both, Frobenius
 * reciprocity for ∃) are checked on fibers.
 */
import { coincides, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { evidenceAt } from "./valuation.mjs";
import { knowledgeBottom, knowledgeTop, truthBottom, truthTop, readingOfSides, samePoint, fusionReading, knowledgeJoinReading, knowledgeMeetReading, residuumReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-services-section/four";

/** An order over readings: join, meet, bottom, top. */
const order = (name, join, meet, bottom, top) => Object.freeze({ kind: "signgraph.order", name, join, meet, bottom, top });
/** The knowledge order: absurd bottom, stable top. */
export const knowledgeOrder = () => order("knowledge", knowledgeJoinReading, knowledgeMeetReading, knowledgeBottom(), knowledgeTop());
/** The truth order: active bottom, potential top. */
export const truthOrder = () => order("truth", truthJoinReading, truthMeetReading, truthBottom(), truthTop());

const samePair = (left, right) => coincides(left[0], right[0]) && coincides(left[1], right[1]);

/** Every ordered (subject, object) pair over an entity list. */
export const allPairs = (entities) => Object.freeze(entities.flatMap((subject) => entities.map((object) => Object.freeze([subject, object]))));

/** A fiber over `label`: `read(subject, object)` at each listed pair; unlisted pairs read absurd. */
export function predicateFiber(label, entities, read, pairs = allPairs(entities)) {
  const values = pairs.map((pair) => Object.freeze({ pair, value: read(pair[0], pair[1]) }));
  const at = (subject, object) => values.find((entry) => samePair(entry.pair, [subject, object]))?.value ?? readingOfSides("knowledge", false, false);
  return Object.freeze({ kind: "signgraph.fiber", label, entities: Object.freeze([...entities]), pairs: Object.freeze([...pairs]), at });
}

/** The fiber a valuation carries over one predicate, read in the knowledge order. */
export const fiberOfValuation = (valuation, predicate, entities) => predicateFiber(predicate, entities, (subject, object) => knowledgeReading(evidenceAt(valuation, { subject, predicate, object })));

const cellwise = (operation) => (left, right, pairs = left.pairs) => predicateFiber(left.label, left.entities, (s, o) => operation(left.at(s, o), right.at(s, o)), pairs);
const sameFiber = (left, right, pairs = left.pairs) => pairs.every(([s, o]) => samePoint(left.at(s, o), right.at(s, o)));

/** Cellwise linear fusion and residuum of two fibers. */
export const fiberFusion = cellwise(fusionReading);
export const fiberResiduum = cellwise(residuumReading);

/** Whether `left` is below `right` in the truth order at every pair. */
export const fiberLeqTruth = (left, right, pairs = left.pairs) => pairs.every(([s, o]) => samePoint(truthJoinReading(left.at(s, o), right.at(s, o)), right.at(s, o)));

const foldJoin = (ord, values) => values.reduce((acc, item) => ord.join(acc, item), ord.bottom);
const foldMeet = (ord, values) => values.reduce((acc, item) => ord.meet(acc, item), ord.top);
const generator = (name, domain, codomain, pullback, exists, forall) => Object.freeze({ kind: "signgraph.generator", generator: name, domain, codomain, pullback, exists, forall });

/** Converse: pullback, ∃ and ∀ all read the swapped pair. */
export function converse(entities) {
  const pairs = allPairs(entities);
  const swapped = (source) => predicateFiber(source.label, source.entities, (s, o) => source.at(o, s), pairs);
  return generator("converse", pairs, pairs, swapped, (_ord, source) => swapped(source), (_ord, source) => swapped(source));
}

/** Subject projection: pullback reads (s, s); ∃ and ∀ fold a subject's row onto its diagonal. */
export function subjectProjection(entities) {
  const pairs = allPairs(entities);
  return generator("subject-projection", pairs, pairs,
    (source) => predicateFiber(source.label, source.entities, (s) => source.at(s, s), pairs),
    (ord, source) => predicateFiber(source.label, source.entities, (s, o) => coincides(s, o) ? foldJoin(ord, source.entities.map((item) => source.at(s, item))) : ord.bottom, pairs),
    (ord, source) => predicateFiber(source.label, source.entities, (s, o) => coincides(s, o) ? foldMeet(ord, source.entities.map((item) => source.at(s, item))) : ord.top, pairs));
}

/** Object projection: pullback reads (o, o); ∃ and ∀ fold an object's column onto its diagonal. */
export function objectProjection(entities) {
  const pairs = allPairs(entities);
  return generator("object-projection", pairs, pairs,
    (source) => predicateFiber(source.label, source.entities, (_s, o) => source.at(o, o), pairs),
    (ord, source) => predicateFiber(source.label, source.entities, (s, o) => coincides(s, o) ? foldJoin(ord, source.entities.map((item) => source.at(item, o))) : ord.bottom, pairs),
    (ord, source) => predicateFiber(source.label, source.entities, (s, o) => coincides(s, o) ? foldMeet(ord, source.entities.map((item) => source.at(item, o))) : ord.top, pairs));
}

/** Specialization: restrict to a support of pairs; ∃ and ∀ extend back by the order's bottom and top. */
export function specialization(entities, support, ambient = allPairs(entities)) {
  const inSupport = (s, o) => support.some((pair) => samePair(pair, [s, o]));
  return generator("specialization", ambient, Object.freeze([...support]),
    (source) => predicateFiber(source.label, source.entities, (s, o) => source.at(s, o), support),
    (ord, source) => predicateFiber(source.label, source.entities, (s, o) => inSupport(s, o) ? source.at(s, o) : ord.bottom, ambient),
    (ord, source) => predicateFiber(source.label, source.entities, (s, o) => inSupport(s, o) ? source.at(s, o) : ord.top, ambient));
}

/** Whether a generator's pullback commutes with fusion, and with residuum. */
export const generatorPreservesFusion = (gen, left, right) => sameFiber(gen.pullback(fiberFusion(left, right, gen.domain)), fiberFusion(gen.pullback(left), gen.pullback(right), gen.codomain), gen.codomain);
export const generatorPreservesResiduum = (gen, left, right) => sameFiber(gen.pullback(fiberResiduum(left, right, gen.domain)), fiberResiduum(gen.pullback(left), gen.pullback(right), gen.codomain), gen.codomain);

/** Frobenius reciprocity: ∃(pullback(α) ⊗ φ) = α ⊗ ∃(φ). */
export const generatorSatisfiesFrobenius = (gen, ord, alpha, phi) => sameFiber(gen.exists(ord, fiberFusion(gen.pullback(alpha), phi, gen.codomain)), fiberFusion(alpha, gen.exists(ord, phi), gen.domain), gen.domain);
