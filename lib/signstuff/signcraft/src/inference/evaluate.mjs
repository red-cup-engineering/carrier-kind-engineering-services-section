// Native evaluation: masked-incidence prediction (machine spec §5). Mask a
// fraction of true incidences, rebuild the machine from what remains, and
// predict each masked (g,m) by settle-reachability and ΔF rank against a
// same-information attribute-frequency baseline. The class meets the old
// class on a common bench without borrowing its substrate.

import { makeContext, lawfulBasis } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, settle, readingAt } from "./nuclei.mjs";
import { makeComplex } from "./complex.mjs";
import { continuationEnergy } from "./generate.mjs";
import { shuffle } from "./learn.mjs";

export function maskedIncidenceEval(objects, attributes, pairs, opts = {}) {
  if (typeof opts.rng !== "function") throw new Error("maskedIncidenceEval requires an injected rng capability");
  const rng = opts.rng;
  const maskFrac = opts.maskFrac ?? 0.2;
  const shuffled = shuffle(pairs, rng);
  const nMask = Math.max(1, Math.floor(shuffled.length * maskFrac));
  const masked = shuffled.slice(0, nMask);
  const kept = shuffled.slice(nMask);

  const ctx = makeContext(objects, attributes, kept);
  const basis = lawfulBasis(ctx);
  const cx = makeComplex(attributes);
  let v = makeValuation();
  for (const [g, m] of kept) v = withReading(v, g, m, "potential");
  const settled = settle(ctx, v, { basis });

  const freq = new Map(attributes.map((m) => [m, 0]));
  for (const [, m] of kept) freq.set(m, freq.get(m) + 1);
  const freqRank = [...attributes].sort((a, b) => freq.get(b) - freq.get(a));

  let kernelHits = 0;
  let baselineHits = 0;
  const rows = [];
  for (const [g, m] of masked) {
    const reached = ["potential", "stable"].includes(readingAt(settled.v, g, m));
    const candidates = attributes
      .filter((a) => !["potential", "stable"].includes(readingAt(settled.v, g, a)))
      .map((a) => ({ a, dF: continuationEnergy(ctx, basis, cx, settled.v, { g, attr: a }, opts) }))
      .sort((x, y) => x.dF - y.dF);
    const kernelTop = reached ? m : candidates[0]?.a;
    const baselineTop = freqRank.find((a) => !["potential", "stable"].includes(readingAt(settled.v, g, a))) ?? freqRank[0];
    if (kernelTop === m) kernelHits++;
    if (baselineTop === m) baselineHits++;
    rows.push({ g, m, reached, kernelTop, baselineTop });
  }
  return {
    maskedCount: masked.length,
    keptCount: kept.length,
    kernelHits,
    baselineHits,
    kernelAccuracy: kernelHits / masked.length,
    baselineAccuracy: baselineHits / masked.length,
    rows,
  };
}
