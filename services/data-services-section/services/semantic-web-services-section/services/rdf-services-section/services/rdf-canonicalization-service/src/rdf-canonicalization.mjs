// rdf-canonicalization — RDFC-1.0 (RDF Dataset Canonicalization, W3C
// Recommendation, https://www.w3.org/TR/rdf-canon/) over N-Quads text, via
// the `rdf-canonize` package. Adapted from the WitnessJournal RDF projection
// service's `projectWitnessJournalBatch`, which calls
// `rdfCanonize.canonize(source, { algorithm: "RDFC-1.0", inputFormat:
// "application/n-quads", format: "application/n-quads" })` on assembled
// N-Quads text; this package extracts just that canonicalization call.
// This is the one package in the extraction permitted a dependency: the
// same `rdf-canonize` dependency the source carries, because RDFC-1.0 is
// not something to hand-roll.
import rdfCanonize from "rdf-canonize";

// Canonicalize N-Quads text under RDFC-1.0, returning canonical N-Quads
// text. `options` may override the `rdf-canonize` call's algorithm/format.
export async function canonicalizeNQuads(nquadsText, options = {}) {
  return rdfCanonize.canonize(nquadsText, {
    algorithm: "RDFC-1.0",
    inputFormat: "application/n-quads",
    format: "application/n-quads",
    ...options,
  });
}
