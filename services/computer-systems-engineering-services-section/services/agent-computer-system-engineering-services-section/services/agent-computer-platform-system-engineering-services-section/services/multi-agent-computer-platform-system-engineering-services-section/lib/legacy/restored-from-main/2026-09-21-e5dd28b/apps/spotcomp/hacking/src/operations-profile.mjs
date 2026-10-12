import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateOperationsProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'OPS-PROFILE-001', path: '<profile>', message: 'operations profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'OPS-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'OPS-PROFILE-003');

  checkSection(errors, profile, 'stageStrata', [
    'learningAsStratumZero',
    'doingAsCommandMorphismLayer',
    'teachingAsSettledFixedPointOutput',
    'governingAsStableRuleBearingDoing',
    'planningAsProspectiveUnfiredDoing',
    'workingAsActiveSigmaFiring',
    'beingRequiresSettlingStatePathIdentityAndWitness',
  ], 'OPS-STRATA');

  checkSection(errors, profile, 'workTypes', [
    'processDeclared',
    'procedureDeclared',
    'derivationDeclared',
    'inquiryDeclared',
    'workTypeRequiredForFuelOrStateChange',
    'workTypeRefinementAllowedOnlyByDeclaration',
  ], 'OPS-WORKTYPE');

  checkSection(errors, profile, 'operationsLoop', [
    'planningComputesDispatchableFixedFiberElements',
    'dispatchAssignsTraceAgentTaskHistoryExtension',
    'executionExtendsHistoryMonoid',
    'trackingMaterializesHistoryIntoFiberEvidence',
    'reviewComputesObservationOrGlobalSections',
    'feedbackUpdatesNuclei',
    'loopRecursiveAcrossScales',
  ], 'OPS-LOOP');

  checkSection(errors, profile, 'processProcedureRecords', [
    'processRecordNamesDeploymentCapabilitiesSyscallPolicy',
    'processRecordCitesSpawnAndExitWitnesses',
    'procedureRecordNamesPreconditionsStepsActorsBudgetsWitnessesPostconditions',
    'procedureFailureDowngradeDeclared',
    'hostScriptOnlyTypedOperatingProjection',
  ], 'OPS-RECORDS');

  checkSection(errors, profile, 'ledgerBudgetCost', [
    'ledgerProjectionFromWitnessEvents',
    'postingsCarryDebitCreditAmountCommodityAndWitness',
    'budgetDeclaresResourceBoundScopeExhaustionResetAndWitnessRequirements',
    'costDomainDeclaredAsLawvereQuantale',
    'readsContributeQuantaleUnit',
    'settlementsContributePositiveCost',
    'readTriggeredSettlementSeparated',
  ], 'OPS-COST');

  checkSection(errors, profile, 'stationarityLaplacian', [
    'stationarityClaimsUseOperationsLoopFixedPointEvidence',
    'detailedBalanceOnlyOperationalEvidence',
    'laplacianCarrierDeclared',
    'observationKernelDeclared',
    'boundaryOrRestrictionMapsDeclared',
    'globalSectionOrFixedPointCriterionDeclared',
    'laplacianizationStructureAndEquivalenceDeclared',
  ], 'OPS-LAPLACIAN');

  checkSection(errors, profile, 'implementationBoundary', [
    'noExternalProjectManagerAsOperatingLayer',
    'noHostScriptAsProcedureWithoutDeclaration',
    'noLedgerWithoutWitnessProjection',
    'noBudgetWithoutExhaustionPolicy',
    'noPositiveReadCostAsSettlementCost',
    'noStationarityClaimWithoutCarrierAndFixedPointEvidence',
    'unknownOperationsBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'OPS-IMPLEMENTATION');

  return errors;
}

export const assertValidOperationsProfile = createProfileAssertion(validateOperationsProfile);
