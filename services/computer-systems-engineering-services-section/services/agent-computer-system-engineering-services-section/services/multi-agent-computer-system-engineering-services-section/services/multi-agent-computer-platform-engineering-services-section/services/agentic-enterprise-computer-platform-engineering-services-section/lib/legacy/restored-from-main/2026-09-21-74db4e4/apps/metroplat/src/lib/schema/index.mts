/**
 * schema is the contract kernel for schema literals, validators, static shape reading, drift checks, and explicit schema incidence.
 * It may import values and contract declarations, but it must not import records, logic, fixpoint, math, codecs, capability, rendering, or search.
 */
export type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
export { SchemaContractSchema, schemaFrom, type SchemaContract, type SchemaContractMaterial, type SchemaAddress, type DataSchema } from "@red-cup-engineering/computer-data-engine/contracts";
export {
  schemaConformanceVerdictSchema,
  schemaConformanceVerdict,
  conformanceOf,
  type SchemaConformanceSample,
  type SchemaConformanceVerdict,
} from "./conformance.mts";
export {
  type StructuralType,
  type StructuralField,
  unknownType,
  neverType,
  primitive,
  literal,
  array,
  tuple,
  ref,
  objectType,
  union,
  intersection,
} from "./structural.mts";
export { realize, realizeDefs } from "./realize.mts";

import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { utteranceSchema, articulationCellSchema } from "@red-cup-engineering/computer-data-engine/utterance";

/** The base admission schema: a token and a claim, each carrying a Mark. */
export const utteranceSchemaContract = schemaFrom(utteranceSchema);

/** An utterance opened at its potential aperiodic articulation cell. */
export const articulationCellSchemaContract = schemaFrom(articulationCellSchema);
