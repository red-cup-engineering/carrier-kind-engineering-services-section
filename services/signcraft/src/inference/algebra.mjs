// The class's linear algebra: matrices over the FOUR knowledge frame.
// GPT's layer is y = Wx over (R,+,x); ours is Y = X ⊗ W over (FOUR, joinK,
// meetK), evidence-for and evidence-against composing as two independent
// boolean lanes. The backward pass is EXACT: residuation A\B (the greatest
// W with A⊗W ≤ B) is a theorem, so learning a layer is one residuation and
// updates are monotone meets — no gradients, no epochs, every weight a
// reading. Nonlinearity is a nucleus: extensive, monotone, idempotent.

// A relation matrix is {rows:[], cols:[], pos:Set("r c"), neg:Set("r c")}.
export function makeRel(rows, cols, posPairs = [], negPairs = []) {
  return {
    rows: [...rows],
    cols: [...cols],
    pos: new Set(posPairs.map(([r, c]) => r + " " + c)),
    neg: new Set(negPairs.map(([r, c]) => r + " " + c)),
  };
}

export function relGet(A, r, c) {
  const k = r + " " + c;
  return { pos: A.pos.has(k) ? 1 : 0, neg: A.neg.has(k) ? 1 : 0 };
}

// Composition ⊗: (A⊗B)[r,c] = joinK over j of meetK(A[r,j], B[j,c]).
// In the two boolean lanes this is plain relational composition per lane:
// evidence-for composes through evidence-for; evidence-against likewise.
export function compose(A, B) {
  const out = makeRel(A.rows, B.cols);
  for (const lane of ["pos", "neg"]) {
    const byMid = new Map();
    for (const k of A[lane]) {
      const [r, j] = k.split(" ");
      if (!byMid.has(j)) byMid.set(j, []);
      byMid.get(j).push(r);
    }
    for (const k of B[lane]) {
      const [j, c] = k.split(" ");
      for (const r of byMid.get(j) ?? []) out[lane].add(r + " " + c);
    }
  }
  return out;
}

// Left residuation A\B: the GREATEST W with A⊗W ≤ B (per lane).
// (A\B)[j,c] holds iff for EVERY row r with A[r,j], B[r,c] holds.
// This is the exact backward pass: given input activity A and target B,
// the maximal lawful weight matrix, in one pass, by theorem.
export function residualLeft(A, B) {
  const out = makeRel(A.cols, B.cols);
  for (const lane of ["pos", "neg"]) {
    const rowsWith = new Map();
    for (const k of A[lane]) {
      const [r, j] = k.split(" ");
      if (!rowsWith.has(j)) rowsWith.set(j, []);
      rowsWith.get(j).push(r);
    }
    for (const j of A.cols) {
      const support = rowsWith.get(j) ?? [];
      for (const c of B.cols) {
        let all = true;
        for (const r of support) {
          if (!B[lane].has(r + " " + c)) { all = false; break; }
        }
        if (all) out[lane].add(j + " " + c);
      }
    }
  }
  return out;
}

// Right residuation B/W: the GREATEST A with A⊗W ≤ B (per lane), the other
// adjoint of composition. (B/W)[r,j] holds iff for EVERY col c with W[j,c],
// B[r,c] holds. Pulling a TARGET back through a known layer: given the
// output target B and the layer W, the maximal lawful hidden activity.
export function residualRight(B, W) {
  const out = makeRel(B.rows, W.rows);
  for (const lane of ["pos", "neg"]) {
    const colsOf = new Map();
    for (const k of W[lane]) {
      const [j, c] = k.split(" ");
      if (!colsOf.has(j)) colsOf.set(j, []);
      colsOf.get(j).push(c);
    }
    for (const r of B.rows) {
      for (const j of W.rows) {
        const support = colsOf.get(j) ?? [];
        let all = true;
        for (const c of support) {
          if (!B[lane].has(r + " " + c)) { all = false; break; }
        }
        if (all) out[lane].add(r + " " + j);
      }
    }
  }
  return out;
}

// The columns of A that carry any evidence in either lane. A residual's row
// for a column outside this set is the empty meet — vacuously ⊤ in the
// knowledge order — which is the exact greatest solution but says
// "true for everything" about a column no example ever witnessed.
export function supportCols(A) {
  const out = new Set();
  for (const lane of ["pos", "neg"]) for (const k of A[lane]) out.add(k.split(" ")[1]);
  return out;
}

// Restrict a weight relation to rows in `support`: rows outside it become
// ⊥ (unknown), the LEAST solution on the unwitnessed directions. A⊗W is
// unchanged for any A whose columns lie in the support, so the adjunction
// A⊗W ≤ B still holds; only the free directions stop asserting.
export function restrictRows(W, support) {
  const out = makeRel(W.rows, W.cols);
  for (const lane of ["pos", "neg"]) {
    for (const k of W[lane]) if (support.has(k.split(" ")[0])) out[lane].add(k);
  }
  return out;
}

// Monotone learning: meet of residuals across examples. Each new (X,Y)
// example can only REFINE the weight (meet is intersection per lane); a
// counterexample never corrupts pos-lane weights — it lands in neg.
export function meetRel(A, B) {
  const out = makeRel(A.rows, A.cols);
  for (const lane of ["pos", "neg"]) {
    for (const k of A[lane]) if (B[lane].has(k)) out[lane].add(k);
  }
  return out;
}

export function trainLayer(examples) {
  let W = null;
  for (const { input, target } of examples) {
    const R = residualLeft(input, target);
    W = W === null ? R : meetRel(W, R);
  }
  return W;
}

// leq per lane: A ≤ B iff every A-entry is a B-entry (knowledge order).
export function relLeq(A, B) {
  for (const lane of ["pos", "neg"]) {
    for (const k of A[lane]) if (!B[lane].has(k)) return false;
  }
  return true;
}

// A nucleus as activation: closure of a relation under a supplied monotone
// step, iterated to fixpoint — extensive, monotone, idempotent by
// construction (the step may only ADD entries).
export function nucleus(A, step, maxIters = 64) {
  let cur = makeRel(A.rows, A.cols, [], []);
  for (const lane of ["pos", "neg"]) for (const k of A[lane]) cur[lane].add(k);
  for (let i = 0; i < maxIters; i++) {
    const before = cur.pos.size + cur.neg.size;
    step(cur);
    if (cur.pos.size + cur.neg.size === before) return cur;
  }
  throw new Error("nucleus did not close");
}

// Chu-style attention: relevance of each col of K to a query row-relation Q
// is the evidence-weighted overlap; returns cols ranked by joint support,
// contested cols (pos and neg both) flagged, never averaged away.
export function attend(Q, K) {
  const scores = new Map();
  for (const qk of Q.pos) {
    const [, j] = qk.split(" ");
    for (const lane of ["pos", "neg"]) {
      for (const kk of K[lane]) {
        const [jj, c] = kk.split(" ");
        if (jj !== j) continue;
        const s = scores.get(c) ?? { pos: 0, neg: 0 };
        s[lane] += 1;
        scores.set(c, s);
      }
    }
  }
  return [...scores.entries()]
    .map(([c, s]) => ({ col: c, pos: s.pos, neg: s.neg, contested: s.pos > 0 && s.neg > 0 }))
    .sort((a, b) => (b.pos - b.neg) - (a.pos - a.neg));
}
