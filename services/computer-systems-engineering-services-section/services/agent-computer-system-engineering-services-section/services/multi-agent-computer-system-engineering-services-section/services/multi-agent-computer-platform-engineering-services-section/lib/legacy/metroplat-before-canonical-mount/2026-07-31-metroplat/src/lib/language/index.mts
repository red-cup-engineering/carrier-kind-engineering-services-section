/**
 * language - the term language: notation, proof discipline, and address
 * grammar. This is part of the pure formal core.
 *
 * The serialized language is named canonical JSON. Positional variables remain
 * private evaluator structure and are never exported through this index.
 */
import type { Tm, Ty } from "./ast/index.mts";
import { inferTy, checkTy, isClosed } from "./check/index.mts";
import { evaluate, normalize } from "./eval/index.mts";
import { parseNamedRmn } from "./reader/index.mts";

export const parse = parseNamedRmn;

export function check(term: Tm, type?: Ty): boolean {
  return isClosed(term) && (type === undefined ? inferTy([], term) !== null : checkTy([], term, type));
}

export {
  evaluate,
  normalize,
};

export * from "./catalog.mts";
export * from "./presentation.mts";
export * from "./jsnode/index.mts";
