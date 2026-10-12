import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const DERIVATION_DIRECTION = [
  'aperiodic-articulating',
  'transfinite-predicating',
  'scott-continuous-positing',
  'finite-settling',
];

const REQUIRED_SECTIONS = {
  traceCarrier: [
    'exactEavtRows',
    'eSubjectCoordinate',
    'aPredicateCoordinate',
    'vObjectCoordinateNotPrivilegedBilatticeField',
    'tTransactionCoordinate',
    'noHiddenAxisFields',
    'correctionsAreNewRows',
    'identityNotLineOffsetArrivalOrderArrayIndexOrDatabaseKey',
    'finiteCarrierNotWholeTraceObject',
  ],
  jsonlAndStreams: [
    'jsonlOneCompleteJsonObjectPerLfLine',
    'jsonlIdentityItemByItem',
    'jsonlNotInternetWireStandard',
    'rfc7464JsonTextSequencesConservativeWireProfile',
    'jsonSeqUsesApplicationJsonSeq',
    'noCanonicalSequenceBytesWithoutManifest',
    'signedStreamsUseCanonicalItemsOrManifest',
  ],
  canonicalIdentity: [
    'rowIdFormulaSha256JcsRow',
    'exactEavtCanonicalization',
    'duplicateNamesRejected',
    'unicodePreservedWithoutNormalization',
    'numbersWithinJcsIJsonBoundaryOrTypedStrings',
    'recursiveObjectPropertySorting',
    'arrayOrderPreserved',
    'canonicalWhitespaceElided',
    'sameCanonicalIdSameMergeEvent',
    'differentCanonicalIdsRemainDistinct',
  ],
  appendMerge: [
    'appendOnlyTraceStorage',
    'mergeByCanonicalRowIdGSetUnion',
    'appendMonotonicity',
    'mergeCommutative',
    'mergeAssociative',
    'mergeIdempotent',
    'canonicalizationFailuresRejectedOrQuarantined',
    'indexesCachesSnapshotsNonAuthoritative',
    'doesNotProveFullTraceMonoidSettlementFunctor',
  ],
  recognitionAdmission: [
    'parsingIsNotAdmission',
    'shapeValidityIsNotAdmission',
    'signatureValidityIsNotAdmission',
    'profileRecognitionBeforeAdmission',
    'canonicalIdentityCheckedBeforeTrust',
    'signatureVerificationBeforeMerge',
    'objectKindAndTraceAxesRecognized',
    'governanceAndCapabilityGatesApplied',
    'modeledPlayerObservationActionBoundsAppliedWhenRelevant',
    'acceptedEvidenceAppendedOnlyAfterAdmission',
    'failedAdmissionRecordedAsAuditOrDowngrade',
  ],
  trcTdpRuntime: [
    'trcAndTdpSameOnDiskObject',
    'catalogRootDeclared',
    'typedResourceSchemasDeclared',
    'traceLogsAsInhabitingEvidence',
    'scriptsAsMorphismWitnesses',
    'schemaLogScriptColocation',
    'dualFilingAtSubjectAndPredicateAnchors',
    'canonicalIdentityPreservedAcrossDualFiling',
    'replayFromTraceEvidence',
    'closureExecutionOutcomeDeclared',
  ],
  pamClosure: [
    'entitySetDeclared',
    'predicateCategoryOrGraphDeclared',
    'valueAlgebraDeclared',
    'fiberAlgebraOrSpecializationDeclared',
    'externalMutationUsesReifiedMessages',
    'eventReplayIntoGeometry',
    'monotoneRuleDispatch',
    'readsProduceWitnesses',
    'fixedPointPrefixFuelBoundOrDowngradeStatus',
    'fourNotUniversalValueSubstrate',
  ],
  packetProjection: [
    'shpFiniteSemanticHypertextPacket',
    'packetsAreProjectionObjects',
    'sourceTraceOrTraceFamilyDeclared',
    'finiteFrontierDeclared',
    'settlementEvidenceDeclared',
    'projectionMorphismDeclared',
    'deterministicMonotoneProjection',
    'classesAsMorphismIdentities',
    'dataAttributesAsCarrierCoordinates',
    'noScriptExecution',
    'noRequiredExternalResourcesForSemantics',
    'packetDoesNotReplaceTraceCatalogPlayerOrStrategy',
  ],
  wireFederation: [
    'wireSurfacesAreMathematicalMorphisms',
    'objectBoundaryFixedBeforeWireClaims',
    'rfc8259JsonDeclared',
    'rfc8785CanonicalJsonDeclared',
    'rfc7464JsonTextSequencesDeclared',
    'rfc9110ContentTypeDeclaredForHttp',
    'rfc9457ProblemDetailsDeclared',
    'rfc8032Ed25519DeclaredWhenUsed',
    'mediaTypeRegistrationDisciplineDeclared',
    'signatureVerificationBeforeTraceMerge',
    'governanceAndRecognitionAfterSignatureVerification',
  ],
  modeledPlayerRuntime: [
    'externalPlayerBoundaryDeclared',
    'modeledPlayerIdentifierDeclared',
    'observerLocalSettlingDeclared',
    'perObserverRuleSystemDeclared',
    'identityAuthorityDeclaredWhenApplicable',
    'capabilitiesAndGovernanceDeclared',
    'handednessDeclared',
    'inputAndOutputTraceReferencesDeclared',
    'playerLocalPartialObservation',
    'cgsStrategyReferenceOrDowngrade',
    'learningTransitionPolicyDeclared',
    'outputRowsRequireAttributionGovernanceCapabilityObservationSettlingAndStrategyBoundaries',
  ],
  operationsRuntime: [
    'beingDoingWorkingGoverningWitnesses',
    'processProcedureDerivationInquiryWorkTypes',
    'operationsLoopStagesDeclared',
    'processAndProcedureRecordsDeclared',
    'ledgersAsBalancedWitnessProjections',
    'budgetsWithScopeExhaustionAndCoherenceEvidence',
    'lawvereQuantaleCostComposition',
    'stationarityAndLaplacianHandoffDeclared',
    'operationalRecordsAreSubstrateContent',
  ],
  nonConformanceBoundary: [
    'noRowOrderLineNumberOrDatabaseIdAsTraceIdentity',
    'noExtraRowFieldsAsTraceAxes',
    'noSilentDuplicateJsonNameDiscardForStrongIdentity',
    'noHistoricalRowMutation',
    'noMergeAfterSignatureWithoutRecognitionGovernanceAdmission',
    'noJsonlAsInternetWireStandard',
    'noPacketOrTransportOutsideMathematics',
    'noPacketOrTransportAsWholeMathematics',
    'noKeysInboxesOrOutboxesAsModeledPlayers',
    'noCgsClaimWithoutEventStructureAndStrategyLaws',
    'noHiddenLearningCostBudgetOrRejectionEvidence',
  ],
};

const REQUIRED_COMPONENTS = [
  'trace-parser',
  'duplicate-detecting-json-importer-or-downgrade',
  'canonical-row-id-calculator',
  'append-only-trace-store',
  'g-set-merge-engine',
  'envelope-signer-verifier',
  'admission-recognition-gate',
  'governance-capability-gate',
  'trc-tdp-catalog-resolver',
  'replay-closure-executor',
  'pam-message-reification-interface',
  'finite-projection-engine',
  'shp-producer',
  'wire-profile-handler',
  'modeled-player-registry',
  'player-local-observation-action-loop',
  'cgs-declaration-linker',
  'learning-transition-recorder',
  'operations-ledger-budget-cost-recorder',
  'audit-downgrade-recorder',
];

import { isObject } from "./object-record.mjs";

function checkSection(errors, profile, sectionName, requiredKeys, codePrefix) {
  const section = profile[sectionName];
  if (!isObject(section)) {
    push(errors, `${codePrefix}-001`, sectionName, `${sectionName} must be declared`);
    return;
  }
  for (const key of requiredKeys) {
    if (section[key] !== true) {
      push(errors, `${codePrefix}-002`, `${sectionName}.${key}`, `${key} must be true`);
    }
  }
  checkEvidence(errors, section.evidence, sectionName, `${codePrefix}-003`);
}

export function validateImplementationCoreProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'IMPL-PROFILE-001', path: '<profile>', message: 'implementation core profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'IMPL-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'IMPL-PROFILE-003');

  if (!Array.isArray(profile.derivationDirection) || profile.derivationDirection.length !== DERIVATION_DIRECTION.length) {
    push(errors, 'IMPL-DIRECTION-001', path, 'derivationDirection must list the four SPOTCOMP stages');
  } else {
    for (const [index, stage] of DERIVATION_DIRECTION.entries()) {
      if (profile.derivationDirection[index] !== stage) {
        push(errors, 'IMPL-DIRECTION-002', `derivationDirection[${index}]`, 'derivation direction must be aperiodic to transfinite to Scott-continuous to finite');
      }
    }
  }

  for (const [sectionName, keys] of Object.entries(REQUIRED_SECTIONS)) {
    const codePrefix = `IMPL-${sectionName.replace(/[A-Z]/g, (letter) => `-${letter}`).toUpperCase()}`;
    checkSection(errors, profile, sectionName, keys, codePrefix);
  }

  const components = profile.minimumRuntimeComponents;
  if (!isObject(components)) {
    push(errors, 'IMPL-COMPONENTS-001', 'minimumRuntimeComponents', 'minimumRuntimeComponents must be declared');
  } else {
    if (!nonEmptyStringArray(components.components)) {
      push(errors, 'IMPL-COMPONENTS-002', 'minimumRuntimeComponents.components', 'components must be a non-empty string array');
    } else {
      const declared = new Set(components.components);
      for (const component of REQUIRED_COMPONENTS) {
        if (!declared.has(component)) {
          push(errors, 'IMPL-COMPONENTS-003', `minimumRuntimeComponents.components.${component}`, 'required runtime component is missing');
        }
      }
    }
    checkEvidence(errors, components.evidence, 'minimumRuntimeComponents', 'IMPL-COMPONENTS-004');
  }

  return errors;
}

export const assertValidImplementationCoreProfile = createProfileAssertion(validateImplementationCoreProfile);
