/**
 * evaluating/measuring/causal — SEN normalizers for finite Lorentzian causal witnesses.
 */
import { tm, } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { objectTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";

const field = (key) => tm.field(key, tm.var(0));

const settleWitness = objectTerm([
  ["apexCount", field("apexCount")],
  ["closure", field("closure")],
  ["directLinks", field("directLinks")],
  ["eulerCharacteristic", field("eulerCharacteristic")],
  ["events", field("events")],
  ["h1Vanishes", field("h1Vanishes")],
  ["kind", stringTerm("lorentzian.causalSettle:witness")],
  ["nscCount", field("nscCount")],
  ["orderedPairCount", field("orderedPairCount")],
  ["orderingFraction", field("orderingFraction")],
  ["regime", field("regime")],
]);

const settleObstruction = (reason) => objectTerm([
  ["closure", field("closure")],
  ["directLinks", field("directLinks")],
  ["events", field("events")],
  ["kind", stringTerm("lorentzian.causalSettle-obstruction")],
  ["offending", field("offending")],
  ["reason", stringTerm(reason)],
]);

/** Normalize the finite carrier model of `RelMath.Lorentzian.Causal`. */
export const settleCausalSetTerm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("lorentzian.causalSettle:witness")),
    settleWitness,
    tm.cond(
      tm.coincide(field("reason"), stringTerm("duplicate-event")),
      settleObstruction("duplicate-event"),
      tm.cond(
        tm.coincide(field("reason"), stringTerm("unknown-event")),
        settleObstruction("unknown-event"),
        settleObstruction("closed-timelike-curve"),
      ),
    ),
  ),
);

/** Normalize the finite Myrheim-Meyer geometry/topology independence witness. */
export const geometryIndependentOfTopologyTerm = tm.lam(objectTerm([
  ["antichainOrderingFraction", field("antichainOrderingFraction")],
  ["chainOrderingFraction", field("chainOrderingFraction")],
  ["diamondOrderingFraction", field("diamondOrderingFraction")],
  ["kind", stringTerm("lorentzian.myrheimMeyer.geometryIndependentOfTopology:witness")],
  ["sharedClassifying", field("sharedClassifying")],
]));

