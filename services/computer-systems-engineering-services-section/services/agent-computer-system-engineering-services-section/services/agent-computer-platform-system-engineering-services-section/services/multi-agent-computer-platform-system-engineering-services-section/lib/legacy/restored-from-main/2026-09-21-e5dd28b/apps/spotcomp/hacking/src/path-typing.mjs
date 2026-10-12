import { createProfileAssertion, push } from "./profile-admission.mjs";
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const ROLES = new Set([
  'catalog-root',
  'category-root',
  'generator',
  'codomain-object',
  'schema-witness',
  'trace-log',
  'script-witness',
  'projection-artifact',
  'support-artifact',
]);

const STATUSES = new Set(['proved', 'candidate', 'open', 'rejected']);
const VARIANCES = new Set(['extension', 'restriction', 'coincidence', 'unknown']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}

export function validatePathRoleDeclaration(declaration) {
  const errors = [];
  const path = isObject(declaration) && typeof declaration.path === 'string'
    ? declaration.path
    : '<unknown>';

  if (!isObject(declaration)) {
    return [{ code: 'PT-DECL-001', path, message: 'path-role declaration must be an object' }];
  }
  if (!hasString(declaration, 'path')) {
    push(errors, 'PT-DECL-002', path, 'path must be a non-empty string');
  }
  if (!ROLES.has(declaration.role)) {
    push(errors, 'PT-DECL-003', path, `role must be one of ${[...ROLES].join(', ')}`);
  }
  if (!STATUSES.has(declaration.status)) {
    push(errors, 'PT-DECL-004', path, `status must be one of ${[...STATUSES].join(', ')}`);
  }
  if (!Array.isArray(declaration.evidence) || declaration.evidence.length === 0 || declaration.evidence.some((item) => typeof item !== 'string' || item.length === 0)) {
    push(errors, 'PT-DECL-005', path, 'evidence must be a non-empty array of strings');
  }
  if (typeof declaration.thingSlug === 'string' && !SLUG_PATTERN.test(declaration.thingSlug)) {
    push(errors, 'PT-DECL-006', path, 'thingSlug must be a kebab-case slug');
  }

  switch (declaration.role) {
    case 'generator':
      if (!hasString(declaration, 'domain')) {
        push(errors, 'PT-GEN-001', path, 'generator must declare domain');
      }
      if (!hasString(declaration, 'codomain')) {
        push(errors, 'PT-GEN-002', path, 'generator must declare codomain');
      }
      if (!VARIANCES.has(declaration.generatorVariance)) {
        push(errors, 'PT-GEN-003', path, `generatorVariance must be one of ${[...VARIANCES].join(', ')}`);
      }
      if (declaration.generatorVariance === 'unknown' && declaration.status !== 'open') {
        push(errors, 'PT-GEN-004', path, 'unknown generator variance requires open status');
      }
      break;
    case 'codomain-object':
      if (!hasString(declaration, 'generator') && (!Array.isArray(declaration.openObligations) || declaration.openObligations.length === 0)) {
        push(errors, 'PT-COD-001', path, 'codomain-object must cite a generator or open obligation');
      }
      break;
    case 'schema-witness':
      if (!hasString(declaration, 'thingSlug')) {
        push(errors, 'PT-SCHEMA-001', path, 'schema-witness must declare thingSlug');
      }
      if (!hasString(declaration, 'schemaPath')) {
        push(errors, 'PT-SCHEMA-002', path, 'schema-witness must declare schemaPath');
      }
      break;
    case 'trace-log':
      if (!hasString(declaration, 'thingSlug')) {
        push(errors, 'PT-LOG-001', path, 'trace-log must declare thingSlug');
      }
      if (!hasString(declaration, 'traceLogPath')) {
        push(errors, 'PT-LOG-002', path, 'trace-log must declare traceLogPath');
      }
      break;
    case 'script-witness':
      if (!hasString(declaration, 'thingSlug')) {
        push(errors, 'PT-SCRIPT-001', path, 'script-witness must declare thingSlug');
      }
      if (!hasString(declaration, 'scriptPath')) {
        push(errors, 'PT-SCRIPT-002', path, 'script-witness must declare scriptPath');
      }
      break;
    case 'projection-artifact':
      if (!Array.isArray(declaration.sourceFrontier) || declaration.sourceFrontier.length === 0) {
        push(errors, 'PT-PROJ-001', path, 'projection-artifact must cite at least one source frontier');
      }
      if (!hasString(declaration, 'projectionMorphism')) {
        push(errors, 'PT-PROJ-002', path, 'projection-artifact must cite projectionMorphism');
      }
      break;
    case 'support-artifact':
      if (declaration.authoritative !== false) {
        push(errors, 'PT-SUPPORT-001', path, 'support-artifact must be non-authoritative');
      }
      break;
    default:
      break;
  }

  return errors;
}

export function validatePathRoleManifest(manifest) {
  if (!Array.isArray(manifest)) {
    return [{ code: 'PT-MANIFEST-001', path: '<manifest>', message: 'path-role manifest must be an array' }];
  }

  const errors = manifest.flatMap((declaration) => validatePathRoleDeclaration(declaration));
  const rolesByPath = new Map();
  for (const declaration of manifest) {
    if (!isObject(declaration) || typeof declaration.path !== 'string' || !ROLES.has(declaration.role)) {
      continue;
    }
    const roles = rolesByPath.get(declaration.path) ?? new Set();
    roles.add(declaration.role);
    rolesByPath.set(declaration.path, roles);
  }
  for (const [path, roles] of rolesByPath) {
    if (roles.size > 1) {
      push(errors, 'PT-MANIFEST-002', path, `path declares multiple primary roles: ${[...roles].join(', ')}`);
    }
  }
  return errors;
}

export const assertValidPathRoleManifest = createProfileAssertion(validatePathRoleManifest);
