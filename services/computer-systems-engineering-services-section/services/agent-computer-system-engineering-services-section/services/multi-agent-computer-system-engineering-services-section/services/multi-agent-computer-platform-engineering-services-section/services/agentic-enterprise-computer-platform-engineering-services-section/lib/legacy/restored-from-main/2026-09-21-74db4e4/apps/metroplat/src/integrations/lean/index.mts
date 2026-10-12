/**
 * integrations/lean - metroplat's own Lean workspace/dashboard material.
 *
 * The portable Lean/TeX/Blueprint/Verso proofing domain (file-plate codecs,
 * metaprogramming, Blueprint/Verso apps, golden-vector fixtures) lives in
 * `@red-cup-engineering/lean-system-services-section`; real consumers of
 * that surface import it directly from the package (or its subpath
 * exports), not through this barrel. This barrel re-exports only what is
 * genuinely metroplat's own: the joined relational-configuration view, the
 * request/read schemas, and the workspace read/command services layered on
 * top of the package.
 */
export * from "./schema.mts";
export * from "./view.mts";
export * as workspace from "./workspace/index.mts";
export * from "./workspace/service.mts";
