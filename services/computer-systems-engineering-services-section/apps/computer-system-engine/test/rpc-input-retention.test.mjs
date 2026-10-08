import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { operation, createOperationCatalog } from '../src/rpc/operation.mjs';
import { invocation } from '../src/rpc/invocation.mjs';
import { dispatch, authorizationFromStanding } from '../src/rpc/dispatch.mjs';
import { dispatchWire } from '../src/rpc/wire-dispatch.mjs';
import { journalRpcWitness } from '../src/rpc/journal-witness.mjs';
import { rpcAdmittedStepsOfRows } from '../src/journal/reading/rpc-sequence.mjs';
import { schemaFrom } from '@red-cup-engineering/json-schema-services-section/contracts';
import { artifactId } from '@red-cup-engineering/semiotic-eavt-services-section/identity';

const now = '2026-10-08T00:00:00.000Z', sentinel = 'synthetic-unaccepted-credential-value';
const schema = schemaFrom({ $id: 'rpc/test-input', type: 'object', required: ['name'], additionalProperties: false, properties: { name: { type: 'string' } } });
function fixture({ domain = schema, noDomain = false, authorized = true, cancel = false, witnessFailure, effectsClass = 'external' } = {}) {
  let effects = 0, authorizations = 0, coordinations = 0; const records = [];
  const op = operation({ verb: 'bounded-effect', ...(noDomain ? {} : { domain }), effects: { class: effectsClass, replay: 'coordinated', coordination: 'coordination-required', deterministic: 'unmeasured', totality: 'partial' }, run: input => { effects++; return input.name ?? null; } });
  const invoke = (input = { name: 'valid' }, changes = {}) => invocation({ request: 'request:stable', subject: 'principal:synthetic', operation: op.ref, verb: op.verb, resource: 'synthetic-root', input, caller: { transport: 'synthetic-test' }, observedAt: now, ...changes });
  const authorize = authorizationFromStanding(new Map([[op.ref, authorized ? 'held' : 'unknown']]));
  const runtime = { catalog: createOperationCatalog([op]), now: () => now, authorize: (...args) => { authorizations++; if (cancel) throw Object.assign(new Error('synthetic cancelled'), { name: 'AbortError' }); return authorize(...args); }, coordinate: () => { coordinations++; return { ok: true, decidedAt: now, reasons: [] }; }, witness: { admit(material) { if (material.kind === witnessFailure) throw new Error(sentinel); const id = artifactId(material); records.push(material); return { id, eventIds: [id] }; }, causalHead: () => records.map(artifactId) } };
  return { op, invoke, runtime, records, counters: () => ({ effects, authorizations, coordinations }) };
}
const absent = value => assert.equal(JSON.stringify(value).includes(sentinel), false);

test('invalid input is audited as a distinct reference with no retained or returned raw body', async () => {
  const f = fixture(); const call = f.invoke({ name: 'valid', forbidden: sentinel }, { request: sentinel, arguments: { extra: sentinel }, caller: { transport: 'test', extra: sentinel } });
  const result = await dispatch(f.runtime, call);
  assert.deepEqual(f.counters(), { effects: 0, authorizations: 0, coordinations: 0 });
  assert.equal(result.ok, false); assert.equal(result.phase, 'input'); absent(result); absent(f.records);
  const reference = result.invocation;
  assert.equal(reference.kind, 'metroplat.rpc.rejected-invocation-reference');
  assert.equal(reference.invocation, call.id); assert.notEqual(reference.id, call.id);
  const { id, ...material } = reference; assert.equal(id, artifactId(material));
  assert.equal(Object.hasOwn(reference, 'input'), false); assert.equal(Object.hasOwn(reference, 'request'), false);
  assert.equal(f.records[0].invocation.id, reference.id); assert.equal(f.records[1].invocation, reference.id);
  const steps = rpcAdmittedStepsOfRows(f.records.map((record, index) => [String(index), { kind: record.kind }, record, now]));
  assert.deepEqual(steps, [{ actor: call.subject, verb: call.verb, argShape: [], validated: false }]);
});

for (const changes of [{ operation: 'unknown-operation' }, { verb: 'different-verb' }]) test(`unresolved operation refuses raw material: ${JSON.stringify(changes)}`, async () => {
  const f = fixture(); const result = await dispatch(f.runtime, f.invoke({ forbidden: sentinel }, changes));
  assert.equal(result.ok, false); assert.equal(result.phase, 'resolution'); absent(result); absent(f.records);
  assert.deepEqual(f.counters(), { effects: 0, authorizations: 0, coordinations: 0 });
});

// Exact baseline receipt identities captured from Computer482db2ad before this correction.
const baselineReceiptIds = {
  "{}": "ni:///sha-256;RVR8D9h6orJALJoimPseB4_XfGxQ_1tn8wGEfEH2OsY",
  "{\"authorized\":false}": "ni:///sha-256;ThSRkxLlN0WULj5Ri1Hl83e7b3-6AUr8JBcQdVQwToM",
  "{\"cancel\":true}": "ni:///sha-256;1EopGUjh4rpG8iIydXy5qVLcZ9xwy5KcFpjGGww5cac",
  "{\"noDomain\":true}": "ni:///sha-256;6PUGxzwVS2H6h5QvKSsAUjwYRymuJtbUqCzHZBSdXfk"
};
for (const options of [{}, { authorized: false }, { cancel: true }, { noDomain: true }]) test(`valid or undeclared-domain calls preserve current identity and ordering: ${JSON.stringify(options)}`, async () => {
  const f = fixture(options), call = f.invoke(); const result = await dispatch(f.runtime, call);
  assert.equal(result.id, baselineReceiptIds[JSON.stringify(options)]);
  assert.equal(result.invocation, call);
  assert.equal(f.counters().authorizations, 1);
  assert.equal(f.counters().effects, options.authorized === false || options.cancel ? 0 : 1);
  assert.equal(f.records[0].kind, 'metroplat.rpc.attempt');
  assert.equal(f.records[0].invocation, call);
});

for (const options of [{ authorized: false }, { cancel: true }]) test(`invalid domain never reaches authorization even when it would refuse/cancel: ${JSON.stringify(options)}`, async () => {
  const f = fixture(options); const result = await dispatch(f.runtime, f.invoke({ forbidden: sentinel }));
  assert.equal(result.phase, 'input'); assert.equal(result.ok, false); absent(result); absent(f.records);
  assert.deepEqual(f.counters(), { effects: 0, authorizations: 0, coordinations: 0 });
});

for (const [kind, phase] of [['metroplat.rpc.attempt', 'admission'], ['metroplat.rpc.outcome', 'witnessing']]) test(`invalid-input ${kind} failure stays a safe ${phase} obstruction`, async () => {
  const f = fixture({ witnessFailure: kind }); const result = await dispatch(f.runtime, f.invoke({ forbidden: sentinel }));
  assert.equal(result.ok, false); assert.equal(result.phase, phase); absent(result); absent(f.records);
  assert.deepEqual(f.counters(), { effects: 0, authorizations: 0, coordinations: 0 });
});

test('a validator error quoting the rejected input is not retained as diagnostic text', async () => {
  const f = fixture({ domain: { ...schema, assert() { throw new Error(sentinel); } } });
  const result = await dispatch(f.runtime, f.invoke({ forbidden: sentinel })); absent(result); absent(f.records);
  assert.equal(result.phase, 'input'); assert.equal(f.counters().effects, 0);
});

test('actual journal writes reference-only refusal material, not the synthetic rejected value', async t => {
  const root = mkdtempSync(join(tmpdir(), 'rpc-input-retention-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const f = fixture(); f.runtime.witness = journalRpcWitness(root);
  const result = await dispatch(f.runtime, f.invoke({ forbidden: sentinel }));
  assert.equal(result.ok, false); assert.equal(result.phase, 'input'); assert.ok(result.evidence.length > 0); absent(result);
  const files = [];
  function visit(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) visit(path); else files.push(path); } }
  visit(root); assert.ok(files.length > 0);
  for (const path of files) assert.equal(readFileSync(path).includes(Buffer.from(sentinel)), false, path);
  assert.deepEqual(f.counters(), { effects: 0, authorizations: 0, coordinations: 0 });
});

test('malformed JSON is refused before invocation identity or raw witness admission', async () => {
  const f = fixture(); const result = await dispatchWire(f.runtime.catalog, ['bounded-effect'], `{"name":${sentinel}}`, { subject: 'principal:synthetic', witness: f.runtime.witness, coordinate: f.runtime.coordinate, now: f.runtime.now }, f.runtime.authorize);
  assert.equal(result.code, 1); assert.equal(result.receipt, undefined); absent(result); assert.equal(f.records.length, 0);
  assert.deepEqual(f.counters(), { effects: 0, authorizations: 0, coordinations: 0 });
});

test('wire domain refusal returns only the safe rejected reference and fixed reason', async () => {
  const f = fixture(); const result = await dispatchWire(f.runtime.catalog, ['bounded-effect'], JSON.stringify({ name: 'valid', forbidden: sentinel }), { subject: 'principal:synthetic', witness: f.runtime.witness, coordinate: f.runtime.coordinate, now: f.runtime.now }, f.runtime.authorize);
  assert.equal(result.code, 1); assert.equal(result.receipt.phase, 'input'); absent(result); absent(f.records);
  assert.deepEqual(f.counters(), { effects: 0, authorizations: 0, coordinations: 0 });
});

test('rejected reference preserves canonical cause links and omits non-reference cause text', async () => {
  const f = fixture(), cause = artifactId({ kind: 'synthetic-prior-admission' });
  const result = await dispatch(f.runtime, f.invoke({ forbidden: sentinel }, { causes: [cause, sentinel] }));
  assert.deepEqual(result.invocation.causes, [cause]); absent(result); absent(f.records);
});
