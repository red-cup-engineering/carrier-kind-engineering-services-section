// The media a SignCraft history store is tested over: the content kernel (createContentHistoryStore)
// on in-memory storage and the flatfile port. Every store contract runs over each
// medium; what a medium exposes beyond the store (its published root, how many objects it holds, a
// way to fail its next publication or overwrite an object) is for the tests to observe effects, not
// part of the contract.
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileStoreSync } from "@red-cup-engineering/immutable-content-custody-service/file-store";
import { createFileContentReference } from "@red-cup-engineering/immutable-content-custody-service/file-reference";
import { immutableContentKey } from "@red-cup-engineering/immutable-content-custody-service";
import { createContentHistoryStore } from "../src/content-history-store.mjs";
import { createFileHistoryStore } from "../src/file-history-store.mjs";

function memory() {
  const objects = new Map();
  let root = null, failPublish = false;
  const storage = {
    read: (id) => objects.get(id) ?? null,
    putAbsent: (id, text) => { if (!objects.has(id)) objects.set(id, text); },
    root: () => root,
    publish(expected, next) {
      if (failPublish) { failPublish = false; throw new Error("injected publication failure"); }
      if (root !== expected) throw new TypeError("SignCraft persisted frontier changed before publication");
      root = next;
    },
  };
  return {
    name: "memory",
    storage,
    open: () => createContentHistoryStore(storage),
    root: () => root,
    objects: () => objects.size,
    failNextPublish() { failPublish = true; },
    corrupt(id, text) { objects.set(id, text); },
    close() {},
  };
}

function file() {
  const directory = mkdtempSync(join(tmpdir(), "signcraft-media-"));
  const path = join(directory, "history.json"), contentRoot = `${path}.content`, transitions = `${path}.transitions`;
  const count = (at) => { try { return readdirSync(at, { recursive: true }).filter((name) => !String(name).endsWith(".media-type")).length; } catch { return 0; } };
  return {
    name: "file",
    open: () => createFileHistoryStore(path),
    root: () => createFileContentReference(path, { transitions }).read(),
    objects: () => count(join(contentRoot, "objects")),
    corrupt(id, text) { createFileStoreSync(contentRoot).putCurrent(`semantic/${immutableContentKey(id)}`, { body: Buffer.from(text), mediaType: "application/json" }); },
    close() { rmSync(directory, { recursive: true, force: true }); },
  };
}

export const MEDIA = Object.freeze({ memory, file });

/** Run `body(medium)` once over each medium, closing it after. */
export function overMedia(test, name, body) {
  for (const [kind, make] of Object.entries(MEDIA)) {
    test(`${name} (${kind})`, async () => {
      const medium = make();
      try { await body(medium); } finally { medium.close(); }
    });
  }
}
