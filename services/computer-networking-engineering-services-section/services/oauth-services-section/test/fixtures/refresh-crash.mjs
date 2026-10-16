import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createJsonFileGrantStore } from '../../src/authorization-server.mjs';
const [root, phase] = process.argv.slice(2);
if (!root || !['before-refresh', 'after-refresh'].includes(phase)) throw new Error('invalid synthetic crash fixture');
const store = createJsonFileGrantStore(root, { profile: 'linux-local-flock-v1' });
const key = createHash('sha256').update('synthetic-old-refresh').digest('base64url');
const expected = await store.get('refresh', key), client = await store.get('client', 'fixture-client');
const rename = fs.rename;
fs.rename = async (...args) => {
  if (args[1] === join(root, 'refresh.json') && phase === 'before-refresh') process.exit(73);
  await rename(...args);
  if (args[1] === join(root, 'refresh.json') && phase === 'after-refresh') process.exit(73);
};
await store.exchangeRefresh({ key, expected, client: { key: 'fixture-client', expected: client },
  access: { key: 'synthetic-access-child', value: { ...expected, expiresAt: Date.now() + 60000 } },
  refresh: { key: 'synthetic-refresh-child', value: { ...expected, expiresAt: Date.now() + 60000 } } });
throw new Error('crash fixture did not reach its selected publication boundary');
