import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
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
    for (const name of readdirSync(this.#claimed)) renameSync(path.join(this.#claimed, name), path.join(this.#ready, name));
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
