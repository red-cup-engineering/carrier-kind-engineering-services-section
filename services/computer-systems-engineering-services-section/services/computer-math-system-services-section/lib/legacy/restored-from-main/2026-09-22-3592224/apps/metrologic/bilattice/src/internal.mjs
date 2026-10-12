/**
 * internal.mjs — out-of-system plumbing. Not a morphism: it keys structures, no math lives here.
 *
 * Structural-equality / map-key helper: `JSON.stringify`, sourced once instead of re-typed per op.
 * Evidence accumulation is NOT here — it belongs to the charge owner
 * (`@lenticule-science/articulating/predicating/positing/bilattice-charge`), which `charge.mjs` binds.
 * @param {unknown} x @returns {string}
 */
export const stringify = (x) => JSON.stringify(x);
