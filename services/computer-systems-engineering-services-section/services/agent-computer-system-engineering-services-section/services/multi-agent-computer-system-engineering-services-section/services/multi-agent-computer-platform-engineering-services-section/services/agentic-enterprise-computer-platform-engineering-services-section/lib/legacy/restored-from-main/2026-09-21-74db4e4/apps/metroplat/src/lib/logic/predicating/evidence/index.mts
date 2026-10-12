/**
 * positing — value enters predication by evidence.
 *
 *   potential-transfinite-predication-cell --positing--> potential-scott-continuous-posit-cell
 *
 * Carries the bilattice charge vocabulary, the predication fiber algebra, the
 * `posit` morphism, the multiplicative linear logic at value entry, and the
 * posit presheaf settlement reads. Charges are never admitted directly; they
 * are constructed from evidence over cells. Diataxis (an external
 * documentation taxonomy read over these same FOUR charge values) lives at
 * `@red-cup-engineering/vault-note-schema/diataxis` — it is a text-boundary
 * codec, not material law, and reading it requires reading a document, which
 * core/ may not do.
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
  fourCensus,
  fourCensusOfNames,
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
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";
export type {
  ChargeSideName,
  ChargeSide,
  ChargeValueName,
  ChargeCoordinates,
  ChargeValue,
  Charge,
  ChargeFiniteAlgebra,
  ChargePair,
  FourCensus,
  GaugeElementName,
  GaugeOrderEffectName,
  FiringPatternSelfDualityJudgment,
  ChargeValueIdentityJudgment,
  OrderLeqJudgment,
  ChargeBilatticeLawReceipt,
  KleinFourGaugeReceipt,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";

export {
  memeSchema,
  meme,
  isMeme,
  allCells,
  predicateFiber,
  predicateFiberCellIdentity,
  fiberCarrier as predicationFiber,
  posit,
  presentPositPresheaf,
  freePositPresheaf,
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
} from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";
export type {
  Meme,
  FiberAlgebra,
  Valuation,
  FiberCarrier as PredicationFiber,
  PositPresheafGenerators,
  OrderName,
  Order,
  PredicateFiberCell,
  PredicateFiberCellIdentityJudgment,
  PredicateFiber,
  GeneratorKind,
  FiberGenerator,
  KnowledgeLeastValuationReceipt,
} from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";

export {
  commutate,
  presheaf,
  presheafFromValuation,
  sheafFromValuation,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/sheaf";
export type {
  PositPresheaf,
  PresheafTrace,
  SheafCarrier as ValuationSheaf,
  CommutationCarrier as CommutationResult,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/sheaf";

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
} from "@lenticule-science/metrologic/articulation/predicating/positing/dihedral-gauge";
export type {
  DihedralElementName,
  DihedralOrderEffectName,
  OrderSwapIsoJudgment,
  OrderSwapDualityReceipt,
  DihedralConjugationJudgment,
  DihedralSwapsOrdersJudgment,
  D4GaugeReceipt,
} from "@lenticule-science/metrologic/articulation/predicating/positing/dihedral-gauge";

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
} from "@lenticule-science/metrologic/articulation/predicating/positing/valuation-fiber-algebra";
export type {
  ValuationFiberCornerName,
  ModalCornerName,
  ValuationFiberCarrier,
  CrossOrderNucleusFinding,
  ValuationFiberAlgebraReceipt,
  ValuationQuartetDischargeReceipt,
  QuartetRecurrenceReceipt,
} from "@lenticule-science/metrologic/articulation/predicating/positing/valuation-fiber-algebra";

export {
  modalKripkeFrame,
  possibilize,
  necessitate,
  closureOp,
  twistSplit,
  modalKripkeReceipt,
  modalPairAdjunctionReceipt,
} from "./modal-kripke-four-valued.mts";
export type {
  KripkeFrameClass,
  KripkeValuation,
  ModalKripkeFrame,
  TwistSplit,
  ModalKripkeReceipt,
  ModalPairAdjunctionReceipt,
} from "./modal-kripke-four-valued.mts";

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
} from "@lenticule-science/metrologic/articulation/predicating/positing/closure-operator-fiber";
export type {
  ChargeClosureCarrier,
  ReindexMapCarrier,
  PointwiseClosureFamilyReceipt,
  CosettlingReceipt,
  ClosureMonadReceipt,
  Closure2MonadKzReceipt,
} from "@lenticule-science/metrologic/articulation/predicating/positing/closure-operator-fiber";

export { chargeOfSemanticJudgment, chargeOfSemanticJudgmentFiber } from "./judgment.mts";
export {
  semanticJudgment,
  semanticJudgmentWitnessed,
  semanticJudgmentAspectWitnessed,
  fiberAspectWitnessed,
  type SemanticJudgment,
  type SemanticJudgmentPolarity,
  type SemanticJudgmentShape,
} from "./judgment.mts";
export { semanticJudgmentSchema, semanticJudgmentContract } from "./judgment-schema.mts";
export * as logic from "./logic/index.mts";
