import { tm, type Tm } from "../../ast/index.mts";
import { objectTerm, stringTerm } from "../../reader/projecting/index.mts";
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
  type ClosureRegime,
} from "../../../fixpoint/closure.mts";
import { classifyRegime } from "../../../fixpoint/value-category.mts";

/** The four closure regimes, IN ORDER, sourced from lib's `ClosureRegime` objects. */
export const CLOSURE_REGIMES: readonly ClosureRegime[] = Object.freeze([
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
  aperiodicClosureRegime,
]);

/** A regime-result object term whose `kind` is the lib object's kind. */
const regimeConst = (regime: ClosureRegime) => objectTerm([["kind", stringTerm(regime.kind)]]);

/** The regime-result term that lib's `classifyRegime` assigns to a representative datum. */
const classifiedRegimeConst = (scottContinuous: boolean, finiteBase: boolean, countableCofinality: boolean) =>
  regimeConst(classifyRegime({ kind: "settling.closureRegimeData", scottContinuous, finiteBase, countableCofinality }));

/**
 * Domain: `{ scottContinuous, finiteBase, countableCofinality }`. Codomain: metroplat `ClosureRegime`.
 */
export const classifyRegimeTerm: Tm = tm.lam(
  tm.cond(
    tm.field("finiteBase", tm.var(0)),
    classifiedRegimeConst(true, true, true),
    tm.cond(
      tm.field("scottContinuous", tm.var(0)),
      classifiedRegimeConst(true, false, true),
      tm.cond(
        tm.field("countableCofinality", tm.var(0)),
        classifiedRegimeConst(false, false, true),
        classifiedRegimeConst(false, false, false),
      ),
    ),
  ),
);
