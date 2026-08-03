/**
 * writing/turtle — the Turtle/IRI term writers.
 *
 * `iriRef` writes an IRI reference `<...>` (percent-encoding the delimiters a
 * Turtle IRIREF forbids); `turtleLiteral` writes a quoted literal with Turtle
 * escaping (finite numbers and booleans pass through bare). Pure string
 * functions — the RDF primitives any linked-data vocabulary downstream reuses.
 */
export type TurtleLiteralValue = null | boolean | number | string | readonly TurtleLiteralValue[] | {
  readonly [key: string]: TurtleLiteralValue;
};

/** Write an IRI as a Turtle IRIREF `<...>`. */
export function iriRef(iri: string): string {
  return `<${String(iri).replace(/[- <>"{}|^`\\]/g, encodeURIComponent)}>`;
}

/** Write a value as a Turtle literal. */
export function turtleLiteral(value: TurtleLiteralValue): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  const escaped = String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}
