// The conductance complex: a weighted graph over attributes whose edge
// weights are the machine's learnable metric (an inner product on
// 1-cochains — the free parameter of the defect operator δ). Supplies the
// weighted Laplacian, disagreement energy, its smallest nonzero eigenvalue
// λ₁ (Jacobi eigendecomposition; fibers here are small by locality), and
// the refusal number √(E/λ₁) of a family that fails to glue.

export function makeComplex(attributes) {
  const M = [...attributes];
  const index = new Map(M.map((m, i) => [m, i]));
  const n = M.length;
  const D = Array.from({ length: n }, () => new Float64Array(n));
  return { M, index, D };
}

// A complex is a value.  Updating one edge copies its matrix so a prior
// machine state remains a valid replay point.
export function withConductance(cx, a, b, w) {
  const i = cx.index.get(a);
  const j = cx.index.get(b);
  if (i === undefined || j === undefined) throw new Error(`unknown conductance endpoint: ${a}, ${b}`);
  const D = cx.D.map((row) => Float64Array.from(row));
  D[i][j] = w;
  D[j][i] = w;
  return { M: cx.M, index: cx.index, D };
}

export function conductance(cx, a, b) {
  return cx.D[cx.index.get(a)][cx.index.get(b)];
}

export function laplacian(cx) {
  const n = cx.M.length;
  const L = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    let deg = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        L[i][j] = -cx.D[i][j];
        deg += cx.D[i][j];
      }
    }
    L[i][i] = deg;
  }
  return L;
}

// Disagreement energy xᵀLx of an assignment over attributes.
export function disagreementEnergy(cx, assignment) {
  const L = laplacian(cx);
  const n = cx.M.length;
  const x = new Float64Array(n);
  for (const [m, val] of Object.entries(assignment)) {
    if (cx.index.has(m)) x[cx.index.get(m)] = val;
  }
  let e = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) e += x[i] * L[i][j] * x[j];
  return e;
}

// All eigenvalues of the symmetric Laplacian by cyclic Jacobi rotations.
export function eigenvalues(L) {
  const n = L.length;
  const A = L.map((row) => Float64Array.from(row));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
      }
    }
  }
  return Array.from({ length: n }, (_, i) => A[i][i]).sort((a, b) => a - b);
}

export function spectralGap(cx) {
  const evs = eigenvalues(laplacian(cx));
  for (const ev of evs) if (ev > 1e-9) return ev;
  return 0;
}

// A refused merge carries a number: how far the family sits from the
// nearest coherent one (closure-cones Theorem 10.14).
export function refusalNumber(cx, assignment) {
  const E = disagreementEnergy(cx, assignment);
  const l1 = spectralGap(cx);
  if (E < 1e-12) return 0;
  if (l1 === 0) return Infinity;
  return Math.sqrt(E / l1);
}
