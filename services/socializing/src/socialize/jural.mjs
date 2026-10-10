import { knowledgeJoinReading, knowledgeMeetReading, isReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * Hohfeldian relations and their evidence-valued readings.
 *
 * Definition: personal-services-section/emsenn-services-section/content/text/
 * glossary/terms/jural-relation.md, constituent predications and correlative pairing.
 * A correlative exchanges the parties and kind while preserving scope and evidence.
 * It is an involution, not a grant of authority. FOUR joins use articulating's
 * knowledge order; an observation of absence is not an explicit denial.
 *
 * The governance thesis in lakota-services-section/.../lakotaean-governance/
 * questions/what-is-the-theory-of-governance.md requires attribution, binding,
 * and becoming judgments. None follows from the topology of a jural graph.
 */
const isReadingInKnowledge = (name) => isReading(name, "knowledge");

export const JURAL_KINDS = Object.freeze([
  'claim', 'duty', 'privilege', 'no-right', 'power', 'liability', 'immunity', 'disability',
]);

const CORRELATIVE = Object.freeze({
  claim: 'duty', duty: 'claim', privilege: 'no-right', 'no-right': 'privilege',
  power: 'liability', liability: 'power', immunity: 'disability', disability: 'immunity',
});
export function correlativeKind(kind) { return CORRELATIVE[kind]; }
export function correlate(relation) {
  return Object.freeze({ ...relation, kind: correlativeKind(relation.kind), active: relation.passive, passive: relation.active });
}

/** Admission validates structure; callers retain responsibility for evidence provenance. */
export function admitJuralRelations(input) {
  if (!Array.isArray(input)) return Object.freeze({ kind: 'refused', reason: 'expected-array' });
  const relations = [];
  for (const [index, candidate] of input.entries()) {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)
      || !JURAL_KINDS.includes(candidate.kind)
      || typeof candidate.active !== 'string' || candidate.active.length === 0
      || typeof candidate.passive !== 'string' || candidate.passive.length === 0
      || typeof candidate.scope !== 'string'
      || typeof candidate.standing !== 'string' || !isReadingInKnowledge(candidate.standing)) {
      return Object.freeze({ kind: 'refused', reason: 'invalid-relation', index });
    }
    relations.push(Object.freeze({ kind: candidate.kind, active: candidate.active, passive: candidate.passive,
      scope: candidate.scope, standing: candidate.standing }));
  }
  return Object.freeze({ kind: 'admitted', relations: Object.freeze(relations) });
}
/** Tuple encoding preserves component boundaries even when identifiers contain delimiters. */
function key(relation) {
  return JSON.stringify([relation.kind, relation.active, relation.passive, relation.scope]);
}
export function poolJuralRelations(input) {
  const pooled = new Map();
  for (const relation of input) {
    const identity = key(relation);
    const prior = pooled.get(identity);
    pooled.set(identity, Object.freeze({ ...relation, standing: prior === undefined ? relation.standing
      : knowledgeJoinReading((prior.standing), (relation.standing)) }));
  }
  return Object.freeze([...pooled.values()].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

function hasDirectedCycle(nodes, edges) {
  const degree = new Map([...nodes].map(node => [node, 0]));
  for (const targets of edges.values()) for (const target of targets) degree.set(target, degree.get(target) + 1);
  const ready = [...nodes].filter(node => degree.get(node) === 0);
  let visited = 0;
  for (let cursor = 0; cursor < ready.length; cursor += 1) {
    const node = ready[cursor];
    visited += 1;
    for (const target of edges.get(node) ?? []) {
      const remaining = degree.get(target) - 1;
      degree.set(target, remaining);
      if (remaining === 0) ready.push(target);
    }
  }
  return visited !== nodes.size;
}
export function readJuralRelations(input) {
  const relations = poolJuralRelations(input);
  const observers = new Set(relations.flatMap(relation => [relation.active, relation.passive]));
  const powers = relations.filter(relation => relation.kind === 'power' && relation.standing === 'potential');
  const duties = new Set(relations.filter(relation => relation.kind === 'duty' && relation.standing === 'potential').map(key));
  const edges = new Map();
  for (const power of powers) {
    const targets = edges.get(power.active) ?? new Set();
    targets.add(power.passive);
    edges.set(power.active, targets);
  }
  // Self-relations are representable but do not increase dominion over other parties.
  const dominion = Math.max(0, ...[...edges].map(([holder, targets]) => targets.size - Number(targets.has(holder))));
  return Object.freeze({
    kind: 'governance.jural-reading', relations, correlatives: Object.freeze(relations.map(correlate)),
    observers: observers.size, powers: powers.length, dominion,
    concentration: observers.size > 1 ? dominion / (observers.size - 1) : 0,
    accountabilityGap: powers.filter(power => !duties.has(key({ ...power, kind: 'duty' }))).length,
    directedCycle: hasDirectedCycle(observers, edges),
    contested: relations.filter(relation => relation.standing === 'stable').length,
  });
}

/** The thesis's knowledge meet evaluates supplied judgments; it does not manufacture them. */
export function governanceAct(evidence) {
  return Object.freeze({ kind: 'governance.act-reading', ...evidence,
    operativity: knowledgeMeetReading(knowledgeMeetReading((evidence.attribution),
      (evidence.binding)), (evidence.becoming)) });
}
