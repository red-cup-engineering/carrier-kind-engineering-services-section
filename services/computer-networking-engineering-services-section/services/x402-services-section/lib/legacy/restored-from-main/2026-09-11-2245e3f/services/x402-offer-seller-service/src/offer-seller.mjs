import { createWebApplicationEngine } from "@red-cup-engineering/web-server-services-section/web-application-engine";
import { renderTufteDocument } from "@red-cup-engineering/web-tufte-gui-services-section/rendering";
import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { settlementWitness, x402RoutesForOffers } from "@red-cup-engineering/x402-services-section/offer";

/**
 * One seller, served from its declared offers.
 *
 * Every 561 Group x402 seller is the same shape: priced routes with their
 * schema-valid challenges, a status probe, a domain-claim hash, an agent
 * card, and a public page. This engine is that shape once. A seller package
 * supplies its offers and its compute, and carries no transport of its own.
 */

const STATUS_ROUTES = Object.freeze(["/v1/status", "/healthz"]);
const INDEX_VERIFICATION_ROUTE = "/.well-known/402index-verify.txt";
const AGENT_CARD_ROUTE = "/.well-known/agent-card.json";
const MAINNET_NETWORK = "eip155:8453";
const SEPOLIA_NETWORK = "eip155:84532";
/** Circle-issued USDC, verified against developers.circle.com/stablecoins/usdc-contract-addresses. */
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const DEFAULT_MAX_BODY_BYTES = 100 * 1024;

function requireOffers(offers) {
  if (!Array.isArray(offers) || offers.length === 0) throw new TypeError("a seller requires one nonempty set of admitted offers");
  const gateways = new Set(offers.map((offer) => offer?.declaration?.gateway));
  if (gateways.size !== 1) throw new TypeError("every offer a seller serves must belong to the same gateway");
  return offers;
}

/**
 * Read the settlement rails one deployment supplies. Nothing here is a
 * source constant except the two well-known Base USDC contracts.
 * @param {Record<string, string|undefined>} env
 */
export function sellerRails(env = {}) {
  const network = env.X402_NETWORK || MAINNET_NETWORK;
  if (!/^eip155:[1-9][0-9]*$/u.test(network)) throw new Error("X402_NETWORK must be an explicit EVM CAIP-2 identifier");
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
  const known = network === MAINNET_NETWORK ? USDC_BASE_MAINNET : network === SEPOLIA_NETWORK ? USDC_BASE_SEPOLIA : undefined;
  const asset = env.X402_ASSET || known;
  if (!asset) throw new Error("X402_ASSET is required; no built-in USDC default exists for this network");
  const facilitatorUrl = env.X402_FACILITATOR;
  if (!facilitatorUrl) throw new Error("X402_FACILITATOR is required; no facilitator default is provided on purpose");
  return Object.freeze({ network, payTo, asset, facilitatorUrl });
}

/**
 * Derive this seller's A2A agent card from its offers: one skill per offer,
 * named by the operation it sells and described by its first framing.
 * @param {readonly object[]} offers Admitted offers from `declareOffer`.
 * @param {{origin?: string, version?: string}} [options]
 */
export function sellerAgentCard(offers, { origin, version = "1.0.0" } = {}) {
  const declared = requireOffers(offers);
  const base = origin ?? declared[0].declaration.origin;
  const gateway = declared[0].declaration.gateway;
  return Object.freeze({
    protocolVersion: "0.3.0",
    name: gateway,
    description: `561 Group x402 seller: ${declared.map((offer) => offer.declaration.name).join(", ")}.`,
    url: base,
    preferredTransport: "JSONRPC",
    provider: Object.freeze({ organization: "561 Group", url: "https://561.group" }),
    version,
    capabilities: Object.freeze({ streaming: false, pushNotifications: false, stateTransitionHistory: false }),
    defaultInputModes: Object.freeze(["application/json"]),
    defaultOutputModes: Object.freeze(["application/json"]),
    skills: Object.freeze(declared.map((offer) => {
      const framing = offer.declaration.framings[0];
      return Object.freeze({
        id: offer.declaration.operation,
        name: offer.declaration.name,
        description: framing.description,
        tags: Object.freeze([...framing.tags]),
        examples: Object.freeze([`${offer.declaration.method} ${offer.url}`]),
        inputModes: Object.freeze([offer.mimeType]),
        outputModes: Object.freeze([offer.mimeType]),
      });
    })),
  });
}

/**
 * Build the TUFTE model for this seller's public page: what it sells, at what
 * price, on what rails, and where each offer is reachable.
 * @param {readonly object[]} offers
 * @param {{network?: string, asset?: string}} [rails]
 */
export function sellerPageModel(offers, rails = {}) {
  const declared = requireOffers(offers);
  const gateway = declared[0].declaration.gateway;
  return {
    title: gateway,
    subtitle: "An x402 seller of the 561 Group. Every route below answers HTTP 402 with its payment terms until it is paid.",
    metadata: {
      title: gateway,
      description: `Priced offers served by ${gateway}: ${declared.map((offer) => offer.declaration.name).join(", ")}.`,
    },
    navigation: [
      { href: AGENT_CARD_ROUTE, label: "Agent card" },
      { href: STATUS_ROUTES[0], label: "Status" },
    ],
    tiles: [
      {
        id: "offers",
        title: "Offers",
        span: 2,
        table: {
          columns: ["Offer", "Method", "Route", "Price", "Operation"],
          rows: declared.map((offer) => [
            offer.declaration.name,
            offer.declaration.method,
            offer.declaration.route,
            offer.declaration.price,
            offer.declaration.operation,
          ]),
        },
      },
      ...declared.map((offer) => ({
        id: offer.declaration.operation,
        title: offer.declaration.name,
        eyebrow: offer.declaration.price,
        content: offer.declaration.framings[0].description,
        data: { route: offer.declaration.route, amountAtomic: offer.amount, markets: [...offer.declaration.markets] },
      })),
      {
        id: "settlement",
        title: "Settlement",
        table: {
          columns: ["Field", "Value"],
          rows: [
            ["Protocol", "x402 v2, exact scheme"],
            ["Network", rails.network ?? "supplied by the deployment"],
            ["Asset", rails.asset ?? "supplied by the deployment"],
          ],
        },
      },
    ],
  };
}

function refusalStatus(error) {
  if (typeof error?.status === "number" && error.status >= 400 && error.status < 500) return error.status;
  if (error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError) return 422;
  return 500;
}

function refusal(error) {
  const status = refusalStatus(error);
  return Response.json(
    { error: status === 500 ? "internal error computing gateway response" : String(error?.message ?? error) },
    { status },
  );
}

/**
 * Serve one seller from its declared offers.
 *
 * @param {object} input
 * @param {readonly object[]} input.offers Admitted offers from `declareOffer`.
 * @param {Record<string, string|undefined>} [input.env] Deployment bindings.
 * @param {Record<string, Function>} input.compute One compute per offer route:
 *   `(input, context) => result | Response`, where `input` is
 *   `{ body, query, params }`.
 * @param {Record<string, Function>} [input.validate] Optional semantic
 *   validation per offer route, run before pricing so a malformed request is
 *   refused without a payment challenge.
 * @param {Record<string, string>} [input.proxy] Offer routes served by
 *   forwarding to the origin that owns computation and payment. The edge
 *   never verifies or settles an origin-owned offer a second time.
 * @returns {Readonly<object>} `{ fetch, engine, offers, routes, agentCard, rails }`.
 */
export function createOfferSeller({
  offers,
  env = {},
  compute = {},
  validate = {},
  proxy = {},
  facilitatorClient,
  facilitatorClientFactory,
  fetch: fetchImpl,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  afterSettle,
  now,
} = {}) {
  const declared = requireOffers(offers);
  const gateway = declared[0].declaration.gateway;

  let boundary;
  let rails;
  function payment() {
    if (boundary !== undefined) return boundary;
    rails = sellerRails(env);
    boundary = createExactEvmFetchPaymentBoundary({
      network: rails.network,
      facilitatorUrl: rails.facilitatorUrl,
      facilitatorClient: facilitatorClient ?? facilitatorClientFactory?.(),
      routes: x402RoutesForOffers(declared, { network: rails.network, payTo: rails.payTo, asset: rails.asset }),
      afterSettle: afterSettle ?? settlementWitness(declared, { env, ...(now === undefined ? {} : { now }) }),
    });
    return boundary;
  }

  function pricedResource(offer) {
    const route = offer.declaration.route;
    const proxyOrigin = proxy[route];
    const computeOffer = compute[route];
    if (proxyOrigin === undefined && typeof computeOffer !== "function") {
      throw new TypeError(`seller offers ${route} but supplies neither compute nor proxy for it`);
    }
    return {
      match: route.replace(/\{([A-Za-z0-9_-]+)\}/gu, ":$1"),
      methods: [offer.declaration.method],
      id: offer.declaration.operation,
      name: offer.declaration.name,
      route,
      ...(offer.declaration.method === "POST"
        ? {
          validation: {
            contentType: "application/json",
            maxBytes: maxBodyBytes,
            ...(offer.declaration.bodySchema === undefined
              ? {}
              : { body: { type: "object", ...offer.declaration.bodySchema } }),
          },
        }
        : {}),
      async handler(context) {
        let body;
        if (offer.declaration.method === "POST") body = await context.input.json();
        const query = Object.fromEntries(context.url.searchParams);
        const params = context.params ?? {};
        const semantic = validate[route];
        if (typeof semantic === "function") semantic({ body, query, params });
        if (proxyOrigin !== undefined) return proxyPaymentBoundary(context.request, proxyOrigin, fetchImpl);
        let paid;
        try {
          paid = payment();
        } catch (error) {
          return Response.json({ error: `gateway misconfigured: ${error.message}` }, { status: 500 });
        }
        return paid.handle(context.request, async (request) => {
          try {
            const result = await computeOffer({ body, query, params }, context);
            return result instanceof Response ? result : Response.json(result);
          } catch (error) {
            return refusal(error);
          }
        });
      },
    };
  }

  const engine = createWebApplicationEngine({
    cacheControl: { noStore: true },
    onError: (error) => refusal(error),
    resources: [
      ...STATUS_ROUTES.map((match) => ({
        match,
        methods: ["GET"],
        handler: () => Response.json({ status: "ok", service: gateway }),
      })),
      {
        match: INDEX_VERIFICATION_ROUTE,
        methods: ["GET"],
        handler: () => {
          const hash = env.INDEX_VERIFICATION_HASH;
          if (!hash) return new Response("no domain claim is outstanding for this seller\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
          return new Response(`${hash}\n`, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
        },
      },
      {
        match: AGENT_CARD_ROUTE,
        methods: ["GET"],
        handler: () => Response.json(sellerAgentCard(declared)),
      },
      {
        match: "/",
        methods: ["GET"],
        handler: () => new Response(
          renderTufteDocument(sellerPageModel(declared, rails ?? {}), { documentTitle: gateway }),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        ),
      },
      ...declared.map(pricedResource),
    ],
  });

  return Object.freeze({
    gateway,
    offers: Object.freeze([...declared]),
    engine,
    fetch: engine.fetch,
    routes: Object.freeze(declared.map((offer) => offer.declaration.route)),
    agentCard: () => sellerAgentCard(declared),
    rails: () => sellerRails(env),
  });
}

/** Forward to a payment-owning origin, retaining the buyer's public resource URL. */
export async function proxyPaymentBoundary(request, origin, fetchImpl = globalThis.fetch) {
  const requestUrl = new URL(request.url);
  const originUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, origin);
  const send = fetchImpl;
  const response = await send(originUrl.href, {
    method: request.method,
    headers: request.headers,
    ...(request.method === "GET" || request.method === "HEAD" ? {} : { body: await request.clone().arrayBuffer() }),
    redirect: "manual",
  });
  const headers = new Headers(response.headers);
  const encoded = headers.get("payment-required");
  if (encoded) {
    const challenge = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (challenge.resource) challenge.resource.url = request.url;
    headers.set("payment-required", Buffer.from(JSON.stringify(challenge)).toString("base64"));
  }
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Build one Cloudflare Workers `{ fetch }` export for a seller whose offers
 * and compute are fixed, with the deployment's bindings supplied per request.
 * @param {(env: Record<string, string|undefined>) => object} sellerFor
 */
export function createOfferSellerWorker(sellerFor) {
  const sellers = new WeakMap();
  return {
    fetch(request, env = {}) {
      let seller = sellers.get(env);
      if (!seller) {
        seller = sellerFor(env);
        sellers.set(env, seller);
      }
      return seller.fetch(request, { capabilities: env });
    },
  };
}
