/**
 * evaluators/pairing/chu — Chu spaces over FOUR as RMN terms.
 *
 * A Chu space is a pairing `{ pts, r, sts }` where `r : pts × sts → FOUR` is a
 * FOUR-valued matrix encoded as `Array<{charge, pt, st}>`. The *-autonomous dual
 * transposes `pts↔sts` and applies the De Morgan linear involution `negate` to
 * every charge entry, implementing the linear-logic dualising object `(–)^⊥`.
 *
 * the evidence and counter-evidence slots, making it self-inverse:
 *   negate(unknown)   = unknown   (⟨0,0⟩ → ⟨0,0⟩)
 *   negate(potential) = active    (⟨0,1⟩ → ⟨1,0⟩)
 *   negate(active)    = potential (⟨1,0⟩ → ⟨0,1⟩)
 *   negate(stable)    = stable    (⟨1,1⟩ → ⟨1,1⟩)
 *
 * `dual_involution` follows because transposing the matrix twice and applying
 * `negate_negate` pointwise returns the original space exactly.
 *
 * Runtime checks exposed here:
 */
import { tm } from "@red-cup-engineering/relation-model-notation";
import { arrayTerm, objectTerm, stringTerm, jsonToTerm, booleanConditionTerm, booleanResultTerm } from "@red-cup-engineering/relation-model-notation/json-codec";
import { chargeValues, negateValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

/**
 * Negate a JSON-codec charge-name string term, deriving the mapping from
 * the canonical `negateValue`/`chargeValues` (Obsmetrologia's own charge
 * primitives) rather than re-deriving the corner-swap math here. The Chu
 * `charge` field crosses the JSON boundary as an opaque string (point/state
 * names are never charges — see the test this binds), so this stays a
 * string→string dispatch; the actual negation is `negateValue`'s.
 */
const negateChargeStringTerm = (value) =>
  chargeValues.reduceRight(
    (elseBranch, charge) => tm.cond(
      tm.coincide(value, stringTerm(charge.name)),
      stringTerm(negateValue(charge).name),
      elseBranch,
    ),
    stringTerm("unknown"),
  );

// ── the Chu dual ──────────────────────────────────────────────────────────────

/**
 *
 * Takes `{ pts, r, sts }` and returns the *-autonomous dual: swap `pts` and
 * `sts`, and negate the FOUR charge of every matrix entry while also transposing
 * its `pt`/`st` coordinates.
 *
 * The dual is the linear-logic dualising object `(–)^⊥` of `Chu(FOUR)`. Applied
 * twice it returns the original space (`chuDualInvolution`), because:
 *   1. The `pts`/`sts` fields swap back (eta on the field projections).
 *   3. Each `pt`/`st` coordinate transposes back.
 *
 * De Bruijn inside the fold combinator (2 lambdas deep):
 *   var(0) = entry, var(1) = acc, var(2) = space (outer lambda)
 *
 * @example
 * ```js
 * import { evaluateRunTerm } from "@red-cup-engineering/metroplat";
 * import * as chu from "@red-cup-engineering/metroplat/core/language/stdlib/pairing";
 *
 * const space = {
 *   pts: ["a", "b"],
 *   sts: ["x"],
 *   r: [
 *     { pt: "a", st: "x", charge: "held" },
 *     { pt: "b", st: "x", charge: "unknown" },
 *   ],
 * };
 *
 * evaluateRunTerm(chu.dual, space);
 * // {
 * //   pts: ["x"],
 * //   sts: ["a", "b"],
 * //   r: [
 * //     { pt: "x", st: "a", charge: "unknown" },   // negate("held") = "unknown"
 * //     { pt: "x", st: "b", charge: "held" },      // negate("unknown") = "held"
 * //   ]
 * // }
 * ```
 */
export const chuDualTerm = tm.lam(  // space = var(0)
  objectTerm([
    ["pts", tm.field("sts", tm.var(0))],
    ["r", tm.reverseArray(tm.fold(
      // combinator: acc=var(1), entry=var(0) [+2: space=var(2)]
      tm.lam(tm.lam(
        tm.consArray(
          objectTerm([
            ["charge", negateChargeStringTerm(tm.field("charge", tm.var(0)))],
            ["pt", tm.field("st", tm.var(0))],
            ["st", tm.field("pt", tm.var(0))],
          ]),
          tm.var(1),
        )
      )),
      arrayTerm([]),
      tm.field("r", tm.var(0)),  // space.r — outer lambda is depth 1 here
    ))],
    ["sts", tm.field("pts", tm.var(0))],
  ])
);

// ── matrix lookup ─────────────────────────────────────────────────────────────

/**
 * `chuLookupTerm` — evaluate the FOUR-valued matrix at a single `(pt, st)` cell.
 *
 * Takes `{ pt, space, st }` and scans `space.r` for the first entry with matching
 * `pt` and `st` (structural coincidence). Returns that entry's `charge`. If no
 * entry is found, returns `"contested"` (= ⊥ₖ, the bottom-knowledge charge).
 *
 * This is the finite-space evaluation of the abstract matrix `r : pts → sts → Charge`
 * from `ChuSpace`. The short-circuit fold terminates as soon as a match is found.
 *
 * De Bruijn inside the combinator (2 lambdas deep):
 *   var(0) = entry, var(1) = acc, var(2) = input
 *
 * @example
 * ```js
 * import { evaluateRunTerm } from "@red-cup-engineering/metroplat";
 * import * as chu from "@red-cup-engineering/metroplat/core/language/stdlib/pairing";
 *
 * const space = {
 *   pts: ["a"], sts: ["x"],
 *   r: [{ pt: "a", st: "x", charge: "held" }],
 * };
 *
 * evaluateRunTerm(chu.lookup, { space, pt: "a", st: "x" }); // "held"
 * evaluateRunTerm(chu.lookup, { space, pt: "a", st: "y" }); // "contested" (not found)
 * ```
 */
export const chuLookupTerm = tm.lam(  // input = {pt, space, st} = var(0)
  tm.field("charge",
    tm.fold(
      // combinator: acc=var(1), entry=var(0) [+2: input=var(2)]
      tm.lam(tm.lam(
        tm.cond(
          booleanConditionTerm(tm.field("found", tm.var(1))),  // already found — short-circuit
          tm.var(1),
          tm.cond(
            tm.coincide(tm.field("pt", tm.var(0)), tm.field("pt", tm.var(2))),
            tm.cond(
              tm.coincide(tm.field("st", tm.var(0)), tm.field("st", tm.var(2))),
              // match: return {charge: entry.charge, found: true}
              objectTerm([
                ["charge", tm.field("charge", tm.var(0))],
                ["found", jsonToTerm(true)],
              ]),
              tm.var(1),  // wrong st
            ),
            tm.var(1),  // wrong pt
          ),
        )
      )),
      // init: {charge: contested (⊥ₖ, not found), found: false}
      objectTerm([["charge", stringTerm("contested")], ["found", jsonToTerm(false)]]),
      tm.field("r", tm.field("space", tm.var(0))),  // input.space.r
    )
  )
);

// ── the involution witness ────────────────────────────────────────────────────

/**
 * `chuDualInvolutionTerm` — witness that the dual is an involution.
 *
 * Takes any `{ pts, r, sts }` and returns `true` iff `dual(dual(space)) = space`.
 * (spaces where every `charge` entry is a valid FOUR value and reduces via
 * `negate_negate`).
 *
 *
 * @example
 * ```js
 * import { evaluateRunTerm } from "@red-cup-engineering/metroplat";
 * import * as chu from "@red-cup-engineering/metroplat/core/language/stdlib/pairing";
 *
 * evaluateRunTerm(chu.dualInvolution, {
 *   pts: ["a"], sts: ["x"],
 *   r: [{ pt: "a", st: "x", charge: "held" }],
 * }); // true
 * ```
 */
export const chuDualInvolutionTerm = tm.lam(  // space = var(0)
  booleanResultTerm(tm.coincide(
    tm.app(chuDualTerm, tm.app(chuDualTerm, tm.var(0))),
    tm.var(0)
  ))
);
