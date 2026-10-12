import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/audit-a-schema.schema.json');
const SCHEMA_SCHEMA = loadSchema('#schema.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
ajv.addSchema(SCHEMA_SCHEMA);
const validateInput = ajv.compile(INPUT_SCHEMA);

const KEYWORDS = new Set([
  '$schema', '$id', '$ref', '$defs', '$comment',
  'title', 'description', 'type', 'required', 'properties',
  'additionalProperties', 'items', 'oneOf', 'anyOf', 'allOf', 'not',
  'const', 'enum', 'format', 'pattern', 'minimum', 'maximum',
  'minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems',
  'patternProperties', 'propertyNames', 'if', 'then', 'else'
]);

const walk = (node, acc, depth) => {
  if (acc.maxDepth < depth) acc.maxDepth = depth;
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const v of node) walk(v, acc, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (KEYWORDS.has(k)) acc.keywordCount += 1;
    if (k === '$ref' && typeof v === 'string') acc.refs.push(v);
    if (k === 'properties' && v && typeof v === 'object') {
      acc.propertyCount += Object.keys(v).length;
    }
    walk(v, acc, depth + 1);
  }
};

const hasCitation = (description) => {
  if (typeof description !== 'string') return false;
  return /\b(19|20)\d{2}\b/.test(description) || /\bcited as\b/i.test(description);
};

export default function auditASchema(input) {
  if (!validateInput(input)) {
    throw new TypeError(`audit-a-schema: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { schema } = input;
  const acc = { keywordCount: 0, propertyCount: 0, maxDepth: 0, refs: [] };
  walk(schema, acc, 0);
  const idPath = (() => { try { return new URL(schema.$id).pathname; } catch { return null; } })();
  const report = Object.freeze({
    '$id': schema.$id ?? null,
    'id-path': idPath,
    'title': schema.title ?? null,
    'has-description': typeof schema.description === 'string' && schema.description.length > 0,
    'description-length': typeof schema.description === 'string' ? schema.description.length : 0,
    'has-citation': hasCitation(schema.description),
    'top-level-type': schema.type ?? null,
    'keyword-count': acc.keywordCount,
    'property-count': acc.propertyCount,
    'ref-count': acc.refs.length,
    'refs': Object.freeze([...acc.refs]),
    'max-depth': acc.maxDepth,
    'additional-properties': Object.hasOwn(schema, 'additionalProperties') ? schema.additionalProperties : null
  });
  return Object.freeze({ report });
}
