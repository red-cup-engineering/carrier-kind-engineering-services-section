import { createProfileAssertion, push } from "./profile-admission.mjs";
import { nonEmptyStringArray, stringArray } from "./primitive-admission.mjs";
const STATUSES = new Set(['candidate', 'open', 'proved']);
const REGIMES = new Set(['strict', 'scott-continuous', 'transfinite-bounded', 'aperiodic', 'open']);
const CONSISTENCY_COMMITMENTS = new Set(['reject-contestation', 'tolerate-contestation', 'open']);
const ARTIFACT_KINDS = new Set(['settled-information', 'document', 'record', 'witness', 'derived-assertion', 'projection-source']);
const PARTICIPATION_KINDS = new Set(['subject', 'object', 'subject-and-object']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}



export function validateInformationProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'INFO-PROFILE-001', path: '<profile>', message: 'information profile must be an object' }];
  }

  if (!hasString(profile, 'profileId')) {
    push(errors, 'INFO-PROFILE-002', '<profile>', 'profileId must be a non-empty string');
  }
  const profilePath = profile.profileId ?? '<profile>';
  if (!STATUSES.has(profile.status)) {
    push(errors, 'INFO-PROFILE-003', profilePath, 'status must be candidate, open, or proved');
  }
  if (!nonEmptyStringArray(profile.evidence)) {
    push(errors, 'INFO-PROFILE-004', profilePath, 'profile must cite evidence');
  }

  const scopesById = new Map();
  if (!Array.isArray(profile.scopes) || profile.scopes.length === 0) {
    push(errors, 'INFO-SCOPE-001', profilePath, 'profile must declare scopes');
  }
  for (const scope of Array.isArray(profile.scopes) ? profile.scopes : []) {
    const path = isObject(scope) && hasString(scope, 'id') ? scope.id : '<scope>';
    if (!isObject(scope)) {
      push(errors, 'INFO-SCOPE-002', path, 'scope must be an object');
      continue;
    }
    if (!hasString(scope, 'id')) {
      push(errors, 'INFO-SCOPE-003', path, 'scope must declare id');
    } else if (scopesById.has(scope.id)) {
      push(errors, 'INFO-SCOPE-004', scope.id, 'scope ids must be unique');
    } else {
      scopesById.set(scope.id, scope);
    }
    if (!nonEmptyStringArray(scope.predicateVocabulary)) {
      push(errors, 'INFO-SCOPE-005', path, 'scope must declare predicateVocabulary');
    }
    if (!nonEmptyStringArray(scope.closureRules)) {
      push(errors, 'INFO-SCOPE-006', path, 'scope must declare closureRules');
    }
    if (!nonEmptyStringArray(scope.entities)) {
      push(errors, 'INFO-SCOPE-007', path, 'scope must declare entities');
    }
    if (!CONSISTENCY_COMMITMENTS.has(scope.consistencyCommitment)) {
      push(errors, 'INFO-SCOPE-008', path, 'scope must declare consistencyCommitment');
    }
    if (scope.regime !== undefined && !REGIMES.has(scope.regime)) {
      push(errors, 'INFO-SCOPE-009', path, 'scope regime is not declared');
    }
    if (!nonEmptyStringArray(scope.evidence)) {
      push(errors, 'INFO-SCOPE-010', path, 'scope must cite evidence');
    }
  }

  const artifactsById = new Map();
  const aboutnessByArtifact = new Map();
  if (!Array.isArray(profile.artifacts) || profile.artifacts.length === 0) {
    push(errors, 'INFO-ARTIFACT-001', profilePath, 'profile must declare artifacts');
  }
  for (const artifact of Array.isArray(profile.artifacts) ? profile.artifacts : []) {
    const path = isObject(artifact) && hasString(artifact, 'id') ? artifact.id : '<artifact>';
    if (!isObject(artifact)) {
      push(errors, 'INFO-ARTIFACT-002', path, 'artifact must be an object');
      continue;
    }
    if (!hasString(artifact, 'id')) {
      push(errors, 'INFO-ARTIFACT-003', path, 'artifact must declare id');
    } else if (artifactsById.has(artifact.id)) {
      push(errors, 'INFO-ARTIFACT-004', artifact.id, 'artifact ids must be unique');
    } else {
      artifactsById.set(artifact.id, artifact);
    }
    if (!ARTIFACT_KINDS.has(artifact.kind)) {
      push(errors, 'INFO-ARTIFACT-005', path, 'artifact kind is not declared');
    }
    if (!hasString(artifact, 'receiver')) {
      push(errors, 'INFO-ARTIFACT-006', path, 'artifact must declare receiver');
    }
    const scope = scopesById.get(artifact.scope);
    if (!scope) {
      push(errors, 'INFO-ARTIFACT-007', path, 'artifact must reference a known scope');
    }
    if (!isObject(artifact.settlement) || !REGIMES.has(artifact.settlement.regime) || !hasString(artifact.settlement, 'ruleSystem') || !nonEmptyStringArray(artifact.settlement.frontier)) {
      push(errors, 'INFO-ARTIFACT-008', path, 'artifact must declare settlement regime, ruleSystem, and frontier');
    } else if (scope && !scope.closureRules.includes(artifact.settlement.ruleSystem)) {
      push(errors, 'INFO-ARTIFACT-009', path, 'artifact settlement ruleSystem must be admitted by its scope');
    }
    const uncertainty = artifact.uncertaintyReduction;
    if (!isObject(uncertainty) || !hasString(uncertainty, 'question') || !hasString(uncertainty, 'beforeState') || !hasString(uncertainty, 'afterState') || !nonEmptyStringArray(uncertainty.evidence)) {
      push(errors, 'INFO-ARTIFACT-010', path, 'artifact must declare uncertaintyReduction question, beforeState, afterState, and evidence');
    } else if (uncertainty.beforeState === uncertainty.afterState) {
      push(errors, 'INFO-ARTIFACT-011', path, 'information requires a changed beforeState and afterState');
    }
    const localAboutness = new Set();
    if (!Array.isArray(artifact.aboutness) || artifact.aboutness.length === 0) {
      push(errors, 'INFO-ABOUT-001', path, 'artifact must declare aboutness entries');
    }
    for (const aboutness of Array.isArray(artifact.aboutness) ? artifact.aboutness : []) {
      const aboutPath = isObject(aboutness) && hasString(aboutness, 'id') ? `${path}/${aboutness.id}` : `${path}/<aboutness>`;
      if (!isObject(aboutness) || !hasString(aboutness, 'id') || !hasString(aboutness, 'entity') || !hasString(aboutness, 'predicate') || !PARTICIPATION_KINDS.has(aboutness.participation) || !nonEmptyStringArray(aboutness.evidence)) {
        push(errors, 'INFO-ABOUT-002', aboutPath, 'aboutness entries must cite id, entity, predicate, participation, and evidence');
        continue;
      }
      if (localAboutness.has(aboutness.id)) {
        push(errors, 'INFO-ABOUT-003', aboutPath, 'aboutness ids must be unique within an artifact');
      }
      localAboutness.add(aboutness.id);
      if (scope && !scope.entities.includes(aboutness.entity)) {
        push(errors, 'INFO-ABOUT-004', aboutPath, 'aboutness entity must be admitted by the artifact scope');
      }
      if (scope && !scope.predicateVocabulary.includes(aboutness.predicate)) {
        push(errors, 'INFO-ABOUT-005', aboutPath, 'aboutness predicate must be admitted by the artifact scope');
      }
    }
    aboutnessByArtifact.set(artifact.id, localAboutness);
    if (!isObject(artifact.provenance) || !hasString(artifact.provenance, 'source') || !hasString(artifact.provenance, 'producer') || !hasString(artifact.provenance, 'history') || !nonEmptyStringArray(artifact.provenance.evidence)) {
      push(errors, 'INFO-PROVENANCE-001', path, 'artifact must declare provenance source, producer, history, and evidence');
    }
    if (artifact.kind === 'document') {
      if (!hasString(artifact.provenance ?? {}, 'preservationPurpose')) {
        push(errors, 'INFO-DOCUMENT-001', path, 'document artifacts must declare preservationPurpose');
      }
      if (!hasString(artifact.provenance ?? {}, 'arrangement')) {
        push(errors, 'INFO-DOCUMENT-002', path, 'document artifacts must declare arrangement');
      }
    }
    if (!nonEmptyStringArray(artifact.evidence)) {
      push(errors, 'INFO-ARTIFACT-012', path, 'artifact must cite evidence');
    }
  }

  for (const closure of Array.isArray(profile.aboutnessClosures) ? profile.aboutnessClosures : []) {
    const path = isObject(closure) && hasString(closure, 'artifact') ? closure.artifact : '<aboutness-closure>';
    if (!isObject(closure) || !hasString(closure, 'artifact') || !hasString(closure, 'sourceAboutness') || !hasString(closure, 'derivedEntity') || !hasString(closure, 'morphism') || !nonEmptyStringArray(closure.evidence)) {
      push(errors, 'INFO-CLOSURE-001', path, 'aboutness closure must cite artifact, sourceAboutness, derivedEntity, morphism, and evidence');
      continue;
    }
    if (!artifactsById.has(closure.artifact)) {
      push(errors, 'INFO-CLOSURE-002', path, 'aboutness closure must reference a known artifact');
      continue;
    }
    if (!aboutnessByArtifact.get(closure.artifact)?.has(closure.sourceAboutness)) {
      push(errors, 'INFO-CLOSURE-003', path, 'aboutness closure must reference a source aboutness entry on the artifact');
    }
  }

  for (const projection of Array.isArray(profile.shpProjections) ? profile.shpProjections : []) {
    const path = isObject(projection) && hasString(projection, 'id') ? projection.id : '<shp-projection>';
    if (!isObject(projection) || !hasString(projection, 'id') || !hasString(projection, 'sourceArtifact') || !hasString(projection, 'projectionMorphism') || !nonEmptyStringArray(projection.sourceFrontier) || !nonEmptyStringArray(projection.finiteSettlementEvidence) || !nonEmptyStringArray(projection.evidence)) {
      push(errors, 'INFO-SHP-001', path, 'SHP projection must cite id, sourceArtifact, sourceFrontier, projectionMorphism, finiteSettlementEvidence, and evidence');
      continue;
    }
    if (projection.targetKind !== 'semantic-hypertext-packet') {
      push(errors, 'INFO-SHP-002', path, 'SHP projection targetKind must be semantic-hypertext-packet');
    }
    const artifact = artifactsById.get(projection.sourceArtifact);
    if (!artifact) {
      push(errors, 'INFO-SHP-003', path, 'SHP projection must reference a known sourceArtifact');
      continue;
    }
    const frontier = new Set(artifact.settlement?.frontier ?? []);
    for (const rowId of projection.sourceFrontier ?? []) {
      if (!frontier.has(rowId)) {
        push(errors, 'INFO-SHP-004', path, `projection source frontier row ${rowId} is not in artifact settlement frontier`);
      }
    }
  }

  return errors;
}

export const assertValidInformationProfile = createProfileAssertion(validateInformationProfile);
