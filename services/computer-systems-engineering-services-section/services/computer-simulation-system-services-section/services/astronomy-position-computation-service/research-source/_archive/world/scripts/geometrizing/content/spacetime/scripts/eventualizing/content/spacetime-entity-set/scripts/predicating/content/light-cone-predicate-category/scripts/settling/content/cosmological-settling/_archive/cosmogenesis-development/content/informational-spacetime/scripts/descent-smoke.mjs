// SMOKE TEST — the descent runs through its own cell scripts.
//
// Every rung re-exports its morphism from the stable @red-cup-engineering/metrologic/bilattice (mark=articulate,
// realize=saturate, forget=transfer, condense=predicate, cohere, collapse=posit, balance=commutate,
// spread=possibilizeKnowledge, constrain=necessitateKnowledge, thermalize=settle). This drives the
// real pipeline through those re-exports, proving they resolve AND compose — not just import.
//
// Run:  node descent-smoke.mjs       (exits 0 iff the descent runs end to end)

import { articulate as mark } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/descent";
import { saturate as realize } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/void";
import { transfer as forget } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/void";
import { predicate as condense } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/descent";
import { cohere } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/descent";
import { posit as collapse } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/descent";

const CSL = "../library/condensing/library/quantum-spacetime/library/collapsing/library/classical-spacetime/library";
const balance = (await import(`${CSL}/balancing/scripts/balance.mjs`)).default;
const thermalize = (await import(`${CSL}/thermalizing/scripts/thermalize.mjs`)).default;
const spread = (await import(`${CSL}/spreading/scripts/spread.mjs`)).default;
const constrain = (await import(`${CSL}/constraining/scripts/constrain.mjs`)).default;

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); };
const S = JSON.stringify;

// every rung's morphism resolves to a callable
for (const [name, fn] of Object.entries({ mark, realize, forget, condense, cohere, collapse, balance, thermalize, spread, constrain }))
  ok(`${name} resolves to a function`, typeof fn === "function");

// the descent composes through the re-exports: aperiodic -> transfinite -> scott -> finite
const cell = mark(["a", "b"]);          // mark a bit (articulate)
const q = condense(cell);               // condensing -> the quantum cell-set Φ = E×Π×E
ok("condense(mark(·)) emits a cell-set", !!q["cell-set"]);
ok("cohere closes the base (has residue)", !!cohere(q).residue);
const col = collapse(q);                // collapsing -> the valued presheaf
ok("collapse seeds the valued presheaf", !!col.presheaf);
ok("balance splits presheaf/traces", !!balance(col).saturated);
ok("thermalize reaches the sheaf", !!thermalize(col).sheaf);

// the aperiodic monad through realize/forget: non-injective (forgetting loses the composite)
const coneAtoms = { potential: [
  { subject: "a", predicate: "p", object: "b" },
  { subject: "b", predicate: "q", object: "c" },
] };
ok("realize composes a path (saturate adds a composite)", realize(coneAtoms).potential.length > coneAtoms.potential.length);
ok("forget is non-injective: forget(realize(x)) == forget(x)", S(forget(realize(coneAtoms))) === S(forget(coneAtoms)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
