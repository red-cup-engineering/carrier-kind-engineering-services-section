/**
 * positing — value enters predication by evidence.
 *
 *   potential-transfinite-predication-cell --positing--> potential-scott-continuous-posit-cell
 *
 * Carries the bilattice charge vocabulary, the predication fiber algebra, the
 * `posit` morphism, the multiplicative linear logic at value entry, and the
 * posit presheaf settlement reads. Diataxis is exposed as a small read over the
 * same FOUR charge values. Charges are never admitted directly; they are
 * constructed from evidence over cells.
 */
export {
  chargeSide,
  chargeSideNames,
  chargeValue,
  chargeValues,
  chargeValueNames,
  chargeValueName,
  chargeSideName,
  isChargeValueName,
  isChargeSideName,
  isChargeSide,
  isChargeValue,
  isCharge,
  asChargeValueName,
  asChargeValue,
  charge,
  bottom,
  witnessedPotential,
  valueOf,
  present,
  sameCharge,
  sameChargeValue,
  negate,
  negateValue,
  conflate,
  conflateValue,
  joinKnowledge,
  joinKnowledgeValue,
  meetKnowledge,
  meetKnowledgeValue,
  joinTruth,
  joinTruthValue,
  meetTruth,
  meetTruthValue,
  leqKnowledge,
  leqTruth,
  compareKnowledge,
  aggregate,
  knowledgeAggregate,
  knowledgeAggregateOfCensus,
  knowledgeMeet,
  knowledgeMeetOfCensus,
  truthAggregate,
  truthAggregateOfCensus,
  isTop,
  isBottom,
  knowledgeLeq,
  truthLeq,
  gauge,
  gaugeMul,
  gaugeOrderEffect,
  gaugeElementNames,
  fixedSet,
  firingPatternSelfDuality,
  chargeValueIdentity,
  chargeBilatticeLawReceipt,
  kleinFourGaugeReceipt,
  chargeFiniteAlgebra,
} from "@lenticule-science/articulating/predicating/positing/bilattice-charge";
export type {
  ChargeSideName,
  ChargeSide,
  ChargeValueName,
  ChargeCoordinates,
  ChargeValue,
  ChargeCarrier,
  ChargeFiniteAlgebraCarrier,
  ChargePair,
  FourCensus,
  GaugeElementName,
  GaugeOrderEffectName,
  FiringPatternSelfDualityJudgment,
  ChargeValueIdentityJudgment,
  OrderLeqJudgment,
  ChargeBilatticeLawReceipt,
  KleinFourGaugeReceipt,
} from "@lenticule-science/articulating/predicating/positing/bilattice-charge";

export {
  memeSchema,
  meme,
  isMeme,
  allCells,
  predicateFiber,
  predicateFiberCellIdentity,
  knowledgeOrder,
  truthOrder,
  fiberFromAlgebra,
  predicationFiberLinearFusion,
  predicationFiberLinearResiduum,
  leqTruthPredicateFiber,
  generatorPreservesLinearFusion,
  generatorPreservesLinearResiduum,
  generatorSatisfiesLinearFusionFrobenius,
  converse,
  subjectProjection,
  objectProjection,
  specialization,
  composeFibers,
  chargeAt,
  knowledgeLeastValuation,
  fiberValuationLeqKnowledge,
  fiberValuationKnowledgeJoin,
  knowledgeLeastValuationReceipt,
  valuationFromPredicateFiber,
} from "@lenticule-science/articulating/predicating/positing/fiber";
export type {
  Meme,
  FiberAlgebra,
  Valuation,
  FiberCarrier,
  OrderName,
  Order,
  PredicateFiberCell,
  PredicateFiberCellIdentityJudgment,
  PredicateFiber,
  GeneratorKind,
  FiberGenerator,
  KnowledgeLeastValuationReceipt,
} from "@lenticule-science/articulating/predicating/positing/fiber";

export {
  commutate,
  presheaf,
  presheafFromValuation,
  sheafFromValuation,
} from "@lenticule-science/articulating/predicating/positing/settling/sheaf";
export type {
  PositPresheaf,
  PresheafTrace,
  SheafCarrier,
  CommutationCarrier,
} from "@lenticule-science/articulating/predicating/positing/settling/sheaf";

export {
  orderSwapValue,
  dihedral,
  dihedralElementNames,
  dihedralMul,
  dihedralFixedSet,
  dihedralOrderEffect,
  orderSwapIso,
  orderSwapDualityReceipt,
  dihedralConjugation,
  dihedralSwapsOrders,
  d4GaugeReceipt,
} from "@lenticule-science/articulating/predicating/positing/dihedral-gauge";
export type {
  DihedralElementName,
  DihedralOrderEffectName,
  OrderSwapIsoJudgment,
  OrderSwapDualityReceipt,
  DihedralConjugationJudgment,
  DihedralSwapsOrdersJudgment,
  D4GaugeReceipt,
} from "@lenticule-science/articulating/predicating/positing/dihedral-gauge";

export {
  truthImplicationValue,
  valuationFiberCarrier,
  readValuationFiber,
  valuationTruthMeet,
  valuationTruthJoin,
  valuationTruthImplication,
  valuationLeqTruth,
  valuationLeqKnowledge,
  nucleusToward,
  sigmaNucleus,
  deltaNucleus,
  piNucleus,
  crossOrderNotKnowledgeNucleus,
  valuationFiberAlgebraReceipt,
  valuationQuartetDischargeReceipt,
  modalToCorner,
  cornerToModal,
  valuationFiberCornerOp,
  quartetRecurrenceReceipt,
} from "@lenticule-science/articulating/predicating/positing/valuation-fiber-algebra";
export type {
  ValuationFiberCornerName,
  ModalCornerName,
  ValuationFiberCarrier,
  CrossOrderNucleusFinding,
  ValuationFiberAlgebraReceipt,
  ValuationQuartetDischargeReceipt,
  QuartetRecurrenceReceipt,
} from "@lenticule-science/articulating/predicating/positing/valuation-fiber-algebra";

export {
  modalKripkeFrame,
  possibilize,
  necessitate,
  closureOp,
  twistSplit,
  modalKripkeReceipt,
  modalPairAdjunctionReceipt,
} from "@lenticule-science/articulating/predicating/positing/modal-kripke-four-valued";
export type {
  KripkeFrameClass,
  KripkeValuation,
  ModalKripkeFrame,
  TwistSplit,
  ModalKripkeReceipt,
  ModalPairAdjunctionReceipt,
} from "@lenticule-science/articulating/predicating/positing/modal-kripke-four-valued";

export {
  chargeClosureCarrier,
  knowledgeJoinClosure,
  applyChargeClosure,
  iterateChargeOperation,
  settleStep,
  chargeOrbit,
  liftClosure,
  valuationKnowledgeJoin,
  valuationKnowledgeMeet,
  closureOrbit,
  reindexMapCarrier,
  reindexValuationFiber,
  pointwiseClosureFamilyReceipt,
  cosettlingReceipt,
  closureMonadReceipt,
  closure2MonadKzReceipt,
} from "@lenticule-science/articulating/predicating/positing/closure-operator-fiber";
export type {
  ChargeClosureCarrier,
  ReindexMapCarrier,
  PointwiseClosureFamilyReceipt,
  CosettlingReceipt,
  ClosureMonadReceipt,
  Closure2MonadKzReceipt,
} from "@lenticule-science/articulating/predicating/positing/closure-operator-fiber";

export {
  diataxisModeNames,
  diataxisModes,
  isDiataxisModeName,
  asDiataxisModeName,
  diataxisMode,
  diataxisModeName,
  chargeValueOfDiataxisMode,
  diataxisModeOfCharge,
  diataxisApplication,
  diataxisCognition,
  diataxisLookupDual,
  diataxisDoingDual,
  diataxisAntipode,
  diataxisReading,
} from "@lenticule-science/articulating/predicating/positing/diataxis";
export type {
  DiataxisModeName,
  DiataxisMode,
  DiataxisDualityEdge,
  DiataxisReading,
} from "@lenticule-science/articulating/predicating/positing/diataxis";

export * as logic from "@lenticule-science/articulating/predicating/positing/logic/index";
export * as settling from "./settling/index.mjs";

export { fiberCarrier, posit, presentPositPresheaf, freePositPresheaf } from "./settling/topology.mjs";
export type { PositPresheafGenerators } from "./settling/topology.mjs";
import { fourCensusOfNames as upstreamCensus, type ChargeValue, type ChargeValueName, type FourCensus } from "@lenticule-science/articulating/predicating/positing/bilattice-charge";

export function fourCensusOfNames(names: readonly ChargeValueName[]): FourCensus {
 const { absurd, potential, active, stable } = upstreamCensus(names);
 return Object.freeze({ absurd, potential, active, stable });
}

export function fourCensus(values: readonly ChargeValue[]): FourCensus { return fourCensusOfNames(values.map(value => value.name)); }
