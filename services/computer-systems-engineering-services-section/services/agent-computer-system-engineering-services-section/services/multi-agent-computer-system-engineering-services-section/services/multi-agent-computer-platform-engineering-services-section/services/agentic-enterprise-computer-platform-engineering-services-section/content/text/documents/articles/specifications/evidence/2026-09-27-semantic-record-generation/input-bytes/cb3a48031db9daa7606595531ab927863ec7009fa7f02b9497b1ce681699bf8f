/** One SEN judgment over the canonical Curry-Howard-Lambek grammar. */
import {
  mapSenTerm,
  validateSenTerm,
  validateSenType,
} from "./notation.mjs";

export function tyEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The sole recursive inference/checking engine. `expected` selects checking. */
export function judgeSen(ctx, source, expected = undefined) {
  const checkedContext = ctx.map(validateSenType);
  const term = validateSenTerm(source);
  const want = expected === undefined ? undefined : validateSenType(expected);
  return judge(checkedContext, term, want);
}

function judge(ctx, term, want = undefined) {
  const infer = () => {
    switch (term[0]) {
      case "var":
        return ctx[term[1]] ?? null;
      case "star":
        return ["unit"];
      case "mark":
        return ["base"];
      case "app": {
        const fn = judge(ctx, term[1]);
        if (fn?.[0] === "arrow" && judge(ctx, term[2], fn[1])) return fn[2];
        const arg = judge(ctx, term[2]);
        if (want && arg && judge(ctx, term[1], ["arrow", arg, want]))
          return want;
        if (arg && term[1][0] === "lam") return judge([arg, ...ctx], term[1][1]);
        // A curried application of an unannotated lambda chain,
        // app(app(lam(lam body), a), b): judge the body under each argument's type.
        const args = [];
        let head = term;
        while (head[0] === "app") { args.unshift(head[2]); head = head[1]; }
        let scope = ctx;
        for (const argument of args) {
          if (head[0] !== "lam") return null;
          const argType = judge(ctx, argument);
          if (!argType) return null;
          scope = [argType, ...scope];
          head = head[1];
        }
        return judge(scope, head);
      }
      case "pair": {
        // Cons over an array-encoded list: pair(fst xs, pair(h, snd xs)) with
        // xs : list T and h : T is again a list T (tm.consArray's derivation).
        const cons = consOfArray(ctx, term);
        if (cons !== undefined) return cons;
        const leftTypes = [];
        let cursor = term;
        while (cursor[0] === "pair") {
          const left = judge(ctx, cursor[1]);
          if (!left) return null;
          leftTypes.push(left);
          cursor = cursor[2];
        }
        let result = judge(ctx, cursor);
        if (!result) return null;
        for (let index = leftTypes.length - 1; index >= 0; index -= 1)
          result = ["prod", leftTypes[index], result];
        return result;
      }
      case "fst":
      case "snd": {
        const pair = judge(ctx, term[1]);
        return pair?.[0] === "prod" ? pair[term[0] === "fst" ? 1 : 2] : null;
      }
      case "coincide": {
        const left = judge(ctx, term[1]), right = judge(ctx, term[2]);
        return left && right && tyEqual(left, right) ? ["base"] : null;
      }
      case "cond": {
        const yes = judge(ctx, term[2]),
          no = judge(ctx, term[3]);
        return judge(ctx, term[1], ["base"]) && yes && no
          ? joinBranchTypes(yes, no)
          : null;
      }
      case "inl": {
        const left = judge(ctx, term[1]);
        return left ? ["sum", left, term[2]] : null;
      }
      case "inr": {
        const right = judge(ctx, term[2]);
        return right ? ["sum", term[1], right] : null;
      }
      case "case": {
        const subject = judge(ctx, term[1]);
        if (subject?.[0] !== "sum") return null;
        const left = judge([subject[1], ...ctx], term[2]);
        const right = judge([subject[2], ...ctx], term[3]);
        return left && right ? joinBranchTypes(left, right) : null;
      }
      case "abort":
        return judge(ctx, term[1], ["empty"]) ? term[2] : null;
      case "fold": {
        const element = listElementOf(judge(ctx, term[3])),
          initType = judge(ctx, term[2]);
        if (element === undefined || !initType) return null;
        // The accumulator is the expected type when checking; otherwise a
        // list-shaped init widens to its list type, so an empty-list seed
        // accumulates a list rather than staying the empty product.
        const initElement = listElementOf(initType);
        const accumulator = want && judge(ctx, term[2], want)
          ? want
          : initElement ? ["list", initElement] : initType;
        // An empty list's element is unconstrained: only the combiner's arity is judged.
        if (element === null) return term[1][0] === "lam" && term[1][1][0] === "lam" ? accumulator : null;
        const combines = (acc) => judge(ctx, term[1], ["arrow", acc, ["arrow", element, acc]]);
        if (combines(accumulator)) return accumulator;
        // An empty-list seed says nothing of its element: widen it once to the
        // list the combiner builds from it, then judge the combiner again.
        if (initElement === null && term[1][0] === "lam" && term[1][1][0] === "lam") {
          const built = judge([element, accumulator, ...ctx], term[1][1][1]);
          if (built && listElementOf(built) && combines(built)) return built;
        }
        return null;
      }
      default:
        return null;
    }
  };
  if (term[0] === "lam" && want)
    return want[0] === "arrow" && judge([want[1], ...ctx], term[1], want[2]);
  if (term[0] === "pair" && want?.[0] === "prod")
    return judge(ctx, term[1], want[1]) && judge(ctx, term[2], want[2]);
  if (term[0] === "inl" && want?.[0] === "sum")
    return tyEqual(term[2], want[2]) && judge(ctx, term[1], want[1]);
  if (term[0] === "inr" && want?.[0] === "sum")
    return tyEqual(term[1], want[1]) && judge(ctx, term[2], want[2]);
  if (term[0] === "case" && want) {
    const subject = judge(ctx, term[1]);
    return subject?.[0] === "sum"
      && judge([subject[1], ...ctx], term[2], want)
      && judge([subject[2], ...ctx], term[3], want);
  }
  // An array literal checks against list T element by element, so elements of
  // one declared type may still differ in structural shape (nested lists).
  if (want?.[0] === "list" && term[0] === "pair" && term[1][0] === "mark") {
    let spine = term[2];
    while (spine[0] === "pair") {
      if (!judge(ctx, spine[1], want[1])) return false;
      spine = spine[2];
    }
    if (spine[0] === "star") return true;
  }
  const got = infer();
  if (want === undefined) return got;
  if (got === null) return false;
  if (want[0] === "list") {
    const element = listElementOf(got);
    return element === null || (element !== undefined && tyEqual(element, want[1]));
  }
  return tyEqual(got, want);
}

/** The type two branches share: equal types, or two list-shaped types whose
 * elements agree, an empty list agreeing with any element. */
function joinBranchTypes(left, right) {
  if (tyEqual(left, right)) return left;
  const leftElement = listElementOf(left), rightElement = listElementOf(right);
  if (leftElement === undefined || rightElement === undefined) return null;
  if (leftElement === null) return rightElement === null ? left : ["list", rightElement];
  if (rightElement === null || tyEqual(leftElement, rightElement)) return ["list", leftElement];
  return null;
}

function consOfArray(ctx, term) {
  const [, tag, rest] = term;
  if (tag[0] !== "fst" || rest[0] !== "pair" || rest[2][0] !== "snd") return undefined;
  if (JSON.stringify(tag[1]) !== JSON.stringify(rest[2][1])) return undefined;
  const element = listElementOf(judge(ctx, tag[1]));
  if (element === undefined) return undefined;
  const head = judge(ctx, rest[1]);
  if (!head || (element !== null && !tyEqual(head, element))) return null;
  return ["list", head];
}

/**
 * The element type of an array-encoded list: `list T` itself, or the type of
 * `pair(mark(tag), spine)` — `prod base S` — whose star-ended spine S holds
 * only T. Null for an empty list (any element), undefined when not a list.
 */
function listElementOf(type) {
  if (type?.[0] === "list") return type[1];
  if (type?.[0] !== "prod" || type[1]?.[0] !== "base") return undefined;
  let element = null;
  for (let spine = type[2]; ; spine = spine[2]) {
    if (spine?.[0] === "unit") return element;
    if (spine?.[0] !== "prod") return undefined;
    if (element !== null && !tyEqual(element, spine[1])) return undefined;
    element = spine[1];
  }
}

export function inferTy(ctx, term) {
  return judgeSen(ctx, term);
}
export function checkTy(ctx, term, type) {
  return judgeSen(ctx, term, type);
}
export const hasTy = checkTy;
export function termSize(term) {
  let size = 0;
  mapSenTerm(term, (node) => {
    size += 1;
    return node;
  });
  return size;
}
export function termUses(term) {
  const uses = new Set();
  mapSenTerm(term, (node) => {
    uses.add(node[0]);
    return node;
  });
  return Object.freeze([...uses].sort());
}
export function isClosed(term) {
  let closed = true;
  mapSenTerm(term, (node, depth) => {
    if (node[0] === "var" && node[1] >= depth) closed = false;
    return node;
  });
  return closed;
}
