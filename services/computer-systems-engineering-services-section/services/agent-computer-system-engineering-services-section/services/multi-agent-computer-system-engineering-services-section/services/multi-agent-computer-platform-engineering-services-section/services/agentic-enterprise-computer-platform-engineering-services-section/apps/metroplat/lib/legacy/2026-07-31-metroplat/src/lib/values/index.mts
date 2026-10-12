/**
 * values is the pure four-valued charge algebra: two evidence bits, for and against, forming unknown, held, denied, and contested.
 * It imports nothing and may be imported by every other src/lib directory.
 */

/** A charge bit says whether one side of evidence is present. */
export type ChargeSideName = "absent" | "present";

/** The four value names determined by the for/against evidence bits. */
export type ChargeValueName = "unknown" | "held" | "denied" | "contested";

/** One evidence bit in a charge coordinate. */
export interface ChargeSide {
  readonly kind: "charge.side";
  readonly name: ChargeSideName;
}

/** A charge coordinate is [for, against]. */
export type ChargeCoordinates = readonly [forEvidence: ChargeSide, againstEvidence: ChargeSide];

/** A named point of the four-valued charge algebra. */
export interface ChargeValue {
  readonly kind: "charge.value";
  readonly name: ChargeValueName;
  readonly coordinates: ChargeCoordinates;
}

/** A charge is a value carried as its two evidence bits. */
export interface Charge {
  readonly kind: "charge";
  readonly value: ChargeCoordinates;
}

/** The finite algebra of the charge values. */
export interface ChargeFiniteAlgebra {
  readonly kind: "charge.finiteAlgebra";
  readonly sides: readonly ChargeSide[];
  readonly values: readonly ChargeValue[];
}

/** An ordered pair of charges. */
export interface ChargePair {
  readonly left: Charge;
  readonly right: Charge;
}

/**
 * Faithful counting evidence before its lossy FOUR-valued readout.
 *
 * This realizes Obsmetrologia's `Record = ℕ × ℕ`: `pos` counts evidence for
 * and `neg` counts evidence against. Unlike {@link Charge}, multiplicity is
 * retained rather than compacted to presence/absence.
 */
export interface EvidenceRecord {
  readonly kind: "evidence.record";
  readonly pos: number;
  readonly neg: number;
}

/** A seat's contribution to a cell: one side of evidence. */
export type Evidence = "for" | "against";

export const evidenceNames: readonly Evidence[] =
  Object.freeze(["for", "against"] as const satisfies readonly Evidence[]);

export function isEvidence(value: string): value is Evidence {
  return (evidenceNames as readonly string[]).includes(value);
}

/** The charge value a single piece of evidence contributes: for -> held, against -> denied. */
export function chargeValueNameOfEvidence(evidence: Evidence): ChargeValueName {
  return evidence === "for" ? "held" : "denied";
}

/** The evidence a one-sided charge value carries; unknown carries none and
 *  contested carries both, so neither is a single seat's stance. */
export function evidenceOfChargeValueName(name: ChargeValueName): readonly Evidence[] {
  switch (name) {
    case "unknown": return Object.freeze([]);
    case "held": return Object.freeze(["for"] as const);
    case "denied": return Object.freeze(["against"] as const);
    case "contested": return Object.freeze(["for", "against"] as const);
  }
}

export const chargeSideNames: readonly ChargeSideName[] =
  Object.freeze(["absent", "present"] as const satisfies readonly ChargeSideName[]);

export const chargeValueNames: readonly ChargeValueName[] =
  Object.freeze(["unknown", "held", "denied", "contested"] as const satisfies readonly ChargeValueName[]);

export const chargeSide = (name: ChargeSideName): ChargeSide =>
  Object.freeze({ kind: "charge.side" as const, name });

const chargeCoordinatesByName: { readonly [name in ChargeValueName]: readonly [forEvidence: ChargeSideName, againstEvidence: ChargeSideName] } = {
  unknown: ["absent", "absent"],
  held: ["present", "absent"],
  denied: ["absent", "present"],
  contested: ["present", "present"],
};

export function chargeValue(name: ChargeValueName): ChargeValue {
  const [forEvidence, againstEvidence] = chargeCoordinatesByName[name];
  return Object.freeze({
    kind: "charge.value" as const,
    name,
    coordinates: Object.freeze([chargeSide(forEvidence), chargeSide(againstEvidence)] as const),
  });
}

export const chargeValues: readonly ChargeValue[] = Object.freeze(chargeValueNames.map(chargeValue));

export const chargeFiniteAlgebra: ChargeFiniteAlgebra = Object.freeze({
  kind: "charge.finiteAlgebra" as const,
  sides: Object.freeze(chargeSideNames.map(chargeSide)),
  values: chargeValues,
});

export function chargeValueOfSides(forEvidence: ChargeSideName, againstEvidence: ChargeSideName): ChargeValue {
  const name = chargeValueNames.find((candidate) => {
    const [candidateFor, candidateAgainst] = chargeCoordinatesByName[candidate];
    return candidateFor === forEvidence && candidateAgainst === againstEvidence;
  });
  if (name === undefined) throw new TypeError(`no charge value has coordinates [${forEvidence}, ${againstEvidence}]`);
  return chargeValue(name);
}

export const chargeSideName = (side: ChargeSide): ChargeSideName => side.name;
export const chargeValueName = (value: ChargeValue): ChargeValueName => value.name;

const sameSide = (left: ChargeSide, right: ChargeSide): boolean => left.name === right.name;
const presentSide = (side: ChargeSide): boolean => sameSide(side, chargeSide("present"));
const absentSide = (side: ChargeSide): boolean => sameSide(side, chargeSide("absent"));
const joinSide = (left: ChargeSide, right: ChargeSide): ChargeSide =>
  presentSide(left) || presentSide(right) ? chargeSide("present") : chargeSide("absent");
const meetSide = (left: ChargeSide, right: ChargeSide): ChargeSide =>
  presentSide(left) && presentSide(right) ? chargeSide("present") : chargeSide("absent");
const complementSide = (side: ChargeSide): ChargeSide =>
  presentSide(side) ? chargeSide("absent") : chargeSide("present");
const leqSide = (left: ChargeSide, right: ChargeSide): boolean =>
  absentSide(left) || presentSide(right);

export function isChargeValueName(value: string): value is ChargeValueName {
  return Object.prototype.hasOwnProperty.call(chargeCoordinatesByName, value);
}

export function isChargeSideName(value: string | undefined): value is ChargeSideName {
  return value === "absent" || value === "present";
}

export function isChargeSide(value: object): value is ChargeSide {
  const kind = "kind" in value ? value.kind : undefined;
  const name = "name" in value ? value.name : undefined;
  return kind === "charge.side" && typeof name === "string" && isChargeSideName(name);
}

export function isChargeValue(value: object): value is ChargeValue {
  const kind = "kind" in value ? value.kind : undefined;
  const name = "name" in value ? value.name : undefined;
  const coordinates = "coordinates" in value ? value.coordinates : undefined;
  return kind === "charge.value"
    && typeof name === "string"
    && isChargeValueName(name)
    && Array.isArray(coordinates)
    && coordinates.length === 2
    && typeof coordinates[0] === "object" && coordinates[0] !== null && isChargeSide(coordinates[0])
    && typeof coordinates[1] === "object" && coordinates[1] !== null && isChargeSide(coordinates[1]);
}

export function isCharge(value: object): value is Charge {
  const kind = "kind" in value ? value.kind : undefined;
  const chargeCoordinates = "value" in value ? value.value : undefined;
  return kind === "charge"
    && Array.isArray(chargeCoordinates)
    && chargeCoordinates.length === 2
    && typeof chargeCoordinates[0] === "object" && chargeCoordinates[0] !== null && isChargeSide(chargeCoordinates[0])
    && typeof chargeCoordinates[1] === "object" && chargeCoordinates[1] !== null && isChargeSide(chargeCoordinates[1]);
}

export function asChargeValueName(value: string): ChargeValueName {
  if (!isChargeValueName(value)) {
    throw new TypeError(`not a charge value name: ${JSON.stringify(value)} (expected one of ${chargeValueNames.join(", ")})`);
  }
  return value;
}

export function asChargeValue(value: ChargeValue | ChargeValueName): ChargeValue {
  if (typeof value === "object" && isChargeValue(value)) return value;
  return chargeValue(asChargeValueName(value));
}

export function charge(value: ChargeValue): Charge {
  const [forEvidence, againstEvidence] = value.coordinates;
  return Object.freeze({
    kind: "charge" as const,
    value: Object.freeze([forEvidence, againstEvidence] as const),
  });
}

export const present = (c: Charge): ChargeCoordinates => c.value;

export const sameChargeValue = (left: ChargeValue, right: ChargeValue): boolean =>
  left.name === right.name;

export function sameCharge(left: Charge, right: Charge): boolean {
  return sameChargeValue(valueOf(left), valueOf(right));
}

export function valueOf(c: Charge): ChargeValue {
  const [forEvidence, againstEvidence] = c.value;
  return chargeValueOfSides(chargeSideName(forEvidence), chargeSideName(againstEvidence));
}

function evidenceCount(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a nonnegative safe integer`);
  }
  return value;
}

/** Construct one faithful for/against evidence record. */
export function evidenceRecord(pos: number, neg: number): EvidenceRecord {
  return Object.freeze({
    kind: "evidence.record" as const,
    pos: evidenceCount(pos, "positive evidence tally"),
    neg: evidenceCount(neg, "negative evidence tally"),
  });
}

/** Counting merge: testimony accumulates and is never retracted. */
export function addEvidenceRecords(left: EvidenceRecord, right: EvidenceRecord): EvidenceRecord {
  return evidenceRecord(left.pos + right.pos, left.neg + right.neg);
}

/** Knowledge join on evidence records: componentwise maximum. */
export function joinKnowledgeEvidenceRecords(left: EvidenceRecord, right: EvidenceRecord): EvidenceRecord {
  return evidenceRecord(Math.max(left.pos, right.pos), Math.max(left.neg, right.neg));
}

/** Knowledge meet on evidence records: componentwise minimum. */
export function meetKnowledgeEvidenceRecords(left: EvidenceRecord, right: EvidenceRecord): EvidenceRecord {
  return evidenceRecord(Math.min(left.pos, right.pos), Math.min(left.neg, right.neg));
}

/** Truth join on evidence records: more support and less opposition. */
export function joinTruthEvidenceRecords(left: EvidenceRecord, right: EvidenceRecord): EvidenceRecord {
  return evidenceRecord(Math.max(left.pos, right.pos), Math.min(left.neg, right.neg));
}

/** Truth meet on evidence records: less support and more opposition. */
export function meetTruthEvidenceRecords(left: EvidenceRecord, right: EvidenceRecord): EvidenceRecord {
  return evidenceRecord(Math.min(left.pos, right.pos), Math.max(left.neg, right.neg));
}

/**
 * The forced FOUR shadow of an evidence record: positivity of each tally.
 * Multiplicity is intentionally lost here and remains available on the record.
 */
export function chargeOfEvidenceRecord(record: EvidenceRecord): Charge {
  return charge(chargeValueOfSides(record.pos === 0 ? "absent" : "present", record.neg === 0 ? "absent" : "present"));
}

/** Contradiction mass: testimony present on both sides, counted faithfully. */
export function evidenceRecordTopMass(record: EvidenceRecord): number {
  return Math.min(record.pos, record.neg);
}

export const bottom: Charge = charge(chargeValue("unknown"));

export function negate(c: Charge): Charge {
  return Object.freeze({
    kind: "charge" as const,
    value: Object.freeze([c.value[1], c.value[0]] as const),
  });
}

export function conflate(c: Charge): Charge {
  return Object.freeze({
    kind: "charge" as const,
    value: Object.freeze([complementSide(c.value[1]), complementSide(c.value[0])] as const),
  });
}

const combine = (
  forEvidence: (left: ChargeSide, right: ChargeSide) => ChargeSide,
  againstEvidence: (left: ChargeSide, right: ChargeSide) => ChargeSide,
) => (left: Charge, right: Charge): Charge => Object.freeze({
  kind: "charge" as const,
  value: Object.freeze([forEvidence(left.value[0], right.value[0]), againstEvidence(left.value[1], right.value[1])] as const),
});

export const joinKnowledge = combine(joinSide, joinSide);
export const meetKnowledge = combine(meetSide, meetSide);
export const joinTruth = combine(joinSide, meetSide);
export const meetTruth = combine(meetSide, joinSide);

export const joinKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  valueOf(joinKnowledge(charge(left), charge(right)));
export const meetKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  valueOf(meetKnowledge(charge(left), charge(right)));
export const joinTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  valueOf(joinTruth(charge(left), charge(right)));
export const meetTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  valueOf(meetTruth(charge(left), charge(right)));
export const negateValue = (value: ChargeValue): ChargeValue =>
  valueOf(negate(charge(value)));
export const conflateValue = (value: ChargeValue): ChargeValue =>
  valueOf(conflate(charge(value)));

export interface FourCensus {
  readonly unknown: number;
  readonly held: number;
  readonly denied: number;
  readonly contested: number;
}

export function fourCensus(values: readonly ChargeValue[]): FourCensus {
  const census: { -readonly [K in keyof FourCensus]: number } = { unknown: 0, held: 0, denied: 0, contested: 0 };
  for (const value of values) census[value.name] += 1;
  return Object.freeze(census);
}

export function fourCensusOfNames(names: readonly ChargeValueName[]): FourCensus {
  const census: { -readonly [K in keyof FourCensus]: number } = { unknown: 0, held: 0, denied: 0, contested: 0 };
  for (const name of names) census[name] += 1;
  return Object.freeze(census);
}

/** Preserve a FOUR census as the canonical multiplicity-bearing Record:
 * held contributes support, denied contributes opposition, contested
 * contributes one of each, and unknown contributes neither. */
export function evidenceRecordOfFourCensus(census: FourCensus): EvidenceRecord {
  return evidenceRecord(census.held + census.contested, census.denied + census.contested);
}

export const knowledgeAggregate = (values: readonly ChargeValue[]): ChargeValue =>
  values.reduce((accumulated, value) => joinKnowledgeValue(accumulated, value), chargeValue("unknown"));

export function knowledgeAggregateOfCensus(census: FourCensus): ChargeValueName {
  const hasFor = census.held > 0;
  const hasAgainst = census.denied > 0;
  if (census.contested > 0 || (hasFor && hasAgainst)) return "contested";
  if (hasFor) return "held";
  if (hasAgainst) return "denied";
  return "unknown";
}

export const truthAggregate = (values: readonly ChargeValue[]): ChargeValue =>
  values.length === 0 ? chargeValue("unknown") : values.reduce((leaning, value) => joinTruthValue(leaning, value), chargeValue("denied"));

export function truthAggregateOfCensus(census: FourCensus): ChargeValueName {
  const total = census.unknown + census.held + census.denied + census.contested;
  const anyFor = census.held > 0 || census.contested > 0;
  const allAgainst = total > 0 && census.held === 0 && census.unknown === 0;
  if (anyFor && allAgainst) return "contested";
  if (anyFor) return "held";
  if (allAgainst) return "denied";
  return "unknown";
}

export const knowledgeMeet = (values: readonly ChargeValue[]): ChargeValue =>
  values.reduce((shared, value) => meetKnowledgeValue(shared, value), chargeValue("contested"));

export function knowledgeMeetOfCensus(census: FourCensus): ChargeValueName {
  const everyForPresent = census.denied === 0 && census.unknown === 0;
  const everyAgainstPresent = census.held === 0 && census.unknown === 0;
  if (everyForPresent && everyAgainstPresent) return "contested";
  if (everyForPresent) return "held";
  if (everyAgainstPresent) return "denied";
  return "unknown";
}

export function leqKnowledge(left: Charge, right: Charge): boolean {
  return leqSide(left.value[0], right.value[0]) && leqSide(left.value[1], right.value[1]);
}

export function compareKnowledge(pair: ChargePair): Charge {
  if (!leqKnowledge(pair.left, pair.right)) {
    throw new TypeError("compareKnowledge: no knowledge-order witness; left has knowledge not present in right");
  }
  return pair.right;
}

export const aggregate = (pair: ChargePair): Charge => joinKnowledge(pair.left, pair.right);

export function leqTruth(left: Charge, right: Charge): boolean {
  return leqSide(left.value[0], right.value[0]) && leqSide(right.value[1], left.value[1]);
}

const everyCharge = (predicate: (a: ChargeValue) => boolean): boolean =>
  chargeValues.every(predicate);

const everyChargePair = (predicate: (a: ChargeValue, b: ChargeValue) => boolean): boolean =>
  chargeValues.every((a) => chargeValues.every((b) => predicate(a, b)));

const everyChargeTriple = (predicate: (a: ChargeValue, b: ChargeValue, c: ChargeValue) => boolean): boolean =>
  chargeValues.every((a) => chargeValues.every((b) => chargeValues.every((c) => predicate(a, b, c))));

const sameNamed = (left: ChargeValue, right: ChargeValue): boolean => sameChargeValue(left, right);

const joinK = (left: ChargeValue, right: ChargeValue): ChargeValue => joinKnowledgeValue(left, right);
const meetK = (left: ChargeValue, right: ChargeValue): ChargeValue => meetKnowledgeValue(left, right);
const joinT = (left: ChargeValue, right: ChargeValue): ChargeValue => joinTruthValue(left, right);
const meetT = (left: ChargeValue, right: ChargeValue): ChargeValue => meetTruthValue(left, right);

export const chargeBilatticeLawReceiptSchema = {
  $id: "metroplat/values/charge-bilattice-law-receipt",
  type: "object",
  title: "ChargeBilatticeLawReceipt",
  description: "Exhaustive finite receipt for the charge bilattice laws.",
} as const;

export interface ChargeBilatticeLawReceipt {
  readonly kind: "charge.laws:witness";
  readonly knowledgeJoinCommutative: boolean;
  readonly knowledgeMeetCommutative: boolean;
  readonly knowledgeJoinAssociative: boolean;
  readonly knowledgeMeetAssociative: boolean;
  readonly knowledgeJoinIdempotent: boolean;
  readonly knowledgeMeetIdempotent: boolean;
  readonly knowledgeAbsorptionJoinMeet: boolean;
  readonly knowledgeAbsorptionMeetJoin: boolean;
  readonly truthJoinCommutative: boolean;
  readonly truthMeetCommutative: boolean;
  readonly truthJoinAssociative: boolean;
  readonly truthMeetAssociative: boolean;
  readonly knowledgeBottomJoinIdentity: boolean;
  readonly knowledgeTopMeetIdentity: boolean;
  readonly knowledgeBottomLeast: boolean;
  readonly knowledgeTopGreatest: boolean;
  readonly knowledgeMeetDistributesOverKnowledgeJoin: boolean;
  readonly truthMeetDistributesOverKnowledgeJoin: boolean;
  readonly negationInvolutive: boolean;
  readonly negationPreservesKnowledgeOrder: boolean;
  readonly negationReversesTruthOrder: boolean;
  readonly negationSwapsTruthPoles: boolean;
  readonly negationFixesKnowledgePoles: boolean;
}

export function chargeBilatticeLawReceipt(): ChargeBilatticeLawReceipt {
  const kBot = chargeValue("unknown");
  const kTop = chargeValue("contested");
  const tBot = chargeValue("denied");
  const tTop = chargeValue("held");
  return Object.freeze({
    kind: "charge.laws:witness" as const,
    knowledgeJoinCommutative: everyChargePair((a, b) => sameNamed(joinK(a, b), joinK(b, a))),
    knowledgeMeetCommutative: everyChargePair((a, b) => sameNamed(meetK(a, b), meetK(b, a))),
    knowledgeJoinAssociative: everyChargeTriple((a, b, c) => sameNamed(joinK(joinK(a, b), c), joinK(a, joinK(b, c)))),
    knowledgeMeetAssociative: everyChargeTriple((a, b, c) => sameNamed(meetK(meetK(a, b), c), meetK(a, meetK(b, c)))),
    knowledgeJoinIdempotent: everyCharge((a) => sameNamed(joinK(a, a), a)),
    knowledgeMeetIdempotent: everyCharge((a) => sameNamed(meetK(a, a), a)),
    knowledgeAbsorptionJoinMeet: everyChargePair((a, b) => sameNamed(joinK(a, meetK(a, b)), a)),
    knowledgeAbsorptionMeetJoin: everyChargePair((a, b) => sameNamed(meetK(a, joinK(a, b)), a)),
    truthJoinCommutative: everyChargePair((a, b) => sameNamed(joinT(a, b), joinT(b, a))),
    truthMeetCommutative: everyChargePair((a, b) => sameNamed(meetT(a, b), meetT(b, a))),
    truthJoinAssociative: everyChargeTriple((a, b, c) => sameNamed(joinT(joinT(a, b), c), joinT(a, joinT(b, c)))),
    truthMeetAssociative: everyChargeTriple((a, b, c) => sameNamed(meetT(meetT(a, b), c), meetT(a, meetT(b, c)))),
    knowledgeBottomJoinIdentity: everyCharge((a) => sameNamed(joinK(kBot, a), a)),
    knowledgeTopMeetIdentity: everyCharge((a) => sameNamed(meetK(kTop, a), a)),
    knowledgeBottomLeast: everyCharge((a) => leqKnowledge(charge(kBot), charge(a))),
    knowledgeTopGreatest: everyCharge((a) => leqKnowledge(charge(a), charge(kTop))),
    knowledgeMeetDistributesOverKnowledgeJoin: everyChargeTriple((a, b, c) =>
      sameNamed(meetK(a, joinK(b, c)), joinK(meetK(a, b), meetK(a, c)))),
    truthMeetDistributesOverKnowledgeJoin: everyChargeTriple((a, b, c) =>
      sameNamed(meetT(a, joinK(b, c)), joinK(meetT(a, b), meetT(a, c)))),
    negationInvolutive: everyCharge((a) => sameNamed(negateValue(negateValue(a)), a)),
    negationPreservesKnowledgeOrder: everyChargePair((a, b) =>
      leqKnowledge(charge(negateValue(a)), charge(negateValue(b))) === leqKnowledge(charge(a), charge(b))),
    negationReversesTruthOrder: everyChargePair((a, b) =>
      leqTruth(charge(negateValue(a)), charge(negateValue(b))) === leqTruth(charge(b), charge(a))),
    negationSwapsTruthPoles: sameNamed(negateValue(tTop), tBot) && sameNamed(negateValue(tBot), tTop),
    negationFixesKnowledgePoles: sameNamed(negateValue(kBot), kBot) && sameNamed(negateValue(kTop), kTop),
  });
}

export function isTop(c: Charge): boolean {
  return presentSide(c.value[0]) && presentSide(c.value[1]);
}

export function isBottom(c: Charge): boolean {
  return absentSide(c.value[0]) && absentSide(c.value[1]);
}

export type GaugeElementName = "id" | "negation" | "conflation" | "double";

export type GaugeOrderEffectName =
  | "preserves-both"
  | "preserves-knowledge-reverses-truth"
  | "reverses-knowledge-preserves-truth"
  | "reverses-both";

export interface KleinFourGaugeReceipt {
  readonly kind: "charge.kleinFourGauge:witness";
  readonly elements: readonly GaugeElementName[];
  readonly orderFour: true;
  readonly closure: true;
  readonly associative: true;
  readonly identity: true;
  readonly selfInverse: true;
  readonly abelian: true;
  readonly actionHomomorphism: true;
  readonly generatedByNegationConflation: true;
  readonly negationOrbit: readonly ChargeValueName[];
  readonly conflationOrbit: readonly ChargeValueName[];
  readonly negationFixed: readonly ChargeValueName[];
  readonly conflationFixed: readonly ChargeValueName[];
  readonly orderEffects: Readonly<Record<GaugeElementName, GaugeOrderEffectName>>;
}

export const gaugeElementNames: readonly GaugeElementName[] =
  Object.freeze(["id", "negation", "conflation", "double"] as const satisfies readonly GaugeElementName[]);

export function gauge(sigma: GaugeElementName, value: ChargeValue): ChargeValue {
  if (sigma === "negation") return negateValue(value);
  if (sigma === "conflation") return conflateValue(value);
  if (sigma === "double") return negateValue(conflateValue(value));
  return value;
}

const gaugePermutation = (sigma: GaugeElementName): readonly ChargeValueName[] =>
  chargeValueNames.map((name) => gauge(sigma, chargeValue(name)).name);

function gaugeElementForPermutation(permutation: readonly ChargeValueName[]): GaugeElementName {
  const found = gaugeElementNames.find((element) => gaugePermutation(element).every((image, index) => image === permutation[index]));
  if (!found) throw new TypeError("gaugeElementForPermutation: permutation is not in K4");
  return found;
}

export function gaugeMul(left: GaugeElementName, right: GaugeElementName): GaugeElementName {
  return gaugeElementForPermutation(chargeValueNames.map((name) => gauge(left, gauge(right, chargeValue(name))).name));
}

export function gaugeOrderEffect(element: GaugeElementName): GaugeOrderEffectName {
  const preservesKnowledge = everyChargePair((a, b) =>
    leqKnowledge(charge(gauge(element, a)), charge(gauge(element, b))) === leqKnowledge(charge(a), charge(b)));
  const reversesKnowledge = everyChargePair((a, b) =>
    leqKnowledge(charge(gauge(element, a)), charge(gauge(element, b))) === leqKnowledge(charge(b), charge(a)));
  const preservesTruth = everyChargePair((a, b) =>
    leqTruth(charge(gauge(element, a)), charge(gauge(element, b))) === leqTruth(charge(a), charge(b)));
  const reversesTruth = everyChargePair((a, b) =>
    leqTruth(charge(gauge(element, a)), charge(gauge(element, b))) === leqTruth(charge(b), charge(a)));
  if (preservesKnowledge && preservesTruth) return "preserves-both";
  if (preservesKnowledge && reversesTruth) return "preserves-knowledge-reverses-truth";
  if (reversesKnowledge && preservesTruth) return "reverses-knowledge-preserves-truth";
  if (reversesKnowledge && reversesTruth) return "reverses-both";
  throw new TypeError(`gaugeOrderEffect: ${element} has no K4 order effect`);
}

export const fixedSet = (sigma: GaugeElementName): readonly ChargeValue[] =>
  Object.freeze(chargeValues.filter((value) => sameChargeValue(gauge(sigma, value), value)));

const sameGauge = (left: GaugeElementName, right: GaugeElementName): boolean => left === right;

export function kleinFourGaugeReceipt(): KleinFourGaugeReceipt {
  const closure = gaugeElementNames.every((left) => gaugeElementNames.every((right) => gaugeElementNames.includes(gaugeMul(left, right))));
  const associative = gaugeElementNames.every((left) => gaugeElementNames.every((middle) => gaugeElementNames.every((right) =>
    sameGauge(gaugeMul(gaugeMul(left, middle), right), gaugeMul(left, gaugeMul(middle, right))))));
  const identity = gaugeElementNames.every((element) => gaugeMul("id", element) === element && gaugeMul(element, "id") === element);
  const selfInverse = gaugeElementNames.every((element) => gaugeMul(element, element) === "id");
  const abelian = gaugeElementNames.every((left) => gaugeElementNames.every((right) => gaugeMul(left, right) === gaugeMul(right, left)));
  const actionHomomorphism = gaugeElementNames.every((left) => gaugeElementNames.every((right) => chargeValues.every((value) =>
    sameChargeValue(gauge(gaugeMul(left, right), value), gauge(left, gauge(right, value))))));
  const generatedByNegationConflation = gaugeElementNames.every((element) =>
    element === "id" || element === "negation" || element === "conflation" || gaugeMul("negation", "conflation") === element);

  if (!closure || !associative || !identity || !selfInverse || !abelian || !actionHomomorphism || !generatedByNegationConflation) {
    throw new TypeError("kleinFourGaugeReceipt: K4 finite group laws failed");
  }

  return Object.freeze({
    kind: "charge.kleinFourGauge:witness" as const,
    elements: gaugeElementNames,
    orderFour: true as const,
    closure: true as const,
    associative: true as const,
    identity: true as const,
    selfInverse: true as const,
    abelian: true as const,
    actionHomomorphism: true as const,
    generatedByNegationConflation: true as const,
    negationOrbit: Object.freeze(["held", "denied"] as const),
    conflationOrbit: Object.freeze(["unknown", "contested"] as const),
    negationFixed: Object.freeze(fixedSet("negation").map((value) => value.name)),
    conflationFixed: Object.freeze(fixedSet("conflation").map((value) => value.name)),
    orderEffects: Object.freeze(Object.fromEntries(
      gaugeElementNames.map((element) => [element, gaugeOrderEffect(element)]),
    ) as Record<GaugeElementName, GaugeOrderEffectName>),
  });
}

export interface FiringPatternSelfDualityWitness {
  readonly kind: "charge.firingPatternSelfDuality:witness";
  readonly labeling: readonly ChargeValue[];
  readonly gaugeElement: GaugeElementName;
  readonly fixed: readonly ChargeValue[];
}

export interface FiringPatternSelfDualityObstruction {
  readonly kind: "charge.firingPatternSelfDuality-obstruction";
  readonly labeling: readonly ChargeValue[];
  readonly gaugeElement: GaugeElementName;
  readonly fixed: readonly ChargeValue[];
  readonly moving: readonly ChargeValue[];
}

export type FiringPatternSelfDualityJudgment = FiringPatternSelfDualityWitness | FiringPatternSelfDualityObstruction;

export function firingPatternSelfDuality(labeling: readonly ChargeValue[], sigma: GaugeElementName): FiringPatternSelfDualityJudgment {
  const fixed = fixedSet(sigma);
  const moving = Object.freeze(labeling.filter((value) => !fixed.some((fixedValue) => sameChargeValue(fixedValue, value))));
  return moving.length === 0
    ? Object.freeze({ kind: "charge.firingPatternSelfDuality:witness" as const, labeling: Object.freeze([...labeling]), gaugeElement: sigma, fixed })
    : Object.freeze({ kind: "charge.firingPatternSelfDuality-obstruction" as const, labeling: Object.freeze([...labeling]), gaugeElement: sigma, fixed, moving });
}

export interface ChargeValueIdentityWitness {
  readonly kind: "charge.valueIdentity:witness";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
}

export interface ChargeValueIdentityObstruction {
  readonly kind: "charge.valueIdentity-obstruction";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
}

export type ChargeValueIdentityJudgment = ChargeValueIdentityWitness | ChargeValueIdentityObstruction;

export function chargeValueIdentity(left: ChargeValue, right: ChargeValue): ChargeValueIdentityJudgment {
  return sameChargeValue(left, right)
    ? Object.freeze({ kind: "charge.valueIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "charge.valueIdentity-obstruction" as const, left, right });
}

export interface OrderLeqWitness {
  readonly kind: "charge.orderLeq:witness";
  readonly order: "knowledge" | "truth";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly join: ChargeValue;
}

export interface OrderLeqObstruction {
  readonly kind: "charge.orderLeq-obstruction";
  readonly order: "knowledge" | "truth";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly join: ChargeValue;
}

export type OrderLeqJudgment = OrderLeqWitness | OrderLeqObstruction;

const orderLeq = (
  order: "knowledge" | "truth",
  join: (left: ChargeValue, right: ChargeValue) => ChargeValue,
) => (left: ChargeValue, right: ChargeValue): OrderLeqJudgment => {
  const joined = join(left, right);
  return sameChargeValue(joined, right)
    ? Object.freeze({ kind: "charge.orderLeq:witness" as const, order, left, right, join: joined })
    : Object.freeze({ kind: "charge.orderLeq-obstruction" as const, order, left, right, join: joined });
};

export const knowledgeLeq = orderLeq("knowledge", joinKnowledgeValue);
export const truthLeq = orderLeq("truth", joinTruthValue);

export { uniqueSortedStrings } from "./unique-sorted-strings.mts";
