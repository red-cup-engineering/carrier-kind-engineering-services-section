import { startWebServer } from "@red-cup-engineering/computer-web-server/node";

/**
 * Listen with one market on the Node transport, through the same engine the
 * Workers transport serves. `port` 0 binds an ephemeral port.
 * @param {{engine: object}} market A market from `createMarket`.
 * @param {number|object} [options] A port, or the engine's own start options.
 * @returns {Promise<{port: number, close: () => Promise<void>}>}
 */
export function startMarket(market, options = 0) {
  if (market?.engine === undefined) throw new TypeError("a market from createMarket is required");
  return startWebServer(market.engine, options);
}
