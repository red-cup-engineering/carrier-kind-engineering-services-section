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
 * `src/integrations/knowledge-vaults/src/codec` — it is a text-boundary codec,
 * not material law, and reading it requires reading a document, which core/
 * may not do.
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
} from "../../../values/index.mts";
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
} from "../../../values/index.mts";

export {
  memeSchema,
  meme,
  isMeme,
  allCells,
  predicateFiber,
  predicateFiberCellIdentity,
  predicationFiber,
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
} from "./fiber.mts";
export type {
  Meme,
  FiberAlgebra,
  Valuation,
  PredicationFiber,
  PositPresheafGenerators,
  OrderName,
  Order,
  PredicateFiberCell,
  PredicateFiberCellIdentityJudgment,
  PredicateFiber,
  GeneratorKind,
  FiberGenerator,
  KnowledgeLeastValuationReceipt,
} from "./fiber.mts";

export {
  commutate,
  presheaf,
  presheafFromValuation,
  sheafFromValuation,
} from "../../../fixpoint/sheaf.mts";
export type {
  PositPresheaf,
  PresheafTrace,
  ValuationSheaf,
  CommutationResult,
} from "../../../fixpoint/sheaf.mts";

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
} from "./dihedral-gauge.mts";
export type {
  DihedralElementName,
  DihedralOrderEffectName,
  OrderSwapIsoJudgment,
  OrderSwapDualityReceipt,
  DihedralConjugationJudgment,
  DihedralSwapsOrdersJudgment,
  D4GaugeReceipt,
} from "./dihedral-gauge.mts";

export {
  truthImplicationValue,
  valuationFiber,
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
} from "./valuation-fiber-algebra.mts";
export type {
  ValuationFiberCornerName,
  ModalCornerName,
  ValuationFiber,
  CrossOrderNucleusFinding,
  ValuationFiberAlgebraReceipt,
  ValuationQuartetDischargeReceipt,
  QuartetRecurrenceReceipt,
} from "./valuation-fiber-algebra.mts";

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
  chargeClosure,
  knowledgeJoinClosure,
  applyChargeClosure,
  iterateChargeOperation,
  settleStep,
  chargeOrbit,
  liftClosure,
  valuationKnowledgeJoin,
  valuationKnowledgeMeet,
  closureOrbit,
  reindexMap,
  reindexValuationFiber,
  pointwiseClosureFamilyReceipt,
  cosettlingReceipt,
  closureMonadReceipt,
  closure2MonadKzReceipt,
} from "./closure-operator-fiber.mts";
export type {
  ChargeClosure,
  ReindexMap,
  PointwiseClosureFamilyReceipt,
  CosettlingReceipt,
  ClosureMonadReceipt,
  Closure2MonadKzReceipt,
} from "./closure-operator-fiber.mts";

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
