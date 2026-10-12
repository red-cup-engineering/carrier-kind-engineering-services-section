/**
 * A string-keyed map whose fork is O(1) and whose update costs O(log n), so a reading derived from
 * an earlier one by a few changes shares the rest of its structure with it instead of copying it.
 *
 * It is a hash array mapped trie with transient ownership: nodes belong to the map that built
 * them and are changed in place only by that map, so building a map from nothing costs what a
 * built-in Map costs, while `fork()` hands the parent and the child each a fresh owner, after
 * which neither changes a node the other can see (every write copies the path it touches).
 *
 * Iteration is in insertion order, exactly as a Map's: a key set again keeps its place, a key
 * deleted and set again goes last. Each key's place is a sequence number; the ordered entries are
 * derived on demand and held until the next write.
 */
const BITS = 5, MASK = 31;

function hashOf(key) {
  let hash = 0x811c9dc5;
  for (let at = 0; at < key.length; at += 1) hash = Math.imul(hash ^ key.charCodeAt(at), 0x01000193);
  return hash >>> 0;
}
const population = (bits) => {
  bits -= (bits >>> 1) & 0x55555555;
  bits = (bits & 0x33333333) + ((bits >>> 2) & 0x33333333);
  return (Math.imul((bits + (bits >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24);
};

class Leaf { constructor(hash, key, value, seq) { this.hash = hash; this.key = key; this.value = value; this.seq = seq; } }
class Branch { constructor(owner, bitmap, slots) { this.owner = owner; this.bitmap = bitmap; this.slots = slots; } }
class Collision { constructor(owner, hash, leaves) { this.owner = owner; this.hash = hash; this.leaves = leaves; } }

const own = (node, owner) => (node.owner === owner ? node : new Branch(owner, node.bitmap, node.slots.slice()));

/** Place `leaf` (a new key, or an existing key's replacement) under a branch. */
function place(node, owner, shift, leaf) {
  const bit = 1 << ((leaf.hash >>> shift) & MASK), at = population(node.bitmap & (bit - 1));
  const target = own(node, owner);
  if ((node.bitmap & bit) === 0) {
    target.slots.splice(at, 0, leaf);
    target.bitmap |= bit;
    return target;
  }
  const child = node.slots[at];
  if (child instanceof Branch) target.slots[at] = place(child, owner, shift + BITS, leaf);
  else if (child instanceof Leaf) {
    if (child.key === leaf.key) target.slots[at] = leaf;
    else if (child.hash === leaf.hash) target.slots[at] = new Collision(owner, leaf.hash, [child, leaf]);
    else target.slots[at] = place(place(new Branch(owner, 0, []), owner, shift + BITS, child), owner, shift + BITS, leaf);
  } else if (child.hash === leaf.hash) {
    const leaves = child.owner === owner ? child.leaves : child.leaves.slice();
    const found = leaves.findIndex((held) => held.key === leaf.key);
    if (found >= 0) leaves[found] = leaf; else leaves.push(leaf);
    target.slots[at] = child.owner === owner ? child : new Collision(owner, child.hash, leaves);
  } else target.slots[at] = place(place(new Branch(owner, 0, []), owner, shift + BITS, child), owner, shift + BITS, leaf);
  return target;
}

/** The node without `key`, or undefined when nothing is left of it. */
function without(node, owner, shift, hash, key) {
  const bit = 1 << ((hash >>> shift) & MASK);
  if ((node.bitmap & bit) === 0) return node;
  const at = population(node.bitmap & (bit - 1)), child = node.slots[at];
  let replacement;
  if (child instanceof Branch) replacement = without(child, owner, shift + BITS, hash, key);
  else if (child instanceof Leaf) replacement = child.key === key ? undefined : child;
  else {
    const leaves = child.leaves.filter((held) => held.key !== key);
    replacement = leaves.length === child.leaves.length ? child : leaves.length === 1 ? leaves[0] : new Collision(owner, child.hash, leaves);
  }
  if (replacement === child) return node;
  const target = own(node, owner);
  if (replacement === undefined) {
    target.slots.splice(at, 1);
    target.bitmap &= ~bit;
    return target.bitmap === 0 ? undefined : target;
  }
  target.slots[at] = replacement;
  return target;
}

function collect(node, into) {
  for (const slot of node.slots) {
    if (slot instanceof Branch) collect(slot, into);
    else if (slot instanceof Leaf) into.push(slot);
    else for (const leaf of slot.leaves) into.push(leaf);
  }
  return into;
}

export class PersistentMap {
  #root = null;
  #owner = {};
  #size = 0;
  #next = 0;
  #ordered = null;

  constructor(entries) {
    if (entries !== undefined) for (const [key, value] of entries) this.set(key, value);
  }

  get size() { return this.#size; }

  #leaf(key) {
    if (typeof key !== "string") throw new TypeError("PersistentMap keys are strings");
    const hash = hashOf(key);
    let node = this.#root, shift = 0;
    while (node !== null) {
      if (node instanceof Branch) {
        const bit = 1 << ((hash >>> shift) & MASK);
        if ((node.bitmap & bit) === 0) return undefined;
        node = node.slots[population(node.bitmap & (bit - 1))];
        shift += BITS;
      } else if (node instanceof Leaf) return node.key === key ? node : undefined;
      else return node.hash === hash ? node.leaves.find((held) => held.key === key) : undefined;
    }
    return undefined;
  }

  has(key) { return this.#leaf(key) !== undefined; }
  get(key) { return this.#leaf(key)?.value; }

  /** Change this map in place (sharing nothing with its forks); returns it, as Map does. */
  set(key, value) {
    const found = this.#leaf(key);
    if (found !== undefined && found.value === value) return this;
    const leaf = new Leaf(found?.hash ?? hashOf(key), key, value, found?.seq ?? this.#next++);
    this.#root = this.#root === null ? new Branch(this.#owner, 0, []) : this.#root;
    this.#root = place(this.#root, this.#owner, 0, leaf);
    if (found === undefined) this.#size += 1;
    this.#ordered = null;
    return this;
  }

  delete(key) {
    const found = this.#leaf(key);
    if (found === undefined) return false;
    this.#root = without(this.#root, this.#owner, 0, found.hash, key) ?? null;
    this.#size -= 1;
    this.#ordered = null;
    return true;
  }

  /** A map reading as this one does now, sharing its structure; either may then be changed freely. */
  fork() {
    const copy = new PersistentMap();
    copy.#root = this.#root;
    copy.#size = this.#size;
    copy.#next = this.#next;
    this.#owner = {};
    return copy;
  }

  #leaves() {
    return this.#ordered ??= (this.#root === null ? [] : collect(this.#root, []).sort((left, right) => left.seq - right.seq));
  }

  *entries() { for (const leaf of this.#leaves()) yield [leaf.key, leaf.value]; }
  *keys() { for (const leaf of this.#leaves()) yield leaf.key; }
  *values() { for (const leaf of this.#leaves()) yield leaf.value; }
  [Symbol.iterator]() { return this.entries(); }
}
