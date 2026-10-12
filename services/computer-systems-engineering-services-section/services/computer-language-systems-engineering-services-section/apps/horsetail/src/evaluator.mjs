// evaluator.mjs — the Horsetail evaluator: evaluate(form, env, world) → Value.
// Every value is a Value; eval is settle. The SPECIAL table dispatches the 40+ special forms.

import {
  T, F, BOT, TOP,
  potential, isTop, isBottom, isAffirmed, isDenied, isHeld, isPending,
  negate, conflate, joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  booleanOf, valueOfReading, readingOf,
  seqOf, seqFrom, fnValue, fnId, codeOf, codeFrom, valueOf, writeValue,
} from "./value.mjs";

import { sym, cell } from "./types.mjs";
import { matchForm } from "./pattern.mjs";

import { gensym, gensymWith, parseParams } from "./world.mjs";

import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { ARITH } from "./arith.mjs";
import { STRINGS } from "./strings.mjs";
import { SEQ } from "./seq.mjs";

// ── type aliases ──────────────────────────────────────────────────────────────

// ── helpers ───────────────────────────────────────────────────────────────────

/** Extract a raw JS key from a value for use as an MPU entity/predicate. */
function asKey(c) {
  const v = valueOf(c);
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return c;
}

/** Structural equality for MPU keys — handles object/array keys by JSON comparison. */
function claimEq(a, b) {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The knowledge base's settled claims about a subject, and under a predicate, as Horsetail values. */
const claimsOf = (kb, subject) => kb.claimsFor(subject).map((told) => ({ claim: told.predicate, object: told.object, value: valueOfReading(knowledgeReading(told)) }));
const subjectsOf = (kb, predicate) => kb.subjectsFor(predicate).map((told) => ({ subject: told.subject, object: told.object, value: valueOfReading(knowledgeReading(told)) }));

/** Evaluate every form in `forms` sequentially; return the last result. */
function evalSeq(forms, env, world) {
  let r = BOT;
  for (const f of forms) r = evaluate(f, env, world);
  return r;
}

/** Apply a defined fn (Horsetail or native) to evaluated args. */
function applyDef(def, args, world) {
  if (def.kind === "native") return def.fn(args, world);

  const callEnv = new Map(def.closure);
  for (let i = 0; i < def.params.length; i++) {
    const name = def.params[i];
    if (name !== undefined) callEnv.set(name, args[i] ?? BOT);
  }
  if (def.rest !== null) callEnv.set(def.rest, seqOf(args.slice(def.params.length)));

  return evalSeq(def.body, callEnv, world);
}

/** Expand a macro call: syntactically substitute arg forms into the body form.
 *
 * This is the same approach as the prior evaluator: params are substituted as
 * raw Forms, not as evaluated values. The expanded Form is then evaluated in
 * the caller's environment — that is what lets macros produce code.
 */
function expandMacro(macro, args, _env, _world) {
  const subs = new Map();
  for (let i = 0; i < macro.params.length; i++) {
    const name = macro.params[i];
    if (name !== undefined) subs.set(name, args[i] ?? cell([]));
  }
  if (macro.rest !== null) {
    subs.set(macro.rest, cell(args.slice(macro.params.length)));
  }
  return substituteForm(macro.body, subs);
}

/** Recursively replace every Sym whose name appears in `subs` with the mapped Form. */
function substituteForm(form, subs) {
  switch (form.kind) {
    case "sym": return subs.get(form.name) ?? form;
    case "cell": return cell(form.items.map(f => substituteForm(f, subs)));
    default: return form; // num, str, point-lit — not substituted
  }
}

// ── the SPECIAL table ──────────────────────────────────���──────────────────────

const SPECIAL = {

  // ── quoting ────────────────────────────────────────────────────────────────

  quote(args) {
    const f = args[0];
    return f !== undefined ? codeOf(f) : BOT;
  },

  quasiquote(args, env, world) {
    const f = args[0];
    return f !== undefined ? quasiquoteExpand(f, env, world) : BOT;
  },

  // ── sequencing ────────────────────────────────────────────────────────────

  do(args, env, world) { return evalSeq(args, env, world); },
  begin(args, env, world) { return evalSeq(args, env, world); },

  // ── binding ───────────────────────────────────────────────────────────────

  define(args, env, world) { return defForm(args, env, world); },
  def(args, env, world) { return defForm(args, env, world); },

  let(args, env, world) {
    const bindingsForm = args[0];
    if (!bindingsForm || bindingsForm.kind !== "cell") return BOT;

    const letEnv = new Map(env);
    for (const binding of bindingsForm.items) {
      if (binding.kind !== "cell" || binding.items.length < 1) continue;
      const nameForm = binding.items[0];
      const valForm = binding.items[1];
      if (!nameForm || nameForm.kind !== "sym") continue;
      const val = valForm !== undefined ? evaluate(valForm, letEnv, world) : T;
      letEnv.set(nameForm.name, val);
    }
    return evalSeq(args.slice(1), letEnv, world);
  },

  "let*"(args, env, world) { return SPECIAL["let"](args, env, world); },

  // ── functions ─────────────────────────────────────────────────────────────

  fn(args, env, world) { return makeFn(args, env, world); },
  lambda(args, env, world) { return makeFn(args, env, world); },

  // ── macros ────────────────────────────────────────────────────────────────

  defmacro(args, env, world) {
    const nameForm = args[0];
    const paramForm = args[1];
    if (!nameForm || nameForm.kind !== "sym") return BOT;
    if (!paramForm || paramForm.kind !== "cell") return BOT;

    const { params, rest } = parseParams(paramForm.items);
    const bodyForms = args.slice(2);
    const body =
      bodyForms.length === 1 ? (bodyForms[0] ?? cell([])) : cell([sym("do"), ...bodyForms]);

    world.macros.set(nameForm.name, { params, rest, body });
    return T;
  },

  // ── conditionals ──────────────────────────────────────────────────────────

  if(args, env, world) {
    const condForm = args[0];
    const thenForm = args[1];
    const elseForm = args[2];
    if (!condForm || !thenForm) return BOT;

    const cond = evaluate(condForm, env, world);
    if (isHeld(cond)) {
      // Condition is ⊤ (contested): run both branches, merge evidence, force result to ⊤.
      const thenVal = evaluate(thenForm, env, world);
      const elseVal = elseForm !== undefined ? evaluate(elseForm, env, world) : BOT;
      const merged = joinKnowledge(thenVal, elseVal);
      return joinKnowledge(merged, TOP);
    }
    if (isAffirmed(cond)) return evaluate(thenForm, env, world);
    if (elseForm !== undefined) return evaluate(elseForm, env, world);
    return BOT;
  },

  when(args, env, world) {
    const condForm = args[0];
    if (!condForm) return BOT;
    const cond = evaluate(condForm, env, world);
    if (!isAffirmed(cond)) return BOT;
    return evalSeq(args.slice(1), env, world);
  },

  unless(args, env, world) {
    const condForm = args[0];
    if (!condForm) return BOT;
    const cond = evaluate(condForm, env, world);
    if (isAffirmed(cond) && !isHeld(cond)) return BOT;
    return evalSeq(args.slice(1), env, world);
  },

  cond(args, env, world) {
    let acc = null;
    for (const clause of args) {
      if (clause.kind !== "cell" || clause.items.length < 2) continue;
      const testForm = clause.items[0];
      if (!testForm) continue;
      const isElse = testForm.kind === "sym" && (testForm.name === "else" || testForm.name === "_");
      const c = isElse ? T : evaluate(testForm, env, world);
      if (isHeld(c)) {
        // ⊤ test: run arm combined with ⊤, accumulate, continue through clauses
        const arm = joinKnowledge(evalSeq(clause.items.slice(1), env, world), TOP);
        acc = acc !== null ? joinKnowledge(acc, arm) : arm;
      } else if (isAffirmed(c)) {
        const arm = evalSeq(clause.items.slice(1), env, world);
        return acc !== null ? joinKnowledge(acc, arm) : arm;
      }
    }
    return acc ?? BOT;
  },

  // ── pattern matching ──────────────────────────────────────────────────────

  match(args, env, world) {
    const subjectForm = args[0];
    if (!subjectForm) return BOT;
    const subject = evaluate(subjectForm, env, world);

    for (const clause of args.slice(1)) {
      if (clause.kind !== "cell" || clause.items.length < 2) continue;
      const [patForm, ...body] = clause.items;
      if (!patForm) continue;

      const result = matchForm(patForm, subject, (f, extra) => {
        const mEnv = new Map([...env, ...extra]);
        return evaluate(f, mEnv, world);
      });

      if (result.value === "potential" || result.value === "stable") {
        const matchEnv = new Map([...env, ...result.bindings]);
        const arm = evalSeq(body, matchEnv, world);
        return result.value === "stable" ? joinKnowledge(arm, TOP) : arm;
      }
    }
    return BOT;
  },

  // ── apply ─────────────────────────────────────────────────────────────────

  apply(args, env, world) {
    const fnForm = args[0];
    if (!fnForm) return BOT;
    const fnVal = evaluate(fnForm, env, world);
    const id = fnId(fnVal);
    if (!id) return BOT;
    const def = world.fns.get(id);
    if (!def) return BOT;

    const argForms = args.slice(1);
    const evaledArgs = [];
    for (let i = 0; i < argForms.length - 1; i++) {
      evaledArgs.push(evaluate(argForms[i], env, world));
    }
    const lastForm = argForms[argForms.length - 1];
    if (lastForm !== undefined) {
      const lastVal = evaluate(lastForm, env, world);
      const spread = seqFrom(lastVal);
      if (spread) evaledArgs.push(...spread);
      else evaledArgs.push(lastVal);
    }
    return applyDef(def, evaledArgs, world);
  },

  // ── knowledge base operations ─────────────────────────────────────────────

  assert(args, env, world) {
    const [sF, pF, oF] = args;
    if (!sF || !pF) return BOT;
    const s = asKey(evaluate(sF, env, world));
    const p = asKey(evaluate(pF, env, world));
    if (oF !== undefined) {
      world.kb.articulate(s, p, asKey(evaluate(oF, env, world)));
    } else {
      world.kb.articulate(s, p);
    }
    return T;
  },

  deny(args, env, world) {
    const [sF, pF, oF] = args;
    if (!sF || !pF) return BOT;
    const s = asKey(evaluate(sF, env, world));
    const p = asKey(evaluate(pF, env, world));
    if (oF !== undefined) {
      world.kb.deny(s, p, asKey(evaluate(oF, env, world)));
    } else {
      world.kb.deny(s, p);
    }
    return F;
  },

  recall(args, env, world) {
    const [sF, pF, oF] = args;
    if (!sF || !pF) return BOT;
    const s = asKey(evaluate(sF, env, world));
    const p = asKey(evaluate(pF, env, world));
    if (oF !== undefined) {
      return valueOfReading(world.kb.readingAt(s, p, asKey(evaluate(oF, env, world))));
    }
    return valueOfReading(world.kb.readingAt(s, p));
  },

  settle(args, env, world) {
    if (args.length === 0) { world.kb.settle(); return T; }
    return SPECIAL["recall"](args, env, world);
  },

  // (section subj) — project all claims about subj into {affirmed, denied, contradicted}.
  section(args, env, world) {
    const [sF] = args;
    if (!sF) return BOT;
    const s = asKey(evaluate(sF, env, world));
    const claims = claimsOf(world.kb, s);
    const affirmed = {};
    const denied = {};
    const contradicted = {};
    for (const { claim, object, value } of claims) {
      const key = String(claim);
      if (isTop(value)) contradicted[key] = object;
      else if (isAffirmed(value)) affirmed[key] = object;
      else if (isDenied(value)) denied[key] = object;
    }
    return potential({ affirmed, denied, contradicted });
  },

  // (query subj) — alias for section.
  query(args, env, world) {
    return SPECIAL["section"](args, env, world);
  },

  // (relate pred obj) — seq of all subjects s where (assert s pred obj) is affirmed.
  relate(args, env, world) {
    const [pF, oF] = args;
    if (!pF || !oF) return BOT;
    const p = asKey(evaluate(pF, env, world));
    const o = asKey(evaluate(oF, env, world));
    const subjects = subjectsOf(world.kb, p)
      .filter(s => claimEq(s.object, o) && isAffirmed(s.value))
      .map(s => potential(s.subject));
    return seqOf(subjects);
  },

  // (relate-from subj pred) — seq of all objects o where (assert subj pred o) is affirmed.
  "relate-from"(args, env, world) {
    const [sF, pF] = args;
    if (!sF || !pF) return BOT;
    const s = asKey(evaluate(sF, env, world));
    const p = asKey(evaluate(pF, env, world));
    const objects = claimsOf(world.kb, s)
      .filter(c => claimEq(c.claim, p) && isAffirmed(c.value))
      .map(c => potential(c.object));
    return seqOf(objects);
  },

  // ── logical / value algebra ──────────────────────────────────────────────

  and(args, env, world) {
    let r = T;
    for (const f of args) {
      r = meetTruth(r, evaluate(f, env, world));
      if (isBottom(r)) return r;
    }
    return r;
  },

  or(args, env, world) {
    let r = F;
    for (const f of args) r = joinTruth(r, evaluate(f, env, world));
    return r;
  },

  not(args, env, world) {
    return negate(args[0] ? evaluate(args[0], env, world) : BOT);
  },

  "k-or"(args, env, world) {
    let r = BOT;
    for (const f of args) r = joinKnowledge(r, evaluate(f, env, world));
    return r;
  },

  "k-and"(args, env, world) {
    let r = TOP;
    for (const f of args) r = meetKnowledge(r, evaluate(f, env, world));
    return r;
  },

  negate(args, env, world) { return negate(args[0] ? evaluate(args[0], env, world) : BOT); },
  conflate(args, env, world) { return conflate(args[0] ? evaluate(args[0], env, world) : BOT); },

  // ── modal □/◇ ────────────────────────────────────────────────────────────────

  // (must x), (may x), (should x) — □x, ◇x, ◇□x. The modal step folds a cell with the other tellings of
  // the same cell; a lone value has none, so on a value each is the identity.
  must(args, env, world) { return args[0] ? evaluate(args[0], env, world) : BOT; },
  may(args, env, world) { return args[0] ? evaluate(args[0], env, world) : BOT; },
  should(args, env, world) { return args[0] ? evaluate(args[0], env, world) : BOT; },

  // ── value predicates ─────────────────────────────────────────────────────

  "affirmed?"(args, env, world) { return isAffirmed(args[0] ? evaluate(args[0], env, world) : BOT) ? T : F; },
  "denied?"(args, env, world) { return isDenied(args[0] ? evaluate(args[0], env, world) : BOT) ? T : F; },
  "held?"(args, env, world) { return isHeld(args[0] ? evaluate(args[0], env, world) : BOT) ? T : F; },
  "pending?"(args, env, world) { return isPending(args[0] ? evaluate(args[0], env, world) : BOT) ? T : F; },

  boolean(args, env, world) {
    return booleanOf(args[0] ? evaluate(args[0], env, world) : BOT) ? T : F;
  },

  "reading"(args, env, world) {
    return potential(readingOf(args[0] ? evaluate(args[0], env, world) : BOT));
  },

  // ── threading ─────────────────────────────────────────────────────────────

  "->"(args, env, world) {
    const seedForm = args[0];
    if (!seedForm) return BOT;
    let val = evaluate(seedForm, env, world);

    for (const step of args.slice(1)) {
      const id = gensym(world);
      const threadEnv = new Map(env);
      threadEnv.set(id, val);
      const s = sym(id);
      const callForm =
        step.kind === "cell"
          ? cell([step.items[0] ?? sym("do"), s, ...step.items.slice(1)])
          : cell([step, s]);
      val = evaluate(callForm, threadEnv, world);
    }
    return val;
  },

  "->>"(args, env, world) {
    const seedForm = args[0];
    if (!seedForm) return BOT;
    let val = evaluate(seedForm, env, world);

    for (const step of args.slice(1)) {
      const id = gensym(world);
      const threadEnv = new Map(env);
      threadEnv.set(id, val);
      const s = sym(id);
      const callForm =
        step.kind === "cell" ? cell([...step.items, s]) : cell([step, s]);
      val = evaluate(callForm, threadEnv, world);
    }
    return val;
  },

  "-?>"(args, env, world) {
    const seedForm = args[0];
    if (!seedForm) return BOT;
    let val = evaluate(seedForm, env, world);

    for (const step of args.slice(1)) {
      if (isBottom(val)) return BOT;
      const id = gensym(world);
      const threadEnv = new Map(env);
      threadEnv.set(id, val);
      const s = sym(id);
      const callForm =
        step.kind === "cell"
          ? cell([step.items[0] ?? sym("do"), s, ...step.items.slice(1)])
          : cell([step, s]);
      val = evaluate(callForm, threadEnv, world);
    }
    return val;
  },

  // ── error handling ────────────────────────────────────────────────────────

  try(args, env, world) {
    const bodyForm = args[0];
    if (!bodyForm) return BOT;
    try {
      return evaluate(bodyForm, env, world);
    } catch (e) {
      const catchClause = args[1];
      if (
        catchClause?.kind === "cell" &&
        catchClause.items[0]?.kind === "sym" &&
        catchClause.items[0].name === "catch"
      ) {
        const [, bindForm, ...handlerBody] = catchClause.items;
        const catchEnv = new Map(env);
        if (bindForm?.kind === "sym") {
          catchEnv.set(bindForm.name, potential(e instanceof Error ? e.message : String(e)));
        }
        return evalSeq(handlerBody, catchEnv, world);
      }
      return TOP;
    }
  },

  raise(args, env, world) {
    const c = args[0] ? evaluate(args[0], env, world) : BOT;
    const v = valueOf(c);
    throw new Error(typeof v === "string" ? v : writeValue(c));
  },

  // ── scope / modules ───────────────────────────────────────────────────────

  at(args, env, world) {
    const pathForm = args[0];
    if (!pathForm || pathForm.kind !== "sym") return BOT;
    const oldScope = world.scope;
    world.scope = pathForm.name.startsWith("/") ? pathForm.name : `${world.scope}/${pathForm.name}`;
    const result = evalSeq(args.slice(1), env, world);
    world.scope = oldScope;
    return result;
  },

  module(args, env, world) {
    const nameForm = args[0];
    if (!nameForm || nameForm.kind !== "sym") return BOT;
    world.modules.set(nameForm.name, args.slice(1));
    return T;
  },

  require(args, env, world) {
    const nameForm = args[0];
    if (!nameForm || nameForm.kind !== "sym") return BOT;
    const forms = world.modules.get(nameForm.name);
    if (!forms) return BOT;
    return evalSeq(forms, env, world);
  },

  // ── multiple values ───────────────────────────────────────────────────────

  // (values a b c…) — pack multiple values into one sequence value.
  values(args, env, world) {
    return seqOf(args.map(f => evaluate(f, env, world)));
  },

  "let-values"(args, env, world) {
    const bindingsForm = args[0];
    if (!bindingsForm || bindingsForm.kind !== "cell") return BOT;
    const letEnv = new Map(env);
    for (const binding of bindingsForm.items) {
      if (binding.kind !== "cell" || binding.items.length < 2) continue;
      const namesForm = binding.items[0];
      const valForm = binding.items[1];
      if (!namesForm || namesForm.kind !== "cell") continue;
      const vs = seqFrom(evaluate(valForm, letEnv, world)) ?? [];
      for (let i = 0; i < namesForm.items.length; i++) {
        const n = namesForm.items[i];
        if (n?.kind === "sym") letEnv.set(n.name, vs[i] ?? BOT);
      }
    }
    return evalSeq(args.slice(1), letEnv, world);
  },

  // ── safe-recall-chain ─────────────────────────────────────────────────────

  // (?. subj k1 k2 …) — recall (subj k1), use value datum as next subject,
  // recall k2, etc. Short-circuits to ⊥ on any absent hop.
  "?."(args, env, world) {
    const subjectForm = args[0];
    if (!subjectForm) return BOT;
    let subj = asKey(evaluate(subjectForm, env, world));
    let result = BOT;
    for (const keyForm of args.slice(1)) {
      const key = asKey(evaluate(keyForm, env, world));
      const claims = claimsOf(world.kb, subj);
      const match = claims.find(c => claimEq(c.claim, key));
      if (!match || isBottom(match.value)) return BOT;
      result = isAffirmed(match.value) ? potential(match.object) : match.value;
      subj = match.object;
    }
    return result;
  },

  // ── pattern-match alias ───────────────────────────────────────────────────

  // (case subj clause…) — alias for match; must live in SPECIAL to forward varargs correctly.
  case(args, env, world) { return SPECIAL["match"](args, env, world); },

  // ── homoiconicity ─────────────────────────────────────────────────────────

  gensym(args, env, world) {
    if (args[0] !== undefined) {
      const pfx = valueOf(evaluate(args[0], env, world));
      return potential(gensymWith(world, typeof pfx === "string" && pfx.length > 0 ? pfx : "g"));
    }
    return potential(gensym(world));
  },

  "write-value"(args, env, world) {
    return potential(writeValue(args[0] ? evaluate(args[0], env, world) : BOT));
  },

  // (macroexpand-all form) — fully expand macros in a quoted form, returning
  // the residual core form as a code value.
  "macroexpand-all"(args, env, world) {
    const form0 = args[0];
    if (!form0) return BOT;
    const c = evaluate(form0, env, world);
    const f = codeFrom(c);
    if (f === null) return BOT;
    return codeOf(expandAll(f, env, world));
  },
};

// ── quasiquote expansion ──────────────────────────────────────────────────────

function quasiquoteExpand(form, env, world) {
  if (form.kind !== "cell") return codeOf(form);

  const { items } = form;
  const head = items[0];

  if (head?.kind === "sym" && head.name === "unquote") {
    return items[1] !== undefined ? evaluate(items[1], env, world) : BOT;
  }

  const expanded = [];
  for (const item of items) {
    if (
      item.kind === "cell" &&
      item.items[0]?.kind === "sym" &&
      item.items[0].name === "unquote-splice"
    ) {
      const val = item.items[1] !== undefined ? evaluate(item.items[1], env, world) : BOT;
      const seq = seqFrom(val);
      if (seq) {
        for (const c of seq) {
          const f = codeFrom(c);
          if (f !== null) expanded.push(f);
        }
      }
    } else {
      const inner = quasiquoteExpand(item, env, world);
      const f = codeFrom(inner);
      if (f !== null) expanded.push(f);
    }
  }
  return codeOf(cell(expanded));
}

// ── expandAll: full macro expansion (for macroexpand-all) ────────────────────

function expandAll(form, env, world) {
  if (form.kind !== "cell") return form;
  const headForm = form.items[0];
  if (headForm?.kind === "sym") {
    const macro = world.macros.get(headForm.name);
    if (macro) return expandAll(expandMacro(macro, form.items.slice(1), env, world), env, world);
  }
  return cell(form.items.map(f => expandAll(f, env, world)));
}

// ── define helper ─────────────────────────────────────────────────────────────

function defForm(args, env, world) {
  const nameForm = args[0];
  if (!nameForm) return BOT;

  // (define (fn-name params…) body…) — shorthand function definition
  if (nameForm.kind === "cell") {
    const fnNameForm = nameForm.items[0];
    if (!fnNameForm || fnNameForm.kind !== "sym") return BOT;
    const { params, rest } = parseParams(nameForm.items.slice(1));
    const body = args.slice(1);
    const id = `fn:${fnNameForm.name}:${gensym(world)}`;
    const def = { kind: "fn", params, rest, body, closure: new Map(env) };
    world.fns.set(id, def);
    const value = fnValue(id);
    world.env.set(fnNameForm.name, value);
    env.set(fnNameForm.name, value);
    return value;
  }

  if (nameForm.kind !== "sym") return BOT;

  const val = args[1] !== undefined ? evaluate(args[1], env, world) : T;
  world.env.set(nameForm.name, val);
  env.set(nameForm.name, val);
  return val;
}

// ── fn helper ─────────────────────────────────────────────────────────────────

function makeFn(args, env, world) {
  const paramForm = args[0];
  if (!paramForm || paramForm.kind !== "cell") return BOT;
  const { params, rest } = parseParams(paramForm.items);
  const body = args.slice(1);
  const id = `fn:anon:${gensym(world)}`;
  const def = { kind: "fn", params, rest, body, closure: new Map(env) };
  world.fns.set(id, def);
  return fnValue(id);
}

// ── main evaluate ─────────────────────────────────────────────────────────────

/** Evaluate one form in env/world, returning a Value. */
export function evaluate(form, env, world) {
  switch (form.kind) {
    case "num": return potential(form.value);
    case "str": return potential(form.value);
    case "point-lit": return form.value;
    case "sym":
      return env.get(form.name) ?? world.env.get(form.name) ?? BOT;
    case "cell":
      return form.items.length === 0 ? BOT : evalCell(form, env, world);
  }
}

function evalCell(form, env, world) {
  const headForm = form.items[0];
  if (!headForm) return BOT;

  // Special form?
  if (headForm.kind === "sym") {
    const handler = SPECIAL[headForm.name];
    if (handler) return handler(form.items.slice(1), env, world);

    // Macro?
    const macro = world.macros.get(headForm.name);
    if (macro) {
      const expanded = expandMacro(macro, form.items.slice(1), env, world);
      return evaluate(expanded, env, world);
    }
  }

  // Evaluate head — may be a fn value
  const headVal = evaluate(headForm, env, world);
  const id = fnId(headVal);
  if (id !== null) {
    const def = world.fns.get(id);
    if (def) {
      const evaledArgs = form.items.slice(1).map((a) => evaluate(a, env, world));
      return applyDef(def, evaledArgs, world);
    }
  }

  // Homoiconic code value in head position: extract and eval the form
  const code = codeFrom(headVal);
  if (code !== null) return evaluate(code, env, world);

  // Progn fallthrough: evaluate all items, return last
  return evalSeq(form.items, env, world);
}
