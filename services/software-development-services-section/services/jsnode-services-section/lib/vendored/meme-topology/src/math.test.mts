import assert from "node:assert/strict";
import test from "node:test";

import {
  articulate,
  asChargeValue,
  cell,
  cellIdentity,
  chargeValue,
  chargeValueName,
  chargeValueIdentity,
  classifySettling,
  claim,
  cohere,
  commutate,
  conflateValue,
  fixedPointBoundName,
  fixedPointKnowledgeGap,
  fixedPointOrderName,
  fixedPoints,
  fixedPointTruthGap,
  induce,
  extend,
  sameMemeTopology,
  sectionOf,
  partitionSection,
  predicationsFor,
  subjectsFor,
  chargeAtValues,
  topologyVitals,
  dehydrateUtterances,
  rehydrateUtterances,
  isArticulationCarrier,
  joinKnowledgeValue,
  knowledgeGreatestFixedPoint,
  knowledgeLeastFixedPoint,
  knowledgeLeastMemeOfSingleUtterance,
  mark,
  negateValue,
  posit,
  predicate,
  predicationCarrier,
  predicationPredicateIdentity,
  predicationTermIdentity,
  presheaf,
  presheafFromValuation,
  readCharge,
  settleOneTraced,
  singleUtteranceTopology,
  specializationMorphism,
  token,
  truthGreatestFixedPoint,
  truthLeastFixedPoint,
  unrelatedPairs,
  utterance,
} from "./index.mjs";
import {
  witnessedPotential,
  charge,
  checkRelationTransform,
  dual,
  entitySet,
  firingPatternSelfDuality,
  idTransform,
  isCell,
  isCharge,
  isRelationCarrier,
  isRelationTransform,
  isSpecializationMorphism,
  knowledgeLeq,
  truthLeq,
  matrixEntryReading,
  pointProfile,
  predicateSet,
  relation,
  relationFromMatrix,
  relationMatrix,
  relationRead,
  stateExtension,
  stateProfile,
} from "@emsenn/meme-algebra";
import {
  classifyFiringOrbit,
  closeOrdinalProcess,
  closureProcess,
  closureStabilizationSearchHorizon,
  cohomology,
  cohomologyLaplacianOfCells,
  cohomologyOfCells,
  finiteOrdinal,
  finiteOrdinalJudgment,
  firingFirstCohomology,
  firingGenerator,
  firingGrade,
  firingGradeCohomology,
  firingGradeShadow,
  firingIndependence,
  firingSelfDuality,
  gradedGap,
  gradedGapSettlingFirstCohomologyRank,
  isLimitOrdinal,
  isSuccessorOrdinal,
  isZeroOrdinal,
  knowledgeClosureCells,
  knowledgeClosureSheaf,
  knowledgeClosureTrace,
  knowledgeValuationClosure,
  limitOrdinal,
  negateFiringGenerator,
  nonScottSettlingFirings,
  ordinalLabel,
  possibilizeKnowledge,
  predicationValuationClosureFiniteStageJudgment,
  settling,
  settlingClosureInvariant,
  settlingDepth,
  settlingDepthFiniteJudgment,
  settlingFiniteStageJudgment,
  settlingFirings,
  settlingFirstCohomology,
  settlingIncrements,
  settlingInitialStageInput,
  settlingInitialStageOrdinal,
  settlingLimitStageInput,
  settlingLimitStageOrdinal,
  settlingLimitStages,
  settlingSuccessorStageOrdinal,
  successorOrdinal,
  transportValuationAlongPredicationGenerators,
  uncountableSettlingCofinality,
  utteranceKnowledgeClosureCohomology,
  valuationConsistency,
  valuedFiringsFromSettling,
  zeroOrdinal,
} from "./dynamics.mjs";
import {
  composePredicateWords,
  derivationClosure,
  derivationIdentity,
  derivationValidity,
  derive,
  deriveInBase,
  inferenceMorphismIdentity,
  inferenceRules,
  predicateWordArrow,
  predicateWordResidue,
  theoryOfBase,
  typedTheoryProofCarrier,
  typing,
} from "@emsenn/meme-logic";
import {
  charPoly,
  determinant,
  divide,
  divides,
  equivalent,
  fromCount,
  fromInt,
  fromInteger,
  fromInts,
  fromNatural,
  fromRatio,
  gcd,
  intAdd,
  intCompare,
  intDivmod,
  integer,
  intEqual,
  intIsZero,
  intMultiply,
  intNegate,
  intOne,
  intSubtract,
  intZero,
  isNegative,
  isPositive,
  magnitude,
  matEqual,
  matmul,
  matTranspose,
  monus,
  natAdd,
  natCompare,
  natDivmod,
  natEqual,
  natIsZero,
  natLeq,
  natLess,
  natMultiply,
  natOne,
  natZero,
  predecessor,
  quotient,
  rank,
  ratAdd,
  ratCompare,
  ratEqual,
  ratFromInt,
  rational,
  ratIsZero,
  ratMultiply,
  ratNegate,
  ratOne,
  ratSign,
  ratSubtract,
  ratZero,
  reciprocal,
  sign,
  smithNormalForm,
  successor,
  toCount,
  toInt,
  toNumber,
} from "@emsenn/meme-algebra";
import {
  abelianize,
  charPolyOver,
  colimStructure,
  fixedPointClosure,
  inducedPermutation,
  iterateSubstitution,
  perronConvergent,
  primitiveMatrix,
  stepNInvariant,
  substitute,
  substitutionCarrier,
  substitutionDual,
  substitutionOrbit,
  substitutionRule,
  substitutionRuleEntry,
  substitutionRuleSelfDual,
  substitutionSymbol,
  transposeSubstitutionMatrix,
} from "./arithmetic.mjs";
import {
  aggregate,
  asExtension,
  chargeConsistency,
  claimCoincidence,
  closureOrbitOfProcess,
  closureSearchBlocks,
  compareKnowledge,
  consistentChargeValues,
  converse,
  converseInferenceMorphism,
  extensionOf,
  fiberFromAlgebra,
  isMember,
  isMeme,
  knowledgeOrder,
  lastValuation,
  linearFusionValue,
  linearMultiplicativeUnit,
  linearNegationValue,
  linearParValue,
  linearResiduumValue,
  markCoincidence,
  members,
  meme,
  objectProjection,
  potentialCarrier,
  predicateFiber,
  predicationBaseObjectCoincidence,
  predicationCellCoincidence,
  predicationPredicateCoincidence,
  predicationTermCoincidence,
  sameChargeValue,
  settlingStageOrdinalOfPredicationValuationClosureStage,
  specializationInferenceMorphism,
  stabilizingSup,
  subjectProjection,
  truthOrderResiduation,
} from "./internal.mjs";

const tm = (value: string) => token(mark(value));
const cl = (value: string) => claim(mark(value));
const cv = chargeValue;
const matrixToInts = (matrix: ReturnType<typeof fromInts>): readonly (readonly number[])[] =>
  Object.freeze(matrix.map((row) => Object.freeze(row.map(toInt))));
const predicationTermCoincidenceHoldsInTest = (
  left: Parameters<typeof predicationTermIdentity>[0],
  right: Parameters<typeof predicationTermIdentity>[1],
): boolean =>
  predicationTermIdentity(left, right).kind === "predication.termIdentity:witness";
const predicationPredicateCoincidenceHoldsInTest = (left: ReturnType<typeof cl>, right: ReturnType<typeof cl>): boolean =>
  predicationPredicateIdentity(left, right).kind === "predication.predicateIdentity:witness";
const wordMarks = (word: readonly ReturnType<typeof substitutionSymbol>[]): readonly unknown[] =>
  Object.freeze(word.map((symbol) => symbol.mark.value));

test("utterance articulation and coincidence are induced from marks", () => {
  const left = mark("socrates");
  const right = mark("mortal");
  const articulation = articulate(utterance(left, right));
  const predicated = predicate([articulation]);
  const predicatedCell = predicated.cells.cells[0]!;
  const coherent = cohere(predicated);
  const fiber = posit(predicated);
  const fixed = fixedPoints(presheaf(fiber));
  const assignment = fixed.knowledge.least.sheaf.section.fibers[0]!.assignments[0]!;

  assert.equal(articulation.kind, "utterance.articulation");
  assert.equal(isArticulationCarrier(articulation), true);
  assert.equal(assignment.cell.subject, articulation.polarization.positive);
  assert.equal(assignment.cell.predicate, articulation.polarization.negative);
  assert.equal(assignment.cell.object, articulation.polarization.positive);
  assert.equal(markCoincidence(left, mark("socrates")).kind, "carrier.coincidence.mark:witness");
  assert.equal(markCoincidence(left, right).kind, "carrier.coincidence.mark-obstruction");
  assert.equal(claimCoincidence(articulation.polarization.negative, claim(right)).kind, "carrier.coincidence.claim:witness");
  assert.equal(predicationTermCoincidence(assignment.cell.subject, predicatedCell.subject).kind, "carrier.coincidence.predicationTerm:witness");
  assert.equal(predicationPredicateCoincidence(assignment.cell.predicate, predicatedCell.predicate).kind, "carrier.coincidence.predicationPredicate:witness");
  assert.equal(predicationCellCoincidence(assignment.cell, predicatedCell).kind, "carrier.coincidence.predicationCell:witness");
  assert.equal(predicationBaseObjectCoincidence(assignment.cell.subject, predicatedCell.subject).kind, "carrier.coincidence.predicationBaseObject:witness");
  assert.equal(cellIdentity(assignment.cell, predicatedCell).kind, "predication.cellIdentity:witness");
  assert.equal(coherent.kind, "predication.coherence");
  assert.equal(coherent.saturated.kind, "predication.cellSet");
  assert.equal(coherent.residue.kind, "predication.carrier");
  assert.equal(isCell(assignment.cell), true);
  assert.equal(isMeme(assignment), true);
  assert.equal(assignment.charge.value[0].kind, "bilattice-charge.side");
  assert.equal(assignment.charge.value[0].name, "present");
  assert.equal(assignment.charge.value[1].kind, "bilattice-charge.side");
  assert.equal(assignment.charge.value[1].name, "absent");
});

test("knowledge closure fixed point stabilizes within a finite ordinal regime", () => {
  const fiber = posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))]));
  const fixed = fixedPoints(presheaf(fiber));

  assert.equal(fixed.knowledge.least.closure.kind, "ordinal.closure.carrier");
  assert.equal(fixed.knowledge.least.closure.search.kind, "ordinal.closure.stabilizationSearch:witness");
  if (fixed.knowledge.least.closure.search.kind === "ordinal.closure.stabilizationSearch:witness") {
    assert.equal(fixed.knowledge.least.closure.search.regime.kind, "ordinal.closure.regime.finite");
  }
  assert.equal(fixed.knowledge.least.closure.orbit[0]?.kind, "ordinal.closure.orbitPoint");
  assert.equal(fixed.knowledge.least.closure.stabilization.kind, "ordinal.closure.stabilization:witness");
  assert.equal(fixed.knowledge.least.fixedPoint.kind, "predication.valuation.fixedPoint:witness");
  if (fixed.knowledge.least.fixedPoint.kind === "predication.valuation.fixedPoint:witness") {
    assert.equal(fixed.knowledge.least.fixedPoint.stabilizationStage.kind, "predication.valuation.closure.stageOrdinal");
  }
  assert.equal(fixed.knowledge.greatest.closure.kind, "ordinal.closure.carrier");
  assert.equal(fixed.truth.least.closure.kind, "ordinal.closure.carrier");
  assert.equal(fixed.truth.greatest.closure.kind, "ordinal.closure.carrier");
});

test("predication valuation closure trace reads orbit stages and finite ordinals", () => {
  const fiber = posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))]));
  const traced = knowledgeClosureTrace(presheaf(fiber));
  const initialClosureStage = predicationValuationClosureFiniteStageJudgment(traced.orbit[0]!);
  const initialSettlingStageOrdinal = settlingStageOrdinalOfPredicationValuationClosureStage(traced.orbit[0]!);
  const fixedPointStage = predicationValuationClosureFiniteStageJudgment(traced.fixedPointStage);

  assert.equal(traced.kind, "predication.valuation.closure.trace");
  assert.equal(traced.closure.kind, "predication.valuation.closure.carrier");
  assert.equal(traced.closure.closure.kind, "ordinal.closure.carrier");
  assert.equal(traced.orbit[0]?.kind, "predication.valuation.closure.stage");
  assert.equal(traced.orbit[0]?.stageOrdinal.kind, "predication.valuation.closure.stageOrdinal");
  assert.equal(initialSettlingStageOrdinal.kind, "predication.settling.stageOrdinal");
  assert.equal(initialClosureStage.kind, "predication.valuation.closure.finiteStage:witness");
  if (initialClosureStage.kind === "predication.valuation.closure.finiteStage:witness") {
    assert.equal(natEqual(initialClosureStage.value, natZero), true);
  }
  assert.equal(traced.fixedPointStage.kind, "predication.valuation.closure.stage");
  assert.equal(traced.fixedPointStage.stageOrdinal.kind, "predication.valuation.closure.stageOrdinal");
  assert.equal(fixedPointStage.kind, "predication.valuation.closure.finiteStage:witness");
  if (fixedPointStage.kind === "predication.valuation.closure.finiteStage:witness") {
    assert.equal(fixedPointStage.value.kind, "exactNumber.natural");
  }
});

test("valuation consistency partitions assignments into consistent and contradictory", () => {
  const fiber = posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))]));
  const fixed = fixedPoints(presheaf(fiber));
  const consistency = valuationConsistency(fixed.knowledge.least.sheaf.section);
  const contradictionValuation = Object.freeze({
    ...fiber.valuation,
    fibers: Object.freeze(fiber.valuation.fibers.map((fiberAlgebra) => Object.freeze({
      ...fiberAlgebra,
      assignments: Object.freeze(fiberAlgebra.assignments.map((fiberAssignment) => meme(fiberAssignment.cell, charge(cv("stable"))))),
    }))),
  });
  const contradicted = valuationConsistency(contradictionValuation);

  assert.equal(consistency.kind, "predication.valuation.consistency.carrier");
  assert.equal(consistency.assignmentReadings.kind, "predication.valuation.consistency.readings");
  assert.equal(natEqual(consistency.assignmentReadings.rank, natOne), true);
  assert.equal(consistency.assignmentReadings.readings[0]?.kind, "predication.valuation.consistency.assignment:witness");
  assert.equal(consistency.consistentAssignments.kind, "predication.valuation.consistency.consistentAssignments");
  assert.equal(natEqual(consistency.consistentAssignments.rank, natOne), true);
  assert.equal(consistency.contradictoryAssignments.kind, "predication.valuation.consistency.contradictoryAssignments");
  assert.equal(natEqual(consistency.contradictoryAssignments.rank, natZero), true);
  assert.equal(consistency.vanishing.kind, "predication.valuation.consistency.vanishing:witness");
  assert.equal(natEqual(consistency.contradictionRank, natZero), true);
  assert.equal(consistency.consistentSubvaluation.kind, "predication.valuation.consistency.consistentSubvaluation");
  assert.equal(consistency.consistentSubvaluation.valuation.kind, "predication.fiber.valuation");
  assert.equal(consistency.contradictorySubvaluation.kind, "predication.valuation.consistency.contradictorySubvaluation");
  assert.equal(consistency.contradictorySubvaluation.valuation.kind, "predication.fiber.valuation");
  assert.equal(contradicted.kind, "predication.valuation.consistency.carrier");
  assert.equal(contradicted.assignmentReadings.readings[0]?.kind, "predication.valuation.consistency.assignmentContradiction:witness");
  assert.equal(natEqual(contradicted.consistentAssignments.rank, natZero), true);
  assert.equal(natEqual(contradicted.contradictoryAssignments.rank, natOne), true);
  assert.equal(contradicted.vanishing.kind, "predication.valuation.consistency.vanishing-obstruction");
  if (contradicted.vanishing.kind === "predication.valuation.consistency.vanishing-obstruction") {
    assert.equal(contradicted.vanishing.contradictions, contradicted.contradictoryAssignments);
  }
  assert.equal(natEqual(contradicted.contradictionRank, natOne), true);
  assert.equal(contradicted.contradictorySubvaluation.assignments, contradicted.contradictoryAssignments);
});

test("predication cohomology of fixed point sheaf reads H1 rank from cell incidence", () => {
  const fiber = posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))]));
  const fixed = fixedPoints(presheaf(fiber));
  const assignment = fixed.knowledge.least.sheaf.section.fibers[0]!.assignments[0]!;
  const h = cohomology(fixed.knowledge.least.sheaf);
  const hc = cohomologyOfCells([assignment.cell]);
  const hu = utteranceKnowledgeClosureCohomology(mark("socrates"), mark("mortal"));

  assert.equal(h.kind, "predication.cohomology.carrier");
  assert.equal(natEqual(h.firstCohomology.rank, natOne), true);
  assert.equal(h.zeroCoboundary.kind, "predication.cohomology.zeroCoboundaryMatrix");
  assert.equal(h.zeroCoboundary.matrix[0]?.[0]?.kind, "exactNumber.integer");
  assert.equal(h.zeroCohomology.kind, "predication.cohomology.zeroCohomology");
  assert.equal(h.firstCohomology.kind, "predication.cohomology.firstCohomology");
  assert.equal(hc.kind, "predication.cohomology.carrier");
  assert.equal(hu.kind, "predication.cohomology.carrier");
});

test("settling first cohomology reads from limit-stage designated cells", () => {
  const fiber = posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))]));
  const fixed = fixedPoints(presheaf(fiber));
  const assignment = fixed.knowledge.least.sheaf.section.fibers[0]!.assignments[0]!;
  const limitStage = settlingLimitStageOrdinal(ordinalLabel(mark("single-utterance-limit")), finiteOrdinal);
  const s = settlingFirstCohomology(settling([
    settlingInitialStageInput([]),
    settlingLimitStageInput(limitStage, [assignment.cell]),
  ]));

  assert.equal(s.kind, "predication.settling.firstCohomology");
  assert.equal(natEqual(s.rank, natOne), true);
});

test("predication cohomology Laplacian reads incidence ranks over exact matrices", () => {
  const a = tm("a");
  const b = tm("b");
  const c = tm("c");
  const p = cl("p");
  const path = cohomologyLaplacianOfCells([
    cell(a, p, b),
    cell(b, p, c),
  ]);
  const cycle = cohomologyLaplacianOfCells([
    cell(a, p, b),
    cell(b, p, c),
    cell(c, p, a),
  ]);

  assert.equal(path.kind, "predication.cohomology.laplacian");
  assert.equal(path.cohomology.zeroCoboundary.kind, "predication.cohomology.zeroCoboundaryMatrix");
  assert.equal(path.cohomology.zeroCohomology.kind, "predication.cohomology.zeroCohomology");
  assert.equal(path.cohomology.firstCohomology.kind, "predication.cohomology.firstCohomology");
  assert.equal(natEqual(path.cohomology.zeroCohomology.rank, natOne), true);
  assert.equal(natEqual(path.cohomology.firstCohomology.rank, natZero), true);
  assert.equal(path.cohomology.firstCohomology.vanishing.kind, "predication.cohomology.rankVanishing:witness");
  assert.equal(natEqual(path.incidenceRank, fromCount(2)), true);
  assert.equal(natEqual(path.laplacianRank, fromCount(2)), true);
  assert.equal(path.zeroCohomologyKernelRank.kind, "predication.cohomology.rankIdentity:witness");
  assert.equal(path.firstCohomologyCokernelRank.kind, "predication.cohomology.rankIdentity:witness");
  assert.deepEqual(path.entityLaplacian.map((row) => row.map(toInt)), [
    [1, -1, 0],
    [-1, 2, -1],
    [0, -1, 1],
  ]);

  assert.equal(natEqual(cycle.cohomology.zeroCohomology.rank, natOne), true);
  assert.equal(natEqual(cycle.cohomology.firstCohomology.rank, natOne), true);
  assert.equal(cycle.cohomology.firstCohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(natEqual(cycle.incidenceRank, fromCount(2)), true);
  assert.equal(natEqual(cycle.laplacianRank, fromCount(2)), true);
  assert.equal(cycle.zeroCohomologyKernelRank.kind, "predication.cohomology.rankIdentity:witness");
  assert.equal(cycle.firstCohomologyCokernelRank.kind, "predication.cohomology.rankIdentity:witness");
  assert.deepEqual(cycle.characteristicPolynomial.map(toInt), [0, 9, -6, 1]);
});

test("bilattice charge has the four-valued knowledge join", () => {
  assert.equal(sameChargeValue(joinKnowledgeValue(cv("absurd"), cv("potential")), cv("potential")), true);
  assert.equal(sameChargeValue(joinKnowledgeValue(cv("potential"), cv("active")), cv("stable")), true);
  assert.equal(sameChargeValue(asChargeValue("stable"), cv("stable")), true);
  assert.equal(compareKnowledge({ left: witnessedPotential("witness"), right: aggregate({ left: witnessedPotential("witness"), right: witnessedPotential("other") }) }).kind, "bilattice-charge.carrier");
  assert.equal(isCharge(witnessedPotential("witness")), true);
  assert.equal(sameChargeValue(negateValue(cv("potential")), cv("active")), true);
  assert.equal(sameChargeValue(conflateValue(cv("absurd")), cv("stable")), true);
  assert.equal(firingPatternSelfDuality([cv("stable"), cv("absurd")], "negation").kind, "bilattice-charge.firingPatternSelfDuality:witness");
  assert.equal(firingPatternSelfDuality([cv("potential")], "negation").kind, "bilattice-charge.firingPatternSelfDuality-obstruction");
});

test("bilattice linear logic carries fusion, residuum, and consistency readings", () => {
  assert.equal(sameChargeValue(linearMultiplicativeUnit(), cv("stable")), true);
  assert.equal(sameChargeValue(linearFusionValue(cv("potential"), cv("active")), cv("active")), true);
  assert.equal(sameChargeValue(linearResiduumValue(cv("potential"), cv("stable")), cv("active")), true);
  assert.equal(sameChargeValue(linearNegationValue(cv("potential")), cv("active")), true);
  assert.equal(sameChargeValue(linearParValue(cv("potential"), cv("active")), cv("potential")), true);
  assert.equal(chargeConsistency(cv("stable")).kind, "bilattice.linearLogic.chargeConsistency-obstruction");
  assert.deepEqual(consistentChargeValues().map(chargeValueName), ["absurd", "potential", "active"]);
  assert.equal(truthOrderResiduation(cv("potential"), cv("active"), cv("active")).kind, "bilattice.linearLogic.truthOrderResiduation:witness");
});

test("typed theory derives specialization judgments", () => {
  const socrates = tm("socrates");
  const human = tm("human");
  const theory = theoryOfBase(predicationCarrier([specializationMorphism(socrates, human)]).base);
  const derivability = derive(theory, human, socrates);
  const typed = typing(theory, human, socrates);
  const specializationIdentity = inferenceMorphismIdentity(specializationInferenceMorphism(), specializationInferenceMorphism());
  const specializationConverse = inferenceMorphismIdentity(specializationInferenceMorphism(), converseInferenceMorphism());

  assert.equal(derivability.kind, "typedTheory.derivationSearch:witness");
  if (derivability.kind !== "typedTheory.derivationSearch:witness") throw new TypeError("expected specialization derivation witness");
  assert.equal(derivability.derivation.steps[0]?.premise, human);
  assert.equal(derivability.derivation.steps[0]?.rule.trace.morphisms[0]?.kind, "typedTheory.inferenceMorphism.specialization");
  assert.equal(specializationIdentity.kind, "typedTheory.inferenceMorphismIdentity:witness");
  assert.equal(specializationConverse.kind, "typedTheory.inferenceMorphismIdentity-obstruction");
  assert.equal(derivability.derivation.premise, human);
  assert.equal(derivability.derivation.conclusion, socrates);
  assert.equal(natEqual(derivability.derivation.length, natOne), true);
  assert.equal(typed.kind, "typedTheory.typing:witness");
  assert.equal(isSpecializationMorphism(specializationMorphism(socrates, human)), true);
});

test("typed theory closes inference rules into checkable derivations", () => {
  const socrates = tm("socrates");
  const human = tm("human");
  const theory = theoryOfBase(predicationCarrier([specializationMorphism(socrates, human)]).base);
  const rules = inferenceRules([specializationMorphism(socrates, human)]);
  const derivability = derive(theory, human, socrates);
  const baseDerivability = deriveInBase(predicationCarrier([specializationMorphism(socrates, human)]).base, human, socrates);
  const typed = typing(theory, human, socrates);
  const proof = typedTheoryProofCarrier(theory);

  const closure = derivationClosure(theory);

  assert.equal(closure.generated.some((rule) => rule.codomain === socrates), true);
  assert.equal(natEqual(closure.generatedRank, fromCount(closure.generated.length)), true);
  assert.equal(natEqual(closure.residualRank, fromCount(closure.residual.length)), true);
  assert.equal(rules[0]?.trace.morphisms[0]?.kind, "typedTheory.inferenceMorphism.specialization");
  assert.equal(derivability.kind, "typedTheory.derivationSearch:witness");
  assert.equal(baseDerivability.kind, "typedTheory.derivationSearch:witness");
  if (derivability.kind !== "typedTheory.derivationSearch:witness") throw new TypeError("expected derivation witness");
  if (baseDerivability.kind !== "typedTheory.derivationSearch:witness") throw new TypeError("expected base derivation witness");
  assert.equal(derivability.derivation.steps[0]?.rule.trace.kind, "typedTheory.inferenceTrace");
  assert.equal(derivability.derivation.steps[0]?.rule.trace.morphisms[0]?.kind, "typedTheory.inferenceMorphism.specialization");
  assert.equal(baseDerivability.derivation.steps[0]?.rule.trace.morphisms[0]?.kind, "typedTheory.inferenceMorphism.specialization");
  assert.equal(derivationValidity(theory, derivability.derivation).kind, "typedTheory.derivationCheck:witness");
  assert.equal(typed.kind, "typedTheory.typing:witness");
  assert.equal(typed.derivation && derivationIdentity(typed.derivation, derivability.derivation).kind, "typedTheory.derivationIdentity:witness");
  assert.equal(proof.kind, "typedTheory.proof.carrier");
  assert.equal(proof.judgments[0]?.kind, "typedTheory.typing:witness");
  assert.equal(natEqual(proof.rank, fromCount(proof.judgments.length)), true);
  assert.equal(proof.obstructions.length, 0);
});

test("predicate words compose and expose composite residue", () => {
  const a = tm("a");
  const b = tm("b");
  const c = tm("c");
  const p = cl("p");
  const q = cl("q");
  const words = {
    kind: "typedTheory.predicateWord.carrier" as const,
    arrows: [
      predicateWordArrow(a, p, b),
      predicateWordArrow(b, q, c),
    ],
  };
  const saturated = composePredicateWords(words);
  const residue = predicateWordResidue({ arrows: words.arrows });

  assert.equal(saturated.arrows.length, 3);
  assert.equal(residue.atomic.arrows.length, 2);
  assert.deepEqual(residue.composites, [[p, q]]);
});

test("predication reads pairs still unrelated after specialization closure", () => {
  const a = tm("a");
  const b = tm("b");
  const c = tm("c");
  const d = tm("d");
  const p = cl("p");
  const q = cl("q");
  const predicated = predicationCarrier([
    cell(a, p, b),
    cell(c, q, d),
  ]);
  const unrelated = unrelatedPairs(predicated);

  assert.deepEqual(predicated.cells.cells.map((c) => [c.subject, c.predicate, c.object]), [[a, p, b], [c, q, d]]);
  assert.equal(predicated.cells.entities.kind, "predication.entitySet");
  assert.equal(unrelated.kind, "predication.unrelatedPairs");
  assert.ok(unrelated.edges.some((edge) => edge.domain === a && edge.codomain === c));
});

test("predication fiber positing preserves witnessed incidence instead of freely completing the product", () => {
  const a = tm("a");
  const b = tm("b");
  const p = cl("p");
  const predicated = predicationCarrier([
    cell(a, p, b),
  ]);
  const fiber = posit(predicated);
  const assignments = fiber.valuation.fibers[0]!.assignments;

  assert.equal(fiber.valuation.fibers[0]!.entities.kind, "predication.entitySet");
  assert.equal(assignments.length, 1);
  assert.deepEqual(assignments[0]!.cell, { subject: a, predicate: p, object: b });
});

test("predication fiber exposes projection morphisms with adjoint-style readings", () => {
  const a = tm("a");
  const b = tm("b");
  const related = cl("related");
  const entities = entitySet([a, b], predicationTermCoincidenceHoldsInTest);
  const f = predicateFiber(related, entities, (subject, object) =>
    predicationTermCoincidenceHoldsInTest(subject, a) && predicationTermCoincidenceHoldsInTest(object, b) ? cv("potential") : cv("absurd"),
  );
  const subjectExists = subjectProjection(entities).exists(knowledgeOrder(), f);
  const objectExists = objectProjection(entities).exists(knowledgeOrder(), f);

  assert.equal(sameChargeValue(subjectExists.at(a, a), cv("potential")), true);
  assert.equal(sameChargeValue(objectExists.at(b, b), cv("potential")), true);
});

test("bilattice relation carries four-valued relations and adjoint morphisms", () => {
  const p = tm("p");
  const s = cl("s");
  const points = entitySet([p], predicationTermCoincidenceHoldsInTest);
  const states = predicateSet([s], predicationPredicateCoincidenceHoldsInTest);
  const r = relation(points, states, (point, state) => relationRead(point, state, cv("potential")), { absent: cv("absurd"), samePoint: predicationTermCoincidenceHoldsInTest, sameState: predicationPredicateCoincidenceHoldsInTest });
  const matrixCarrier = relationMatrix(points, states, [[p, s, cv("stable")]], { samePoint: predicationTermCoincidenceHoldsInTest, sameState: predicationPredicateCoincidenceHoldsInTest });
  const matrix = relationFromMatrix(matrixCarrier, { absent: cv("absurd") });
  const pProfile = pointProfile(r, p);
  const sProfile = stateProfile(r, s);
  const extension = stateExtension(r, s);
  const id = idTransform(r);
  const d = dual(r);
  const witnessed = checkRelationTransform(r, r, (point) => point, (state) => state);
  const obstructed = checkRelationTransform(r, matrix, (point) => point, (state) => state);

  assert.equal(sameChargeValue(r.at(p, s), cv("potential")), true);
  assert.equal(r.read(p, s).kind, "bilattice.relation.read:witness");
  assert.equal(isRelationCarrier(r), true);
  assert.equal(r.points.kind, "predication.entitySet");
  assert.equal(r.states.kind, "predication.predicateSet");
  assert.equal(matrixCarrier.values[0]?.kind, "bilattice.relation.matrixEntry");
  assert.equal(natEqual(matrixCarrier.rank, natOne), true);
  assert.equal(matrixEntryReading(matrixCarrier, p, s).kind, "bilattice.relation.matrixEntry:witness");
  assert.equal(isRelationTransform(id), true);
  assert.equal(witnessed.kind, "bilattice.relation.transform:witness");
  assert.equal(obstructed.kind, "bilattice.relation.transform-obstruction");
  if (obstructed.kind === "bilattice.relation.transform-obstruction") {
    assert.equal(natEqual(obstructed.rank, natOne), true);
  }
  assert.equal(sameChargeValue(matrix.at(p, s), cv("stable")), true);
  assert.equal(pProfile.kind, "bilattice.relation.pointProfile");
  assert.equal(pProfile.entries[0]?.kind, "bilattice.relation.pointProfileEntry");
  assert.equal(sameChargeValue(pProfile.entries[0]!.value, cv("potential")), true);
  assert.equal(natEqual(pProfile.rank, natOne), true);
  assert.equal(sProfile.kind, "bilattice.relation.stateProfile");
  assert.equal(sProfile.entries[0]?.kind, "bilattice.relation.stateProfileEntry");
  assert.equal(extension.kind, "bilattice.relation.stateExtension");
  assert.equal(extension.points.entities[0], p);
  assert.equal(id.forward(p), p);
  assert.equal(sameChargeValue(d.at(s, p), cv("active")), true);
});

test("predication firing grade and cohomology module read from bilattice charge values", () => {
  const stageZero = settlingInitialStageOrdinal();
  const stageOne = settlingSuccessorStageOrdinal(stageZero);
  const stageTwo = settlingSuccessorStageOrdinal(stageOne);
  const grade = firingGrade(cv("stable"));
  const firingH = firingFirstCohomology([{ stage: stageOne, value: cv("stable") }]);
  const cohom = firingGradeCohomology([cv("potential"), cv("active")]);
  const shadow = firingGradeShadow([{ stage: stageOne, value: cv("stable") }]);
  const negated = negateFiringGenerator(firingGenerator(cv("potential")));

  assert.equal(grade.firingType.kind, "predication.firing.type.stable");
  assert.equal(grade.consistency.kind, "predication.firing.singletonPairConsistency-obstruction");
  assert.equal(firingH.generators[0]?.generator.consistency.kind, "predication.firing.coneConsistency-obstruction");
  assert.equal(firingH.generators[0]?.generator.firingType.kind, "predication.firing.type.stable");
  assert.equal(firingH.generators[0]?.generator.totality.kind, "predication.firing.totality.carrier");
  assert.equal(natEqual(firingH.rank, natOne), true);
  assert.equal(firingH.module.kind, "predication.firing.cohomologyModule");
  assert.equal(firingH.generators[0]?.kind, "predication.firing.cohomologyGenerator");
  assert.equal(natEqual(firingH.lPlus, natOne), true);
  assert.equal(natEqual(firingH.lMinus, natOne), true);
  assert.equal(cohom.shadow.truthSide.kind, "predication.firing.sideModule");
  assert.equal(cohom.shadow.truthSide.side.kind, "predication.firing.cohomologySide.truth");
  assert.equal(natEqual(cohom.shadow.truthSide.rank, natOne), true);
  assert.equal(cohom.shadow.falsitySide.side.kind, "predication.firing.cohomologySide.falsity");
  assert.equal(natEqual(cohom.shadow.falsitySide.rank, natOne), true);
  assert.equal(cohom.firingMultiplicities.kind, "predication.firing.typeMultiplicity");
  assert.equal(natEqual(cohom.firingMultiplicities.truthOnly, natOne), true);
  assert.equal(natEqual(cohom.firingMultiplicities.falsityOnly, natOne), true);
  assert.equal(cohom.abelianRankComparison.kind, "predication.cohomology.rankComparison.same");
  assert.equal(cohom.shadowRankIdentity.kind, "predication.cohomology.rankIdentity:witness");
  assert.equal(shadow.kind, "predication.firing.cohomologyShadow");
  assert.equal(shadow.truthSide.side.kind, "predication.firing.cohomologySide.truth");
  assert.equal(natEqual(shadow.truthSide.rank, natOne), true);
  assert.equal(sameChargeValue(negated.value, cv("active")), true);
  assert.equal(firingIndependence([{ stage: stageOne, value: cv("stable") }, { stage: stageTwo, value: cv("absurd") }]).kind, "predication.firing.independence:witness");
  assert.equal(firingIndependence([{ stage: stageOne, value: cv("stable") }, { stage: stageOne, value: cv("absurd") }]).kind, "predication.firing.independence-obstruction");
});

test("settling carrier with non-Scott limit stage reads stage shapes and increments", () => {
  const xCell = cell(tm("x"), cl("fires"), tm("x"));
  const nonScottLimit = settlingLimitStageOrdinal(ordinalLabel(mark("firing-limit")), finiteOrdinal);
  const carrier = settling([settlingInitialStageInput([]), settlingLimitStageInput(nonScottLimit, [xCell])]);
  const uncountablyCofinalCarrier = settling(
    [settlingInitialStageInput([]), settlingLimitStageInput(nonScottLimit, [xCell])],
    uncountableSettlingCofinality(),
  );
  const valued = valuedFiringsFromSettling(carrier, [cv("stable")]);
  const valuedStage = settlingFiniteStageJudgment(valued[0]!.stage);
  const depth = settlingDepthFiniteJudgment(carrier);
  const settlingSteps = settlingIncrements(carrier);
  const allFirings = settlingFirings(carrier);
  const limitStages = settlingLimitStages(carrier);
  const nonScottFirings = nonScottSettlingFirings(carrier);

  assert.equal(valued[0]!.stage.kind, "predication.settling.stageOrdinal");
  assert.equal(valuedStage.kind, "predication.settling.finiteStage-obstruction");
  if (valuedStage.kind === "predication.settling.finiteStage-obstruction") {
    assert.equal(valuedStage.reading.kind, "ordinal.closure.finiteOrdinal-obstruction");
  }
  assert.equal(sameChargeValue(valued[0]!.value, cv("stable")), true);
  assert.equal(carrier.stages[0]?.kind, "predication.settling.stage");
  assert.equal(carrier.cofinality.kind, "predication.settling.cofinality.countable");
  assert.equal(uncountablyCofinalCarrier.cofinality.kind, "predication.settling.cofinality.uncountable");
  assert.equal(carrier.stages[0]?.shape.kind, "predication.settling.stage.initial");
  assert.equal(carrier.stages[0]?.shape.ordinal, carrier.stages[0]?.ordinal);
  assert.equal(carrier.stages[0]?.ordinal.kind, "predication.settling.stageOrdinal");
  assert.equal(carrier.stages[1]?.shape.kind, "predication.settling.stage.limit");
  assert.equal(carrier.stages[1]?.ordinal, nonScottLimit);
  assert.equal(carrier.stages[1]?.shape.ordinal, carrier.stages[1]?.ordinal);
  assert.equal(carrier.stages[1]?.designated.kind, "predication.cellSet");
  assert.equal(settlingSteps[1]?.kind, "predication.settling.increment");
  assert.equal(settlingSteps[1]?.added.kind, "predication.cellSet");
  assert.equal(allFirings[0]?.source.shape.kind, "predication.settling.stage.limit");
  assert.equal(limitStages.kind, "predication.settling.limitStages");
  assert.equal(natEqual(limitStages.rank, natOne), true);
  assert.equal(limitStages.stages[0]?.shape.kind, "predication.settling.stage.limit");
  assert.equal(nonScottFirings.kind, "predication.settling.nonScottFirings");
  assert.equal(natEqual(nonScottFirings.rank, natOne), true);
  assert.equal(nonScottFirings.firings[0]?.source.shape.kind, "predication.settling.stage.limit");
  assert.equal(settlingDepth(carrier).kind, "predication.settling.stageOrdinal");
  assert.equal(depth.kind, "predication.settling.finiteStage-obstruction");
  if (depth.kind === "predication.settling.finiteStage-obstruction") {
    assert.equal(depth.reading.kind, "ordinal.closure.finiteOrdinal-obstruction");
  }
});

test("settling classification reads regime, cofinality, and gap from non-Scott carrier", () => {
  const xCell = cell(tm("x"), cl("fires"), tm("x"));
  const nonScottLimit = settlingLimitStageOrdinal(ordinalLabel(mark("firing-limit")), finiteOrdinal);
  const carrier = settling([settlingInitialStageInput([]), settlingLimitStageInput(nonScottLimit, [xCell])]);
  const uncountablyCofinalCarrier = settling(
    [settlingInitialStageInput([]), settlingLimitStageInput(nonScottLimit, [xCell])],
    uncountableSettlingCofinality(),
  );
  const classification = classifySettling(carrier);
  const uncountablyCofinalClassification = classifySettling(uncountablyCofinalCarrier);
  const invariant = settlingClosureInvariant(carrier);
  const gap = gradedGap(carrier);
  const selfDual = firingSelfDuality([cv("stable"), cv("absurd")]);
  const exchange = classifyFiringOrbit([cv("potential"), cv("active")]);

  assert.equal(selfDual.coherence.kind, "predication.firing.selfDualityCoherence:witness");
  assert.equal(exchange.orbitType.kind, "predication.firing.orbitType.exchangeMixed");
  assert.equal(exchange.duality.kind, "predication.firing.orbitDuality-obstruction");
  if (exchange.duality.kind === "predication.firing.orbitDuality-obstruction") {
    assert.equal(exchange.duality.orbitType.kind, "predication.firing.orbitType.exchangeMixed");
  }
  assert.equal(exchange.firingMultiplicities.kind, "predication.firing.typeMultiplicity");
  assert.equal(exchange.cardinality.kind, "predication.firing.orbitCardinality.pair");
  assert.equal(gradedGapSettlingFirstCohomologyRank(carrier).kind, "predication.cohomology.rankIdentity:witness");
  assert.equal(natEqual(settlingFirstCohomology(carrier).rank, natOne), true);
  assert.equal(settlingFirstCohomology(carrier).vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(settlingFirstCohomology(carrier).generators[0]?.kind, "predication.settling.firstCohomologyGenerator");
  assert.equal(invariant.kind, "predication.settling.closureInvariant");
  assert.equal(invariant.nonScottAdditions[0]?.kind, "predication.settling.closureInvariantStep");
  assert.equal(invariant.nonScottAdditions[0]?.additions.cells[0], xCell);
  assert.equal(gap.lost[0]?.kind, "predication.settling.gradedGapLoss");
  assert.equal(gap.lost[0]?.cell, xCell);
  assert.equal(classification.regime.kind, "ordinal.closure.regime.transfinite");
  assert.equal(classification.cofinality, carrier.cofinality);
  assert.equal(classification.limitStages.kind, "predication.settling.limitStages");
  assert.equal(classification.nonScottFirings.kind, "predication.settling.nonScottFirings");
  assert.equal(uncountablyCofinalClassification.regime.kind, "ordinal.closure.regime.aperiodic");
});

test("predication valuation sheaf closure is induced by its ordinal process carrier", () => {
  const fiber = posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))]));
  const valuationClosure = knowledgeValuationClosure(presheaf(fiber));
  const process = valuationClosure.process.ordinalProcess;
  const closed = valuationClosure.closure;
  const nonStabilizingProcess = closureProcess({
    bottom: natZero,
    leq: natLeq,
    join: (left, right) => natLeq(left, right) ? right : left,
    eq: natEqual,
    sup: () => natZero,
  }, successor, closureStabilizationSearchHorizon(fromCount(2), natOne));
  const nonStabilizing = closeOrdinalProcess(nonStabilizingProcess);
  const searchBlocks = closureSearchBlocks(nonStabilizingProcess.horizon);
  const iter = closureOrbitOfProcess(process);
  const sup = stabilizingSup(process.lattice)((n) => natLess(n, fromCount(2)) ? process.lattice.bottom : process.endomorphism(process.lattice.bottom));
  const finiteOne = successorOrdinal(zeroOrdinal());
  const omega = limitOrdinal(ordinalLabel(mark("omega-test")), (n) => natIsZero(n) ? zeroOrdinal() : successorOrdinal(zeroOrdinal()));
  const finiteOneReading = finiteOrdinalJudgment(finiteOne);
  const omegaReading = finiteOrdinalJudgment(omega);

  assert.equal(valuationClosure.kind, "predication.valuation.closure.carrier");
  assert.equal(valuationClosure.process.kind, "predication.valuation.closure.process");
  assert.equal(valuationClosure.process.order.kind, "predication.valuation.closure.order");
  assert.equal(valuationClosure.process.order.name, "knowledge");
  assert.equal(process.kind, "ordinal.closure.process");
  assert.equal(closed.process, valuationClosure.process.ordinalProcess);
  assert.equal(closed.process.horizon.kind, "ordinal.closure.stabilizationSearchHorizon");
  assert.equal(closed.search.kind, "ordinal.closure.stabilizationSearch:witness");
  if (closed.search.kind === "ordinal.closure.stabilizationSearch:witness") {
    assert.equal(closed.search.regime.kind, "ordinal.closure.regime.finite");
    assert.equal(closed.search.stabilization.kind, "ordinal.closure.stabilization:witness");
  }
  assert.equal(closed.value.kind, "predication.fiber.valuation");
  assert.equal(nonStabilizing.process, nonStabilizingProcess);
  assert.equal(searchBlocks[0]?.kind, "ordinal.closure.searchBlock");
  assert.equal(natEqual(searchBlocks[0]!.finiteStages, fromCount(2)), true);
  assert.equal(searchBlocks[1]?.base.kind, "ordinal.closure.ordinal.limit");
  assert.equal(nonStabilizing.search.kind, "ordinal.closure.stabilizationSearch-obstruction");
  assert.equal(nonStabilizing.stabilization.kind, "ordinal.closure.stabilization-obstruction");
  if (nonStabilizing.search.kind === "ordinal.closure.stabilizationSearch-obstruction") {
    // Exhaustion carries no regime claim — only how far the search reached.
    assert.equal(nonStabilizing.search.searchedThrough.kind, "ordinal.closure.ordinal.limit");
    assert.equal(nonStabilizing.search.stabilization.kind, "ordinal.closure.stabilization-obstruction");
  }
  assert.equal(iter.next().value?.value.kind, "predication.fiber.valuation");
  const second = iter.next().value;
  const secondStage = finiteOrdinalJudgment(second!.stage);
  assert.equal(second?.value.kind, "predication.fiber.valuation");
  assert.equal(secondStage.kind, "ordinal.closure.finiteOrdinal:witness");
  if (secondStage.kind === "ordinal.closure.finiteOrdinal:witness") {
    assert.equal(natEqual(secondStage.value, natOne), true);
  }
  assert.equal(sup.kind, "predication.fiber.valuation");
  assert.equal(process.endomorphism(process.lattice.bottom).kind, "predication.fiber.valuation");
  assert.equal(valuationClosure.sheaf.section.kind, "predication.fiber.valuation");
  assert.equal(finiteOrdinal(natOne).kind, "ordinal.closure.ordinal.successor");
  assert.equal(isZeroOrdinal(zeroOrdinal()), true);
  assert.equal(isSuccessorOrdinal(finiteOne), true);
  assert.equal(isLimitOrdinal(omega), true);
  assert.equal(omega.label.kind, "ordinal.closure.ordinalLabel");
  assert.equal(finiteOneReading.kind, "ordinal.closure.finiteOrdinal:witness");
  if (finiteOneReading.kind === "ordinal.closure.finiteOrdinal:witness") {
    assert.equal(natEqual(finiteOneReading.value, natOne), true);
  }
  assert.equal(omegaReading.kind, "ordinal.closure.finiteOrdinal-obstruction");
});

test("predication valuation sheaf closure transports valuations through base morphisms", () => {
  const a = tm("a");
  const b = tm("b");
  const pValue = cl("p");
  const predicated = predicationCarrier([cell(a, pValue, b)]);
  const p = presheaf(posit(predicated));
  const transported = transportValuationAlongPredicationGenerators(p.traces[0]!);
  const fixed = knowledgeClosureSheaf(p).section;
  const hasCell = (subject: typeof a, predicateValue: typeof pValue, object: typeof a): boolean =>
    fixed.fibers.some((fiber) => fiber.assignments.some((assignment) =>
      assignment.cell.subject === subject
      && assignment.cell.predicate === predicateValue
      && assignment.cell.object === object));

  // Generators act as C-natural derived views (f* ∘ cl_P = cl_{P^c} ∘ f*),
  // never by materializing unwitnessed cells into the source fiber: the fixed
  // point holds exactly the given cell, and the converse reading is the
  // pullback view along the generator.
  assert.equal(transported.fibers[0]!.assignments.length, 1);
  assert.equal(hasCell(a, pValue, b), true);
  assert.equal(hasCell(b, pValue, a), false);
  assert.equal(hasCell(a, pValue, a), false);
  assert.equal(hasCell(b, pValue, b), false);
  const sectionFiber = fixed.fibers[0]!;
  const sourceView = fiberFromAlgebra(sectionFiber);
  const converseView = converse(sectionFiber.entities).pullback(sourceView);
  assert.equal(sourceView.at(a, b).name, "potential");
  assert.equal(sourceView.at(b, a).name, "absurd");
  assert.equal(converseView.at(b, a).name, "potential");
  assert.equal(converseView.at(a, b).name, "absurd");
});

test("predication valuation sheaf closure transports specialization chains to their transitive morphism", () => {
  const socrates = tm("socrates");
  const human = tm("human");
  const animal = tm("animal");
  const p = presheaf(posit(predicationCarrier([
    specializationMorphism(socrates, human),
    specializationMorphism(human, animal),
  ])));
  const settled = knowledgeClosureSheaf(p).section.base;
  const hasSpecialization = settled.specialization.some((morphism) =>
    morphism.domain === animal
    && morphism.codomain === socrates);

  assert.equal(hasSpecialization, true);
});

test("presheaf commutation and possibilization append traces to valuation sequence", () => {
  const fiber = posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))]));
  const p = presheaf(fiber);
  const commuted = commutate(p);
  const stepped = possibilizeKnowledge(p);
  const rewrapped = presheafFromValuation(fixedPoints(p).knowledge.least.sheaf.section);

  assert.equal(commuted.kind, "predication.valuation.sheaf.commutation");
  assert.equal(commuted.saturated.kind, "predication.valuation.sheaf.presheaf");
  assert.equal(commuted.residue.length, 1);
  assert.equal(stepped.traces.length, 2);
  assert.equal(lastValuation(stepped).kind, "predication.fiber.valuation");
  assert.equal(rewrapped.kind, "predication.valuation.sheaf.presheaf");
});

test("fixed point order and bound objects carry named order and bound references", () => {
  const p = presheaf(posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))])));
  const fixed = fixedPoints(p);

  assert.equal(fixed.knowledge.kind, "predication.valuation.fixedPoint.order");
  assert.equal(fixed.knowledge.order.kind, "predication.valuation.fixedPoint.orderObject");
  assert.equal(fixed.knowledge.order.valuationClosureOrder.kind, "predication.valuation.closure.order");
  assert.equal(fixedPointOrderName(fixed.knowledge.order), "knowledge");
  assert.equal(fixed.knowledge.least.kind, "predication.valuation.fixedPoint.extremum");
  assert.equal(fixed.knowledge.least.seed.kind, "predication.valuation.fixedPoint.seed");
  assert.equal(fixed.knowledge.least.order, fixed.knowledge.order);
  assert.equal(fixed.knowledge.least.seed.order, fixed.knowledge.order);
  assert.equal(fixed.knowledge.least.bound.kind, "predication.valuation.fixedPoint.boundObject");
  assert.equal(fixed.knowledge.least.seed.bound, fixed.knowledge.least.bound);
  assert.equal(fixedPointBoundName(fixed.knowledge.least.bound), "least");
  assert.equal(fixed.knowledge.greatest.seed.kind, "predication.valuation.fixedPoint.seed");
  assert.equal(fixed.knowledge.greatest.order, fixed.knowledge.order);
  assert.equal(fixed.knowledge.greatest.seed.order, fixed.knowledge.order);
  assert.equal(fixed.knowledge.greatest.seed.bound, fixed.knowledge.greatest.bound);
  assert.equal(fixedPointBoundName(fixed.knowledge.greatest.bound), "greatest");
  assert.equal(fixedPointBoundName(fixed.truth.greatest.bound), "greatest");
  assert.equal(fixed.truth.greatest.seed.kind, "predication.valuation.fixedPoint.seed");
  assert.equal(fixed.truth.greatest.order, fixed.truth.order);
  assert.equal(fixed.truth.greatest.seed.order, fixed.truth.order);
  assert.equal(fixedPointOrderName(fixed.truth.greatest.seed.order), "truth");
  assert.deepEqual(knowledgeLeastFixedPoint(p).sheaf.section, fixed.knowledge.least.sheaf.section);
  assert.deepEqual(knowledgeGreatestFixedPoint(p).sheaf.section, fixed.knowledge.greatest.sheaf.section);
  assert.deepEqual(truthLeastFixedPoint(p).sheaf.section, fixed.truth.least.sheaf.section);
  assert.deepEqual(truthGreatestFixedPoint(p).sheaf.section, fixed.truth.greatest.sheaf.section);
  assert.deepEqual(fixed.knowledge.least.closure.value, fixed.knowledge.least.sheaf.section);
  assert.equal(fixed.knowledge.least.fixedPoint.kind, "predication.valuation.fixedPoint:witness");
  assert.equal(fixed.knowledge.least.fixedPoint.order, fixed.knowledge.order);
  assert.equal(fixed.knowledge.least.fixedPoint.bound, fixed.knowledge.least.bound);
  assert.deepEqual(fixed.knowledge.greatest.closure.value, fixed.knowledge.greatest.sheaf.section);
  assert.deepEqual(fixed.truth.least.closure.value, fixed.truth.least.sheaf.section);
  assert.deepEqual(fixed.truth.greatest.closure.value, fixed.truth.greatest.sheaf.section);
});

test("fixed point gap carrier reads cell openings, closures, and obstructions", () => {
  const p = presheaf(posit(predicate([articulate(utterance(mark("socrates"), mark("mortal")))])));
  const fixed = fixedPoints(p);
  const knowledgeInterval = fixedPointKnowledgeGap(p);
  const truthInterval = fixedPointTruthGap(p);
  const relationCells = knowledgeClosureCells(p);

  assert.equal(fixed.knowledgeGap.kind, "predication.valuation.fixedPoint.gap.carrier");
  assert.equal(fixed.knowledgeGap.order, fixed.knowledge.order);
  assert.equal(fixed.knowledgeGap.fixedPointOrder, fixed.knowledge);
  assert.equal(fixed.knowledgeGap.least, fixed.knowledge.least);
  assert.equal(fixed.knowledgeGap.greatest, fixed.knowledge.greatest);
  assert.equal(fixed.truthGap.kind, "predication.valuation.fixedPoint.gap.carrier");
  assert.equal(fixed.truthGap.order, fixed.truth.order);
  assert.equal(fixed.truthGap.fixedPointOrder, fixed.truth);
  assert.equal(knowledgeInterval.kind, "predication.valuation.fixedPoint.gap.carrier");
  assert.equal(knowledgeInterval.cellReadings.kind, "predication.valuation.fixedPoint.gap.cellReadings");
  assert.equal(natEqual(knowledgeInterval.cellReadings.rank, natOne), true);
  assert.equal(knowledgeInterval.cellReadings.readings[0]?.kind, "predication.valuation.fixedPoint.gap.cellOpening-obstruction");
  assert.equal(knowledgeInterval.closures.kind, "predication.valuation.fixedPoint.gap.cellClosures");
  assert.equal(natEqual(knowledgeInterval.closures.rank, natZero), true);
  assert.equal(knowledgeInterval.openings.kind, "predication.valuation.fixedPoint.gap.cellOpenings");
  assert.equal(natEqual(knowledgeInterval.openings.rank, natOne), true);
  assert.equal(knowledgeInterval.openings.readings[0]?.kind, "predication.valuation.fixedPoint.gap.cellOpening-obstruction");
  assert.equal(knowledgeInterval.missingGreatest.kind, "predication.valuation.fixedPoint.gap.missingGreatestCells");
  assert.equal(natEqual(knowledgeInterval.missingGreatest.rank, natZero), true);
  assert.equal(knowledgeInterval.obstructions.kind, "predication.valuation.fixedPoint.gap.cellObstructions");
  assert.equal(knowledgeInterval.obstructions.openings, knowledgeInterval.openings);
  assert.equal(knowledgeInterval.obstructions.missingGreatest, knowledgeInterval.missingGreatest);
  assert.equal(knowledgeInterval.obstructions.readings[0]?.kind, "predication.valuation.fixedPoint.gap.cellOpening-obstruction");
  assert.equal(knowledgeInterval.vanishing.kind, "predication.valuation.fixedPoint.gap.vanishing-obstruction");
  if (knowledgeInterval.vanishing.kind === "predication.valuation.fixedPoint.gap.vanishing-obstruction") {
    assert.equal(knowledgeInterval.vanishing.obstructions, knowledgeInterval.obstructions);
  }
  assert.equal(truthInterval.kind, "predication.valuation.fixedPoint.gap.carrier");
  assert.equal(fixedPointOrderName(truthInterval.order), "truth");
  assert.equal(relationCells.length, 1);
});

test("substitution dynamics carries word morphisms, closure, and gauge duality", () => {
  const a = substitutionSymbol(mark("a"));
  const b = substitutionSymbol(mark("b"));
  const rule = substitutionRule([
    substitutionRuleEntry(a, [a, b]),
    substitutionRuleEntry(b, [a]),
  ]);
  const seed = Object.freeze([a]);
  const carrier = substitutionCarrier(rule, [a, b]);
  const orbit = substitutionOrbit(rule, seed);
  const closure = fixedPointClosure(rule, seed);
  const matrix = abelianize(rule, carrier.alphabet);
  const permutation = inducedPermutation([cv("potential"), cv("active")], "negation");
  const duality = substitutionRuleSelfDual(fromInts([[0, 1], [1, 0]]), [cv("potential"), cv("active")], "negation");
  const integerMatrix = fromInts([[1, 1], [1, 0]]);
  const colim = colimStructure(integerMatrix);
  const substitutionSheafDual = substitutionDual(integerMatrix);

  assert.equal(carrier.kind, "substitution.dynamics.carrier");
  assert.deepEqual(wordMarks(substitute(rule, seed)), ["a", "b"]);
  assert.deepEqual(wordMarks(iterateSubstitution(rule, seed, fromCount(2))), ["a", "b", "a"]);
  assert.deepEqual(wordMarks(orbit.next().value!), ["a"]);
  assert.deepEqual(wordMarks(orbit.next().value!), ["a", "b"]);
  assert.deepEqual(wordMarks(closure.phi(closure.lattice.bottom) as readonly ReturnType<typeof substitutionSymbol>[]), ["a", "b"]);
  assert.deepEqual(matrixToInts(matrix), [[1, 1], [1, 0]]);
  assert.deepEqual(matrixToInts(transposeSubstitutionMatrix(matrix)), [[1, 1], [1, 0]]);
  assert.equal(permutation.kind, "substitution.dynamics.gaugePermutation:witness");
  if (permutation.kind === "substitution.dynamics.gaugePermutation:witness") {
    assert.equal(permutation.labeling.kind, "substitution.dynamics.gaugeLabeling");
    assert.equal(permutation.image.kind, "substitution.dynamics.gaugeImage");
    assert.deepEqual(matrixToInts(permutation.matrix), [[0, 1], [1, 0]]);
    assert.equal(natEqual(permutation.labeling.rank, fromCount(2)), true);
  }
  assert.equal(duality.kind, "substitution.dynamics.selfDuality:witness");
  if (duality.kind === "substitution.dynamics.selfDuality:witness") {
    assert.equal(duality.permutation.kind, "substitution.dynamics.gaugePermutation:witness");
    assert.equal(duality.commutation.kind, "substitution.dynamics.matrixEquation:witness");
    assert.equal(duality.gaugeInvolution.kind, "substitution.dynamics.matrixEquation:witness");
  }
  const blockedPermutation = inducedPermutation([cv("potential")], "negation");
  assert.equal(blockedPermutation.kind, "substitution.dynamics.gaugePermutation-obstruction");
  if (blockedPermutation.kind === "substitution.dynamics.gaugePermutation-obstruction") {
    assert.equal(blockedPermutation.missing[0]?.kind, "substitution.dynamics.gaugePermutationMissingValue");
    assert.equal(blockedPermutation.escaping[0]?.kind, "substitution.dynamics.gaugePermutationEscapingValue");
    assert.equal(natEqual(blockedPermutation.rank, fromCount(2)), true);
  }
  const blockedDuality = substitutionRuleSelfDual(fromInts([[1]]), [cv("potential")], "negation");
  assert.equal(blockedDuality.kind, "substitution.dynamics.selfDuality-obstruction");
  assert.deepEqual(charPolyOver(integerMatrix).map(toInt), [-1, -1, 1]);
  assert.equal(primitiveMatrix(integerMatrix).kind, "substitution.dynamics.primitiveMatrix:witness");
  assert.equal(toNumber(perronConvergent(integerMatrix, 4)), 13 / 8);
  assert.equal(colim.kind, "substitution.dynamics.colim");
  assert.equal(natEqual(colim.rank, fromCount(2)), true);
  assert.equal(toInt(colim.det), -1);
  assert.deepEqual(colim.smith.map(toInt), [1, 1]);
  assert.equal(toInt(colim.stableDet), 1);
  assert.equal(colim.module.kind, "substitution.dynamics.localizedIntegerModule");
  assert.equal(natEqual(colim.module.rank, fromCount(2)), true);
  assert.equal(colim.module.invertedPrimes.length, 0);
  assert.equal(substitutionSheafDual.kind, "substitution.dynamics.dual");
  assert.equal(substitutionSheafDual.duality.kind, "substitution.dynamics.colimDuality:witness");
  const stepInvariant = stepNInvariant(integerMatrix);
  assert.equal(stepInvariant.kind, "substitution.dynamics.stepNInvariant");
  assert.equal(natEqual(stepInvariant.rank, fromCount(2)), true);
  assert.equal(stepInvariant.module.kind, "substitution.dynamics.localizedIntegerModule");
  assert.equal(natEqual(stepInvariant.module.rank, fromCount(2)), true);
  assert.equal(stepInvariant.module.invertedPrimes.length, 0);
});

test("exact number carries naturals, integers, rationals, and matrices over settled evidence", () => {
  const two = successor(natOne);
  const three = successor(two);
  const minusOne = intNegate(intOne);
  const twoInt = fromNatural(two);
  const half = fromRatio(2, 4);
  const matrix = fromInts([[1, 1], [1, 0]]);
  const identity = fromInts([[1, 0], [0, 1]]);
  const product = matmul(matrix, identity);

  assert.equal(natIsZero(natZero), true);
  assert.equal(natEqual(natAdd(natOne, natOne), two), true);
  assert.equal(natEqual(natMultiply(two, two), fromCount(4)), true);
  assert.equal(natEqual(monus(three, natOne), two), true);
  assert.equal(natEqual(natDivmod(three, two).remainder, natOne), true);
  assert.equal(natEqual(gcd(fromCount(6), fromCount(4)), two), true);
  assert.equal(members(three).length, 3);
  assert.equal(isMember(two, three), true);
  assert.equal(natLeq(two, three), true);
  assert.equal(natLess(two, three), true);
  assert.equal(natCompare(two, three), -1);
  assert.equal(natEqual(predecessor(three), two), true);
  assert.equal(asExtension(two).kind, "bilattice.relation.carrier");
  {
    const extension = extensionOf(two);
    assert.equal(extension.kind, "bilattice.relation.stateExtension");
    assert.equal(natEqual(extension.rank, fromCount(2)), true);
    assert.equal(natEqual(extension.points.entities[0] as Parameters<typeof natEqual>[0], natZero), true);
    assert.equal(natEqual(extension.points.entities[1] as Parameters<typeof natEqual>[0], natOne), true);
  }
  assert.equal(toCount(three), 3);

  assert.equal(intIsZero(intZero), true);
  assert.equal(intEqual(integer(two, natOne), intOne), true);
  assert.equal(equivalent(integer(two, natOne), intOne), true);
  assert.equal(toInt(intAdd(twoInt, minusOne)), 1);
  assert.equal(toInt(intSubtract(twoInt, intOne)), 1);
  assert.equal(toInt(intMultiply(fromInt(-2), fromInt(3))), -6);
  assert.equal(isPositive(twoInt), true);
  assert.equal(isNegative(minusOne), true);
  assert.equal(sign(minusOne), -1);
  assert.equal(natEqual(magnitude(fromInt(-3)), three), true);
  assert.equal(toInt(intDivmod(fromInt(7), twoInt).quotient), 3);
  assert.equal(toInt(quotient(fromInt(7), twoInt)), 3);
  assert.equal(divides(twoInt, fromInt(8)), true);
  assert.equal(intCompare(intOne, twoInt), -1);

  assert.equal(ratIsZero(ratZero), true);
  assert.equal(ratEqual(half, rational(intOne, twoInt)), true);
  assert.equal(ratEqual(fromInteger(intOne), ratOne), true);
  assert.equal(toNumber(ratAdd(half, half)), 1);
  assert.equal(toNumber(ratSubtract(ratOne, half)), 0.5);
  assert.equal(toNumber(ratMultiply(half, half)), 0.25);
  assert.equal(toNumber(divide(ratOne, fromInteger(twoInt))), 0.5);
  assert.equal(toNumber(reciprocal(fromRatio(2, 1))), 0.5);
  assert.equal(toNumber(ratNegate(half)), -0.5);
  assert.equal(ratSign(ratNegate(half)), -1);
  assert.equal(ratCompare(half, ratOne), -1);
  assert.equal(toNumber(ratFromInt(3)), 3);

  assert.deepEqual(matTranspose(matrix).map((row) => row.map(toInt)), [[1, 1], [1, 0]]);
  assert.equal(matEqual(product, matrix), true);
  assert.equal(toInt(determinant(matrix)), -1);
  assert.deepEqual(charPoly(matrix).map(toInt), [-1, -1, 1]);
  assert.deepEqual(smithNormalForm(matrix).map(toInt), [1, 1]);
  assert.equal(natEqual(rank(matrix), two), true);
});


test("meme topology induced from witnessed predications exposes settled mathematical carriers", () => {
  const socrates = tm("socrates");
  const human = tm("human");
  const speaks = cl("speaks");
  const truth = tm("truth");
  const speaksTruth = cell(socrates, speaks, truth);
  assert.equal(human.kind, "utterance.token");
  const topology = induce([
    utterance(mark({ subject: "socrates", object: "human" }), mark("specializes")),
    utterance(mark({ subject: "socrates", object: "truth" }), mark("speaks")),
  ]);
  assert.equal(topology.kind, "meme-topology.carrier");
  assert.equal(topology.fixedPoints.knowledge.least.sheaf.section.fibers.length, 2);
  assert.equal(topology.fixedPoints.knowledgeGap.kind, "predication.valuation.fixedPoint.gap.carrier");
  assert.equal(topology.fixedPoints.knowledgeGap.vanishing.kind, "predication.valuation.fixedPoint.gap.vanishing-obstruction");
  assert.equal(topology.fixedPoints.truthGap.kind, "predication.valuation.fixedPoint.gap.carrier");
  assert.equal(fixedPointOrderName(topology.fixedPoints.truthGap.order), "truth");
  assert.equal(topology.fixedPointReadings.kind, "meme-topology.fixedPointReadings");
  assert.equal(topology.fixedPointReadings.knowledgeLeast.kind, "meme-topology.fixedPointReading");
  assert.equal(topology.fixedPointReadings.knowledgeGreatest.kind, "meme-topology.fixedPointReading");
  assert.equal(topology.fixedPointReadings.truthLeast.kind, "meme-topology.fixedPointReading");
  assert.equal(topology.fixedPointReadings.truthGreatest.kind, "meme-topology.fixedPointReading");
  assert.equal(topology.fixedPointReadings.knowledgeLeast.cohomology.kind, "predication.cohomology.carrier");
  assert.equal(topology.fixedPointReadings.truthGreatest.cohomology.kind, "predication.cohomology.carrier");
  assert.equal(topology.settling.kind, "predication.settling.carrier");
  assert.equal(topology.settlingFirstCohomology.kind, "predication.settling.firstCohomology");
  assert.ok(topology.theory.rules.length >= 2);
  assert.equal(topology.theory.kind, "typedTheory.carrier");
  assert.equal(topology.proofs.kind, "typedTheory.proof.carrier");
  assert.equal(topology.proofs.judgments[0]?.kind, "typedTheory.typing:witness");
  assert.equal(topology.proofs.obstructions.length, 0);
  const information = topology.fixedPointReadings.knowledgeLeast.information;
  assert.equal(information.kind, "meme-topology.information");
  assert.equal(information.points.kind, "predication.entitySet");
  assert.equal(information.states.kind, "predication.predicateSet");
  assert.equal(information.entryCarrier.kind, "meme-topology.informationEntries");
  assert.equal(natEqual(information.entryCarrier.rank, fromCount(2)), true);
  assert.equal(information.entryCarrier.entries[0]?.kind, "meme-topology.informationEntry");
  assert.equal(information.relationMatrix.kind, "bilattice.relation.matrix");
  assert.equal(information.relation.kind, "bilattice.relation.carrier");
  assert.equal(information.valuationConsistency.kind, "predication.valuation.consistency.carrier");
  assert.equal(information.valuationConsistency.vanishing.kind, "predication.valuation.consistency.vanishing:witness");
  assert.equal(natEqual(information.valuationConsistency.contradictionRank, natZero), true);
  assert.equal(readCharge(topology.fixedPointReadings.knowledgeLeast, speaksTruth).kind, "bilattice-charge.carrier");
});

test("admission measures potential from the givens and never seeds the falsity side", () => {
  const spoken = induce([utterance(mark({ subject: "socrates", object: "truth" }), mark("speaks"))]);
  const viaPair = induce([[mark({ subject: "socrates", object: "truth" }), mark("speaks")]]);
  const section = sectionOf(spoken, "knowledge", "least");
  const spokenCharge = chargeAtValues(section, "socrates", "speaks", "truth");

  assert.equal(sameMemeTopology(spoken, viaPair), true);
  assert.equal(spokenCharge.kind, "bilattice-charge.carrier");
  assert.equal(spokenCharge.value[0]?.name, "present");
  assert.equal(spokenCharge.value[1]?.name, "absent");
  // The falsity side and the held contradiction are reached only by derivation:
  assert.equal(chargeValueName(asChargeValue(joinKnowledgeValue(cv("potential"), cv("active")))), "stable");
  assert.equal(chargeValueIdentity(asChargeValue(chargeValueName(cv("stable"))), cv("stable")).kind, "bilattice-charge.valueIdentity:witness");
  assert.throws(() => induce([[42, mark("speaks")] as unknown as Parameters<typeof induce>[0][number]]), TypeError);
});

test("a relational claim of the specialization concept installs the edge", () => {
  const topology = induce([utterance(mark({ subject: "socrates", object: "human" }), mark("specializes"))]);
  const section = sectionOf(topology, "knowledge", "least");

  assert.equal(topology.theory.rules.length >= 1, true);
  assert.equal(chargeAtValues(section, "socrates", "specializes", "human").value[0]?.name, "present");
});

test("extend agrees with re-induction over the concatenated utterance log", () => {
  const a = [
    utterance(mark({ subject: "socrates", object: "truth" }), mark("speaks")),
    utterance(mark({ subject: "socrates", object: "human" }), mark("specializes")),
  ];
  const b = [utterance(mark("socrates"), mark("errs"))];

  assert.equal(sameMemeTopology(extend(induce(a), b), induce([...a, ...b])), true);
  assert.throws(() => extend({} as Parameters<typeof extend>[0], []), TypeError);
});

test("section layer renders the four-way partition and topology vitals", () => {
  const topology = induce([
    utterance(mark({ subject: "socrates", object: "truth" }), mark("speaks")),
    utterance(mark("socrates"), mark("errs")),
  ]);
  const section = sectionOf(topology, "knowledge", "least");
  const partition = partitionSection(section);
  const vitals = topologyVitals(topology);

  assert.equal(section.kind, "meme-topology.section.carrier");
  assert.equal(section.order, "knowledge");
  assert.equal(section.bound, "least");
  assert.equal(section.entries[0]?.kind, "meme-topology.section.entry");
  assert.equal(partition.kind, "meme-topology.section.partition");
  assert.equal(partition.potential.length, 2);
  assert.equal(partition.active.length, 0);
  assert.equal(partition.stable.length, 0);
  assert.equal(partition.absurd.length, 0);
  assert.equal(predicationsFor(section, "socrates").length, 2);
  assert.equal(subjectsFor(section, "speaks").length, 1);
  assert.equal(chargeAtValues(section, "socrates", "speaks", "truth").value[0]?.name, "present");
  assert.equal(chargeAtValues(section, "socrates", "speaks", "truth").value[1]?.name, "absent");
  assert.equal(chargeAtValues(section, "nobody", "speaks").value[0]?.name, "absent");
  assert.equal(chargeAtValues(section, "nobody", "speaks").value[1]?.name, "absent");
  assert.equal(vitals.kind, "meme-topology.vitals");
  assert.equal(natEqual(vitals.cells, fromCount(2)), true);
  assert.equal(natEqual(vitals.contradictions, natZero), true);
  assert.equal(natEqual(vitals.residue, natZero), true);
  assert.equal(vitals.regime.kind, "ordinal.closure.regime.finite");
  assert.throws(() => sectionOf(topology, "magnitude" as Parameters<typeof sectionOf>[1], "least"), TypeError);
});

test("utterance logs dehydrate to JSON and rehydrate to a coincident log", () => {
  const log = [
    utterance(mark({ subject: "socrates", object: "truth" }), mark("speaks")),
    utterance(mark({ subject: "socrates", object: "human" }), mark("specializes")),
    utterance(mark("socrates"), mark("errs")),
  ];
  const dehydrated = dehydrateUtterances(log);
  const rehydrated = rehydrateUtterances(JSON.parse(JSON.stringify(dehydrated)) as Parameters<typeof rehydrateUtterances>[0]);

  assert.equal(rehydrated.length, log.length);
  assert.equal(sameMemeTopology(induce(rehydrated), induce(log)), true);
  assert.throws(() => dehydrateUtterances([utterance(mark(Symbol("opaque")), mark("speaks"))]), TypeError);
  assert.throws(() => rehydrateUtterances({ kind: "wrong" }), TypeError);
});

test("charge order judgments carry the join computation or its counterexample", () => {
  const knowledgeWitness = knowledgeLeq(cv("potential"), cv("stable"));
  const knowledgeObstruction = knowledgeLeq(cv("stable"), cv("potential"));
  const truthWitness = truthLeq(cv("active"), cv("potential"));

  assert.equal(knowledgeWitness.kind, "bilattice-charge.orderLeq:witness");
  assert.equal(knowledgeWitness.order, "knowledge");
  assert.equal(sameChargeValue(knowledgeWitness.join, cv("stable")), true);
  assert.equal(knowledgeObstruction.kind, "bilattice-charge.orderLeq-obstruction");
  assert.equal(sameChargeValue(knowledgeObstruction.join, cv("stable")), true);
  assert.equal(truthWitness.kind, "bilattice-charge.orderLeq:witness");
  assert.equal(truthWitness.order, "truth");
  assert.equal(chargeValueIdentity(cv("stable"), cv("stable")).kind, "bilattice-charge.valueIdentity:witness");
  assert.equal(chargeValueIdentity(cv("stable"), cv("absurd")).kind, "bilattice-charge.valueIdentity-obstruction");
});
