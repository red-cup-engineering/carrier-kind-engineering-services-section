import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createEnterpriseEntrance } from '../src/entrance.mjs';
import { createEnterpriseServicePlatform } from '../src/serve-instance.mjs';

const profile = 'linux-local-flock-v1';
const utility = process.platform === 'linux' ? spawnSync('flock', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) : undefined;
let skip = process.platform !== 'linux' ? 'Linux kernel custody requires Linux' : utility.error || utility.status !== 0 || !/util-linux/u.test(utility.stdout) ? 'Linux kernel custody requires compatible util-linux flock' : false;
if (!skip && ![0xef53, 0x58465342, 0x9123683e, 0x01021994, 0x794c7630].includes((await fs.statfs(tmpdir())).type)) skip = 'Linux custody test requires a supported local filesystem';
if (skip && process.env.OAUTH_REQUIRE_LINUX_CUSTODY_TESTS === '1') throw new Error(skip);
const until = async fn => { const end = Date.now() + 5000; while (!fn()) { if (Date.now() > end) throw new Error('fixture lifecycle deadline'); await new Promise(resolve => setTimeout(resolve, 5)); } };
const federation = () => ({ clients: new Map(), tools: [], unavailable: [], close: async () => {} });

test('an unavailable explicit grant-store profile refuses before startup', () => {
  assert.throws(() => createEnterpriseEntrance({ publicBaseUrl: 'https://fixture.invalid', stateDir: '/synthetic-unused', instance: { name: 'fixture' } }, { federation: federation(), grantStoreProfile: 'unknown-profile' }));
});

test('bootstrap, full entrance, reset and federation restart retain the selected kernel profile', { skip, timeout: 10000 }, async t => {
  const root = await fs.mkdtemp(join(tmpdir(), 'oauth-platform-profile-'));
  let holder, done, platform, restarted;
  t.after(async () => { if (holder?.exitCode === null) holder.kill(); if (done) await done; if (restarted) await platform.specification.providers.find(row => row.name === 'federation').close(restarted); await platform?.close(); await fs.rm(root, { recursive: true, force: true }); });
  const held = `import fs from 'node:fs/promises'; import {join} from 'node:path'; import {createJsonFileGrantStore} from '@red-cup-engineering/oauth-services-section/authorization-server'; const root=process.argv[1]; const rename=fs.rename; fs.rename=async(...args)=>{if(args[1]===join(root,'client.json')){process.stdout.write('ready\\n');await new Promise(resolve=>process.stdin.once('data',resolve));}return rename(...args);}; await createJsonFileGrantStore(root,{profile:'linux-local-flock-v1'}).put('client','synthetic-held-writer',{client_id:'synthetic-held-writer'});`;
  holder = spawn(process.execPath, [...process.execArgv.filter(arg => arg !== '--test'), '--input-type=module', '-e', held, join(root, 'oauth')], { stdio: ['pipe', 'pipe', 'pipe'] });
  done = new Promise((resolve, reject) => { holder.once('exit', resolve); holder.once('error', reject); });
  await new Promise((resolve, reject) => { holder.stdout.once('data', resolve); holder.once('error', reject); holder.once('exit', code => reject(new Error(`fixture lock holder exited ${code}`))); });
  let fullReady; const full = new Promise(resolve => { fullReady = resolve; }); let calls = 0; const selections = [];
  const environment = { OAUTH_GRANT_STORE_PROFILE: profile };
  platform = createEnterpriseServicePlatform({
    installed: { identity: { id: 'fixture', title: 'Fixture' }, applications: [], schedules: [], web: { companions: [], networkSources: [] } },
    config: { publicBaseUrl: 'https://fixture.invalid', instance: { name: 'fixture', title: 'Fixture' }, stateDir: root, metroplatDataRoot: root, agencyRoot: root, repositoryRoot: root, host: '127.0.0.1', port: 0, upstreams: [], sessionSecret: 'synthetic-fixture-session-secret' },
    environment,
    services: {
      openMetroplatMcp: async () => ({ handle: async () => undefined, close: async () => {} }),
      federateMcpServers: async () => ++calls === 2 ? full : federation(),
      createEnterpriseEntrance(config, options) { selections.push(options.grantStoreProfile); return createEnterpriseEntrance(config, options); },
      activityPubProvider: async () => undefined,
      startNativeApplication: async app => ({ app, port: 0, close: async () => {} }),
    },
  });
  const capabilities = await platform.start(), app = capabilities.entrance.app;
  const registration = () => app.resources.find(row => row.match === '/oauth/register');
  const refusesUnderLock = async () => {
    const url = new URL('https://fixture.invalid/oauth/register');
    const answer = await registration().handler({ url, request: new Request(url, { method: 'POST', body: JSON.stringify({ redirect_uris: ['https://fixture.invalid/callback'] }) }) });
    assert.equal(answer.status, 500); assert.equal(JSON.parse(answer.body).error, 'server_error');
  };
  const initial = registration(); await refusesUnderLock();
  environment.OAUTH_GRANT_STORE_PROFILE = 'process-local-v1';
  fullReady(federation()); await until(() => platform.providerStates().federation.state === 'started');
  assert.notEqual(registration(), initial); await refusesUnderLock();
  const lifecycle = platform.specification.providers.find(row => row.name === 'federation');
  await lifecycle.close(platform.capabilities().federation);
  assert.equal(registration(), initial); await refusesUnderLock();
  restarted = await lifecycle.start(platform.capabilities());
  assert.notEqual(registration(), initial); await refusesUnderLock();
  assert.deepEqual(selections, [profile, profile, profile]);
  holder.stdin.end('release'); assert.equal(await done, 0);
  assert.deepEqual(Object.keys(JSON.parse(await fs.readFile(join(root, 'oauth', 'client.json'), 'utf8'))), ['synthetic-held-writer']);
});
