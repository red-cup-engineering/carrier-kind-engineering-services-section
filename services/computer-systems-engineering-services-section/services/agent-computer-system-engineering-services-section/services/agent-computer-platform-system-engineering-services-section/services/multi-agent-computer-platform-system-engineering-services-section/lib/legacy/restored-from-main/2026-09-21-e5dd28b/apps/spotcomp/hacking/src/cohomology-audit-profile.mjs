import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REGIMES = new Set(['strict', 'scott-continuous', 'transfinite-bounded', 'aperiodic']);
const COMPONENTS = new Set(['truth', 'inconsistency']);
const SLOT_NAMES = new Set(['H1_t', 'H1_top']);
const CLAIMS = new Set(['vanishes', 'nonzero', 'not-computed', 'unknown']);
const VERIFICATIONS = new Set(['proved', 'computed', 'declared', 'not-computed', 'unverified']);
const SOURCE_CLASSES = new Set(['federation-conflict', 'attack-surface', 'repair-source', 'local-inference', 'cross-source']);
const K4_SECTORS = new Set(['identity', 'negation', 'conflation', 'negation-conflation']);
const UNVERIFIABLE = new Set(['not-computed', 'unverified']);

import { isObject } from "./object-record.mjs";

export function validateCohomologyAuditProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'COH-PROFILE-001', path: '<profile>', message: 'cohomology audit profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'COH-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  if (!hasString(profile, 'scope')) {
    push(errors, 'COH-PROFILE-003', path, 'scope must be declared');
  }
  if (!REGIMES.has(profile.regime)) {
    push(errors, 'COH-PROFILE-004', path, 'regime is not recognized');
  }
  checkEvidence(errors, profile.evidence, path, 'COH-PROFILE-005');

  const gradeByM = new Map();
  if (!Array.isArray(profile.designationGrades) || profile.designationGrades.length === 0) {
    push(errors, 'COH-GRADE-001', path, 'designationGrades must be non-empty');
  } else {
    for (const grade of profile.designationGrades) {
      const gradePath = isObject(grade) ? `m=${String(grade.m)}` : '<grade>';
      if (!isObject(grade)) {
        push(errors, 'COH-GRADE-002', gradePath, 'designation grade must be an object');
        continue;
      }
      if (![0, 1].includes(grade.m)) {
        push(errors, 'COH-GRADE-003', gradePath, 'designation grade m must be 0 or 1');
      } else if (gradeByM.has(grade.m)) {
        push(errors, 'COH-GRADE-004', gradePath, 'designation grade m values must be unique');
      } else {
        gradeByM.set(grade.m, grade);
      }
      if (!COMPONENTS.has(grade.component)) {
        push(errors, 'COH-GRADE-005', gradePath, 'component must be truth or inconsistency');
      }
      checkEvidence(errors, grade.evidence, gradePath, 'COH-GRADE-006');
    }
    if (gradeByM.get(0)?.component !== 'truth') {
      push(errors, 'COH-GRADE-007', path, 'm=0 must be the truth component');
    }
    if (gradeByM.get(1)?.component !== 'inconsistency') {
      push(errors, 'COH-GRADE-008', path, 'm=1 must be the inconsistency component');
    }
  }

  const degrees = new Set();
  if (!Array.isArray(profile.cohomologicalDegrees) || profile.cohomologicalDegrees.length === 0) {
    push(errors, 'COH-DEGREE-001', path, 'cohomologicalDegrees must be non-empty');
  } else {
    for (const degree of profile.cohomologicalDegrees) {
      const degreePath = isObject(degree) ? `n=${String(degree.n)}` : '<degree>';
      if (!isObject(degree)) {
        push(errors, 'COH-DEGREE-002', degreePath, 'cohomological degree must be an object');
        continue;
      }
      if (!Number.isInteger(degree.n) || degree.n < 0) {
        push(errors, 'COH-DEGREE-003', degreePath, 'cohomological degree n must be a non-negative integer');
      } else {
        degrees.add(degree.n);
      }
      checkEvidence(errors, degree.evidence, degreePath, 'COH-DEGREE-004');
    }
    if (!degrees.has(1)) {
      push(errors, 'COH-DEGREE-005', path, 'cohomological degree declarations must include n=1');
    }
  }

  if (!isObject(profile.sheafDecomposition)) {
    push(errors, 'COH-SHEAF-001', path, 'sheafDecomposition must be declared');
  } else {
    const sheaf = profile.sheafDecomposition;
    if (sheaf.truthComponent !== 'F_U^(t)' || sheaf.inconsistencyComponent !== 'F_U^(top)') {
      push(errors, 'COH-SHEAF-002', 'sheafDecomposition', 'sheaf decomposition must identify truth and inconsistency components');
    }
    if (sheaf.shortExactSequence !== '0 -> F_U^(t) -> F_U^(k) -> F_U^(top) -> 0') {
      push(errors, 'COH-SHEAF-003', 'sheafDecomposition', 'short exact sequence must be declared');
    }
    checkEvidence(errors, sheaf.evidence, 'sheafDecomposition', 'COH-SHEAF-004');
  }

  const slots = new Map();
  let hasUnverifiableSlot = false;
  if (!Array.isArray(profile.h1Slots) || profile.h1Slots.length === 0) {
    push(errors, 'COH-H1-001', path, 'h1Slots must be non-empty');
  } else {
    for (const slot of profile.h1Slots) {
      const slotPath = isObject(slot) && hasString(slot, 'name') ? slot.name : '<h1-slot>';
      if (!isObject(slot)) {
        push(errors, 'COH-H1-002', slotPath, 'H1 slot must be an object');
        continue;
      }
      if (!SLOT_NAMES.has(slot.name)) {
        push(errors, 'COH-H1-003', slotPath, 'slot name must be H1_t or H1_top');
      } else if (slots.has(slot.name)) {
        push(errors, 'COH-H1-004', slotPath, 'H1 slot names must be unique');
      } else {
        slots.set(slot.name, slot);
      }
      if (slot.n !== 1) {
        push(errors, 'COH-H1-005', slotPath, 'H1 slot must have n=1');
      }
      if (!CLAIMS.has(slot.claim)) {
        push(errors, 'COH-H1-006', slotPath, 'claim is not recognized');
      }
      if (!VERIFICATIONS.has(slot.verification)) {
        push(errors, 'COH-H1-007', slotPath, 'verification is not recognized');
      }
      if (UNVERIFIABLE.has(slot.verification) || slot.claim === 'not-computed' || slot.claim === 'unknown') {
        hasUnverifiableSlot = true;
      }
      if (slot.name === 'H1_t' && (slot.m !== 0 || slot.component !== 'truth')) {
        push(errors, 'COH-H1-008', slotPath, 'H1_t must be m=0 truth component');
      }
      if (slot.name === 'H1_top' && (slot.m !== 1 || slot.component !== 'inconsistency')) {
        push(errors, 'COH-H1-009', slotPath, 'H1_top must be m=1 inconsistency component');
      }
      if ((profile.regime === 'strict' || profile.regime === 'scott-continuous') && slot.name === 'H1_top' && slot.claim === 'nonzero') {
        push(errors, 'COH-H1-010', slotPath, 'strict and scott-continuous regimes cannot declare nonzero H1_top');
      }
      checkEvidence(errors, slot.evidence, slotPath, 'COH-H1-011');
    }
    if (!slots.has('H1_t')) {
      push(errors, 'COH-H1-012', path, 'profile must declare H1_t');
    }
    if (!slots.has('H1_top')) {
      push(errors, 'COH-H1-013', path, 'profile must declare H1_top');
    }
  }

  if (!isObject(profile.inconsistencyRecord)) {
    push(errors, 'COH-RECORD-001', path, 'inconsistencyRecord must be declared');
  } else {
    const record = profile.inconsistencyRecord;
    const recordPath = hasString(record, 'id') ? record.id : 'inconsistencyRecord';
    if (!hasString(record, 'scope') || record.scope !== profile.scope) {
      push(errors, 'COH-RECORD-002', recordPath, 'inconsistency record scope must match profile scope');
    }
    if (!hasString(record, 'versionHash')) {
      push(errors, 'COH-RECORD-003', recordPath, 'versionHash must be declared');
    }
    if (!Array.isArray(record.topCells)) {
      push(errors, 'COH-RECORD-004', recordPath, 'topCells must be an array');
    } else {
      const ids = new Set();
      for (const cell of record.topCells) {
        const cellPath = isObject(cell) && hasString(cell, 'id') ? cell.id : '<top-cell>';
        if (!isObject(cell)) {
          push(errors, 'COH-TOPCELL-001', cellPath, 'top cell must be an object');
          continue;
        }
        if (!hasString(cell, 'id')) {
          push(errors, 'COH-TOPCELL-002', cellPath, 'top cell id must be declared');
        } else if (ids.has(cell.id)) {
          push(errors, 'COH-TOPCELL-003', cellPath, 'top cell ids must be unique');
        } else {
          ids.add(cell.id);
        }
        for (const key of ['cell', 'stageOrdinal']) {
          if (!hasString(cell, key)) {
            push(errors, 'COH-TOPCELL-004', cellPath, `${key} must be declared`);
          }
        }
        if (!SOURCE_CLASSES.has(cell.sourceClassification)) {
          push(errors, 'COH-TOPCELL-005', cellPath, 'sourceClassification is not recognized');
        }
        if (!nonEmptyStringArray(cell.witnesses)) {
          push(errors, 'COH-TOPCELL-006', cellPath, 'top cells must cite witnesses');
        }
        if (cell.resolved === true && !hasString(cell, 'repairResolution')) {
          push(errors, 'COH-TOPCELL-007', cellPath, 'resolved top cells must cite repairResolution');
        }
        checkEvidence(errors, cell.evidence, cellPath, 'COH-TOPCELL-008');
      }
    }
    if (isObject(record.cohomologyCache)) {
      if (record.cohomologyCache.versionHash !== record.versionHash) {
        push(errors, 'COH-CACHE-001', recordPath, 'cohomology cache versionHash must match record versionHash');
      }
      if (!nonEmptyStringArray(record.cohomologyCache.slots)) {
        push(errors, 'COH-CACHE-002', recordPath, 'cohomology cache must name cached slots');
      }
      checkEvidence(errors, record.cohomologyCache.evidence, recordPath, 'COH-CACHE-003');
    }
    checkEvidence(errors, record.evidence, recordPath, 'COH-RECORD-005');
  }

  if (profile.fiberSpecialization === 'FOUR') {
    if (!isObject(profile.k4Projection)) {
      push(errors, 'COH-K4-001', path, 'FOUR-specialized profiles must declare k4Projection');
    } else {
      const k4 = profile.k4Projection;
      if (k4.projectionOnly !== true || k4.nonAuthoritative !== true) {
        push(errors, 'COH-K4-002', 'k4Projection', 'K4 projection must be projection-only and non-authoritative');
      }
      const sectors = new Set(Array.isArray(k4.sectors) ? k4.sectors : []);
      for (const sector of K4_SECTORS) {
        if (!sectors.has(sector)) {
          push(errors, 'COH-K4-003', 'k4Projection', `missing K4 sector ${sector}`);
        }
      }
      checkEvidence(errors, k4.evidence, 'k4Projection', 'COH-K4-004');
    }
  }

  if (!isObject(profile.receiverPolicy)) {
    push(errors, 'COH-POLICY-001', path, 'receiverPolicy must be declared');
  } else {
    const policy = profile.receiverPolicy;
    if (!['reject', 'accept-as-trace-only', 'accept-as-informative-projection', 'accept-as-final'].includes(policy.unverifiableClaimBehavior)) {
      push(errors, 'COH-POLICY-002', 'receiverPolicy', 'unverifiableClaimBehavior is not recognized');
    }
    if (!['reject', 'accept-as-trace-only', 'accept-as-informative-projection'].includes(policy.endpointOnlyBehavior)) {
      push(errors, 'COH-POLICY-003', 'receiverPolicy', 'endpointOnlyBehavior is not recognized');
    }
    if (hasUnverifiableSlot && policy.unverifiableClaimBehavior === 'accept-as-final') {
      push(errors, 'COH-POLICY-004', 'receiverPolicy', 'unverifiable cohomology claims cannot be accepted as final');
    }
    if ((profile.regime === 'transfinite-bounded' || profile.regime === 'aperiodic') && policy.endpointOnlyBehavior !== 'reject') {
      push(errors, 'COH-POLICY-005', 'receiverPolicy', 'transfinite-bounded and aperiodic endpoint-only cohomology evidence must be rejected');
    }
    checkEvidence(errors, policy.evidence, 'receiverPolicy', 'COH-POLICY-006');
  }

  return errors;
}

export const assertValidCohomologyAuditProfile = createProfileAssertion(validateCohomologyAuditProfile);
