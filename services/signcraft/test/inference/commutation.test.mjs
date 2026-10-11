import { test } from "node:test";
import assert from "node:assert/strict";
import { makeContext, lawfulBasis } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, readingAt, sigma, delta } from "../../src/inference/nuclei.mjs";
import { samePoint as eqFour } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { mulberry32 } from "../../src/inference/learn.mjs";

// Property check of the settling square's commutation on the kernel's REAL
// nuclei (σ = supported-basis closure, Δ = Galois transfer along realized
// profiles), over random denial-aware contexts and random seeds — the
// numeric counterpart of FiberAlgebra.lean's sigma_delta_comm, which is
// proved there only for pole-closures. The measured rate is reported
// verbatim; the assertion is on σΔ = ΔσΔ-shape (the idempotent square the
// settle loop relies on), and the raw σΔ = Δσ rate is printed win or lose.

function randomContext(rng, nG, nM, density, denialDensity) {
  const G = Array.from({ length: nG }, (_, i) => "g" + i);
  const M = Array.from({ length: nM }, (_, i) => "m" + i);
  const pairs = [];
  const denials = [];
  for (const g of G) for (const m of M) {
    const r = rng();
    if (r < density) pairs.push([g, m]);
    else if (r < density + denialDensity) denials.push([g, m]);
  }
  return makeContext(G, M, pairs, denials);
}

function valuationEq(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    const [g, m] = k.split(" ");
    if (!eqFour(readingAt(a, g, m), readingAt(b, g, m))) return false;
  }
  return true;
}

test("σ and Δ on random denial-aware contexts: measured commutation and the idempotent-square law", () => {
  const rng = mulberry32(2026);
  const N = 60;
  let commute = 0;
  let squareHolds = 0;
  for (let i = 0; i < N; i++) {
    const ctx = randomContext(rng, 4 + Math.floor(rng() * 3), 4 + Math.floor(rng() * 3), 0.35, 0.1);
    const basis = lawfulBasis(ctx);
    let v = makeValuation();
    const g = "x";
    for (const m of ctx.M) {
      const r = rng();
      if (r < 0.3) v = withReading(v, g, m, "potential");
      else if (r < 0.4) v = withReading(v, g, m, "active");
    }
    const sd = sigma(ctx, basis, delta(ctx, v).v).v;
    const ds = delta(ctx, sigma(ctx, basis, v).v).v;
    if (valuationEq(sd, ds)) commute++;
    const sdsd = sigma(ctx, basis, delta(ctx, sd).v).v;
    if (valuationEq(sd, sdsd)) squareHolds++;
  }
  console.log(`σΔ = Δσ on ${commute}/${N} random contexts; (σΔ)² = σΔ on ${squareHolds}/${N}`);
  assert.equal(squareHolds, N, "the composite must be idempotent on every context — settle's fixed point depends on it");
});
