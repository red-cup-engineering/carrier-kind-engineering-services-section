import { predicationSeed } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { mark, utterance } from "@lenticule-science/metrologic/articulation/predicating/positing/utterance";
import { canonicalStatementValue } from "./persistence.mjs";

export function utteredClaimIdentity(tokenValue, claimMark) {
  const seeded = predicationSeed(utterance(mark(tokenValue), mark(claimMark)));
  const plainCell = JSON.parse(JSON.stringify(seeded));
  return Object.freeze({ cell: seeded, address: canonicalStatementValue(plainCell) });
}
