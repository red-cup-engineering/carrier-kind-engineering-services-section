/**
 * analysis/matter-topology - finite contact-network rigidity receipts.
 *
 * exactly when its contact nerve has nonzero H1 cycle rank, and one redundant
 * contact raises that rank by one.
 */
import {
  coverNerve,
  forestEquality,
  h1Rank,
  type CoverNerve,
} from "../topology/coordination-cohomology.mts";

export interface MatterTopologyReceipt {
  readonly kind: "aperiodic.matterTopology.receipt:witness";
  readonly nerve: CoverNerve;
  readonly h1Rank: number;
  readonly loadBearing: boolean;
  readonly notForest: boolean;
  readonly loadBearingIffNotForest: true;
  readonly jammed: CoverNerve;
  readonly jammedH1Rank: number;
  readonly jammingClick: true;
  readonly percolationFrontier: "condensate density does not alone force load-bearing topology";
}

export const loadBearing = (nerve: CoverNerve): boolean => h1Rank(nerve) > 0;

export function redundantContact(nerve: CoverNerve): CoverNerve {
  return coverNerve(nerve.entities, nerve.cells + 1, nerve.components);
}

export function matterTopologyReceipt(nerve: CoverNerve = coverNerve(3, 3, 1)): MatterTopologyReceipt {
  const rank = h1Rank(nerve);
  const notForest = !forestEquality(nerve);
  const loadBearingIffNotForest = loadBearing(nerve) === notForest;
  const jammed = redundantContact(nerve);
  const jammedH1Rank = h1Rank(jammed);
  const jammingClick = jammedH1Rank === rank + 1;
  if (!loadBearingIffNotForest || !jammingClick) {
    throw new TypeError("matterTopology.receipt: finite contact-network topology laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.matterTopology.receipt:witness" as const,
    nerve,
    h1Rank: rank,
    loadBearing: loadBearing(nerve),
    notForest,
    loadBearingIffNotForest: true as const,
    jammed,
    jammedH1Rank,
    jammingClick: true as const,
    percolationFrontier: "condensate density does not alone force load-bearing topology" as const,
  });
}
