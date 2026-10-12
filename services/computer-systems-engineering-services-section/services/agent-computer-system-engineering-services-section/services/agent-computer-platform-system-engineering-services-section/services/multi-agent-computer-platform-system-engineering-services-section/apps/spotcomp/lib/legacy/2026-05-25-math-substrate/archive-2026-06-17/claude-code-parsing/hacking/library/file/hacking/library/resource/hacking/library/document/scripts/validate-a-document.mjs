import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/validate-a-document.schema.json');
const DOCUMENT_SCHEMA = loadSchema('#document.schema.json');
const CITED_WORK_SCHEMA = loadSchema('#hacking/library/cited-work/cited-work.schema.json');
const DEV_JOURNAL_SCHEMA = loadSchema('#hacking/library/dev-journal/dev-journal.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
ajv.addSchema(CITED_WORK_SCHEMA);
ajv.addSchema(DOCUMENT_SCHEMA);
ajv.addSchema(DEV_JOURNAL_SCHEMA);
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

export default function validateADocument(input) {
  if (!validateInput(input)) {
    throw new TypeError(`validate-a-document: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { document } = input;
  const schemaId = input['schema-id'] ?? DOCUMENT_SCHEMA.$id;
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    throw new TypeError(`validate-a-document: no schema registered under $id ${schemaId}`);
  }
  const valid = validate(document);
  return Object.freeze({
    valid,
    'schema-id': schemaId,
    errors: valid ? null : freezeErrors(validate.errors)
  });
}
