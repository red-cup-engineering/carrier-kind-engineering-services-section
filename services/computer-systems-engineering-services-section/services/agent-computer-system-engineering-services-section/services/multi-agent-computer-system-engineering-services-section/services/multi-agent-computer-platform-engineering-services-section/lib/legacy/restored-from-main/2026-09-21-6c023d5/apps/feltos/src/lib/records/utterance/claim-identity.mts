import { predicationSeed, type Cell } from "@lenticule-science/metrologic/articulation/predicating/predication";
import { mark, utterance } from "@red-cup-engineering/computer-data-engine/utterance";
import { canonicalStatementValue, type StatementValue } from "../persistence.mts";

export interface UtteredClaimIdentity {
  readonly cell: Cell;
  readonly address: string;
}

export function utteredClaimIdentity(tokenValue: StatementValue, claimMark: StatementValue): UtteredClaimIdentity {
  const seeded = predicationSeed(utterance(mark(tokenValue), mark(claimMark)));
  const plainCell = JSON.parse(JSON.stringify(seeded)) as StatementValue;
  return Object.freeze({ cell: seeded, address: canonicalStatementValue(plainCell) });
}
