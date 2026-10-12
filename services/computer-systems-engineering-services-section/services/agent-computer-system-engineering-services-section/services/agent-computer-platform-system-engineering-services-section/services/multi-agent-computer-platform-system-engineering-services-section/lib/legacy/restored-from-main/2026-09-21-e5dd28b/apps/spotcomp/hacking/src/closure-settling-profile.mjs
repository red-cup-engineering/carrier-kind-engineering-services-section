import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const AXIOMS = new Set([
  'knowledge-monotone',
  'inflationary-unit',
  'lax-idempotent-multiplication',
  'predicate-reindexing-natural',
]);

const LOCAL_STAGES = new Set(['doing', 'learning', 'teaching']);
const ORDINAL_TO_REGIME = new Map([
  ['finite', 'strict'],
  ['omega', 'scott-continuous'],
  ['countable-transfinite', 'transfinite-bounded'],
  ['omega1-or-above', 'aperiodic'],
]);

import { isObject } from "./object-record.mjs";

export function validateClosureSettlingProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'CLS-PROFILE-001', path: '<profile>', message: 'closure settling profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'CLS-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'CLS-PROFILE-003');

  if (!isObject(profile.closure2Monad)) {
    push(errors, 'CLS-CL-001', path, 'closure2Monad must be declared');
  } else {
    const closure = profile.closure2Monad;
    if (!hasString(closure, 'id')) {
      push(errors, 'CLS-CL-002', 'closure2Monad', 'id must be declared');
    }
    if (closure.ambient2Category !== 'PrFib(L,C,E)') {
      push(errors, 'CLS-CL-003', 'closure2Monad', 'ambient2Category must be PrFib(L,C,E)');
    }
    if (!hasString(closure, 'operatorFamily')) {
      push(errors, 'CLS-CL-004', 'closure2Monad', 'operatorFamily must be declared');
    }
    const axioms = new Set(Array.isArray(closure.axioms) ? closure.axioms : []);
    for (const axiom of AXIOMS) {
      if (!axioms.has(axiom)) {
        push(errors, 'CLS-CL-005', 'closure2Monad', `missing closure axiom ${axiom}`);
      }
    }
    for (const axiom of axioms) {
      if (!AXIOMS.has(axiom)) {
        push(errors, 'CLS-CL-006', 'closure2Monad', `unknown closure axiom ${axiom}`);
      }
    }
    for (const key of ['algebrasAreClosedFibrations', 'propertyLike', 'commutesWithFibrationAxis']) {
      if (closure[key] !== true) {
        push(errors, 'CLS-CL-007', 'closure2Monad', `${key} must be true`);
      }
    }
    if (closure.actsOn !== 'fiber-values') {
      push(errors, 'CLS-CL-008', 'closure2Monad', 'closure axis must act on fiber-values');
    }
    checkEvidence(errors, closure.evidence, 'closure2Monad', 'CLS-CL-009');
  }

  if (!isObject(profile.settlingEndofunctor)) {
    push(errors, 'CLS-FU-001', path, 'settlingEndofunctor must be declared');
  } else {
    const functor = profile.settlingEndofunctor;
    if (!hasString(functor, 'id')) {
      push(errors, 'CLS-FU-002', 'settlingEndofunctor', 'id must be declared');
    }
    if (functor.ambient2Category !== 'PrFib(L,C,E)') {
      push(errors, 'CLS-FU-003', 'settlingEndofunctor', 'ambient2Category must be PrFib(L,C,E)');
    }
    if (functor.formula !== 'F_U(E)_tau = Cl(E) join_k u_tau') {
      push(errors, 'CLS-FU-004', 'settlingEndofunctor', 'settling endofunctor formula must match the source form');
    }
    for (const key of ['incrementSequenceNatural', 'closeThenMerge', 'mergeThenClose', 'orbitIsPredicationSettling']) {
      if (functor[key] !== true) {
        push(errors, 'CLS-FU-005', 'settlingEndofunctor', `${key} must be true`);
      }
    }
    if (!['pure-closure-after-last-increment', 'open'].includes(functor.eventualZeroIncrementsPolicy)) {
      push(errors, 'CLS-FU-006', 'settlingEndofunctor', 'eventualZeroIncrementsPolicy is not recognized');
    }
    if (!isObject(functor.closureMergeCommutation)) {
      push(errors, 'CLS-CMC-001', 'closureMergeCommutation', 'closureMergeCommutation must be declared');
    } else {
      const cmc = functor.closureMergeCommutation;
      if (cmc.equation !== 'cl(cl(X) join_k Y) = cl(X join_k Y)') {
        push(errors, 'CLS-CMC-002', 'closureMergeCommutation', 'closure-merge equation must match the source lemma');
      }
      if (!['lean-verified-lattice', 'declared', 'open'].includes(cmc.proofStatus)) {
        push(errors, 'CLS-CMC-003', 'closureMergeCommutation', 'proofStatus is not recognized');
      }
      if (cmc.bridgesTransientFormulas !== true) {
        push(errors, 'CLS-CMC-004', 'closureMergeCommutation', 'closure-merge must bridge transient formulas');
      }
      checkEvidence(errors, cmc.evidence, 'closureMergeCommutation', 'CLS-CMC-005');
    }
    checkEvidence(errors, functor.evidence, 'settlingEndofunctor', 'CLS-FU-007');
  }

  if (!isObject(profile.settlingApex)) {
    push(errors, 'CLS-APEX-001', path, 'settlingApex must be declared');
  } else {
    const apex = profile.settlingApex;
    if (apex.kind !== 'settling-apex') {
      push(errors, 'CLS-APEX-002', 'settlingApex', 'kind must be settling-apex');
    }
    if (apex.fixedPointTheorem !== 'Knaster-Tarski') {
      push(errors, 'CLS-APEX-003', 'settlingApex', 'fixedPointTheorem must be Knaster-Tarski');
    }
    for (const key of ['leastFixedPoint', 'closureFixed', 'uniqueAlgebraStructure']) {
      if (apex[key] !== true) {
        push(errors, 'CLS-APEX-004', 'settlingApex', `${key} must be true`);
      }
    }
    const expectedRegime = ORDINAL_TO_REGIME.get(apex.closureOrdinalClaim);
    if (expectedRegime && apex.regime !== expectedRegime) {
      push(errors, 'CLS-APEX-005', 'settlingApex', `closureOrdinalClaim ${apex.closureOrdinalClaim} requires regime ${expectedRegime}`);
    }
    if (apex.closureOrdinalClaim === 'unknown' && apex.regime !== 'unknown') {
      push(errors, 'CLS-APEX-006', 'settlingApex', 'unknown closure ordinal requires unknown regime');
    }
    for (const key of ['ruleSystemId', 'frontierId']) {
      if (!hasString(apex, key)) {
        push(errors, 'CLS-APEX-007', 'settlingApex', `${key} must be declared`);
      }
    }
    if (!['partial-prefix-only', 'final-only-with-fixed-point-proof'].includes(apex.boundedFuelPolicy)) {
      push(errors, 'CLS-APEX-008', 'settlingApex', 'boundedFuelPolicy is not recognized');
    }
    checkEvidence(errors, apex.evidence, 'settlingApex', 'CLS-APEX-009');
  }

  if (!isObject(profile.sigmaDeltaCycle)) {
    push(errors, 'CLS-SD-001', path, 'sigmaDeltaCycle must be declared');
  } else {
    const cycle = profile.sigmaDeltaCycle;
    if (cycle.order !== 'delta-pass -> sigma-pass') {
      push(errors, 'CLS-SD-002', 'sigmaDeltaCycle', 'sigma/delta cycle order must be delta-pass -> sigma-pass');
    }
    if (cycle.repeatsUntil !== 'no-new-entries-or-declared-nonfinal-trajectory') {
      push(errors, 'CLS-SD-003', 'sigmaDeltaCycle', 'repeatsUntil must name quiescence or nonfinal trajectory');
    }
    if (!isObject(cycle.deltaPass)) {
      push(errors, 'CLS-DELTA-001', 'deltaPass', 'deltaPass must be declared');
    } else {
      if (cycle.deltaPass.role !== 'evidence-accumulation') {
        push(errors, 'CLS-DELTA-002', 'deltaPass', 'delta pass role must be evidence accumulation');
      }
      for (const key of ['knowledgeJoin', 'crdtMergeView', 'topAtContestation']) {
        if (cycle.deltaPass[key] !== true) {
          push(errors, 'CLS-DELTA-003', 'deltaPass', `${key} must be true`);
        }
      }
      checkEvidence(errors, cycle.deltaPass.evidence, 'deltaPass', 'CLS-DELTA-004');
    }
    if (!isObject(cycle.sigmaPass)) {
      push(errors, 'CLS-SIGMA-001', 'sigmaPass', 'sigmaPass must be declared');
    } else {
      if (cycle.sigmaPass.role !== 'contestation-resolution') {
        push(errors, 'CLS-SIGMA-002', 'sigmaPass', 'sigma pass role must be contestation resolution');
      }
      for (const key of ['tensorResolution', 'emitsOnlyChangedEntries', 'requiresTopForStateChange']) {
        if (cycle.sigmaPass[key] !== true) {
          push(errors, 'CLS-SIGMA-003', 'sigmaPass', `${key} must be true`);
        }
      }
      checkEvidence(errors, cycle.sigmaPass.evidence, 'sigmaPass', 'CLS-SIGMA-004');
    }
    checkEvidence(errors, cycle.evidence, 'sigmaDeltaCycle', 'CLS-SD-004');
  }

  if (!isObject(profile.localSettling)) {
    push(errors, 'CLS-LOCAL-001', path, 'localSettling must be declared');
  } else {
    const local = profile.localSettling;
    for (const key of ['subSettlingOfUniversal', 'boundedAboveByUniversal', 'nonSigmaDeltaContentRejected', 'modeledPlayerStateAllowed']) {
      if (local[key] !== true) {
        push(errors, 'CLS-LOCAL-002', 'localSettling', `${key} must be true`);
      }
    }
    if (!hasString(local, 'restrictionBasis')) {
      push(errors, 'CLS-LOCAL-003', 'localSettling', 'restrictionBasis must be declared');
    }
    const stages = new Set(Array.isArray(local.localStages) ? local.localStages : []);
    for (const stage of LOCAL_STAGES) {
      if (!stages.has(stage)) {
        push(errors, 'CLS-LOCAL-004', 'localSettling', `missing local stage ${stage}`);
      }
    }
    for (const stage of stages) {
      if (!LOCAL_STAGES.has(stage)) {
        push(errors, 'CLS-LOCAL-005', 'localSettling', `unknown local stage ${stage}`);
      }
    }
    checkEvidence(errors, local.evidence, 'localSettling', 'CLS-LOCAL-006');
  }

  if (!isObject(profile.finiteBoundary)) {
    push(errors, 'CLS-FINITE-001', path, 'finiteBoundary must be declared');
  } else {
    for (const key of [
      'finiteSettlementDownstream',
      'finalRequiresApexEvidence',
      'boundedFuelIsPartial',
      'projectionArtifactsSeparate',
      'fourProjectionOnly',
    ]) {
      if (profile.finiteBoundary[key] !== true) {
        push(errors, 'CLS-FINITE-002', 'finiteBoundary', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.finiteBoundary.evidence, 'finiteBoundary', 'CLS-FINITE-003');
  }

  return errors;
}

export const assertValidClosureSettlingProfile = createProfileAssertion(validateClosureSettlingProfile);
