// Occupation counting for N quanta over M modes, under the three identity regimes — and the
// operational proof that indistinguishability (the Sym(N) quotient) IS Bose counting.

export const choose = (n, k) => {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
};

// Maxwell–Boltzmann: quanta DISTINGUISHABLE (labeled). Each of N independently picks a mode.
export const distinguishable = (N, M) => M ** N;
// Bose–Einstein: indistinguishable, any number per mode. Multisets of size N over M (stars & bars).
export const bose = (N, M) => choose(N + M - 1, M - 1);
// Fermi–Dirac: indistinguishable, ≤1 per mode. Which N of M modes are occupied.
export const fermi = (N, M) => choose(M, N);

// All M^N labeled assignments (functions {0..N-1} → {0..M-1}), enumerated.
export const labeledAssignments = function* (N, M) {
  const a = new Array(N).fill(0);
  for (;;) {
    yield a.slice();
    let i = N - 1;
    while (i >= 0 && a[i] === M - 1) { a[i] = 0; i--; }
    if (i < 0) return;
    a[i]++;
  }
};

// The occupation vector (count per mode) — the Sym(N)-invariant of an assignment: relabeling the
// quanta cannot change how many sit in each mode. So distinct occupation vectors = Sym(N)-orbits.
export const occupation = (assignment, M) => {
  const occ = new Array(M).fill(0);
  for (const mode of assignment) occ[mode]++;
  return occ;
};

// Orbits of the labeled assignments under Sym(N) (relabeling the quanta) = distinct occupations.
export const orbitsUnderSym = (N, M) => {
  const seen = new Set();
  for (const a of labeledAssignments(N, M)) seen.add(occupation(a, M).join(","));
  return seen.size;
};
// The same quotient, restricted to ≤1 per mode (exclusion) = Fermi.
export const orbitsWithExclusion = (N, M) => {
  const seen = new Set();
  for (const a of labeledAssignments(N, M)) {
    const occ = occupation(a, M);
    if (occ.every((c) => c <= 1)) seen.add(occ.join(","));
  }
  return seen.size;
};

// A condensate: all N quanta in one mode — a valid Bose occupation; Fermi forbids it for N>1.
export const condensateOccupation = (N, M) => { const o = new Array(M).fill(0); o[0] = N; return o; };
