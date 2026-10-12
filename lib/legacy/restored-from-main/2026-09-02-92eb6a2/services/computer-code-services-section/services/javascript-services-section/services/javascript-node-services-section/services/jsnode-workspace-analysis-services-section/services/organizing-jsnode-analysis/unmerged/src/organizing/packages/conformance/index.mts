// Historical conformance entrypoint. Prefer the package-level names exported
// from ../reduction.mjs: lintPackage, reducePackage, normalizePackageManifest.

export { lintPackage, checkPackage, layerOf } from "./check.mjs";
export type { PackageLintReport, CheckReport } from "./check.mjs";
export { scaffoldPackage, scaffold } from "./scaffold.mjs";
export type { PackageScaffoldResult } from "./scaffold.mjs";
