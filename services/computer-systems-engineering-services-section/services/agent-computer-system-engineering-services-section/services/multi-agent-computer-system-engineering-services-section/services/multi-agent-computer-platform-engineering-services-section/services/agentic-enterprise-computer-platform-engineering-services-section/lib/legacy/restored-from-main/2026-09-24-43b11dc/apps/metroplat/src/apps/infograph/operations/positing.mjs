/**
 * @packageDocumentation
 *
 * apps/infograph/operations/positing — the charge-algebra operation family.
 * Learning-cycle coverage reads are projections over admitted material, not
 * verbs; their carried readers live in `src/core/language/stdlib/reading`. Diataxis
 * coverage is a text codec, not a positing read — see
 * `@red-cup-engineering/vault-note-schema/diataxis`.
 */
import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { operation } from "../../../rpc/operation.mjs";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { chargeValueNames } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

/** The private wire boundary shared by this operation's domain and codomain. */
const chargeValueNameContract = schemaFrom({
  $id: "metroplat/calculus/predicating/positing/charge-value-name",
  enum: chargeValueNames,
  title: "ChargeValueName",
  description: "The four named values of Belnap's FOUR charge value set.",
});

/** conflate-charge — apply the FOUR conflation primitive to a charge value. */
export const conflateChargeOperation = operation({
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
export const positingOperations = Object.freeze([
  conflateChargeOperation,
]);
