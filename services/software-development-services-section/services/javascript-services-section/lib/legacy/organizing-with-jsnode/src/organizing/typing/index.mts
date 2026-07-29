export {
  TYPE_KINDS,
  directlyAssignable,
  findType,
  hasType,
  jsFn,
  jsType,
  sameType,
  typeCatalog,
  composableAt,
  composeAt,
} from "./algebra/index.mjs";

export type {
  JsType,
  JsFn,
  TypeCatalog,
  TypeKind,
  SubtypeEdge,
} from "./algebra/index.mjs";

export {
  workspaceTypeIndex,
} from "../workspaces/type-index.mjs";

export type {
  AttributedFunction,
  AttributedSubtype,
  AttributedType,
  WorkspaceTypeIndex,
} from "../workspaces/type-index.mjs";
