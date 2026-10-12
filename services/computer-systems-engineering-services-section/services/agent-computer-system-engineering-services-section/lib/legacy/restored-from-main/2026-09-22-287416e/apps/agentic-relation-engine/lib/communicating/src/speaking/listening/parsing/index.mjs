

export {
  admitCommunication,
  carrierOfUtterance,
  communicationMark,
  communicationDocument,
  isMark,
} from "./carrier.mjs";

export { articulate, articulateCommunication, findQuoteSpans } from "./articulating.mjs";

export { fold } from "./folding.mjs";

export { parse, parseCommunication } from "./parsing.mjs";

export {
  parseCommunicationForest,
  parseForest,
  parseForestCarrier,
  parseForestFromArticulation,
  parseForestReadingCarrier,
  parseForestReadingSchema,
  parseForestSchema,
} from "./forest.mjs";

export {
  lambekForestProofCarrier,
  lambekForestProofSchema,
  lambekForestReadingProofCarrier,
  lambekForestReadingProofSchema,
  lambekProofOfForest,
} from "./lambek.mjs";

