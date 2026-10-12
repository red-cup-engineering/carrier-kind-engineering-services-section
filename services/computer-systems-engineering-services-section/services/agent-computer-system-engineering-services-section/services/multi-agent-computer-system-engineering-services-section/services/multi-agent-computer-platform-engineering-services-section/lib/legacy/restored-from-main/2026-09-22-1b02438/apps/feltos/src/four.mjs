import {
  chargeValue,
  chargeValueNames,
  joinKnowledgeValue,
} from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

// FeltOS has already stored and exposed this four-word alphabet. This is a
// boundary translation only: coordinates and every algebraic operation remain
// the Data charge carrier.
const chargeNameByFeltosName = Object.freeze({
  neither: "absurd",
  true: "potential",
  false: "active",
  both: "stable",
});
const feltosNameByChargeName = Object.freeze(Object.fromEntries(
  Object.entries(chargeNameByFeltosName).map(([feltos, charge]) => [charge, feltos]),
));

function feltosNameForCharge(name) {
  const feltos = feltosNameByChargeName[name];
  if (feltos === undefined) throw new TypeError(`unknown FOUR value: ${String(name)}`);
  return feltos;
}

function fourForChargeName(name) {
  const [truth, falsity] = chargeValue(name).coordinates;
  return Object.freeze({
    positiveEvidence: truth.name === "present",
    negativeEvidence: falsity.name === "present",
  });
}

export const FOUR = Object.freeze(Object.fromEntries(
  Object.entries(chargeNameByFeltosName).map(([feltos, charge]) => [feltos, fourForChargeName(charge)]),
));

export function four(positiveEvidence, negativeEvidence) {
  if (typeof positiveEvidence !== "boolean" || typeof negativeEvidence !== "boolean") {
    throw new TypeError("FOUR evidence coordinates must be Boolean");
  }
  return positiveEvidence ? (negativeEvidence ? FOUR.both : FOUR.true) : (negativeEvidence ? FOUR.false : FOUR.neither);
}

/** Admit an old FeltOS wire value, or a Data charge name arriving from a sign claim. */
export function fourNamed(name) {
  if (typeof name !== "string") throw new TypeError(`unknown FOUR value: ${String(name)}`);
  if (name in FOUR) return FOUR[name];
  if (chargeValueNames.includes(name)) return FOUR[feltosNameForCharge(name)];
  throw new TypeError(`unknown FOUR value: ${String(name)}`);
}

export function validateFour(value) {
  if (value === null || typeof value !== "object") throw new TypeError("FOUR value must be an evidence pair");
  return four(value.positiveEvidence, value.negativeEvidence);
}

export function fourName(value) {
  const normalized = validateFour(value);
  return normalized.positiveEvidence ? (normalized.negativeEvidence ? "both" : "true") : (normalized.negativeEvidence ? "false" : "neither");
}

/** The Data bilattice-charge name (absurd/potential/active/stable) for a FOUR value —
 *  exported so other FeltOS adapters (knowing.mjs) can address knowing's cognizing
 *  vocabulary without re-deriving this boundary mapping. */
export function chargeNameOfFour(value) {
  return chargeNameByFeltosName[fourName(value)];
}

/** Knowledge join is delegated to the Data bilattice; result stays FeltOS wire vocabulary. */
export function joinKnowledge(left, right) {
  return fourForChargeName(joinKnowledgeValue(chargeValue(chargeNameOfFour(left)), chargeValue(chargeNameOfFour(right))).name);
}

export function joinEvidence(values) {
  return values.reduce(joinKnowledge, FOUR.neither);
}
