import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createSessionCookie } from '@red-cup-engineering/computer-web-server/admission/session';
import { hashPrincipalSecret, writePrincipalsFile } from '@red-cup-engineering/computer-web-server/admission/principals';
import { createNativeApplicationServer } from '@red-cup-engineering/computer-web-server/native-application';
import { createEnterpriseEntrance } from '../src/entrance.mjs';

test('the real enterprise entrance requires external account confirmation and binds switch to browser admission', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'entrance-account-selection-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const origin = 'https://entrance.test';
  const secret = 'synthetic-session-secret-only';
  const entrance = createEnterpriseEntrance({
    publicBaseUrl: origin, stateDir, sessionSecret: secret,
    allowedEmail: 'human@example.test', instance: { name: 'fixture', title: 'Fixture' },
    google: { clientId: 'fixture-client', clientSecret: 'fixture-secret' },
  }, { federation: { clients: new Map(), tools: [], unavailable: [] }, sessionCookiePrefix: 'crg' });
  const cookie = createSessionCookie({
    name: 'crg_session', subject: 'fixture-google-subject', subjectHash: 'fixture-google-hash',
    email: 'human@example.test', secret, now: Date.now,
  }).split(';')[0];
  const route = (method, path, body) => {
    const url = new URL(path, origin);
    const request = new Request(url, {
      method, headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/x-www-form-urlencoded' }) },
      ...(body === undefined ? {} : { body }),
    });
    return entrance.authorization.app.resources.find((resource) => resource.match === url.pathname)
      .handler({ url, request, locals: {}, trace: { id: 'synthetic' } });
  };
  const client = await entrance.authorization.registerClient({ client_name: 'Connector', redirect_uris: ['https://connector.test/callback'] });
  const verifier = randomBytes(32).toString('base64url');
  const params = new URLSearchParams({
    response_type: 'code', client_id: client.client_id, redirect_uri: client.redirect_uris[0],
    code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    state: 'original-state', resource: origin + '/mcp',
  });
  const path = '/oauth/authorize?' + params;
  const requestId = (page) => /name="request" value="([^"]+)"/u.exec(page.body)[1];
  const first = await route('GET', path);
  assert.equal(first.status, 200);
  const approved = await route('POST', '/oauth/authorize', new URLSearchParams({ request: requestId(first), decision: 'approve' }).toString());
  assert.ok(new URL(approved.headers.location).searchParams.get('code'));
  const repeated = await route('GET', path);
  assert.equal(repeated.status, 200, 'the configured entrance does not silently reuse remembered consent');
  assert.match(repeated.body, /Use another account/u);
  const switched = await route('POST', '/oauth/authorize', new URLSearchParams({ request: requestId(repeated), decision: 'switch-account' }).toString());
  assert.ok(switched instanceof Response);
  assert.equal(switched.status, 303);
  assert.equal(new URL(switched.headers.get('location'), origin).searchParams.get('return_to'), path);
  const cleared = switched.headers.getSetCookie();
  for (const name of ['crg_session', 'crg_password_session', 'crg_hive_session']) {
    assert.ok(cleared.some((value) => value.startsWith(name + '=') && /Max-Age=0/iu.test(value)), name);
  }
});

test('merged entrance switches through password CSRF login and redeems only the newly authenticated subject', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'entrance-account-roundtrip-'));
  const origin = 'https://entrance.test';
  const secret = 'synthetic-session-secret-only';
  const password = 'synthetic-agent-password-only';
  writePrincipalsFile(stateDir, [{ kind: 'human', username: 'existing-agent', ...hashPrincipalSecret(password) }]);
  const entrance = createEnterpriseEntrance({
    publicBaseUrl: origin, stateDir, sessionSecret: secret,
    allowedEmail: 'human@example.test', instance: { name: 'fixture', title: 'Fixture' },
    google: { clientId: 'fixture-client', clientSecret: 'fixture-secret' },
  }, { federation: { clients: new Map(), tools: [], unavailable: [] }, sessionCookiePrefix: 'crg' });
  const server = createNativeApplicationServer({ ...entrance.app, base: origin });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(stateDir, { recursive: true, force: true });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const local = 'http://127.0.0.1:' + server.address().port;
  const initial = createSessionCookie({
    name: 'crg_session', subject: 'fixture-google-subject', subjectHash: 'fixture-google-hash',
    email: 'human@example.test', secret, now: Date.now,
  }).split(';')[0];
  const jar = new Map([[initial.slice(0, initial.indexOf('=')), initial.slice(initial.indexOf('=') + 1)]]);
  // Only loopback is contacted. Redirects are inspected, never followed to Google or the client.
  const request = async (method, path, body) => {
    assert.ok(path.startsWith('/') && !path.startsWith('//'));
    const response = await fetch(local + path, {
      method, redirect: 'manual',
      headers: { cookie: [...jar].map(([name, value]) => name + '=' + value).join('; '),
        ...(body === undefined ? {} : { 'content-type': 'application/x-www-form-urlencoded', origin }) },
      ...(body === undefined ? {} : { body: new URLSearchParams(body).toString() }),
    });
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(';')[0], split = pair.indexOf('=');
      const name = pair.slice(0, split);
      if (/Max-Age=0/iu.test(header)) jar.delete(name);
      else jar.set(name, pair.slice(split + 1));
    }
    return response;
  };
  const client = await entrance.authorization.registerClient({ client_name: 'Connector', redirect_uris: ['https://connector.test/callback'] });
  const verifier = randomBytes(32).toString('base64url');
  const params = new URLSearchParams({
    response_type: 'code', client_id: client.client_id, redirect_uri: client.redirect_uris[0],
    code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    state: 'original & state', resource: origin + '/mcp', scope: 'read',
  });
  const path = '/oauth/authorize?' + params;
  const first = await request('GET', path);
  assert.equal(first.status, 200);
  const priorRequest = /name="request" value="([^"]+)"/u.exec(await first.text())[1];
  const switched = await request('POST', '/oauth/authorize', { request: priorRequest, decision: 'switch-account' });
  assert.equal(switched.status, 303);
  assert.equal(jar.has('crg_session'), false);
  const selector = await request('GET', switched.headers.get('location'));
  assert.equal(selector.status, 200);
  const html = await selector.text();
  const passwordPath = /href="(\/login\/password\?[^"]+)"/u.exec(html)[1];
  const login = await request('GET', passwordPath);
  const loginHtml = await login.text();
  const csrf = /name="csrf" value="([^"]+)"/u.exec(loginHtml)[1];
  const hiddenReturnTo = /name="return_to" value="([^"]*)"/u.exec(loginHtml)[1]
    .replace(/&#(\d+);/gu, (_, code) => String.fromCharCode(Number(code)));
  assert.equal(hiddenReturnTo, path, 'the rendered password form preserves the original authorization request');
  const signedIn = await request('POST', '/login/password', { csrf, return_to: hiddenReturnTo, username: 'existing-agent', password });
  assert.equal(signedIn.status, 303);
  assert.equal(signedIn.headers.get('location'), path);
  assert.ok(jar.has('crg_password_session'));
  const stale = await request('POST', '/oauth/authorize', { request: priorRequest, decision: 'approve' });
  assert.equal((await stale.json()).error, 'invalid_request');
  const second = await request('GET', signedIn.headers.get('location'));
  const secondHtml = await second.text();
  assert.match(secondHtml, /existing-agent/u);
  const currentRequest = /name="request" value="([^"]+)"/u.exec(secondHtml)[1];
  const approved = await request('POST', '/oauth/authorize', { request: currentRequest, decision: 'approve' });
  const callback = new URL(approved.headers.get('location'));
  assert.equal(callback.origin + callback.pathname, client.redirect_uris[0]);
  assert.equal(callback.searchParams.get('state'), 'original & state');
  const tokenResponse = await request('POST', '/oauth/token', {
    grant_type: 'authorization_code', code: callback.searchParams.get('code'), client_id: client.client_id,
    redirect_uri: client.redirect_uris[0], code_verifier: verifier, resource: origin + '/mcp',
  });
  assert.equal(tokenResponse.status, 200);
  const tokens = await tokenResponse.json();
  const claims = await entrance.authorization.verifyToken(tokens.access_token, { resource: origin + '/mcp' });
  assert.equal(claims.subject, 'password:' + createHash('sha256').update('password:existing-agent').digest('hex'));
  assert.equal(claims.principal.name, 'existing-agent');
  assert.equal(claims.client_id, client.client_id);
  assert.equal(claims.scope, 'read');
  assert.equal(claims.resource, origin + '/mcp');
});
