/**
 * predicating/quantifying — finite fiber quantifiers and hyperdoctrine receipts.
 *
 *
 * A finite fibration is stored as a total base map from source cells to target
 * cells; fibers are derived from the map. Quantifiers are finite joins/meets in
 * the knowledge or truth order, and receipt constructors check the adjunction
 * laws over the finite FOUR-valued valuation space when asked for a law witness.
 */
import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
} from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { orderSwapValue } from "@lenticule-science/metrologic/articulation/predicating/positing/dihedral-gauge";
import {
  finitePredicatingFibration,
  predicatingQuantifyingReceipt,
  finiteConverseFibration,
  predicatingHyperdoctrineReceipt,
  predicatingDualHyperdoctrineReceipt,
} from "@lenticule-science/metrologic/articulation/predicating/quantifying";

const freezeRecord = (record) => Object.freeze({ ...record });

function orderBottom(order) {
  return chargeValue(order === "knowledge" ? "absurd" : "active");
}

function orderTop(order) {
  return chargeValue(order === "knowledge" ? "stable" : "potential");
}

function orderJoin(order, left, right) {
  return order === "knowledge" ? joinKnowledgeValue(left, right) : joinTruthValue(left, right);
}

function orderMeet(order, left, right) {
  return order === "knowledge" ? meetKnowledgeValue(left, right) : meetTruthValue(left, right);
}

export function chargeListJoin(order, values) {
  return chargeValueName(values.map(chargeValue).reduce((acc, value) => orderJoin(order, acc, value), orderBottom(order)));
}

export function chargeListMeet(order, values) {
  return chargeValueName(values.map(chargeValue).reduce((acc, value) => orderMeet(order, acc, value), orderTop(order)));
}

const readValuation = (valuation, point) => valuation[point] ?? "absurd";

export function existsF(fibration, valuation, order) {
  const out = {};
  for (const base of fibration.bases) {
    const fiber = fibration.fibers[base] ?? [];
    out[base] = chargeListJoin(order, fiber.map((point) => readValuation(valuation, point)));
  }
  return freezeRecord(out);
}

export function forallF(fibration, valuation, order) {
  const out = {};
  for (const base of fibration.bases) {
    const fiber = fibration.fibers[base] ?? [];
    out[base] = chargeListMeet(order, fiber.map((point) => readValuation(valuation, point)));
  }
  return freezeRecord(out);
}

export function reindexF(fibration, valuation) {
  const out = {};
  for (const point of fibration.points) out[point] = readValuation(valuation, fibration.baseMap[point]);
  return freezeRecord(out);
}

export function swapValuation(valuation) {
  const out = {};
  for (const [key, name] of Object.entries(valuation)) out[key] = chargeValueName(orderSwapValue(chargeValue(name)));
  return freezeRecord(out);
}


