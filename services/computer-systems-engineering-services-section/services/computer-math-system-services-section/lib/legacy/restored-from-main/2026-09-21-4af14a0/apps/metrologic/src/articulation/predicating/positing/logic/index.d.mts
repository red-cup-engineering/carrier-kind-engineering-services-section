/**
 * positing/logic — value-level multiplicative linear logic over FOUR.
 *
 * This module exports the finite charge-value alphabet operations and
 * witness/obstruction judgments from `bilattice-linear-logic.mjs` (fusion,
 * residuum, linear negation, par, consistency, truth-order residuation), and the
 * Chu-space category over that alphabet from `linear-logic-chu.mjs` (the Chu
 * space carrier, its `*`-autonomous dual, Chu transforms, and FOUR read
 * `*`-autonomously) — the executable form of
 * `Obsmetrologia/Calculus/Logic/LinearLogicChu.lean`.
 *
 * Fiber-level lifting lives in `positing/fiber`. This module is not a proof-net
 * or sequent-calculus engine.
 *
 * @packageDocumentation
 */
export * from "./bilattice-linear-logic.mjs";
export * from "./linear-logic-chu.mjs";
