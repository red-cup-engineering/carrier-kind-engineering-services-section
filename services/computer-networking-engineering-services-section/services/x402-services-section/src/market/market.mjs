import { marketCatalogReadout, requestContract, DEFAULT_MAX_BODY_BYTES } from "./catalog.mjs";
export { marketCatalogReadout } from "./catalog.mjs";
import { createWebApplication } from "@red-cup-engineering/computer-web-platform/application";
import { admitCanonicalJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section/canonical-json";
import { mediaType } from "@red-cup-engineering/http-services-section/body/web";
import { createWorkerFetch } from "@red-cup-engineering/computer-web-server/workers";
import { openApiDocument, openApiResource } from "@red-cup-engineering/computer-web-server/openapi";
import { bindingsProviders } from "@red-cup-engineering/computer-system-platform";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine/rendering";
import { escapeHtml } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { resolveBinding } from "../compute-binding.mjs";
import { createExactEvmFetchPaymentBoundary } from "../fetch-server.mjs";
import { recoverPaidResponse } from "../paid-response-recovery.mjs";
import { declareCatalog, offerPriceText, offerPricingReadout, offerRequestPricing, sourceRightsClaimCurrent, settlementWitness, x402RoutesForOffers } from "../offer.mjs";
import { decodeSignInHeader, SIGN_IN_WITH_X, SIGN_IN_WITH_X_HEADER, signInChallenge, verifySignIn } from "../sign-in-with-x.mjs";
import { projectProxyResponse } from "./proxy-response.mjs";

/**
 * The market: one x402 seller serving a whole catalog of typed operations.
 *
 * "Accepting payment for a compute" is one capability, so it is realized
 * once, here. A catalog entry names the operation it sells (its compute
 * binding), its admission (its validate binding), its price, and its
 * contract; the market resolves every binding by import and serves every
 * priced route, the status probes, the domain-claim hash, the A2A agent
 * card, and the public page from that catalog alone. Selling a new function
 * is a catalog entry, never a gateway, a domain, or a runner.
 */

const STATUS_ROUTES = Object.freeze(["/v1/status", "/healthz"]);
const INDEX_VERIFICATION_ROUTE = "/.well-known/402index-verify.txt";
const AGENT_CARD_ROUTE = "/.well-known/agent-card.json";
const CATALOG_ROUTE = "/v1/catalog";
const OPENAPI_ROUTE = "/openapi.json";
// RFC 9727: a publisher's API catalog at a well-known URI, as an RFC 9264 linkset.
const API_CATALOG_ROUTE = "/.well-known/api-catalog";
const API_CATALOG_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';
const LLMS_ROUTE = "/llms.txt";
// Origin-level x402 discovery (x402 v2 resource-server document) and true402's service descriptor.
const X402_DISCOVERY_ROUTES = Object.freeze(["/.well-known/x402", "/.well-known/x402.json"]);
const X402_SERVICE_ROUTE = "/.well-known/x402-service.json";
const DEFAULT_MARKET_NAME = "market.561.group";
const MAINNET_NETWORK = "eip155:8453";
const SEPOLIA_NETWORK = "eip155:84532";
/** Circle-issued USDC, verified against developers.circle.com/stablecoins/usdc-contract-addresses. */
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Buyer instructions are projections of the offer, never a second catalog.

function requestCommand(example) {
  if (!example.url) return null;
  const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
  const args = ["curl", "--include", "--request", example.method];
  for (const [key, value] of Object.entries(example.headers)) args.push("--header", quote(`${key}: ${value}`));
  if (example.body !== undefined) args.push("--data-raw", quote(JSON.stringify(example.body)));
  args.push("--url", quote(example.url));
  return args.join(" ");
}

function offerHtml(offer) {
  const request = requestContract(offer);
  const command = requestCommand(request.example);
  const code = (value) => `<pre style="overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere"><code>${escapeHtml(value)}</code></pre>`;
  return `<p>${escapeHtml(offer.declaration.framings[0].description)}</p>
    <p><strong>${offer.declaration.requestPricing ? "From " : ""}${escapeHtml(offerPriceText(offer.declaration))} per request</strong> · ${escapeHtml(offer.mimeType)}</p>
    <p><code>${escapeHtml(offer.declaration.method)} ${escapeHtml(offer.declaration.route)}</code></p>
    <details><summary>Request example and payment terms</summary>
    <p>This unsigned request does not authorize payment. If available, the offer returns HTTP 402 and its payment terms. Examples can contain placeholder inputs; replace them with your own data.</p>
    ${command ? code(command) : "<p>Supply the path parameters described below to form your request URL.</p>"}
    <p>Use an x402 client to approve those terms and repeat the request. Save the response body as the purchased result.</p></details>
    <details><summary>Input contract</summary>${code(JSON.stringify(request, null, 2))}</details>
    <details><summary>Response contract and example</summary>${code(JSON.stringify(offer.declaration.output, null, 2))}</details>
    ${offer.declaration.evidence ? `<details><summary>Evidence and limitations</summary>${code(JSON.stringify(offer.declaration.evidence, null, 2))}</details>` : ""}
    ${offer.declaration.sourceRightsClaim ? `<details><summary>Source rights (seller claim; independent verification not performed)</summary>${code(JSON.stringify(offer.declaration.sourceRightsClaim, null, 2))}</details>` : ""}`;
}

/**
 * Read the settlement rails one deployment supplies. Nothing here is a
 * source constant except the two well-known Base USDC contracts.
 * @param {Record<string, string|undefined>} env
 */
export function marketRails(env = {}) {
  const network = env.X402_NETWORK || MAINNET_NETWORK;
  if (!/^eip155:[1-9][0-9]*$/u.test(network)) throw new Error("X402_NETWORK must be an explicit EVM CAIP-2 identifier");
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (market payout address); no default is provided on purpose");
  const known = network === MAINNET_NETWORK ? USDC_BASE_MAINNET : network === SEPOLIA_NETWORK ? USDC_BASE_SEPOLIA : undefined;
  const asset = env.X402_ASSET || known;
  if (!asset) throw new Error("X402_ASSET is required; no built-in USDC default exists for this network");
  const facilitatorUrl = env.X402_FACILITATOR;
  if (!facilitatorUrl) throw new Error("X402_FACILITATOR is required; no facilitator default is provided on purpose");
  const hasDomain = env.X402_ASSET_NAME !== undefined || env.X402_ASSET_VERSION !== undefined;
  if (hasDomain && (!env.X402_ASSET_NAME?.trim() || !env.X402_ASSET_VERSION?.trim())) {
    throw new Error("X402_ASSET_NAME and X402_ASSET_VERSION must be supplied together");
  }
  return Object.freeze({ network, payTo, asset, facilitatorUrl,
    ...(hasDomain ? { assetExtra: { name: env.X402_ASSET_NAME, version: env.X402_ASSET_VERSION } } : {}),
  });
}

/**
 * Derive the market's A2A agent card from its catalog: one skill per offer,
 * named by the operation it sells and described by its first framing.
 * @param {readonly object[]} offers An admitted catalog.
 * @param {{name?: string, origin?: string, version?: string}} [options]
 */
export function marketAgentCard(offers, { name = DEFAULT_MARKET_NAME, origin, version = "1.0.0" } = {}) {
  const catalog = declareCatalog(offers);
  const listed = catalog.filter((offer) => offer.declaration.listed !== false);
  const base = origin ?? catalog[0].declaration.origin;
  return Object.freeze({
    protocolVersion: "0.3.0",
    name,
    description: `561 Group x402 market: ${listed.map((offer) => offer.declaration.name).join(", ")}.`,
    url: base,
    preferredTransport: "JSONRPC",
    provider: Object.freeze({ organization: "561 Group", url: "https://561.group" }),
    version,
    capabilities: Object.freeze({ streaming: false, pushNotifications: false, stateTransitionHistory: false }),
    defaultInputModes: Object.freeze(["application/json"]),
    defaultOutputModes: Object.freeze(["application/json"]),
    skills: Object.freeze(listed.map((offer) => {
      const framing = offer.declaration.framings[0];
      return Object.freeze({
        id: `${offer.declaration.gateway}/${offer.declaration.operation}`,
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
 * The public, unpriced catalog readout: every offer with its route, price,
 * operation, contract, and evidence, so an agent can read what is for sale
 * before spending anything.
 * @param {readonly object[]} offers An admitted catalog.
 * @param {{network?: string, asset?: string}} [rails]
 */

/**
 * Build the TUFTE model for the market's public page: what it sells, at
 * what price, on what rails, grouped by the gateway that owns each offer.
 * @param {readonly object[]} offers
 * @param {{network?: string, asset?: string}} [rails]
 * @param {{name?: string}} [options]
 */
export function marketPageModel(offers, rails = {}, { name = DEFAULT_MARKET_NAME } = {}) {
  const catalog = declareCatalog(offers);
  const listed = catalog.filter((offer) => offer.declaration.listed !== false);
  return {
    title: name,
    subtitle: "Buy a publication, a sourced briefing, or an API result. Pay per request with x402; each offer below includes its price, inputs, and response format.",
    metadata: {
      title: name,
      description: `Priced operations served by ${name}: ${listed.map((offer) => offer.declaration.name).join(", ")}.`,
    },
    navigation: [
      { href: "#buying", label: "How to buy" },
      { href: CATALOG_ROUTE, label: "Catalog" },
      { href: OPENAPI_ROUTE, label: "OpenAPI" },
      { href: AGENT_CARD_ROUTE, label: "Agent card" },
      { href: STATUS_ROUTES[0], label: "Status" },
    ],
    tiles: [
      {
        id: "buying",
        title: "Choose a result. Pay for one request.",
        span: 12,
        html: `<ol><li>Choose an offer below and inspect its input and response examples.</li>
          <li>Make the unsigned example request to read the current payment terms. No wallet or payment is needed to inspect them.</li>
          <li>Use an x402-compatible client and a wallet funded with the requested asset on the requested network. Approve the amount, then repeat the request with the client's payment signature.</li>
          <li>Save the response body: JSON for API results, or the stated file format for publications. Keep the PAYMENT-RESPONSE header as your settlement receipt.</li></ol>
          <p><a href="https://www.npmjs.com/package/@x402/fetch">JavaScript client and purchase examples</a> · <a href="/v1/catalog">Machine-readable inputs, examples, and prices</a></p>
          <p>For publications marked recoverable in the catalog, generate a private 32-byte random token (64 lowercase hex characters) and send it as X-Payment-Recovery with the signed request. Save this token, the original PAYMENT-SIGNATURE, and the receipt. If delivery is interrupted, repeat the identical request with the same token and signature to retrieve the purchased edition without another charge. A new signature authorizes a new purchase; a pending recovery returns a Retry-After header.</p>
          <p>Opening an offer in an ordinary browser does not complete checkout.</p>`,
      },
      {
        id: "offers",
        title: "Offers",
        span: 12,
        html: `<ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:.75rem 2rem;padding-left:1.25rem">${listed.map(offer =>
          `<li><a href="#${escapeHtml(`${offer.declaration.gateway}-${offer.declaration.operation}`)}">${escapeHtml(offer.declaration.name)}</a> · ${offer.declaration.requestPricing ? "From " : ""}${escapeHtml(offerPriceText(offer.declaration))}</li>`
        ).join("")}</ul>`,
      },
      ...listed.map((offer) => ({
        id: `${offer.declaration.gateway}-${offer.declaration.operation}`,
        title: offer.declaration.name,
        eyebrow: `${offer.declaration.requestPricing ? "From " : ""}${offerPriceText(offer.declaration)}`,
        span: 6,
        html: offerHtml(offer),
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

const ACTIVITY_JSON = "application/activity+json";
const CAPABILITY_ACTOR_IDENTIFIER = "market";

/**
 * The market's Service actor in the house capability market: its outbox is the compiled public
 * Offers of the offers this face answers, so a peer node discovers what the market sells the way
 * it discovers any actor (WebFinger, then the actor, then its outbox), with nothing to sign.
 */
function capabilityActorResources(servedOffers, capabilityOutbox, { name }) {
  const served = new Set(servedOffers.filter((offer) => offer.declaration.listed !== false).map((offer) => offer.routeKey));
  const activities = capabilityOutbox.filter((entry) => served.has(entry.routeKey)).map((entry) => entry.activity);
  if (activities.length === 0) return [];
  const actor = activities[0].actor;
  const { origin, host, pathname } = new URL(actor);
  const outbox = `${actor}/outbox`;
  const activityJson = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": ACTIVITY_JSON } });
  return [
    {
      match: pathname,
      methods: ["GET"],
      handler: () => activityJson({
        "@context": "https://www.w3.org/ns/activitystreams", id: actor, type: "Service",
        preferredUsername: CAPABILITY_ACTOR_IDENTIFIER, name, url: `${origin}/`,
        summary: `The x402 market of the 561 Group: ${activities.length} capability offers, each payable per call in USDC on Base.`,
        outbox,
        attachment: { type: "Link", name: "A2A Agent Card", mediaType: "application/json", href: `${origin}${AGENT_CARD_ROUTE}` },
      }),
    },
    {
      match: new URL(outbox).pathname,
      methods: ["GET"],
      handler: () => activityJson({ "@context": "https://www.w3.org/ns/activitystreams", id: outbox, type: "OrderedCollection", totalItems: activities.length, orderedItems: activities }),
    },
    {
      match: "/.well-known/webfinger",
      methods: ["GET"],
      handler: (context) => {
        const subject = `acct:${CAPABILITY_ACTOR_IDENTIFIER}@${host}`;
        if (context.url.searchParams.get("resource") !== subject && context.url.searchParams.get("resource") !== actor) {
          return Response.json({ error: "this market answers WebFinger only for its own actor" }, { status: 404 });
        }
        return new Response(JSON.stringify({ subject, aliases: [actor], links: [{ rel: "self", type: ACTIVITY_JSON, href: actor }] }), { status: 200, headers: { "content-type": "application/jrd+json" } });
      },
    },
  ];
}

function refusalStatus(error) {
  if (typeof error?.status === "number" && error.status >= 400 && error.status < 600) return error.status;
  if (error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError) return 422;
  return 500;
}

function refusal(error) {
  const status = refusalStatus(error);
  return Response.json(
    { error: status === 500 ? "internal error computing market response" : String(error?.message ?? error) },
    { status },
  );
}

/**
 * Serve one market from its catalog.
 *
 * @param {object} input
 * @param {readonly object[]} input.catalog Offer declarations or admitted offers.
 * @param {Record<string, string|undefined>} [input.env] Deployment bindings.
 * @param {Record<string, Function>} [input.compute] Explicit computes by
 *   offer route, `(input, context) => result | Response` where `input` is
 *   `{ body, query, params, env }`; an offer without one is resolved from
 *   its declared compute binding.
 * @param {Record<string, Function>} [input.validate] Explicit admissions by
 *   offer route, run before pricing; an offer without one is resolved from
 *   its declared validate binding, when it has one.
 * @param {(specifier: string) => Promise<object>} [input.load] The module
 *   loader that resolves bindings; defaults to dynamic import.
 * @param {{grants: object, secret: string, origin: string, statement?: string,
 *   verifyContractSignature?: Function}} [input.access] Wallets that use
 *   offers without paying: grants from access-grants.mjs, proven by
 *   sign-in-with-x. Every 402 then offers the sign-in challenge, and a
 *   request whose signed-in wallet holds a grant for the offer is served
 *   without a payment. Each granted use is witnessed as a paid one is: logged
 *   as `market.x402-grant-use`, and handed to `access.onGrantUse` when given.
 * @param {readonly {routeKey: string, activity: object}[]} [input.capabilityOutbox] The house
 *   capability market's public Offers for this market's offers (capability-outbox.mjs, compiled
 *   ahead because SEN identification costs more CPU than an edge request has). When given, the
 *   market serves its Service actor, that actor's outbox, and WebFinger for it.
 * @returns {Readonly<object>} `{ name, fetch, engine, offers, routes, agentCard, catalog, rails }`.
 */
export function createMarket({
  catalog,
  name = DEFAULT_MARKET_NAME,
  env = {},
  compute = {},
  validate = {},
  load,
  facilitatorClient,
  facilitatorClientFactory,
  maxBodyBytes,
  afterSettle,
  purchaseStoreForOffer,
  now,
  nodeOrigin,
  proxyCatalog = [],
  access,
  capabilityOutbox = [],
} = {}) {
  const offers = declareCatalog(catalog);
  // A host this face cannot serve directly (today: runtime:"node" offers on
  // an edge face) can still be sold from here when the deployment names a
  // live origin that does serve them: the request, payment challenge and
  // all, passes through untouched. Omitting `nodeOrigin` (every deployment
  // but market-561-group's edge face, once it sets NODE_MARKET_ORIGIN)
  // leaves this exactly the empty array it always was.
  const proxyOffers = nodeOrigin === undefined ? [] : declareCatalog(proxyCatalog, { admit: false });
  // A configured origin is not necessarily safe or reachable. Keep that
  // distinction available to operational receivers without probing or
  // forwarding any customer traffic during a status read.
  const proxyOriginHttpsQualified = (() => {
    if (proxyOffers.length === 0) return null;
    try {
      const url = new URL(nodeOrigin);
      return url.protocol === "https:" && !url.username && !url.password &&
        !url.search && !url.hash;
    } catch {
      return false;
    }
  })();
  // Discovery (status, agent card, catalog, the public page) reports every
  // offer this face actually answers, proxied or not; only the priced-route
  // handler distinguishes the two.
  const servedOffers = [...offers, ...proxyOffers];
  const listedOffers = servedOffers.filter((offer) => offer.declaration.listed !== false);
  const modules = new Map();
  const importOnce = load ?? ((specifier) => import(specifier));
  const loader = {
    load(specifier) {
      if (!modules.has(specifier)) modules.set(specifier, Promise.resolve(importOnce(specifier)));
      return modules.get(specifier);
    },
  };

  let boundary;
  let rails;
  // Discovery must report configured rails before the first paid request.
  // An incomplete deployment can still expose its catalog for inspection.
  try { rails = marketRails(env); } catch { /* payment() reports configuration errors on purchase */ }
  function payment() {
    if (boundary !== undefined) return boundary;
    rails = marketRails(env);
    boundary = createExactEvmFetchPaymentBoundary({
      network: rails.network,
      facilitatorUrl: rails.facilitatorUrl,
      facilitatorClient: facilitatorClient ?? facilitatorClientFactory?.(rails),
      routes: x402RoutesForOffers(offers, rails),
      afterSettle: afterSettle ?? settlementWitness(offers, { env, ...(now === undefined ? {} : { now }) }),
    });
    return boundary;
  }

  // The market's clock (`now` returns an ISO string) in milliseconds, for sign-in windows and grant terms.
  const clock = now === undefined ? Date.now : () => Date.parse(now());


  // A source-rights declaration is seller testimony, not independent licence
  // verification. When its explicit observation expires, however, we can
  // refuse new use before receiving authorization or taking a payment.
  function sourceRightsGate(offer) {
    if (sourceRightsClaimCurrent(offer.declaration, clock())) return null;
    return Response.json({
      error: "This offer's source-rights claim is not currently admissible; no new payment or execution is accepted.",
      sourceRightsVerification: "unassayed",
    }, { status: 451, headers: { "cache-control": "no-store" } });
  }

  // The account a request's sign-in proves, when that account holds a grant
  // for this offer; null otherwise, and the request goes on to pay.
  async function grantedAccount(request, offer) {
    const header = access === undefined ? null : request.headers.get(SIGN_IN_WITH_X_HEADER);
    if (!header) return null;
    let payload;
    try { payload = decodeSignInHeader(header); } catch { return null; }
    const proof = await verifySignIn(payload, { secret: access.secret, origin: access.origin, url: request.url, now: clock, verifyContractSignature: access.verifyContractSignature });
    if (!proof.verified) return null;
    return access.grants.grantFor(proof.account, offer.declaration.operation, clock()) ? proof.account : null;
  }

  // A 402 answer offers the sign-in challenge beside its payment requirements.
  function offeringSignIn(response, request) {
    const encoded = response.status === 402 && access !== undefined ? response.headers.get("PAYMENT-REQUIRED") : null;
    if (!encoded) return response;
    let required;
    try { required = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")); } catch { return response; }
    required.extensions = { ...required.extensions, [SIGN_IN_WITH_X]: signInChallenge({
      secret: access.secret, origin: access.origin, url: request.url, network: rails?.network ?? env.X402_NETWORK,
      statement: access.statement, now: clock,
    }) };
    const headers = new Headers(response.headers);
    headers.set("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(required), "utf8").toString("base64"));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  function computeFor(offer) {
    const route = offer.declaration.route;
    if (typeof compute[route] === "function") return compute[route];
    if (offer.declaration.compute === undefined) {
      throw new TypeError(`market offers ${route} but it declares no compute binding and none was supplied`);
    }
    return resolveBinding(offer.declaration.compute, offer.declaration, loader);
  }

  function validateFor(offer) {
    const route = offer.declaration.route;
    if (typeof validate[route] === "function") return validate[route];
    if (offer.declaration.validate === undefined) return undefined;
    return resolveBinding(offer.declaration.validate, offer.declaration, loader);
  }

  function pricedResource(offer) {
    const route = offer.declaration.route;
    const computeOffer = computeFor(offer);
    const admit = validateFor(offer);
    const purchaseStore = offer.declaration.recoverable ? purchaseStoreForOffer?.(offer) : undefined;
    return {
      match: route.replace(/\{([A-Za-z0-9_-]+)\}/gu, ":$1"),
      methods: [offer.declaration.method],
      id: `${offer.declaration.gateway}/${offer.declaration.operation}`,
      name: offer.declaration.name,
      route,
      ...(offer.declaration.method === "POST"
        ? {
          validation: {
            contentType: "application/json",
            maxBytes: Math.min(offer.declaration.requestMaxBytes ?? DEFAULT_MAX_BODY_BYTES, maxBodyBytes ?? Infinity),
            ...(offer.declaration.bodySchema === undefined
              ? {}
              : { body: { type: "object", ...offer.declaration.bodySchema } }),
          },
        }
        : {}),
      async handler(context) {
        const rightsRefusal = sourceRightsGate(offer);
        if (rightsRefusal) return rightsRefusal;
        // An already purchased edition remains recoverable if today's edition
        // is unavailable, or a newer edition has replaced it.
        if (purchaseStore) {
          const recovered = await recoverPaidResponse(context.request, purchaseStore);
          if (recovered) return recovered;
        }
        if (offer.declaration.recoverable && !purchaseStore) {
          return Response.json({ error: "Publication delivery storage is unavailable" }, { status: 503, headers: { "retry-after": "30" } });
        }
        let body;
        if (offer.declaration.method === "POST") {
          mediaType(context.request.headers.get("content-type"), "json");
          // Admit the original decoded UTF-8 bytes before a generic JSON parser
          // can discard duplicate members, invalid scalars or overflow numbers.
          const admitted = admitCanonicalJson(await context.input.bytes(), {
            ...JSON_RESOURCE_ENVELOPE,
            maxSourceBytes: maxBodyBytes ?? JSON_RESOURCE_ENVELOPE.maxSourceBytes,
            maxCanonicalBytes: maxBodyBytes ?? JSON_RESOURCE_ENVELOPE.maxCanonicalBytes,
          });
          // Keep the established mutable ordinary JSON request carrier.
          body = JSON.parse(admitted.text);
        }
        const query = Object.fromEntries(context.url.searchParams);
        const params = context.params ?? {};
        const input = { body, query, params, env };
        if (admit !== undefined) {
          try {
            await admit(input, context);
          } catch (error) {
            return refusal(error);
          }
        }
        const compute = async () => {
          try {
            const result = await computeOffer(input, context);
            return result instanceof Response ? result : Response.json(result);
          } catch (error) {
            return refusal(error);
          }
        };
        const account = await grantedAccount(context.request, offer);
        if (account !== null) {
          const granted = await compute();
          if (granted.status < 400) {
            const use = { event: "market.x402-grant-use", gateway: offer.declaration.gateway, operation: offer.declaration.operation, route: offer.declaration.route, account, recordedAt: new Date(clock()).toISOString() };
            console.log(JSON.stringify(use));
            try { await access.onGrantUse?.(use); } catch (error) { console.log(JSON.stringify({ event: "market.x402-grant-use-store-refused", reason: error instanceof Error ? error.message : String(error) })); }
          }
          const headers = new Headers(granted.headers);
          headers.set("x402-access", "grant");
          headers.set("x402-account", account);
          return new Response(granted.body, { status: granted.status, statusText: granted.statusText, headers });
        }
        let paid;
        try {
          paid = payment();
        } catch (error) {
          return Response.json({ error: `market misconfigured: ${error.message}` }, { status: 500 });
        }
        return offeringSignIn(await paid.handle(context.request, compute, { purchaseStore, recoveryChecked: true, body: offer.declaration.requestPricing === undefined ? body : structuredClone(body) }), context.request);
      },
    };
  }

  /**
   * Forward one request to the live origin that actually serves this offer,
   * verbatim: method, headers and body on the way in, status, headers and
   * body on the way back. The origin runs its own complete market (its own
   * payment challenge and settlement), so this face never touches money for
   * a proxied offer; it is a boundary, not a second seller.
   */
  function proxyResource(offer) {
    const route = offer.declaration.route;
    return {
      match: route.replace(/\{([A-Za-z0-9_-]+)\}/gu, ":$1"),
      methods: [offer.declaration.method],
      id: `${offer.declaration.gateway}/${offer.declaration.operation}`,
      name: offer.declaration.name,
      route,
      async handler(context) {
        const rightsRefusal = sourceRightsGate(offer);
        if (rightsRefusal) return rightsRefusal;
        // This is the same exact admission predicate exposed on /v1/status.
        // A malformed origin fails closed before parsing its target, let alone
        // consuming or forwarding the customer payment and request body.
        if (proxyOriginHttpsQualified !== true) {
          return Response.json({ error: "Node market origin requires authenticated HTTPS before paid proxying" },
            { status: 503, headers: { "cache-control": "no-store", "retry-after": "120" } });
        }
        const target = new URL(`${context.url.pathname}${context.url.search}`, nodeOrigin);
        const forwardedBody = ["GET", "HEAD"].includes(context.request.method)
          ? undefined : await context.request.arrayBuffer();
        const upstream = await fetch(target, {
          method: context.request.method,
          headers: context.request.headers,
          body: forwardedBody,
          redirect: "error",
        });
        const signedRequest = context.request.headers.has("payment-signature");
        let expectedTerms;
        if (upstream.status === 402 || (upstream.ok && signedRequest)) {
          try {
            const pricedBody = offer.declaration.requestPricing === undefined ? undefined :
              JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(forwardedBody));
            expectedTerms = {
              ...marketRails(env),
              amount: offerRequestPricing(offer.declaration, pricedBody).amountAtomic,
            };
          } catch {
            await upstream.body?.cancel();
            return Response.json({ error: "Node market quote or paid result could not be reconciled to the seller pricing and payout" },
              { status: 503, headers: { "cache-control": "no-store" } });
          }
        }
        return projectProxyResponse(upstream, {
          publicUrl: new URL(`${context.url.pathname}${context.url.search}`, offer.declaration.origin).href,
          resourceUrl: offer.url,
          signedRequest,
          ...(expectedTerms === undefined ? {} : { expectedTerms }),
        });
      },
    };
  }

  const engine = createWebApplication({
    cacheControl: { noStore: true },
    onError: (error) => refusal(error),
    platform: { providers: bindingsProviders(env) },
    resources: [
      openApiResource(() => marketOpenApi(servedOffers, rails ?? {}, { name }), OPENAPI_ROUTE),
      ...STATUS_ROUTES.map((match) => ({
        match,
        methods: ["GET"],
        handler: () => Response.json({
          status: "ok",
          service: name,
          offers: servedOffers.length,
          listedOffers: listedOffers.length,
          directOffers: offers.length,
          directListedOffers: offers.filter((offer) => offer.declaration.listed !== false).length,
          proxyOffers: proxyOffers.length,
          proxyListedOffers: proxyOffers.filter((offer) => offer.declaration.listed !== false).length,
          runtime: env.MARKET_RUNTIME ?? null,
          nodeProxyConfigured: nodeOrigin !== undefined,
          nodeProxyTransport: proxyOriginHttpsQualified === null ? "not-used" :
            proxyOriginHttpsQualified ? "https-configured-not-received" : "insecure-refused",
          build: env.MARKET_BUILD_SHA ?? null,
          workerVersion: env.CF_VERSION_METADATA === undefined ? null : {
            id: env.CF_VERSION_METADATA.id ?? null,
            tag: env.CF_VERSION_METADATA.tag ?? null,
            timestamp: env.CF_VERSION_METADATA.timestamp ?? null,
          },
        }),
      })),
      {
        match: INDEX_VERIFICATION_ROUTE,
        methods: ["GET"],
        handler: () => {
          const hash = env.INDEX_VERIFICATION_HASH;
          if (!hash) return new Response("no domain claim is outstanding for this market\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
          return new Response(`${hash}\n`, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
        },
      },
      {
        match: AGENT_CARD_ROUTE,
        methods: ["GET"],
        handler: () => Response.json(marketAgentCard(servedOffers, { name })),
      },
      {
        match: API_CATALOG_ROUTE,
        methods: ["GET", "HEAD"],
        handler: (context) => {
          const catalog = marketApiCatalog(servedOffers, { origin: context.url.origin });
          const headers = { "content-type": API_CATALOG_TYPE, link: `<${catalog.linkset[0].anchor}>; rel="api-catalog"` };
          return new Response(context.request.method === "HEAD" ? null : JSON.stringify(catalog), { status: 200, headers });
        },
      },
      ...X402_DISCOVERY_ROUTES.map((match) => ({
        match,
        methods: ["GET"],
        handler: (context) => Response.json(marketX402Discovery(servedOffers, rails ?? {}, { name, origin: context.url.origin }),
          { headers: { "access-control-allow-origin": "*" } }),
      })),
      {
        match: X402_SERVICE_ROUTE,
        methods: ["GET"],
        handler: (context) => Response.json(marketX402Service(servedOffers, rails ?? {}, { name, origin: context.url.origin }),
          { headers: { "access-control-allow-origin": "*" } }),
      },
      ...servedOffers.filter(offer => offer.declaration.listed !== false).map(offer => ({
        match: offer.declaration.route.replace(/\{([A-Za-z0-9_-]+)\}/gu, ":$1") + X402_SERVICE_ROUTE,
        methods: ["GET"],
        handler: context => Response.json(marketX402Service([offer], rails ?? {}, { name, origin: context.url.origin }),
          { headers: { "access-control-allow-origin": "*" } }),
      })),
      {
        match: LLMS_ROUTE,
        methods: ["GET"],
        handler: (context) => new Response(marketLlmsText(servedOffers, { name, origin: context.url.origin }),
          { status: 200, headers: { "content-type": "text/markdown; charset=utf-8" } }),
      },
      ...capabilityActorResources(servedOffers, capabilityOutbox, { name }),
      {
        match: CATALOG_ROUTE,
        methods: ["GET"],
        handler: () => Response.json(marketCatalogReadout(servedOffers, rails ?? {})),
      },
      {
        match: "/",
        methods: ["GET"],
        handler: () => new Response(
          renderTufteDocument(marketPageModel(servedOffers, rails ?? {}, { name }), { documentTitle: name }),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        ),
      },
      ...offers.map(pricedResource),
      ...proxyOffers.map(proxyResource),
    ],
  });

  return Object.freeze({
    name,
    offers,
    proxyOffers,
    engine,
    fetch: engine.fetch,
    routes: Object.freeze(servedOffers.map((offer) => offer.declaration.route)),
    agentCard: () => marketAgentCard(servedOffers, { name }),
    catalog: () => marketCatalogReadout(servedOffers, rails ?? {}),
    rails: () => marketRails(env),
  });
}

const offerOrigin = (offers, fallback) => offers[0]?.declaration.origin ?? fallback;
const offerSummary = (declaration) => {
  const description = declaration.framings?.[0]?.description ?? declaration.name ?? declaration.operation;
  return declaration.requestPricing === undefined ? description : `${description} Price starts at ${offerPriceText(declaration)} for ${declaration.requestPricing.includedBytes} canonical JSON UTF-8 bytes; each additional ${declaration.requestPricing.additionalUnitBytes} bytes adds ${declaration.requestPricing.additionalUnitAtomic} atomic settlement units, capped at ${declaration.requestPricing.maximumAtomic}. Inspect the native x402 quote before payment.`;
};

/** OpenAPI is another projection of the served offer contracts, not another registry. */
export function marketOpenApi(offers, rails = {}, { name = DEFAULT_MARKET_NAME, origin } = {}) {
  const base = offerOrigin(offers, origin);
  const routes = offers.filter(({ declaration }) => declaration.listed !== false).map(offer => {
    const declaration = offer.declaration;
    const parameters = [];
    for (const [location, schema, examples] of [["query", declaration.querySchema, declaration.queryExample], ["path", declaration.pathParamsSchema, undefined]]) {
      for (const [key, property] of Object.entries(schema?.properties ?? {})) parameters.push({
        name: key, in: location, required: location === "path" || (schema.required ?? []).includes(key), schema: property,
        ...(examples && Object.hasOwn(examples, key) ? { example: examples[key] } : {}),
      });
    }
    return {
      path: declaration.route, methods: [declaration.method], operation: {
        operationId: `${declaration.gateway}/${declaration.operation}`, summary: declaration.name,
        description: offerSummary(declaration), tags: offerCapabilities(declaration), parameters,
        ...(declaration.requestPricing === undefined ? {} : { "x-x402-pricing": offerPricingReadout(declaration) }),
        "x-561-group-seller": declaration.seller ?? null,
        ...(declaration.price ? { "x-price": declaration.price, ...(rails.network ? { "x-x402-network": rails.network } : {}) } : {}),
        ...(declaration.method === "POST" ? { requestBody: {
          required: true, content: { "application/json": {
            schema: declaration.bodySchema ?? { type: "object" },
            ...(declaration.bodyExample === undefined ? {} : { example: declaration.bodyExample }),
          } },
        } } : {}),
        responses: {
          "200": { description: "Declared successful representation. See the schema for the result and its diagnostic fields.",
            content: { [offer.mimeType]: { schema: declaration.output.schema, example: declaration.output.example } },
            headers: { "PAYMENT-RESPONSE": { description: "When payment settled, the native x402 settlement response encoded as base64 JSON; retain with the delivered representation.", schema: { type: "string" } } },
          },
          "402": { description: "Payment required. Obtain the current native x402 terms with an unsigned valid request; an x402 client signs and repeats that request.",
            headers: { "PAYMENT-REQUIRED": { description: "Native x402 v2 payment requirements, base64 JSON. This live quote controls the network, asset, amount and recipient.", schema: { type: "string" } } },
          },
          default: { description: "Other HTTP outcomes, including admission refusal, upstream unavailability or asynchronous delivery. Inspect the actual status and representation; this document does not assert execution or settlement." },
        },
      },
    };
  });
  return openApiDocument(routes, { title: name, version: "2", servers: [{ url: base }],
    description: "The 561 Group's served offers. Inputs, examples, prices and response schemas are derived from the same catalogue used for execution. Inspect each live 402 quote before payment; declared contracts do not prove delivery or settlement." });
}

/** The RFC 9727 API catalog of the served offers: each is an item; the catalog readout describes them. */
export function marketApiCatalog(offers, { origin } = {}) {
  const base = offerOrigin(offers, origin);
  return {
    linkset: [{
      anchor: `${base}${API_CATALOG_ROUTE}`,
      item: offers.map(({ declaration }) => ({ href: `${base}${declaration.route}`, title: declaration.name ?? declaration.operation })),
      "service-desc": [{ href: `${base}${OPENAPI_ROUTE}`, type: "application/vnd.oai.openapi+json;version=3.1" }, { href: `${base}${CATALOG_ROUTE}`, type: "application/json" }],
      "service-doc": [{ href: `${base}${LLMS_ROUTE}`, type: "text/markdown" }, { href: `${base}/`, type: "text/html" }],
    }],
  };
}

/** The market as an llms.txt (llmstxt.org): what each offer does, what it costs, and how it is called. */
export function marketLlmsText(offers, { name = "market", origin } = {}) {
  const base = offerOrigin(offers, origin);
  const lines = [
    `# ${name}`, "",
    `> Machine-buyable operations, each paid per call over x402 (HTTP 402) in USDC. Request an offer's route without payment to receive its payment challenge; the catalog at ${base}${CATALOG_ROUTE} lists every offer's input contract, price and example.`, "",
    "## Offers", "",
    ...offers.map(({ declaration }) => `- [${declaration.name ?? declaration.operation}](${base}${declaration.route}): ${declaration.method} ${declaration.route}${declaration.price ? `, ${declaration.requestPricing ? "from " : ""}${offerPriceText(declaration)} per call` : ""}. ${offerSummary(declaration)}`),
    "", "## Discovery", "",
    `- [Catalog](${base}${CATALOG_ROUTE}): every offer's contract, price, evidence and compute owner`,
    `- [OpenAPI](${base}${OPENAPI_ROUTE}): HTTP methods, inputs and declared response schemas`,
    `- [Agent card](${base}${AGENT_CARD_ROUTE}): one A2A skill per offer`,
    `- [API catalog](${base}${API_CATALOG_ROUTE}): RFC 9727 linkset`, "",
  ];
  return `${lines.join("\n")}`;
}

const offerCapabilities = (declaration) => [...new Set([declaration.gateway, declaration.category, ...(declaration.framings?.[0]?.tags ?? [])].filter(Boolean))];
const discoveryAsset = (declaration, rails) => typeof declaration.price !== "string" ? declaration.price.asset
  : (rails.network === MAINNET_NETWORK && rails.asset?.toLowerCase() === USDC_BASE_MAINNET.toLowerCase()
    || rails.network === SEPOLIA_NETWORK && rails.asset?.toLowerCase() === USDC_BASE_SEPOLIA.toLowerCase()) ? "USDC" : rails.asset ?? "USD";
const discoveryPrice = (declaration, rails) => typeof declaration.price === "string"
  ? { currency: discoveryAsset(declaration, rails) === "USDC" ? "USDC" : "USD", base: declaration.price.slice(1), unit: "request" }
  : { currency: declaration.price.asset, base: declaration.price.amountAtomic, unit: "atomic-unit/request" };

/** The origin-level x402 discovery document: every served offer as a paid resource on the market's rails. */
export function marketX402Discovery(offers, rails = {}, { name = DEFAULT_MARKET_NAME, origin } = {}) {
  const base = offerOrigin(offers, origin);
  return {
    x402Version: 2,
    kind: "resource-server",
    name,
    description: "The 561 Group's x402 market: typed operations and publications, priced in their declared settlement assets.",
    resources: offers.filter(({ declaration }) => declaration.price && declaration.listed !== false).map(({ declaration }) => ({
      url: `${base}${declaration.route}`, method: declaration.method, name: declaration.name, description: offerSummary(declaration),
      price: declaration.price, ...(declaration.requestPricing === undefined ? {} : { pricing: offerPricingReadout(declaration) }), asset: discoveryAsset(declaration, rails), ...(rails.network ? { network: rails.network } : {}),
      ...(declaration.bodySchema ? { inputSchema: { type: "object", ...declaration.bodySchema, ...(declaration.bodyExample ? { example: declaration.bodyExample } : {}) } } : declaration.querySchema ? { inputSchema: { type: "object", ...declaration.querySchema } } : {}),
      outputSchema: declaration.output.schema,
    })),
    attestation: { type: "none" },
    docs: `${base}${CATALOG_ROUTE}`,
  };
}

/** true402's service descriptor: the market as a marketplace of its served offers. */
function boundedOfferSummary(text, maximum) {
  if (text.length <= maximum) return text;
  const excerpt = text.slice(0, maximum);
  const sentences = [...excerpt.matchAll(/[.!?](?:\s|$)/gu)];
  if (sentences.length) return excerpt.slice(0, sentences.at(-1).index + 1);
  const wordEnd = excerpt.lastIndexOf(" ");
  return (wordEnd > 0 ? excerpt.slice(0, wordEnd) : excerpt.slice(0, maximum - 1).replace(/[\uD800-\uDBFF]$/u, "")) + "…";
}

export function marketX402Service(offers, rails = {}, { name = DEFAULT_MARKET_NAME, origin } = {}) {
  const base = offerOrigin(offers, origin);
  const priced = offers.filter(({ declaration }) => declaration.price && declaration.listed !== false);
  // true402 caps the origin summary at twenty capabilities. All per-offer
  // capabilities remain below, so a growing market does not become invalid.
  const counts = new Map();
  for (const { declaration } of priced) for (const capability of offerCapabilities(declaration)) counts.set(capability, (counts.get(capability) ?? 0) + 1);
  const summary = [...counts].sort(([a, n], [b, m]) => m - n || a.localeCompare(b)).slice(0, 20).map(([name]) => name);
  const single = priced.length === 1 ? priced[0] : null;
  const instructions = single ? ` HTTP ${single.declaration.method}; inputs: ${base}${CATALOG_ROUTE}.` : "";
  // A capped directory still searches this one catalogue entry. Keep actual
  // conversion families discoverable without registering duplicate endpoints.
  const dataFamilies = [...new Set(priced.filter(({ declaration }) => declaration.category === "data")
    .flatMap(({ declaration }) => declaration.framings?.map(framing => framing.tags?.[0]).filter(Boolean) ?? []))];
  return {
    x402: "1.0",
    name: single?.declaration.name ?? name,
    type: "marketplace",
    description: single ? boundedOfferSummary(offerSummary(single.declaration), 256 - instructions.length) + instructions : boundedOfferSummary(
      `${priced.length} x402 offers. ${dataFamilies.length ? `Data: ${dataFamilies.join(",")}. ` : ""}Catalogue: prices, inputs, outputs.`, 256),
    capabilities: summary,
    endpoint: single ? `${base}${single.declaration.route}` : `${base}${CATALOG_ROUTE}`,
    pricing: single ? discoveryPrice(single.declaration, rails) : { unit: "request", quote: "per-service" },
    payment: { ...(rails.payTo ? { address: rails.payTo } : {}), chain: rails.network === "eip155:8453" ? "base-mainnet" : rails.network ?? "base-mainnet",
      ...(rails.network ? { networks: [rails.network] } : {}), ...(rails.facilitatorUrl ? { facilitator: rails.facilitatorUrl } : {}) },
    services: priced.map(({ declaration }) => ({
      id: `${declaration.gateway}/${declaration.operation ?? declaration.route}`, name: declaration.name ?? declaration.operation,
      capabilities: offerCapabilities(declaration), endpoint: `${base}${declaration.route}`,
      pricing: { ...discoveryPrice(declaration, rails), ...(declaration.requestPricing === undefined ? {} : { tariff: declaration.requestPricing }) },
    })),
  };
}

/**
 * Build one Cloudflare Workers `{ fetch }` export for a market whose catalog
 * is fixed, with the deployment's bindings supplied per request.
 * @param {(env: Record<string, string|undefined>) => object} marketFor
 */
export function createMarketWorker(marketFor) {
  return createWorkerFetch((env) => marketFor(env).engine);
}
