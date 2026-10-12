import { createProfileAssertion, push } from "./profile-admission.mjs";
import { nonEmptyStringArray, stringArray } from "./primitive-admission.mjs";
const STATUSES = new Set(['candidate', 'open', 'proved']);
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}



function validFileClass(value) {
  return isObject(value)
    && value.regularFile === true
    && value.encoding === 'utf-8'
    && nonEmptyStringArray(value.evidence);
}

function validRelativeSlugPath(path) {
  if (path.startsWith('/') || path.includes('//') || path.includes('..')) {
    return false;
  }
  return path.split('/').every((segment) => segment.includes('.') || SLUG_PATTERN.test(segment));
}

export function validatePosixProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'PX-PROFILE-001', path: '<profile>', message: 'POSIX profile must be an object' }];
  }

  if (!hasString(profile, 'profileId')) {
    push(errors, 'PX-PROFILE-002', '<profile>', 'profileId must be a non-empty string');
  }
  const profilePath = profile.profileId ?? '<profile>';
  if (!STATUSES.has(profile.status)) {
    push(errors, 'PX-PROFILE-003', profilePath, 'status must be candidate, open, or proved');
  }
  if (!nonEmptyStringArray(profile.evidence)) {
    push(errors, 'PX-PROFILE-004', profilePath, 'profile must cite evidence');
  }

  if (!isObject(profile.catalogRoot) || !hasString(profile.catalogRoot, 'path') || profile.catalogRoot.singleRoot !== true || !nonEmptyStringArray(profile.catalogRoot.evidence)) {
    push(errors, 'PX-ROOT-001', profilePath, 'catalogRoot must declare one root path and evidence');
  }
  if (isObject(profile.catalogRoot) && hasString(profile.catalogRoot, 'path') && !validRelativeSlugPath(profile.catalogRoot.path)) {
    push(errors, 'PX-ROOT-002', profile.catalogRoot.path, 'catalogRoot path must be relative and slug-shaped');
  }

  const pathContract = profile.pathContract;
  if (!isObject(pathContract)) {
    push(errors, 'PX-PATH-001', profilePath, 'pathContract must be an object');
  } else {
    if (pathContract.segmentPattern !== '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$') {
      push(errors, 'PX-PATH-002', profilePath, 'pathContract must use the declared slug segment pattern');
    }
    if (pathContract.rootInitial !== true || pathContract.containmentMorphism !== true) {
      push(errors, 'PX-PATH-003', profilePath, 'pathContract must declare root initiality and containment morphisms');
    }
    if (pathContract.identityRule !== 'ancestor-chain-plus-inbound-references') {
      push(errors, 'PX-PATH-004', profilePath, 'path identity must use ancestor chain plus inbound references');
    }
    if (!nonEmptyStringArray(pathContract.samplePaths)) {
      push(errors, 'PX-PATH-005', profilePath, 'pathContract must provide samplePaths');
    } else {
      for (const samplePath of pathContract.samplePaths) {
        if (!validRelativeSlugPath(samplePath)) {
          push(errors, 'PX-PATH-006', samplePath, 'sample path must be relative and slug-shaped');
        }
      }
    }
    if (!nonEmptyStringArray(pathContract.evidence)) {
      push(errors, 'PX-PATH-007', profilePath, 'pathContract must cite evidence');
    }
  }

  const fileContract = profile.fileContract;
  if (!isObject(fileContract)) {
    push(errors, 'PX-FILE-001', profilePath, 'fileContract must be an object');
  } else {
    if (!validFileClass(fileContract.schemas)) {
      push(errors, 'PX-FILE-002', profilePath, 'schemas must be regular utf-8 files with evidence');
    }
    if (!validFileClass(fileContract.logs)) {
      push(errors, 'PX-FILE-003', profilePath, 'logs must be regular utf-8 files with evidence');
    } else {
      if (fileContract.logs.recordDelimiter !== 'lf') {
        push(errors, 'PX-FILE-004', profilePath, 'logs must declare LF record delimiter');
      }
      if (fileContract.logs.rejectsEmptyLines !== true || fileContract.logs.rejectsCommentLines !== true) {
        push(errors, 'PX-FILE-005', profilePath, 'logs must reject empty and comment lines');
      }
    }
    if (!validFileClass(fileContract.scripts)) {
      push(errors, 'PX-FILE-006', profilePath, 'scripts must be regular utf-8 files with evidence');
    } else {
      if (fileContract.scripts.moduleSystem !== 'esm' || fileContract.scripts.defaultExportRequired !== true) {
        push(errors, 'PX-FILE-007', profilePath, 'scripts must declare ESM loading and default export');
      }
    }
  }

  const appendContract = profile.appendContract;
  if (!isObject(appendContract)) {
    push(errors, 'PX-APPEND-001', profilePath, 'appendContract must be an object');
  } else {
    if (appendContract.appendOnly !== true) {
      push(errors, 'PX-APPEND-002', profilePath, 'appendContract must be append-only');
    }
    if (appendContract.singleRecordAtomicity !== 'declared') {
      push(errors, 'PX-APPEND-003', profilePath, 'appendContract must declare single-record atomicity');
    }
    if (appendContract.orderingScope !== 'per-log') {
      push(errors, 'PX-APPEND-004', profilePath, 'append ordering scope must be per-log');
    }
    if (appendContract.partialWriteBehavior !== 'surface-error') {
      push(errors, 'PX-APPEND-005', profilePath, 'partial writes must surface errors');
    }
    if (!nonEmptyStringArray(appendContract.evidence)) {
      push(errors, 'PX-APPEND-006', profilePath, 'appendContract must cite evidence');
    }
  }

  const processContract = profile.processContract;
  if (!isObject(processContract)) {
    push(errors, 'PX-PROCESS-001', profilePath, 'processContract must be an object');
  } else {
    for (const key of ['spawn', 'supervise', 'dispatch', 'exitStatus']) {
      if (processContract[key] !== true) {
        push(errors, 'PX-PROCESS-002', profilePath, `processContract.${key} must be true`);
      }
    }
    if (!isObject(processContract.stdio) || processContract.stdio.stdin !== true || processContract.stdio.stdout !== true || processContract.stdio.stderr !== true) {
      push(errors, 'PX-PROCESS-003', profilePath, 'processContract must bind stdin, stdout, and stderr');
    }
    if (!isObject(processContract.signals) || processContract.signals.forwarding !== true || !nonEmptyStringArray(processContract.signals.names)) {
      push(errors, 'PX-PROCESS-004', profilePath, 'processContract must declare signal forwarding and signal names');
    }
    if (!nonEmptyStringArray(processContract.evidence)) {
      push(errors, 'PX-PROCESS-005', profilePath, 'processContract must cite evidence');
    }
  }

  const failureContract = profile.failureContract;
  if (!isObject(failureContract)) {
    push(errors, 'PX-FAILURE-001', profilePath, 'failureContract must be an object');
  } else {
    for (const key of ['validationFailure', 'ioFailure', 'processFailure']) {
      if (failureContract[key] !== 'surface-error') {
        push(errors, 'PX-FAILURE-002', profilePath, `${key} must surface an error`);
      }
    }
    if (failureContract.silentSkipForbidden !== true) {
      push(errors, 'PX-FAILURE-003', profilePath, 'silent skip must be forbidden');
    }
    if (!nonEmptyStringArray(failureContract.evidence)) {
      push(errors, 'PX-FAILURE-004', profilePath, 'failureContract must cite evidence');
    }
  }

  return errors;
}

export const assertValidPosixProfile = createProfileAssertion(validatePosixProfile);
