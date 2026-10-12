// json.test.mjs — proofs for the JSON ↔ Horsetail bridge.
import assert from "node:assert/strict";
import test from "node:test";
import { readJson, valueFromJson, valueToJson } from "./json.mjs";
import { world, run, evaluate } from "./index.mjs";
import { isTop, isBottom, isAffirmed, isDenied, valueOf, seqFrom, BOT, TOP, potential, seqOf } from "./value.mjs";

// ── readJson → Form ───────────────────────────────────────────────────────────

test("readJson: null → ⊥ form", () => {
  const f = readJson(null);
  assert(f.kind === "point-lit" && isBottom(f.value));
});

test("readJson: true → t form", () => {
  const f = readJson(true);
  assert(f.kind === "point-lit" && isAffirmed(f.value) && !isDenied(f.value));
});

test("readJson: false → f form", () => {
  const f = readJson(false);
  assert(f.kind === "point-lit" && isDenied(f.value) && !isAffirmed(f.value));
});

test("readJson: number → Num form", () => {
  const f = readJson(42);
  assert(f.kind === "num" && f.value === 42);
});

test("readJson: symbol-safe string → Sym form", () => {
  const f = readJson("drawLine");
  assert(f.kind === "sym" && f.name === "drawLine");
});

test("readJson: string with spaces → Str form", () => {
  const f = readJson("hello world");
  assert(f.kind === "str" && f.value === "hello world");
});

test("readJson: empty array → ⊥ form", () => {
  const f = readJson([]);
  assert(f.kind === "point-lit" && isBottom(f.value));
});

test("readJson: array → HCell (the arrays-are-programs idiom)", () => {
  // ["assert", "sky", "blue"] → (assert sky blue)
  const f = readJson(["assert", "sky", "blue"]);
  assert(f.kind === "cell" && f.items.length === 3);
  assert(f.items[0]?.kind === "sym" && f.items[0].name === "assert");
  assert(f.items[1]?.kind === "sym" && f.items[1].name === "sky");
  assert(f.items[2]?.kind === "sym" && f.items[2].name === "blue");
});

test("readJson: nested array → nested HCell", () => {
  const f = readJson(["do", ["assert", "a", "b"], ["assert", "c", "d"]]);
  assert(f.kind === "cell" && f.items.length === 3);
  const inner = f.items[1];
  assert(inner?.kind === "cell" && inner.items.length === 3);
});

test("readJson: object → (object (key val)…) cell", () => {
  const f = readJson({ x: 1, y: 2 });
  assert(f.kind === "cell");
  assert(f.items[0]?.kind === "sym" && f.items[0].name === "object");
  assert(f.items.length === 3); // "object" + 2 pair cells
  const pair = f.items[1];
  assert(pair?.kind === "cell" && pair.items[0]?.kind === "sym" && pair.items[0].name === "x");
});

// ── evaluating readJson forms ─────────────────────────────────────────────────

test("readJson programs evaluate: ['define','x',42] binds x to 42", () => {
  // Strings that are valid symbol names become Syms — good for variable names.
  // ["define", "x", 42] → (define x 42)
  const w = world();
  evaluate(readJson(["define", "x", 42]), w.env, w);
  assert.equal(valueOf(run("x", w)), 42);
});

test("readJson programs evaluate: arithmetic via JSON array", () => {
  const w = world();
  const form = readJson(["+", 1, ["+", 2, 3]]);
  const c = evaluate(form, w.env, w);
  assert.equal(valueOf(c), 6);
});

test("readJson programs evaluate: multi-form program", () => {
  const w = world();
  const program = readJson(["do",
    ["define", "x", 10],
    ["define", "y", 32],
    ["+", "x", "y"],
  ]);
  assert.equal(valueOf(evaluate(program, w.env, w)), 42);
});

// ── valueFromJson → Value ───────────────────────────────────────────────────

test("valueFromJson: null → ⊥", () => {
  assert(isBottom(valueFromJson(null)));
});

test("valueFromJson: true → t, false → f", () => {
  assert(isAffirmed(valueFromJson(true)) && !isDenied(valueFromJson(true)));
  assert(isDenied(valueFromJson(false)) && !isAffirmed(valueFromJson(false)));
});

test("valueFromJson: number → potential(n)", () => {
  assert.equal(valueOf(valueFromJson(3.14)), 3.14);
});

test("valueFromJson: string → potential(s)", () => {
  assert.equal(valueOf(valueFromJson("hello")), "hello");
});

test("valueFromJson: array → seq value", () => {
  const c = valueFromJson([1, 2, 3]);
  const seq = seqFrom(c);
  assert(seq !== null && seq.length === 3);
  assert.equal(valueOf(seq[0]), 1);
  assert.equal(valueOf(seq[2]), 3);
});

test("valueFromJson: object → seq of [key,value] pairs", () => {
  const c = valueFromJson({ a: 1 });
  const rows = seqFrom(c);
  assert(rows !== null && rows.length === 1);
  const pair = seqFrom(rows[0]);
  assert(pair !== null && pair.length === 2);
  assert.equal(valueOf(pair[0]), "a");
  assert.equal(valueOf(pair[1]), 1);
});

// ── valueToJson → JSON ───────────────────────────────────────────────────────

test("valueToJson: ⊥ → null", () => {
  assert.equal(valueToJson(BOT), null);
});

test("valueToJson: ⊤ → {__top:true}", () => {
  const r = valueToJson(TOP);
  assert(r !== null && typeof r === "object" && (r).__top === true);
});

test("valueToJson: scalar potential round-trips", () => {
  assert.equal(valueToJson(potential(42)), 42);
  assert.equal(valueToJson(potential("hello")), "hello");
});

test("valueToJson: seq value → JSON array", () => {
  const c = seqOf([potential(1), potential(2)]);
  assert.deepEqual(valueToJson(c), [1, 2]);
});

// ── stdlib from-json / to-json ────────────────────────────────────────────────

test("stdlib from-json: parses a JSON string into a data value", () => {
  const w = world();
  const c = run('(from-json "[1, 2, 3]")', w);
  const seq = seqFrom(c);
  assert(seq !== null && seq.length === 3);
  assert.equal(valueOf(seq[0]), 1);
});

test("stdlib from-json: invalid JSON returns ⊥", () => {
  const w = world();
  assert(isBottom(run('(from-json "not json")', w)));
});

test("stdlib to-json: serializes a seq value to a JSON string", () => {
  const w = world();
  run("(define data (seq 10 20 30))", w);
  const r = run("(to-json data)", w);
  assert.equal(valueOf(r), "[10,20,30]");
});

test("stdlib to-json: round-trips number", () => {
  const w = world();
  assert.equal(valueOf(run("(to-json 99)", w)), "99");
});
