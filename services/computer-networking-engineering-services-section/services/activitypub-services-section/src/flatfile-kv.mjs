import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

/**
 * Fedify's key-value store as flat files: one file per key, named by the SHA-256 of the key's
 * canonical JSON and holding `{key, value, expires}`. What Fedify keeps here is disposable (remote
 * documents and keys it fetched, idempotence marks), so a file is the whole substrate: written to a
 * temporary name and renamed into place, read whole, removed on delete or when its time has passed.
 * Compare-and-swap is serialized within the process, which is the store's one writer.
 */
export class FlatfileKvStore {
  #directory;
  #held = Promise.resolve();

  constructor({ directory }) {
    if (typeof directory !== "string" || directory === "") throw new TypeError("flatfile KV store requires a directory");
    this.#directory = path.resolve(directory);
    mkdirSync(this.#directory, { recursive: true, mode: 0o700 });
  }

  get directory() { return this.#directory; }

  #file(key) {
    if (!Array.isArray(key) || key.some((part) => typeof part !== "string")) throw new TypeError("Fedify KV key must be an array of strings");
    return path.join(this.#directory, `${createHash("sha256").update(canonicalJson(key)).digest("hex")}.json`);
  }

  #read(file) {
    let entry;
    try { entry = JSON.parse(readFileSync(file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
    if (entry.expires != null && entry.expires <= Date.now()) {
      rmSync(file, { force: true });
      return undefined;
    }
    return entry;
  }

  #write(key, value, options) {
    const file = this.#file(key);
    const ttl = options?.ttl;
    const expires = ttl === undefined ? null : Date.now() + Number(ttl.total ? ttl.total("millisecond") : ttl);
    const temporary = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    writeFileSync(temporary, JSON.stringify({ key, value, expires }), { mode: 0o600 });
    renameSync(temporary, file);
  }

  async get(key) { return this.#read(this.#file(key))?.value; }

  async set(key, value, options) {
    this.#write(key, value, options);
  }

  async delete(key) { rmSync(this.#file(key), { force: true }); }

  async cas(key, expectedValue, newValue, options) {
    const run = this.#held.then(() => {
      const current = this.#read(this.#file(key))?.value;
      if (canonicalJson(current ?? null) !== canonicalJson(expectedValue ?? null)) return false;
      if (newValue === undefined) rmSync(this.#file(key), { force: true });
      else this.#write(key, newValue, options);
      return true;
    });
    this.#held = run.catch(() => {});
    return run;
  }

  async *list(prefix = []) {
    for (const name of readdirSync(this.#directory)) {
      if (!name.endsWith(".json")) continue;
      const entry = this.#read(path.join(this.#directory, name));
      if (entry === undefined || prefix.some((part, index) => entry.key[index] !== part) || entry.key.length < prefix.length) continue;
      yield Object.freeze({ key: entry.key, value: entry.value });
    }
  }
}
