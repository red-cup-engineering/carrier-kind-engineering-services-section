/**
 * analysis/algebra-hierarchy — re-export of the upstream primitive.
 *
 * The finite algebra-hierarchy math (field, gauge, algebraHierarchy, and
 * related carriers) lives once in @lenticule-science/articulating, which
 * relating already depends on at an exact pin. This file used to vendor a
 * byte-identical copy of the upstream module; it now only re-exports it, so
 * the sibling files that still import `./algebra-hierarchy.mjs` keep working
 * unchanged.
 */
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/algebra-hierarchy";
