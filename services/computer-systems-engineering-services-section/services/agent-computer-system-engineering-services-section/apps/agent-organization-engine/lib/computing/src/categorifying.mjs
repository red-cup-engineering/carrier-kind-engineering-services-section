/**
 * categorifying - tiny categorical carriers for computing surfaces.
 */

export function copycat(arena) {
  return Object.freeze({
    kind: "computing.morphism",
    name: "copycat",
    domain: arena,
    codomain: arena,
    graph: Object.freeze(arena.positions.map((position) => Object.freeze({ from: position, to: position }))),
  });
}
