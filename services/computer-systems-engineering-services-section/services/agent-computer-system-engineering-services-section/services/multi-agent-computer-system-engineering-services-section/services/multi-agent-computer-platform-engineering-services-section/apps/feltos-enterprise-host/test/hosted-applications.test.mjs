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

test('a hosted application answers every request for its hosts, ahead of admission and the instance routes', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'entrance-hosted-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const seen = [];
  const hostedApp = {
    hosts: ['app.test', 'other.app.test'],
    fetch: async (request) => {
      seen.push({ method: request.method, url: request.url, body: request.method === 'POST' ? await request.text() : undefined });
      return Response.json({ served: new URL(request.url).host }, { status: 207 });
    },
  };
  const entrance = entranceWith(stateDir, [{ factory: () => hostedApp }]);
  const server = createNativeApplicationServer({ ...entrance.app, base: origin });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  // fetch() may not set Host, so the listener is reached over node:http with the Host a visitor names.
  const at = (host, path, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const outgoing = httpRequest({ host: '127.0.0.1', port: server.address().port, path, method, headers: { host, ...headers } }, (incoming) => {
      const chunks = [];
      incoming.on('data', (chunk) => chunks.push(chunk));
      incoming.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: incoming.statusCode, json: () => JSON.parse(text) });
      });
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });

  const mcp = await at('app.test', '/mcp?x=1', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-proto': 'https' }, body: '{"jsonrpc":"2.0"}' });
  assert.equal(mcp.status, 207);
  assert.deepEqual(await mcp.json(), { served: 'app.test' });
  assert.deepEqual(seen.at(-1), { method: 'POST', url: 'https://app.test/mcp?x=1', body: '{"jsonrpc":"2.0"}' });

  const second = await at('Other.App.Test:8443', '/');
  assert.equal(second.status, 207);
  assert.equal(seen.at(-1).url, 'https://other.app.test/');

  // The instance's own host still meets its own admission: no principal, no page.
  const own = await at('entrance.test', '/');
  assert.notEqual(own.status, 207);
  const ownMcp = await at('entrance.test', '/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(ownMcp.status, 401);
  assert.equal(seen.length, 2);
});

test('hosted applications name valid, unique hosts other than the instance', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'entrance-hosted-refusals-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const fetch = () => new Response(null);
  assert.throws(() => entranceWith(stateDir, [{ hosts: ['entrance.test'], fetch }]), /own host/u);
  assert.throws(() => entranceWith(stateDir, [{ hosts: ['a.test'], fetch }, { hosts: ['a.test'], fetch }]), /named by two/u);
  assert.throws(() => entranceWith(stateDir, [{ hosts: ['Upper.test'], fetch }]), /lowercase hostname/u);
  assert.throws(() => entranceWith(stateDir, [{ hosts: ['a.test'] }]), /supplies fetch/u);
  assert.throws(() => entranceWith(stateDir, [{ hosts: [], fetch }]), /names its hosts/u);
});
