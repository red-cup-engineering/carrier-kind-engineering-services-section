import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createNativeApplicationServer } from '@red-cup-engineering/computer-web-server/native-application';
import { createEnterpriseEntrance } from '../src/entrance.mjs';

const origin = 'https://entrance.test';
const federation = { clients: new Map(), tools: [], unavailable: [] };
const entranceWith = (stateDir, applications) => createEnterpriseEntrance({
  publicBaseUrl: origin, stateDir, sessionSecret: 'synthetic-session-secret-only',
  allowedEmail: 'human@example.test', instance: { name: 'fixture', title: 'Fixture' },
}, { federation, applications });
// A hosted application is granted only as the deployment declares it: an entry whose configuration names the hosts.
const declared = (hosts, surface) => ({ configuration: { hosts }, factory: () => surface });

async function listening(t, entrance) {
  const server = createNativeApplicationServer({ ...entrance.app, base: origin });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  // fetch() may not set Host, so the listener is reached over node:http with the Host a visitor names.
  return (host, path, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const outgoing = httpRequest({ host: '127.0.0.1', port: server.address().port, path, method, headers: { host, ...headers } }, (incoming) => {
      const chunks = [];
      incoming.on('data', (chunk) => chunks.push(chunk));
      incoming.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: incoming.statusCode, headers: incoming.headers, json: () => JSON.parse(text) });
      });
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

test('a declared hosted application answers its hosts ahead of admission, and the instance still witnesses the request', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'entrance-hosted-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const seen = [];
  const witnessed = [];
  const hostedApp = {
    hosts: ['app.test', 'other.app.test', 'undeclared.app.test'],
    authentication: { scheme: 'bearer' },
    fetch: async (request) => {
      seen.push({ method: request.method, url: request.url, body: request.method === 'POST' ? await request.text() : undefined });
      return Response.json({ served: new URL(request.url).host }, { status: 207 });
    },
  };
  const witness = { onResponse: (ctx) => { witnessed.push(ctx.req?.headers?.host ?? ctx.url.host); } };
  const at = await listening(t, entranceWith(stateDir, [declared(['app.test', 'other.app.test'], hostedApp), witness]));

  const mcp = await at('app.test', '/mcp?x=1', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-proto': 'https' }, body: '{"jsonrpc":"2.0"}' });
  assert.equal(mcp.status, 207);
  assert.deepEqual(mcp.json(), { served: 'app.test' });
  assert.deepEqual(seen.at(-1), { method: 'POST', url: 'https://app.test/mcp?x=1', body: '{"jsonrpc":"2.0"}' });

  const second = await at('Other.App.Test:8443', '/');
  assert.equal(second.status, 207);
  assert.equal(seen.at(-1).url, 'https://other.app.test/');

  // A host the application could answer but the deployment did not declare is not hosted.
  assert.notEqual((await at('undeclared.app.test', '/')).status, 207);

  // The instance's own host still meets its own admission: no principal, no page.
  assert.notEqual((await at('entrance.test', '/')).status, 207);
  assert.equal((await at('entrance.test', '/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal(seen.length, 2);
  // Hosted requests skip the router, not the journal: the instance's response hooks saw them.
  assert.ok(witnessed.includes('app.test') && witnessed.includes('Other.App.Test:8443'));
});

test('a read-only hosted application never sees a state-changing request', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'entrance-hosted-read-only-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const seen = [];
  const at = await listening(t, entranceWith(stateDir, [declared(['pages.test'], {
    hosts: ['pages.test'], authentication: 'none', fetch: (request) => { seen.push(request.method); return new Response('page'); },
  })]));
  assert.equal((await at('pages.test', '/')).status, 200);
  const post = await at('pages.test', '/anything', { method: 'POST', body: 'x' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD, OPTIONS');
  assert.equal((await at('pages.test', '/anything', { method: 'DELETE' })).status, 405);
  assert.deepEqual(seen, ['GET']);
});

test('hosting is refused unless the deployment declares unique hosts and the application declares its authentication', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'entrance-hosted-refusals-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const fetch = () => new Response(null);
  const surface = (hosts, authentication = { scheme: 'bearer' }) => ({ hosts, authentication, fetch });
  assert.throws(() => entranceWith(stateDir, [declared(['entrance.test'], surface(['entrance.test']))]), /own host/u);
  assert.throws(() => entranceWith(stateDir, [declared(['a.test'], surface(['a.test'])), declared(['a.test'], surface(['a.test']))]), /named by two/u);
  assert.throws(() => entranceWith(stateDir, [declared(['Upper.test'], surface(['Upper.test']))]), /lowercase hostname/u);
  assert.throws(() => entranceWith(stateDir, [declared(['a.test'], { hosts: ['a.test'], authentication: 'none' })]), /supplies fetch/u);
  // Hosts the application names for itself are not a deployment declaration.
  assert.throws(() => entranceWith(stateDir, [surface(['a.test'])]), /deployment configuration/u);
  assert.throws(() => entranceWith(stateDir, [declared([], surface(['a.test']))]), /deployment configuration/u);
  assert.throws(() => entranceWith(stateDir, [declared(['b.test'], surface(['a.test']))]), /does not answer for b\.test/u);
  // Deny by default: an application that mutates state must name how it authenticates.
  assert.throws(() => entranceWith(stateDir, [declared(['a.test'], { hosts: ['a.test'], fetch })]), /declares its authentication/u);
  assert.throws(() => entranceWith(stateDir, [declared(['a.test'], surface(['a.test'], { scheme: '' }))]), /declares its authentication/u);
});
