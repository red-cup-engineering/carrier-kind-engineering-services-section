/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relation-model-notation-eval` is the RMN reduction engine.
 *
 * `step` (one-step reducts), `dev` (Takahashi complete development), and
 * `normalize`/`evaluate` (reduction to normal form) operate over RMN terms.
 * `evaluateRunTerm` is the action-execution entry point: admit run-term input
 * JSON, apply a run-term, evaluate, decode.
 *
 * The charge reduction rules delegate to the `mark`-encoded charge algebra
 * built in the grammar layer (`tm.negate`/`tm.joinK`/etc., all `cond`/`coincide`
 * compositions); `fold` (the one structural recursion) delegates to the bridge
 * helper (`arrayHeadTail`) exported from the projecting package. `field`/`append`
 * are `fold` compositions built in the grammar layer, not opcodes here.
 *
 * Product reading: this is the executable proof-kernel side of the package's
 * behavior-as-data story. A pure schema morphism can be carried as an RMN
 * body, inspected by TypeDoc and action audits, projected through CLI/HTTP/MCP,
 * and replayed against Lean golden vectors where the package has them. Boundary
 * effects remain outside this evaluator.
 *
 * Every export here is a typed gate in the Hoare-triple sense RMN's own
 * morphism-packet format (`{verb, domain, codomain, runTerm}`) already
 * commits to. `step : Tm -> readonly Tm[]` is a specific carrier-type "in", a
 * pure (non-deterministic) transformation, a specific carrier-type "out" — it
 * is the ENTIRE one-step reduction relation made total and enumerable, every
 * currently-present redex reduced individually, none reduced together.
 * `dev : Tm -> Tm` is the Takahashi triangle map: the same domain and
 * codomain as `step`'s elements, but the transformation reduces every
 * currently-present redex ONCE, simultaneously, in a single call — it does
 * not chase redexes `dev` itself just created. `normalize : Tm -> Tm` shares
 * the domain and codomain again, but its transformation recurses to full
 * normal form, re-normalizing after each substitution, so it is the only one
 * of the three whose codomain is guaranteed irreducible when it returns.
 * `evaluateRunTerm : (Tm, JsonValue) -> JsonValue` is one level up: its
 * domain is a run-term paired with already-admitted JSON, its transformation
 * is admit-apply-evaluate, its codomain is JSON decoded back out — the crossing
 * a caller at the JSON boundary actually uses, built from the three term-level
 * gates below it plus the projecting package's own `jsonToTerm`/`termToJson`
 * crossings. Reading each export this way — domain and codomain first,
 * transformation second — is exactly how the functions below are meant to be
 * read.
 *
 * Transcribed from metroplat's `src/lib/language/eval/index.mts`, behavior
 * preserved exactly (TypeScript type annotations dropped; JSDoc typedefs
 * substituted). `tm`/`inst`/`boolOfTerm` now come from
 * `@red-cup-engineering/relation-model-notation` in place of the relative
 * `../ast/index.mts`; `isValueTerm`/`arrayHeadTail`/`jsonToTerm`/`termToJson`
 * now come from `@red-cup-engineering/relation-model-notation-projecting` in
 * place of the relative `../reader/projecting/index.mts`.
 *
 * `JsonValue` (type only, from `codecs/json/core.mts`) is DELIBERATELY still
 * imported directly from metroplat's legacy tree by relative path, not from
 * any published package — the same deliberate, scoped, noted dependency the
 * projecting package already carries for the same type.
 */
import { tm, inst, boolOfTerm } from "@red-cup-engineering/relation-model-notation";
import {
  isValueTerm,
  arrayHeadTail,
  jsonToTerm,
  termToJson,
} from "@red-cup-engineering/relation-model-notation-projecting";

/**
 * @typedef {import("../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/src/lib/codecs/json/core.mts").JsonValue} JsonValue
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Tm} Tm
 */

// ── internal helpers ──────────────────────────────────────────────────────────

/**
 * @param {readonly Tm[]} terms
 * @returns {readonly Tm[]}
 */
function dedupe(terms) {
  const seen = new Set();
  const out = [];
  for (const term of terms) {
    const key = JSON.stringify(term);
    if (!seen.has(key)) { seen.add(key); out.push(term); }
  }
  return Object.freeze(out);
}

// ── reduction ─────────────────────────────────────────────────────────────────

/** Every one-step reduct of `term` (non-deterministic — the full one-step
 *  reduction relation, congruent in every subterm, made total and enumerable).
 * @param {Tm} term
 * @returns {readonly Tm[]}
 */
export function step(term) {
  switch (term[0]) {
    case "var":
    case "star":
    case "mark":
      return Object.freeze([]);
    case "lam":
      return dedupe(step(term[1]).map((body) => tm.lam(body)));
    case "app": {
      const top = term[1][0] === "lam" ? [inst(term[1][1], term[2])] : [];
      return dedupe([
        ...top,
        ...step(term[1]).map((fn) => tm.app(fn, term[2])),
        ...step(term[2]).map((arg) => tm.app(term[1], arg)),
      ]);
    }
    case "pair":
      return dedupe([
        ...step(term[1]).map((left) => tm.pair(left, term[2])),
        ...step(term[2]).map((right) => tm.pair(term[1], right)),
      ]);
    case "fst": {
      const top = term[1][0] === "pair" ? [term[1][1]] : [];
      return dedupe([...top, ...step(term[1]).map((value) => tm.fst(value))]);
    }
    case "snd": {
      const top = term[1][0] === "pair" ? [term[1][2]] : [];
      return dedupe([...top, ...step(term[1]).map((value) => tm.snd(value))]);
    }
    case "coincide": {
      const settled = isValueTerm(term[1]) && isValueTerm(term[2]);
      return dedupe([
        ...(settled ? [tm.bool(JSON.stringify(term[1]) === JSON.stringify(term[2]))] : []),
        ...step(term[1]).map((left) => tm.coincide(left, term[2])),
        ...step(term[2]).map((right) => tm.coincide(term[1], right)),
      ]);
    }
    case "cond": {
      const testBool = boolOfTerm(term[1]);
      const top = testBool === undefined ? [] : [testBool ? term[2] : term[3]];
      return dedupe([
        ...top,
        ...step(term[1]).map((test) => tm.cond(test, term[2], term[3])),
        ...step(term[2]).map((then) => tm.cond(term[1], then, term[3])),
        ...step(term[3]).map((otherwise) => tm.cond(term[1], term[2], otherwise)),
      ]);
    }
    case "fold": {
      const decomposed = arrayHeadTail(term[3]);
      const top = decomposed === "empty"
        ? [term[2]]
        : decomposed === undefined
          ? []
          : [tm.fold(term[1], tm.app(tm.app(term[1], term[2]), decomposed.head), decomposed.tail)];
      return dedupe([
        ...top,
        ...step(term[1]).map((combine) => tm.fold(combine, term[2], term[3])),
        ...step(term[2]).map((init) => tm.fold(term[1], init, term[3])),
        ...step(term[3]).map((list) => tm.fold(term[1], term[2], list)),
      ]);
    }
  }
}

/** Takahashi complete development: reduce every redex CURRENTLY PRESENT in
 *  `term` once, simultaneously — the map whose triangle property (every
 *  parallel reduct of `t` parallel-reduces to `dev t`) gives Church-Rosser
 *  its diamond directly. Does not chase redexes this call itself creates.
 * @param {Tm} term
 * @returns {Tm}
 */
export function dev(term) {
  switch (term[0]) {
    case "var": return tm.var(term[1]);
    case "star": return tm.star();
    case "mark": return tm.mark(term[1]);
    case "lam": return tm.lam(dev(term[1]));
    case "app":
      return term[1][0] === "lam"
        ? inst(dev(term[1][1]), dev(term[2]))
        : tm.app(dev(term[1]), dev(term[2]));
    case "pair": return tm.pair(dev(term[1]), dev(term[2]));
    case "fst": return term[1][0] === "pair" ? dev(term[1][1]) : tm.fst(dev(term[1]));
    case "snd": return term[1][0] === "pair" ? dev(term[1][2]) : tm.snd(dev(term[1]));
    case "coincide": {
      const a = dev(term[1]);
      const b = dev(term[2]);
      if (isValueTerm(a) && isValueTerm(b)) return tm.bool(JSON.stringify(a) === JSON.stringify(b));
      return tm.coincide(a, b);
    }
    case "cond": {
      const test = dev(term[1]);
      const testBool = boolOfTerm(test);
      if (testBool !== undefined) return testBool ? dev(term[2]) : dev(term[3]);
      return tm.cond(test, dev(term[2]), dev(term[3]));
    }
    case "fold": {
      const combine = dev(term[1]);
      const init = dev(term[2]);
      const list = dev(term[3]);
      const decomposed = arrayHeadTail(list);
      if (decomposed === "empty") return init;
      if (decomposed === undefined) return tm.fold(combine, init, list);
      return dev(tm.fold(combine, tm.app(tm.app(combine, init), decomposed.head), decomposed.tail));
    }
  }
}

/** Full reduction to normal form: recurses into subterms first, then
 *  re-normalizes after each substitution. The "run this to completion"
 *  workhorse, guaranteed to return an irreducible term.
 * @param {Tm} term
 * @returns {Tm}
 */
export function normalize(term) {
  switch (term[0]) {
    case "var": return tm.var(term[1]);
    case "star": return tm.star();
    case "mark": return tm.mark(term[1]);
    case "lam": return tm.lam(normalize(term[1]));
    case "app": {
      const fn = normalize(term[1]);
      const arg = normalize(term[2]);
      return fn[0] === "lam" ? normalize(inst(fn[1], arg)) : tm.app(fn, arg);
    }
    case "pair": return tm.pair(normalize(term[1]), normalize(term[2]));
    case "fst": {
      const value = normalize(term[1]);
      return value[0] === "pair" ? normalize(value[1]) : tm.fst(value);
    }
    case "snd": {
      const value = normalize(term[1]);
      return value[0] === "pair" ? normalize(value[2]) : tm.snd(value);
    }
    case "coincide": {
      const left = normalize(term[1]);
      const right = normalize(term[2]);
      return isValueTerm(left) && isValueTerm(right)
        ? tm.bool(JSON.stringify(left) === JSON.stringify(right))
        : tm.coincide(left, right);
    }
    case "cond": {
      const test = normalize(term[1]);
      const testBool = boolOfTerm(test);
      if (testBool !== undefined) return normalize(testBool ? term[2] : term[3]);
      return tm.cond(test, normalize(term[2]), normalize(term[3]));
    }
    case "fold": {
      const combine = normalize(term[1]);
      const init = normalize(term[2]);
      const list = normalize(term[3]);
      const decomposed = arrayHeadTail(list);
      if (decomposed === "empty") return init;
      if (decomposed === undefined) return tm.fold(combine, init, list);
      return normalize(tm.fold(combine, tm.app(tm.app(combine, init), decomposed.head), decomposed.tail));
    }
  }
}

/** Alias for `normalize`.
 * @param {Tm} term
 * @returns {Tm}
 */
export function evaluate(term) {
  return normalize(term);
}

export { evaluate as eval };

/** Apply an action run-term to admitted JSON input and evaluate it.
 * @param {Tm} runTerm
 * @param {JsonValue} input
 * @returns {JsonValue}
 */
export function evaluateRunTerm(runTerm, input) {
  const normal = evaluate(tm.app(runTerm, jsonToTerm(input)));
  return termToJson(normal);
}
