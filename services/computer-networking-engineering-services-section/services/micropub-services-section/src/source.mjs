/**
 * source -- a post's Micropub source (the microformats2 JSON `{ type, properties }`) and what a
 * Micropub update, delete or undelete does to it (W3C Micropub 3.4, 3.5, 3.7.2).
 *
 * {@link applyMicropubUpdate} is the normative update semantics, a pure function of the current
 * source and the command: `replace` sets all values of a property (creating it, removing it when
 * given no values), `add` appends values without changing existing ones, `delete` removes a whole
 * property or individual values (removing the property when none remain). {@link micropubChangeRelations}
 * tells the difference between two sources as relations in a monotone store: what left is told
 * against, what arrived is told for, so a deletion is a recorded denial and an undelete the
 * re-affirmation that follows it.
 */
const canonical = (value) => JSON.stringify(value, (_key, v) => (v !== null && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));

const same = (a, b) => canonical(a) === canonical(b);
const without = (values, removals) => values.filter((value) => !removals.some((removed) => same(value, removed)));
const withValues = (values, additions) => [...values, ...additions.filter((value, index) => !values.some((v) => same(v, value)) && additions.findIndex((v) => same(v, value)) === index)];

function check(source) {
  if (source === null || typeof source !== "object" || typeof source.properties !== "object" || source.properties === null) throw new TypeError("a Micropub source is { type, properties }");
}

/** The source after a Micropub `update` command; the input is never mutated. */
export function applyMicropubUpdate(source, command) {
  check(source);
  if (command.action !== "update") throw new TypeError("only an update command changes a source");
  const properties = Object.fromEntries(Object.entries(source.properties).map(([key, values]) => [key, [...values]]));
  for (const [key, values] of Object.entries(command.replace ?? {})) {
    if (values.length === 0) delete properties[key];
    else properties[key] = [...values];
  }
  for (const [key, values] of Object.entries(command.add ?? {})) properties[key] = withValues(properties[key] ?? [], values);
  for (const [key, values] of Object.entries(command.delete ?? {})) {
    if (values === true) { delete properties[key]; continue; }
    if (properties[key] === undefined) continue;
    const remaining = without(properties[key], values);
    if (remaining.length === 0) delete properties[key];
    else properties[key] = remaining;
  }
  return Object.freeze({ type: [...source.type], properties: Object.freeze(properties) });
}

/** A source as `[predicate, value]` cells: one per type and one per property value. */
export function sourceCells(source) {
  check(source);
  return Object.freeze([...source.type.map((value) => ["type", value]), ...Object.entries(source.properties).flatMap(([key, values]) => values.map((value) => [key, value]))]);
}

/** The source of a set of `[predicate, value]` cells (the inverse of {@link sourceCells}); no type means `h-entry`. */
export function sourceFromCells(cells) {
  const type = [];
  const properties = {};
  for (const [predicate, value] of cells) {
    if (predicate === "type") type.push(value);
    else (properties[predicate] ??= []).push(value);
  }
  return Object.freeze({ type: type.length > 0 ? type : ["h-entry"], properties: Object.freeze(properties) });
}

/** The cells in `from` that `to` lacks. */
function missing(from, to) {
  return from.filter(([predicate, value]) => !to.some(([p, v]) => p === predicate && same(v, value)));
}

/**
 * The relations that carry `before` to `after`: cells that left are told `against`, cells that
 * arrived `for`. Pass `null` for a source that does not exist (a create is `null` -> source; a delete
 * is source -> `null`; an undelete is `null` -> the restored source).
 */
export function micropubChangeRelations(subject, before, after, datum = {}) {
  const beforeCells = before === null || before === undefined ? [] : sourceCells(before);
  const afterCells = after === null || after === undefined ? [] : sourceCells(after);
  const relation = ([predicate, object], polarity) => Object.freeze({ subject, predicate, object, datum: Object.freeze({ ...datum }), polarity });
  return Object.freeze([
    ...missing(beforeCells, afterCells).map((cell) => relation(cell, "against")),
    ...missing(afterCells, beforeCells).map((cell) => relation(cell, "for")),
  ]);
}

/** `?q=source` response shaping: the whole source, or only the requested properties (3.7.2, with no `type`). */
export function micropubSourceResponse(source, requested = []) {
  check(source);
  if (requested.length === 0) return { type: source.type, properties: source.properties };
  return { properties: Object.fromEntries(requested.flatMap((key) => (source.properties[key] === undefined ? [] : [[key, source.properties[key]]]))) };
}
