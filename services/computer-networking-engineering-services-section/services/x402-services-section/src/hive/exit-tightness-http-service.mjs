import { createServer } from "node:http";
import { makeReport } from "@red-cup-engineering/hive-fleet-operations-service/hive-engine-exit-tightness";
import { createHiveExitTightnessSaleLedger } from "./exit-tightness-sale-ledger.mjs";

export const HIVE_EXIT_TIGHTNESS_RESOURCE = Object.freeze({
  id: "hive-engine-exit-tightness",
  price: "0.250",
  description: "Verified gross executable Hive Engine exit depth for one account, symbol, and quantity.",
});
const HIVE_NODES = Object.freeze(["https://api.hive.blog", "https://api.openhive.network"]);

function json(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  response.end(`${JSON.stringify(body)}\n`);
}

async function bodyOf(request) {
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 64 * 1024) throw new Error("request body exceeds 64 KiB");
  }
  if (text.length === 0) return {};
  try { return JSON.parse(text); }
  catch { throw new Error("request body must be JSON"); }
}

/**
 * Creates the product-specific HTTP carrier. It deliberately is not added to
 * the generic EVM x402 market: this product settles native HBD and its price,
 * purchase intent, confirmation evidence, and delivered report remain one
 * recoverable sale rather than a catalog entry with no delivery path.
 */
export function createHiveExitTightnessHttpService(config) {
  const ledger = createHiveExitTightnessSaleLedger({
    journalRoot: config?.journalRoot,
    sellerAccount: config?.sellerAccount,
    resource: config?.resource ?? HIVE_EXIT_TIGHTNESS_RESOURCE,
    memoPrefix: config?.memoPrefix ?? "exit-tightness",
    expirySeconds: config?.expirySeconds ?? 900,
    hiveNodes: config?.hiveNodes ?? HIVE_NODES,
    makeReport: config?.makeReport ?? makeReport,
  });
  return async function hiveExitTightnessHttpService(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/v1/hive/exit-tightness") {
        return json(response, 200, {
          type: "HiveExitTightnessOffer",
          version: 1,
          resource: config?.resource ?? HIVE_EXIT_TIGHTNESS_RESOURCE,
          settlement: { scheme: "hbd-transfer", network: "hive:mainnet", payTo: config?.sellerAccount },
          purchase: { quote: "POST /v1/hive/exit-tightness/quotes", settle: "POST /v1/hive/exit-tightness/sales/{saleId}" },
        });
      }
      if (request.method === "POST" && url.pathname === "/v1/hive/exit-tightness/quotes") {
        const quote = ledger.quote(await bodyOf(request));
        return json(response, 402, {
          ...quote.paymentRequirement,
          saleId: quote.saleId,
          reportRequest: quote.reportRequest,
        }, { location: `/v1/hive/exit-tightness/sales/${quote.saleId}` });
      }
      const sale = /^\/v1\/hive\/exit-tightness\/sales\/([^/]+)$/u.exec(url.pathname);
      if (sale && request.method === "GET") {
        const state = ledger.read(decodeURIComponent(sale[1]));
        return json(response, state ? 200 : 404, state ?? { error: "sale-not-found" });
      }
      if (sale && request.method === "POST") {
        const result = await ledger.settleAndDeliver(decodeURIComponent(sale[1]), await bodyOf(request));
        return json(response, result.status, result.body);
      }
      return json(response, 404, { error: "not-found" });
    } catch (error) {
      return json(response, 400, { error: "invalid-request", detail: error instanceof Error ? error.message : String(error) });
    }
  };
}

export function createHiveExitTightnessHttpServer(config) {
  return createServer(createHiveExitTightnessHttpService(config));
}
