import { charge, chargeValue, joinTruth, leqTruth, meetTruth } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

export const chargeStatus = (carrier) => {
  const name = valueOf(carrier).name;
  if (name === "stable") return "ambiguous";
  if (name === "absurd") return "void";
  return "decided";
};

/** Lambek fusion: combine a grammatical predicate and argument in the truth order. */
export const fuse = (left, right) =>
  meetTruth(left, right);

const FOUR = ["absurd", "active", "potential", "stable"];
const valued = (name) => charge(chargeValue(name));

/** Right residual of fusion: largest a in truth order such that a * b <= c. */
export const implies = (b, c) => {
  const bv = valued(valueOf(b).name);
  const cv = valued(valueOf(c).name);
  return FOUR
    .map(valued)
    .filter((a) => leqTruth(fuse(a, bv), cv))
    .reduce((acc, a) => joinTruth(acc, a), valued("active"));
};
