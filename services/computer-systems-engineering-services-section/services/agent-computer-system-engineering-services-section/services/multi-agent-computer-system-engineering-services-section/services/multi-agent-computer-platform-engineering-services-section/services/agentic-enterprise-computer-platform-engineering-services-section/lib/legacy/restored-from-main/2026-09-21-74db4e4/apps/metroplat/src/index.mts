/**
 * @packageDocumentation
 *
 * The stable MetroPlat package surface: pure material values, schema
 * contracts, articulation and predication, RMN programs, and the operation
 * boundary used to build applications. Protocols, host integrations, tooling,
 * and finished applications are available through their named package
 * subpaths.
 */
export type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";




export * from "@red-cup-engineering/computer-data-engine/utterance";
export * from "./lib/logic/predicating/index.mts";
export { bigradedCohomology, divides } from "./lib/fixpoint/index.mts";
export { settling } from "./lib/settling.mts";
export { inducing } from "./lib/inducing.mts";

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
  type ChargeValueName as RmnChargeValueName,
  type GeneratorName,
  type Tm,
  type Ty,
} from "@red-cup-engineering/relation-model-notation";
export * from "@red-cup-engineering/relation-model-notation/typing";
export * from "@red-cup-engineering/relation-model-notation/eval";

export { canonicalBytes, contentAddress, digest, sha256Hex } from "./lib/identity/index.mts";
export {
  isJsonRecord,
  isJsonValue,
  jsonResource,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
export { parse as parseJson } from "../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export {
  operation,
  isOperation,
  type Operation,
  type OperationSpec,
} from "./rpc/index.mts";
export { dispatch, type RpcRuntime, type RpcInvocation, type ExecutionReceipt } from "./rpc/index.mts";
export {
  encounter,
  encounterMove,
  encounterReading,
  encounterRun,
  encounterTerminal,
  type Encounter,
  type EncounterAdmission,
  type EncounterMove,
  type EncounterReading,
  type EncounterRun,
  type EncounterTerminal,
} from "./encounter/index.mts";
export {
  deriveProgramContract,
  isProgramContractStanding,
  measureProgramContract,
  programContractEvidenceContract,
  programContractEvidenceSchema,
  readProgramContractStanding,
  type DerivedProgramContract,
  type ProgramContractEvidence,
  type ProgramContractStanding,
} from "./rpc/contract.mts";

export * as core from "./lib/index.mts";
export * as language from "./lib/language/index.mts";
export * as operations from "./rpc/index.mts";
export * as work from "./work/index.mts";
