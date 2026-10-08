import { tm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { objectTerm, stringTerm, booleanConditionTerm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec";
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { classifyRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";

/** The four closure regimes, IN ORDER, sourced from lib's `ClosureRegime` objects. */
export const CLOSURE_REGIMES = Object.freeze([
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
  aperiodicClosureRegime,
]);

/** A regime-result object term whose `kind` is the lib object's kind. */
const regimeConst = (regime) => objectTerm([["kind", stringTerm(regime.kind)]]);

/** The regime-result term that lib's `classifyRegime` assigns to a representative datum. */
const classifiedRegimeConst = (scottContinuous, finiteBase, countableCofinality) =>
  regimeConst(classifyRegime({ kind: "settling.closureRegimeData", scottContinuous, finiteBase, countableCofinality }));

/**
 * Domain: `{ scottContinuous, finiteBase, countableCofinality }`. Codomain: metroplat `ClosureRegime`.
 */
export const classifyRegimeTerm = tm.lam(
  tm.cond(
    booleanConditionTerm(tm.field("finiteBase", tm.var(0))),
    classifiedRegimeConst(true, true, true),
    tm.cond(
      booleanConditionTerm(tm.field("scottContinuous", tm.var(0))),
      classifiedRegimeConst(true, false, true),
      tm.cond(
        booleanConditionTerm(tm.field("countableCofinality", tm.var(0))),
        classifiedRegimeConst(false, false, true),
        classifiedRegimeConst(false, false, false),
      ),
    ),
  ),
);
