// ordinal — tests for the constructive ordinal notations (zero / succ / limit and their derived
// constructors fin / plusFin / OMEGA / omegaTimes / OMEGA_SQ, the predicates isZero/isSucc/isLimit, and
// the reader/printer toFinite/show).
//
// Every ordinal below ε₀ is expressible as zero, a successor stack over a limit, or a limit carrying a
// fundamental sequence — this is the same three-shape recursion Obsmetrologia/Closure/OrdinalCore.lean's
// `Ord` (zero | succ | limit) builds, and Obsmetrologia/Closure/Ordinal.lean's `regimeOfOrd` reads the
// four regimes off (isFinite splits strict; the rest read Scott-continuity/cofinality).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  zero, succ, limit, isZero, isSucc, isLimit, fin, plusFin, OMEGA, omegaTimes, OMEGA_SQ, toFinite, show,
} from "../src/ordinal.mjs";

test("zero/succ/limit: tag each shape distinctly", () => {
  assert.equal(zero().kind, "zero");
  assert.equal(succ(zero()).kind, "succ");
  assert.equal(limit((n) => fin(n)).kind, "limit");
});

test("isZero/isSucc/isLimit: classify exactly one shape each, mutually exclusive", () => {
  const z = zero(), s = succ(z), l = OMEGA;
  assert.deepEqual([isZero(z), isSucc(z), isLimit(z)], [true, false, false]);
  assert.deepEqual([isZero(s), isSucc(s), isLimit(s)], [false, true, false]);
  assert.deepEqual([isZero(l), isSucc(l), isLimit(l)], [false, false, true]);
});

test("fin: fin(n) is succⁿ(0) — n nested successors over zero", () => {
  assert.equal(toFinite(fin(0)), 0);
  assert.equal(toFinite(fin(5)), 5);
  let c = fin(3);
  let depth = 0;
  while (c.kind === "succ") { depth++; c = c.pred; }
  assert.equal(depth, 3);
  assert.equal(c.kind, "zero");
});

test("plusFin: α + n is n successors stacked over α", () => {
  const a = plusFin(OMEGA, 3);
  assert.equal(show(a), "ω+3");
  assert.equal(toFinite(a), Infinity); // still transfinite — a successor stack over a limit
});

test("plusFin: α + 0 is α unchanged", () => {
  assert.deepEqual(plusFin(fin(4), 0), fin(4));
});

test("OMEGA: the limit of the finite ordinals, named 'ω'", () => {
  assert.equal(isLimit(OMEGA), true);
  assert.equal(show(OMEGA), "ω");
  assert.equal(toFinite(OMEGA.seq(7)), 7); // the fundamental sequence IS n ↦ fin(n)
});

test("omegaTimes: ω·0 = 0, ω·1 = ω, ω·k for k ≥ 2 is a fresh limit named 'ω·k'", () => {
  assert.equal(omegaTimes(0).kind, "zero");
  assert.equal(show(omegaTimes(1)), "ω");
  assert.equal(show(omegaTimes(2)), "ω·2");
  assert.equal(show(omegaTimes(3)), "ω·3");
  assert.equal(isLimit(omegaTimes(2)), true);
});

test("omegaTimes: ω·k's fundamental sequence is (ω·(k−1) + n)ₙ", () => {
  const w2 = omegaTimes(2);
  assert.equal(show(w2.seq(0)), "ω"); // ω·1 + 0
  assert.equal(show(w2.seq(5)), "ω+5"); // ω·1 + 5
});

test("OMEGA_SQ: ω² = sup(ω·n)ₙ, a limit named 'ω²'", () => {
  assert.equal(isLimit(OMEGA_SQ), true);
  assert.equal(show(OMEGA_SQ), "ω²");
  assert.equal(show(OMEGA_SQ.seq(3)), "ω·3");
});

test("toFinite: n for a finite ordinal, Infinity for anything at or past ω", () => {
  assert.equal(toFinite(zero()), 0);
  assert.equal(toFinite(fin(42)), 42);
  assert.equal(toFinite(OMEGA), Infinity);
  assert.equal(toFinite(plusFin(OMEGA, 9)), Infinity);
});

test("show: renders finite n as a bare number, a limit by its name, and base+k for a successor stack", () => {
  assert.equal(show(zero()), "0");
  assert.equal(show(fin(6)), "6");
  assert.equal(show(OMEGA), "ω");
  assert.equal(show(plusFin(OMEGA, 4)), "ω+4");
  assert.equal(show(limit((n) => fin(n))), "lim"); // an unnamed limit falls back to "lim"
});
