import { projectSeavtRdf } from "./witness-journal-rdf.mjs";

function json(value, init = {}) {
  return Response.json(value, init);
}

/** Receiver-facing Web actuator for the pure SEAVT RDF projection. */
export function createWitnessJournalRdfHandler({ manifest }) {
  if (typeof manifest !== "string") throw new TypeError("manifest must be a string");
  const headers = {
    "content-type": "application/json",
    "x-capability-manifest": manifest,
  };

  return async function handleWitnessJournalRdf(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/health") {
      return json({ ok: true, manifest }, { headers });
    }
    if (request.method === "POST" && pathname === "/invoke") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "malformed-json" }, { status: 400, headers });
      }
      if (
        body === null
        || typeof body !== "object"
        || Array.isArray(body)
        || Object.keys(body).sort().join(",") !== "graph,row"
      ) {
        return json({ error: "exactly-graph-and-row-are-required" }, { status: 400, headers });
      }
      try {
        const projection = await projectSeavtRdf(body.row, { graph: body.graph });
        return json({
          ...projection,
          bytes: Buffer.from(projection.bytes).toString("base64"),
        }, { headers });
      } catch (error) {
        if (error instanceof TypeError) {
          return json({ error: error.code ?? "invalid-seavt-projection", message: error.message }, { status: 422, headers });
        }
        throw error;
      }
    }
    return json({ error: "not-found", manifest }, { status: 404, headers });
  };
}
