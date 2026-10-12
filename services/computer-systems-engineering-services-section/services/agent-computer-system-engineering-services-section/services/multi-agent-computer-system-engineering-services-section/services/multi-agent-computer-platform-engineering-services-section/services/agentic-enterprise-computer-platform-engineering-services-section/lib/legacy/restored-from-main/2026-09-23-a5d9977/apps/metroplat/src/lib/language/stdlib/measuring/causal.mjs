/**
 * evaluators/measuring/causal — RMN normalizers for finite Lorentzian causal witnesses.
 */
import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { objectTerm, stringTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";

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
  ["cycle", field("cycle")],
  ["directLinks", field("directLinks")],
  ["events", field("events")],
  ["kind", stringTerm("lorentzian.causalSettle-obstruction")],
  ["offending", field("offending")],
  ["reason", stringTerm(reason)],
]);

const causalObstruction = objectTerm([
  ["closure", field("closure")],
  ["cycle", field("cycle")],
  ["directLinks", field("directLinks")],
  ["events", field("events")],
  ["kind", stringTerm("lorentzian.causalSettle-obstruction")],
  ["offending", field("offending")],
  ["reason", field("reason")],
]);

const witnessOrObstruction = (kind, witness) => tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm(kind)),
    witness,
    causalObstruction,
  ),
);

export const closeCausalSetTerm = tm.lam(
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

export const coneFieldTerm = witnessOrObstruction("lorentzian.coneField:witness", objectTerm([
  ["closure", field("closure")],
  ["events", field("events")],
  ["futureCones", field("futureCones")],
  ["kind", stringTerm("lorentzian.coneField:witness")],
  ["orderLaws", field("orderLaws")],
  ["spacelikePairs", field("spacelikePairs")],
]));

export const causalIntervalTerm = witnessOrObstruction("lorentzian.causalInterval:witness", objectTerm([
  ["diamondLayerProfile", field("diamondLayerProfile")],
  ["diamondLayersPartitionPast", field("diamondLayersPartitionPast")],
  ["event", field("event")],
  ["intervalCardZeroIffEmpty", field("intervalCardZeroIffEmpty")],
  ["kind", stringTerm("lorentzian.causalInterval:witness")],
  ["layerProfile", field("layerProfile")],
  ["membershipMatchesOrderBracketing", field("membershipMatchesOrderBracketing")],
  ["pastCount", field("pastCount")],
  ["pastLayerMembershipMatchesAbundance", field("pastLayerMembershipMatchesAbundance")],
  ["strictPast", field("strictPast")],
]));

export const causalAlexandrovTerm = witnessOrObstruction("lorentzian.causalAlexandrov:witness", objectTerm([
  ["futureConesOpen", field("futureConesOpen")],
  ["kind", stringTerm("lorentzian.causalAlexandrov:witness")],
  ["specializationRecoversOrder", field("specializationRecoversOrder")],
  ["strictReachabilityIsSpecializationNe", field("strictReachabilityIsSpecializationNe")],
  ["topologyGeneratedByCausalOrder", field("topologyGeneratedByCausalOrder")],
]));

export const causalAlexandrovTopologyTerm = witnessOrObstruction("lorentzian.causalAlexandrovTopology:witness", objectTerm([
  ["causalContinuousIffMonotone", field("causalContinuousIffMonotone")],
  ["closedFuturesOpen", field("closedFuturesOpen")],
  ["futureCones", field("futureCones")],
  ["kind", stringTerm("lorentzian.causalAlexandrovTopology:witness")],
  ["reachesIffSpecializesNe", field("reachesIffSpecializesNe")],
  ["recoversCones", field("recoversCones")],
  ["spacelikeIffNoSpecialization", field("spacelikeIffNoSpecialization")],
  ["specializesIffCausalLe", field("specializesIffCausalLe")],
  ["strictFuturesOpen", field("strictFuturesOpen")],
]));

export const causalLaplacianTerm = witnessOrObstruction("lorentzian.causalLaplacian:witness", objectTerm([
  ["closure", field("closure")],
  ["gapOne", field("gapOne")],
  ["harmonic", field("harmonic")],
  ["kind", stringTerm("lorentzian.causalLaplacian:witness")],
  ["leastFutureClosed", field("leastFutureClosed")],
  ["seed", field("seed")],
]));

export const lightObservationTerm = witnessOrObstruction("lorentzian.lightObservation:witness", objectTerm([
  ["kind", stringTerm("lorentzian.lightObservation:witness")],
  ["recoversCausalOrder", field("recoversCausalOrder")],
  ["separating", field("separating")],
  ["signatures", field("signatures")],
]));

export const diamondSpectralPortraitTerm = tm.lam(objectTerm([
  ["causalLaplacian", field("causalLaplacian")],
  ["eulerCharacteristic", field("eulerCharacteristic")],
  ["futureCounts", field("futureCounts")],
  ["kind", stringTerm("lorentzian.diamondSpectralPortrait:witness")],
  ["orderingFraction", field("orderingFraction")],
  ["pastTopCount", field("pastTopCount")],
  ["spacelikeMiddlePair", field("spacelikeMiddlePair")],
]));

export const causalNetTerm = tm.lam(objectTerm([
  ["diamondIsotony", field("diamondIsotony")],
  ["kind", stringTerm("lorentzian.causalNet:witness")],
  ["regionPreorder", field("regionPreorder")],
  ["spacelikeRegionsDisjoint", field("spacelikeRegionsDisjoint")],
  ["spacelikeRegionsSymmetric", field("spacelikeRegionsSymmetric")],
]));

export const paraconsistentConeReportTerm = tm.lam(objectTerm([
  ["booleanConsistent", field("booleanConsistent")],
  ["contradictoryMerge", field("contradictoryMerge")],
  ["falseCharge", field("falseCharge")],
  ["kind", stringTerm("lorentzian.paraconsistentConeReport:witness")],
  ["mergeCommutative", field("mergeCommutative")],
  ["mergeInflationary", field("mergeInflationary")],
  ["reachableIffBoolean", field("reachableIffBoolean")],
  ["trueCharge", field("trueCharge")],
]));

export const microlocalSupportTerm = witnessOrObstruction("lorentzian.microlocalSupport:witness", objectTerm([
  ["causalPropagationClosure", field("causalPropagationClosure")],
  ["h1CurvedWhenNonvanishes", field("h1CurvedWhenNonvanishes")],
  ["h1FlatWhenVanishes", field("h1FlatWhenVanishes")],
  ["kind", stringTerm("lorentzian.microlocalSupport:witness")],
  ["smoothFlowBoundary", field("smoothFlowBoundary")],
]));

export const myrheimMeyerRealShadowTerm = tm.lam(objectTerm([
  ["dimensionInverse", field("dimensionInverse")],
  ["internalRealShadow", field("internalRealShadow")],
  ["kind", stringTerm("lorentzian.myrheimMeyerRealShadow:witness")],
  ["rationalOrderingFraction", field("rationalOrderingFraction")],
]));
