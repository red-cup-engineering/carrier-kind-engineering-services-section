/**
 * @packageDocumentation
 *
 * Public source-code monitoring surface.
 */
export {
  DEFAULT_SOURCE_DIRECTORIES,
  DEFAULT_SOURCE_FILE_LIMIT,
  readSourceModuleCorpus,
  sourceModuleArtifacts,
  sourceModuleConfinedPath,
  sourceModuleFiles,
  sourceModuleRelativePath,
  type SourceModuleCorpus,
  type SourceModuleMaterial,
} from "./filesystem.mts";
export * from "../substrate/history.mts";
export * from "./topology/schema.mts";
export * from "./topology/service.mts";
export * from "./topology/valuation.mts";
export * from "./topology/history.mts";
export * from "./aggregate.mts";
export * from "./cohesion/schema.mts";
export * from "./cohesion/service.mts";
export * from "./cohesion/history.mts";
export * from "./policy.mts";
export * from "./work.mts";
export * from "./workspace/index.mts";
export * from "./lexicon/schema.mts";
export * from "./lexicon/fold.mts";
export * from "./lexicon/service.mts";
