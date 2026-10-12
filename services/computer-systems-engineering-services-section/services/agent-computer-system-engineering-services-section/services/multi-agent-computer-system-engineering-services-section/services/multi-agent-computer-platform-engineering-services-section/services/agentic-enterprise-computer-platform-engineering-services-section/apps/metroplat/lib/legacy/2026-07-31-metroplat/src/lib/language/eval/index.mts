/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/metroplat/core/language/eval` is the RMN reduction engine.
 *
 * `step` (one-step reducts), `dev` (Takahashi complete development), and
 * JSON, apply a run-term, evaluate, decode. The bidirectional type checker
 *
 * The charge reduction rules delegate to the `lib/values` charge algebra; `fold`
 * (the one structural recursion) delegates to the bridge helper exported from
 * evaluators/projecting. `field`/`append` are `fold` compositions built in
 * the grammar layer, not opcodes here.
 *
 * Product reading: this is the executable proof-kernel side of the package's
 * behavior-as-data story. A pure schema morphism can be carried as an RMN
 * body, inspected by TypeDoc and action audits, projected through CLI/HTTP/MCP,
 * and replayed against Lean golden vectors where the package has them. Boundary
 * effects remain outside this evaluator.
 */
import { type JsonValue } from "../../codecs/json/core.mts";
import { type Tm, tm, inst, boolOfTerm } from "../ast/index.mts";
import {
  isValueTerm,
  arrayHeadTail,
  jsonToTerm,
  termToJson,
} from "../reader/projecting/index.mts";

// ── internal helpers ──────────────────────────────────────────────────────────

function dedupe(terms: readonly Tm[]): readonly Tm[] {
  const seen = new Set<string>();
  const out: Tm[] = [];
  for (const term of terms) {
    const key = JSON.stringify(term);
    if (!seen.has(key)) { seen.add(key); out.push(term); }
  }
  return Object.freeze(out);
}

// ── reduction ─────────────────────────────────────────────────────────────────

export function step(term: Tm): readonly Tm[] {
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

export function dev(term: Tm): Tm {
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

export function normalize(term: Tm): Tm {
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

export function evaluate(term: Tm): Tm {
  return normalize(term);
}

export { evaluate as eval };

/** Apply an action run-term to admitted JSON input and evaluate it. */
export function evaluateRunTerm(runTerm: Tm, input: JsonValue): JsonValue {
  const normal = evaluate(tm.app(runTerm, jsonToTerm(input)));
  return termToJson(normal);
}
