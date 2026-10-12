/**
 * @packageDocumentation
 *
 * dynamics - finite substitution-dynamics reads for aperiodic settling.
 *
 * This module exposes the executable part of the package's aperiodic-settling
 * line: finite substitution rules, finite words and orbits, exact incidence
 * matrices, characteristic-polynomial reads, primitivity judgments, localized
 * colimit data, substitution duality checks, and the step-`n` recurrence
 * hierarchy.
 *
 * It is not a general dynamical-systems package, a real eigenvalue solver, or
 * the whole aperiodic-moduli program. The runtime claim is record-shaped and
 * finite: callers provide substitution data, and the package returns exact
 * matrices plus witness/obstruction data for the laws it can check.
 *
 * is the step-`n` substitution-recurrence family under aperiodic settling.
 */
export * from "./substitution/index.mts";
export * as recurrence from "./substitution/recurrence/index.mts";
export * as mld from "@lenticule-science/articulating/predicating/positing/settling/dynamics/substitution/mld";
export * as hull from "@lenticule-science/articulating/predicating/positing/settling/dynamics/substitution/hull";
export * as tiling from "@lenticule-science/articulating/predicating/positing/settling/dynamics/substitution/tiling";
export * as sofic from "../../tilings/sofic.mts";
