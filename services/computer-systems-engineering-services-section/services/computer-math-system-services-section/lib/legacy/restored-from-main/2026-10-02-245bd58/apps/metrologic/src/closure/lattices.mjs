// lattices.mjs — closures whose ordinals exhibit each regime, so the morphism can be watched.
//
// Each is a lattice `{ bottom, leq, join, eq, sup }` and an operator `phi`. They are the smallest honest
// witnesses of the three regimes: a finite closure (κ < ω), a closure with one non-Scott-continuous firing
// (κ = ω+1), and a never-stabilizing tower (no countable κ — the iteration runs forever).
//
// A fourth witness, `fromBilattice` (the floor's `settle` as the finite-regime restriction of this
// general closure morphism), moved to SignCraft's `closure-bridge.mjs` along with the descent
// (`commutate`/`possibilizeKnowledge`/`necessitateKnowledge`/`lastValuation`/`settle`) it bridges to.

import { stabilizingSup } from "./iterate.mjs";

const S = (x) => JSON.stringify(x);
const uniqSort = (xs) => [...new Set(xs)].sort((a, b) => a - b);

// ── finite closure: κ < ω ────────────────────────────────────────────────────────────────────────────
// Reachability in a finite directed graph: Φ(S) = S ∪ {heads of edges out of S}. The least fixed point
// from a seed is the reachable set; it is reached in < |V| steps, so κ is finite.
/**
 * @param {number} nVertices @param {[number,number][]} edges @param {number[]} seed
 * @returns {{ lattice: object, phi: (s:number[])=>number[] }}
 */
export function reachability(nVertices, edges, seed = [0]) {
  const lattice = {
    bottom: uniqSort(seed),
    leq: (a, b) => a.every((x) => b.includes(x)),
    join: (a, b) => uniqSort([...a, ...b]),
    eq: (a, b) => S(a) === S(b),
    sup: null,
  };
  lattice.sup = stabilizingSup(lattice); // finite lattice ⇒ chains stabilize
  const phi = (s) => uniqSort([...s, ...edges.filter(([u]) => s.includes(u)).map(([, v]) => v)]);
  return { lattice, phi };
}

// ── one non-Scott-continuous firing: κ = ω+1 ─────────────────────────────────────────────────────────
// Subsets of ℕ ∪ {⋆}. Φ grows a finite set toward ℕ one element at a time (the ω-part); when ALL of ℕ is
// present it fires the limit point ⋆ — a firing that needs the whole ω-chain, not any finite stage. So
// F(n) = {0..n−1}, F(ω) = ℕ (the sup), F(ω+1) = ℕ ∪ {⋆}, fixed. κ = ω+1.
const NATS = { tag: "nats" };          // ℕ
const ALL = { tag: "all" };            // ℕ ∪ {⋆}
const Fin = (set) => ({ tag: "finite", set: uniqSort(set) });
const eqEl = (a, b) => a.tag === b.tag && (a.tag !== "finite" || S(a.set) === S(b.set));

export function omegaPlusOne() {
  const rank = (a) => (a.tag === "all" ? 3 : a.tag === "nats" ? 2 : 1);
  const join = (a, b) => {
    if (a.tag === "all" || b.tag === "all") return ALL;
    if (a.tag === "nats" || b.tag === "nats") return NATS;
    return Fin([...a.set, ...b.set]);
  };
  const lattice = {
    bottom: Fin([]),
    join,
    eq: eqEl,
    leq: (a, b) => eqEl(join(a, b), b),
    // sup of a directed ω-chain: stabilize if it can; if finite sets grow without bound, the sup is ℕ.
    sup: (seqFn) => {
      let prev = seqFn(0);
      for (let n = 1; n <= 64; n++) {
        const cur = seqFn(n);
        if (eqEl(cur, prev)) return cur;        // stabilized below ℕ
        if (cur.tag !== "finite") return cur;   // already reached ℕ or ℕ∪{⋆}
        prev = cur;
      }
      return NATS; // 64 strictly-growing finite stages ⇒ the chain exhausts ℕ
    },
  };
  const phi = (a) => {
    if (a.tag === "all") return ALL;
    if (a.tag === "nats") return ALL;                       // ⋆ fires once all of ℕ is present (NSC)
    let m = 0; while (a.set.includes(m)) m++; return Fin([...a.set, m]); // add the least missing natural
  };
  return { lattice, phi, rank };
}

// ── a never-stabilizing tower: no countable κ (aperiodic, witnessed) ─────────────────────────────────
// Like ω+1, but firing the limit OPENS A FRESH ℕ to traverse, forever. Every ω-block ends in a firing
// that starts the next block, so F(ω·k+1) ≠ F(ω·k) for all k: no searched ordinal is ever a fixed point.
// The closure ordinal would be ω² … and beyond; the search reports "aperiodic" because it never finds κ.
export function tower() {
  const T = (block, set, full = false) => ({ block, set: uniqSort(set), full });
  const eqT = (a, b) => a.block === b.block && a.full === b.full && S(a.set) === S(b.set);
  const lattice = {
    bottom: T(0, []),
    eq: eqT,
    join: (a, b) => (a.block !== b.block ? (a.block > b.block ? a : b) : T(a.block, [...a.set, ...b.set], a.full || b.full)),
    leq: (a, b) => a.block < b.block || (a.block === b.block && (b.full || !a.full) && a.set.every((x) => b.set.includes(x))),
    sup: (seqFn) => {
      let prev = seqFn(0);
      for (let n = 1; n <= 64; n++) {
        const cur = seqFn(n);
        if (eqT(cur, prev)) return cur;
        if (cur.block > prev.block || cur.full) return cur;
        prev = cur;
      }
      return T(prev.block, prev.set, true); // the block's ℕ is exhausted
    },
  };
  const phi = (a) => {
    if (a.full) return T(a.block + 1, [], false);            // fire: open the next block
    let m = 0; while (a.set.includes(m)) m++; return T(a.block, [...a.set, m], false); // grow this block
  };
  return { lattice, phi };
}
