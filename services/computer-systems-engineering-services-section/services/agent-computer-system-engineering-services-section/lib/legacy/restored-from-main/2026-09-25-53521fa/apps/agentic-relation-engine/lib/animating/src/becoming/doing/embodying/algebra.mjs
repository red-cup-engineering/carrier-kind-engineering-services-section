/**
 * embodying/algebra — name-level reads of the bedrock charge values.
 *
 * Everything here is STATED over relating-experimental's bilattice: the
 * truth/falsity sides come from the bedrock value coordinates, never from a
 * hand-rolled truth table. The four names — absurd / potential / active /
 * stable — mean exactly what the bedrock computes them to mean. The boundary
 * membrane (`./boundary`) reads charges off settled sections through these two
 * directions: name a charge, and read a charge carrier down to its name.
 */

import { chargeValue, chargeValues, joinKnowledgeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

/** Which evidence sides a charge value admits: [truth present, falsity present]. */
export function chargeSidesOf(name) {
  const [truth, falsity] = chargeValue(name).coordinates;
  return [truth.name === "present", falsity.name === "present"];
}

/** The charge value named by a pair of evidence sides. Total: the bilattice covers all four side pairs. */
export function chargeNameOfSides(truthPresent, falsityPresent) {
  for (const value of chargeValues) {
    const [truth, falsity] = value.coordinates;
    if ((truth.name === "present") === truthPresent && (falsity.name === "present") === falsityPresent) {
      return value.name;
    }
  }
  throw new TypeError("chargeNameOfSides: the bilattice is total on side pairs; this is unreachable");
}

/** The canonical bedrock charge value object for a charge value name. */
export function chargeValueNamed(name) {
  return chargeValue(name);
}

/** Read a bedrock charge carrier down to its value name. */
export function chargeNameOfCarrier(carrier) {
  const [truth, falsity] = valueOf(carrier).coordinates;
  return chargeNameOfSides(truth.name === "present", falsity.name === "present");
}

/** Read a bedrock charge carrier down to the canonical charge value object. */
export function chargeValueOfCarrier(carrier) {
  return chargeValueNamed(chargeNameOfCarrier(carrier));
}

/** Knowledge-join a sequence of charge value names. Empty joins to "absurd" (the knowledge bottom). */
export function joinKnowledgeNames(names) {
  let acc = chargeValue("absurd");
  for (const name of names) acc = joinKnowledgeValue(acc, chargeValue(name));
  return acc.name;
}
