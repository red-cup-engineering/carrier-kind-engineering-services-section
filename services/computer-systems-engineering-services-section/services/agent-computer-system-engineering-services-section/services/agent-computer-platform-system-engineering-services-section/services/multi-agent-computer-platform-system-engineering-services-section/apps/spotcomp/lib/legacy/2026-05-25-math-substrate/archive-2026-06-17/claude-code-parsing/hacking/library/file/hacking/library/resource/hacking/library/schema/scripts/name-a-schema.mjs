import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/name-a-schema.schema.json');
const SCHEMA_SCHEMA = loadSchema('#schema.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
ajv.addSchema(SCHEMA_SCHEMA);
const validateInput = ajv.compile(INPUT_SCHEMA);

const SUFFIX = '.schema.json';

export default function nameASchema(input) {
  if (!validateInput(input)) {
    throw new TypeError(`name-a-schema: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { schema } = input;
  const url = new URL(schema.$id);
  const last = url.pathname.split('/').filter(Boolean).at(-1);
  if (!last || !last.endsWith(SUFFIX)) {
    throw new TypeError(`name-a-schema: $id pathname must end in ${SUFFIX}; got ${url.pathname}`);
  }
  const slug = last.slice(0, -SUFFIX.length);
  return Object.freeze({ slug });
}
