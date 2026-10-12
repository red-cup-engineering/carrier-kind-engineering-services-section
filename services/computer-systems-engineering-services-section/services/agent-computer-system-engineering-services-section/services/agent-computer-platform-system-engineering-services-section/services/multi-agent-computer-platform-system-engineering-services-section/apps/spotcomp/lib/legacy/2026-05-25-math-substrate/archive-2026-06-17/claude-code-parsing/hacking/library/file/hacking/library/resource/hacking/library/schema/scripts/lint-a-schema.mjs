import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/lint-a-schema.schema.json');
const SCHEMA_SCHEMA = loadSchema('#schema.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
ajv.addSchema(SCHEMA_SCHEMA);
const validateInput = ajv.compile(INPUT_SCHEMA);

const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

const RULES = [
  {
    id: 'dialect-is-draft-2020-12',
    severity: 'error',
    check: (s) => s.$schema === DIALECT,
    message: `$schema must be ${DIALECT}`
  },
  {
    id: 'id-is-absolute-url',
    severity: 'error',
    check: (s) => typeof s.$id === 'string' && /^https?:\/\//.test(s.$id),
    message: '$id must be an absolute http(s) URL'
  },
  {
    id: 'id-ends-in-schema-json',
    severity: 'error',
    check: (s) => typeof s.$id === 'string' && s.$id.endsWith('.schema.json'),
    message: '$id must end in .schema.json'
  },
  {
    id: 'title-present',
    severity: 'warning',
    check: (s) => typeof s.title === 'string' && s.title.length > 0,
    message: 'title should be present and non-empty'
  },
  {
    id: 'description-present',
    severity: 'error',
    check: (s) => typeof s.description === 'string' && s.description.length > 0,
    message: 'description must be present and non-empty'
  },
  {
    id: 'object-forbids-additional-properties',
    severity: 'warning',
    check: (s) => s.type !== 'object' || s.additionalProperties === false,
    message: 'object schemas should set additionalProperties: false (repository convention)'
  },
  {
    id: 'id-path-matches-on-disk-path',
    severity: 'error',
    check: (s, ctx) => {
      if (!ctx.path) return true;
      const idPath = (() => { try { return new URL(s.$id).pathname; } catch { return null; } })();
      if (!idPath) return false;
      return ctx.path.endsWith(idPath);
    },
    message: 'on-disk path must end with the $id pathname (by-yoneda: $id labels the path-category iso-class)'
  }
];

export default function lintASchema(input) {
  if (!validateInput(input)) {
    throw new TypeError(`lint-a-schema: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { schema, path } = input;
  const ctx = { path };
  const findings = [];
  for (const rule of RULES) {
    if (!rule.check(schema, ctx)) {
      findings.push(Object.freeze({
        rule: rule.id,
        severity: rule.severity,
        message: rule.message
      }));
    }
  }
  return Object.freeze({ findings: Object.freeze(findings) });
}
