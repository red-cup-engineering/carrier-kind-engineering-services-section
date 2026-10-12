/**
 * settling/closure — re-export of the upstream primitive.
 *
 * The bounded ordinal closure engine (closeOrdinalProcess, closureProcess,
 * and related carriers) lives once in @lenticule-science/articulating, which
 * relating already depends on at an exact pin. This file used to vendor a
 * byte-identical copy of the upstream module; it now only re-exports it, so
 * the sibling files that still import `./closure.mjs` keep working
 * unchanged.
 */
export * from "@lenticule-science/articulating/predicating/positing/settling/closure";
