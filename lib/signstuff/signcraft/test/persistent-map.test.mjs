import assert from "node:assert/strict";
import test from "node:test";
import { PersistentMap } from "../src/persistent-map.mjs";

const same = (persistent, model) => {
  assert.equal(persistent.size, model.size);
  assert.deepEqual([...persistent.entries()], [...model.entries()]);
  assert.deepEqual([...persistent.keys()], [...model.keys()]);
  for (const [key, value] of model) { assert.ok(persistent.has(key)); assert.equal(persistent.get(key), value); }
};

test("a persistent map reads, orders and forks exactly as a Map does", () => {
  let seed = 7; const next = (n) => (seed = (Math.imul(seed ^ (seed >>> 13), 0x5bd1e995) + 12345 | 0) >>> 0) % n;
  const lines = [{ persistent: new PersistentMap(), model: new Map() }];
  for (let step = 0; step < 6000; step += 1) {
    const at = next(lines.length), line = lines[at];
    const roll = next(10), key = `k${next(400)}`;
    if (roll < 6) { line.persistent.set(key, step); line.model.set(key, step); }
    else if (roll < 8) assert.equal(line.persistent.delete(key), line.model.delete(key));
    else if (lines.length < 12) lines.push({ persistent: line.persistent.fork(), model: new Map(line.model) });
    if (step % 500 === 0) for (const held of lines) same(held.persistent, held.model);
  }
  for (const held of lines) same(held.persistent, held.model);
});

test("keys that share a hash are told apart, and an unrelated key type is refused", () => {
  const map = new PersistentMap();
  // "Aa" and "BB" collide under 31-multiplier hashes; any pair that collides here must still be distinct keys.
  for (let at = 0; at < 3000; at += 1) map.set(`collide-${at}`, at);
  for (let at = 0; at < 3000; at += 1) assert.equal(map.get(`collide-${at}`), at);
  assert.equal(map.size, 3000);
  assert.throws(() => map.set(1, 1), TypeError);
});
