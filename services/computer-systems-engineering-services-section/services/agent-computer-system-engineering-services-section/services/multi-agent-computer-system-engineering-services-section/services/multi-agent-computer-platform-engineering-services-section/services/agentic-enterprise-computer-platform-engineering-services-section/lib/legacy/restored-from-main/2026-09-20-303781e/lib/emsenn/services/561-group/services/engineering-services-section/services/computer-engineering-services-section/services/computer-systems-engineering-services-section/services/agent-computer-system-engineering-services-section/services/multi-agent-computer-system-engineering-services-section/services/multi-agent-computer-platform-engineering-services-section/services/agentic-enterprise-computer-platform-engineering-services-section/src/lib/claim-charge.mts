/**
 * claim-charge is the agentic-enterprise wire vocabulary over Articulating's canonical FOUR algebra:
 * unknown, held, denied, contested. It is the shared claim/evidence charge both this section's own
 * apps (MetroPlat's claims family, FeltOS's session/settling claims) need, so it seats here rather
 * than inside either app — an app composes capabilities, it does not originate them.
 */
import * as canonical from "@lenticule-science/articulating/predicating/positing/bilattice-charge";
const canonicalNames = { unknown: "absurd", held: "potential", denied: "active", contested: "stable" } as const;
const wireNames = { absurd: "unknown", potential: "held", active: "denied", stable: "contested" } as const;
export const toArticulatingName = (name: ChargeValueName): canonical.ChargeValueName => canonicalNames[name];
export const fromArticulatingName = (name: canonical.ChargeValueName): ChargeValueName => wireNames[name];
export const toArticulatingValue = (value: ChargeValue): canonical.ChargeValue => canonical.chargeValue(toArticulatingName(value.name));
export function fromArticulatingValue(value: canonical.ChargeValue): ChargeValue {
  return Object.freeze({ kind: "charge.value", name: fromArticulatingName(value.name), coordinates: Object.freeze([chargeSide(value.coordinates[0].name), chargeSide(value.coordinates[1].name)] as const) });
}
const canonicalCensus = (c: FourCensus): canonical.FourCensus => ({ absurd: c.unknown, potential: c.held, active: c.denied, stable: c.contested });
/** Receipts contain only finite algebra vocabulary; application payloads never cross this mapping.
 *  Exported so a consumer wrapping a canonical Articulating receipt under the wire vocabulary can
 *  reuse this same boundary translation instead of forking it. */
export function wireReceipt<T>(value: unknown): T {
  if (typeof value === "string")
    return (Object.hasOwn(wireNames, value) ? wireNames[value as keyof typeof wireNames] : value.replace(/^bilattice-charge[.]/, "charge.")) as T;
  if (Array.isArray(value))
    return Object.freeze(value.map((item) => wireReceipt(item))) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "theorem").map(([key, item]) => [key, wireReceipt(item)]))) as T;
  return value as T;
}
/**
 * claim-charge is the pure four-valued charge algebra: two evidence bits, for and against, forming unknown, held, denied, and contested.
 * Its public wire vocabulary remains stable while Articulating owns the algebra.
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
export type ChargeCoordinates = readonly [
  forEvidence: ChargeSide,
  againstEvidence: ChargeSide
];
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
export const evidenceNames: readonly Evidence[] = Object.freeze(["for", "against"] as const satisfies readonly Evidence[]);
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
export const chargeSideNames: readonly ChargeSideName[] = Object.freeze(["absent", "present"] as const satisfies readonly ChargeSideName[]);
export const chargeValueNames: readonly ChargeValueName[] = Object.freeze(["unknown", "held", "denied", "contested"] as const satisfies readonly ChargeValueName[]);
export const chargeSide = (name: ChargeSideName): ChargeSide => Object.freeze({ kind: "charge.side" as const, name });
export const chargeValue = (name: ChargeValueName): ChargeValue => fromArticulatingValue(canonical.chargeValue(toArticulatingName(name)));
export const chargeValues: readonly ChargeValue[] = Object.freeze(chargeValueNames.map(chargeValue));
export const chargeFiniteAlgebra: ChargeFiniteAlgebra = Object.freeze({
  kind: "charge.finiteAlgebra" as const,
  sides: Object.freeze(chargeSideNames.map(chargeSide)),
  values: chargeValues,
});
export function chargeValueOfSides(forEvidence: ChargeSideName, againstEvidence: ChargeSideName): ChargeValue {
  const value = chargeValues.find((v) => v.coordinates[0].name === forEvidence && v.coordinates[1].name === againstEvidence);
  if (!value)
    throw new TypeError(`no charge value has coordinates [${forEvidence}, ${againstEvidence}]`);
  return value;
}
export const chargeSideName = (side: ChargeSide): ChargeSideName => side.name;
export const chargeValueName = (value: ChargeValue): ChargeValueName => value.name;
export const isChargeValueName = (value: string): value is ChargeValueName => Object.hasOwn(canonicalNames, value);
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
  if (typeof value === "object" && isChargeValue(value))
    return value;
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
export const sameChargeValue = (left: ChargeValue, right: ChargeValue): boolean => left.name === right.name;
export function sameCharge(left: Charge, right: Charge): boolean {
  return sameChargeValue(valueOf(left), valueOf(right));
}
export const valueOf = (c: Charge): ChargeValue => chargeValueOfSides(c.value[0].name, c.value[1].name);
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
export const negate = (c: Charge): Charge => charge(negateValue(valueOf(c)));
export const conflate = (c: Charge): Charge => charge(conflateValue(valueOf(c)));
export const joinKnowledge = (left: Charge, right: Charge): Charge => charge(joinKnowledgeValue(valueOf(left), valueOf(right)));
export const meetKnowledge = (left: Charge, right: Charge): Charge => charge(meetKnowledgeValue(valueOf(left), valueOf(right)));
export const joinTruth = (left: Charge, right: Charge): Charge => charge(joinTruthValue(valueOf(left), valueOf(right)));
export const meetTruth = (left: Charge, right: Charge): Charge => charge(meetTruthValue(valueOf(left), valueOf(right)));
export const joinKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  fromArticulatingValue(canonical.joinKnowledgeValue(toArticulatingValue(left), toArticulatingValue(right)));
export const meetKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  fromArticulatingValue(canonical.meetKnowledgeValue(toArticulatingValue(left), toArticulatingValue(right)));
export const joinTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  fromArticulatingValue(canonical.joinTruthValue(toArticulatingValue(left), toArticulatingValue(right)));
export const meetTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  fromArticulatingValue(canonical.meetTruthValue(toArticulatingValue(left), toArticulatingValue(right)));
export const negateValue = (value: ChargeValue): ChargeValue => fromArticulatingValue(canonical.negateValue(toArticulatingValue(value)));
export const conflateValue = (value: ChargeValue): ChargeValue => fromArticulatingValue(canonical.conflateValue(toArticulatingValue(value)));
export interface FourCensus {
  readonly unknown: number;
  readonly held: number;
  readonly denied: number;
  readonly contested: number;
}
export function fourCensus(values: readonly ChargeValue[]): FourCensus {
  const census: {
    -readonly [K in keyof FourCensus]: number;
  } = { unknown: 0, held: 0, denied: 0, contested: 0 };
  for (const value of values)
    census[value.name] += 1;
  return Object.freeze(census);
}
export function fourCensusOfNames(names: readonly ChargeValueName[]): FourCensus {
  const census: {
    -readonly [K in keyof FourCensus]: number;
  } = { unknown: 0, held: 0, denied: 0, contested: 0 };
  for (const name of names)
    census[name] += 1;
  return Object.freeze(census);
}
/** Preserve a FOUR census as the canonical multiplicity-bearing Record:
 * held contributes support, denied contributes opposition, contested
 * contributes one of each, and unknown contributes neither. */
export function evidenceRecordOfFourCensus(census: FourCensus): EvidenceRecord {
  return evidenceRecord(census.held + census.contested, census.denied + census.contested);
}
export const knowledgeAggregate = (values: readonly ChargeValue[]): ChargeValue =>
  fromArticulatingValue(canonical.knowledgeAggregate(values.map(toArticulatingValue)));
export const knowledgeAggregateOfCensus = (census: FourCensus): ChargeValueName =>
  fromArticulatingName(canonical.knowledgeAggregateOfCensus(canonicalCensus(census)));
export const truthAggregate = (values: readonly ChargeValue[]): ChargeValue =>
  fromArticulatingValue(canonical.truthAggregate(values.map(toArticulatingValue)));
export const truthAggregateOfCensus = (census: FourCensus): ChargeValueName =>
  fromArticulatingName(canonical.truthAggregateOfCensus(canonicalCensus(census)));
export const knowledgeMeet = (values: readonly ChargeValue[]): ChargeValue =>
  fromArticulatingValue(canonical.knowledgeMeet(values.map(toArticulatingValue)));
export const knowledgeMeetOfCensus = (census: FourCensus): ChargeValueName =>
  fromArticulatingName(canonical.knowledgeMeetOfCensus(canonicalCensus(census)));
export const leqKnowledge = (left: Charge, right: Charge): boolean =>
  sameChargeValue(joinKnowledgeValue(valueOf(left), valueOf(right)), valueOf(right));
export function compareKnowledge(pair: ChargePair): Charge {
  if (!leqKnowledge(pair.left, pair.right)) {
    throw new TypeError("compareKnowledge: no knowledge-order witness; left has knowledge not present in right");
  }
  return pair.right;
}
export const aggregate = (pair: ChargePair): Charge => joinKnowledge(pair.left, pair.right);
export const leqTruth = (left: Charge, right: Charge): boolean => sameChargeValue(joinTruthValue(valueOf(left), valueOf(right)), valueOf(right));
export const chargeBilatticeLawReceiptSchema = {
  $id: "metroplat/values/charge-bilattice-law-receipt",
  type: "object",
  title: "ChargeBilatticeLawReceipt",
  description: "Exhaustive finite receipt for the charge bilattice laws.",
} as const;
export type ChargeBilatticeLawReceipt = WireReceipt<canonical.ChargeBilatticeLawReceipt>;
export const chargeBilatticeLawReceipt = (): ChargeBilatticeLawReceipt => wireReceipt(canonical.chargeBilatticeLawReceipt());
export const isTop = (c: Charge): boolean => valueOf(c).name === "contested";
export const isBottom = (c: Charge): boolean => valueOf(c).name === "unknown";
export type GaugeElementName = "id" | "negation" | "conflation" | "double";
export type GaugeOrderEffectName = "preserves-both" | "preserves-knowledge-reverses-truth" | "reverses-knowledge-preserves-truth" | "reverses-both";
export type KleinFourGaugeReceipt = WireReceipt<canonical.KleinFourGaugeReceipt>;
export const gaugeElementNames: readonly GaugeElementName[] = Object.freeze(["id", "negation", "conflation", "double"] as const satisfies readonly GaugeElementName[]);
export const gauge = (sigma: GaugeElementName, value: ChargeValue): ChargeValue =>
  sigma === "id" ? value : fromArticulatingValue(canonical.gauge(sigma, toArticulatingValue(value)));
export const gaugeMul = canonical.gaugeMul;
export const gaugeOrderEffect = canonical.gaugeOrderEffect;
export const fixedSet = (sigma: GaugeElementName): readonly ChargeValue[] => Object.freeze(canonical.fixedSet(sigma).map(fromArticulatingValue));
export const kleinFourGaugeReceipt = (): KleinFourGaugeReceipt => wireReceipt(canonical.kleinFourGaugeReceipt());
export type FiringPatternSelfDualityWitness = WireReceipt<canonical.FiringPatternSelfDualityWitness>;
export type FiringPatternSelfDualityObstruction = WireReceipt<canonical.FiringPatternSelfDualityObstruction>;
export type FiringPatternSelfDualityJudgment = WireReceipt<canonical.FiringPatternSelfDualityJudgment>;
export const firingPatternSelfDuality = (labeling: readonly ChargeValue[], sigma: GaugeElementName): FiringPatternSelfDualityJudgment =>
  wireReceipt(canonical.firingPatternSelfDuality(labeling.map(toArticulatingValue), sigma));
export type ChargeValueIdentityWitness = WireReceipt<canonical.ChargeValueIdentityWitness>;
export type ChargeValueIdentityObstruction = WireReceipt<canonical.ChargeValueIdentityObstruction>;
export type ChargeValueIdentityJudgment = WireReceipt<canonical.ChargeValueIdentityJudgment>;
export const chargeValueIdentity = (left: ChargeValue, right: ChargeValue): ChargeValueIdentityJudgment =>
  Object.freeze({ ...wireReceipt<ChargeValueIdentityJudgment>(canonical.chargeValueIdentity(toArticulatingValue(left), toArticulatingValue(right))), left, right });
export type OrderLeqWitness = WireReceipt<canonical.OrderLeqWitness>;
export type OrderLeqObstruction = WireReceipt<canonical.OrderLeqObstruction>;
export type OrderLeqJudgment = WireReceipt<canonical.OrderLeqJudgment>;
export const knowledgeLeq = (left: ChargeValue, right: ChargeValue): OrderLeqJudgment =>
  Object.freeze({ ...wireReceipt<OrderLeqJudgment>(canonical.knowledgeLeq(toArticulatingValue(left), toArticulatingValue(right))), left, right });
export const truthLeq = (left: ChargeValue, right: ChargeValue): OrderLeqJudgment =>
  Object.freeze({ ...wireReceipt<OrderLeqJudgment>(canonical.truthLeq(toArticulatingValue(left), toArticulatingValue(right))), left, right });
type WireReceipt<T> = T extends keyof typeof wireNames ? typeof wireNames[T] : T extends `bilattice-charge.${infer S}` ? `charge.${S}` : T extends readonly unknown[] ? {
  readonly [K in keyof T]: WireReceipt<T[K]>;
} : T extends object ? {
  readonly [K in keyof T as K extends "theorem" ? never : K]: WireReceipt<T[K]>;
} : T;
