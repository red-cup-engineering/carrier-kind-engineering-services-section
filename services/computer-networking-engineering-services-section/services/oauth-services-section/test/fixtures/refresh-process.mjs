import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createJsonFileGrantStore } from '../../src/authorization-server.mjs';
const [root, mode, suffix = 'child'] = process.argv.slice(2);
if (!root || !['exchange', 'hold-client-write'].includes(mode) || !process.send) throw new Error('invalid synthetic process fixture');
const store = createJsonFileGrantStore(root, { profile: 'linux-local-flock-v1' });
const go = () => new Promise(resolve => process.once('message', resolve));
if (mode === 'hold-client-write') {
  const rename = fs.rename;
  fs.rename = async (...args) => {
    if (args[1] === join(root, 'client.json')) { process.send({ ready: true }); await go(); }
    return rename(...args);
  };
  await store.put('client', 'synthetic-held-writer', { client_id: 'synthetic-held-writer' });
  process.send({ result: 'written' });
} else {
  const key = createHash('sha256').update('synthetic-old-refresh').digest('base64url');
  const expected = await store.get('refresh', key), client = await store.get('client', 'fixture-client');
  process.send({ ready: true }); await go();
  try {
    const applied = await store.exchangeRefresh({ key, expected, client: { key: 'fixture-client', expected: client },
      access: { key: `synthetic-access-${suffix}`, value: { ...expected, expiresAt: Date.now() + 60000 } },
      refresh: { key: `synthetic-refresh-${suffix}`, value: { ...expected, expiresAt: Date.now() + 60000 } } });
    process.send({ result: applied ? 'applied' : 'already-consumed' });
  } catch (error) { process.send({ result: 'refused', reason: error.custodyReason }); }
}
process.disconnect();
