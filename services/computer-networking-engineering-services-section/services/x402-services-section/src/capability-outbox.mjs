import { ACTIVITYSTREAMS_PUBLIC } from "@red-cup-engineering/activitypub-services-section/activitystreams";
import { projectSenActivity, senActivityObjectBytes } from "@red-cup-engineering/activitypub-services-section/sen-activity";

import { CAPABILITY_OFFER_KIND } from "./offer.mjs";

/**
 * The house capability market's leg of "one offer, every market": each offer
 * whose declaration names the house capability market is said once as an
 * `org.emsenn.capability-offer.v3` object, carried as canonical SEN bytes in a
 * public ActivityPub `Offer` from the seller's own Service actor. A consumer
 * (another node's discovery, a peer's work board) pulls the actor's outbox or
 * follows it, and admits each Offer with `extractSenActivity` against that actor.
 *
 * The outbox is a pure derivation from the offers and the deployment's rails.
 * It is idempotent across compiles: an offer whose content identity (sku) is
 * unchanged keeps its earlier activity, and so its activity id, until it nears
 * expiry, so a recompile that changed nothing republishes nothing.
 */

export const CAPABILITY_MARKET = "house-capability-market";
export const CAPABILITY_ACTOR_IDENTIFIER = "market";
export const AGENT_CARD_ROUTE = "/.well-known/agent-card.json";

const DAY_MS = 86_400_000;

/**
 * @param {readonly object[]} offers Admitted offers (declareCatalog).
 * @param {{rails: {network: string, asset: string}, origin: string, now: string, horizonDays?: number, renewWithinDays?: number, previous?: readonly object[]}} options
 * @returns {readonly {routeKey: string, sku: string, expiresAt: string, activity: object}[]}
 */
export function deriveCapabilityOutbox(offers, { rails, origin, now, horizonDays = 365, renewWithinDays = 180, previous = [] }) {
  if (!Number.isFinite(Date.parse(now ?? ""))) throw new TypeError("the capability outbox needs the instant it is published at");
  const at = Date.parse(now);
  const kept = new Map(previous.map((entry) => [entry.sku, entry]));
  const agentCard = new URL(AGENT_CARD_ROUTE, origin).href;
  return Object.freeze(offers
    .filter((offer) => offer.markets.includes(CAPABILITY_MARKET) && offer.declaration.listed !== false)
    .map((offer) => {
      const earlier = kept.get(offer.sku);
      const provider = `${origin}/actors/${CAPABILITY_ACTOR_IDENTIFIER}`;
      if (earlier !== undefined && earlier.provider === provider && earlier.routeKey === offer.routeKey && Date.parse(earlier.expiresAt) - at > renewWithinDays * DAY_MS) return earlier;
      const expiresAt = new Date(at + horizonDays * DAY_MS).toISOString();
      const value = offer.capabilityOffer({
        network: rails.network, asset: rails.asset, agentCard, expiresAt,
        coordinates: { deploymentHealth: new URL("/healthz", origin).href },
      });
      const activity = projectSenActivity({
        type: "Offer", origin, identifier: CAPABILITY_ACTOR_IDENTIFIER, recipient: ACTIVITYSTREAMS_PUBLIC,
        objectBytes: senActivityObjectBytes({ objectKind: CAPABILITY_OFFER_KIND, value }), agentCard, eventTime: new Date(at).toISOString(),
      });
      return Object.freeze({ provider, routeKey: offer.routeKey, sku: offer.sku, expiresAt, activity: JSON.parse(JSON.stringify(activity)) });
    }));
}
