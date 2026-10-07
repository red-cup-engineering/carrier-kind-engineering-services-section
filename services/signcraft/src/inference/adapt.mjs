// Learning: the Physarum adaptation law dD_e = |Q_e|^μ − γ·D_e over
// settlement flux. Q_e counts co-firing of attribute pairs in a settle
// trace's witnesses. This is the machine selecting its Hamiltonian's free
// weights by use (machine spec §1.5.3, §3); μ<1 retains loops (ambiguity),
// μ>1 concentrates. No gradients, no weights file — the learned object is
// the conductance matrix, per-edge, inspectable.

import { withConductance, conductance } from "./complex.mjs";

export function fluxFromTrace(ctx, trace) {
  const flux = new Map();
  for (const step of trace) {
    const byObject = new Map();
    for (const w of step.witnesses) {
      const [g, m] = w.cell.split(" ");
      if (!byObject.has(g)) byObject.set(g, []);
      byObject.get(g).push(m);
    }
    for (const attrs of byObject.values()) {
      for (let i = 0; i < attrs.length; i++) {
        for (let j = i + 1; j < attrs.length; j++) {
          const key = attrs[i] < attrs[j] ? attrs[i] + " " + attrs[j] : attrs[j] + " " + attrs[i];
          flux.set(key, (flux.get(key) ?? 0) + 1);
        }
      }
    }
  }
  return flux;
}

export function adapt(cx, flux, opts = {}) {
  const mu = opts.mu ?? 0.8;
  const gamma = opts.gamma ?? 0.1;
  const updated = [];
  let next = cx;
  const touched = new Set(flux.keys());
  for (let i = 0; i < cx.M.length; i++) {
    for (let j = i + 1; j < cx.M.length; j++) {
      const a = cx.M[i];
      const b = cx.M[j];
      const key = a < b ? a + " " + b : b + " " + a;
      const Q = flux.get(key) ?? 0;
      const before = conductance(cx, a, b);
      const after = Math.max(0, before + Math.pow(Math.abs(Q), mu) - gamma * before);
      if (after !== before) {
        next = withConductance(next, a, b, after);
        updated.push({ a, b, before, after, Q });
      }
      touched.delete(key);
    }
  }
  return { complex: next, updated, unknownEdges: [...touched] };
}
