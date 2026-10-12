import { createProfileAssertion, push } from "./profile-admission.mjs";
import { nonEmptyStringArray, stringArray } from "./primitive-admission.mjs";
const STATUSES = new Set(['candidate', 'open', 'proved']);
const RESOURCE_ROLES = new Set(['fiber', 'object-slice', 'morphism', 'projection', 'support']);
const CARRIER_KINDS = new Set(['eavt-trace-log', 'open']);
const CANONICAL_IDENTITIES = new Set(['canonical-json-sha256', 'open']);
const MERGES = new Set(['g-set-union', 'open']);
const EXACT_EAVT_FIELDS = ['e', 'a', 'v', 't'];

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}



function sameSet(left, right) {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function validSchemaWitness(witness) {
  return isObject(witness)
    && hasString(witness, 'path')
    && hasString(witness, 'declaresType')
    && witness.additionalPropertiesFalse === true
    && nonEmptyStringArray(witness.evidence);
}

function validLogWitness(witness) {
  return isObject(witness)
    && hasString(witness, 'path')
    && hasString(witness, 'carrier')
    && witness.appendOnly === true
    && witness.fiberRealization === true
    && nonEmptyStringArray(witness.evidence);
}

function validScriptWitness(witness) {
  return isObject(witness)
    && hasString(witness, 'path')
    && witness.defaultExport === true
    && witness.monotone === true
    && nonEmptyStringArray(witness.evidence);
}

export function validateInformationComputerProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'IC-PROFILE-001', path: '<profile>', message: 'information-computer profile must be an object' }];
  }

  if (!hasString(profile, 'profileId')) {
    push(errors, 'IC-PROFILE-002', '<profile>', 'profileId must be a non-empty string');
  }
  const profilePath = profile.profileId ?? '<profile>';
  if (!STATUSES.has(profile.status)) {
    push(errors, 'IC-PROFILE-003', profilePath, 'status must be candidate, open, or proved');
  }
  if (!nonEmptyStringArray(profile.evidence)) {
    push(errors, 'IC-PROFILE-004', profilePath, 'profile must cite evidence');
  }

  const sourcesById = new Map();
  if (!Array.isArray(profile.sourceArtifacts) || profile.sourceArtifacts.length === 0) {
    push(errors, 'IC-SOURCE-001', profilePath, 'profile must declare sourceArtifacts');
  }
  for (const source of Array.isArray(profile.sourceArtifacts) ? profile.sourceArtifacts : []) {
    const path = isObject(source) && hasString(source, 'id') ? source.id : '<source-artifact>';
    if (!isObject(source)) {
      push(errors, 'IC-SOURCE-002', path, 'source artifact must be an object');
      continue;
    }
    if (!hasString(source, 'id')) {
      push(errors, 'IC-SOURCE-003', path, 'source artifact must declare id');
    } else if (sourcesById.has(source.id)) {
      push(errors, 'IC-SOURCE-004', source.id, 'source artifact ids must be unique');
    } else {
      sourcesById.set(source.id, source);
    }
    if (!hasString(source, 'informationProfile') || !hasString(source, 'artifact')) {
      push(errors, 'IC-SOURCE-005', path, 'source artifact must cite informationProfile and artifact');
    }
    if (!nonEmptyStringArray(source.evidence)) {
      push(errors, 'IC-SOURCE-006', path, 'source artifact must cite evidence');
    }
  }

  const carriersById = new Map();
  if (!Array.isArray(profile.carriers) || profile.carriers.length === 0) {
    push(errors, 'IC-CARRIER-001', profilePath, 'profile must declare carriers');
  }
  for (const carrier of Array.isArray(profile.carriers) ? profile.carriers : []) {
    const path = isObject(carrier) && hasString(carrier, 'id') ? carrier.id : '<carrier>';
    if (!isObject(carrier)) {
      push(errors, 'IC-CARRIER-002', path, 'carrier must be an object');
      continue;
    }
    if (!hasString(carrier, 'id')) {
      push(errors, 'IC-CARRIER-003', path, 'carrier must declare id');
    } else if (carriersById.has(carrier.id)) {
      push(errors, 'IC-CARRIER-004', carrier.id, 'carrier ids must be unique');
    } else {
      carriersById.set(carrier.id, carrier);
    }
    if (!CARRIER_KINDS.has(carrier.kind)) {
      push(errors, 'IC-CARRIER-005', path, 'carrier kind is not declared');
    }
    if (!Array.isArray(carrier.rowFields) || !sameSet(carrier.rowFields, EXACT_EAVT_FIELDS)) {
      push(errors, 'IC-CARRIER-006', path, 'EAVT carriers must preserve exactly e, a, v, t row fields');
    }
    if (carrier.valueFieldRole !== 'object-coordinate') {
      push(errors, 'IC-CARRIER-007', path, 'v field must be declared as object-coordinate, not bilattice value');
    }
    if (carrier.appendOnly !== true) {
      push(errors, 'IC-CARRIER-008', path, 'carrier must be append-only');
    }
    if (!CANONICAL_IDENTITIES.has(carrier.canonicalIdentity)) {
      push(errors, 'IC-CARRIER-009', path, 'carrier canonicalIdentity is not declared');
    }
    if (carrier.canonicalIdentity === 'canonical-json-sha256' && carrier.contentAddressing !== true) {
      push(errors, 'IC-CARRIER-010', path, 'canonical-json-sha256 carriers must enable contentAddressing');
    }
    if (!MERGES.has(carrier.merge)) {
      push(errors, 'IC-CARRIER-011', path, 'carrier merge is not declared');
    }
    if (carrier.merge === 'g-set-union' && carrier.appendOnly !== true) {
      push(errors, 'IC-CARRIER-012', path, 'g-set-union merge requires append-only carrier');
    }
    if (!nonEmptyStringArray(carrier.evidence)) {
      push(errors, 'IC-CARRIER-013', path, 'carrier must cite evidence');
    }
  }

  const realizedSources = new Set();
  if (!Array.isArray(profile.resources) || profile.resources.length === 0) {
    push(errors, 'IC-RESOURCE-001', profilePath, 'profile must declare resources');
  }
  const resourcesById = new Set();
  for (const resource of Array.isArray(profile.resources) ? profile.resources : []) {
    const path = isObject(resource) && hasString(resource, 'id') ? resource.id : '<resource>';
    if (!isObject(resource)) {
      push(errors, 'IC-RESOURCE-002', path, 'resource must be an object');
      continue;
    }
    if (!hasString(resource, 'id')) {
      push(errors, 'IC-RESOURCE-003', path, 'resource must declare id');
    } else if (resourcesById.has(resource.id)) {
      push(errors, 'IC-RESOURCE-004', resource.id, 'resource ids must be unique');
    } else {
      resourcesById.add(resource.id);
    }
    if (!RESOURCE_ROLES.has(resource.role)) {
      push(errors, 'IC-RESOURCE-005', path, 'resource role is not declared');
    }
    if (!sourcesById.has(resource.realizes)) {
      push(errors, 'IC-RESOURCE-006', path, 'resource must realize a known source artifact');
    } else {
      realizedSources.add(resource.realizes);
    }
    if (!validSchemaWitness(resource.schemaWitness)) {
      push(errors, 'IC-RESOURCE-007', path, 'resource must cite a schema witness with a closed type declaration');
    }
    if (!validLogWitness(resource.logWitness)) {
      push(errors, 'IC-RESOURCE-008', path, 'resource must cite an append-only log witness realizing the fiber');
    } else if (!carriersById.has(resource.logWitness.carrier)) {
      push(errors, 'IC-RESOURCE-009', path, 'log witness carrier must reference a declared carrier');
    }
    if (!isObject(resource.witnessTriad) || resource.witnessTriad.coLocated !== true || resource.witnessTriad.schemaTypesLog !== true || resource.witnessTriad.logInhabitsType !== true) {
      push(errors, 'IC-RESOURCE-010', path, 'resource witnessTriad must declare coLocation, schema typing, and log inhabitation');
    }
    if (resource.role === 'morphism') {
      if (!validScriptWitness(resource.scriptWitness)) {
        push(errors, 'IC-RESOURCE-011', path, 'morphism resources must cite a monotone script witness with default export');
      }
      if (resource.witnessTriad?.scriptIsMorphism !== true) {
        push(errors, 'IC-RESOURCE-012', path, 'morphism resources must declare scriptIsMorphism');
      }
    }
    if (resource.role !== 'morphism' && resource.scriptWitness !== undefined && !validScriptWitness(resource.scriptWitness)) {
      push(errors, 'IC-RESOURCE-013', path, 'script witness, when present, must be monotone and export a default morphism');
    }
    if (resource.valueIndex !== undefined) {
      if (!isObject(resource.valueIndex)) {
        push(errors, 'IC-RESOURCE-014', path, 'valueIndex must be an object');
      } else if (resource.valueIndex.authoritative !== false) {
        push(errors, 'IC-RESOURCE-015', path, 'value indexes must be non-authoritative');
      }
    }
    if (!nonEmptyStringArray(resource.evidence)) {
      push(errors, 'IC-RESOURCE-016', path, 'resource must cite evidence');
    }
  }

  for (const sourceId of sourcesById.keys()) {
    if (!realizedSources.has(sourceId)) {
      push(errors, 'IC-SOURCE-007', sourceId, 'each source artifact must be realized by at least one resource');
    }
  }

  return errors;
}

export const assertValidInformationComputerProfile = createProfileAssertion(validateInformationComputerProfile);
