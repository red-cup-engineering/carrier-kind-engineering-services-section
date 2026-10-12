import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { metroplatAuthorizationStore } from '../scripts/metroplat-admit-principal.mjs';
test('principal-admission custody refuses an unavailable explicit profile', () => {
  assert.throws(() => metroplatAuthorizationStore('/synthetic-unused', 'https://fixture.invalid', { grantStoreProfile: 'unknown-profile' }));
  assert.equal(typeof metroplatAuthorizationStore('/synthetic-unused', 'https://fixture.invalid').registerMachineClient, 'function');
});

for (const source of ['flag', 'environment']) test(`actual admission CLI forwards the ${source} profile and refuses before issuing a client`, async t => {
  const root = await fs.mkdtemp(join(tmpdir(), 'oauth-cli-profile-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const script = new URL('../scripts/metroplat-admit-principal.mjs', import.meta.url);
  const args = [...process.execArgv.filter(arg => arg !== '--test'), script.pathname, '--actor', 'actor:synthetic-fixture', '--state-dir', root, '--issuer', 'https://fixture.invalid', ...(source === 'flag' ? ['--grant-store-profile', 'unknown-profile'] : [])];
  const child = spawn(process.execPath, args, { env: { PATH: process.env.PATH, ...(source === 'environment' ? { OAUTH_GRANT_STORE_PROFILE: 'unknown-profile' } : {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; }); child.stdout.resume();
  const code = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  assert.equal(code, 1); assert.match(stderr, /grant custody|grant custody profile/);
  assert.equal((await fs.readdir(root)).includes('oauth'), false);
});
