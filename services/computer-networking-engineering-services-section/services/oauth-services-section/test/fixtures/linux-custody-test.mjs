import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createJsonFileGrantStore } from '../../src/authorization-server.mjs';

async function unavailableReason() {
  if (process.platform !== 'linux') return 'explicit Linux custody qualification requires Linux';
  const utility = spawnSync('flock', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (utility.error?.code === 'ENOENT') return 'explicit Linux custody qualification requires util-linux flock';
  if (utility.error || utility.status !== 0 || !/util-linux/u.test(utility.stdout)) return 'explicit Linux custody qualification requires a compatible util-linux flock';
  const root = await fs.mkdtemp(join(tmpdir(), 'oauth-profile-probe-'));
  try { await createJsonFileGrantStore(root, { profile: 'linux-local-flock-v1' }).put('client', 'synthetic-probe', { client_id: 'synthetic-probe' }); }
  catch (error) { if (error.custodyReason === 'unsupported-profile') return 'the test directory is outside the supported Linux local filesystem profile'; throw error; }
  finally { await fs.rm(root, { recursive: true, force: true }); }
  return undefined;
}
export const linuxCustodyUnavailable = await unavailableReason();
if (process.env.OAUTH_REQUIRE_LINUX_CUSTODY_TESTS === '1' && linuxCustodyUnavailable !== undefined) throw new Error(linuxCustodyUnavailable);
