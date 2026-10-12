/**
 * The one executable SEN surface descriptor: the Curry-Howard-Lambek core
 * (var, lam, app, pair, fst, snd, star) plus the four executable forms the
 * 2026-06-18 note fixes (mark, coincide, cond, fold), and `prim`, the δ-rule
 * (Church's δ-conversion; Plotkin's PCF constants): `prim(name, arg)` contracts,
 * once `arg` is a value, by applying the named pure host operation to it. An
 * interpreter supplies its primitive table, so SEN names a capability rather
 * than re-implementing it. An atom name is both
 * the admission constraint and the JSON projection constraint; recursive
 * term and binder slots live here too, so a new form cannot be admitted
 * without becoming visible to every structural operation.
 */
export const SEN_FORMS = Object.freeze({
  var: { atoms: { 1: "natural" } },
  star: {},
  mark: { atoms: { 1: "text" } },
  lam: { terms: [1], binders: [1] },
  app: { terms: [1, 2] },
  pair: { terms: [1, 2] },
  fst: { terms: [1] },
  snd: { terms: [1] },
  coincide: { terms: [1, 2] },
  cond: { terms: [1, 2, 3] },
  fold: { terms: [1, 2, 3] },
  prim: { atoms: { 1: "text" }, terms: [2] },
  inl: { terms: [1], types: [2] },
  inr: { types: [1], terms: [2] },
  case: { terms: [1, 2, 3], binders: [2, 3] },
  abort: { terms: [1], types: [2] },
});
/** The seven types: the proved core's base, arrow, prod and unit, list, empty, and sum. */
export const SEN_TYPE_FORMS = Object.freeze({
  base: {},
  unit: {},
  arrow: { types: [1, 2] },
  prod: { types: [1, 2] },
  list: { types: [1] },
  empty: {},
  sum: { types: [1, 2] },
});
