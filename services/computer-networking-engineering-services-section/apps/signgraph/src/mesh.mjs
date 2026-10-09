/**
 * mesh — reading a body of SignCell cells whose positions are terms.
 *
 * A cell (s, p, o) says of s the claim p(_, o): the predicate with its object supplied, waiting
 * for a subject (Frege's unsaturated function). Those claims are the attributes of a formal
 * context whose objects are subjects, and incidence is a cell told for. Because a predicate is
 * itself a term, the same reading applies one level up with predicates as subjects of their own
 * cells, so the cells mesh. Cells here are `{ subject, predicate, object, for, against }` with
 * any extra fields; terms are compared by their canonical JSON.
 *
 * Everything is derived from the cells: a subject's profile, the knowledge reading of each of
 * its claims, how two subjects' readings relate, and the concepts subjects generate.
 */
import { extent, intent, makeContext } from "@red-cup-engineering/metrologic/closure/formal-context";
import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { census } from "@red-cup-engineering/computer-data-services-section/four";

const text = (value) => JSON.stringify(value);

/** The claim a cell makes of its subject: its predicate with its object supplied. */
export const claimOf = (cell) => text([cell.predicate, cell.object]);

/** A subject's profile: the claims its cells make that some witness tells for. */
export function profile(cells) {
  return new Set(cells.filter((cell) => cell.for.length > 0).map(claimOf));
}

/** How settled a body of cells is: the census of their knowledge readings (SignChain). */
export function settledness(cells) {
  return census(cells.map(knowledgeReading));
}

/** How many distinct witnesses tell for the claims of a body of cells, and how many cells rest on one only. */
export function witnessing(cells) {
  const witnesses = new Set(cells.flatMap((cell) => cell.for));
  return Object.freeze({ witnesses: witnesses.size, cells: cells.length, single: cells.filter((cell) => cell.for.length === 1).length });
}

/**
 * The relational predicates of a mesh: those whose objects are mostly terms rather than marks
 * (object properties, in OWL's words, against datatype properties -- a date, an id, a title
 * surface). `reach` is `[{ predicate, cells, termObjects }]`, the predicate as canonical text,
 * counted over the whole mesh.
 */
export function relationalPredicates(reach, { minimumShare = 0.5 } = {}) {
  return new Set(reach.filter((row) => row.cells > 0 && row.termObjects / row.cells >= minimumShare).map((row) => row.predicate));
}

function jaccard(left, right) {
  if (left.size === 0 && right.size === 0) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/**
 * Compare subjects that answer to one name. Each reading is `{ key, cells, ...fields }`;
 * `overlap(leftKey, rightKey)` estimates how much their texts overlap (null when unknown). A pair
 * is `copies` (texts overlap), `same-concept` (claims close to one another though texts differ),
 * `related` (some text or claims shared), or `unconnected` (nothing shared: no evidence either
 * way -- one sense written twice, or one word read in two registers, is for a reader to find).
 */
export function compareReadings({ readings, overlap = () => null } = {}) {
  if (!Array.isArray(readings)) throw new TypeError("readings must be an array");
  const profiled = readings.map((reading) => ({ ...reading, claims: profile(reading.cells) }));
  const pairs = [];
  for (let i = 0; i < profiled.length; i += 1) for (let j = i + 1; j < profiled.length; j += 1) {
    const left = profiled[i], right = profiled[j];
    const textOverlap = overlap(left.key, right.key);
    const claimOverlap = jaccard(left.claims, right.claims);
    const verdict = textOverlap !== null && textOverlap >= 0.5 ? "copies"
      : claimOverlap >= 0.6 && left.claims.size >= 3 && right.claims.size >= 3 ? "same-concept"
      : (textOverlap === null || textOverlap < 0.15) && claimOverlap < 0.1 ? "unconnected"
      : "related";
    pairs.push(Object.freeze({ left: left.key, right: right.key, textOverlap, claimOverlap: Number(claimOverlap.toFixed(3)), verdict,
      shared: Object.freeze([...left.claims].filter((claim) => right.claims.has(claim)).sort().map((claim) => JSON.parse(claim))) }));
  }
  return Object.freeze({
    readings: Object.freeze(profiled.map(({ cells, claims, ...fields }) => Object.freeze({ ...fields, claims: claims.size, settledness: settledness(cells) }))),
    pairs: Object.freeze(pairs),
  });
}

/**
 * The concepts subjects generate: in the formal context whose objects are the subjects and whose
 * attributes are their claims, each subject's concept is (extent, intent) of its profile.
 * Subjects generating one concept are indistinguishable by anything claimed of them (aliases in
 * one register, or subjects too thinly stated to tell apart); a subject whose extent holds
 * another is broader than it. The context is read over the claims at least `minimumSupport`
 * subjects make: a claim one subject alone makes (its date, its id, its own title) sets it apart
 * from everything and says nothing about what it shares, so it carries no concept structure.
 * Given `predicates` (canonical texts, e.g. `relationalPredicates`), only claims through those
 * predicates are read: concepts are then what subjects share in how they relate to other terms.
 * Subjects with fewer than `minimumClaims` such claims are left out.
 * @param {{subjects: Array<{key: string, cells: object[]}>, predicates?: Set<string>|null, minimumClaims?: number, minimumSupport?: number}} input
 */
export function generatedConcepts({ subjects, predicates = null, minimumClaims = 2, minimumSupport = 2 } = {}) {
  if (!Array.isArray(subjects)) throw new TypeError("subjects must be an array");
  const through = (cell) => predicates === null || predicates.has(text(cell.predicate));
  const profiles = subjects.map((subject) => ({ key: subject.key, claims: profile(subject.cells.filter(through)) }));
  const support = new Map();
  for (const { claims } of profiles) for (const claim of claims) support.set(claim, (support.get(claim) ?? 0) + 1);
  const profiled = profiles.map((subject) => ({ key: subject.key, claims: new Set([...subject.claims].filter((claim) => support.get(claim) >= minimumSupport)) }))
    .filter((subject) => subject.claims.size >= minimumClaims);
  const attributes = [...new Set(profiled.flatMap((subject) => [...subject.claims]))].sort();
  const context = makeContext(profiled.map((subject) => subject.key), attributes, profiled.flatMap((subject) => [...subject.claims].map((claim) => [subject.key, claim])));
  const byExtent = new Map();
  const broader = [];
  for (const subject of profiled) {
    const objects = [...extent(context, subject.claims)].sort();
    const key = objects.join("\u0000");
    const group = byExtent.get(key) ?? { intent: [...intent(context, new Set(objects))].sort(), generatedBy: [] };
    group.generatedBy.push(subject.key);
    byExtent.set(key, group);
    const narrower = objects.filter((other) => other !== subject.key);
    if (narrower.length > 0) broader.push(Object.freeze({ subject: subject.key, narrower: Object.freeze(narrower) }));
  }
  const aliases = [...byExtent.values()].filter((group) => group.generatedBy.length > 1)
    .map((group) => Object.freeze({ subjects: Object.freeze(group.generatedBy.sort()), intent: Object.freeze(group.intent.map((claim) => JSON.parse(claim))) }));
  return Object.freeze({ subjects: profiled.length, attributes: attributes.length, aliases: Object.freeze(aliases), broader: Object.freeze(broader) });
}
