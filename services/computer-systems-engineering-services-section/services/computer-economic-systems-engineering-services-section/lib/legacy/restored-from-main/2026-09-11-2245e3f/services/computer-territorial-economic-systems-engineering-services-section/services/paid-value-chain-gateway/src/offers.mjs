import { declareOffer } from "@red-cup-engineering/x402-services-section/offer";

/**
 * This gateway's offers, declared once: every market's form of them is
 * derived from these declarations. The declarations carry no
 * settlement-affecting constant -- the payout address, the network, and the
 * settlement asset reach the derivations from the deployment. Pricing here
 * is provisional pending the hopeium business plan's re-pricing, which is
 * why 402index-listing.json withholds these from the public index.
 */

const SECTION = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-economic-systems-engineering-services-section/services/computer-territorial-economic-systems-engineering-services-section";
const ORIGIN = "https://paid-value-chain-gateway.morgan-sennhauser.workers.dev";
const GATEWAY = "paid-value-chain-gateway";
const PACKAGE = "@red-cup-engineering/paid-value-chain-gateway";
const LEDGER_ACCOUNT = "Income:Sales:X402:Paid-value-chain-gateway";
const MARKETS = ["x402-bazaar", "house-capability-market", "house-seller-catalog"];

export const VALUE_CHAIN_SHARES_ROUTE = "/value-chain/shares";
export const TERRITORY_READOUT_ROUTE = "/territory/readout";

export const valueChainSharesOffer = declareOffer({
  name: "Value-Chain Shares",
  gateway: GATEWAY,
  gatewayPackageName: PACKAGE,
  section: SECTION,
  operation: "derive-value-chain-shares",
  origin: ORIGIN,
  route: VALUE_CHAIN_SHARES_ROUTE,
  method: "POST",
  price: "$0.04",
  category: "territorial-economy",
  bodyExample: {
    type: "PriceLadder",
    version: 1,
    positions: [
      { name: "producer", prices: [{ unitPrice: "1", unit: "USD per kilogram", source: { sourceUrl: "https://example.test/a", sourceTitle: "Example row" } }] },
      { name: "retail", prices: [{ unitPrice: "2", unit: "USD per kilogram", source: { sourceUrl: "https://example.test/b", sourceTitle: "Example row" } }] },
    ],
  },
  bodySchema: {
    properties: {
      type: { type: "string", const: "PriceLadder" },
      version: { type: "integer", minimum: 1 },
      positions: {
        type: "array",
        minItems: 2,
        description: "Named ladder positions from producer to retail, each carrying its priced input rows with their sources.",
        items: {
          type: "object",
          required: ["name", "prices"],
          properties: {
            name: { type: "string" },
            prices: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["unitPrice", "unit"],
                properties: {
                  unitPrice: { type: "string" },
                  unit: { type: "string" },
                  source: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
    required: ["type", "positions"],
  },
  output: {
    schema: {
      type: "object",
      required: ["type", "positions"],
      properties: {
        type: { type: "string" },
        positions: { type: "array" },
      },
    },
    example: {
      type: "ValueChainShares",
      positions: [
        { name: "producer", share: "1/2", multiplierFromPrevious: null, evidence: "cited" },
        { name: "retail", share: "1/1", multiplierFromPrevious: "2/1", evidence: "cited" },
      ],
    },
  },
  framings: [
    {
      key: "default",
      title: "Value-Chain Shares",
      description:
        "Each position's exact share of a farm-to-retail price ladder's retail price (producer's share first), the exact multiplier between adjacent positions, and the evidence label of every priced input row. Every ratio is an exact reduced BigInt fraction, never a floating-point approximation.",
      tags: ["territorial-economy", "value-chain", "price-ladder", "exact-rational"],
      serviceName: "561-group-value-chain",
      category: "territorial-economy",
    },
  ],
  ledgerAccount: LEDGER_ACCOUNT,
  markets: MARKETS,
  resources: ["one pure derivation; no storage, no third-party call"],
});

export const territoryReadoutOffer = declareOffer({
  name: "Territory Readout",
  gateway: GATEWAY,
  gatewayPackageName: PACKAGE,
  section: SECTION,
  operation: "derive-territory-readout",
  origin: ORIGIN,
  route: TERRITORY_READOUT_ROUTE,
  method: "POST",
  price: "$0.08",
  category: "territorial-economy",
  bodyExample: {
    type: "TerritoryReadoutRequest",
    version: 1,
    territory: { path: "north-shore-ecological-adaptation-services-section", name: "North Shore" },
    rows: [],
  },
  bodySchema: {
    properties: {
      type: { type: "string", const: "TerritoryReadoutRequest" },
      version: { type: "integer", minimum: 1 },
      territory: {
        type: "object",
        required: ["path"],
        description: "The place, as a node of the Turtle Island taxonomy, plus its display name.",
        properties: { path: { type: "string" }, name: { type: "string" } },
      },
      rows: { type: "array", description: "The catalogued material rows to read against." },
    },
    required: ["type", "territory", "rows"],
  },
  output: {
    schema: {
      type: "object",
      required: ["type", "materials"],
      properties: {
        type: { type: "string" },
        materials: { type: "array" },
      },
    },
    example: {
      type: "TerritoryReadout",
      materials: [
        { name: "manoomin", products: [], markets: [], chainPosition: "producer", holder: "not named", notFound: ["holder"] },
      ],
    },
  },
  framings: [
    {
      key: "default",
      title: "Territory Readout",
      description:
        "Every catalogued material whose row belongs to a requested place in the Turtle Island taxonomy or one of its ancestors, each with its known products and markets (citations intact), its currently held chain position, a holder rendered as the literal \"not named\" whenever the row carries no benefit-sharing record, and a notFound listing of every field the row itself marks unknown.",
      tags: ["territorial-economy", "territory", "benefit-sharing", "catalog"],
      serviceName: "561-group-territory-readout",
      category: "territorial-economy",
    },
  ],
  ledgerAccount: LEDGER_ACCOUNT,
  markets: MARKETS,
  resources: ["one pure derivation; no storage, no third-party call"],
});

export const offers = Object.freeze([valueChainSharesOffer, territoryReadoutOffer]);
export default offers;
