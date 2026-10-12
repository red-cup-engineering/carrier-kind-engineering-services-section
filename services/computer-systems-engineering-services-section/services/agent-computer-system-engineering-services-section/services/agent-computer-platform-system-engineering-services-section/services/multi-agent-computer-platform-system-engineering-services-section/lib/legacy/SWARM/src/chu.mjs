// chu.mjs — SWARM's Chu space, REBASED onto @lenticule-science/metrologic/chu.
//
// SWARM had hand-rolled a Chu space over the bilattice (chuSpace/row/col/extension/transpose/dual/
// settleColumn/settleRow) because EAVT memory, the office table, and readiness are all relations
// r : A×X → K. That carrier now lives in the math kernel — @lenticule-science/metrologic/chu is exactly this Chu
// space over the FOUR bilattice, kernel-backed, with the same public surface. This module re-derives
// NONE of it: it re-exports the kernel's Chu space. The agent-domain instances that ride on it
// (offices.mjs's officeCapabilityChu, readiness-chu.mjs, eavt-chu.mjs) stay in swarm.
//
// One swarm-local seam is preserved for its callers: the kernel's chuSpace defaults a missing/
// off-alphabet cell to FOUR.F (closed-world "absence is the negative charge"), which is exactly what
// the office table wants. readiness-chu/eavt-chu carry their own open-world ⊥ default through the
// kernel's `absent` option, so nothing is lost.

export {
  chuSpace,
  fromMatrix,
  isChuSpace,
  row,
  col,
  extension,
  transpose,
  dual,
  settleColumn,
  settleRow,
} from "@lenticule-science/metrologic/chu";
