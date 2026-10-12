/**
 * codecs/host/javascript/evidence — float boundary reads for exact evidence distributions.
 *
 * The analysis/evidence module owns exact histograms and witness/obstruction
 * judgments. This codec boundary reads selected exact rationals as JavaScript
 * numbers for entropy, divergence, and mutual-information bit figures — the
 * inexact float is admitted only here, at the representation boundary, never in
 * the core arithmetic.
 */
import { natIsZero } from "@red-cup-engineering/computer-data-engine/exact-number";
import {
  absoluteContinuity,
  independence,
  type ChargeDistribution,
  type JointChargeDistribution,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/evidence";
import { chargeValues } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { toNumber } from "./numbers/index.mts";

const log2 = (value: number): number => Math.log(value) / Math.log(2);

/** Shannon entropy in bits: a float boundary read of an exact distribution. */
export function entropyBitsAtBoundary(distribution: ChargeDistribution): number {
  return distribution.bins.reduce((sum, bin) => {
    if (natIsZero(bin.count)) return sum;
    const probability = toNumber(bin.probability);
    return sum - probability * log2(probability);
  }, 0);
}

/** Divergence of `from` relative to `to` in bits: a float boundary read.
 * Infinite exactly when `absoluteContinuity(from, to)` obstructs. */
export function klBitsAtBoundary(
  from: ChargeDistribution,
  to: ChargeDistribution,
): number {
  if (absoluteContinuity(from, to).kind === "meme-analysis.evidence.absoluteContinuity-obstruction") {
    return Number.POSITIVE_INFINITY;
  }
  return from.bins.reduce((sum, bin, index) => {
    if (natIsZero(bin.count)) return sum;
    const p = toNumber(bin.probability);
    const q = toNumber(to.bins[index]!.probability);
    return sum + p * log2(p / q);
  }, 0);
}

/** Mutual information in bits: a float boundary read. Zero exactly when
 * `independence(joint)` witnesses. */
export function mutualInformationBitsAtBoundary(joint: JointChargeDistribution): number {
  if (independence(joint).kind === "meme-analysis.evidence.independence:witness") return 0;
  const support = chargeValues;
  return joint.cells.reduce((sum, cell) => {
    if (natIsZero(cell.count)) return sum;
    const sourceIndex = support.findIndex((value) => value.name === cell.source.name);
    const reproductionIndex = support.findIndex((value) => value.name === cell.reproduction.name);
    const pxy = toNumber(cell.probability);
    const px = joint.sourceMarginal.bins[sourceIndex]!.probability;
    const py = joint.reproductionMarginal.bins[reproductionIndex]!.probability;
    return sum + pxy * log2(pxy / (toNumber(px) * toNumber(py)));
  }, 0);
}
