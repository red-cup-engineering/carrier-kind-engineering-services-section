// PROOF — exchangeability forces Bose statistics.
//
//   condensing emits E × Π × E and the entities enter as a SET (exchangeable, grounded in posit)
//   ⇒ quanta are indistinguishable ⇒ counting occupations is the Sym(N)-quotient of the labeled
//   states, which is EXACTLY the Bose count C(N+M-1, M-1) — strictly fewer than the distinguishable
//   M^N, and permitting the single-mode condensate that Fermi forbids.
//
// A slice-independent structural fact of the quantum rung — true of any spacetime, not our cosmos.
// Run:  node proof.mjs       (exits 0 iff every claim holds)

import { isExchangeable } from "./exchange.mjs";
import {
  distinguishable, bose, fermi,
  orbitsUnderSym, orbitsWithExclusion, condensateOccupation,
} from "./statistics.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); };

// 1. Exchangeability is real, not asserted: condensing/collapsing build the cells over entities as a
//    SET (grounded in the stable @red-cup-engineering/metrologic posit morphism).
ok("condensing's cell-set is invariant under permuting entities (exchangeable)",
   isExchangeable(["q1", "q2", "q3"], ["m1", "m2"]));

// 2. THE theorem: the Sym(N)-quotient of the labeled states is exactly the Bose count — by explicit
//    enumeration, for a range of (N, M). Indistinguishability IS Bose counting.
for (const [N, M] of [[2, 2], [3, 2], [3, 3], [4, 3], [5, 4]]) {
  ok(`orbits(Sym ${N}) over ${M} modes == Bose C(${N + M - 1},${M - 1}) = ${bose(N, M)}`,
     orbitsUnderSym(N, M) === bose(N, M));
}

// 3. Indistinguishability STRICTLY collapses the labeled count (the de Finetti reduction).
ok("Bose < distinguishable for N,M>1 (identity collapses states)", bose(3, 3) < distinguishable(3, 3));
ok("distinguishable(3,3)=27, Bose=10, Fermi=1",
   distinguishable(3, 3) === 27 && bose(3, 3) === 10 && fermi(3, 3) === 1);

// 4. The same quotient with exclusion yields Fermi — the framework gives all three statistics.
for (const [N, M] of [[2, 3], [2, 4], [3, 5]]) {
  ok(`exclusion-orbits over ${M} modes == Fermi C(${M},${N}) = ${fermi(N, M)}`,
     orbitsWithExclusion(N, M) === fermi(N, M));
}

// 5. The condensate: macroscopic single-mode occupation is a valid Bose state, forbidden by Fermi.
const occ = condensateOccupation(4, 3); // [4,0,0]
ok("all-N-in-one-mode is a valid Bose occupation (sums to N)", occ.reduce((a, b) => a + b, 0) === 4);
ok("…and Fermi forbids it (some mode holds > 1)", occ.some((c) => c > 1));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
