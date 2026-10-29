/**
 * @emsenn/javascript-algebra — the JavaScript type category as pure structure.
 *
 * Objects are types (`JsType`), morphisms are functions (`JsFn`) whose domain
 * is a tuple of input types — a multicategory of types. The carrier is a
 * `TypeCatalog` of objects, morphisms, and the declared assignability relation.
 * Everything here is structure and one-step operation; closures and section
 * reads live in @emsenn/javascript-topology.
 */
export { TYPE_KINDS, jsType, sameType } from "./type.mjs";
export type { TypeKind, JsType } from "./type.mjs";

export { jsFn, composableAt, composeAt } from "./morphism.mjs";
export type { JsFn } from "./morphism.mjs";

export { typeCatalog, findType, hasType, directlyAssignable } from "./catalog.mjs";
export type { TypeCatalog, SubtypeEdge } from "./catalog.mjs";
