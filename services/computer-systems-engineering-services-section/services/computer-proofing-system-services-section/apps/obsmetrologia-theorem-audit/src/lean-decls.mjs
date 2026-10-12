/**
 * Pure parsing, ordering, and rendering algebra for the whole-library
 * Obsmetrologia declaration inventory (`docs/blueprint/lean_decls`). No I/O:
 * callers run `scripts/list-lean-decls.lean` via `lake env lean` and pass
 * the captured stdout in here, then write the rendered text themselves.
 */

/**
 * Parse the Lean program's stdout: one declaration name per line, blank
 * lines skipped.
 *
 * @param {string} text - Combined stdout of `list-lean-decls.lean`.
 * @returns {string[]} Declaration names, in the order printed.
 */
export function parseDeclNames(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Sort declaration names lexicographically (ordinal, not locale-aware), so
 * the written file's order does not depend on the order Lean's `#eval`
 * happened to emit them in.
 *
 * @param {string[]} names
 * @returns {string[]} A new, sorted array; `names` is not mutated.
 */
export function sortDeclNames(names) {
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Render a list of declaration names as the `lean_decls` file text: one
 * name per line, terminated by a trailing newline (empty input renders to
 * the empty string, not a lone newline).
 *
 * @param {string[]} names
 * @returns {string}
 */
export function renderDeclList(names) {
  return names.length === 0 ? "" : `${names.join("\n")}\n`;
}

/**
 * The set difference between an old and a new declaration-name list:
 * names only the old list has (disappeared) and names only the new list
 * has (appeared). Order-independent; duplicates in either input collapse.
 *
 * @param {string[]} oldNames
 * @param {string[]} newNames
 * @returns {{disappeared: string[], appeared: string[]}} Both sorted.
 */
export function diffDeclNames(oldNames, newNames) {
  const oldSet = new Set(oldNames);
  const newSet = new Set(newNames);
  const disappeared = [...oldSet].filter((name) => !newSet.has(name));
  const appeared = [...newSet].filter((name) => !oldSet.has(name));
  return { disappeared: sortDeclNames(disappeared), appeared: sortDeclNames(appeared) };
}
