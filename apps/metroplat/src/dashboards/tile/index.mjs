/**
 * src/dashboards/tile — the live `GET /tile` endpoint: a Tile SVG (Construction
 * 4.1 / Definition 4.2, §4 of the corpus's bilattice-coloured sofic-tiling
 * research note) of real claim-session material, read fresh on every
 * request.
 *
 * A thin mount, mirroring `services/web/micropub`: the caller supplies the
 * actual transcript-reading dependency (`source`, e.g.
 * `discoverClaudeSessionTranscripts` + `readClaudeSessionWorkClaims` over a
 * live root); this module owns only the HTTP binding, not persistence.
 */
import {
  tileOfClaimSessionBundles,
} from "./projection.mjs";
import {
  renderTileSvg,

} from "@red-cup-engineering/xml-document-rendering-service/svg/tile";

function svgRepr(status, body) {
  return {
    status,
    type: "image/svg+xml; charset=utf-8",
    headers: { "cache-control": "no-store" },
    body,
  };
}

function jsonError(status, error) {
  return {
    status,
    type: "application/json; charset=utf-8",
    headers: { "cache-control": "no-store" },
    body: `${JSON.stringify({ error }, null, 2)}\n`,
  };
}

/** Build the `GET /tile` Resource. */
export function tileResource(opts) {
  const path = opts.path ?? "/tile";
  return Object.freeze({
    match: path,
    route: path,
    id: "metroplat.tile.endpoint",
    name: "Tile Endpoint",
    methods: Object.freeze(["GET"]),
    produces: Object.freeze(["image/svg+xml"]),
    handler: async (_ctx) => {
      let bundles;
      try {
        bundles = await opts.source();
      } catch (error) {
        return jsonError(502, error instanceof Error ? error.message : String(error));
      }
      const projection = tileOfClaimSessionBundles(bundles);
      const svg = renderTileSvg(projection.tile, projection.glued, opts.svg);
      return svgRepr(200, svg);
    },
  });
}
