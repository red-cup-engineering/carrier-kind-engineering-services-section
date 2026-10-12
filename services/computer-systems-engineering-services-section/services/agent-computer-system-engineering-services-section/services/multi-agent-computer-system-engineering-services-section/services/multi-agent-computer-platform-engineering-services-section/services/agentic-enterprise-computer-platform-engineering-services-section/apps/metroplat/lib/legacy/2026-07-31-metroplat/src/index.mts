/**
 * @packageDocumentation
 *
 * The stable MetroPlat package surface: pure material values, schema
 * contracts, articulation and predication, RMN programs, and the operation
 * boundary used to build applications. Protocols, host integrations, tooling,
 * and finished applications are available through their named package
 * subpaths.
 */

export {
  SchemaContractSchema,
  schemaFrom,
  type SchemaContract,
  type SchemaContractMaterial,
  type SchemaAddress,
  type FromSchema,
  type DataSchema,
} from "./lib/schema/contract.mts";

export * from "./lib/values/index.mts";
export * from "./lib/records/utterance/index.mts";
export * from "./lib/logic/predicating/index.mts";
export { bigradedCohomology, divides } from "./lib/fixpoint/index.mts";
export { settling } from "./lib/settling.mts";
export { inducing } from "./lib/inducing.mts";

export * from "./lib/language/ast/index.mts";
export * from "./lib/language/check/index.mts";
export * from "./lib/language/eval/index.mts";

export { canonicalBytes, contentAddress, digest, sha256Hex } from "./lib/identity/index.mts";
export {
  isJsonRecord,
  isJsonValue,
  jsonResource,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "./lib/codecs/json/core.mts";
export { parse as parseJson } from "./lib/codecs/json/core.mts";

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
