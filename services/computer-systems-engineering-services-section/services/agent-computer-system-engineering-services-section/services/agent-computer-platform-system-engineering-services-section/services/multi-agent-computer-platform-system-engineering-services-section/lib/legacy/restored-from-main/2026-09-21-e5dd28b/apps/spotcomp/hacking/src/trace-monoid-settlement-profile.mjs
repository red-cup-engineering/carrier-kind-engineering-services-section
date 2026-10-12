import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateTraceMonoidSettlementProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'TMS-PROFILE-001', path: '<profile>', message: 'trace monoid settlement profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'TMS-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'TMS-PROFILE-003');

  checkSection(errors, profile, 'historyObject', [
    'finiteStepSetDeclared',
    'symmetricIrreflexiveIndependenceDeclared',
    'quotientCongruenceDeclared',
    'abstractHistoryInitialityDeclared',
    'stepKindsStageTyped',
    'rowIsPresentationNotStepIdentity',
  ], 'TMS-HISTORY');

  checkSection(errors, profile, 'independenceRelation', [
    'knownStepsOnly',
    'irreflexivePairsChecked',
    'symmetricClosureDeclared',
    'causalUnorderedRequired',
    'closureRuleDisjointnessRequired',
    'predicateReindexingCouplingChecked',
    'recognitionGovernanceObservationCouplingChecked',
  ], 'TMS-INDEPENDENCE');

  checkSection(errors, profile, 'valuationAction', [
    'atomicPositingActionDeclared',
    'batchPositingActionDeclared',
    'knowledgeMonotoneActionDeclared',
    'datumPreservationUnderReindexing',
    'nonUnitStepPolicyDeclared',
    'stageTypedActionDeclared',
  ], 'TMS-ACTION');

  checkSection(errors, profile, 'settlementFunctor', [
    'sameTraceClassSameValuationDeclared',
    'prefixOrderMonotoneDeclared',
    'historyCategoryBaseDeclared',
    'closureUnitDecompositionDeclared',
    'abstractHistoryToValuationActionDeclared',
    'rowMergeNotUsedAsFunctorProof',
  ], 'TMS-FUNCTOR');

  checkSection(errors, profile, 'crdtConvergence', [
    'closedInitialStateRequired',
    'commonClosureOperatorRequired',
    'writesAsDeltasDeclared',
    'closureMergeCommutationDeclared',
    'foldJoinPermutationInvariantDeclared',
    'sameMultisetConvergenceDeclared',
    'noConsensusClaimScoped',
  ], 'TMS-CRDT');

  checkSection(errors, profile, 'foataPrefixEvidence', [
    'foataNormalFormDeclared',
    'blockDepthDeclared',
    'blockPairwiseIndependenceDeclared',
    'dependencyOrderBetweenBlocksDeclared',
    'prefixOrderDeclared',
    'prefixIsPartialTrajectoryNotFinalSettlement',
  ], 'TMS-FOATA');

  checkSection(errors, profile, 'orderBoundaries', [
    'mergeSemilatticeDeclared',
    'knowledgeOrderLaneDeclared',
    'truthOrderModelingSeparated',
    'modelingPreorderIndependenceDeclared',
    'nonFourBilatticeScopeAllowed',
  ], 'TMS-ORDER');

  checkSection(errors, profile, 'federationBoundary', [
    'historyBearingPayloadsIdentified',
    'endpointStateNotHistoryEvidence',
    'projectionArtifactNotHistoryEvidence',
    'trajectoryPrefixRequiresStepIdentity',
    'downgradeWhenHistoryUnverifiable',
  ], 'TMS-FEDERATION');

  checkSection(errors, profile, 'implementationBoundary', [
    'noRowOrderAsIndependence',
    'noPeerDifferenceAsIndependence',
    'noGSetMergeAsSettlementFunctor',
    'noEndpointAsTraceClass',
    'noTruthOrderClaimFromKnowledgeMerge',
    'unknownIndependenceBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'TMS-IMPLEMENTATION');

  return errors;
}

export const assertValidTraceMonoidSettlementProfile = createProfileAssertion(validateTraceMonoidSettlementProfile);
