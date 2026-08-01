// n-quads — serializes named-graph quad sets to W3C RDF 1.1 N-Quads text
// (W3C Recommendation, 25 February 2014, https://www.w3.org/TR/n-quads/).
// Adapted byte-for-byte from the WitnessJournal RDF projection service's
// `nquadObject` helper and its inline per-statement line template
// (`<s> <p> object <g> .`, one line per statement, joined with a trailing
// newline); this package extracts just the N-Quads text production, taking
// a plain quad set rather than a settlement-typed WitnessJournal batch.
import { iri } from "../../rdf-term-construction-service/src/rdf-terms.mjs";

function fail(message) {
  throw new Error(message);
}

// Quote a literal's lexical form the same way the WitnessJournal source does: as a
// JSON string. JSON's `"`/`\`/control-character escaping is a subset of
// N-Quads STRING_LITERAL_QUOTE's ECHAR/UCHAR escaping, so the result is
// always a valid N-Quads quoted literal.
function quoteLiteral(value) {
  return JSON.stringify(String(value));
}

function nquadObject(object) {
  if (object.kind === "iri") return `<${iri(object.value)}>`;
  if (object.kind !== "literal") fail("N-Quads object must be an iri or literal term");
  const suffix =
    object.datatype !== undefined
      ? `^^<${iri(object.datatype)}>`
      : object.language !== undefined
        ? `@${object.language.toLowerCase()}`
        : "";
  return `${quoteLiteral(object.value)}${suffix}`;
}

// Serialize one quad (`{ subject, predicate, object, graph }`) as a single
// N-Quads line, graph name last, no trailing newline.
export function nquadLine(quad) {
  return `<${iri(quad.subject)}> <${iri(quad.predicate)}> ${nquadObject(quad.object)} <${iri(quad.graph)}> .`;
}

// Serialize a named-graph record (as built by
// `rdf-named-graph-construction-service`, or a plain array of quads) to
// N-Quads text: one line per quad, in order, each terminated by `\n`.
export function serializeNQuads(namedGraph) {
  const quads = Array.isArray(namedGraph) ? namedGraph : namedGraph.quads;
  if (!Array.isArray(quads) || quads.length === 0) {
    fail("N-Quads serialization requires at least one quad");
  }
  return quads.map(nquadLine).join("\n") + "\n";
}
