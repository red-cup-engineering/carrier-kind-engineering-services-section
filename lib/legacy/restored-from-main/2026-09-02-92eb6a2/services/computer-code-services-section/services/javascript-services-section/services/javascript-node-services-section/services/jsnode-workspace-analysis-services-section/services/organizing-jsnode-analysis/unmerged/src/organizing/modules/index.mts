export {
  introspectDeclarations,
  introspectDeclarationsByFile,
  introspectDirectory,
  declarationFiles,
} from "./introspect.mjs";

export {
  introspectImports,
  readImports,
} from "./imports.mjs";

export {
  isExportedDeclaration,
  scriptKindOf,
  stripBlockComment,
} from "./syntax.mjs";

export {
  extractDocSurface,
} from "./documentation.mjs";

export {
  isJSNodeSourceFile,
  sourceDirectoryCarrier,
  sourceDirectoryTerm,
  sourceDirectoryUtterances,
  sourceModuleCarrier,
  sourceModuleFiles,
  sourceModuleTerm,
  sourceModuleUtterances,
  readSourceDeclarations,
} from "./source.mjs";

export {
  moduleSubpathOf,
  packageSourceRoot,
  readPackageDocSymbols,
} from "./package-surface.mjs";

export type {
  SourceDeclaration,
  SourceDeclarationKind,
  SourceDirectoryCarrier,
  SourceModuleCarrier,
  SourceModuleFileOptions,
} from "./source.mjs";

export type {
  PackageDocSymbol,
  PackageDocSymbolOptions,
} from "./package-surface.mjs";

export {
  formatJsDoc,
  locateDocSymbols,
  readSymbolSource,
  setJsDoc,
} from "./documentation-edit.mjs";

export * as content from "./content/index.mjs";

export type {
  FileCatalog,
  DeclarationFileOptions,
} from "./introspect.mjs";

export type {
  FileImports,
  ImportBinding,
} from "./imports.mjs";

export type {
  DocSymbol,
  DocSymbolKind,
} from "./documentation.mjs";

export type {
  DeclaredSymbol,
} from "./documentation-edit.mjs";

export {
  coarseConsumersOfPackage,
  consumersOfSymbol,
  resolveConsumptionEdges,
  workspaceConsumptionIndex,
} from "../workspaces/consumption.mjs";

export type {
  ConsumptionIndex,
  RawConsumption,
  SymbolConsumer,
} from "../workspaces/consumption.mjs";
