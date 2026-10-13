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
export * as mld from "./substitution/mld.mts";
export * as hull from "./substitution/hull.mts";
export * as tiling from "./substitution/tiling.mts";
export * as sofic from "../../tilings/sofic.mts";
