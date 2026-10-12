import { mark } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/mark";
import { negate, witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

const isMark = (value) =>
  typeof value === "object" && value !== null && "kind" in value && value.kind === "utterance.mark";

const witnessMark = (witness) => isMark(witness) ? witness : mark(witness);

export const compliant = (witness) =>
  witnessedPotential(witnessMark(witness));

export const violation = (witness) =>
  negate(compliant(witness));
