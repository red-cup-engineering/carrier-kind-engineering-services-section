// @lenticule-science/metrologic/bilattice — the bilattice predication floor.
//
// The CHARGE ITSELF is not here and has no second shape here. A charge is
// computer-data-engine’s `ChargeCarrier`, and its algebra (join/meet on both orders,
// negation, conflation, the orders, the evidence merge) is defined in
// `computer-data-engine/bilattice-charge` — import it from there directly:
//   import { charge, chargeValue, joinKnowledge, valueOf }
//     from "@red-cup-engineering/computer-data-engine/bilattice-charge";
// What lives here is the DESCENT over charges — the four-regime predication that articulating's
// carrier is the value of. Narrower imports are available via subpaths —
//   import { settle } from "@lenticule-science/metrologic/bilattice/descent";
//   import { brim }   from "@lenticule-science/metrologic/bilattice/cone";
//   import { vanish } from "@lenticule-science/metrologic/bilattice/void";

// descent — the four-regime descent, the modal generators, settle, and the consistent/paraconsistent split
export {
  articulate,
  predicate,
  cohere,
  posit,
  commutate,
  raiseKnowledge,
  lowerKnowledge,
  raiseTruth,
  lowerTruth,
  possibilizeKnowledge,
  necessitateKnowledge,
  possibilizeTruth,
  necessitateTruth,
  lastValuation,
  settle,
  compare,
} from "./descent.mjs";

// cone — the counit/dual cones
export { brim, adjudicate, presume } from "./cone.mjs";

// void — the void reads and the aperiodic/transfinite duals
export { saturate, transfer, twistor, precipitate, estrange, gap, vanish } from "./void.mjs";
