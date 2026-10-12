import { createProfileAssertion, push } from "./profile-admission.mjs";
import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { assertEavtRow, rowId } from './trace.mjs';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RESOURCE_KINDS = new Set(['object', 'predicate', 'morphism']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}


function joinPath(base, suffix) {
  return base === '.' ? suffix : `${base}/${suffix}`;
}

function expectedSchemaPath(resource) {
  return joinPath(resource.path, `${resource.slug}.schema.json`);
}

function expectedLogPath(resource) {
  return joinPath(resource.path, `${resource.slug}.jsonl`);
}

function expectedScriptPath(resource) {
  return joinPath(joinPath(resource.path, 'scripts'), `${resource.slug}.mjs`);
}

function hasBadPathSegment(path) {
  return path.split('/').some((segment) => segment.length === 0 || segment === '..' || (segment !== '.' && !SLUG_PATTERN.test(segment)));
}

export function validateTrcLayout(layout) {
  const errors = [];
  if (!isObject(layout)) {
    return [{ code: 'TRC-LAYOUT-001', path: '<layout>', message: 'TRC layout declaration must be an object' }];
  }
  if (!hasString(layout, 'catalogRoot')) {
    push(errors, 'TRC-LAYOUT-002', '<layout>', 'catalogRoot must be a non-empty string');
  }
  if (layout.moduleType !== 'module') {
    push(errors, 'TRC-LAYOUT-003', '<layout>', 'moduleType must be module');
  }
  if (!isObject(layout.imports)) {
    push(errors, 'TRC-LAYOUT-004', '<layout>', 'imports must be an object');
  }
  if (!Array.isArray(layout.resources) || layout.resources.length === 0) {
    push(errors, 'TRC-LAYOUT-005', '<layout>', 'resources must be a non-empty array');
    return errors;
  }
  if (!nonEmptyStringArray(layout.evidence)) {
    push(errors, 'TRC-LAYOUT-006', '<layout>', 'layout must cite evidence');
  }

  const resourcesBySlug = new Map();
  const logOwnerByPath = new Map();
  for (const resource of layout.resources) {
    const path = isObject(resource) && hasString(resource, 'slug') ? resource.slug : '<resource>';
    if (!isObject(resource)) {
      push(errors, 'TRC-RESOURCE-001', path, 'resource must be an object');
      continue;
    }
    if (!hasString(resource, 'slug') || !SLUG_PATTERN.test(resource.slug)) {
      push(errors, 'TRC-RESOURCE-002', path, 'resource slug must be a kebab-case slug');
    } else if (resourcesBySlug.has(resource.slug)) {
      push(errors, 'TRC-RESOURCE-003', resource.slug, 'resource slugs must be unique');
    } else {
      resourcesBySlug.set(resource.slug, resource);
    }
    if (!RESOURCE_KINDS.has(resource.kind)) {
      push(errors, 'TRC-RESOURCE-004', path, 'resource kind must be object, predicate, or morphism');
    }
    if (!hasString(resource, 'path') || hasBadPathSegment(resource.path)) {
      push(errors, 'TRC-RESOURCE-005', path, 'resource path must use POSIX-safe slug segments');
    }
    if (resource.schemaPath !== expectedSchemaPath(resource)) {
      push(errors, 'TRC-RESOURCE-006', path, `schemaPath must be ${expectedSchemaPath(resource)}`);
    }
    if (resource.logPath !== expectedLogPath(resource)) {
      push(errors, 'TRC-RESOURCE-007', path, `logPath must be ${expectedLogPath(resource)}`);
    } else if (logOwnerByPath.has(resource.logPath)) {
      push(errors, 'TRC-RESOURCE-008', path, `logPath is already owned by ${logOwnerByPath.get(resource.logPath)}`);
    } else {
      logOwnerByPath.set(resource.logPath, resource.slug);
    }
    if (!nonEmptyStringArray(resource.evidence)) {
      push(errors, 'TRC-RESOURCE-009', path, 'resource must cite evidence');
    }
    if (resource.kind === 'morphism') {
      if (resource.scriptPath !== expectedScriptPath(resource)) {
        push(errors, 'TRC-RESOURCE-010', path, `morphism scriptPath must be ${expectedScriptPath(resource)}`);
      }
      if (resource.monotone !== true) {
        push(errors, 'TRC-RESOURCE-011', path, 'morphism resources must declare monotone true');
      }
    } else if (resource.scriptPath !== undefined) {
      push(errors, 'TRC-RESOURCE-012', path, 'only morphism resources may declare scriptPath');
    }
  }

  if (isObject(layout.imports)) {
    for (const resource of resourcesBySlug.values()) {
      const schemaAlias = `#schema/${resource.slug}`;
      if (layout.imports[schemaAlias] !== resource.schemaPath) {
        push(errors, 'TRC-IMPORT-001', resource.slug, `${schemaAlias} must resolve to ${resource.schemaPath}`);
      }
      if (resource.kind === 'morphism') {
        const scriptAlias = `#script/${resource.slug}`;
        if (layout.imports[scriptAlias] !== resource.scriptPath) {
          push(errors, 'TRC-IMPORT-002', resource.slug, `${scriptAlias} must resolve to ${resource.scriptPath}`);
        }
      }
    }
  }

  if (!Array.isArray(layout.filings)) {
    push(errors, 'TRC-FILING-001', '<layout>', 'filings must be an array');
  }
  for (const filing of Array.isArray(layout.filings) ? layout.filings : []) {
    const path = isObject(filing) && isObject(filing.row) ? `${filing.row.e ?? '?'}:${filing.row.a ?? '?'}` : '<filing>';
    if (!isObject(filing)) {
      push(errors, 'TRC-FILING-002', path, 'filing must be an object');
      continue;
    }
    try {
      assertEavtRow(filing.row);
    } catch (error) {
      push(errors, 'TRC-FILING-003', path, error.message);
      continue;
    }
    const id = rowId(filing.row);
    if (filing.rowId !== undefined && filing.rowId !== id) {
      push(errors, 'TRC-FILING-004', path, 'declared rowId does not match canonical row identity');
    }
    const subject = resourcesBySlug.get(filing.row.e);
    const predicate = resourcesBySlug.get(filing.row.a);
    if (!subject) {
      push(errors, 'TRC-FILING-005', path, `subject resource ${filing.row.e} is not declared`);
    }
    if (!predicate) {
      push(errors, 'TRC-FILING-006', path, `predicate resource ${filing.row.a} is not declared`);
    }
    if (subject && filing.subjectLogPath !== subject.logPath) {
      push(errors, 'TRC-FILING-007', path, `subject filing must be ${subject.logPath}`);
    }
    if (predicate && filing.predicateLogPath !== predicate.logPath) {
      push(errors, 'TRC-FILING-008', path, `predicate filing must be ${predicate.logPath}`);
    }
    if (filing.valueLogPath !== undefined) {
      push(errors, 'TRC-FILING-009', path, 'valueLogPath is not an authoritative TRC filing');
    }
    if (!nonEmptyStringArray(filing.evidence)) {
      push(errors, 'TRC-FILING-010', path, 'filing must cite evidence');
    }
  }

  if (layout.secondaryIndexes !== undefined && !Array.isArray(layout.secondaryIndexes)) {
    push(errors, 'TRC-INDEX-001', '<layout>', 'secondaryIndexes must be an array');
  }
  for (const index of Array.isArray(layout.secondaryIndexes) ? layout.secondaryIndexes : []) {
    const path = isObject(index) && hasString(index, 'path') ? index.path : '<index>';
    if (!isObject(index)) {
      push(errors, 'TRC-INDEX-002', path, 'secondary index must be an object');
      continue;
    }
    if (index.anchor === 'value' && index.authoritative !== false) {
      push(errors, 'TRC-INDEX-003', path, 'value-position indexes must be non-authoritative');
    }
    if (!nonEmptyStringArray(index.evidence)) {
      push(errors, 'TRC-INDEX-004', path, 'secondary index must cite evidence');
    }
  }

  return errors;
}

export const assertValidTrcLayout = createProfileAssertion(validateTrcLayout);
