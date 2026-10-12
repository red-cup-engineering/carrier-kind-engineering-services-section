import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REQUIRED_COLUMNS = new Set(['type-theory', 'proof-theory', 'category-theory', 'domain-theory', 'path-theory']);
const REQUIRED_MORPHISMS = new Set([
  'articulating',
  'predicating',
  'positing',
  'settling',
  'proving',
  'term-instantiating',
  'existential-push-forward',
  'path-resolving',
  'shp-projection',
]);
const REQUIRED_ALIASES = new Set([
  'speech-act-illocution',
  'type-theoretic-term-instantiation',
  'lawvere-existential-push-forward',
  'spotcomp-positing',
]);

import { isObject } from "./object-record.mjs";

function missingFromSet(expected, actual) {
  return [...expected].filter((item) => !actual.has(item));
}

export function validateChlLanguageProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'CHL-PROFILE-001', path: '<profile>', message: 'CHL language profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'CHL-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'CHL-PROFILE-003');

  if (!isObject(profile.languageApex)) {
    push(errors, 'CHL-APEX-001', path, 'languageApex must be declared');
  } else {
    if (profile.languageApex.kind !== 'chl-language-category') {
      push(errors, 'CHL-APEX-002', 'languageApex', 'language apex must be chl-language-category');
    }
    for (const key of ['openEndedColumns', 'classicalThreeColumnsSpecializationOnly', 'columnsProjectByConeLegFunctors']) {
      if (profile.languageApex[key] !== true) {
        push(errors, 'CHL-APEX-003', 'languageApex', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.languageApex.evidence, 'languageApex', 'CHL-APEX-004');
  }

  const columnIds = new Set();
  if (!Array.isArray(profile.columnLegs)) {
    push(errors, 'CHL-COLUMN-001', path, 'columnLegs must be an array');
  } else {
    for (const column of profile.columnLegs) {
      const columnPath = isObject(column) && hasString(column, 'id') ? column.id : '<column>';
      if (!isObject(column)) {
        push(errors, 'CHL-COLUMN-002', columnPath, 'column leg must be an object');
        continue;
      }
      if (!hasString(column, 'id')) {
        push(errors, 'CHL-COLUMN-003', columnPath, 'column id must be declared');
      } else if (columnIds.has(column.id)) {
        push(errors, 'CHL-COLUMN-004', columnPath, 'column ids must be unique');
      } else {
        columnIds.add(column.id);
      }
      for (const key of ['targetCategory', 'codomainKind']) {
        if (!hasString(column, key)) {
          push(errors, 'CHL-COLUMN-005', columnPath, `${key} must be declared`);
        }
      }
      if (!nonEmptyStringArray(column.primaryMorphisms)) {
        push(errors, 'CHL-COLUMN-006', columnPath, 'primaryMorphisms must be non-empty strings');
      }
      if (column.distinctCategoricalPosition !== true) {
        push(errors, 'CHL-COLUMN-007', columnPath, 'column must declare a distinct categorical position');
      }
      checkEvidence(errors, column.evidence, columnPath, 'CHL-COLUMN-008');
    }
    const missingColumns = missingFromSet(REQUIRED_COLUMNS, columnIds);
    if (missingColumns.length > 0) {
      push(errors, 'CHL-COLUMN-009', 'columnLegs', `missing required columns: ${missingColumns.join(', ')}`);
    }
  }

  const morphismIds = new Set();
  if (!Array.isArray(profile.morphismInventory)) {
    push(errors, 'CHL-MORPH-001', path, 'morphismInventory must be an array');
  } else {
    for (const morphism of profile.morphismInventory) {
      const morphismPath = isObject(morphism) && hasString(morphism, 'id') ? morphism.id : '<morphism>';
      if (!isObject(morphism)) {
        push(errors, 'CHL-MORPH-002', morphismPath, 'morphism must be an object');
        continue;
      }
      if (!hasString(morphism, 'id')) {
        push(errors, 'CHL-MORPH-003', morphismPath, 'morphism id must be declared');
      } else if (morphismIds.has(morphism.id)) {
        push(errors, 'CHL-MORPH-004', morphismPath, 'morphism ids must be unique');
      } else {
        morphismIds.add(morphism.id);
      }
      for (const key of ['position', 'column', 'codomain']) {
        if (!hasString(morphism, key)) {
          push(errors, 'CHL-MORPH-005', morphismPath, `${key} must be declared`);
        }
      }
      if (morphism.collapsedIntoGenericOperation !== false) {
        push(errors, 'CHL-MORPH-006', morphismPath, 'morphism must not be collapsed into a generic operation');
      }
      if (morphism.coincidenceRequiredForAlias !== true) {
        push(errors, 'CHL-MORPH-007', morphismPath, 'aliases require a cited coincidence theorem');
      }
      checkEvidence(errors, morphism.evidence, morphismPath, 'CHL-MORPH-008');
    }
    const missingMorphisms = missingFromSet(REQUIRED_MORPHISMS, morphismIds);
    if (missingMorphisms.length > 0) {
      push(errors, 'CHL-MORPH-009', 'morphismInventory', `missing required morphisms: ${missingMorphisms.join(', ')}`);
    }
  }

  if (!isObject(profile.coincidencePolicy)) {
    push(errors, 'CHL-COINC-001', path, 'coincidencePolicy must be declared');
  } else {
    if (profile.coincidencePolicy.theoremName !== 'cross-tradition-coincidence') {
      push(errors, 'CHL-COINC-002', 'coincidencePolicy', 'theoremName must be cross-tradition-coincidence');
    }
    if (profile.coincidencePolicy.validOnlyOn !== 'predication-settling-category') {
      push(errors, 'CHL-COINC-003', 'coincidencePolicy', 'coincidence must be scoped to predication-settling-category');
    }
    for (const key of ['provedNotDefinition', 'offScopeColumnsDistinct', 'forbidUnprovedCollapse']) {
      if (profile.coincidencePolicy[key] !== true) {
        push(errors, 'CHL-COINC-004', 'coincidencePolicy', `${key} must be true`);
      }
    }
    const aliases = new Set(Array.isArray(profile.coincidencePolicy.requiredAliasSet) ? profile.coincidencePolicy.requiredAliasSet : []);
    const missingAliases = missingFromSet(REQUIRED_ALIASES, aliases);
    if (missingAliases.length > 0) {
      push(errors, 'CHL-COINC-005', 'coincidencePolicy', `missing required aliases: ${missingAliases.join(', ')}`);
    }
    checkEvidence(errors, profile.coincidencePolicy.evidence, 'coincidencePolicy', 'CHL-COINC-006');
  }

  if (!isObject(profile.pathTheoryColumn)) {
    push(errors, 'CHL-PATH-001', path, 'pathTheoryColumn must be declared');
  } else {
    for (const key of [
      'posixPathCategory',
      'yonedaPathIdentity',
      'pathResolvingDistinct',
      'schemaIdPathCoherence',
      'scriptAsMorphismWitness',
      'gapMarkersAreProofObligations',
    ]) {
      if (profile.pathTheoryColumn[key] !== true) {
        push(errors, 'CHL-PATH-002', 'pathTheoryColumn', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.pathTheoryColumn.evidence, 'pathTheoryColumn', 'CHL-PATH-003');
  }

  if (!isObject(profile.implementationBoundary)) {
    push(errors, 'CHL-IMPL-001', path, 'implementationBoundary must be declared');
  } else {
    for (const key of [
      'commandsMayComposeMorphisms',
      'compositionsMustNameMorphisms',
      'pureMorphismsSeparateFromWrappers',
      'defaultExportNamesMorphismHandle',
      'schemaValidationIsBoundaryTyping',
    ]) {
      if (profile.implementationBoundary[key] !== true) {
        push(errors, 'CHL-IMPL-002', 'implementationBoundary', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.implementationBoundary.evidence, 'implementationBoundary', 'CHL-IMPL-003');
  }

  return errors;
}

export const assertValidChlLanguageProfile = createProfileAssertion(validateChlLanguageProfile);
