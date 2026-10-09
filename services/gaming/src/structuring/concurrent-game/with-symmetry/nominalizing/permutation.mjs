/** Finite permutations of names: the executable fragment of FSym(A). */

const samePair = (left, right) =>
  left[0] === right[0] && left[1] === right[1];

function normalize(mappings) {
  const out = [];
  const seenFrom = new Set();
  const seenTo = new Set();
  for (const pair of mappings) {
    if (pair[0] === pair[1]) continue;
    if (seenFrom.has(pair[0])) throw new TypeError(`finitePermutation: duplicate source name ${pair[0]}`);
    if (seenTo.has(pair[1])) throw new TypeError(`finitePermutation: duplicate target name ${pair[1]}`);
    seenFrom.add(pair[0]);
    seenTo.add(pair[1]);
    out.push(Object.freeze([pair[0], pair[1]]));
  }
  for (const name of seenFrom) {
    if (!seenTo.has(name)) {
      throw new TypeError("finitePermutation: mappings must present a bijection on their finite support");
    }
  }
  for (const name of seenTo) {
    if (!seenFrom.has(name)) {
      throw new TypeError("finitePermutation: mappings must present a bijection on their finite support");
    }
  }
  return Object.freeze(out);
}

/** Build a finite permutation, fixing every name not mentioned by `mappings`. */
export function finitePermutation(mappings = []) {
  return Object.freeze({
    kind: "game.nominal.fsym.permutation",
    mappings: normalize(mappings),
  });
}

/** The transposition generator `(a b)` of FSym(A). */
export const transposition = (left, right) =>
  left === right ? finitePermutation() : finitePermutation([[left, right], [right, left]]);

/** The finite support moved by a permutation. */
export const permutationSupport = (permutation) =>
  Object.freeze([...new Set(permutation.mappings.flatMap((pair) => [pair[0], pair[1]]))].sort());

/** Apply a finite permutation to a name; names outside support are fixed. */
export function applyPermutation(permutation, name) {
  return permutation.mappings.find((pair) => pair[0] === name)?.[1] ?? name;
}

/** Whether the permutation fixes every supplied name pointwise. */
export function fixesNames(permutation, names) {
  return names.every((name) => applyPermutation(permutation, name) === name);
}

/** Inverse in FSym(A). */
export const inversePermutation = (permutation) =>
  finitePermutation(permutation.mappings.map((pair) => Object.freeze([pair[1], pair[0]])));

/** Composition `(left . right)(a) = left(right(a))`. */
export function composePermutations(left, right) {
  const names = new Set([...permutationSupport(left), ...permutationSupport(right)]);
  const mappings = [];
  for (const name of names) {
    const image = applyPermutation(left, applyPermutation(right, name));
    if (image !== name) mappings.push(Object.freeze([name, image]));
  }
  return finitePermutation(mappings);
}

export const samePermutation = (left, right) =>
  left.mappings.length === right.mappings.length
  && left.mappings.every((pair) => right.mappings.some((other) => samePair(pair, other)));
