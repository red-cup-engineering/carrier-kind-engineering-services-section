import assert from 'node:assert/strict';
import crypto, { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createAuthorizationServer, createJsonFileGrantStore, createMemoryGrantStore } from '../src/authorization-server.mjs';

async function fixture(t) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'oauth-grant-custody-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return { directory, store: createJsonFileGrantStore(directory) };
}
const hash = value => createHash('sha256').update(value).digest('base64url');

test('corrupt retained grant bytes refuse reads and writes without replacement', async t => {
  const { directory, store } = await fixture(t), file = join(directory, 'refresh.json');
  const bytes = '{"synthetic-retained-grant":"SYNTHETIC_PRIVATE_DIAGNOSTIC';
  await fs.writeFile(file, bytes);
  await assert.rejects(store.get('refresh', 'old'));
  await assert.rejects(store.put('refresh', 'new', { subject: 'fixture' }));
  assert.equal(await fs.readFile(file, 'utf8'), bytes);
});

test('a non-file or unreadable grant store is not an absent kind', async t => {
  const { directory, store } = await fixture(t);
  await fs.mkdir(join(directory, 'refresh.json'));
  await assert.rejects(store.get('refresh', 'old'));
});

test('a failed put keeps both durable bytes and the prior cached snapshot', async t => {
  const { directory, store } = await fixture(t), file = join(directory, 'refresh.json');
  await store.put('refresh', 'old', { subject: 'fixture', version: 1 });
  const before = await fs.readFile(file);
  t.mock.method(fs, 'writeFile', async () => { throw Object.assign(new Error('synthetic disk refusal'), { code: 'EIO' }); });
  await assert.rejects(store.put('refresh', 'old', { subject: 'fixture', version: 2 }));
  assert.deepEqual(await store.get('refresh', 'old'), { subject: 'fixture', version: 1 });
  assert.deepEqual(await fs.readFile(file), before);
});

test('ENOENT is the only absent-store case and permits a first retained record', async t => {
  const { store } = await fixture(t);
  assert.equal(await store.get('refresh', 'old'), undefined);
  await store.put('refresh', 'old', { subject: 'fixture' });
  assert.deepEqual(await store.get('refresh', 'old'), { subject: 'fixture' });
});

for (const encoded of ['null', '[]', '"SYNTHETIC_PRIVATE_DIAGNOSTIC"']) test('non-object JSON custody refuses without echoing or replacing its bytes', async t => {
  const { directory, store } = await fixture(t), file = join(directory, 'refresh.json');
  await fs.writeFile(file, encoded);
  await assert.rejects(store.put('refresh', 'new', {}), error => {
    assert.equal(error.code, 'server_error'); assert.equal(error.custodyReason, 'malformed');
    assert.equal(error.message.includes('SYNTHETIC_PRIVATE_DIAGNOSTIC'), false); return true;
  });
  assert.equal(await fs.readFile(file, 'utf8'), encoded);
});

test('an unreadable previously cached kind refuses rather than serving or replacing stale grants', async t => {
  const { directory, store } = await fixture(t), file = join(directory, 'refresh.json');
  await store.put('refresh', 'old', { subject: 'fixture' }); await store.get('refresh', 'old');
  const stat = fs.stat;
  t.mock.method(fs, 'stat', async (...args) => { if (args[0] === file) throw Object.assign(new Error('SYNTHETIC_PRIVATE_DIAGNOSTIC'), { code: 'EACCES' }); return stat(...args); });
  await assert.rejects(store.get('refresh', 'old'), { code: 'server_error', custodyReason: 'unreadable' });
  await assert.rejects(store.put('refresh', 'new', {}), { code: 'server_error', custodyReason: 'unreadable' });
});

test('a completed rename with an uncertain reply is observed afresh and never rolled back', async t => {
  const { directory, store } = await fixture(t), file = join(directory, 'refresh.json');
  await store.put('refresh', 'old', { subject: 'fixture' }); await store.get('refresh', 'old');
  const rename = fs.rename;
  t.mock.method(fs, 'rename', async (...args) => { await rename(...args); if (args[1] === file) throw Object.assign(new Error('synthetic uncertain completion'), { code: 'EIO' }); });
  await assert.rejects(store.delete('refresh', 'old'), { code: 'server_error' });
  assert.equal(await store.get('refresh', 'old'), undefined);
  assert.equal(await createJsonFileGrantStore(directory).get('refresh', 'old'), undefined);
});

test('an existing temporary path is neither reused nor removed', async t => {
  const { directory, store } = await fixture(t), file = join(directory, 'refresh.json');
  await store.put('refresh', 'old', { subject: 'fixture' });
  const temporary = `${file}.fixture-collision.tmp`; await fs.writeFile(temporary, 'unrelated fixture bytes');
  t.mock.method(crypto, 'randomUUID', () => 'fixture-collision');
  await assert.rejects(store.put('refresh', 'new', {}), { code: 'server_error' });
  assert.equal(await fs.readFile(temporary, 'utf8'), 'unrelated fixture bytes');
  assert.deepEqual(await store.get('refresh', 'old'), { subject: 'fixture' });
  assert.equal(await store.get('refresh', 'new'), undefined);
});

test('a failed delete keeps the retained grant available from the same store', async t => {
  const { directory, store } = await fixture(t), file = join(directory, 'refresh.json');
  await store.put('refresh', 'old', { subject: 'fixture' });
  const before = await fs.readFile(file), rename = fs.rename;
  t.mock.method(fs, 'rename', async (...args) => { if (args[1] === file) throw Object.assign(new Error('synthetic rename refusal'), { code: 'EIO' }); return rename(...args); });
  await assert.rejects(store.delete('refresh', 'old'));
  assert.deepEqual(await store.get('refresh', 'old'), { subject: 'fixture' });
  assert.deepEqual(await fs.readFile(file), before);
});

async function refreshFixture(store = createMemoryGrantStore()) {
  const resource = 'https://fixture.invalid/mcp', client = 'fixture-client', old = 'synthetic-old-refresh';
  await store.put('client', client, { client_id: client, token_endpoint_auth_method: 'none', grant_types: ['refresh_token'] });
  await store.put('refresh', hash(old), { client_id: client, subject: 'fixture-principal', principal: { subject: 'fixture-principal' }, scope: 'read', resource, refreshable: true, expiresAt: Date.now() + 60000 });
  const server = createAuthorizationServer({ issuer: 'https://fixture.invalid', resources: [resource], store, authenticate: () => undefined, loginUrl: () => '/login' });
  const handler = server.app.resources.find(row => row.match === '/oauth/token').handler;
  const run = async changes => {
    const url = new URL('https://fixture.invalid/oauth/token');
    const answer = await handler({ url, request: new Request(url, { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: client, refresh_token: old, ...changes }) }) });
    return { status: answer.status ?? 200, body: JSON.parse(answer.body) };
  };
  return { server, store, run, old, resource };
}

for (const [label, changes, error] of [['wider scope', { scope: 'read write' }, 'invalid_scope'], ['different resource', { resource: 'https://elsewhere.invalid/mcp' }, 'invalid_target']]) test(`refusing ${label} does not consume the unchanged grant`, async () => {
  const f = await refreshFixture(); assert.equal((await f.run(changes)).body.error, error);
  const valid = await f.run(); assert.equal(valid.status, 200); assert.ok(valid.body.refresh_token);
  assert.equal((await f.run()).body.error, 'invalid_grant');
});

test('corrupt refresh custody returns a bounded server error and preserves the retained bytes', async t => {
  const { directory, store } = await fixture(t), f = await refreshFixture(store);
  const file = join(directory, 'refresh.json'), corrupt = '{"SYNTHETIC_PRIVATE_DIAGNOSTIC';
  await fs.writeFile(file, corrupt);
  const answer = await f.run();
  assert.equal(answer.status, 500); assert.equal(answer.body.error, 'server_error');
  assert.equal(JSON.stringify(answer).includes('SYNTHETIC_PRIVATE_DIAGNOSTIC'), false);
  assert.equal(JSON.stringify(answer).includes(directory), false);
  assert.equal(await fs.readFile(file, 'utf8'), corrupt);
});

