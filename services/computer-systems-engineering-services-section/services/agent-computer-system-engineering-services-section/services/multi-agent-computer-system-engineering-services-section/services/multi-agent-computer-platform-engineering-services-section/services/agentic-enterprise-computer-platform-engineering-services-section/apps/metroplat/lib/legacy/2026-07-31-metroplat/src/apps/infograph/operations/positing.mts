/**
 * @packageDocumentation
 *
 * apps/infograph/operations/positing — the charge-algebra operation family.
 * Learning-cycle coverage reads are projections over admitted material, not
 * verbs; their carried readers live in `src/core/language/stdlib/reading`. Diataxis
 * coverage is a text codec, not a positing read — see
 * `integrations/knowledge-vaults/src/codec`.
 */
import { tm } from "../../../lib/language/ast/index.mts";
import { operation, type Operation } from "../../../rpc/index.mts";
import { schemaFrom } from "../../../lib/schema/contract.mts";
import { chargeValueNames } from "../../../lib/values/index.mts";

/** The private wire boundary shared by this operation's domain and codomain. */
const chargeValueNameContract = schemaFrom({
  $id: "metroplat/calculus/predicating/positing/charge-value-name",
  enum: chargeValueNames,
  title: "ChargeValueName",
  description: "The four named values of Belnap's FOUR charge value set.",
} as const);

/** conflate-charge — apply the FOUR conflation primitive to a charge value. */
export const conflateChargeOperation: Operation = operation({
  verb: "conflate-charge",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Conflate one value of Belnap's FOUR charge value set.",
  description: "Domain and codomain: the four charge values. Body: the CHL domain primitive `conflate`.",
  domain: chargeValueNameContract,
  codomain: chargeValueNameContract,
  runTerm: tm.lam(tm.conflate(tm.var(0))),
});

/** The positing module's operation family. */
export const positingOperations: readonly Operation[] = Object.freeze([
  conflateChargeOperation,
]);
