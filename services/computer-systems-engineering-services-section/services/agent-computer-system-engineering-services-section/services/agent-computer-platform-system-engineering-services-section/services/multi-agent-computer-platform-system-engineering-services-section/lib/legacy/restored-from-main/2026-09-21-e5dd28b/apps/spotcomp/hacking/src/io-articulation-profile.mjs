import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateIoArticulationProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'IO-PROFILE-001', path: '<profile>', message: 'I/O articulation profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'IO-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'IO-PROFILE-003');

  checkSection(errors, profile, 'ioBoundary', [
    'externalIoPresentedAsUtterance',
    'transportBytesArePresentationOnly',
    'tokenClaimUtterancePreserved',
    'tokenBeforeClaimOrderingDeclared',
    'noDirectExternalSettlement',
    'noTransportShapeStageInference',
  ], 'IO-BOUNDARY');

  checkSection(errors, profile, 'articulatingGate', [
    'domainUtterance',
    'codomainAperiodicCategory',
    'potentialCellInitialPresentation',
    'locutionDistinctFromArticulating',
    'illocutionAndPerlocutionDownstream',
    'componentMorphismsNamedWhenBundled',
  ], 'IO-ART');

  checkSection(errors, profile, 'llmBoundary', [
    'llmExternalUnlessModeledPlayer',
    'promptIsTransportPresentation',
    'completionIsTransportPresentation',
    'samplingIsNotClosure',
    'hiddenContextNotTraceEvidence',
    'toolCallLocutionaryUntilTyped',
    'generatedClaimsRequireAdmission',
    'modeledPlayerEvidenceRequiredForPlayerClaims',
  ], 'IO-LLM');

  checkSection(errors, profile, 'partialityBoundary', [
    'unresolvedInputRemainsTyped',
    'partialFunctionsNotHostExceptions',
    'bottomDefaultExtensionsDeclared',
    'closureOrbitCarriesNonFinalTrajectories',
    'downgradeInsteadOfSilentDefault',
    'trcTdpRecordsReplayableProofTree',
  ], 'IO-PARTIAL');

  checkSection(errors, profile, 'standardsBoundary', [
    'rfcAppliesAfterObjectBoundary',
    'jsonConstrainsFiniteCarrier',
    'canonicalizationConstrainsIdentityBytes',
    'signaturesDoNotProveSettlement',
    'httpFailureCanRemainPreIllocution',
    'mediaTypesBindDerivedObjects',
  ], 'IO-STANDARDS');

  checkSection(errors, profile, 'implementationBoundary', [
    'noApiShortcutAsConformance',
    'noParserAsProofEngine',
    'noHiddenPromptContextAsEvidence',
    'noToolCallAsPositingWithoutAdmission',
    'noModelOutputAsWitnessWithoutSettlement',
    'codeRemainsProbe',
  ], 'IO-IMPLEMENTATION');

  return errors;
}

export const assertValidIoArticulationProfile = createProfileAssertion(validateIoArticulationProfile);
