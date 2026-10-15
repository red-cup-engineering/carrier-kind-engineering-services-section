/**
 * writing/sparql/endpoint — a SPARQL 1.1 Protocol client and the MCP tool a session calls.
 *
 * The tool only POSTs `application/sparql-query` (the query operation); it never reaches the
 * update operation, and the endpoint the Group serves is read-only.
 */

export async function sparqlProtocolQuery(endpoint, query, { fetch: fetchImpl = globalThis.fetch, accept = "application/sparql-results+json" } = {}) {
  const response = await fetchImpl(endpoint, { method: "POST", headers: { "content-type": "application/sparql-query", accept }, body: query });
  if (!response.ok) throw new Error(`SPARQL endpoint ${endpoint} answered ${response.status}: ${await response.text()}`);
  return accept.includes("json") ? response.json() : response.text();
}

/** Rows of a SELECT result as plain objects of variable to value. */
export function sparqlRows(result) {
  return result.results.bindings.map((binding) => Object.fromEntries(Object.entries(binding).map(([name, term]) => [name, term.value])));
}

/** The MCP tool, in the shape `createMcpServer` takes: `{name, description, inputSchema, handler}`. */
export function sparqlQueryTool({ endpoint, fetch }) {
  return Object.freeze({
    name: "sparql_query",
    description: "Run one SPARQL 1.1 query against the Group's ontology (the SKOS glossary: skos:prefLabel, skos:altLabel, skos:definition, skos:inScheme, schema:termCode). SELECT returns rows; ASK returns a boolean.",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string", minLength: 1 } }, additionalProperties: false },
    handler: async ({ query }) => {
      const result = await sparqlProtocolQuery(endpoint, query, { fetch });
      return "boolean" in result ? { boolean: result.boolean } : { variables: result.head.vars, rows: sparqlRows(result) };
    },
  });
}
