/**
 * Public ActivityPub++ projection of one x402 seller's already-admitted SEN Offers.
 * The seller/price/SKU/actor identities are authored upstream: this only
 * transports those exact activity objects, never a second offer registry.
 *
 * Small outboxes retain the original inline OrderedCollection contract.
 * Larger ones expose standard finite OrderedCollectionPages, allowing peers
 * to discover the full portfolio without fetching a multi-megabyte first page.
 */
export const CAPABILITY_OUTBOX_PAGE_SIZE = 12;
export const CAPABILITY_OUTBOX_PAGE_BYTES = 192 * 1024;

const ACTIVITY_JSON = "application/activity+json";
const CAPABILITY_ACTOR_IDENTIFIER = "market";
const CONTEXT = "https://www.w3.org/ns/activitystreams";
const AGENT_CARD_ROUTE = "/.well-known/agent-card.json";
const encoder = new TextEncoder();

function pagesOf(activities) {
  const pages = [];
  let page = [], bytes = 0;
  for (const activity of activities) {
    const weight = encoder.encode(JSON.stringify(activity)).byteLength;
    if (page.length && (page.length >= CAPABILITY_OUTBOX_PAGE_SIZE ||
        bytes + weight > CAPABILITY_OUTBOX_PAGE_BYTES)) {
      pages.push(page);
      page = [];
      bytes = 0;
    }
    // A single oversized authored activity remains discoverable by itself;
    // the producer must reduce that activity, not silently drop an offer.
    page.push(activity);
    bytes += weight;
  }
  if (page.length) pages.push(page);
  return pages;
}

function activityJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "content-type": ACTIVITY_JSON, "cache-control": "no-store" },
  });
}

/** Construct the actual actor, WebFinger and finite outbox HTTP resources.
 * @param {readonly object[]} activities Exact already-compiled ActivityPub SEN Offers.
 * @param {{name:string,rails?:{network?:string,asset?:string}}} context
 */
export function capabilityActorResources(activities, { name, rails } = {}) {
  if (!Array.isArray(activities)) throw new TypeError("market outbox needs exact activity objects");
  if (activities.length === 0) return [];
  const actor = activities[0]?.actor;
  const parsed = new URL(actor);
  if (parsed.pathname !== "/actors/market" || parsed.search || parsed.hash ||
      (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname))) {
    throw new TypeError("market outbox actor must be its exact own-origin Service actor");
  }
  const { origin, host, pathname } = parsed;
  const seen = new Set();
  for (const activity of activities) {
    let id;
    try { id = new URL(activity.id); } catch { throw new TypeError("market outbox activity needs an absolute ID"); }
    const addressed = Array.isArray(activity.to) ? activity.to : [activity.to];
    const publicOffer = activity.type === "Offer" && addressed.length === 1 &&
      ["as:Public", "https://www.w3.org/ns/activitystreams#Public"].includes(addressed[0]) &&
      activity.object?.mediaType === "application/sen+cbor";
    if (!publicOffer || activity.actor !== actor || id.origin !== origin || id.search || id.hash || seen.has(id.href)) {
      throw new TypeError("market outbox contains nonpublic, foreign, duplicate or conflicting offer identity");
    }
    seen.add(id.href);
  }
  const outbox = actor + "/outbox";
  const pages = pagesOf(activities);
  const pageUrl = index => outbox + "?page=" + (index + 1);
  const pageFor = (index) => ({
    "@context": CONTEXT, id: pageUrl(index), type: "OrderedCollectionPage",
    partOf: outbox, orderedItems: pages[index],
    ...(index > 0 ? { prev: pageUrl(index - 1) } : {}),
    ...(index + 1 < pages.length ? { next: pageUrl(index + 1) } : {}),
  });
  return [
    {
      match: pathname, methods: ["GET"],
      handler: () => activityJson({
        "@context": CONTEXT, id: actor, type: "Service",
        preferredUsername: CAPABILITY_ACTOR_IDENTIFIER, name, url: origin + "/",
        summary: rails?.network && rails?.asset
          ? "The x402 market of the 561 Group: " + activities.length +
            " capability offers; check each exact x402 quote on " + rails.network +
            " using asset " + rails.asset + "."
          : "The x402 market of the 561 Group: " + activities.length +
            " capability offers; settlement rails are not yet configured, so inspect each official x402 quote.",
        outbox,
        attachment: { type: "Link", name: "A2A Agent Card", mediaType: "application/json", href: origin + AGENT_CARD_ROUTE },
      }),
    },
    {
      match: new URL(outbox).pathname, methods: ["GET"],
      handler: (context) => {
        const params = context.url.searchParams;
        if (params.size === 0) return activityJson({
          "@context": CONTEXT, id: outbox, type: "OrderedCollection", totalItems: activities.length,
          ...(pages.length === 1 ? { orderedItems: activities } : {
            first: pageUrl(0), last: pageUrl(pages.length - 1),
          }),
        });
        const entries = [...params.entries()];
        if (entries.length !== 1 || entries[0][0] !== "page" ||
            !/^[1-9][0-9]{0,5}$/u.test(entries[0][1])) {
          return activityJson({ error: "one bounded outbox page number is required" }, 400);
        }
        const index = Number(entries[0][1]) - 1;
        if (pages.length === 1 || index >= pages.length) {
          return activityJson({ error: "outbox page does not exist" }, 404);
        }
        return activityJson(pageFor(index));
      },
    },
    {
      match: "/.well-known/webfinger", methods: ["GET"],
      handler: (context) => {
        const subject = "acct:" + CAPABILITY_ACTOR_IDENTIFIER + "@" + host;
        if (context.url.searchParams.get("resource") !== subject && context.url.searchParams.get("resource") !== actor) {
          return Response.json({ error: "this market answers WebFinger only for its own actor" }, { status: 404 });
        }
        return new Response(JSON.stringify({ subject, aliases: [actor], links: [{ rel: "self", type: ACTIVITY_JSON, href: actor }] }), {
          status: 200, headers: { "content-type": "application/jrd+json" },
        });
      },
    },
  ];
}
