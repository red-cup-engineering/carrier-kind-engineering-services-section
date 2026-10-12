/** One SEN contraction table. Step, complete development, and normalization
 * differ only in strategy; all congruence comes from grammar child slots.
 * Each takes the interpreter's primitive table, `{ name: (json) => json }`, for
 * the δ-rule `prim`; a `prim` whose name the table lacks is refused, never stuck. */
import {
  tm,
  instantiateSen,
  boolOfTerm,
  isSenValue,
  mapSenImmediate,
  SEN_FORMS,
  senListHeadTail,
  validateSenTerm,
} from "./notation.mjs";
import {
  jsonToTerm,
  termToJson,
} from "./json-codec.mjs";
import { semanticBytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

function dedupe(terms) {
  const seen = new Set();
  return Object.freeze(
    terms.filter((term) => {
      const key = JSON.stringify(term);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

function rebuild(term, children) {
  return mapSenImmediate(
    term,
    (child, index, childIndex) => children[index]?.[childIndex ?? 0] ?? child,
  );
}

/** Apply a δ-rule: the named primitive on the JSON its value argument encodes. */
function delta(name, argument, primitives) {
  if (!Object.hasOwn(primitives, name)) {
    const error = new Error(`SEN: no primitive named ${JSON.stringify(name)} in this interpreter`);
    error.code = "unknown-primitive";
    throw error;
  }
  return jsonToTerm(primitives[name](termToJson(argument)));
}

/** Contract one root redex using already-selected child terms, or null. */
function contract(term, children = {}, primitives = {}) {
  const child = (index) => children[index]?.[0] ?? term[index];
  switch (term[0]) {
    case "app":
      return term[1][0] === "lam"
        ? instantiateSen(child(1)[1], child(2))
        : null;
    case "fst":
      return term[1][0] === "pair" ? child(1)[1] : null;
    case "snd":
      return term[1][0] === "pair" ? child(1)[2] : null;
    case "coincide":
      return isSenValue(child(1)) && isSenValue(child(2))
        ? tm.bool(semanticBytes(child(1)).equals(semanticBytes(child(2))))
        : null;
    case "cond": {
      const value = boolOfTerm(child(1));
      return value === undefined ? null : value ? child(2) : child(3);
    }
    case "fold": {
      const decomposed = senListHeadTail(child(3));
      if (decomposed === "empty") return child(2);
      if (decomposed === undefined) return null;
      return tm.fold(
        child(1),
        tm.app(tm.app(child(1), child(2)), decomposed.head),
        decomposed.tail,
      );
    }
    case "prim":
      return isSenValue(child(2)) ? delta(term[1], child(2), primitives) : null;
    case "case":
      return child(1)[0] === "inl"
        ? instantiateSen(child(2), child(1)[1])
        : child(1)[0] === "inr"
          ? instantiateSen(child(3), child(1)[2])
          : null;
    default:
      return null;
  }
}

/** Full one-step relation: one root contraction or one immediate-child step. */
function stepUnchecked(term, primitives) {
  const out = [],
    root = contract(term, {}, primitives);
  if (root) out.push(root);
  mapSenImmediate(term, (child, index, childIndex) => {
    for (const next of stepUnchecked(child, primitives)) {
      const children = { [index]: [] };
      if (childIndex === undefined) children[index][0] = next;
      else {
        children[index] = [...term[index]];
        children[index][childIndex] = next;
      }
      out.push(rebuild(term, children));
    }
    return child;
  });
  return dedupe(out);
}

/** Select normal order's one next contraction without constructing the rest
 * of the one-step relation. The descriptor fixes child order for every SEN
 * form, so this remains the same first result as step. */
function firstStepUnchecked(term, primitives) {
  const root = contract(term, {}, primitives);
  if (root) return root;
  const form = SEN_FORMS[term[0]];
  for (const index of form.terms ?? []) {
    const next = firstStepUnchecked(term[index], primitives);
    if (next) {
      const out = [...term];
      out[index] = next;
      return out;
    }
  }
  return undefined;
}

export function step(source, primitives = {}) {
  return stepUnchecked(validateSenTerm(source), primitives);
}

/** Takahashi development: contract only redexes present in the input tree. */
function devUnchecked(term, primitives) {
  const children = {};
  mapSenImmediate(term, (child, index, childIndex) => {
    if (childIndex === undefined) {
      children[index] = [devUnchecked(child, primitives)];
    } else {
      children[index] ??= [...term[index]];
      children[index][childIndex] = devUnchecked(child, primitives);
    }
    return child;
  });
  return contract(term, children, primitives) ?? rebuild(term, children);
}

export function dev(source, primitives = {}) {
  return devUnchecked(validateSenTerm(source), primitives);
}

/** Normal order over the same contraction table; it never returns undefined. */
export function normalize(source, primitives = {}) {
  let current = validateSenTerm(source);
  while (true) {
    const next = firstStepUnchecked(current, primitives);
    if (!next) return current;
    current = next;
  }
}
export const evaluate = normalize;
export { evaluate as eval };
export function evaluateRunTerm(runTerm, input, primitives = {}) {
  return termToJson(evaluate(tm.app(runTerm, jsonToTerm(input)), primitives));
}
