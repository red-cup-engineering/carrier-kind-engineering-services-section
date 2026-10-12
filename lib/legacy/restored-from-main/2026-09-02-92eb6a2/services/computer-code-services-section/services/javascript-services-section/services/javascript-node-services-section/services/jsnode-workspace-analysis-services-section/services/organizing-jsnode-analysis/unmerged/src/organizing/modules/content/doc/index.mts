/**
 * @emsenn/jsnode-doc-computer — documentation computer for jsnode workspaces.
 *
 * Audits, scaffolds, and generates standard documentation artifacts for every
 * package in a pnpm workspace: README.md, AGENTS.md, CLAUDE.md, and the
 * dev/docs/{explanations,guides,tutorials,references} + dev/planning/ tree.
 *
 * - audit — check which artifacts are present or missing per package
 * - scaffold — create the dev/ directory structure (idempotent, .gitkeep)
 * - readme — generate README.md content from package.json
 * - agents — generate AGENTS.md content from package.json
 * - reference — read the real API surface from source (signatures + JSDoc)
 *   and render a Markdown API reference
 * - coverage — measure JSDoc coverage of the exported surface and list gaps
 *
 * The first four read the package.json manifest (the *declared* contract); the
 * last two read source via @emsenn/javascript-computer (the *operational*
 * contract). The generators are pure over their inputs; no ambient I/O. The
 * CLI in ./cli binds them to the filesystem and stdout.
 */

export { auditPackageDoc, auditWorkspaceDocs, ALL_DOC_ARTIFACTS } from "./audit.mjs";
export type { PackageDocArtifactAudit, DocArtifact } from "./audit.mjs";

export { scaffoldPackageDocs } from "./scaffold.mjs";
export type { DocScaffoldResult, DevDir } from "./scaffold.mjs";

export { generateReadme } from "./readme.mjs";
export type { PackageManifest } from "./readme.mjs";

export { generateAgentsMd } from "./agents.mjs";
export type { AgentsManifest } from "./agents.mjs";

export { generateClaudeMd } from "./claude-md.mjs";
export type { ClaudeManifest } from "./claude-md.mjs";

export { generateApiReference, readPackageApi } from "./reference.mjs";
export type { ApiModule, ReadApiOptions } from "./reference.mjs";

export { docCoverage, packageDocCoverage } from "./coverage.mjs";
export type { DocCoverage, CoverageGap } from "./coverage.mjs";

export {
  locatePackageSymbol,
  readPackageSymbol,
  listPackageSymbols,
  setPackageSymbolDoc,
} from "./manage.mjs";
export type { SymbolLocation, SymbolEntry, LocateOptions } from "./manage.mjs";
