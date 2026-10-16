import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { createAuthorizationServer, createJsonFileGrantStore, createMemoryGrantStore } from '../src/authorization-server.mjs';
import { OAuthError } from '../src/oauth-error.mjs';
import { linuxCustodyUnavailable } from './fixtures/linux-custody-test.mjs';
const kernelTest = (name, fn) => test(name, { skip: linuxCustodyUnavailable ?? false }, fn);

const profile = 'linux-local-flock-v1';
const hash = value => createHash('sha256').update(value).digest('base64url');
const old = 'synthetic-old-refresh', clientId = 'fixture-client';
const resource = 'https://fixture.invalid/mcp';
async function directory(t) { const root = await fs.mkdtemp(join(tmpdir(), 'oauth-rotation-')); t.after(() => fs.rm(root, { recursive: true, force: true })); return root; }
async function seed(store) {
  await store.put('client', clientId, { client_id: clientId, token_endpoint_auth_method: 'none', grant_types: ['refresh_token'] });
  await store.put('refresh', hash(old), { client_id: clientId, subject: 'fixture', principal: { subject: 'fixture' }, scope: 'read', resource, refreshable: true, expiresAt: Date.now() + 60000 });
}
function receiver(store) {
  const server = createAuthorizationServer({ issuer: 'https://fixture.invalid', resources: [resource], store, authenticate: () => undefined, loginUrl: () => '/login' });
  const handler = server.app.resources.find(row => row.match === '/oauth/token').handler;
  return { server, async run(changes = {}) {
    const url = new URL('https://fixture.invalid/oauth/token');
    const answer = await handler({ url, request: new Request(url, { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, refresh_token: old, ...changes }) }) });
    return { status: answer.status ?? 200, body: JSON.parse(answer.body) };
  } };
}
async function exchange(store, suffix = 'next') {
  const expected = await store.get('refresh', hash(old)), client = await store.get('client', clientId);
  return { key: hash(old), expected, client: { key: clientId, expected: client },
    access: { key: `synthetic-access-${suffix}`, value: { ...expected, expiresAt: Date.now() + 60000 } },
    refresh: { key: `synthetic-refresh-${suffix}`, value: { ...expected, expiresAt: Date.now() + 60000 } } };
}

test('memory refresh exchange permits only one concurrent token pair', async () => {
  const store = createMemoryGrantStore(); await seed(store); const f = receiver(store);
  const results = await Promise.all([f.run(), f.run()]);
  assert.equal(results.filter(row => row.status === 200).length, 1);
  assert.equal(results.filter(row => row.body.error === 'invalid_grant').length, 1);
  assert.equal((await store.list('access')).length, 1);
});

kernelTest('two Linux-profile store instances cannot both rotate the same retained grant', async t => {
  const root = await directory(t), one = createJsonFileGrantStore(root, { profile }); await seed(one);
  const two = createJsonFileGrantStore(root, { profile });
  const results = await Promise.all([receiver(one).run(), receiver(two).run()]);
  assert.equal(results.filter(row => row.status === 200).length, 1);
  assert.equal(results.filter(row => row.body.error === 'invalid_grant' || row.body.error === 'server_error').length, 1);
  assert.equal((await one.list('access')).length, 1);
  assert.equal(await two.get('refresh', hash(old)), undefined);
});

kernelTest('two separate processes compare under the same kernel gate before publishing one exchange', async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const workers = ['one', 'two'].map(suffix => {
    const script = new URL('./fixtures/refresh-process.mjs', import.meta.url);
    const child = spawn(process.execPath, [...process.execArgv.filter(arg => arg !== '--test'), script.pathname, root, 'exchange', suffix], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const ready = new Promise((resolve, reject) => { child.on('message', message => { if (message.ready) resolve(); }); child.once('error', reject); });
    const result = new Promise((resolve, reject) => { child.on('message', message => { if (message.result) resolve(message); }); child.once('error', reject); });
    const done = new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    return { child, ready, result, done };
  });
  await Promise.all(workers.map(worker => worker.ready)); workers.forEach(worker => worker.child.send('exchange'));
  const results = await Promise.all(workers.map(worker => worker.result));
  assert.equal(results.filter(row => row.result === 'applied').length, 1);
  assert.equal(results.filter(row => row.result === 'already-consumed' || row.reason === 'busy').length, 1);
  assert.deepEqual(await Promise.all(workers.map(worker => worker.done)), [0, 0]);
  assert.equal((await store.list('access')).length, 1); assert.equal((await store.list('refresh')).length, 1);
  assert.equal(await store.get('refresh', hash(old)), undefined);
});

kernelTest('current registered-client withdrawal defeats an already prepared refresh exchange', async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const prepared = await exchange(store); await store.delete('client', clientId);
  assert.equal(await store.exchangeRefresh(prepared), false);
  assert.ok(await store.get('refresh', hash(old))); assert.deepEqual(await store.list('access'), []);
});

kernelTest('refresh expiry is checked again inside the actual custody exchange', async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const prepared = await exchange(store); prepared.now = () => prepared.expected.expiresAt;
  assert.equal(await store.exchangeRefresh(prepared), false);
  assert.deepEqual(await store.list('access'), []); assert.ok(await store.get('refresh', hash(old)));
});

kernelTest('failed staging-file sync leaves the prior refresh bytes untouched', async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const before = await fs.readFile(join(root, 'refresh.json')), open = fs.open;
  t.mock.method(fs, 'open', async (...args) => {
    const handle = await open(...args);
    if (String(args[0]).startsWith(join(root, 'refresh.json.')) && args[1] === 'wx') t.mock.method(handle, 'sync', async () => { throw new Error('synthetic sync failure'); });
    return handle;
  });
  const answer = await receiver(store).run(); assert.equal(answer.status, 500);
  assert.equal(answer.body.refresh_token, undefined); assert.deepEqual(await fs.readFile(join(root, 'refresh.json')), before);
});

test('a custom store without atomic exchange refuses without consuming or minting', async () => {
  const original = createMemoryGrantStore(); await seed(original);
  const { exchangeRefresh, ...store } = original; const answer = await receiver(store).run();
  assert.equal(answer.status, 500); assert.equal(answer.body.error, 'server_error');
  assert.ok(await original.get('refresh', hash(old))); assert.deepEqual(await original.list('access'), []);
});

test('unknown custom exchange diagnostics are suppressed at the actual token handler', async () => {
  const original = createMemoryGrantStore(); await seed(original);
  const store = { ...original, async exchangeRefresh() { throw new Error('SYNTHETIC_PRIVATE_CUSTOM_STORE_DIAGNOSTIC'); } };
  const answer = await receiver(store).run();
  assert.equal(answer.status, 500); assert.equal(answer.body.error, 'server_error');
  assert.equal(JSON.stringify(answer).includes('SYNTHETIC_PRIVATE_CUSTOM_STORE_DIAGNOSTIC'), false);
  assert.ok(await original.get('refresh', hash(old))); assert.deepEqual(await original.list('access'), []);
});

test('an intentional bounded OAuth exchange refusal retains its code and status', async () => {
  const original = createMemoryGrantStore(); await seed(original);
  const store = { ...original, async exchangeRefresh() { throw new OAuthError('invalid_grant', 'retained grant was withdrawn'); } };
  const answer = await receiver(store).run();
  assert.equal(answer.status, 400); assert.equal(answer.body.error, 'invalid_grant');
  assert.equal(answer.body.error_description, 'retained grant was withdrawn');
});

for (const mode of ['memory', 'linux-file']) (mode === 'memory' ? test : kernelTest)(`${mode}: narrowed access preserves the original scope throughout successor refreshes`, async t => {
  const store = mode === 'memory' ? createMemoryGrantStore() : createJsonFileGrantStore(await directory(t), { profile });
  await seed(store); const retained = await store.get('refresh', hash(old));
  await store.put('refresh', hash(old), { ...retained, scope: 'read write' });
  const f = receiver(store), first = await f.run({ scope: 'read' });
  assert.equal(first.status, 200); assert.equal((await f.server.verifyToken(first.body.access_token)).scope, 'read');
  assert.equal((await store.get('refresh', hash(first.body.refresh_token))).scope, 'read write');
  const second = await f.run({ refresh_token: first.body.refresh_token, scope: 'write' });
  assert.equal(second.status, 200); assert.equal((await f.server.verifyToken(second.body.access_token)).scope, 'write');
  assert.equal((await store.get('refresh', hash(second.body.refresh_token))).scope, 'read write');
  assert.equal((await f.run({ refresh_token: second.body.refresh_token, scope: 'read write admin' })).body.error, 'invalid_scope');
  assert.equal((await f.run({ refresh_token: second.body.refresh_token, scope: 'read write' })).status, 200);
});

kernelTest('scope and resource refusal precede any Linux-profile refresh mutation', async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const before = await fs.readFile(join(root, 'refresh.json')), f = receiver(store);
  assert.equal((await f.run({ scope: 'read write' })).body.error, 'invalid_scope');
  assert.equal((await f.run({ resource: 'https://other.invalid/mcp' })).body.error, 'invalid_target');
  assert.deepEqual(await fs.readFile(join(root, 'refresh.json')), before); assert.deepEqual(await store.list('access'), []);
});

kernelTest('failure before refresh publication preserves old custody; any unreturned access expires', async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const before = await fs.readFile(join(root, 'refresh.json')), rename = fs.rename;
  const mocked = t.mock.method(fs, 'rename', async (...args) => { if (args[1] === join(root, 'refresh.json')) throw Object.assign(new Error('synthetic failure before commit'), { code: 'EIO' }); return rename(...args); });
  const answer = await receiver(store).run(); assert.equal(answer.status, 500); assert.equal(answer.body.access_token, undefined);
  assert.deepEqual(await fs.readFile(join(root, 'refresh.json')), before);
  const orphan = await store.list('access'); assert.equal(orphan.length, 1); assert.ok(orphan[0].expiresAt <= Date.now() + 3600000);
  mocked.mock.restore(); assert.equal((await receiver(store).run()).status, 200);
});

kernelTest('an uncertain completed refresh rename never restores the consumed grant', async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const rename = fs.rename;
  t.mock.method(fs, 'rename', async (...args) => { await rename(...args); if (args[1] === join(root, 'refresh.json')) throw new Error('synthetic lost commit reply'); });
  const answer = await receiver(store).run(); assert.equal(answer.status, 500); assert.equal(answer.body.refresh_token, undefined);
  assert.equal(await store.get('refresh', hash(old)), undefined);
  assert.equal((await receiver(createJsonFileGrantStore(root, { profile })).run()).body.error, 'invalid_grant');
  assert.equal((await store.list('refresh')).length, 1);
});

test('unsupported profiles refuse instead of silently selecting process-only custody', async t => {
  const root = await directory(t); assert.throws(() => createJsonFileGrantStore(root, { profile: 'unknown' }));
  assert.equal(createJsonFileGrantStore(root).profile, 'process-local-v1');
});

for (const phase of ['before-refresh', 'after-refresh']) kernelTest(`process death ${phase} releases the kernel gate and preserves the observed commit boundary`, async t => {
  const root = await directory(t), store = createJsonFileGrantStore(root, { profile }); await seed(store);
  const script = new URL('./fixtures/refresh-crash.mjs', import.meta.url);
  const child = spawn(process.execPath, [...process.execArgv.filter(arg => arg !== '--test'), script.pathname, root, phase], { stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = ''; child.stderr.on('data', chunk => { diagnostic += chunk; });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  assert.equal(code, 73, diagnostic);
  const fresh = createJsonFileGrantStore(root, { profile });
  assert.equal((await fresh.get('refresh', hash(old))) !== undefined, phase === 'before-refresh');
  assert.equal((await fresh.get('refresh', 'synthetic-refresh-child')) !== undefined, phase === 'after-refresh');
  await fresh.put('client', 'post-crash-probe', { client_id: 'post-crash-probe' });
});
