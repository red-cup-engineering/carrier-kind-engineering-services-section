/**
 * Stable unique string ordering used by boundary and document readouts.
 *
 * This is the host-neutral read of a finite string fiber as a stable,
 * duplicate-free, lexicographically ordered set.
 */
export function uniqueSortedStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}
