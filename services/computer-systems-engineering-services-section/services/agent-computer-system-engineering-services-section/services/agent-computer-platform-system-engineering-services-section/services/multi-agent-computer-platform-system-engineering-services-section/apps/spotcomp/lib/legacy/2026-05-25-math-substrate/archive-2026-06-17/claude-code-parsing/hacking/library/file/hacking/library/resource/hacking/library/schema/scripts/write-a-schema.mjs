import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/write-a-schema.schema.json');
const OUTPUT_SCHEMA = loadSchema('#schema.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateOutput = ajv.compile(OUTPUT_SCHEMA);

const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

const ORDERED_KEYS = [
  '$schema', '$id', 'title', 'description',
  'type', 'required', 'additionalProperties', 'properties',
  'items', 'oneOf', 'anyOf', 'allOf',
  '$ref', '$defs', 'const', 'enum', 'format'
];

const assemble = (spec) => {
  const out = { $schema: DIALECT };
  for (const k of ORDERED_KEYS) {
    if (k === '$schema') continue;
    if (Object.hasOwn(spec, k)) out[k] = spec[k];
  }
  return out;
};

export default function writeASchema(input) {
  if (!validateInput(input)) {
    throw new TypeError(`write-a-schema: ${ajv.errorsText(validateInput.errors)}`);
  }
  const document = Object.freeze(assemble(input['schema-spec']));
  if (!validateOutput(document)) {
    throw new TypeError(`write-a-schema (output): ${ajv.errorsText(validateOutput.errors)}`);
  }
  if (input.path) {
    mkdirSync(dirname(input.path), { recursive: true });
    writeFileSync(input.path, JSON.stringify(document, null, 2) + '\n', 'utf8');
  }
  return document;
}
