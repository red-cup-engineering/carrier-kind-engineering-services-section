#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setImmediate } from "node:timers/promises";

const durationMs = (duration) => (duration == null ? 0 : Number(typeof duration.total === "function" ? duration.total("millisecond") : duration));

/**
 * Fedify's durable message queue as a spool of flat files, one per message: `ready/` holds what
 * waits, named `<due ms>-<id>.json` so a directory listing is the schedule, and a worker claims a
 * message by renaming it into `claimed/` before handing it on, so no two handlers take the same one.
 * A handled message is removed. A message claimed when a process stopped is put back in `ready/`
 * when the queue next opens, so outgoing deliveries survive a restart (at least once; Fedify's own
 * retry policy and idempotence own repeats, as with every queue that does not retry natively).
 * Messages sharing an ordering key are handed on one at a time.
 */
export class FlatfileMessageQueue {
  #ready;
  #claimed;
  #pollMs;
  #wake = new Set();
  #ordering = new Set();
  nativeRetrial = false;

  constructor({ directory, pollInterval = 1_000 }) {
    if (typeof directory !== "string" || directory === "") throw new TypeError("flatfile message queue requires a directory");
    this.#ready = path.join(path.resolve(directory), "ready");
    this.#claimed = path.join(path.resolve(directory), "claimed");
    mkdirSync(this.#ready, { recursive: true, mode: 0o700 });
    mkdirSync(this.#claimed, { recursive: true, mode: 0o700 });
    this.#pollMs = durationMs(pollInterval);
    // Check every recovery destination before moving even one claimed file.
    // rename(2) replaces an existing file silently: do not destroy ready custody
    // when a resumed worker and a preserved claim share a filename.
    const stranded = readdirSync(this.#claimed);
    for (const name of stranded) {
      if (existsSync(path.join(this.#ready, name))) {
        throw new Error("flatfile queue recovery refuses claimed/ready filename collision");
      }
    }
    for (const name of stranded) renameSync(path.join(this.#claimed, name), path.join(this.#ready, name));
  }

  #put(message, options, now) {
    const due = now + durationMs(options?.delay);
    const name = `${String(due).padStart(15, "0")}-${randomUUID()}.json`;
    const temporary = path.join(this.#ready, `.${name}.tmp`);
    writeFileSync(temporary, JSON.stringify({ message, orderingKey: options?.orderingKey ?? null }), { mode: 0o600 });
    renameSync(temporary, path.join(this.#ready, name));
    return due - now;
  }

  #notify(delayMs) {
    for (const wake of this.#wake) wake(delayMs);
  }

  async enqueue(message, options) {
    this.#notify(this.#put(message, options, Date.now()));
  }

  async enqueueMany(messages, options) {
    const now = Date.now();
    let delayMs = 0;
    for (const message of messages) delayMs = this.#put(message, options, now);
    if (messages.length > 0) this.#notify(delayMs);
  }

  async getDepth() {
    const now = Date.now();
    const names = readdirSync(this.#ready).filter((name) => name.endsWith(".json") && !name.startsWith("."));
    const ready = names.filter((name) => Number(name.slice(0, 15)) <= now).length;
    return { queued: names.length, ready, delayed: names.length - ready };
  }

  /** The next due message whose ordering key is not being handled, claimed; or undefined. */
  #claim() {
    const now = Date.now();
    for (const name of readdirSync(this.#ready).filter((entry) => entry.endsWith(".json") && !entry.startsWith(".")).sort()) {
      if (Number(name.slice(0, 15)) > now) return undefined;
      const claimed = path.join(this.#claimed, name);
      try { renameSync(path.join(this.#ready, name), claimed); }
      catch (error) { if (error.code === "ENOENT") continue; throw error; }
      const entry = JSON.parse(readFileSync(claimed, "utf8"));
      if (entry.orderingKey != null && this.#ordering.has(entry.orderingKey)) {
        renameSync(claimed, path.join(this.#ready, name));
        continue;
      }
      return { claimed, ...entry };
    }
    return undefined;
  }

  async listen(handler, options) {
    const signal = options?.signal;
    const timeouts = new Set();
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        while (signal == null || !signal.aborted) {
          const next = this.#claim();
          if (next === undefined) break;
          if (next.orderingKey != null) this.#ordering.add(next.orderingKey);
          try {
            // Let HTTP, timers and shutdown run between messages, as the SQLite queue did.
            await setImmediate();
            await handler(next.message);
          } catch {
            // Fedify's retry policy re-enqueues what it will retry; a failed handling is not kept.
          } finally {
            if (next.orderingKey != null) this.#ordering.delete(next.orderingKey);
            rmSync(next.claimed, { force: true });
          }
        }
      } finally {
        polling = false;
      }
    };
    const wake = (delayMs) => {
      if (delayMs < 1) void poll();
      else { const timeout = setTimeout(() => { timeouts.delete(timeout); void poll(); }, delayMs); timeouts.add(timeout); }
    };
    this.#wake.add(wake);
    const stop = () => { this.#wake.delete(wake); for (const timeout of timeouts) clearTimeout(timeout); };
    signal?.addEventListener("abort", stop, { once: true });
    try {
      if (signal?.aborted) return;
      await poll();
      while (signal == null || !signal.aborted) {
        await new Promise((resolve) => {
          let timeout;
          const finish = () => {
            clearTimeout(timeout);
            signal?.removeEventListener("abort", finish);
            resolve();
          };
          timeout = setTimeout(finish, this.#pollMs);
          signal?.addEventListener("abort", finish, { once: true });
          if (signal?.aborted) finish();
        });
        await poll();
      }
    } finally {
      stop();
      signal?.removeEventListener("abort", stop);
    }
  }
}

/**
 * Receive quarantined ActivityPub spool custody into a quiescent live queue.
 * Ready sources can be received without reconstructing a handler outcome.
 * Previously claimed sources are admitted only with an independent historical
 * handling-journal reader that distinguishes consumed from unhandled entries.
 *
 * The caller must hold the release lease and prove the queue's worker is stopped.
 * No source file is moved, renamed, rewritten, or deleted. The source and
 * destination are sibling paths on the same filesystem: hard links preserve
 * bytes and refuse replacing a pre-existing destination.
 */
export function receivePreservedQueue({ directory, incident, expectedReady, expectedClaimed, assertQuiescent, inspectClaimedHandling }) {
  if (typeof directory !== 'string' || !directory ||
      !/^incident-[0-9]{8}T[0-9]{6}Z-[0-9]+$/u.test(incident ?? '') ||
      !Number.isSafeInteger(expectedReady) || expectedReady < 0 || expectedReady > 20000 ||
      !Number.isSafeInteger(expectedClaimed) || expectedClaimed < 0 || expectedClaimed > 20000 ||
      typeof assertQuiescent !== 'function' ||
      (inspectClaimedHandling !== undefined && typeof inspectClaimedHandling !== 'function')) {
    throw new TypeError('queue receiving requires a named incident, bounded source counts, and an exclusive quiescence guard');
  }
  const root = path.resolve(directory);
  const directoryAt = name => path.join(root, name);
  const assertDirectory = file => {
    const stat = lstatSync(file);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('queue receiving refuses redirected or non-directory custody');
  };
  assertDirectory(root);
  const oldReady = directoryAt('ready.' + incident);
  const oldClaimed = directoryAt('claimed.' + incident);
  const ready = directoryAt('ready');
  const claimed = directoryAt('claimed');
  for (const dir of [oldReady, oldClaimed, ready, claimed]) assertDirectory(dir);
  const sourceFiles = (dir, expected) => {
    const names = readdirSync(dir).sort();
    if (names.length !== expected) throw new Error('queue source count changed since incident custody was identified');
    const files = new Map();
    for (const name of names) {
      if (!/^[0-9]{15}-[a-z0-9-]+\.json$/u.test(name)) throw new Error('quarantined queue has a non-delivery file');
      const file = path.join(dir, name), stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 5 * 1024 * 1024) {
        throw new Error('quarantined queue entry is not a bounded regular file');
      }
      const bytes = readFileSync(file);
      const record = JSON.parse(bytes.toString('utf8'));
      if (!record || typeof record !== 'object' || Array.isArray(record) || !Object.hasOwn(record, 'message')) {
        throw new Error('quarantined queue entry is not an admitted message');
      }
      files.set(name, { file, digest: createHash('sha256').update(bytes).digest('hex'), length: bytes.length });
    }
    return files;
  };
  // Observe all four paths before any mutation, including already-claimed live custody.
  assertQuiescent();
  const preserved = sourceFiles(oldReady, expectedReady);
  const unresolved = sourceFiles(oldClaimed, expectedClaimed);
  for (const name of unresolved.keys()) if (preserved.has(name)) {
    throw new Error('quarantined ready/claimed have a conflicting message identity');
  }
  const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  const plans = [];
  let handledClaimed = 0, claimedUnresolved = 0;
  const candidates = [...[...preserved].map(([name, entry]) => ({ name, ...entry, origin: 'ready' }))];
  for (const [name, entry] of unresolved) {
    if (!inspectClaimedHandling) { claimedUnresolved++; continue; }
    // The historical journal provider verifies this entry's handling identity.
    // A returned/threw outcome is handling evidence, *not* remote delivery proof.
    const observed = inspectClaimedHandling({ filename: name, entry: JSON.parse(readFileSync(entry.file, 'utf8')) });
    if (observed !== undefined) {
      if (!observed || observed.filename !== name || !['returned', 'threw'].includes(observed.handlerResult)) {
        throw new Error('historical claimed outcome lacks a verified handler result');
      }
      handledClaimed++;
      continue;
    }
    candidates.push({ name, ...entry, origin: 'claimed' });
  }
  for (const { name, origin, ...entry } of candidates) {
    const destination = path.join(ready, name);
    const exists = [];
    for (const phase of [ready, claimed]) {
      const other = path.join(phase, name);
      if (!existsSync(other)) continue;
      const stat = lstatSync(other);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.length || digest(other) !== entry.digest) {
        throw new Error('live queue contains a conflicting custody identity');
      }
      exists.push(other);
    }
    if (exists.length > 1) throw new Error('live queue holds both ready and claimed forms of one identity');
    plans.push({ name, origin, ...entry, destination, alreadyClaimed: exists.includes(path.join(claimed, name)) });
  }
  // Previously handled claim files remain in original custody, never requeued.
  // Unresolved claims also remain in original custody for later proof.
  assertQuiescent();
  let linked = 0, alreadyPresent = 0, claimedLinked = 0;
  for (const { origin, file, digest: originalDigest, length, destination, alreadyClaimed } of plans) {
    assertQuiescent();
    const sourceStat = lstatSync(file);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink() || sourceStat.size !== length || digest(file) !== originalDigest) {
      throw new Error('quarantined source changed during receiving');
    }
    if (alreadyClaimed) { alreadyPresent++; continue; }
    try {
      linkSync(file, destination); // EEXIST refuses replacement under concurrent change.
      linked++;
      if (origin === 'claimed') claimedLinked++;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const stat = lstatSync(destination);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== length || digest(destination) !== originalDigest) throw error;
      alreadyPresent++;
    }
    const stat = lstatSync(destination);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== length || digest(destination) !== originalDigest) {
      throw new Error('received queue bytes differ from quarantined custody');
    }
  }
  const directoryFd = openSync(ready, 'r');
  try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
  assertQuiescent();
  return Object.freeze({ kind: 'activitypub-preserved-ready-receiving',
    sourceReady: expectedReady, sourceClaimed: expectedClaimed,
    linked, alreadyPresent, claimedLinked, claimedHandled: handledClaimed,
    claimedUnresolved, originalFilesPreserved: true, deliveryObserved: false });
}

// This is the existing queue's operational receiver, not a second daemon.
// LAGOON holds its exclusive release lease and stops the named service first.
// Never run this a second time after that service has resumed without an
// independent historical outcome reconciliation.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [operation, directory, incident, readyCount, claimedCount, service, historicalQueueSource] = process.argv.slice(2);
  if (operation !== 'receive-preserved' || !/^[a-z0-9-]+\.service$/u.test(service ?? '') ||
      !/^[0-9]+$/u.test(readyCount ?? '') || !/^[0-9]+$/u.test(claimedCount ?? '')) {
    throw new Error('usage: receive-preserved-activitypub-spool receive-preserved QUEUE_ROOT INCIDENT READY_COUNT CLAIMED_COUNT STOPPED_UNIT [VERIFIED_HISTORICAL_QUEUE_MODULE]');
  }
  const serviceStopped = () => {
    const state = spawnSync('systemctl', ['--user', 'is-active', service], {
      encoding: 'utf8', timeout: 8000, maxBuffer: 4096,
    });
    if (state.error || !['inactive', 'failed'].includes(state.stdout?.trim()) || state.status === 0) {
      throw new Error('ActivityPub receiving refuses an active, missing, or unreadable service state');
    }
  };
  // The archived claimed entry must be judged against its own *old* durable
  // handling journal. This is the exact former Cold Red Gate queue source,
  // not a replacement for the current ActivityPub provider.
  let inspectClaimedHandling;
  if (historicalQueueSource !== undefined) {
    if (!path.isAbsolute(historicalQueueSource)) throw new Error('historical queue reader must be an absolute installed source path');
    const source = realpathSync(historicalQueueSource), bytes = readFileSync(source);
    const objectId = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    if (objectId !== '3303dc406375404f690ab691f2aff81765c89a7d') {
      throw new Error('historical queue reader differs from the incident-qualified source');
    }
    const historic = await import(pathToFileURL(source).href);
    if (typeof historic.inspectQueueHandling !== 'function') throw new Error('verified historical reader lacks handling inspection');
    inspectClaimedHandling = ({ filename, entry }) => historic.inspectQueueHandling(directory, { filename, entry });
  }
  // The release lease prevents competing activation; sample the supervisor
  // every 64 arrivals rather than launching thousands of systemctl processes.
  let calls = 0;
  const assertQuiescent = () => { if (++calls % 64 === 1) serviceStopped(); };
  const result = receivePreservedQueue({
    directory, incident, expectedReady: Number(readyCount), expectedClaimed: Number(claimedCount),
    assertQuiescent, inspectClaimedHandling,
  });
  serviceStopped();
  process.stdout.write(JSON.stringify(result) + '\n');
}
