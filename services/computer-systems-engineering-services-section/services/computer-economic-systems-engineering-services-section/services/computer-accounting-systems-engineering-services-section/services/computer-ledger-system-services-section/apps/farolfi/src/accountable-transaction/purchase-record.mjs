/** Read a recorded native purchase from the store without synthesizing payment from journal cells. */
import { purchaseObservationCollector } from "@red-cup-engineering/x402-services-section/purchase-observation";
import { each } from "@red-cup-engineering/semiotic-eavt-services-section/store";

/**
 * The one purchase observation held under `type` at `root`. Each record of the type is one observed
 * row `{row: [e, a, v, t]}`; a type holding no observation, or more than one, is refused.
 */
export function readPurchaseObservation(root, type) {
  const collector = purchaseObservationCollector();
  for (const { record } of each(root, type)) collector.push(record.row);
  return collector.read();
}
