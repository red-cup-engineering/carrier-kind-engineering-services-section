/** RMN reduction uses the shared engine with Metroplat's JSON carrier policy. */
import type { JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { type Tm, tm } from "../ast/index.mts";
import { evaluate } from "@red-cup-engineering/relation-model-notation/eval";
import { jsonToTerm, termToJson } from "../reader/projecting/index.mts";

export { step, dev, normalize, evaluate, eval } from "@red-cup-engineering/relation-model-notation/eval";

/** Apply an action using Metroplat's existing JSON tags and charge conversion. */
export function evaluateRunTerm(runTerm: Tm, input: JsonValue): JsonValue {
  return termToJson(evaluate(tm.app(runTerm, jsonToTerm(input))));
}
