import { startWebServer } from "@red-cup-engineering/web-server-services-section/node";

/**
 * Listen with one seller on the Node transport, through the same engine the
 * Workers transport serves. `port` 0 binds an ephemeral port.
 * @param {{engine: object}} seller A seller from `createOfferSeller`.
 * @param {number|object} [options] A port, or the engine's own start options.
 * @returns {Promise<{port: number, close: () => Promise<void>}>}
 */
export function startOfferSeller(seller, options = 0) {
  if (seller?.engine === undefined) throw new TypeError("a seller from createOfferSeller is required");
  return startWebServer(seller.engine, options);
}
