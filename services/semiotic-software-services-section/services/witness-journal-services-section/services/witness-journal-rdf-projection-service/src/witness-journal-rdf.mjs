import rdfCanonize from "rdf-canonize";

import { canonical } from "@red-cup-engineering/json-file-codec-service";
import { EMPTY_WITNESS_ROOT, identifyBytesSemanticContent, isCanonicalSha256NiUri } from "@red-cup-engineering/semantic-content-identify-service";
import { asSeavt, readAddressedSeavt } from "@red-cup-engineering/witness-journal-entry-service";

const RDF_JSON = "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON";
const WITNESS_TIME = "urn:emsenn:witness-journal:time";

function refuse(code, message) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

function iri(value) {
  if (!isCanonicalSha256NiUri(value)) {
    refuse("invalid-witness-graph", "SEAVT RDF projection graph must be a canonical SHA-256 ni URI");
  }
  return `<${value}>`;
}

function jsonLiteral(value) {
  return `${JSON.stringify(canonical(value))}^^<${RDF_JSON}>`;
}

/**
 * Project one SEAVT source row under an already-addressed graph/apex.
 *
 * The predication uses the opaque NI commitments of E/A/V as RDF IRIs; the
 * visible SRN surfaces and typed RMN claims remain in `source`. T is emitted
 * as canonical RDF JSON. RDFC-1.0 bytes are then committed as the next apex.
 * Neither the input graph token nor any coordinate token is decoded.
 */
export async function projectSeavtRdf(row, { graph } = {}) {
  const sourceRow = asSeavt(row);
  const source = readAddressedSeavt(sourceRow);
  const graphIri = iri(graph);
  const statements = [
    `${iri(source.e.token)} ${iri(source.a.token)} ${iri(source.v.token)} ${graphIri} .`,
    `${graphIri} <${WITNESS_TIME}> ${jsonLiteral(source.t)} ${graphIri} .`,
  ];
  const nquads = `${statements.join("\n")}\n`;
  const canonicalNQuads = await rdfCanonize.canonize(nquads, {
    algorithm: "RDFC-1.0",
    inputFormat: "application/n-quads",
    format: "application/n-quads",
  });
  const bytes = Buffer.from(canonicalNQuads, "utf8");
  const token = identifyBytesSemanticContent({ objectKind: "witness-journal.rdf-projection", bytes, mediaType: "application/n-quads", witnessRoot: EMPTY_WITNESS_ROOT }).token;
  return Object.freeze({
    graph,
    token,
    mediaType: "application/n-quads",
    bytes,
    canonicalNQuads,
    statementCount: 2,
    source,
  });
}

/**
 * Verify the whole receiver-facing relation: source SRNs, visible typed
 * claims, prior graph apex, canonical bytes, and output token must reproduce
 * one another exactly. No token is decoded.
 */
export async function verifySeavtRdfProjection(projection) {
  try {
    if (
      projection === null
      || typeof projection !== "object"
      || projection.mediaType !== "application/n-quads"
      || !(projection.bytes instanceof Uint8Array)
      || typeof projection.canonicalNQuads !== "string"
      || !Buffer.from(projection.bytes).equals(Buffer.from(projection.canonicalNQuads, "utf8"))
      || identifyBytesSemanticContent({ objectKind: "witness-journal.rdf-projection", bytes: projection.bytes, mediaType: "application/n-quads", witnessRoot: EMPTY_WITNESS_ROOT }).token !== projection.token
    ) return false;
    const row = {
      e: projection.source.e.surface,
      a: projection.source.a.surface,
      v: projection.source.v.surface,
      t: projection.source.t,
    };
    const expected = await projectSeavtRdf(row, { graph: projection.graph });
    return expected.token === projection.token
      && expected.canonicalNQuads === projection.canonicalNQuads
      && expected.source.e.token === projection.source.e.token
      && expected.source.a.token === projection.source.a.token
      && expected.source.v.token === projection.source.v.token;
  } catch {
    return false;
  }
}
