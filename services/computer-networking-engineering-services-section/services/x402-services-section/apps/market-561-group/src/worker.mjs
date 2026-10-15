import { boundInstanceAccessGrants } from "../../../src/market/instance-access-grants.mjs";
import { createMarketWorker } from "../../../src/market/market.mjs";

import { loadEdgeBinding } from "./edge-bindings.mjs";
import { createMarket561Group } from "./market.mjs";

/**
 * The edge face of market.561.group: the same catalog and engine on the
 * Cloudflare Workers transport, with the deployment's bindings supplied per
 * request. Offers whose compute needs a Node host (the DE440 precision
 * computes, which shell out to the pinned ephemeris binary) are declared
 * `runtime: "node"` in the catalog and are not served from this face; the
 * Node runner (scripts/serve-market.mjs) serves the whole catalog.
 */
export default createMarketWorker((env) => createMarket561Group({ ...env, MARKET_RUNTIME: "edge" }, { load: loadEdgeBinding, accessGrants: boundInstanceAccessGrants(env) }));
