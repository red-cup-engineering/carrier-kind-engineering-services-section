// PROOF — Landauer's bound is the thermal shadow of forgetting.
//
//   forgetting (transfer, η) is non-injective  ⇒  it erases information (the twistor residue)
//   ⇒  one forgotten distinction = one Shannon bit  ⇒  at a temperature T that bit costs kT·ln2,
//   and at T=0 (no thermal rung) it costs nothing.
//
// Run:  node proof.mjs       (exits 0 iff every claim holds)

import { saturate, transfer } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/void";
import { composableCone, isNonInjective, bitsErased, erasedSequences } from "./erasure.mjs";
import { shannonBits, erasureEntropyBits } from "./entropy.mjs";
import { landauerJoules, landauerEV } from "./landauer.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); };
const near = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol;
const S = JSON.stringify;
const cone = composableCone();

// 1. Forgetting is logically irreversible — the aperiodic monad η is non-injective.
ok("forget is non-injective: forget(realize(x)) == forget(x)", isNonInjective(cone));
ok("the realized composite is erased (forget keeps only the atoms)",
   S(transfer(saturate(cone)).potential) === S(cone.potential));

// 2. The erased information is exactly twistor's residue — the unsaturable concept-sequence.
ok("forgetting one composable pair erases exactly one distinction", bitsErased(cone) === 1);
ok("the erased distinction is the concept-sequence [p,q]", S(erasedSequences(cone)) === S([["p", "q"]]));

// 3. That distinction carries exactly one bit of Shannon information.
const dH = shannonBits([1, 1]) - shannonBits([1]); // fair prior over {present,absent} → single image
ok("Shannon entropy of the erased distinction = 1 bit", near(dH, 1));
ok("k independent forgets erase k bits", near(erasureEntropyBits(3), 3));
ok("bits erased (residue count) == Shannon bits lost", near(bitsErased(cone), dH));

// 4. Landauer: the bit costs ≥ kT·ln2 — but only where a temperature exists.
ok("erasure is FREE where there is no temperature (T=0): no thermal rung, no price",
   landauerJoules(0, dH) === 0);
const E300 = landauerJoules(300, dH);
ok("at the thermal rung T=300K one erased bit costs ~2.87e-21 J", E300 > 2.86e-21 && E300 < 2.88e-21);
ok("…i.e. ~0.0179 eV", landauerEV(300, dH) > 0.0178 && landauerEV(300, dH) < 0.0180);
ok("the bound is linear in bits erased", near(landauerJoules(300, 3), 3 * landauerJoules(300, 1), 1e-30));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
