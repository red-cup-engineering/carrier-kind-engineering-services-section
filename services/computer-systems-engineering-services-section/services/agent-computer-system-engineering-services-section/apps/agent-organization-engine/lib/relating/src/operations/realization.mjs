/**
 * apps/infograph/operations/realization — package self-reads: canonical form, schema realization,
 * and morphism inspection — relating's verbs, exposed as FeltOS operations.
 */
import { actions } from "@red-cup-engineering/relating/actions";
import { operationAs } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const adopt = (verb, as) => operationAs(actions.find((action) => action.verb === verb), as);

export const canonicalizeOperation = adopt("canonicalize");
export const realizeOperation = adopt("realize");
export const inspectOperation = adopt("inspect");
export const inferTypeOperation = adopt("infer-type");

export const realizationOperations = Object.freeze([canonicalizeOperation, realizeOperation, inspectOperation, inferTypeOperation]);
