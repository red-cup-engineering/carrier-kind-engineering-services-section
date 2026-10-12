import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/validate-a-schema.schema.json');
const SCHEMA_SCHEMA = loadSchema('#schema.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
ajv.addSchema(SCHEMA_SCHEMA);
const validateInput = ajv.compile(INPUT_SCHEMA);

const freezeErrors = (errors) =>
  errors == null
    ? null
    : Object.freeze(errors.map((e) => Object.freeze({
        instancePath: e.instancePath,
        schemaPath: e.schemaPath,
        keyword: e.keyword,
        message: e.message ?? null
      })));

export default function validateASchema(input) {
  if (!validateInput(input)) {
    throw new TypeError(`validate-a-schema: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { schema } = input;
  const probe = new Ajv2020({ strict: false, allowUnionTypes: true });
  (addFormats.default ?? addFormats)(probe);
  let valid;
  let errors = null;
  try {
    probe.compile(schema);
    valid = true;
  } catch (e) {
    valid = false;
    errors = Object.freeze([Object.freeze({
      instancePath: '',
      schemaPath: '',
      keyword: 'compile',
      message: e.message ?? String(e)
    })]);
  }
  return Object.freeze({ valid, errors: errors ?? freezeErrors(probe.errors) });
}
