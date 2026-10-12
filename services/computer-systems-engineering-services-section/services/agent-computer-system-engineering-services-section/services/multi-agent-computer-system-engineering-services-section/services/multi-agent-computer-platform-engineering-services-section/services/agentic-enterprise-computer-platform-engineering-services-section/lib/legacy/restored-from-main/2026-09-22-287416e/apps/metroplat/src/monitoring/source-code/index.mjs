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

} from "./filesystem.mjs";
export * from "../substrate/history.mjs";
export * from "./topology/schema.mjs";
export * from "./topology/service.mjs";
export * from "./topology/valuation.mjs";
export * from "./topology/history.mjs";
export * from "./aggregate.mjs";
export * from "./cohesion/schema.mjs";
export * from "./cohesion/service.mjs";
export * from "./cohesion/history.mjs";
export * from "./policy.mjs";
export * from "./work.mjs";
export * from "./workspace/index.mjs";
export * from "./lexicon/schema.mjs";
export * from "./lexicon/fold.mjs";
export * from "./lexicon/service.mjs";
