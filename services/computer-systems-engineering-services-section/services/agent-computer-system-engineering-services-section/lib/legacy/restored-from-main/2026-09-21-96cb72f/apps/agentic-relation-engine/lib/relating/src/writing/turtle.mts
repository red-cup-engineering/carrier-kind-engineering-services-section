/**
 * writing/turtle — the Turtle/IRI term writers.
 *
 * `iriRef` writes an IRI reference `<...>` (percent-encoding the delimiters a
 * Turtle IRIREF forbids); `turtleLiteral` writes a quoted literal with Turtle
 * escaping (finite numbers and booleans pass through bare). Pure string
 * functions — the RDF primitives any linked-data vocabulary downstream reuses.
 */
import { type JsonValue } from "../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { turtleLiteral } from "@red-cup-engineering/turtle-term-writing-service";
export { turtleLiteral };

/** Write an IRI as a Turtle IRIREF `<...>`. */
export function iriRef(iri: string): string {
  return `<${String(iri).replace(/[- <>"{}|^`\\]/g, encodeURIComponent)}>`;
}


