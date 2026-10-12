// stdlib.mjs — the native JavaScript prelude: registers builtins (arith, strings, seq) and
// higher-order functions (reduce, map, filter, range, sum, …) as NativeDef entries in world.fns.

import {
  T, F, BOT, TOP, potential, isAffirmed, isDenied, isTop, isBottom, booleanOf,
  seqOf, seqFrom, fnId, fnValue, valueOf, writeValue,
} from "./value.mjs";
import { valueFromJson, valueToJson } from "./json.mjs";

import { gensym } from "./world.mjs";
import { sym, cell } from "./types.mjs";

import { ARITH } from "./arith.mjs";
import { STRINGS } from "./strings.mjs";
import { SEQ } from "./seq.mjs";
import { evaluate } from "./evaluator.mjs";

function reg(world, name, fn) {
  const id = `native:${name}`;
  const def = { kind: "native", fn };
  world.fns.set(id, def);
  world.env.set(name, fnValue(id));
}

function regMacro(world, name, params, rest, body) {
  const def = { params, rest, body };
  world.macros.set(name, def);
}

function callValue(fnVal, args, world) {
  const id = fnId(fnVal);
  if (!id) return BOT;
  const def = world.fns.get(id);
  if (!def) return BOT;
  if (def.kind === "native") return def.fn(args, world);
  // Horsetail fn: build a call env
  const callEnv = new Map(def.closure);
  for (let i = 0; i < def.params.length; i++) {
    const n = def.params[i];
    if (n !== undefined) callEnv.set(n, args[i] ?? BOT);
  }
  if (def.rest !== null) callEnv.set(def.rest, seqOf(args.slice(def.params.length)));
  let r = BOT;
  for (const f of def.body) r = evaluate(f, callEnv, world);
  return r;
}

export function loadStdlib(world) {
  // ── arithmetic ────────────────────────────────────────────────────────────
  for (const [name, fn] of Object.entries(ARITH)) {
    reg(world, name, (args) => fn(args));
  }

  // ── strings ───────────────────────────────────────────────────────────────
  for (const [name, fn] of Object.entries(STRINGS)) {
    reg(world, name, (args) => fn(args));
  }

  // ── sequences ─────────────────────────────────────────────────────────────
  for (const [name, fn] of Object.entries(SEQ)) {
    // seq-map is handled separately (needs world for fn calls)
    if (name !== "seq-map") reg(world, name, (args) => fn(args));
  }

  reg(world, "seq-map", (args, w) => {
    const fnVal = args[0] ?? BOT;
    const seq = seqFrom(args[1] ?? BOT);
    if (!seq) return BOT;
    return seqOf(seq.map((item) => callValue(fnVal, [item], w)));
  });

  // ── higher-order ──────────────────────────────────────────────────────────

  reg(world, "reduce", (args, w) => {
    const fnVal = args[0] ?? BOT;
    const init = args[1] ?? BOT;
    const seq = seqFrom(args[2] ?? BOT);
    if (!seq) return init;
    let acc = init;
    for (const item of seq) acc = callValue(fnVal, [acc, item], w);
    return acc;
  });

  reg(world, "map", (args, w) => {
    const fnVal = args[0] ?? BOT;
    const seq = seqFrom(args[1] ?? BOT);
    if (!seq) return BOT;
    return seqOf(seq.map((item) => callValue(fnVal, [item], w)));
  });

  reg(world, "filter", (args, w) => {
    const fnVal = args[0] ?? BOT;
    const seq = seqFrom(args[1] ?? BOT);
    if (!seq) return BOT;
    return seqOf(seq.filter((item) => isAffirmed(callValue(fnVal, [item], w)) && !isTop(callValue(fnVal, [item], w))));
  });

  reg(world, "filter-hold", (args, w) => {
    const fnVal = args[0] ?? BOT;
    const seq = seqFrom(args[1] ?? BOT);
    if (!seq) return BOT;
    return seqOf(seq.filter((item) => isAffirmed(callValue(fnVal, [item], w))));
  });

  reg(world, "for-each", (args, w) => {
    const fnVal = args[0] ?? BOT;
    const seq = seqFrom(args[1] ?? BOT);
    if (!seq) return BOT;
    for (const item of seq) callValue(fnVal, [item], w);
    return T;
  });

  reg(world, "fold", (args, w) => {
    return (world.env.get("reduce") ? callValue(world.env.get("reduce"), args, w) : BOT);
  });

  reg(world, "range", (args) => {
    const n = valueOf(args[0] ?? BOT);
    if (typeof n !== "number" || n < 0) return BOT;
    const items = [];
    for (let i = 0; i < n; i++) items.push(potential(i));
    return seqOf(items);
  });

  reg(world, "sum", (args, w) => {
    const seq = seqFrom(args[0] ?? BOT);
    if (!seq) return potential(0);
    let total = 0;
    for (const item of seq) {
      const v = valueOf(item);
      if (typeof v === "number") total += v;
    }
    return potential(total);
  });

  reg(world, "length", (args) => {
    const seq = seqFrom(args[0] ?? BOT);
    return seq !== null ? potential(seq.length) : BOT;
  });

  // ── value predicates as first-class values ───────────────────────────────

  reg(world, "affirmed?", (args) => (args[0] ? (isAffirmed(args[0]) ? T : F) : BOT));
  reg(world, "denied?", (args) => (args[0] ? (isDenied(args[0]) ? T : F) : BOT));
  reg(world, "held?", (args) => (args[0] ? (isTop(args[0]) ? T : F) : BOT));
  reg(world, "pending?", (args) => (args[0] ? (isBottom(args[0]) ? T : F) : BOT));
  reg(world, "boolean", (args) => (args[0] ? (booleanOf(args[0]) ? T : F) : F));

  // ── display ───────────────────────────────────────────────────────────────

  reg(world, "write-value", (args) => potential(writeValue(args[0] ?? BOT)));

  // ── identity ──────────────────────────────────────────────────────────────

  reg(world, "identity", (args) => args[0] ?? BOT);

  // ── JSON bridge ───────────────────────────────────────────────────────────

  // (from-json s) — parse a JSON string value and import as a data Value.
  reg(world, "from-json", (args) => {
    const v = valueOf(args[0] ?? BOT);
    if (typeof v !== "string") return BOT;
    try { return valueFromJson(JSON.parse(v)); } catch { return BOT; }
  });

  // (to-json c) — serialize a Value to a JSON string value.
  reg(world, "to-json", (args) => {
    return potential(JSON.stringify(valueToJson(args[0] ?? BOT)));
  });

  // ── convenience macro aliases ─────────────────────────────────────────────
  // These live in world.macros so user defines can shadow them; they expand syntactically.

  // (counter-fact s p o) → (deny s p o)
  regMacro(world, "counter-fact", ["s","p","o"], null,
    cell([sym("deny"), sym("s"), sym("p"), sym("o")]));
  // (believe? s p) → (recall s p)
  regMacro(world, "believe?", ["s","p"], null,
    cell([sym("recall"), sym("s"), sym("p")]));
  // (yes x) → (boolean x)
  regMacro(world, "yes", ["x"], null,
    cell([sym("boolean"), sym("x")]));
  // (assoc s k v) → (assert s k v)
  regMacro(world, "assoc", ["s","k","v"], null,
    cell([sym("assert"), sym("s"), sym("k"), sym("v")]));
  // (dissoc s k v) → (deny s k v)
  regMacro(world, "dissoc", ["s","k","v"], null,
    cell([sym("deny"), sym("s"), sym("k"), sym("v")]));
  // (keys s) → (section s)
  regMacro(world, "keys", ["s"], null,
    cell([sym("section"), sym("s")]));

  // ── paraconsistency helpers ───────────────────────────────────────────────

  // (both s p [o]) — assert and deny both faces, constructing ⊤ explicitly.
  reg(world, "both", (args, w) => {
    const [sC, pC, oC] = args;
    if (!sC || !pC) return BOT;
    const s = keyOf(sC), p = keyOf(pC);
    if (oC !== undefined) {
      const o = keyOf(oC);
      w.kb.articulate(s, p, o);
      w.kb.deny(s, p, o);
    } else {
      w.kb.articulate(s, p);
      w.kb.deny(s, p);
    }
    return TOP;
  });
}

function keyOf(c) {
  const v = valueOf(c);
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : c;
}
