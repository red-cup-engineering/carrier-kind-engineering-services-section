import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const TOKEN_SCHEMA = admitSchema({ schema: load('#active-library/token/token.schema.json') }).schema;
const CLAIM_SCHEMA = admitSchema({ schema: load('#active-library/claim/claim.schema.json') }).schema;
const TOKEN_SLOT_SCHEMA = admitSchema({ schema: load('#articulating/library/aperiodic-articulation-category/library/aperiodic-articulation-cell/library/token-articulation-slot/token-articulation-slot.schema.json') }).schema;
const CLAIM_SLOT_SCHEMA = admitSchema({ schema: load('#articulating/library/aperiodic-articulation-category/library/aperiodic-articulation-cell/library/claim-articulation-slot/claim-articulation-slot.schema.json') }).schema;
const UTTERANCE_SCHEMA = admitSchema({ schema: load('#active-library/utterance/utterance.schema.json') }).schema;
const APERIODIC_ARTICULATION_CELL = admitSchema({ schema: load('#articulating/library/aperiodic-articulation-category/library/aperiodic-articulation-cell/aperiodic-articulation-cell.schema.json') }).schema;
const POTENTIAL_CELL_SCHEMA = admitSchema({ schema: load('#articulating/library/aperiodic-articulation-category/library/aperiodic-articulation-cell/library/potential-aperiodic-articulation-cell/potential-aperiodic-articulation-cell.schema.json') }).schema;
const APERIODIC_ARTICULATION_CATEGORY_SCHEMA = admitSchema({ schema: load('#articulating/library/aperiodic-articulation-category/aperiodic-articulation-category.schema.json') }).schema;

const REFERENCES = [
  TOKEN_SCHEMA,
  CLAIM_SCHEMA,
  TOKEN_SLOT_SCHEMA,
  CLAIM_SLOT_SCHEMA,
  UTTERANCE_SCHEMA,
  APERIODIC_ARTICULATION_CELL,
  POTENTIAL_CELL_SCHEMA,
  APERIODIC_ARTICULATION_CATEGORY_SCHEMA,
];

const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');
const validateUtterance = (instance) => validateSchemaInstance({ instance, schema: UTTERANCE_SCHEMA, schemas: REFERENCES });
const validatePotentialCell = (instance) => validateSchemaInstance({ instance, schema: POTENTIAL_CELL_SCHEMA, schemas: REFERENCES });
const validateAperiodicArticulationCategory = (instance) => validateSchemaInstance({ instance, schema: APERIODIC_ARTICULATION_CATEGORY_SCHEMA, schemas: REFERENCES });

export default function articulate(utterance) {
  const inCheck = validateUtterance(utterance);
  if (!inCheck.ok) {
    throw new TypeError(
      `articulate: input is not a valid utterance: ${errorsText(inCheck.errors)}`
    );
  }
  const cell = Object.freeze([
    Object.freeze([...utterance]),
    Object.freeze([Object.freeze([]), Object.freeze([])])
  ]);
  const cellCheck = validatePotentialCell(cell);
  if (!cellCheck.ok) {
    throw new Error(
      `articulate: produced cell does not validate as potential-aperiodic-articulation-cell: ${errorsText(cellCheck.errors)}`
    );
  }
  const category = Object.freeze({
    'potential-aperiodic-articulation-cell': cell,
  });
  const categoryCheck = validateAperiodicArticulationCategory(category);
  if (!categoryCheck.ok) {
    throw new Error(
      `articulate: produced category does not validate as aperiodic-articulation-category: ${errorsText(categoryCheck.errors)}`
    );
  }
  return category;
}
