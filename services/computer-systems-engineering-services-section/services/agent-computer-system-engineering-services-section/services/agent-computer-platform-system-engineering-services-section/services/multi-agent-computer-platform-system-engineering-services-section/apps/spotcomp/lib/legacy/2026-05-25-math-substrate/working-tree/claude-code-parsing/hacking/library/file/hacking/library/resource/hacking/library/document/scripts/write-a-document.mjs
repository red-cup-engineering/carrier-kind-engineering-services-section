import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/write-a-document.schema.json');
const DOCUMENT_SCHEMA = loadSchema('#document.schema.json');
const CITED_WORK_SCHEMA = loadSchema('#hacking/library/cited-work/cited-work.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
ajv.addSchema(CITED_WORK_SCHEMA);
ajv.addSchema(DOCUMENT_SCHEMA);
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateDocument = ajv.compile(DOCUMENT_SCHEMA);

export default function writeADocument(input) {
  if (!validateInput(input)) {
    throw new TypeError(`write-a-document: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { path, frontmatter, body } = input['document-spec'];
  const document = { path, frontmatter, ...(body == null ? {} : { body }) };
  if (!validateDocument(document)) {
    throw new TypeError(
      `write-a-document: document does not validate against document.schema.json: ${ajv.errorsText(validateDocument.errors)}`
    );
  }
  const frontmatterYaml = yaml.dump(frontmatter, { lineWidth: -1, noRefs: true, sortKeys: false });
  const text = `---\n${frontmatterYaml}---\n${body ?? ''}`;
  return Object.freeze({ document, text });
}
