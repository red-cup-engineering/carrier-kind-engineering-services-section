/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/metroplat/core/language/stdlib/settling` exports the free settling construction
 * as RMN terms.
 *
 * `freeTerm` materializes the full settled object from filtration generators:
 * a single initial stage at countable cofinality. `cellSetOf` and `zeroStageOrdinalTerm`
 * are exported for the reading sub-module, which composes them into the reader terms.
 *
 * Product reading: settlement generators can be materialized inside the term
 * calculus before reader terms inspect them. This keeps finite settlement reads
 * portable without claiming this module is a general transfinite closure engine.
 */
import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { objectTerm, arrayTerm, stringTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";
import { cellSetOf } from "@red-cup-engineering/relating/evaluating/settling";

// ── generic list combinators ──────────────────────────────────────────────────

const boolFalse = tm.bool(false);
const boolTrue = tm.bool(true);

/** `member x list` — whether any element of an array term coincides with `x`. */
const memberTerm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(tm.var(1), boolTrue, tm.coincide(tm.var(3), tm.var(0))),
    )),
    boolFalse,
    tm.var(0),
  ),
));

/** `dedup list` — array term with coincidence-duplicates removed, order preserved.
 *
 *  Collects via `consArray` (O(1) per element) then reverses ONCE at the end,
 *  not `append` (which redoes a full reverse-then-refold of the whole
 *  accumulator at EVERY element — an O(n) collection made O(n²), and the
 *  reason this term couldn't be given a sound, non-dependent `fold` typing
 *  rule: `append`'s own internals build a different-shaped accumulator at
 *  every step). No mathematical operation in Obsmetrologia actually needs
 *  general list-concatenation here (checked: `Obsmetrologia/Language/`'s only
 *  `++` is inside tactic-automation code, not a proof); this was always a
 *  "collect matching items" fold, i.e. a `snoc`, not an `append`. */
export const dedupTerm = tm.lam(
  tm.reverseArray(tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        tm.app(tm.app(memberTerm, tm.var(0)), tm.var(1)),
        tm.var(1),
        tm.consArray(tm.var(0), tm.var(1)),
      ),
    )),
    arrayTerm([]),
    tm.var(0),
  )),
);

// ── exported settlement primitives ────────────────────────────────────────────

/** The zero settling-stage ordinal object term. */
export const zeroStageOrdinalTerm = objectTerm([
  ["kind", stringTerm("predication.settling.stageOrdinal")],
  ["ordinal", objectTerm([["kind", stringTerm("ordinal.closure.ordinal.zero")]])],
]);

// ── the free settling construction ───────────────────────────────────────────

/** The filtration generators (var 0) → the single initial stage at countable cofinality. */
export const freeTerm = (() => {
  const cells = tm.field("cells", tm.var(0));
  const stage = objectTerm([
    ["kind", stringTerm("predication.settling.stage")],
    ["ordinal", zeroStageOrdinalTerm],
    ["shape", objectTerm([
      ["kind", stringTerm("predication.settling.stage.initial")],
      ["ordinal", zeroStageOrdinalTerm],
    ])],
    ["designated", cellSetOf(cells)],
  ]);
  return tm.lam(objectTerm([
    ["kind", stringTerm("predication.settlement.filtration")],
    ["stages", arrayTerm([stage])],
    ["cofinality", objectTerm([["kind", stringTerm("predication.settling.cofinality.countable")]])],
  ]));
})();
