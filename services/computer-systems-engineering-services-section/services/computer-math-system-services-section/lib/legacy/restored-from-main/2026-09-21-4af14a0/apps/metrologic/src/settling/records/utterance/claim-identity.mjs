import { predicationSeed } from "../../../articulation/predicating/index.mjs";
import { mark, utterance } from "@red-cup-engineering/computer-data-engine/utterance";
import { canonicalStatementValue } from "../persistence.mjs";

export function utteredClaimIdentity(tokenValue, claimMark) {
  const seeded = predicationSeed(utterance(mark(tokenValue), mark(claimMark)));
  const plainCell = JSON.parse(JSON.stringify(seeded));
  return Object.freeze({ cell: seeded, address: canonicalStatementValue(plainCell) });
}
