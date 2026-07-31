/**
 * @emsenn/javascript-computer — projects a TypeScript declaration surface into
 * the @emsenn/javascript-algebra type category.
 *
 * The computer is where the heavy machinery (the TypeScript compiler API) and
 * its filesystem I/O live, keeping the algebra pure. It reads exported classes,
 * interfaces, type aliases, and functions out of .d.ts files and returns a
 * TypeCatalog ready for @emsenn/javascript-topology to query.
 */
export {
  introspectDeclarations,
  introspectDeclarationsByFile,
  introspectDirectory,
} from "./introspect.mjs";
export type { FileCatalog } from "./introspect.mjs";
export { readImports, introspectImports } from "./imports.mjs";
export type { ImportBinding, FileImports } from "./imports.mjs";
export { extractDocSurface } from "./documentation.mjs";
export type { DocSymbol, DocSymbolKind } from "./documentation.mjs";
export {
  locateDocSymbols,
  readSymbolSource,
  setJsDoc,
  formatJsDoc,
} from "./documentation-edit.mjs";
export type { DeclaredSymbol } from "./documentation-edit.mjs";
