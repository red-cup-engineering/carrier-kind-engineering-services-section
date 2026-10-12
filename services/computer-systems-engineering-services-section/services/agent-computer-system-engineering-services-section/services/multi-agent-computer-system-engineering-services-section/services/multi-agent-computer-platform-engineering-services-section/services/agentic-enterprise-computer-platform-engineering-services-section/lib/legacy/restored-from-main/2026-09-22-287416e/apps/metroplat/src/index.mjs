/**
 * @packageDocumentation
 *
 * The stable MetroPlat package surface: pure material values, schema
 * contracts, articulation and predication, RMN programs, and the operation
 * boundary used to build applications. Protocols, host integrations, tooling,
 * and finished applications are available through their named package
 * subpaths.
 */

export * from "@red-cup-engineering/computer-data-engine/utterance";
export * from "./lib/logic/predicating/index.mjs";
export { bigradedCohomology, divides } from "./lib/fixpoint/index.mjs";
export { settling } from "./lib/settling.mjs";
export { inducing } from "./lib/inducing.mjs";

export {
  TmSchema,
  TySchema,
  boolOfTerm,
  chargeNameOfTerm,
  chargeValueNames as rmnChargeValueNames,
  generatorNameOfTerm,
  inst,
  isChargeValueName as isRmnChargeValueName,
  isTerm,
  rename,
  subst,
  tm,
  ty,

} from "@red-cup-engineering/relation-model-notation";
export * from "@red-cup-engineering/relation-model-notation/typing";
export * from "@red-cup-engineering/relation-model-notation/eval";

export { canonicalBytes, contentAddress, digest, sha256Hex } from "./lib/identity/index.mjs";
export {
  isJsonRecord,
  isJsonValue,
  requireJsonValue,

} from "../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
export { jsonResource } from "@red-cup-engineering/relating/codecs/text/json";
export { parse as parseJson } from "../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export {
  operation,
  isOperation,

} from "./rpc/index.mjs";
export { dispatch } from "./rpc/index.mjs";
export {
  encounter,
  encounterMove,
  encounterReading,
  encounterRun,
  encounterTerminal,

} from "./encounter/index.mjs";
export {
  deriveProgramContract,
  isProgramContractStanding,
  measureProgramContract,
  programContractEvidenceContract,
  programContractEvidenceSchema,
  readProgramContractStanding,

} from "./rpc/contract.mjs";

export * as core from "./lib/index.mjs";
export * as language from "./lib/language/index.mjs";
export * as operations from "./rpc/index.mjs";
export * as work from "./work/index.mjs";
