import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { OAuthError } from './oauth-error.mjs';

const unavailable = reason => Object.assign(new OAuthError('server_error', 'grant custody is unavailable'), { custodyReason: reason });
const profiles = new Set(['process-local-v1', 'linux-local-flock-v1']);
const localFilesystems = new Set([0xef53, 0x58465342, 0x9123683e, 0x01021994, 0x794c7630]);

function agrees(refreshes, clients, exchange) {
  const at = typeof exchange.now === 'function' ? exchange.now() : Date.now();
  return isDeepStrictEqual(refreshes.get(exchange.key), exchange.expected)
    && exchange.expected !== undefined
    && Number.isFinite(at) && exchange.expected.expiresAt > at
    && (exchange.client === undefined || isDeepStrictEqual(clients.get(exchange.client.key), exchange.client.expected));
}
function prepared(accesses, refreshes, exchange) {
  const { access, refresh } = exchange;
  if (typeof access?.key !== 'string' || typeof refresh?.key !== 'string'
    || refresh.key === exchange.key || accesses.has(access.key) || refreshes.has(refresh.key)
    || !access.value || !refresh.value) throw unavailable('invalid-exchange');
}

/** Existing per-kind JSON layout. The explicit Linux profile requires util-linux flock
 * and a supported local filesystem. Every writer of this directory must use that profile.
 * The default queue only serializes this object and makes no inter-process guarantee. */
export function createJsonFileGrantStore(directory, { profile = 'process-local-v1' } = {}) {
  if (!profiles.has(profile)) throw unavailable('unsupported-profile');
  const kernel = profile === 'linux-local-flock-v1';
  if (kernel && (process.platform !== 'linux' || !path.isAbsolute(directory))) throw unavailable('unsupported-profile');
  const kinds = new Map(), seen = new Map();
  const stamp = async kind => {
    try {
      const stat = await fs.stat(path.join(directory, `${kind}.json`), { bigint: true });
      if (!stat.isFile()) throw unavailable('unreadable');
      return `${stat.dev}:${stat.ino}:${stat.mtimeNs}:${stat.ctimeNs}:${stat.size}`;
    } catch (error) { if (error.code === 'ENOENT') return 'absent'; throw unavailable('unreadable'); }
  };
  const load = async kind => {
    const current = await stamp(kind);
    if (!kinds.has(kind) || seen.get(kind) !== current) {
      let text, entries = {};
      try { text = await fs.readFile(path.join(directory, `${kind}.json`), 'utf8'); }
      catch (error) { if (error.code !== 'ENOENT') throw unavailable('unreadable'); }
      if (text !== undefined) {
        try { entries = JSON.parse(text); } catch { throw unavailable('malformed'); }
        if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) throw unavailable('malformed');
      }
      kinds.set(kind, new Map(Object.entries(entries))); seen.set(kind, current);
    }
    return kinds.get(kind);
  };
  const save = async (kind, next) => {
    const live = Object.fromEntries([...next].filter(([, value]) => !(value?.expiresAt <= Date.now())));
    const file = path.join(directory, `${kind}.json`), temporary = `${file}.${crypto.randomUUID()}.tmp`;
    let handle, owned = false, publicationPossible = false;
    try {
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      handle = await fs.open(temporary, 'wx', 0o600); owned = true;
      await fs.writeFile(handle, JSON.stringify(live));
      if (kernel) await handle.sync();
      await handle.close(); handle = undefined;
      publicationPossible = true;
      await fs.rename(temporary, file);
      if (kernel) {
        const root = await fs.open(directory, constants.O_RDONLY | constants.O_DIRECTORY);
        try { await root.sync(); } finally { await root.close(); }
      }
    } catch { throw unavailable(publicationPossible ? 'publication-uncertain' : 'write-failed'); }
    finally {
      kinds.delete(kind); seen.delete(kind);
      try { await handle?.close(); } catch { /* preserve the bounded failure */ }
      if (owned) try { await fs.unlink(temporary); } catch { /* no private diagnostics */ }
    }
  };
  async function withKernelGate(perform) {
    let lock;
    try {
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const directoryBefore = await fs.lstat(directory);
      if (!directoryBefore.isDirectory() || directoryBefore.isSymbolicLink()
        || !localFilesystems.has((await fs.statfs(directory)).type)) throw unavailable('unsupported-profile');
      const filename = path.join(directory, '.oauth-grants.lock');
      lock = await fs.open(filename, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
      const identity = await lock.stat();
      if (!identity.isFile()) throw unavailable('unreadable');
      const acquired = spawnSync('flock', ['--exclusive', '--nonblock', '--conflict-exit-code', '75', '3'], {
        stdio: ['ignore', 'ignore', 'pipe', lock.fd], encoding: 'utf8', timeout: 10000, maxBuffer: 4096,
      });
      if (acquired.error || (acquired.status !== 0 && acquired.status !== 75)) throw unavailable('lock-unavailable');
      if (acquired.status === 75) throw unavailable('busy');
      const assertBound = async () => {
        const named = await fs.lstat(filename), root = await fs.lstat(directory);
        if (!named.isFile() || named.isSymbolicLink() || named.dev !== identity.dev || named.ino !== identity.ino
          || !root.isDirectory() || root.isSymbolicLink() || root.dev !== directoryBefore.dev || root.ino !== directoryBefore.ino) throw unavailable('binding-changed');
      };
      await assertBound(); kinds.clear(); seen.clear();
      const answer = await perform(assertBound); await assertBound(); return answer;
    } catch (error) { if (error instanceof OAuthError) throw error; throw unavailable('lock-unavailable'); }
    finally { try { await lock?.close(); } catch { throw unavailable('publication-uncertain'); } }
  }
  let pending = Promise.resolve();
  const transact = (perform, write = false) => {
    const result = pending.then(() => write && kernel ? withKernelGate(perform) : perform(async () => {}));
    pending = result.catch(() => undefined); return result;
  };
  return Object.freeze({
    profile,
    get(kind, key) { return transact(async () => (await load(kind)).get(key)); },
    list(kind) { return transact(async () => [...(await load(kind)).values()]); },
    put(kind, key, value) { return transact(async assertBound => { const next = new Map(await load(kind)); next.set(key, value); await assertBound(); await save(kind, next); }, true); },
    delete(kind, key) { return transact(async assertBound => { const next = new Map(await load(kind)); if (next.delete(key)) { await assertBound(); await save(kind, next); } }, true); },
    exchangeRefresh(exchange) {
      return transact(async assertBound => {
        const refreshes = new Map(await load('refresh')), clients = await load('client');
        if (!agrees(refreshes, clients, exchange)) return false;
        const accesses = new Map(await load('access')); prepared(accesses, refreshes, exchange);
        accesses.set(exchange.access.key, exchange.access.value);
        await assertBound(); await save('access', accesses);
        refreshes.delete(exchange.key); refreshes.set(exchange.refresh.key, exchange.refresh.value);
        await assertBound(); await save('refresh', refreshes);
        return true;
      }, true);
    },
  });
}

/** In-memory custody: one synchronous exchange, without filesystem durability claims. */
export function createMemoryGrantStore() {
  const kinds = new Map();
  const map = kind => { if (!kinds.has(kind)) kinds.set(kind, new Map()); return kinds.get(kind); };
  return Object.freeze({
    async get(kind, key) { return map(kind).get(key); },
    async put(kind, key, value) { map(kind).set(key, value); },
    async delete(kind, key) { map(kind).delete(key); },
    async list(kind) { return [...map(kind).values()]; },
    async exchangeRefresh(exchange) {
      const refreshes = map('refresh'), accesses = map('access');
      if (!agrees(refreshes, map('client'), exchange)) return false;
      prepared(accesses, refreshes, exchange);
      accesses.set(exchange.access.key, exchange.access.value);
      refreshes.delete(exchange.key); refreshes.set(exchange.refresh.key, exchange.refresh.value);
      return true;
    },
  });
}
