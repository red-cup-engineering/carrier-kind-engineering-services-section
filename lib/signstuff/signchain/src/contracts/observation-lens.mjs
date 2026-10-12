

export function observationalLens(spec) {
  return Object.freeze({
    ...spec,
    preserves: Object.freeze([...spec.preserves]),
    hides: Object.freeze([...spec.hides]),
  });
}
