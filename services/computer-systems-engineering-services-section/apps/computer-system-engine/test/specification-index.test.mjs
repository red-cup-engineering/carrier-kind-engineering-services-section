import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { schemaFromGraph } from '@red-cup-engineering/json-schema-services-section/contracts';
import { computerEngineeringTermSchema, COMPUTER_ENGINEERING_SPECIFICATION_DOCUMENT } from '../src/specification.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../specifications/${name}`, import.meta.url), 'utf8'));
const index = JSON.parse(readFileSync(COMPUTER_ENGINEERING_SPECIFICATION_DOCUMENT, 'utf8'));
const term = read('term.schema.json');
const meta = read('computer-engineering.schema.json');
const contract = root => schemaFromGraph({root, schemas:[term,meta].map(schema => ({id:schema.$id,schema}))});
const termContract = contract(term.$id);
for (const [name,record] of Object.entries(index.terms)) test(`indexed term locator is admitted: ${name}`, () => {
  assert.equal(termContract.validate(record), true);
  assert.equal(record.token, name);
  assert.equal(computerEngineeringTermSchema(name).href, new URL(record.schema, COMPUTER_ENGINEERING_SPECIFICATION_DOCUMENT).href);
});
for (const schema of ['../escape.schema.json','https://unowned.example/schema','file:///tmp/schema.json','https://561.group/schema/computer-data/unknown']) test(`unadmitted locator refuses: ${schema}`, () => {
  assert.equal(termContract.validate({...index.terms.actor,schema}), false);
});
test('whole index remains refused until its founder-direction requirement has an actual owner', () => {
  const c = contract(meta.$id);
  assert.equal(c.validate(index), false);
  const errors = c.errors(index);
  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.match(JSON.stringify(errors), /founder-direction/);
  assert.ok(meta.properties.terms.required.includes('founder-direction'));
});
test('local locator remains local and unknown terms do not invent schema paths', () => {
  assert.ok(existsSync(computerEngineeringTermSchema('operation')));
  for (const token of ['unknown','founder-direction','../operation','Operation']) assert.throws(() => computerEngineeringTermSchema(token));
});
test('unreceived RMN networking requirement is retained and remains visibly unresolved', () => {
  assert.ok(index.networkingProtocols.includes('rmn-cbor-envelope'));
  assert.equal(index.terms['rmn-cbor-envelope'].schema, 'rmn-cbor-envelope.schema.json');
  assert.equal(existsSync(computerEngineeringTermSchema('rmn-cbor-envelope')), false);
});
