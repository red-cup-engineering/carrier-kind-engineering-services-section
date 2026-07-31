// rdf-named-graph — assembles subject/predicate/object statements and a
// graph-name IRI into one frozen named-graph quad-set record. Adapted from
// the RWIL RDF projection service's `projectRwil`, which folds a batch's
// assertions plus its RWIL graph identity into the same shape before
// N-Quads serialization; this package extracts just that assembly step,
// independent of RWIL's settlement/document encoding.
import { iri, isTerm } from "../../rdf-term-construction-service/src/rdf-terms.mjs";

function fail(message) {
  throw new Error(message);
}

// Build a frozen `{ graph, quads, size }` record from an array of
// `{ subject, predicate, object }` statements and a graph-name IRI.
// `subject` and `predicate` must be IRI strings; `object` must be a
// well-formed term (see `rdf-term-construction-service`). Every quad in the
// returned set carries the same validated graph name.
export function buildNamedGraph(statements, graphName) {
  if (!Array.isArray(statements) || statements.length === 0) {
    fail("named graph requires at least one statement");
  }
  const graph = iri(graphName);
  const quads = statements.map((statement) => {
    const subject = iri(statement.subject);
    const predicate = iri(statement.predicate);
    if (!isTerm(statement.object)) fail("named graph statement object is not a well-formed RDF term");
    return Object.freeze({ subject, predicate, object: statement.object, graph });
  });
  return Object.freeze({ graph, quads: Object.freeze(quads), size: quads.length });
}
