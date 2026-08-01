/**
 * @packageDocumentation
 *
 * RMN type checking and structural term analysis.
 *
 * Transcribed from metroplat's `src/lib/language/check/index.mts`, behavior
 * preserved exactly (TypeScript type annotations dropped; JSDoc typedefs
 * substituted, imported from `@red-cup-engineering/relation-model-notation`
 * in place of the relative `../ast/index.mts`). This package adds no new
 * judgments and no new term/type forms of its own — it is purely the
 * bidirectional CHL-core typer and a handful of structural term queries
 * over the grammar that package already defines.
 */
import { ty } from "@red-cup-engineering/relation-model-notation";

/**
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Ty} Ty
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Tm} Tm
 */

// ── type checker ──────────────────────────────────────────────────────────────

/**
 * Structural equality of types.
 * @param {Ty} left
 * @param {Ty} right
 * @returns {boolean}
 */
export function tyEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Infer the type of an inferable CHL-core term in a context, or null.
 * @param {readonly Ty[]} ctx
 * @param {Tm} term
 * @returns {Ty | null}
 */
export function inferTy(ctx, term) {
  switch (term[0]) {
    case "var": return ctx[term[1]] ?? null;
    case "star": return ty.unit();
    // Marks inhabit the base type: the atoms rule of STLC-with-atoms, earned
    // 2026-07-04 for typed term addressing (a path is a product of marks, so a
    // well-typed path term is a proof the address composes). TS-ahead-of-Lean:
    // RelMath.CHL.HasTy has no atom rule yet — golden-vector this against the
    // Lean side before treating base-typed judgments as proven (see the
    // conformance obligation in the CHL-cone campaign).
    case "mark": return ty.base();
    case "app": {
      const fn = inferTy(ctx, term[1]);
      if (fn !== null && fn[0] === "arrow") return checkTy(ctx, term[2], fn[1]) ? fn[2] : null;
      const argTy = inferTy(ctx, term[2]);
      if (argTy !== null && term[1][0] === "lam") return inferTy([argTy, ...ctx], term[1][1]);
      return null;
    }
    case "fst": {
      const product = inferTy(ctx, term[1]);
      return product !== null && product[0] === "prod" ? product[1] : null;
    }
    case "snd": {
      const product = inferTy(ctx, term[1]);
      return product !== null && product[0] === "prod" ? product[2] : null;
    }
    case "pair": {
      const left = inferTy(ctx, term[1]);
      const right = inferTy(ctx, term[2]);
      return left !== null && right !== null ? ty.prod(left, right) : null;
    }
    // `coincide` always reduces to `tm.bool(...)`, a `charge` mark (`dev`'s
    // "coincide" case) — so it inhabits `base` exactly as any other mark does,
    // regardless of what its two compared operands are.
    case "coincide": return ty.base();
    // `cond` is the McCarthy eliminator: well-typed exactly when both branches
    // share a type, independent of the test (the test only has to reduce to a
    // bool-mark at runtime, which `coincide`/`tm.bool` already guarantee by
    // construction — nothing upstream can hand `cond` an ill-typed test since
    // `chargeCase`, the one producer of `cond` in this kernel, always builds
    // it from `coincide`).
    case "cond": {
      const thenTy = inferTy(ctx, term[2]);
      const elseTy = inferTy(ctx, term[3]);
      return thenTy !== null && elseTy !== null && tyEqual(thenTy, elseTy) ? thenTy : null;
    }
    // `fold(combine, init, list) : B` given `list : List(A)`, `init : B`, and
    // `combine : B -> A -> B` — the standard left-fold typing rule. Argument
    // order matches `dev`'s actual reduction (`app(app(combine, acc), head)`
    // — accumulator first, element second), not the more common `A -> B -> B`
    // foldr convention; getting this backwards type-checks fine on any
    // example where the element and accumulator types coincide (e.g. both
    // `base`) and silently fails otherwise, which is exactly the shape of bug
    // this comment exists to name.
    //
    // This makes `field` (constant-accumulator search: the found value stays
    // one type throughout) typeable. It does NOT make `append` typeable:
    // `append`'s own reverse-then-refold builds a growing right-nested pair
    // at each step (`star()`, then `pair(x,star())`, then `pair(x,pair(x,
    // star()))`, ...) — a different TYPE at every step, i.e. a length-indexed
    // list, which this non-dependent rule cannot and should not accept. Any
    // term built through `append` (which is most of them — see
    // `evaluators/counting`, `evaluators/inducing`) stays untypeable until
    // `append` gets its own (dependent) treatment; this closes the `field`
    // half of the gap, not the whole one.
    case "fold": {
      const listTy = inferTy(ctx, term[3]);
      if (listTy === null || listTy[0] !== "list") return null;
      const elemTy = listTy[1];
      const initTy = inferTy(ctx, term[2]);
      if (initTy === null) return null;
      return checkTy(ctx, term[1], ty.arrow(initTy, ty.arrow(elemTy, initTy))) ? initTy : null;
    }
    default: return null;
  }
}

/**
 * Check a CHL-core term against a type — the decidable HasTy.
 * @param {readonly Ty[]} ctx
 * @param {Tm} term
 * @param {Ty} type
 * @returns {boolean}
 */
export function checkTy(ctx, term, type) {
  if (term[0] === "lam") return type[0] === "arrow" && checkTy([type[1], ...ctx], term[1], type[2]);
  if (term[0] === "pair") return type[0] === "prod" && checkTy(ctx, term[1], type[1]) && checkTy(ctx, term[2], type[2]);
  const inferred = inferTy(ctx, term);
  if (inferred !== null) return tyEqual(inferred, type);
  if (term[0] === "app") {
    const argTy = inferTy(ctx, term[2]);
    if (argTy !== null && checkTy(ctx, term[1], ty.arrow(argTy, type))) return true;
  }
  return false;
}

/**
 * @param {readonly Ty[]} ctx
 * @param {Tm} term
 * @param {Ty} type
 * @returns {boolean}
 */
export const hasTy = (ctx, term, type) => checkTy(ctx, term, type);

// ── structural analysis ───────────────────────────────────────────────────────

/**
 * Count the total number of nodes in a term.
 * @param {Tm} term
 * @returns {number}
 */
export function termSize(term) {
  switch (term[0]) {
    case "var": case "star": case "mark": return 1;
    case "lam": case "fst": case "snd":
      return 1 + termSize(term[1]);
    case "app": case "pair": case "coincide":
      return 1 + termSize(term[1]) + termSize(term[2]);
    case "cond": case "fold": return 1 + termSize(term[1]) + termSize(term[2]) + termSize(term[3]);
  }
}

/**
 * Collect the unique opcode tags used within a term, in sorted order.
 * @param {Tm} term
 * @returns {readonly string[]}
 */
export function termUses(term) {
  const uses = new Set();
  function collect(t) {
    uses.add(t[0]);
    switch (t[0]) {
      case "var": case "star": case "mark": break;
      case "lam": case "fst": case "snd":
        collect(t[1]); break;
      case "app": case "pair": case "coincide":
        collect(t[1]); collect(t[2]); break;
      case "cond": case "fold": collect(t[1]); collect(t[2]); collect(t[3]); break;
    }
  }
  collect(term);
  return Object.freeze([...uses].sort());
}

/**
 * True if the term contains no free de Bruijn variables.
 * @param {Tm} term
 * @returns {boolean}
 */
export function isClosed(term) {
  function hasFree(t, depth) {
    switch (t[0]) {
      case "var": return t[1] >= depth;
      case "star": case "mark": return false;
      case "lam": return hasFree(t[1], depth + 1);
      case "fst": case "snd":
        return hasFree(t[1], depth);
      case "app": case "pair": case "coincide":
        return hasFree(t[1], depth) || hasFree(t[2], depth);
      case "cond": case "fold":
        return hasFree(t[1], depth) || hasFree(t[2], depth) || hasFree(t[3], depth);
    }
  }
  return !hasFree(term, 0);
}
