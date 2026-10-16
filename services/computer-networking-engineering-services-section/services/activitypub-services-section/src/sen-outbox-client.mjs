import { extractSenActivity } from "./sen-activity.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "./activitystreams.mjs";

const DEFAULT_MAX_PAGES = 128;
const DEFAULT_MAX_ACTIVITIES = 4096;
const DEFAULT_MAX_PAGE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 32 * 1024 * 1024;

function one(value) { return Array.isArray(value) ? value : [value]; }
function httpsUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError(label + " must be an absolute URL"); }
  const loopbackHttp = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
  if ((url.protocol !== "https:" && !loopbackHttp) ||
      url.username || url.password || url.hash) {
    throw new TypeError(label + " must use HTTPS outside loopback, without credentials or fragments");
  }
  return url;
}
function exactActivityId(value) {
  return httpsUrl(value, "ActivityPub activity identity").href;
}
function bound(value, label, ceiling) {
  if (!Number.isSafeInteger(value) || value < 1 || value > ceiling) {
    throw new TypeError(label + " must be a positive bounded integer (maximum " + ceiling + ")");
  }
  return value;
}

/** A peer controls its own pagination, not the reader's network destination.
 * Same-origin links can still use ordinary ActivityPub pagination paths.
 */
function pageUrl(value, outboxOrigin) {
  const url = httpsUrl(value, "ActivityPub outbox page");
  if (url.origin !== outboxOrigin) throw new TypeError("ActivityPub outbox page crosses its original source origin");
  return url.href;
}

/** Bound every received page before parsing, including when the peer answers
 * with a streaming body. A source which exceeds the attention budget is a
 * refusal, never a partial catalog represented as complete. */
let publicPolicy;
async function authorizePublicPage(url) {
  // Share the original Red Cup public-network policy, including resolved DNS
  // address classification. A mock authorizer is explicit in fixture callers.
  // Lazily load Node's DNS implementation only on outbound federation reads.
  publicPolicy ??= import("@red-cup-engineering/http-services-section/fetch-policy");
  const { authorizePublicHttpUrl } = await publicPolicy;
  return authorizePublicHttpUrl(new URL(url), { purpose: "activitypub-sen-outbox" });
}

async function jsonFrom(url, fetcher, budget, authorizeUrl) {
  await authorizeUrl(url);
  // Never allow an untrusted peer to redirect the bounded source read
  // across origins (or onto private metadata or loopback addresses).
  const response = await fetcher(url, { headers: { accept: "application/activity+json" }, redirect: "error" });
  if (!response?.ok) throw new Error("ActivityPub outbox read failed with HTTP " + (response?.status ?? "unknown"));
  let payload, bytes;
  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let text = "", length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > budget.maxPageBytes || budget.bytes + length > budget.maxTotalBytes) {
          await reader.cancel();
          throw new RangeError("ActivityPub source exceeded the bounded read-byte budget");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    payload = JSON.parse(text);
    bytes = length;
  } else if (typeof response.text === "function") {
    const text = await response.text();
    bytes = new TextEncoder().encode(text).byteLength;
    payload = bytes <= budget.maxPageBytes && budget.bytes + bytes <= budget.maxTotalBytes
      ? JSON.parse(text) : null;
  } else if (typeof response.json === "function") {
    // Legacy injected consumers supply only json(); bound its representation
    // as well, while real fetch() uses the streaming branch above.
    payload = await response.json();
    bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  } else {
    throw new TypeError("ActivityPub provider returned no JSON body");
  }
  if (bytes > budget.maxPageBytes || budget.bytes + bytes > budget.maxTotalBytes) {
    throw new RangeError("ActivityPub source exceeded the bounded read-byte budget");
  }
  budget.bytes += bytes;
  return payload;
}

/**
 * Read one finite ActivityPub outbox, returning only canonical SEN activities
 * public or addressed to this customer. An Offer from a foreign sovereign
 * settlement is testimony, not commerce, a payment, or an ACK.
 *
 * The original HTTP network owner authorizes every peer URL before GET,\n * rejecting private/special-use DNS and literals. Tests inject their\n * otherwise-networkless authorizer explicitly, not through remote JSON.\n * Pages, encountered activities and source bytes are bounded. Exceeding a
 * bound refuses the ENTIRE source without fabricating an empty or complete
 * market from a truncated observation. The same client is consumed by the
 * federated-capability-offer-discovery-cell and its MetroPlat-facing Work.
 */
export async function listAddressedSenOutbox({
  outboxUrl, expectedActor, expectedAgentCard, recipient, fetcher = fetch,
  authorizeUrl = authorizePublicPage,
  maxPages = DEFAULT_MAX_PAGES, maxActivities = DEFAULT_MAX_ACTIVITIES,
  maxPageBytes = DEFAULT_MAX_PAGE_BYTES, maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
} = {}) {
  if (![outboxUrl, expectedActor, expectedAgentCard, recipient].every(value =>
      typeof value === "string" && value.length > 0)) {
    throw new TypeError("SEN outbox observation requires exact outbox, actor, Agent Card, and recipient URLs");
  }
  const source = httpsUrl(outboxUrl, "ActivityPub outbox");
  if (httpsUrl(expectedActor, "expected ActivityPub actor").origin !== source.origin) {
    throw new TypeError("ActivityPub actor and outbox must share one origin");
  }
  bound(maxPages, "maxPages", 512);
  bound(maxActivities, "maxActivities", 16384);
  bound(maxPageBytes, "maxPageBytes", 8 * 1024 * 1024);
  bound(maxTotalBytes, "maxTotalBytes", 64 * 1024 * 1024);
  if (maxTotalBytes < maxPageBytes) throw new TypeError("maxTotalBytes cannot be smaller than maxPageBytes");
  if (typeof fetcher !== "function") throw new TypeError("ActivityPub fetcher must be a function");
  if (typeof authorizeUrl !== "function") throw new TypeError("ActivityPub network authorizer must be a function");

  const budget = { bytes: 0, maxPageBytes, maxTotalBytes };
  const root = await jsonFrom(source.href, fetcher, budget, authorizeUrl), projections = [];
  if (!["OrderedCollection", "OrderedCollectionPage"].includes(root?.type)) {
    throw new TypeError("ActivityPub outbox must be an OrderedCollection or OrderedCollectionPage");
  }
  let page = root.type === "OrderedCollection" && !Array.isArray(root.orderedItems) ? root.first : root;
  if (!page && root.totalItems !== 0) {
    throw new TypeError("ActivityPub outbox has no accessible first page or inline items");
  }
  let pages = 0, observed = 0;
  const observedPages = new Set();
  const selectedActivities = new Set();
  while (page) {
    if (++pages > maxPages) throw new RangeError("ActivityPub outbox exceeded the bounded page budget");
    const external = typeof page === "string";
    const sought = external ? pageUrl(page, source.origin) : undefined;
    const value = external ? await jsonFrom(sought, fetcher, budget, authorizeUrl) : page;
    const identity = pageUrl(value?.id ?? sought ?? (page === root ? source.href : undefined), source.origin);
    if (observedPages.has(identity)) throw new Error("ActivityPub outbox pagination cycle repeats " + identity);
    observedPages.add(identity);
    if (!["OrderedCollection", "OrderedCollectionPage"].includes(value?.type) ||
        !Array.isArray(value.orderedItems)) {
      throw new TypeError("ActivityPub outbox returned no ordered collection page or embedded ordered items");
    }
    observed += value.orderedItems.length;
    if (observed > maxActivities) throw new RangeError("ActivityPub outbox exceeded the bounded activity budget");
    for (const envelope of value.orderedItems) {
      const recipients = one(envelope?.to), publicAddressed = recipients.some(value =>
        [ACTIVITYSTREAMS_PUBLIC, "as:Public"].includes(value));
      if (!publicAddressed && !recipients.includes(recipient)) continue;
      const activityId = exactActivityId(envelope?.id);
      if (selectedActivities.has(activityId)) throw new Error("ActivityPub outbox repeats activity " + activityId);
      selectedActivities.add(activityId);
      const projection = extractSenActivity(envelope, {
        expectedActor, expectedRecipient: publicAddressed ? ACTIVITYSTREAMS_PUBLIC : recipient,
        expectedAgentCard,
      });
      projections.push(Object.freeze({ activityId, ...projection }));
    }
    page = value.next;
  }
  return Object.freeze(projections);
}
