import assert from 'node:assert/strict';
import test from 'node:test';
import { requireInstanceAccessGrants, boundInstanceAccessGrants, instanceMarketAccess } from '../../src/market/instance-access-grants.mjs';
import { admitAccessGrants } from '../../src/market/access-grants.mjs';
const fixture = { type: 'MarketAccessGrants', version: 1, grants: [{ account: '0x0000000000000000000000000000000000000001', operations: ['test-operation'], note: 'isolated test authority', grantedBy: 'test', grantedAt: '2026-01-01' }] };
test('enabled sign-in refuses absent or malformed instance authority', () => {
  for (const value of [undefined, null, '']) assert.throws(() => requireInstanceAccessGrants(value), { code: 'MARKET_ACCESS_AUTHORITY_REQUIRED' });
  for (const value of [{}, [], '{', '{"grants":[]}']) assert.throws(() => requireInstanceAccessGrants(value));
  assert.throws(() => boundInstanceAccessGrants({ X402_SIGN_IN_SECRET: 'test-only-not-a-live-secret' }), { code: 'MARKET_ACCESS_AUTHORITY_REQUIRED' });
});
test('disabled sign-in does not demand or parse an instance grant record', () => {
  assert.equal(boundInstanceAccessGrants({ MARKET_ACCESS_GRANTS: 'malformed-unused-data' }), undefined);
});
test('explicit instance grants retain the existing admission and entitlement semantics', () => {
  for (const input of [fixture, JSON.stringify(fixture)]) {
    const grants = admitAccessGrants(requireInstanceAccessGrants(input), { operations: ['test-operation'] });
    assert.equal(grants.size, 1);
    assert.ok(grants.grantFor('eip155:8453:0x0000000000000000000000000000000000000001', 'test-operation'));
    assert.equal(grants.grantFor('eip155:8453:0x0000000000000000000000000000000000000002', 'test-operation'), null);
  }
  assert.throws(() => admitAccessGrants(requireInstanceAccessGrants(fixture), { operations: [] }));
});
test('actual legacy market refuses missing instance authority before composing a service', async () => {
  const { marketAccess, createMarket561Group } = await import('../../apps/market-561-group/src/market.mjs');
  const env = { X402_SIGN_IN_SECRET: 'isolated-test-only', MARKET_RUNTIME: 'edge' };
  assert.throws(() => marketAccess(env), { code: 'MARKET_ACCESS_AUTHORITY_REQUIRED' });
  assert.throws(() => createMarket561Group(env), { code: 'MARKET_ACCESS_AUTHORITY_REQUIRED' });
  assert.equal(marketAccess({}), undefined);
  const access = marketAccess(env, { grants: { type: 'MarketAccessGrants', version: 1, grants: [] } });
  assert.equal(access.grants.size, 0);
});

test('actual Node receiver refuses missing, NUL and unreadable authority before provider or listener effects', async () => {
  const { spawnSync } = await import('node:child_process');
  const { existsSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const modules = [];
  for (let directory = root; ;) {
    if (existsSync(join(directory, 'node_modules'))) modules.push(join(directory, 'node_modules'));
    const parent = dirname(directory); if (parent === directory) break; directory = parent;
  }
  const permissions = ['--permission', `--allow-fs-read=${root}`, ...modules.map(path => `--allow-fs-read=${path}`)];
  for (const [path, expected] of [[undefined, 'MARKET_ACCESS_AUTHORITY_REQUIRED'], ['bad\0path', 'MARKET_ACCESS_AUTHORITY_REQUIRED'], [join(root, 'test/absent-instance-authority.json'), 'ENOENT']]) {
    const input = { MARKET_DATA_ROOT: '/denied-instance-custody', X402_SIGN_IN_SECRET: 'isolated-test-only', ...(path === undefined ? {} : { MARKET_ACCESS_GRANTS_PATH: path }) };
    const program = `import { main } from ${JSON.stringify(new URL('../../apps/market-561-group/scripts/serve-market.mjs', import.meta.url).href)}; await main(${JSON.stringify(input)});`;
    const result = spawnSync(process.execPath, ['--preserve-symlinks', ...permissions, '--input-type=module', '--eval', program], {
      cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: '/nonexistent-instance-home' },
    });
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.includes(expected), result.stderr);
    assert.doesNotMatch(result.stderr, /ERR_ACCESS_DENIED|ERR_MODULE_NOT_FOUND|ChildProcess/u);
    assert.equal(result.stdout, '');
  }
});

test('native package retains generated/source interfaces while excluding instance and historical records', async () => {
  const { mkdtemp, cp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { execFileSync } = await import('node:child_process');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const temporary = await mkdtemp(join(tmpdir(), 'x402-owned-carriers-'));
  try {
    const source = join(temporary, 'source');
    await cp(root, source, { recursive: true, filter: path => !path.includes('node_modules') && !path.includes('/.git') });
    // Separate ownership controls, never substitutes for actual instance authority/history.
    for (const path of ['data/market-561-group/records/access-grants.json', 'data/settlement-derivation/records/ownership-negative-control.json', 'data/logs/ownership-negative-control.jsonl', 'apps/market-561-group/data/records/custody-records/ownership-negative-control.json', 'content/evm/accounts/ownership-negative-control.json']) {
      const target = join(source, path);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, '{"ownershipNegativeControl":true}\n');
    }
    const [pack] = JSON.parse(execFileSync('npm', ['pack', '--offline', '--json', '--ignore-scripts=false'], { cwd: source, encoding: 'utf8', env: { ...process.env, npm_config_cache: join(temporary, 'cache') } }));
    const paths = pack.files.map(file => file.path);
    assert.ok(!paths.some(path => path.includes('ownership-negative-control') || path.endsWith('/access-grants.json')));
    const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
    assert.equal(manifest.exports['./market-561-group/access-grants'], undefined);
    function targets(value) { return typeof value === 'string' ? [value] : Object.values(value).flatMap(targets); }
    for (const path of [...Object.values(manifest.exports).flatMap(targets), ...Object.values(manifest.bin)]) assert.ok(paths.includes(path.replace(/^\.\//u, '')), path);
    for (const path of manifest.nodeRuntimeGeneration.outputs) assert.ok(paths.includes(path), path);
    assert.ok(paths.includes('data/market-561-group/records/catalog.json'));
    assert.ok(paths.includes('schemas/offer.schema.json'));
    assert.ok(paths.includes('content/requirements/named-wallets-use-named-services-free.json'));
  } finally { await rm(temporary, { recursive: true, force: true }); }
});


test('shared access construction retains existing admission while leaving instance effects deferred', () => {
  let catalogReads = 0;
  const operations = () => { catalogReads++; return ['test-operation']; };
  assert.equal(instanceMarketAccess({}, { operations }), undefined);
  assert.equal(catalogReads, 0);
  assert.throws(() => instanceMarketAccess({ X402_SIGN_IN_SECRET: 'test-only' }, { operations }), { code: 'MARKET_ACCESS_AUTHORITY_REQUIRED' });
  assert.equal(catalogReads, 0);
  const access = instanceMarketAccess({ X402_SIGN_IN_SECRET: 'test-only' }, { grants: fixture, operations, marketName: 'example.test' });
  assert.equal(catalogReads, 1);
  assert.equal(access.origin, 'https://example.test');
  assert.equal(access.grants.size, 1);
  assert.ok(access.grants.grantFor('eip155:8453:0x0000000000000000000000000000000000000001', 'test-operation'));
});

test('actual legacy Worker refuses enabled sign-in without its explicit instance binding', async () => {
  const { default: worker } = await import('../../apps/market-561-group/src/worker.mjs');
  assert.throws(() => worker.fetch(new Request('https://example.test/'), { X402_SIGN_IN_SECRET: 'isolated-test-only' }), { code: 'MARKET_ACCESS_AUTHORITY_REQUIRED' });
});
