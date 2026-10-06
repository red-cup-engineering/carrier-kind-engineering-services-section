/**
 * apps/infograph/operations/inducing — the Infograph Inducing operation family: relating's verbs
 * (admission, articulate → predicate → posit → settle, their composition, relating two relations,
 * and coincidence) exposed as FeltOS operations. Every body is relating's.
 */
import { actions } from "@red-cup-engineering/relating/actions";
import { operationAs } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const adopt = (verb, as) => operationAs(actions.find((action) => action.verb === verb), as);

export const utterOperation = adopt("utter");
export const articulateOperation = adopt("articulate");
export const predicateOperation = adopt("predicate");
export const positOperation = adopt("posit");
export const settleOperation = adopt("settle");
export const induceOperation = adopt("induce-relation", "induce");
export const induceMembraneOperation = adopt("induce-membrane");
export const relateRelationsOperation = adopt("relate-relations");
export const coincideOperation = adopt("coincide");

/** The Inducing operation family: admission, four constituent morphisms, and their compositions. */
export const inducingOperations = Object.freeze([
  utterOperation,
  articulateOperation,
  predicateOperation,
  positOperation,
  settleOperation,
  induceOperation,
  induceMembraneOperation,
  relateRelationsOperation,
  coincideOperation,
]);
