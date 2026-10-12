/**
 * four — FOUR, Belnap's four-valued bilattice, as named points: a value domain of the
 * substrate, like the number tower, read by SEN's types, metrologic, SignCell and SignChain.
 *
 * FOUR is the four subsets of {T, F} (Dunn 1976), ordered two ways: knowledge (how much is
 * told) and truth (which way it leans) (Belnap 1977; Ginsberg 1988). A point is its sides
 * (told for, told against); a reading names it in one of several families, and every order,
 * join, meet, negation, conflation and residuated operation here is computed from sides,
 * never tabulated. The twist product builds a bilattice and its linear operations from any
 * residuated lattice (Kalman 1958; Fitting 1994); on the two-element lattice it is FOUR.
 * The Klein four-group of symmetries, the bilattice laws and the two-Boolean evidence wire
 * are checked or carried here too.
 *
 * SEN carries these points as its reading type; SignCell reads a cell's evidence as one of
 * them; SignChain orders the evidence itself, the witness sets, with this algebra.
 */

// — the four points and their readings —
//
// Read through "is the side non-empty?", evidence lands on one of four points — Dunn's (1976) reading of
// a value as the subset of {T, F} told — indexed by its sides (0,0) (1,0) (0,1) (1,1). The points are
// named per reading; a reading is a way of looking at the point, not a second value. The orders
// and operations below combine them.

/** The name families, each in side order (0,0) (1,0) (0,1) (1,1). */
export const readingFamilies = Object.freeze({
  /** Relational: the knowledge order's reading, by what has been told. */
  knowledge: Object.freeze(["absurd", "potential", "active", "stable"]),
  /** Told (Dunn 1976): each point named by which of true and false it has been told. */
  told: Object.freeze(["told none", "told true", "told false", "told both"]),
  /** Logical (Belnap): the truth order's reading. */
  truth: Object.freeze(["neither", "true", "false", "both"]),
  /** Extremal: each point named by the order it is an extreme of — unknown and contested the
   *  knowledge bottom and top, denied and held the truth bottom and top. SEN's reading marks
   *  and claim sessions use these. */
  extremal: Object.freeze(["unknown", "held", "denied", "contested"]),
});

const familyByName = new Map(Object.entries(readingFamilies).flatMap(([family, names]) => names.map((name) => [name, family])));

/** The family a reading's name belongs to. */
export function familyOf(name) {
  const family = familyByName.get(name);
  if (family === undefined) throw new TypeError(`four: unknown reading ${String(name)}`);
  return family;
}

/** The name, in `family`, of the point with these sides told. */
export function readingOfSides(family, forTold, againstTold) {
  const names = readingFamilies[family];
  if (names === undefined) throw new TypeError(`four: unknown reading family ${String(family)}`);
  return names[(forTold ? 1 : 0) + (againstTold ? 2 : 0)];
}

/** The (for told, against told) sides of a reading, in any family. */
export function sidesOfReading(name) {
  const index = readingFamilies[familyOf(name)].indexOf(name);
  return Object.freeze([(index & 1) === 1, (index & 2) === 2]);
}

/** The same point named in another family. */
export const readingAs = (family, name) => readingOfSides(family, ...sidesOfReading(name));

/** A truth value as a point: told for when true, told against when false. */
export const readingOfTruth = (value, family = "knowledge") => readingOfSides(family, !!value, !value);

/** Whether two names, of any families, name the same point. */
export const samePoint = (left, right) => sidesOfReading(left).join() === sidesOfReading(right).join();

/** Whether a string names a point in `family` (any family when omitted). */
export const isReading = (name, family) => familyByName.has(name) && (family === undefined || familyByName.get(name) === family);

/** The JSON Schema of a reading in one family. */
export const readingSchema = (family) => Object.freeze({ enum: readingFamilies[family] });

/** Lift a side rule to readings; the result is named in the left operand's family. */
const onReadings = (combine) => (left, right) => readingOfSides(familyOf(left), ...combine(...sidesOfReading(left), ...sidesOfReading(right)));


/** Readings under the knowledge order: join, meet, order. */
export const knowledgeJoinReading = onReadings((lf, la, rf, ra) => [lf || rf, la || ra]);
export const knowledgeMeetReading = onReadings((lf, la, rf, ra) => [lf && rf, la && ra]);
export const knowledgeLeqReading = (left, right) => samePoint(knowledgeJoinReading(left, right), right);

/** Readings under the truth order: join, meet, order. */
export const truthJoinReading = onReadings((lf, la, rf, ra) => [lf || rf, la && ra]);
export const truthMeetReading = onReadings((lf, la, rf, ra) => [lf && rf, la || ra]);
export const truthLeqReading = (left, right) => samePoint(truthJoinReading(left, right), right);

/** Negation swaps told-for and told-against. */
export const negateReading = (name) => { const [f, a] = sidesOfReading(name); return readingOfSides(familyOf(name), a, f); };

/** Conflation exchanges the told-neither and told-both points, fixing the other two. Defined on
 *  readings only: on witness sets it would need a complement, and the witness universe is open. */
export const conflateReading = (name) => { const [f, a] = sidesOfReading(name); return readingOfSides(familyOf(name), !a, !f); };

// — the twist product: a bilattice and its linear operations from a residuated lattice —

/** The twist product of a residuated lattice (Kalman 1958; Fitting 1994; Busaniche & Cignoli 2014):
 *  pairs (positive, negative) with both orders, negation, and the residuated fusion ⊗ and
 *  implication ⊸. The four points are the twist product of the two-element lattice. */
export function twistProduct({ bottom, top, one, leq, meet, join, fuse, imply }) {
  const value = (positive, negative) => Object.freeze([positive, negative]);
  const lift = (positive, negative) => ({ left: a, right: b }) => value(positive(a[0], b[0]), negative(a[1], b[1]));
  return Object.freeze({
    value,
    knowledgeBottom: value(bottom, bottom), knowledgeTop: value(top, top),
    truthBottom: value(bottom, top), truthTop: value(top, bottom), one: value(one, one),
    meetKnowledge: lift(meet, meet), joinKnowledge: lift(join, join),
    meetTruth: lift(meet, join), joinTruth: lift(join, meet),
    leqKnowledge: ({ left: a, right: b }) => leq(a[0], b[0]) && leq(a[1], b[1]),
    leqTruth: ({ left: a, right: b }) => leq(a[0], b[0]) && leq(b[1], a[1]),
    negate: (a) => value(a[1], a[0]),
    fuse: ({ left: a, right: b }) => value(fuse(a[0], b[0]), meet(imply(a[0], b[1]), imply(b[0], a[1]))),
    imply: ({ left: a, right: b }) => value(meet(imply(a[0], b[0]), imply(b[1], a[1])), fuse(a[0], b[1])),
  });
}

const two = twistProduct({ bottom: false, top: true, one: true, leq: (a, b) => !a || b, meet: (a, b) => a && b, join: (a, b) => a || b, fuse: (a, b) => a && b, imply: (a, b) => !a || b });
const viaTwo = (operation) => (left, right) => readingOfSides(familyOf(left), ...operation({ left: sidesOfReading(left), right: sidesOfReading(right) }));

/** Multiplicative linear logic on the four points: fusion ⊗ and its residuum ⊸ (truth-order adjoint). */
export const fusionReading = viaTwo(two.fuse);
export const residuumReading = viaTwo(two.imply);
/** The multiplicative unit: told both. */
export const linearUnit = (family = "knowledge") => readingOfSides(family, true, true);
/** Linear negation: the residuum into the unit. */
export const linearNegationReading = (name) => residuumReading(name, linearUnit(familyOf(name)));

/** Par ⅋: the De Morgan dual of fusion. */
export const parReading = (left, right) => linearNegationReading(fusionReading(linearNegationReading(left), linearNegationReading(right)));
/** Whether a point is consistent: not told both ways. */
export const isConsistentReading = (name) => !(sidesOfReading(name)[0] && sidesOfReading(name)[1]);
/** Whether fusion and residuum are adjoint at (left, right, bound) in the truth order:
 *  left ⊗ right ≤t bound  iff  left ≤t (right ⊸ bound). */
export const residuationHolds = (left, right, bound) => truthLeqReading(fusionReading(left, right), bound) === truthLeqReading(left, residuumReading(right, bound));

// — lists of readings: census and aggregates —

/** How many of `names` sit at each point, keyed by knowledge name. */
export function census(names) {
  const counts = Object.fromEntries(readingFamilies.knowledge.map((name) => [name, 0]));
  for (const name of names) counts[readingAs("knowledge", name)] += 1;
  return Object.freeze(counts);
}

const presentIn = (counts) => readingFamilies.knowledge.filter((name) => counts[name] > 0);

// The admissibility chain, a third order on the four points beside knowledge and truth:
// stable <= active <= absurd <= potential. Folding independent judgments through its meet gives the
// worst obstruction: any contradiction, else any denial, else anything unsettled, else admitted.
const ADMISSIBILITY_RANK = Object.freeze({ stable: 0, active: 1, absurd: 2, potential: 3 });
/** The admissibility meet of two readings, in the knowledge family. */
export const admissibilityMeetReading = (left, right) => {
  const a = readingAs("knowledge", left), b = readingAs("knowledge", right);
  return ADMISSIBILITY_RANK[a] <= ADMISSIBILITY_RANK[b] ? a : b;
};
/** The admissibility meet of any readings; admitted (potential) when there are none. */
export const admissibilityMeetAll = (names) => names.reduce(admissibilityMeetReading, "potential");
/** Whether a reading is admitted: the top of the admissibility chain. */
export const isAdmittedReading = (name) => readingAs("knowledge", name) === "potential";

/** ∨k over readings: what the whole list has told (empty: absurd). */
export const knowledgeJoinAll = (names, family = "knowledge") => names.reduce(knowledgeJoinReading, readingOfSides(family, false, false));
/** ∧k over readings: what every member told — the consensus (empty: stable, vacuously). */
export const knowledgeMeetAll = (names, family = "knowledge") => names.reduce(knowledgeMeetReading, readingOfSides(family, true, true));
/** ∨t over readings: which way the list leans (empty: absurd — nothing said is not "leans against"). */
export const truthJoinAll = (names, family = "knowledge") => names.length === 0 ? readingOfSides(family, false, false) : names.reduce(truthJoinReading, readingOfSides(family, false, true));

/** The same aggregates read off a census (by idempotence, only which points occur matters). */
export const knowledgeJoinOfCensus = (counts) => knowledgeJoinAll(presentIn(counts));
export const knowledgeMeetOfCensus = (counts) => knowledgeMeetAll(presentIn(counts));
export const truthJoinOfCensus = (counts) => truthJoinAll(presentIn(counts));

// — the Klein four-group of symmetries: identity, negation, conflation, both —

export const gaugeElementNames = Object.freeze(["id", "negation", "conflation", "double"]);

/** Apply a symmetry to a reading. */
export function gauge(element, name) {
  if (element === "negation") return negateReading(name);
  if (element === "conflation") return conflateReading(name);
  if (element === "double") return negateReading(conflateReading(name));
  if (element === "id") return name;
  throw new TypeError(`four: unknown gauge element ${String(element)}`);
}

const points = readingFamilies.knowledge;
const everyPair = (predicate) => points.every((a) => points.every((b) => predicate(a, b)));
const everyTriple = (predicate) => points.every((a) => points.every((b) => points.every((c) => predicate(a, b, c))));

/** The symmetry `left` after `right`. */
export function gaugeMul(left, right) {
  const image = points.map((name) => gauge(left, gauge(right, name)));
  const found = gaugeElementNames.find((element) => points.every((name, index) => gauge(element, name) === image[index]));
  if (found === undefined) throw new TypeError("four: composite is not in the four-group");
  return found;
}

/** How a symmetry acts on the two orders. */
export function gaugeOrderEffect(element) {
  const acts = (leq, flip) => everyPair((a, b) => leq(gauge(element, a), gauge(element, b)) === (flip ? leq(b, a) : leq(a, b)));
  const knowledge = acts(knowledgeLeqReading, false) ? "preserves" : acts(knowledgeLeqReading, true) ? "reverses" : undefined;
  const truth = acts(truthLeqReading, false) ? "preserves" : acts(truthLeqReading, true) ? "reverses" : undefined;
  if (knowledge === undefined || truth === undefined) throw new TypeError(`four: ${element} has no order effect`);
  return knowledge === truth ? `${knowledge}-both` : `${knowledge}-knowledge-${truth}-truth`;
}

/** The points a symmetry fixes. */
export const fixedSet = (element) => Object.freeze(points.filter((name) => gauge(element, name) === name));

/** Checked laws of the four-group of symmetries. */
export function kleinFourGaugeReceipt() {
  const elements = gaugeElementNames;
  const laws = {
    closure: elements.every((l) => elements.every((r) => elements.includes(gaugeMul(l, r)))),
    associative: elements.every((l) => elements.every((m) => elements.every((r) => gaugeMul(gaugeMul(l, m), r) === gaugeMul(l, gaugeMul(m, r))))),
    identity: elements.every((e) => gaugeMul("id", e) === e && gaugeMul(e, "id") === e),
    selfInverse: elements.every((e) => gaugeMul(e, e) === "id"),
    abelian: elements.every((l) => elements.every((r) => gaugeMul(l, r) === gaugeMul(r, l))),
    actionHomomorphism: elements.every((l) => elements.every((r) => points.every((name) => gauge(gaugeMul(l, r), name) === gauge(l, gauge(r, name))))),
  };
  if (!Object.values(laws).every(Boolean)) throw new TypeError("four: four-group laws failed");
  return Object.freeze({
    kind: "four.kleinFourGauge:witness", elements, orderFour: true, ...laws, generatedByNegationConflation: gaugeMul("negation", "conflation") === "double",
    negationOrbit: Object.freeze(["potential", "active"]), conflationOrbit: Object.freeze(["absurd", "stable"]),
    negationFixed: fixedSet("negation"), conflationFixed: fixedSet("conflation"),
    orderEffects: Object.freeze(Object.fromEntries(elements.map((e) => [e, gaugeOrderEffect(e)]))),
  });
}

/** Whether a labeling is fixed by a symmetry (a witness), or which of it moves (an obstruction). */
export function firingPatternSelfDuality(labeling, element) {
  const fixed = fixedSet(element);
  const moving = Object.freeze(labeling.filter((name) => !fixed.some((point) => samePoint(point, name))));
  return Object.freeze({ kind: moving.length === 0 ? "four.firingPatternSelfDuality:witness" : "four.firingPatternSelfDuality-obstruction", labeling: Object.freeze([...labeling]), gaugeElement: element, fixed, ...(moving.length ? { moving } : {}) });
}

// — the bilattice laws, checked on the four points —

/** Exhaustive check of the bilattice laws on the readings. */
export function bilatticeLawReceipt() {
  const [kBot, tTop, tBot, kTop] = points;
  const jk = knowledgeJoinReading, mk = knowledgeMeetReading, jt = truthJoinReading, mt = truthMeetReading;
  return Object.freeze({
    kind: "four.bilatticeLaws:witness",
    knowledgeJoinCommutative: everyPair((a, b) => jk(a, b) === jk(b, a)),
    knowledgeMeetCommutative: everyPair((a, b) => mk(a, b) === mk(b, a)),
    knowledgeJoinAssociative: everyTriple((a, b, c) => jk(jk(a, b), c) === jk(a, jk(b, c))),
    knowledgeMeetAssociative: everyTriple((a, b, c) => mk(mk(a, b), c) === mk(a, mk(b, c))),
    knowledgeJoinIdempotent: points.every((a) => jk(a, a) === a),
    knowledgeMeetIdempotent: points.every((a) => mk(a, a) === a),
    knowledgeAbsorptionJoinMeet: everyPair((a, b) => jk(a, mk(a, b)) === a),
    knowledgeAbsorptionMeetJoin: everyPair((a, b) => mk(a, jk(a, b)) === a),
    truthJoinCommutative: everyPair((a, b) => jt(a, b) === jt(b, a)),
    truthMeetCommutative: everyPair((a, b) => mt(a, b) === mt(b, a)),
    truthJoinAssociative: everyTriple((a, b, c) => jt(jt(a, b), c) === jt(a, jt(b, c))),
    truthMeetAssociative: everyTriple((a, b, c) => mt(mt(a, b), c) === mt(a, mt(b, c))),
    knowledgeBottomJoinIdentity: points.every((a) => jk(kBot, a) === a),
    knowledgeTopMeetIdentity: points.every((a) => mk(kTop, a) === a),
    knowledgeBottomLeast: points.every((a) => knowledgeLeqReading(kBot, a)),
    knowledgeTopGreatest: points.every((a) => knowledgeLeqReading(a, kTop)),
    knowledgeMeetDistributesOverKnowledgeJoin: everyTriple((a, b, c) => mk(a, jk(b, c)) === jk(mk(a, b), mk(a, c))),
    truthMeetDistributesOverKnowledgeJoin: everyTriple((a, b, c) => mt(a, jk(b, c)) === jk(mt(a, b), mt(a, c))),
    negationInvolutive: points.every((a) => negateReading(negateReading(a)) === a),
    negationPreservesKnowledgeOrder: everyPair((a, b) => knowledgeLeqReading(negateReading(a), negateReading(b)) === knowledgeLeqReading(a, b)),
    negationReversesTruthOrder: everyPair((a, b) => truthLeqReading(negateReading(a), negateReading(b)) === truthLeqReading(b, a)),
    negationSwapsTruthPoles: negateReading(tTop) === tBot && negateReading(tBot) === tTop,
    negationFixesKnowledgePoles: negateReading(kBot) === kBot && negateReading(kTop) === kTop,
  });
}

// — the evidence wire: a reading as { positiveEvidence, negativeEvidence } —
//
// Content-addressed circuits and effect cells carry a reading as these two
// Booleans, so the two keys are part of already-issued identities. The record
// is only a reading's sides; every order and join below is the readings'.

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }

/** The wire record of a reading's sides. */
export function four(positiveEvidence, negativeEvidence) {
  if (typeof positiveEvidence !== "boolean" || typeof negativeEvidence !== "boolean") {
    fail("malformed-four", "FOUR requires explicit Boolean positiveEvidence and negativeEvidence bits");
  }
  return Object.freeze({ positiveEvidence, negativeEvidence });
}

/** Admit a wire record: exactly the two Boolean keys. */
export function validateFour(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).sort().join(" ") !== "negativeEvidence positiveEvidence") {
    fail("malformed-four", "FOUR must expose exactly positiveEvidence and negativeEvidence");
  }
  return four(value.positiveEvidence, value.negativeEvidence);
}

/** The reading a wire record carries, and the record of a reading. */
export const readingOfWire = (value) => { const checked = validateFour(value); return readingOfSides("truth", checked.positiveEvidence, checked.negativeEvidence); };
export const wireOfReading = (name) => four(...sidesOfReading(name));

/** The four wire records, by reading. */
export const FOUR = Object.freeze(Object.fromEntries(readingFamilies.truth.map((name) => [name, wireOfReading(name)])));

/** Knowledge join and order on wire records. */
export const joinKnowledgeWire = (left, right) => wireOfReading(knowledgeJoinReading(readingOfWire(left), readingOfWire(right)));
export const knowledgeLeqWire = (left, right) => knowledgeLeqReading(readingOfWire(left), readingOfWire(right));

/** Whether `after` covers `before` in the knowledge order: above it, with nothing strictly between. */
export function isKnowledgeCover(before, after) {
  const a = readingOfWire(before), b = readingOfWire(after);
  if (a === b || !knowledgeLeqReading(a, b)) return false;
  return !readingFamilies.truth.some((c) => c !== a && c !== b && knowledgeLeqReading(a, c) && knowledgeLeqReading(c, b));
}

/** Which wire key a knowledge cover sets. */
export function witnessBit(before, after) {
  if (!isKnowledgeCover(before, after)) fail("not-one-wit", "a WIT must be exactly one 0→1 cover transition in the FOUR knowledge order");
  return validateFour(before).positiveEvidence === validateFour(after).positiveEvidence ? "negativeEvidence" : "positiveEvidence";
}

// — the WIT ledger of a step —
//
// Obsmetrologia's FreeEnergyLyapunov: a reading's knowledge height is how many sides are told
// (0, 1 or 2); along the knowledge order each cell's height gain is exactly one commitment (none
// to one side), one mint (one side to both) or one jump (none to both, worth two), and a step's
// flux is commits + mints + 2·jumps (cellFlux_decomposition, stepFlux_decomposition). The flux
// counts wits. Commitments and mints are the reversible spend and jumps the irreversible one, and
// at the closing step the seed's free energy is exactly their sum (budget_splits).

/** A reading's knowledge height: how many of its sides are told. */
export const knowledgeHeight = (name) => sidesOfReading(name).filter(Boolean).length;

/** One cell's move along the knowledge order: "commit", "mint", "jump", or "none" when unchanged. */
export function cellFlux(before, after) {
  if (!knowledgeLeqReading(before, after)) fail("not-knowledge-ascent", "a flux step must climb the knowledge order");
  const from = knowledgeHeight(before), to = knowledgeHeight(after);
  if (from === to) return "none";
  return from === 0 ? (to === 2 ? "jump" : "commit") : "mint";
}

/** The WIT ledger of a step over cells given as [before, after] reading pairs. */
export function witFlux(pairs) {
  const counts = { commits: 0, mints: 0, jumps: 0 };
  for (const [before, after] of pairs) {
    const move = cellFlux(before, after);
    if (move !== "none") counts[`${move}s`] += 1;
  }
  const reversible = counts.commits + counts.mints, irreversible = 2 * counts.jumps;
  return Object.freeze({ ...counts, reversible, irreversible, wits: reversible + irreversible });
}
