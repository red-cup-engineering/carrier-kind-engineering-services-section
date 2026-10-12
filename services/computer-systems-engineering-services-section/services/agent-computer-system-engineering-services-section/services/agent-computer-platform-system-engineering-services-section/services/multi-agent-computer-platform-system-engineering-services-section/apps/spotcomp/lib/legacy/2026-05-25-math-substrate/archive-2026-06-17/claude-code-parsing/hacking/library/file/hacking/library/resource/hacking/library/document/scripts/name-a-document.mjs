import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/name-a-document.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
const validateInput = ajv.compile(INPUT_SCHEMA);

export default function nameADocument(input) {
  if (!validateInput(input)) {
    throw new TypeError(`name-a-document: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { path } = input.document;
  const base = basename(path);
  if (!base.endsWith('.md')) {
    throw new TypeError(`name-a-document: path basename ${JSON.stringify(base)} does not end in .md`);
  }
  return Object.freeze({ slug: base.slice(0, -3) });
}
